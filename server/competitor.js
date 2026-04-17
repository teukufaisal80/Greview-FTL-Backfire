// ─────────────────────────────────────────────────────────────────────────────
// competitor.js — Engine analisis kompetitor (pakai analyzer.js)
// ─────────────────────────────────────────────────────────────────────────────

const axios = require("axios");
const { aggregateReviews, generateAdRecommendations } = require("./analyzer");

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

const COMPETITOR_BRANDS = [
  "fithub","will fitness","willfitness","fitx","fit x",
  "celebrity fitness","gold's gym","golds gym","anytime fitness",
  "fitness first","snap fitness","hammer gym","planet fitness",
  "gym nation","prime fitness","total fitness","sport club",
  "the gym","one fitness","legend fitness","superior fitness",
  "body language","x gym","sport gym","olympic gym","elite gym",
  "power gym","lion gym","platinum gym","absolute fitness","sweat gym",
  "arena fitness","prime gym","fit hub","fit&fun","fun fitness",
  "energi gym","energy gym","sport center","fitness center"
];

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function isCompetitorGym(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  if (lower.includes("ftl")) return false;
  const isKnownBrand = COMPETITOR_BRANDS.some((b) => lower.includes(b));
  const isGymType = /gym|fitness|sport|kebugaran|olahraga|workout|exercise/i.test(lower);
  return isKnownBrand || isGymType;
}

async function getNearbyGyms(lat, lng, radiusKm, apiKey, cache) {
  const cacheKey = `nearby_${lat.toFixed(4)}_${lng.toFixed(4)}_${radiusKm}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const radiusMeters = Math.min(radiusKm * 1000, 50000);
  let allResults = [], pagetoken = null;
  do {
    const params = { location: `${lat},${lng}`, radius: radiusMeters, type: "gym", key: apiKey, language: "id" };
    if (pagetoken) { params.pagetoken = pagetoken; await new Promise((r) => setTimeout(r, 2000)); }
    const { data } = await axios.get(`${PLACES_API_BASE}/nearbysearch/json`, { params });
    allResults = allResults.concat(data.results || []);
    pagetoken = data.next_page_token || null;
  } while (pagetoken && allResults.length < 60);
  const seen = new Set();
  const competitors = allResults
    .filter((p) => isCompetitorGym(p.name))
    .filter((p) => { if (!p.geometry?.location) return false; return haversineDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng) <= radiusKm; })
    .filter((p) => { if (seen.has(p.place_id)) return false; seen.add(p.place_id); return true; })
    .map((p) => ({ place_id: p.place_id, name: p.name, rating: p.rating, totalRatings: p.user_ratings_total, distance: Math.round(haversineDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng)*100)/100, location: p.geometry.location, vicinity: p.vicinity }))
    .sort((a, b) => a.distance - b.distance);
  cache.set(cacheKey, competitors);
  return competitors;
}

async function getPlaceReviews(placeId, apiKey, cache) {
  const cacheKey = `reviews_${placeId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // Ambil dari 2 sort order untuk dapat lebih banyak review unik (max ~20)
  const [r1, r2] = await Promise.all([
    axios.get(`${PLACES_API_BASE}/details/json`, { params: { place_id: placeId, fields: "name,rating,user_ratings_total,reviews,formatted_address,geometry", key: apiKey, language: "id", reviews_sort: "newest" } }),
    axios.get(`${PLACES_API_BASE}/details/json`, { params: { place_id: placeId, fields: "reviews", key: apiKey, language: "id", reviews_sort: "most_relevant" } }),
  ]);

  const result = r1.data.result || null;
  if (!result) return null;

  // Gabungkan & deduplikasi
  const seen = new Set();
  const allReviews = [...(r1.data.result?.reviews || []), ...(r2.data.result?.reviews || [])]
    .filter((r) => {
      const key = (r.author_name || '') + '_' + (r.text || '').substring(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Prioritaskan bintang 1-2 di atas
  allReviews.sort((a, b) => ((a.rating || 5) <= 2 ? 0 : 1) - ((b.rating || 5) <= 2 ? 0 : 1));

  result.reviews = allReviews;
  cache.set(cacheKey, result);
  return result;
}

async function analyzeCompetitorsForBranch(branch, radiusKm = 2, apiKey, cache) {
  const { lat, lng } = branch.location;
  const nearbyCompetitors = await getNearbyGyms(lat, lng, radiusKm, apiKey, cache);
  if (nearbyCompetitors.length === 0) return { branch, competitors: [], overallInsight: null, totalCompetitorsFound: 0, radiusKm };

  const competitorDetails = await Promise.all(
    nearbyCompetitors.map(async (comp) => {
      const detail = await getPlaceReviews(comp.place_id, apiKey, cache);
      if (!detail) return null;
      const allReviews = (detail.reviews || []).map((r) => ({ text: r.text, rating: r.rating, author: r.author_name, time: r.relative_time_description }));
      const analysis = aggregateReviews(allReviews);
      const adRecs = generateAdRecommendations(detail.name, analysis.topProblems, analysis.confidence);
      return {
        placeId: comp.place_id, name: detail.name || comp.name, address: detail.formatted_address || comp.vicinity,
        distance: comp.distance, rating: detail.rating || comp.rating, totalRatings: detail.user_ratings_total || comp.totalRatings,
        totalReviewsAnalyzed: allReviews.length, negativeReviewCount: analysis.negativeCount,
        topProblems: analysis.topProblems.slice(0, 5), adRecommendations: adRecs, confidence: analysis.confidence,
        rawNegativeReviews: allReviews.filter((r) => r.rating <= 2).slice(0, 5),
      };
    })
  );

  const validCompetitors = competitorDetails.filter(Boolean);
  const categoryGlobalScore = {}, categoryGlobalKeywords = {}, categoryCompetitors = {};

  validCompetitors.forEach((comp) => {
    comp.topProblems.forEach((prob) => {
      if (!categoryGlobalScore[prob.category]) { categoryGlobalScore[prob.category] = 0; categoryGlobalKeywords[prob.category] = {}; categoryCompetitors[prob.category] = []; }
      categoryGlobalScore[prob.category] += prob.totalScore;
      prob.topKeywords.forEach((kw) => { categoryGlobalKeywords[prob.category][kw.keyword] = (categoryGlobalKeywords[prob.category][kw.keyword] || 0) + kw.count; });
      if (!categoryCompetitors[prob.category].includes(comp.name)) categoryCompetitors[prob.category].push(comp.name);
    });
  });

  const { getAllCategories, getConfidenceLevel } = require("./keywords");
  const categories = getAllCategories();
  const overallProblems = Object.entries(categoryGlobalScore)
    .map(([catKey, score]) => {
      const cat = categories[catKey]; if (!cat) return null;
      const topKeywords = Object.entries(categoryGlobalKeywords[catKey]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([kw,count])=>({keyword:kw,count}));
      return { category: catKey, label: cat.label, icon: cat.icon, totalScore: Math.round(score*10)/10, topKeywords, adAngle: cat.adAngle, competitorsAffected: categoryCompetitors[catKey]||[] };
    })
    .filter(Boolean).sort((a,b)=>b.totalScore-a.totalScore).slice(0,5);

  const totalNegReviews = validCompetitors.reduce((s,c)=>s+c.negativeReviewCount,0);
  const overallConfidence = getConfidenceLevel(totalNegReviews);
  const overallAdRecs = overallProblems.slice(0,3).map((prob,idx)=>({
    priority: idx+1, targetWeakness: prob.label, icon: prob.icon, recommendation: prob.adAngle,
    basedOnKeywords: prob.topKeywords.slice(0,3).map((k)=>k.keyword),
    competitorsAffected: prob.competitorsAffected, confidence: overallConfidence,
  }));

  return { branch, radiusKm, totalCompetitorsFound: validCompetitors.length, competitors: validCompetitors, overallInsight: { topProblems: overallProblems, adRecommendations: overallAdRecs, confidence: overallConfidence } };
}

module.exports = { analyzeCompetitorsForBranch };

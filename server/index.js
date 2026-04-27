require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const NodeCache = require("node-cache");
const path = require("path");
const fs = require("fs");

const app = express();

// Cache tanpa expiry — hanya di-replace saat Start Scrape diklik
const cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

// File-based persistent cache — agar data tidak hilang saat server restart
const PERSISTENT_CACHE_FILE = path.join(__dirname, "../data/persistent_cache.json");

function loadPersistentCache() {
  try {
    if (fs.existsSync(PERSISTENT_CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PERSISTENT_CACHE_FILE, "utf8"));
      let loaded = 0;
      for (const [key, { value }] of Object.entries(raw)) {
        if (value !== undefined) {
          cache.set(key, value, 0); // TTL 0 = no expiry
          loaded++;
        }
      }
      console.log(`📦 Loaded ${loaded} cached entries from disk (no expiry)`);
    }
  } catch (e) {
    console.log("⚠️  Could not load persistent cache:", e.message);
  }
}

function savePersistentCache() {
  try {
    const keys = cache.keys();
    const data = {};
    for (const key of keys) {
      const value = cache.get(key);
      if (value !== undefined) {
        data[key] = { value };
      }
    }
    fs.mkdirSync(path.dirname(PERSISTENT_CACHE_FILE), { recursive: true });
    fs.writeFileSync(PERSISTENT_CACHE_FILE, JSON.stringify(data));
    console.log(`💾 Cache saved to disk (${keys.length} entries)`);
  } catch (e) {
    console.log("⚠️  Could not save persistent cache:", e.message);
  }
}

// Save cache to disk every 10 minutes
setInterval(savePersistentCache, 10 * 60 * 1000);
loadPersistentCache();

// ── Password protection middleware ───────────────────────────────────────────
const APP_PASSWORD = process.env.APP_PASSWORD || "ftlsmart";

function requireAuth(req, res, next) {
  const token = req.headers["x-app-token"] || req.query._token;
  if (token === APP_PASSWORD) return next();
  return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing token." });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── Auth endpoint — frontend calls this to get a session token ───────────────
app.post("/api/auth", (req, res) => {
  const { password } = req.body;
  if (password === APP_PASSWORD) {
    res.json({ success: true, token: APP_PASSWORD });
  } else {
    res.status(401).json({ success: false, message: "Password salah." });
  }
});

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BRAND_NAME = process.env.BRAND_NAME || "FTL";

// ── Daftar lengkap club FTL & Stride dengan mapping kota ────────────────
const CLUB_LIST = [
  // Jabodetabek (46 club)
  "FTL - Tanjung Duren","FTL - Rawamangun","FTL - Tebet","FTL - Bekasi Timur",
  "FTL - Gandaria","FTL - Pondok Gede","FTL - Ciputat","FTL - Pondok Bambu",
  "FTL - Galaxy","FTL - Menteng","FTL - Cireundeu","FTL - Green Garden",
  "FTL - Depok Lama","FTL - Cipondoh","FTL - Bendungan Hilir","FTL - Gunung Sahari",
  "FTL - Kalimalang","FTL - Cikarang","FTL - Citra Garden","FTL - Puri",
  "FTL - Gading Sunter","FTL - Pasar Minggu","FTL - Mustika Jaya","FTL - Pajajaran",
  "FTL - Pahlawan","FTL - Kemanggisan","FTL - Cibubur","FTL - Alam Sutera",
  "FTL - Pamulang","FTL - Sawangan","FTL - Puri Depok Mas","FTL - Satrio",
  "FTL - Blok M","FTL - SCBD","FTL - Mampang","FTL - Pondok Indah",
  "Stride - Latumenten","Stride - Cibinong","Stride - Pecenongan","Stride - Gading Timur",
  "FTL - Arjuna Utara","FTL - Agora","FTL - Tomang","FTL Pilates - Gading Serpong",
  "FTL - Green Lake City","FTL - Kebon Sirih",
  // Bandung (8 club)
  "FTL - Pasir Koja","FTL - Dago","FTL - Ahmad Yani","FTL - Merdeka",
  "FTL - KBP","FTL - Soekarno Hatta","FTL - Sukajadi","Stride - Banceuy",
  // Surabaya (3 club)
  "FTL - Gubeng","FTL - A.R. Hakim","FTL - Ciputra World Surabaya",
  // Bali (2 club)
  "FTL - Kerobokan","FTL - Teuku Umar",
];

// Mapping nama club → kota (dari data internal, 100% akurat)
const CLUB_CITY_MAP = {
  // Jabodetabek
  "FTL - Tanjung Duren":"Jabodetabek","FTL - Rawamangun":"Jabodetabek",
  "FTL - Tebet":"Jabodetabek","FTL - Bekasi Timur":"Jabodetabek",
  "FTL - Gandaria":"Jabodetabek","FTL - Pondok Gede":"Jabodetabek",
  "FTL - Ciputat":"Jabodetabek","FTL - Pondok Bambu":"Jabodetabek",
  "FTL - Galaxy":"Jabodetabek","FTL - Menteng":"Jabodetabek",
  "FTL - Cireundeu":"Jabodetabek","FTL - Green Garden":"Jabodetabek",
  "FTL - Depok Lama":"Jabodetabek","FTL - Cipondoh":"Jabodetabek",
  "FTL - Bendungan Hilir":"Jabodetabek","FTL - Gunung Sahari":"Jabodetabek",
  "FTL - Kalimalang":"Jabodetabek","FTL - Cikarang":"Jabodetabek",
  "FTL - Citra Garden":"Jabodetabek","FTL - Puri":"Jabodetabek",
  "FTL - Gading Sunter":"Jabodetabek","FTL - Pasar Minggu":"Jabodetabek",
  "FTL - Mustika Jaya":"Jabodetabek","FTL - Pajajaran":"Jabodetabek",
  "FTL - Pahlawan":"Jabodetabek","FTL - Kemanggisan":"Jabodetabek",
  "FTL - Cibubur":"Jabodetabek","FTL - Alam Sutera":"Jabodetabek",
  "FTL - Pamulang":"Jabodetabek","FTL - Sawangan":"Jabodetabek",
  "FTL - Puri Depok Mas":"Jabodetabek","FTL - Satrio":"Jabodetabek",
  "FTL - Blok M":"Jabodetabek","FTL - SCBD":"Jabodetabek",
  "FTL - Mampang":"Jabodetabek","FTL - Pondok Indah":"Jabodetabek",
  "Stride - Latumenten":"Jabodetabek","Stride - Cibinong":"Jabodetabek",
  "Stride - Pecenongan":"Jabodetabek","Stride - Gading Timur":"Jabodetabek",
  "FTL - Arjuna Utara":"Jabodetabek","FTL - Agora":"Jabodetabek",
  "FTL - Tomang":"Jabodetabek","FTL Pilates - Gading Serpong":"Jabodetabek",
  "FTL - Green Lake City":"Jabodetabek","FTL - Kebon Sirih":"Jabodetabek",
  // Bandung
  "FTL - Pasir Koja":"Bandung","FTL - Dago":"Bandung",
  "FTL - Ahmad Yani":"Bandung","FTL - Merdeka":"Bandung",
  "FTL - KBP":"Bandung","FTL - Soekarno Hatta":"Bandung",
  "FTL - Sukajadi":"Bandung","Stride - Banceuy":"Bandung",
  // Surabaya
  "FTL - Gubeng":"Surabaya","FTL - A.R. Hakim":"Surabaya",
  "FTL - Ciputra World Surabaya":"Surabaya",
  // Bali
  "FTL - Kerobokan":"Bali","FTL - Teuku Umar":"Bali",
};

// Cek apakah nama termasuk brand FTL/Stride
function isFTLBrand(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.includes("ftl") || lower.includes("stride");
}

// Keyword alamat untuk menentukan cabang masuk kota mana — diperluas
const CITY_KEYWORDS = {
  Jabodetabek: [
    // DKI Jakarta
    "jakarta","jakarta pusat","jakarta utara","jakarta barat","jakarta selatan","jakarta timur",
    "gambir","sawah besar","kemayoran","senen","cempaka putih","menteng","tanah abang","johar baru",
    "penjaringan","pademangan","tanjung priok","koja","kelapa gading","cilincing",
    "tambora","taman sari","grogol","petamburan","palmerah","kebon jeruk","kembangan","cengkareng","kalideres",
    "tebet","setiabudi","mampang","pancoran","kebayoran baru","kebayoran lama","pesanggrahan","cilandak","pasar minggu",
    "matraman","pulo gadung","jatinegara","duren sawit","kramat jati","pasar rebo","cipayung","ciracas","makasar",
    // Nama area terkenal Jakarta
    "green garden","gunung sahari","cipondoh","puri","pluit","sunter","gading",
    "blok m","senayan","sudirman","thamrin","kuningan","casablanca","gatsu","gatot subroto",
    "mangga dua","harmoni","glodok","kota","senen","rawamangun","klender","cakung",
    "bintaro","lebak bulus","fatmawati","tb simatupang","ragunan","ciganjur","jagakarsa",
    "tomang","daan mogot","karang anyar","jelambar","pesing","kembangan",
    // Bogor
    "bogor","cibinong","depok","citeureup","jonggol","leuwiliang","parung",
    // Depok
    "depok","beji","cimanggis","sawangan","sukmajaya","pancoran mas","limo",
    // Tangerang
    "tangerang","serpong","bsd","alam sutera","gading serpong","bintaro","ciputat",
    "pamulang","cisauk","pagedangan","legok","kelapa dua","curug","cikupa","balaraja",
    // Bekasi
    "bekasi","cibubur","pondok gede","jatiasih","jatibening","harapan indah","galaxy",
    "pekayon","bantar gebang","mustikajaya","rawalumbu","medan satria","babelan",
    // Nama area dari CLUB_LIST
    "tanjung duren","rawamangun","gandaria","pondok gede","pondok bambu",
    "galaxy","cireundeu","depok lama","bendungan hilir","kalimalang",
    "cikarang","citra garden","gading sunter","kemanggisan","satrio",
    "mampang","pondok indah","scbd","arjuna utara","tomang",
    "green lake city","kebon sirih","mustika jaya","puri depok mas",
  ],
  Bandung: [
    "bandung","cimahi","bandung barat","bandung timur","bandung utara","bandung selatan",
    "buah batu","cicendo","coblong","kiaracondong","lengkong","antapani","arcamanik",
    "bojongloa","gedebage","ujung berung","cibiru","mandalajati","panyileukan",
    "dago","pasteur","setrasari","sukajadi","setiabudi","lembang","padalarang","soreang",
    "buahbatu","riau","braga","asia afrika","merdeka","sulanjana",
    // Nama area dari CLUB_LIST Bandung
    "pasir koja","ahmad yani","pajajaran","pahlawan","sukajadi","kbp","soekarno hatta",
  ],
  Surabaya: [
    "surabaya","sidoarjo","gresik","surabaya barat","surabaya timur","surabaya utara","surabaya selatan",
    "gubeng","wonokromo","rungkut","sukolilo","mulyorejo","kenjeran","semampir","krembangan",
    "bubutan","genteng","tegalsari","sawahan","dukuhpakis","gayungan","jambangan","karangpilang",
    "wiyung","lakarsantri","sambikerep","benowo","pakal","asemrowo","tandes","sukomanunggal",
    "darmo","diponegoro","basuki rahmat","hr muhammad","mayjend sungkono","kertajaya","dharmahusada",
    // Nama area dari CLUB_LIST Surabaya
    "gubeng","a.r. hakim","ar hakim","ciputra world","agora",
  ],
  Bali: [
    "bali","denpasar","badung","gianyar","tabanan","buleleng","karangasem",
    "kuta","legian","seminyak","canggu","sanur","ubud","nusa dua","jimbaran",
    "renon","gatsu bali","teuku umar","sunset road","imam bonjol","bypass ngurah rai",
    "mengwi","abiansemal","kerobokan","kedonganan","pecatu","uluwatu",
    // Nama area dari CLUB_LIST Bali
    "teuku umar",
  ],
};

// ── Cari satu club by nama exact ─────────────────────────────────────────
async function searchOneClub(clubName) {
  const cacheKey = `club_${clubName}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const { data } = await axios.get(`${PLACES_API_BASE}/textsearch/json`, {
    params: { query: clubName + " gym fitness", key: API_KEY, language: "id" },
  });

  // Ambil hasil paling relevan — yang namanya paling mirip
  const results = (data.results || []).filter((p) => isFTLBrand(p.name));
  const best = results[0] || null;
  cache.set(cacheKey, best);
  return best;
}

// ── Cari semua club dari CLUB_LIST — dengan concurrency limit ────────────
async function searchAllClubs() {
  const cacheKey = "all_ftl_clubs";
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // Batch per 5 supaya tidak kena rate limit
  const results = [];
  const notFound = [];
  const batchSize = 5;
  for (let i = 0; i < CLUB_LIST.length; i += batchSize) {
    const batch = CLUB_LIST.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((name) => searchOneClub(name)));
    batchResults.forEach((r, idx) => {
      if (r) results.push({ ...r, searchName: batch[idx] });
      else notFound.push(batch[idx]);
    });
    // Delay antar batch supaya tidak kena rate limit
    if (i + batchSize < CLUB_LIST.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (notFound.length > 0) {
    console.log(`\n⚠️  ${notFound.length} club tidak ditemukan di Google Places:`);
    notFound.forEach(n => console.log(`   - ${n}`));
  }
  console.log(`✅  ${results.length} dari ${CLUB_LIST.length} club berhasil ditemukan\n`);

  // Deduplikasi by place_id
  const seen = new Set();
  const unique = results.filter((r) => {
    if (!r.place_id || seen.has(r.place_id)) return false;
    seen.add(r.place_id);
    return true;
  });

  cache.set(cacheKey, unique);
  return unique;
}

// ── Legacy: fallback text search (masih dipakai untuk searchPlaces lama) ──
async function searchPlaces(query) {
  const cacheKey = `search_${query}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const { data } = await axios.get(`${PLACES_API_BASE}/textsearch/json`, {
    params: { query, key: API_KEY, language: "id" },
  });
  const results = (data.results || []).filter((p) => isFTLBrand(p.name));
  cache.set(cacheKey, results);
  return results;
}

// ── Ambil detail + reviews berdasarkan Place ID ────────────────────────────
async function getPlaceDetails(placeId) {
  const cacheKey = `detail_${placeId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const { data } = await axios.get(`${PLACES_API_BASE}/details/json`, {
    params: {
      place_id: placeId,
      fields: "name,rating,user_ratings_total,reviews,formatted_address,geometry",
      key: API_KEY,
      language: "id",
      reviews_sort: "newest",
    },
  });

  const result = data.result || null;
  if (result) cache.set(cacheKey, result);
  return result;
}

// ── Hitung distribusi bintang dari reviews ────────────────────────────────
function calcStarDistribution(reviews = []) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
  const total = reviews.length || 1;
  return Object.fromEntries(
    Object.entries(dist).map(([k, v]) => [k, Math.round((v / total) * 100)])
  );
}

// ── Analisis sentimen sederhana berdasarkan kata kunci ────────────────────
function analyzeSentiment(reviews = []) {
  const positiveWords = ["bagus", "baik", "bersih", "ramah", "nyaman", "lengkap",
    "recommended", "mantap", "oke", "puas", "suka", "keren", "profesional", "worth"];
  const negativeWords = ["kotor", "buruk", "jelek", "mahal", "kecewa", "lambat",
    "antri", "penuh", "rusak", "kurang", "sempit", "berisik", "lama", "tidak"];

  let pos = 0, neg = 0, neutral = 0;
  const topics = {};

  reviews.forEach((r) => {
    const text = (r.text || "").toLowerCase();
    const posHits = positiveWords.filter((w) => text.includes(w));
    const negHits = negativeWords.filter((w) => text.includes(w));

    if (posHits.length > negHits.length) pos++;
    else if (negHits.length > posHits.length) neg++;
    else neutral++;

    [...posHits, ...negHits].forEach((w) => {
      topics[w] = (topics[w] || 0) + 1;
    });
  });

  const total = reviews.length || 1;
  const topTopics = Object.entries(topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({
      word,
      count,
      sentiment: positiveWords.includes(word) ? "positive" : "negative",
    }));

  return {
    positive: Math.round((pos / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((neg / total) * 100),
    topics: topTopics,
  };
}

// ── GET /api/dashboard — serve from cache only ────────────────────────────
app.get("/api/dashboard", requireAuth, async (req, res) => {
  const cacheKey = "dashboard_all";
  if (cache.has(cacheKey)) {
    return res.json({ source: "cache", ...cache.get(cacheKey) });
  }
  // No cache yet
  return res.json({ source: "empty", cities: [], lastUpdated: null });
});

// ── POST /api/scrape — force fetch from Google, replace cache ──────────────
app.post("/api/scrape", requireAuth, async (req, res) => {
  const cacheKey = "dashboard_all";

  if (!API_KEY || API_KEY === "ISI_API_KEY_KAMU_DI_SINI") {
    return res.status(400).json({ error: "API key belum diisi." });
  }

  // Mark scraping in progress
  cache.set("scrape_status", { status: "running", startedAt: new Date().toISOString() }, 0);

  try {
    // Cari semua cabang dari CLUB_LIST (59 club by nama exact)
    const allFTLPlaces = await searchAllClubs();

    // Ambil detail semua cabang
    const allDetails = (await Promise.all(
      allFTLPlaces.map((p) => getPlaceDetails(p.place_id))
    )).filter(Boolean);

    // Kelompokkan per kota berdasarkan alamat
    function detectCity(address, searchName) {
      // Prioritas 1: CLUB_CITY_MAP — 100% akurat dari data internal
      if (searchName && CLUB_CITY_MAP[searchName]) return CLUB_CITY_MAP[searchName];
      // Prioritas 2: deteksi dari alamat Google Maps
      if (!address) return "Lainnya";
      const lower = address.toLowerCase();
      for (const [city, keywords] of Object.entries(CITY_KEYWORDS)) {
        if (keywords.some((kw) => lower.includes(kw))) return city;
      }
      return "Lainnya";
    }

    // Buat map per kota
    const cityMap = {};
    for (const [city] of Object.entries(CITY_KEYWORDS)) cityMap[city] = [];
    cityMap["Lainnya"] = [];
    allDetails.forEach((d, idx) => {
      const searchName = allFTLPlaces[idx]?.searchName || "";
      const city = detectCity(d.formatted_address, searchName);
      cityMap[city].push({ ...d, searchName });
    });

    const cityResults = Object.entries(cityMap)
      .filter(([, branches]) => branches.length > 0)
      .map(([groupName, validDetails]) => {
        const allReviews = validDetails.flatMap((d) => d.reviews || []);
        const avgRating =
          validDetails.length > 0
            ? validDetails.reduce((s, d) => s + (d.rating || 0), 0) / validDetails.length
            : 0;
        const totalRatings = validDetails.reduce(
          (s, d) => s + (d.user_ratings_total || 0), 0
        );

        return {
          city: groupName,
          branches: validDetails.map((d) => ({
            name: d.name,
            address: d.formatted_address,
            rating: d.rating,
            totalRatings: d.user_ratings_total,
            location: d.geometry?.location,
          })),
          avgRating: Math.round(avgRating * 10) / 10,
          totalRatings,
          branchCount: validDetails.length,
          starDistribution: calcStarDistribution(allReviews),
          sentiment: analyzeSentiment(allReviews),
          recentReviews: allReviews
            .sort((a, b) => b.time - a.time)
            .slice(0, 5)
            .map((r) => ({
              author: r.author_name,
              rating: r.rating,
              text: r.text,
              time: r.relative_time_description,
              profilePhoto: r.profile_photo_url,
            })),
        };
      });

    const allReviews = cityResults.flatMap((c) =>
      c.recentReviews.map((r) => ({ ...r, city: c.city }))
    );

    // Guard: jika tidak ada hasil sama sekali
    if (cityResults.length === 0) {
      return res.json({ source: "live", summary: { overallRating: 0, totalReviews: 0, sentiment: { positive: 0, neutral: 0, negative: 0 }, bestCity: "-", bestCityRating: 0 }, cities: [], recentReviews: [], lastUpdated: new Date().toISOString() });
    }

    const overallRating =
      cityResults.reduce((s, c) => s + c.avgRating, 0) / cityResults.length;
    const totalReviews = cityResults.reduce((s, c) => s + c.totalRatings, 0);
    const overallSentiment = {
      positive: Math.round(cityResults.reduce((s, c) => s + c.sentiment.positive, 0) / cityResults.length),
      neutral: Math.round(cityResults.reduce((s, c) => s + c.sentiment.neutral, 0) / cityResults.length),
      negative: Math.round(cityResults.reduce((s, c) => s + c.sentiment.negative, 0) / cityResults.length),
    };
    const bestCity = cityResults.reduce((best, c) =>
      c.avgRating > best.avgRating ? c : best
    , cityResults[0]);

    const payload = {
      summary: {
        overallRating: Math.round(overallRating * 10) / 10,
        totalReviews,
        sentiment: overallSentiment,
        bestCity: bestCity.city,
        bestCityRating: bestCity.avgRating,
      },
      cities: cityResults,
      recentReviews: allReviews
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10),
      lastUpdated: new Date().toISOString(),
    };

    cache.set(cacheKey, payload, 0); // no expiry
    cache.set("scrape_status", { status: "done", completedAt: new Date().toISOString() }, 0);
    savePersistentCache();
    res.json({ source: "live", ...payload });
  } catch (err) {
    cache.set("scrape_status", { status: "error", error: err.message }, 0);
    console.error("Error fetching from Google Places:", err.message);
    res.status(500).json({ error: "Gagal mengambil data dari Google Places API.", detail: err.message });
  }
});

// ── GET /api/competitor/:placeId — analisis kompetitor sekitar 1 cabang FTL
app.get("/api/competitor/:placeId", requireAuth, async (req, res) => {
  const { analyzeCompetitorsForBranch } = require("./competitor");
  const { placeId } = req.params;
  const radiusKm = parseFloat(req.query.radius) || 2;

  if (!API_KEY || API_KEY === "ISI_API_KEY_KAMU_DI_SINI") {
    return res.status(400).json({ error: "API key belum diisi." });
  }

  const cacheKey = `competitor_${placeId}_${radiusKm}`;
  if (cache.has(cacheKey)) {
    return res.json({ source: "cache", ...cache.get(cacheKey) });
  }

  try {
    // Ambil detail cabang FTL dulu (butuh koordinat)
    const detail = await getPlaceDetails(placeId);
    if (!detail || !detail.geometry?.location) {
      return res.status(404).json({ error: "Cabang FTL tidak ditemukan." });
    }

    const branch = {
      placeId,
      name: detail.name,
      address: detail.formatted_address,
      location: detail.geometry.location,
      rating: detail.rating,
    };

    const result = await analyzeCompetitorsForBranch(branch, radiusKm, API_KEY, cache);

    cache.set(cacheKey, result);
    res.json({ source: "live", lastUpdated: new Date().toISOString(), ...result });
  } catch (err) {
    console.error("Competitor analysis error:", err.message);
    res.status(500).json({ error: "Gagal menganalisis kompetitor.", detail: err.message });
  }
});

// ── GET /api/branches — daftar semua cabang FTL (untuk dropdown halaman competitor)
app.get("/api/branches", requireAuth, async (req, res) => {
  const cacheKey = "all_branches";
  if (cache.has(cacheKey)) return res.json(cache.get(cacheKey));

  if (!API_KEY || API_KEY === "ISI_API_KEY_KAMU_DI_SINI") {
    return res.status(400).json({ error: "API key belum diisi." });
  }

  try {
    // Cari semua cabang dari CLUB_LIST (59 club by nama exact)
    const allPlaces = await searchAllClubs();
    const details = (await Promise.all(
      allPlaces.map((p) => getPlaceDetails(p.place_id))
    )).filter(Boolean);

    function detectCity(address, searchName) {
      // Prioritas 1: CLUB_CITY_MAP — 100% akurat dari data internal
      if (searchName && CLUB_CITY_MAP[searchName]) return CLUB_CITY_MAP[searchName];
      // Prioritas 2: deteksi dari alamat Google Maps
      if (!address) return "Lainnya";
      const lower = address.toLowerCase();
      for (const [city, keywords] of Object.entries(CITY_KEYWORDS)) {
        if (keywords.some((kw) => lower.includes(kw))) return city;
      }
      return "Lainnya";
    }

    const seen2 = new Set();
    const result = details
      .filter((d) => {
        const pid = d.place_id || allPlaces.find((p) => p.name === d.name)?.place_id;
        if (!pid || seen2.has(pid) || !d.geometry?.location) return false;
        seen2.add(pid);
        return true;
      })
      .map((d) => {
        const matchedPlace = allPlaces.find((p) => p.place_id === d.place_id || p.name === d.name);
        const searchName = matchedPlace?.searchName || "";
        return {
          placeId: d.place_id || matchedPlace?.place_id,
          name: d.name,
          address: d.formatted_address,
          city: detectCity(d.formatted_address, searchName),
          rating: d.rating,
          location: d.geometry?.location,
        };
      });

    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("Branches fetch error:", err.message);
    res.status(500).json({ error: "Gagal mengambil daftar cabang.", detail: err.message });
  }
});

// ── GET /api/keywords — semua adaptive keywords ───────────────────────────
app.get("/api/keywords", (req, res) => {
  const { loadAdaptive, BASE_CATEGORIES } = require("./keywords");
  const adaptive = loadAdaptive();
  res.json({ categories: Object.keys(BASE_CATEGORIES).map((k) => ({ key: k, label: BASE_CATEGORIES[k].label })), ...adaptive });
});

// ── POST /api/keywords/approve ────────────────────────────────────────────
app.post("/api/keywords/approve", requireAuth, (req, res) => {
  const { approveKeyword } = require("./keywords");
  const { word, category } = req.body;
  if (!word || !category) return res.status(400).json({ error: "word dan category wajib diisi" });
  const ok = approveKeyword(word, category);
  if (!ok) return res.status(404).json({ error: "Keyword tidak ditemukan di pending" });
  cache.flushAll();
  res.json({ success: true });
});

// ── POST /api/keywords/reject ─────────────────────────────────────────────
app.post("/api/keywords/reject", requireAuth, (req, res) => {
  const { rejectKeyword } = require("./keywords");
  const { word, reason } = req.body;
  if (!word) return res.status(400).json({ error: "word wajib diisi" });
  const ok = rejectKeyword(word, reason || "");
  if (!ok) return res.status(404).json({ error: "Keyword tidak ditemukan di pending" });
  res.json({ success: true });
});

// ── POST /api/keywords/restore ────────────────────────────────────────────
app.post("/api/keywords/restore", requireAuth, (req, res) => {
  const { restoreKeyword } = require("./keywords");
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "word wajib diisi" });
  const ok = restoreKeyword(word);
  if (!ok) return res.status(404).json({ error: "Keyword tidak ditemukan di rejected" });
  res.json({ success: true });
});

// ── DELETE /api/keywords/delete — hapus permanen dari rejected ─────────────
app.post("/api/keywords/delete", requireAuth, (req, res) => {
  const { deleteKeyword } = require("./keywords");
  const { word, from } = req.body;
  if (!word) return res.status(400).json({ error: "word wajib diisi" });
  const ok = deleteKeyword(word, from || "rejected");
  if (!ok) return res.status(404).json({ error: "Keyword tidak ditemukan" });
  res.json({ success: true });
});

// ── GET /api/cache/clear ───────────────────────────────────────────────────
// ── GET /api/scrape/status ────────────────────────────────────────────────
app.get("/api/scrape/status", requireAuth, (req, res) => {
  const status = cache.get("scrape_status") || { status: "idle" };
  const hasDashboard = cache.has("dashboard_all");
  const dashData = hasDashboard ? cache.get("dashboard_all") : null;
  res.json({ ...status, hasDashboard, lastUpdated: dashData?.lastUpdated || null });
});

app.get("/api/cache/clear", requireAuth, (req, res) => {
  cache.flushAll();
  res.json({ message: "Cache berhasil dibersihkan." });
});

// ── Serve dashboard HTML ───────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 3000;
process.on("SIGTERM", () => { savePersistentCache(); process.exit(0); });
process.on("SIGINT", () => { savePersistentCache(); process.exit(0); });

app.listen(PORT, () => {
  console.log(`\n🏋️  FTL Gym Dashboard berjalan di http://localhost:${PORT}`);
  console.log(`📊  API tersedia di http://localhost:${PORT}/api/dashboard\n`);
});

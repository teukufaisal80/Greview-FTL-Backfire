require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const NodeCache = require("node-cache");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");

const app = express();

// Cache tanpa expiry — hanya diganti saat Start Scrape diklik
const cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

const PERSISTENT_CACHE_FILE = path.join(__dirname, "../data/persistent_cache.json");

function loadPersistentCache() {
  try {
    if (fs.existsSync(PERSISTENT_CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PERSISTENT_CACHE_FILE, "utf8"));
      let loaded = 0;
      for (const [key, { value }] of Object.entries(raw)) {
        if (value !== undefined) { cache.set(key, value, 0); loaded++; }
      }
      console.log(`📦 Loaded ${loaded} cached entries from disk`);
    }
  } catch (e) { console.log("⚠️  Could not load persistent cache:", e.message); }
}

function savePersistentCache() {
  try {
    const keys = cache.keys();
    const data = {};
    for (const key of keys) {
      const value = cache.get(key);
      if (value !== undefined) data[key] = { value };
    }
    fs.mkdirSync(path.dirname(PERSISTENT_CACHE_FILE), { recursive: true });
    fs.writeFileSync(PERSISTENT_CACHE_FILE, JSON.stringify(data));
    console.log(`💾 Cache saved to disk (${keys.length} entries)`);
  } catch (e) { console.log("⚠️  Could not save persistent cache:", e.message); }
}

setInterval(savePersistentCache, 10 * 60 * 1000);
loadPersistentCache();

// ── Password protection ───────────────────────────────────────────────────
const APP_PASSWORD = process.env.APP_PASSWORD || "ftlsmart";

function requireAuth(req, res, next) {
  const token = req.headers["x-app-token"] || req.query._token;
  if (token === APP_PASSWORD) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.post("/api/auth", (req, res) => {
  const { password } = req.body;
  if (password === APP_PASSWORD) res.json({ success: true, token: APP_PASSWORD });
  else res.status(401).json({ success: false, message: "Password salah." });
});

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const CLUB_LIST = [
  "FTL - Tanjung Duren","FTL - Rawamangun","FTL - Tebet","FTL - Bekasi Timur",
  "FTL - Gandaria","FTL - Pondok Gede","FTL - Ciputat","FTL - Pondok Bambu",
  "FTL - Galaxy","FTL - Menteng","FTL - Cireundeu","FTL - Green Garden",
  "FTL - Depok Lama","FTL - Cipondoh","FTL - Bendungan Hilir","FTL - Gunung Sahari",
  "FTL - Kalimalang","FTL - Cikarang","FTL - Citra Garden","FTL - Puri",
  "FTL - Gading Sunter","FTL - Pasar Minggu","FTL - Mustika Jaya","FTL - Pajajaran",
  "FTL - Pahlawan","FTL - Kemanggisan","FTL - Cibubur","FTL - Alam Sutera",
  "FTL - Pamulang","FTL - Sawangan","FTL - Puri Depok Mas","FTL - Satrio",
  "FTL - Blok M","FTL - SCBD","FTL - Mampang","FTL - Pondok Indah",
  "FTL - Arjuna Utara","FTL - Agora","FTL - Tomang","FTL - Green Lake City",
  "FTL - Kebon Sirih","Stride - Latumenten","Stride - Cibinong",
  "Stride - Pecenongan","Stride - Gading Timur","FTL Pilates - Gading Serpong",
  "FTL - Pasir Koja","FTL - Dago","FTL - Ahmad Yani","FTL - Merdeka",
  "FTL - KBP","FTL - Soekarno Hatta","FTL - Sukajadi","Stride - Banceuy",
  "FTL - Gubeng","FTL - A.R. Hakim","FTL - Ciputra World Surabaya",
  "FTL - Kerobokan","FTL - Teuku Umar"
];

const CLUB_CITY_MAP = {
  "FTL - Tanjung Duren":"Jabodetabek","FTL - Rawamangun":"Jabodetabek","FTL - Tebet":"Jabodetabek","FTL - Bekasi Timur":"Jabodetabek",
  "FTL - Gandaria":"Jabodetabek","FTL - Pondok Gede":"Jabodetabek","FTL - Ciputat":"Jabodetabek","FTL - Pondok Bambu":"Jabodetabek",
  "FTL - Galaxy":"Jabodetabek","FTL - Menteng":"Jabodetabek","FTL - Cireundeu":"Jabodetabek","FTL - Green Garden":"Jabodetabek",
  "FTL - Depok Lama":"Jabodetabek","FTL - Cipondoh":"Jabodetabek","FTL - Bendungan Hilir":"Jabodetabek","FTL - Gunung Sahari":"Jabodetabek",
  "FTL - Kalimalang":"Jabodetabek","FTL - Cikarang":"Jabodetabek","FTL - Citra Garden":"Jabodetabek","FTL - Puri":"Jabodetabek",
  "FTL - Gading Sunter":"Jabodetabek","FTL - Pasar Minggu":"Jabodetabek","FTL - Mustika Jaya":"Jabodetabek","FTL - Pajajaran":"Jabodetabek",
  "FTL - Pahlawan":"Jabodetabek","FTL - Kemanggisan":"Jabodetabek","FTL - Cibubur":"Jabodetabek","FTL - Alam Sutera":"Jabodetabek",
  "FTL - Pamulang":"Jabodetabek","FTL - Sawangan":"Jabodetabek","FTL - Puri Depok Mas":"Jabodetabek","FTL - Satrio":"Jabodetabek",
  "FTL - Blok M":"Jabodetabek","FTL - SCBD":"Jabodetabek","FTL - Mampang":"Jabodetabek","FTL - Pondok Indah":"Jabodetabek",
  "FTL - Arjuna Utara":"Jabodetabek","FTL - Agora":"Jabodetabek","FTL - Tomang":"Jabodetabek","FTL - Green Lake City":"Jabodetabek",
  "FTL - Kebon Sirih":"Jabodetabek","Stride - Latumenten":"Jabodetabek","Stride - Cibinong":"Jabodetabek",
  "Stride - Pecenongan":"Jabodetabek","Stride - Gading Timur":"Jabodetabek","FTL Pilates - Gading Serpong":"Jabodetabek",
  "FTL - Pasir Koja":"Bandung","FTL - Dago":"Bandung","FTL - Ahmad Yani":"Bandung","FTL - Merdeka":"Bandung",
  "FTL - KBP":"Bandung","FTL - Soekarno Hatta":"Bandung","FTL - Sukajadi":"Bandung","Stride - Banceuy":"Bandung",
  "FTL - Gubeng":"Surabaya","FTL - A.R. Hakim":"Surabaya","FTL - Ciputra World Surabaya":"Surabaya",
  "FTL - Kerobokan":"Bali","FTL - Teuku Umar":"Bali"
};

const CITY_KEYWORDS = {
  "Jabodetabek": ["jakarta","bekasi","depok","tangerang","bogor","ciputat","cibubur","serpong","bsd","kelapa gading","sunter","mangga dua","pluit","gading","cikarang","cibinong"],
  "Bandung": ["bandung","cimahi","baleendah","soreang","margahayu","dago","buah batu","pasteur"],
  "Surabaya": ["surabaya","sidoarjo","gresik","ciputra world"],
  "Bali": ["bali","denpasar","badung","gianyar","kerobokan","seminyak","kuta","ubud"]
};

async function searchOneClub(name) {
  try {
    const { data } = await axios.get(`${PLACES_API_BASE}/findplacefromtext/json`, {
      params: { input: name, inputtype: "textquery", fields: "place_id,name,formatted_address,geometry,rating,user_ratings_total", key: API_KEY, language: "id" }
    });
    const candidates = data.candidates || [];
    return candidates.length > 0 ? { ...candidates[0], searchName: name } : null;
  } catch (e) { return null; }
}

async function getPlaceDetails(placeId) {
  const cacheKey = `place_${placeId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  try {
    const [r1, r2] = await Promise.all([
      axios.get(`${PLACES_API_BASE}/details/json`, { params: { place_id: placeId, fields: "name,rating,user_ratings_total,reviews,formatted_address,geometry", key: API_KEY, language: "id", reviews_sort: "newest" } }),
      axios.get(`${PLACES_API_BASE}/details/json`, { params: { place_id: placeId, fields: "reviews", key: API_KEY, language: "id", reviews_sort: "most_relevant" } }),
    ]);
    const result = r1.data.result || null;
    if (!result) return null;
    const seen = new Set();
    const allReviews = [...(r1.data.result?.reviews || []), ...(r2.data.result?.reviews || [])]
      .filter((r) => { const k = (r.author_name||'')+'_'+(r.text||'').substring(0,30); if(seen.has(k))return false; seen.add(k);return true; });
    allReviews.sort((a,b)=>((a.rating||5)<=2?0:1)-((b.rating||5)<=2?0:1));
    result.reviews = allReviews;
    cache.set(cacheKey, result, 0);
    return result;
  } catch (e) { return null; }
}

function calcStarDistribution(reviews) {
  const dist = { 1:0,2:0,3:0,4:0,5:0 };
  reviews.forEach(r => { if(r.rating) dist[r.rating] = (dist[r.rating]||0)+1; });
  const total = reviews.length || 1;
  return Object.fromEntries(Object.entries(dist).map(([k,v])=>[k,Math.round(v/total*100)]));
}

function analyzeSentiment(reviews) {
  if(!reviews.length) return { positive:0,neutral:0,negative:0 };
  let pos=0,neu=0,neg=0;
  reviews.forEach(r => { if((r.rating||3)>=4)pos++; else if(r.rating===3)neu++; else neg++; });
  const t = reviews.length;
  return { positive:Math.round(pos/t*100), neutral:Math.round(neu/t*100), negative:Math.round(neg/t*100) };
}

async function searchAllClubs() {
  const results = [];
  const notFound = [];
  const batchSize = 5;
  for (let i = 0; i < CLUB_LIST.length; i += batchSize) {
    const batch = CLUB_LIST.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(name => searchOneClub(name)));
    batchResults.forEach((r, idx) => { if(r) results.push({...r, searchName: batch[idx]}); else notFound.push(batch[idx]); });
    if (i + batchSize < CLUB_LIST.length) await new Promise(r => setTimeout(r, 200));
  }
  if (notFound.length > 0) console.log(`⚠️  ${notFound.length} club tidak ditemukan:`, notFound.join(", "));
  console.log(`✅  ${results.length} dari ${CLUB_LIST.length} club ditemukan`);
  const seen = new Set();
  return results.filter(p => { if(seen.has(p.place_id))return false; seen.add(p.place_id);return true; });
}

function detectCity(address, searchName) {
  if (searchName && CLUB_CITY_MAP[searchName]) return CLUB_CITY_MAP[searchName];
  if (!address) return "Lainnya";
  const lower = address.toLowerCase();
  for (const [city, keywords] of Object.entries(CITY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return city;
  }
  return "Lainnya";
}

// ── GET /api/dashboard — serve from cache only ─────────────────────────────
app.get("/api/dashboard", requireAuth, async (req, res) => {
  const cacheKey = "dashboard_all";
  if (cache.has(cacheKey)) return res.json({ source: "cache", ...cache.get(cacheKey) });
  return res.json({ source: "empty", cities: [], lastUpdated: null });
});

// ── POST /api/scrape — force fetch ─────────────────────────────────────────
app.post("/api/scrape", requireAuth, async (req, res) => {
  if (!API_KEY || API_KEY === "ISI_API_KEY_KAMU_DI_SINI") return res.status(400).json({ error: "API key belum diisi." });
  cache.set("scrape_status", { status: "running", startedAt: new Date().toISOString() }, 0);
  try {
    const allFTLPlaces = await searchAllClubs();
    const allDetails = (await Promise.all(allFTLPlaces.map(p => getPlaceDetails(p.place_id)))).filter(Boolean);

    const cityMap = {};
    Object.keys(CITY_KEYWORDS).forEach(c => cityMap[c] = []);
    cityMap["Lainnya"] = [];
    allDetails.forEach((d, idx) => {
      const city = detectCity(d.formatted_address, allFTLPlaces[idx]?.searchName);
      cityMap[city].push({ ...d, searchName: allFTLPlaces[idx]?.searchName });
    });

    const cityResults = Object.entries(cityMap).filter(([,b])=>b.length>0).map(([city, branches]) => {
      const allReviews = branches.flatMap(d => d.reviews||[]);
      const avgRating = branches.reduce((s,d)=>s+(d.rating||0),0)/branches.length;
      const totalRatings = branches.reduce((s,d)=>s+(d.user_ratings_total||0),0);
      return {
        city, branchCount: branches.length, avgRating: Math.round(avgRating*10)/10, totalRatings,
        branches: branches.map(d => ({
          name: d.name, address: d.formatted_address, rating: d.rating,
          totalRatings: d.user_ratings_total, location: d.geometry?.location,
          reviews: (d.reviews||[]).slice(0,20).map(r=>({ rating:r.rating,text:r.text,author:r.author_name,time:r.relative_time_description,relative_time_description:r.relative_time_description })),
        })),
        starDistribution: calcStarDistribution(allReviews),
        sentiment: analyzeSentiment(allReviews),
        recentReviews: allReviews.slice(0,10).map(r=>({ author:r.author_name,rating:r.rating,text:r.text,time:r.relative_time_description,relative_time_description:r.relative_time_description,profilePhoto:r.profile_photo_url })),
      };
    });

    const overallRating = cityResults.reduce((s,c)=>s+c.avgRating,0)/cityResults.length;
    const totalReviews = cityResults.reduce((s,c)=>s+c.totalRatings,0);
    const overallSentiment = { positive:Math.round(cityResults.reduce((s,c)=>s+(c.sentiment.positive||0),0)/cityResults.length), neutral:Math.round(cityResults.reduce((s,c)=>s+(c.sentiment.neutral||0),0)/cityResults.length), negative:Math.round(cityResults.reduce((s,c)=>s+(c.sentiment.negative||0),0)/cityResults.length) };
    const worstCity = cityResults.reduce((w,c)=>c.avgRating<w.avgRating?c:w, cityResults[0]);

    const payload = { summary:{ overallRating:Math.round(overallRating*10)/10,totalReviews,sentiment:overallSentiment,worstCity:worstCity?.city,worstCityRating:worstCity?.avgRating }, cities:cityResults, recentReviews:cityResults.flatMap(c=>c.recentReviews.map(r=>({...r,city:c.city}))).slice(0,20), lastUpdated:new Date().toISOString() };

    cache.set("dashboard_all", payload, 0);
    cache.set("scrape_status", { status:"done", completedAt:new Date().toISOString() }, 0);
    savePersistentCache();
    res.json({ source:"live", ...payload });
  } catch(err) {
    cache.set("scrape_status", { status:"error", error:err.message }, 0);
    console.error("Scrape error:", err.message);
    res.status(500).json({ error:"Scrape gagal: "+err.message });
  }
});

// ── GET /api/branches ──────────────────────────────────────────────────────
app.get("/api/branches", requireAuth, async (req, res) => {
  if (!API_KEY) return res.status(400).json({ error:"API key belum diisi" });
  try {
    const places = await searchAllClubs();
    const branches = places.map(p => ({ placeId:p.place_id,name:p.name,city:detectCity(p.formatted_address,p.searchName),location:p.geometry?.location,rating:p.rating,totalRatings:p.user_ratings_total }));
    res.json(branches);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── GET /api/competitor/:placeId ───────────────────────────────────────────
app.get("/api/competitor/:placeId", requireAuth, async (req, res) => {
  if (!API_KEY) return res.status(400).json({ error:"API key belum diisi" });
  const { placeId } = req.params;
  const radius = parseFloat(req.query.radius) || 2;
  try {
    const { analyzeCompetitorsForBranch } = require("./competitor");
    const detail = await getPlaceDetails(placeId);
    if (!detail) return res.status(404).json({ error:"Cabang tidak ditemukan" });
    const branch = { name:detail.name,address:detail.formatted_address,location:detail.geometry?.location,rating:detail.rating,placeId };
    const result = await analyzeCompetitorsForBranch(branch, radius, API_KEY, cache);
    res.json({ ...result,lastUpdated:new Date().toISOString(),source:"live" });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── Keywords endpoints ─────────────────────────────────────────────────────
const KEYWORDS_FILE = path.join(__dirname,"../data/adaptive_keywords.json");
function loadKw() { try { return fs.existsSync(KEYWORDS_FILE)?JSON.parse(fs.readFileSync(KEYWORDS_FILE,"utf8")):{pending:[],approved:[],rejected:[]}; } catch(e){return{pending:[],approved:[],rejected:[]};} }
function saveKw(d) { fs.mkdirSync(path.dirname(KEYWORDS_FILE),{recursive:true}); fs.writeFileSync(KEYWORDS_FILE,JSON.stringify(d,null,2)); }

app.get("/api/keywords", requireAuth, (req,res) => {
  const { getAllCategories } = require("./keywords");
  const kw = loadKw();
  const cats = Object.entries(getAllCategories()).map(([key,cat])=>({key,label:cat.label}));
  res.json({ ...kw, categories:cats });
});
app.post("/api/keywords/approve", requireAuth, (req,res) => {
  const { word,category } = req.body; if(!word)return res.status(400).json({error:"word required"});
  const kw = loadKw();
  kw.pending = kw.pending.filter(k=>k.word!==word);
  if(!kw.approved.find(k=>k.word===word)) kw.approved.push({word,category,approvedAt:new Date().toISOString()});
  saveKw(kw); res.json({success:true});
});
app.post("/api/keywords/reject", requireAuth, (req,res) => {
  const { word } = req.body; if(!word)return res.status(400).json({error:"word required"});
  const kw = loadKw();
  kw.pending = kw.pending.filter(k=>k.word!==word);
  if(!kw.rejected.find(k=>k.word===word)) kw.rejected.push({word,rejectedAt:new Date().toISOString()});
  saveKw(kw); res.json({success:true});
});
app.post("/api/keywords/restore", requireAuth, (req,res) => {
  const { word } = req.body; if(!word)return res.status(400).json({error:"word required"});
  const kw = loadKw();
  const item = kw.rejected.find(k=>k.word===word);
  if(item) { kw.rejected=kw.rejected.filter(k=>k.word!==word); kw.pending.push({word,count:1,context:[]}); }
  saveKw(kw); res.json({success:true});
});
app.post("/api/keywords/delete", requireAuth, (req,res) => {
  const { word,from } = req.body; if(!word)return res.status(400).json({error:"word required"});
  const kw = loadKw();
  if(from==="rejected") kw.rejected=kw.rejected.filter(k=>k.word!==word);
  else kw.pending=kw.pending.filter(k=>k.word!==word);
  saveKw(kw); res.json({success:true});
});

// ── GET /api/export/ratings — Excel export ─────────────────────────────────
app.get("/api/export/ratings", requireAuth, async (req, res) => {
  if (!cache.has("dashboard_all")) return res.status(404).json({ error:"Belum ada data. Lakukan scrape terlebih dahulu." });
  const data = cache.get("dashboard_all");
  const cities = data.cities || [];
  const wb = new ExcelJS.Workbook();
  wb.creator = "FTL Gym Dashboard";
  wb.created = new Date();

  const headerFill = { type:"pattern",pattern:"solid",fgColor:{argb:"FF1B3A6B"} };
  const headerFont = { bold:true,color:{argb:"FFFFFFFF"},size:11,name:"Arial" };
  const centerAlign = { horizontal:"center",vertical:"middle" };
  const border = { style:"thin",color:{argb:"FFD1D5DB"} };
  const allBorders = { top:border,left:border,bottom:border,right:border };

  // Sheet 1: Rating per Club
  const ws1 = wb.addWorksheet("Rating per Club");
  ws1.columns = [
    {header:"No",key:"no",width:6},{header:"Club",key:"club",width:35},
    {header:"Region",key:"city",width:16},{header:"Rating",key:"rating",width:10},
    {header:"Total Reviews",key:"total",width:15},{header:"Positive %",key:"pos",width:12},
    {header:"Negative %",key:"neg",width:12},{header:"Status",key:"status",width:14},
  ];
  ws1.getRow(1).eachCell(cell=>{ cell.fill=headerFill;cell.font=headerFont;cell.alignment=centerAlign;cell.border=allBorders; });
  ws1.getRow(1).height=24;

  let no=1,rowNum=2;
  cities.forEach(c=>{
    (c.branches||[]).filter(b=>b.rating).sort((a,b)=>b.rating-a.rating).forEach(b=>{
      const pos=(c.sentiment?.positive||0)/100, neg=(c.sentiment?.negative||0)/100;
      const status=b.rating>=4.7?"Excellent":b.rating>=4.3?"Good":b.rating>=4.0?"Needs Work":"Critical";
      const row=ws1.addRow({no:no++,club:b.name,city:c.city,rating:b.rating,total:b.totalRatings||0,pos,neg,status});
      row.height=20;
      row.eachCell(cell=>{ cell.border=allBorders;cell.font={name:"Arial",size:10};cell.alignment={vertical:"middle"}; });
      row.getCell("rating").font={bold:true,name:"Arial",size:10,color:{argb:b.rating>=4.5?"FF16A34A":b.rating>=4.0?"FFFF9500":"FFFF3B30"}};
      row.getCell("rating").alignment=centerAlign;
      row.getCell("pos").numFmt="0%"; row.getCell("neg").numFmt="0%";
      row.getCell("total").alignment=centerAlign;
      const sc=row.getCell("status"); sc.alignment=centerAlign;
      sc.font={bold:true,name:"Arial",size:10,color:{argb:status==="Excellent"?"FF16A34A":status==="Good"?"FF007AFF":status==="Needs Work"?"FFFF9500":"FFFF3B30"}};
      if(rowNum%2===0) row.eachCell(cell=>{ cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF8F9FF"}}; });
      rowNum++;
    });
  });

  const totalBranches=cities.reduce((s,c)=>s+(c.branches||[]).filter(b=>b.rating).length,0);
  const totalReviews=cities.reduce((s,c)=>s+c.totalRatings,0);
  const avgRating=(cities.reduce((s,c)=>s+c.avgRating,0)/cities.length).toFixed(2);
  ws1.addRow([]);
  const sr=ws1.addRow(["","TOTAL / AVERAGE","",avgRating,totalReviews,"","",""]);
  sr.eachCell(cell=>{ cell.font={bold:true,name:"Arial",size:10};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFEFF6FF"}};cell.border=allBorders; });

  // Sheet 2: Summary per Region
  const ws2=wb.addWorksheet("Summary per Region");
  ws2.columns=[
    {header:"Region",key:"city",width:18},{header:"Total Clubs",key:"clubs",width:14},
    {header:"Avg Rating",key:"rating",width:12},{header:"Total Reviews",key:"total",width:15},
    {header:"Positive Sentiment",key:"pos",width:18},{header:"Negative Sentiment",key:"neg",width:18},
    {header:"Best Club",key:"best",width:30},{header:"Needs Attention",key:"worst",width:30},
  ];
  ws2.getRow(1).eachCell(cell=>{ cell.fill=headerFill;cell.font=headerFont;cell.alignment=centerAlign;cell.border=allBorders; });
  ws2.getRow(1).height=24;
  cities.forEach(c=>{
    const branches=(c.branches||[]).filter(b=>b.rating).sort((a,b)=>b.rating-a.rating);
    const row=ws2.addRow({city:c.city,clubs:branches.length,rating:c.avgRating,total:c.totalRatings,pos:(c.sentiment?.positive||0)/100,neg:(c.sentiment?.negative||0)/100,best:branches[0]?.name||"-",worst:branches[branches.length-1]?.name||"-"});
    row.height=20;
    row.eachCell(cell=>{ cell.border=allBorders;cell.font={name:"Arial",size:10};cell.alignment={vertical:"middle"}; });
    row.getCell("pos").numFmt="0%"; row.getCell("neg").numFmt="0%";
    row.getCell("rating").font={bold:true,name:"Arial",size:10};
  });

  // Sheet 3: Info
  const ws3=wb.addWorksheet("Info");
  ws3.getCell("A1").value="FTL Gym — Google Reviews Dashboard";
  ws3.getCell("A1").font={bold:true,size:14,name:"Arial",color:{argb:"FF1B3A6B"}};
  ws3.getCell("A2").value=`Data scrape: ${new Date(data.lastUpdated).toLocaleString("id-ID")}`;
  ws3.getCell("A3").value=`Total clubs: ${totalBranches} | Total reviews: ${totalReviews.toLocaleString("id-ID")} | Avg rating: ${avgRating}`;
  ws3.getCell("A4").value="Note: Rating & total reviews from Google Maps (100% accurate). Sentiment from last 20 reviews per club (sample).";
  ws3.getCell("A4").font={italic:true,color:{argb:"FF6B7280"},name:"Arial",size:10};
  ws3.columns=[{width:80}];

  const dateStr=new Date().toISOString().split("T")[0];
  res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition",`attachment; filename="FTL-Ratings-${dateStr}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// ── GET /api/scrape/status ─────────────────────────────────────────────────
app.get("/api/scrape/status", requireAuth, (req,res) => {
  const status=cache.get("scrape_status")||{status:"idle"};
  res.json({...status,hasDashboard:cache.has("dashboard_all"),lastUpdated:cache.get("dashboard_all")?.lastUpdated||null});
});

app.get("/api/cache/clear", requireAuth, (req,res) => { cache.flushAll(); res.json({message:"Cache cleared."}); });

app.get("/competitor.html",(req,res)=>res.sendFile(path.join(__dirname,"../public/competitor.html")));
app.get("/keywords.html",(req,res)=>res.sendFile(path.join(__dirname,"../public/keywords.html")));
app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"../public/index.html")));

const PORT=process.env.PORT||3000;
process.on("SIGTERM",()=>{savePersistentCache();process.exit(0);});
process.on("SIGINT",()=>{savePersistentCache();process.exit(0);});

app.listen(PORT,()=>{
  console.log(`\n🏋️  FTL Gym Dashboard running at http://localhost:${PORT}`);
  console.log(`📊  API available at http://localhost:${PORT}/api/dashboard\n`);
});

// ─────────────────────────────────────────────────────────────────────────────
// keywords.js — Dataset keyword + adaptive learning engine
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");

const ADAPTIVE_FILE = path.join(__dirname, "../data/adaptive_keywords.json");

// ── Pastikan folder data ada ───────────────────────────────────────────────
function ensureDataDir() {
  const dir = path.join(__dirname, "../data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Load adaptive keywords dari file ──────────────────────────────────────
function loadAdaptive() {
  ensureDataDir();
  if (!fs.existsSync(ADAPTIVE_FILE)) {
    const init = { approved: [], rejected: [], pending: [], lastUpdated: null };
    fs.writeFileSync(ADAPTIVE_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  try { return JSON.parse(fs.readFileSync(ADAPTIVE_FILE, "utf8")); }
  catch { return { approved: [], rejected: [], pending: [], lastUpdated: null }; }
}

// ── Simpan adaptive keywords ke file ──────────────────────────────────────
function saveAdaptive(data) {
  ensureDataDir();
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(ADAPTIVE_FILE, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// DATASET UTAMA — 300+ keyword, 9 kategori, 2 bahasa + slang
// ─────────────────────────────────────────────────────────────────────────────
const BASE_CATEGORIES = {
  kebersihan: {
    label: "Kebersihan & Higienitas",
    icon: "clean",
    impact: 10,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Kebersihan & higienitas kelas premium — gym bersih, nyaman, bebas bau",
    keywords: [
      // Umum
      "kotor","bau","jorok","kumuh","menjijikkan","tidak bersih","kurang bersih",
      "sampah","debu","berdebu","pengap","bacin","busuk","apek","pesing","lembab",
      "jamur","semrawut","berantakan","tidak terawat","bercak","noda","kerak",
      "lendir","licin","becek","basah tidak jelas",
      // Bau spesifik
      "bau pesing","bau got","bau rokok","bau apek","bau keringat","bau tengik",
      // Hewan/serangga
      "kecoak","tikus","serangga","nyamuk","semut","lalat","kutu",
      // Area spesifik
      "jamur dinding","cat mengelupas","dinding kotor","plafon bocor",
      "genangan air","saluran mampet","wc mampet","closet kotor","urinoir bau",
      "tempat sampah penuh","tempat sampah tidak ada","tissue habis",
      "sabun habis","tidak ada sabun cuci tangan",
      "lantai kotor","kaca kotor","cermin kotor","toilet jorok",
      "shower bau","loker bau","handuk kotor","lap kotor",
      // English/slang
      "dirty","filthy","smelly","stinky","unhygienic","gross","disgusting",
      "nasty","moldy","dusty","messy","hygiene","unhygienic"
    ],
    negationExceptions: ["tidak bau","tidak kotor","sudah bersih","bersih banget","sangat bersih"]
  },

  peralatan: {
    label: "Peralatan Rusak / Tidak Lengkap",
    icon: "equipment",
    impact: 9,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Peralatan lengkap, modern & terawat — semua alat siap pakai tanpa antre",
    keywords: [
      "alat rusak","mesin rusak","treadmill rusak","dumbbell rusak","barbell rusak",
      "alat mati","mesin mati","alat tidak berfungsi","alat usang","alat jadul",
      "alat lama","alat sedikit","kurang alat","alat terbatas","rebutan alat",
      "antre alat","waiting alat","alat ngadat","kabel putus","beban rusak",
      "bench rusak","rack rusak","alat banyak rusak","ga ada alat","gak ada alat",
      // Tambahan detail
      "rantai putus","ban treadmill slip","layar treadmill mati",
      "mesin elliptical rusak","rowing machine rusak","leg press rusak",
      "smith machine macet","cable putus","pulley rusak","grip rusak",
      "seat rusak","sandaran rusak","baut kendur","goyang","tidak stabil",
      "berbahaya","membahayakan","hampir jatuh","hampir celaka",
      "peralatan berbahaya","tidak ada peralatan kardio","tidak ada free weight",
      "dumbbell tidak lengkap","barbel tidak ada","plate tidak ada",
      "bumper plate","tidak ada squat rack","tidak ada bench press",
      "tidak ada pull up bar","matras kotor","matras rusak","matras tipis",
      // English
      "broken equipment","broken machine","out of order","equipment broken",
      "no equipment","limited equipment","old equipment","machine broken"
    ],
    negationExceptions: ["alat lengkap","alat bagus","alat baru","alat modern","sudah diperbaiki"]
  },

  staff: {
    label: "Staff Tidak Profesional / Tidak Ramah",
    icon: "staff",
    impact: 9,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Trainer bersertifikat, ramah & siap membantu — pelayanan terbaik untuk hasil maksimal",
    keywords: [
      "staff tidak ramah","trainer tidak profesional","pelayanan buruk",
      "staff kasar","staff cuek","tidak dilayani","diabaikan","trainer malas",
      "trainer tidak ada","trainer asal","staff judes","resepsionis jutek",
      "tidak sopan","tidak helpful","staff galak","staff jutek","trainer cuek",
      "ga ada trainer","gak ada trainer","trainer kemana","staff kemana",
      "ga ada yang bantu","gak direspon","dicuekin","ngebentak","bentak",
      "membentak","tidak menolong",
      // Tambahan
      "trainer tidak hadir","trainer sering absen","trainer ganti-ganti",
      "trainer baru terus","trainer tidak konsisten","trainer tidak follow up",
      "trainer pilih kasih","trainer hanya perhatiin member tertentu",
      "trainer sibuk hp","trainer main hp","trainer tidak fokus",
      "trainer tidak memperhatikan","trainer salah ajarkan","teknik salah",
      "program tidak jelas","program tidak ada","tidak ada program latihan",
      "resepsionis tidak ada","front desk kosong","tidak ada yang jaga",
      "staff menghilang","staff tidak ada di tempat","staff tidak tau",
      "tidak kompeten","tidak berpengalaman","tidak bersertifikat",
      "asal-asalan","tidak ada briefing","tidak ada orientasi member baru",
      // English
      "rude staff","unfriendly","unprofessional","ignored","no trainer",
      "bad service","poor service","staff rude","trainer absent","no help"
    ],
    negationExceptions: ["staff ramah","trainer bagus","pelayanan bagus","trainer profesional","sangat membantu"]
  },

  ac_ventilasi: {
    label: "AC / Ventilasi Bermasalah",
    icon: "ac",
    impact: 8,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Gym sejuk & nyaman sepanjang hari — AC full kapasitas, udara segar terjamin",
    keywords: [
      "ac rusak","ac mati","ac tidak dingin","panas","gerah","kipas rusak",
      "ventilasi buruk","pengap","udara pengap","tidak ada ac","ac lemah",
      "ac kurang","panas banget","gerah banget","sumuk","sumpek",
      "tidak sejuk","kipas mati","blower mati","ac bocor",
      "air menetes dari ac","ac berisik","ac bising","suara ac keras",
      "bau ac","filter ac kotor","ac tidak merata","sebagian panas",
      "pojok panas","lantai atas panas","basement pengap",
      "kipas angin doang","tidak ada kipas","ruangan pengap",
      "oksigen kurang","sesak napas","pusing karena panas","dehidrasi",
      "kepanasan",
      // English
      "hot","stuffy","no ac","broken ac","no air conditioning",
      "humid","sweaty gym","bad ventilation","too hot","overheating"
    ],
    negationExceptions: ["ac dingin","ac bagus","sejuk","tidak panas","nyaman"]
  },

  harga: {
    label: "Harga Tidak Sebanding / Billing Bermasalah",
    icon: "price",
    impact: 7,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Harga transparan & worth it — fasilitas premium dengan harga yang fair, tanpa biaya tersembunyi",
    keywords: [
      "mahal","tidak worth","tidak sebanding","kemahalan","harga tidak wajar",
      "overpriced","terlalu mahal","harga mencekik","biaya mahal",
      "membership mahal","daftar mahal","iuran mahal","tidak sesuai harga",
      "tidak value for money","rugi","tipu","biaya tersembunyi",
      "hidden fee","tidak transparan","harga naik","biaya tambahan",
      "denda","bayar lagi","bayar terus","tagih terus","auto debit",
      "susah cancel","tidak bisa cancel","refund susah","uang tidak kembali",
      // Tambahan
      "tidak ada promo","promo tidak sesuai","promo bohong",
      "harga beda sama yang di iklan","harga tidak konsisten",
      "ditawari paket","dipaksa beli paket","sales agresif","hard selling",
      "ditekan beli","tidak bisa downgrade","tidak bisa pause membership",
      "tidak bisa freeze","freeze berbayar","transfer membership tidak bisa",
      "tidak bisa ganti jadwal","jadwal kaku","tidak fleksibel",
      "kontrak panjang","terikat kontrak","susah keluar","denda keluar",
      "biaya admin","biaya registrasi mahal","uang pangkal mahal",
      // English
      "expensive","overpriced","not worth it","hidden charges",
      "can't cancel","no refund","rip off","waste of money","too expensive"
    ],
    negationExceptions: ["harga terjangkau","worth it","value for money","harga oke","murah"]
  },

  parkir: {
    label: "Parkir Sulit / Tidak Aman",
    icon: "parking",
    impact: 5,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Parkir luas, aman & mudah — fokus workout tanpa pusing cari parkir",
    keywords: [
      "parkir susah","parkir sempit","tidak ada parkir","parkir jauh",
      "parkir penuh","parkir bayar mahal","susah parkir","lahan parkir sempit",
      "tidak ada lahan","parkir motor susah","parkir mobil susah",
      "tidak ada tempat","parkir terbatas","parkir jauh banget",
      "jalan kaki jauh",
      // Tambahan
      "parkir tidak aman","motor hilang","mobil lecet","tidak ada cctv parkir",
      "parkir gelap","parkir banjir","parkir sempit banget","tidak muat",
      "susah manuver","parkir petugas tidak ada","parkir tidak dijaga",
      "motor jatuh","tidak ada atap parkir","parkir panas",
      "harus jalan kaki","lift parkir rusak",
      // English
      "no parking","parking difficult","parking full","no parking space","parking far"
    ],
    negationExceptions: ["parkir mudah","parkir luas","parkir aman","parkir gratis","ada parkir"]
  },

  kepadatan: {
    label: "Terlalu Ramai / Padat",
    icon: "crowd",
    impact: 7,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Gym luas & tidak berdesakan — workout nyaman tanpa antre & rebutan alat",
    keywords: [
      "penuh","ramai","antri","sesak","crowded","terlalu ramai",
      "tidak bisa workout","antre panjang","gym penuh","padat","sempit",
      "tidak ada tempat","susah gerak","rebutan","over kapasitas",
      "gym sesak","tidak bisa gerak","tidak ada space","penuh banget",
      "ramai banget","antre lama",
      // Tambahan
      "gym penuh terus","selalu penuh","tidak pernah sepi",
      "susah dapat tempat","tidak dapat alat","harus tunggu lama",
      "antri 30 menit","antri sejam","tidak ada space buat stretching",
      "area kardio penuh","area beban penuh","mirror penuh orang",
      "tidak bisa latihan dengan nyaman","terlalu banyak member",
      "over member","dijual terlalu banyak member","kapasitas tidak sesuai",
      // English
      "crowded","too crowded","always packed","queue","waiting","no space","full"
    ],
    negationExceptions: ["tidak ramai","sepi","nyaman","tidak penuh","banyak tempat"]
  },

  fasilitas: {
    label: "Fasilitas Pendukung Buruk",
    icon: "facility",
    impact: 7,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Fasilitas lengkap & terawat — loker aman, kamar mandi bersih, ruang ganti nyaman",
    keywords: [
      "loker rusak","loker tidak ada","kamar mandi kotor","shower tidak ada",
      "toilet rusak","kamar ganti sempit","tidak ada cermin","ruang ganti kotor",
      "loker tidak aman","barang hilang","kecurian","gembok rusak",
      "shower mati","air mati","tidak ada air","sabun tidak ada",
      "tidak ada handuk","mushola kotor","tidak ada mushola",
      "lift rusak","tangga rusak",
      // Tambahan
      "loker penuh","loker tidak cukup","tidak dapat loker","loker sempit",
      "tidak ada gantungan","pencahayaan kurang","gelap","lampu mati",
      "ruang gelap","cermin buram","cermin retak","tidak ada timbangan",
      "timbangan rusak","tidak ada tv","tv mati","remote tv hilang",
      "tidak ada dispenser air","air minum tidak ada","air galon habis",
      "vending machine rusak","wifi tidak ada","wifi lambat","sinyal jelek",
      "tidak bisa streaming musik","speaker rusak","musik terlalu keras",
      // English
      "broken locker","no locker","dirty bathroom","no shower","stolen",
      "theft","no mirror","dirty changing room","no wifi","broken facilities"
    ],
    negationExceptions: ["loker aman","fasilitas lengkap","fasilitas bagus","kamar mandi bersih"]
  },

  manajemen: {
    label: "Manajemen / Pengelolaan Buruk",
    icon: "management",
    impact: 9,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Manajemen profesional & transparan — keluhan direspon cepat, komitmen selalu terjaga",
    keywords: [
      "manajemen buruk","tidak profesional","pengelolaan buruk",
      "tidak ada respon","komplain diabaikan","tidak ada follow up",
      "janji tidak ditepati","admin ribet","pendaftaran ribet",
      "informasi tidak jelas","menipu","tidak jujur","tidak transparan",
      "scam","tipu daya","bohong","ingkar janji","tidak konsisten",
      "berubah-ubah aturan","susah dihubungi","tidak bisa dihubungi",
      "nomor tidak aktif","tidak direspon","chat tidak dibalas",
      // Tambahan
      "ganti manajemen","manajemen baru buruk","sejak ganti owner",
      "turun kualitas","dulu bagus sekarang jelek","tidak ada improvement",
      "tidak ada perkembangan","janji renovasi tidak ditepati",
      "janji perbaikan tidak dilakukan","sudah komplain berkali-kali",
      "komplain tidak direspon","tidak ada perubahan","banyak yang komplain",
      "banyak yang kecewa","member banyak yang keluar","member pada cabut",
      "pindah gym lain","tidak rekomendasikan","tidak akan kembali",
      "kapok","jera","tobat",
      // English
      "bad management","scam","fraud","misleading","no response",
      "ignored complaint","dishonest","unprofessional management","never coming back"
    ],
    negationExceptions: ["manajemen bagus","respon cepat","profesional","sudah ditangani","direspon"]
  },

  jam_operasional: {
    label: "Jam Operasional Tidak Fleksibel",
    icon: "time",
    impact: 6,
    sentimentRange: { positive: [4,5], neutral: [3,3], negative: [1,2] },
    adAngle: "Jam operasional fleksibel — buka pagi hingga malam, sesuai jadwal kamu",
    keywords: [
      "jam buka","tutup terlalu awal","buka terlambat","jam tidak sesuai",
      "sudah tutup","tidak 24 jam","jam operasional bermasalah",
      "jam tutup lebih awal","tidak buka weekend","jadwal berubah",
      "tidak konsisten jam","jam buka berubah","tutup mendadak",
      "tutup tiba-tiba","tidak ada info tutup",
      // English
      "closed early","not open","wrong hours","closed unexpectedly","not 24 hours"
    ],
    negationExceptions: ["jam fleksibel","buka 24 jam","buka pagi","jam panjang"]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIC KONTEKS
// ─────────────────────────────────────────────────────────────────────────────

// Kata pembalik dalam radius 5 kata sebelum keyword
const NEGATION_WORDS = [
  "tidak","bukan","belum","sudah tidak","tadinya","dulu","pernah",
  "sebelumnya","katanya","konon","ga","gak","nggak","ngga","enggak"
];

// Kata penguat — naikkan skor ×1.5
const INTENSIFIERS = [
  "banget","sekali","parah","sangat","amat","benar-benar","sungguh",
  "luar biasa","paling","ekstrem","fatal","bahaya","super","mega",
  "bgt","bngt","abis","habis","pol","bet"
];

// Pola resolusi — jangan hitung sebagai masalah aktif
const RESOLUTION_PATTERNS = [
  "sudah diperbaiki","sudah bersih","sudah bagus","sudah diganti",
  "sudah normal","sudah oke","management sudah respon","sudah ditangani",
  "update: sudah","edit: sudah","alhamdulillah sudah","ternyata sudah",
  "sekarang sudah","tapi sudah","tapi sekarang"
];

// Pola sarkasme — otomatis flag negatif tinggi
const SARCASM_PATTERNS = [
  "katanya bintang 5","konon premium","padahal bayar mahal",
  "bayar mahal tapi","harga premium fasilitas ecek-ecek",
  "kelas dunia katanya","gym mewah tapi","premium katanya",
  "katanya gym terbaik","katanya bagus","terkenal tapi",
  "rekomendasi orang tapi","rating tinggi tapi"
];

// Bobot multiplier per rating bintang
const RATING_MULTIPLIER = { 1: 2.0, 2: 1.5, 3: 0.8, 4: 0.2, 5: 0.0 };

// Confidence level berdasarkan jumlah review negatif
function getConfidenceLevel(negativeCount) {
  if (negativeCount >= 21) return { level: "very_high", label: "Sangat Valid", color: "blue" };
  if (negativeCount >= 11) return { level: "high", label: "Valid", color: "green" };
  if (negativeCount >= 6)  return { level: "medium", label: "Cukup Valid", color: "orange" };
  if (negativeCount >= 3)  return { level: "low", label: "Indikasi Awal", color: "yellow" };
  return { level: "very_low", label: "Data Terbatas", color: "gray" };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE KEYWORD LEARNING
// ─────────────────────────────────────────────────────────────────────────────

// Ekstrak kata-kata yang belum ada di dataset dari review buruk
function extractCandidateKeywords(reviews) {
  const adaptive = loadAdaptive();
  const allExistingKeywords = new Set([
    ...Object.values(BASE_CATEGORIES).flatMap((c) => c.keywords),
    ...adaptive.approved.map((k) => k.word),
    ...adaptive.rejected.map((k) => k.word),
    ...adaptive.pending.map((k) => k.word),
  ]);

  const wordFreq = {};
  const wordContext = {};

  reviews
    .filter((r) => r.rating <= 2)
    .forEach((r) => {
      const text = (r.text || "").toLowerCase();
      // Tokenize: ambil kata 2-4 suku kata, skip stopwords
      const stopwords = new Set([
        "yang","dan","di","ke","dari","dengan","untuk","ini","itu",
        "ada","tidak","sudah","akan","bisa","juga","atau","pada",
        "saya","kami","kita","anda","dia","mereka","nya","si","sang",
        "ya","iya","ok","oke","sih","deh","nih","dong","lah","kan",
        "the","is","it","and","or","but","in","on","at","to","for"
      ]);

      // Juga cari frasa 2 kata
      const words = text.split(/\s+/).filter((w) => w.length > 3 && !stopwords.has(w));
      const phrases = [];
      for (let i = 0; i < words.length - 1; i++) {
        phrases.push(`${words[i]} ${words[i+1]}`);
      }

      [...words, ...phrases].forEach((w) => {
        if (!allExistingKeywords.has(w) && w.length > 3) {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
          if (!wordContext[w]) wordContext[w] = [];
          if (wordContext[w].length < 2) {
            wordContext[w].push({
              text: r.text?.substring(0, 150) || "",
              rating: r.rating,
            });
          }
        }
      });
    });

  // Whitelist suffix/prefix kata yang PASTI netral/positif — jangan suggest
  const POSITIVE_WORDS = new Set([
    "bagus","baik","bersih","ramah","nyaman","lengkap","recommended","mantap",
    "oke","puas","suka","keren","profesional","worth","senang","seru","luar biasa",
    "terbaik","terlengkap","terbersih","ternyaman","termurah","terdekat",
    "menyenangkan","memuaskan","membantu","bermanfaat","berguna",
    "rajin","disiplin","sigap","cepat","tanggap","responsif",
    "modern","canggih","baru","terawat","rapi","teratur","strategis",
    "murah","terjangkau","hemat","promo","diskon","gratis",
    "enak","asik","sip","mantul","oke banget","good","great","nice","best","clean","friendly"
  ]);

  // Kata terlalu pendek atau terlalu umum untuk jadi keyword analisis
  const SKIP_PATTERNS = [
    /^\d+$/, // angka saja
    /^[a-z]{1,3}$/, // terlalu pendek
    /^(gym|ftl|member|club|sport|fitness|hari|bulan|tahun|kali|orang|tempat|area|lantai|ruang|lokasi|jalan|jl|no|rt|rw|kec|kel|kota|prov)$/,
  ];

  // Hanya suggest kata yang muncul 5x+ dan berkonotasi negatif
  const candidates = Object.entries(wordFreq)
    .filter(([word, count]) => {
      if (count < 5) return false;
      if (POSITIVE_WORDS.has(word)) return false;
      if (SKIP_PATTERNS.some((p) => p.test(word))) return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      context: wordContext[word] || [],
      suggestedCategory: "uncategorized",
      discoveredAt: new Date().toISOString(),
    }));

  // Tambah ke pending kalau belum ada
  if (candidates.length > 0) {
    const existingPending = new Set(adaptive.pending.map((k) => k.word));
    const newCandidates = candidates.filter((c) => !existingPending.has(c.word));
    if (newCandidates.length > 0) {
      adaptive.pending.push(...newCandidates);
      saveAdaptive(adaptive);
    }
  }

  return candidates;
}

// Approve keyword dari pending
function approveKeyword(word, category) {
  const adaptive = loadAdaptive();
  const idx = adaptive.pending.findIndex((k) => k.word === word);
  if (idx === -1) return false;
  const [kw] = adaptive.pending.splice(idx, 1);
  kw.category = category;
  kw.approvedAt = new Date().toISOString();
  adaptive.approved.push(kw);
  saveAdaptive(adaptive);
  return true;
}

// Hapus keyword permanen dari rejected atau pending
function deleteKeyword(word, from = "rejected") {
  const adaptive = loadAdaptive();
  const list = adaptive[from];
  if (!list) return false;
  const idx = list.findIndex((k) => k.word === word);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveAdaptive(adaptive);
  return true;
}

// Reject keyword dari pending (tanpa alasan)
function rejectKeyword(word) {
  const adaptive = loadAdaptive();
  const idx = adaptive.pending.findIndex((k) => k.word === word);
  if (idx === -1) return false;
  const [kw] = adaptive.pending.splice(idx, 1);
  kw.rejectedAt = new Date().toISOString();
  adaptive.rejected.push(kw);
  saveAdaptive(adaptive);
  return true;
}

// Restore keyword dari rejected ke pending
function restoreKeyword(word) {
  const adaptive = loadAdaptive();
  const idx = adaptive.rejected.findIndex((k) => k.word === word);
  if (idx === -1) return false;
  const [kw] = adaptive.rejected.splice(idx, 1);
  delete kw.rejectedAt;
  delete kw.reason;
  adaptive.pending.push(kw);
  saveAdaptive(adaptive);
  return true;
}

// Get semua kategori termasuk adaptive approved
function getAllCategories() {
  const adaptive = loadAdaptive();
  const categories = JSON.parse(JSON.stringify(BASE_CATEGORIES));

  // Tambahkan approved keywords ke kategori yang sesuai
  adaptive.approved.forEach((kw) => {
    if (categories[kw.category]) {
      categories[kw.category].keywords.push(kw.word);
    } else {
      // Kalau kategori tidak dikenal, tambah ke manajemen sebagai fallback
      categories.manajemen.keywords.push(kw.word);
    }
  });

  return categories;
}

module.exports = {
  BASE_CATEGORIES,
  getAllCategories,
  NEGATION_WORDS,
  INTENSIFIERS,
  RESOLUTION_PATTERNS,
  SARCASM_PATTERNS,
  RATING_MULTIPLIER,
  getConfidenceLevel,
  extractCandidateKeywords,
  approveKeyword,
  rejectKeyword,
  restoreKeyword,
  deleteKeyword,
  loadAdaptive,
  saveAdaptive,
};

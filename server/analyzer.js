// ─────────────────────────────────────────────────────────────────────────────
// analyzer.js — Engine analisis review 7 layer logic
// ─────────────────────────────────────────────────────────────────────────────

const {
  getAllCategories,
  NEGATION_WORDS,
  INTENSIFIERS,
  RESOLUTION_PATTERNS,
  SARCASM_PATTERNS,
  RATING_MULTIPLIER,
  getConfidenceLevel,
  extractCandidateKeywords,
} = require("./keywords");

// ── Cek apakah keyword dalam konteks negasi (radius 5 kata sebelumnya) ─────
function isNegated(words, keywordIndex, keywordLength) {
  const start = Math.max(0, keywordIndex - 5);
  const contextBefore = words.slice(start, keywordIndex).join(" ");
  return NEGATION_WORDS.some((neg) => contextBefore.includes(neg));
}

// ── Cek apakah ada intensifier dalam radius 3 kata sekitar keyword ─────────
function hasIntensifier(words, keywordIndex) {
  const start = Math.max(0, keywordIndex - 3);
  const end = Math.min(words.length, keywordIndex + 3);
  const context = words.slice(start, end).join(" ");
  return INTENSIFIERS.some((int) => context.includes(int));
}

// ── Cek apakah review mengandung pola resolusi ────────────────────────────
function hasResolution(text) {
  return RESOLUTION_PATTERNS.some((p) => text.includes(p));
}

// ── Cek apakah review mengandung pola sarkasme ───────────────────────────
function hasSarcasm(text) {
  return SARCASM_PATTERNS.some((p) => text.includes(p));
}

// ── Cek apakah keyword dalam konteks perbandingan positif ────────────────
function isPositiveComparison(text, keyword) {
  const positiveCompPatterns = [
    `lebih bersih dari`, `lebih baik dari`, `lebih bagus dari`,
    `tidak seperti`, `beda dengan`, `lebih nyaman dari`
  ];
  const idx = text.indexOf(keyword);
  if (idx === -1) return false;
  const surrounding = text.substring(Math.max(0, idx - 30), idx + keyword.length + 30);
  return positiveCompPatterns.some((p) => surrounding.includes(p));
}

// ── Analisis satu review dengan 7 layer logic ─────────────────────────────
function analyzeReview(reviewText, rating) {
  if (!reviewText || !reviewText.trim()) return { problems: [], isNegative: false, isSarcasm: false };

  const text = reviewText.toLowerCase().trim();
  const words = text.split(/\s+/);
  const multiplier = RATING_MULTIPLIER[rating] || 0;

  // Layer 1: Skip review positif (rating 5, kecuali ada sarkasme)
  const sarcasm = hasSarcasm(text);
  if (rating === 5 && !sarcasm) return { problems: [], isNegative: false, isSarcasm: false };
  if (rating === 4 && multiplier === 0.2 && !sarcasm) {
    // Rating 4 hanya proses kalau ada keyword negatif eksplisit
  }

  // Layer 2: Cek resolusi — kalau sudah resolved, skip
  if (hasResolution(text) && rating >= 3) {
    return { problems: [], isNegative: false, isSarcasm: false, resolved: true };
  }

  const categories = getAllCategories();
  const problems = [];
  const isNegativeReview = rating <= 2 || (rating === 3) || sarcasm;

  for (const [catKey, category] of Object.entries(categories)) {
    const matchedKeywords = [];

    for (const keyword of category.keywords) {
      const kwIdx = text.indexOf(keyword);
      if (kwIdx === -1) continue;

      const wordIdx = words.findIndex((_, i) =>
        words.slice(i, i + keyword.split(" ").length).join(" ") === keyword
      );

      // Layer 3: Cek negasi
      if (wordIdx !== -1 && isNegated(words, wordIdx, keyword.split(" ").length)) continue;

      // Layer 4: Cek perbandingan positif
      if (isPositiveComparison(text, keyword)) continue;

      // Layer 5: Cek intensifier
      const intensified = wordIdx !== -1 && hasIntensifier(words, wordIdx);

      matchedKeywords.push({ keyword, intensified });
    }

    if (matchedKeywords.length === 0) continue;

    // Layer 6: Hitung skor dengan bobot rating + intensifier
    let baseScore = matchedKeywords.length * category.impact;
    const intensifierCount = matchedKeywords.filter((k) => k.intensified).length;
    baseScore *= (1 + intensifierCount * 0.5); // +50% per intensifier

    // Layer 7: Sarcasm boost
    if (sarcasm) baseScore *= 1.5;

    const finalScore = Math.round(baseScore * multiplier * 10) / 10;
    if (finalScore <= 0) continue;

    problems.push({
      category: catKey,
      label: category.label,
      icon: category.icon,
      matchedKeywords: matchedKeywords.map((k) => k.keyword),
      intensifiedKeywords: matchedKeywords.filter((k) => k.intensified).map((k) => k.keyword),
      score: finalScore,
      impact: category.impact,
      adAngle: category.adAngle,
      excerpt: reviewText.length > 200 ? reviewText.substring(0, 200) + "..." : reviewText,
      originalRating: rating,
      isSarcasm: sarcasm,
    });
  }

  return {
    problems,
    isNegative: isNegativeReview && problems.length > 0,
    isSarcasm: sarcasm,
  };
}

// ── Agregasi semua masalah dari array reviews ─────────────────────────────
function aggregateReviews(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      categoryScores: {},
      topProblems: [],
      sentiment: { positive: 0, neutral: 0, negative: 0, positiveRange: "4-5", neutralRange: "3", negativeRange: "1-2" },
      totalAnalyzed: 0,
      negativeCount: 0,
      confidence: getConfidenceLevel(0),
      candidateKeywords: [],
    };
  }

  // Trigger adaptive learning
  extractCandidateKeywords(reviews);

  let pos = 0, neu = 0, neg = 0;
  const categoryScores = {};
  const categoryKeywords = {};
  const categoryExcerpts = {};
  let negativeCount = 0;

  reviews.forEach((r) => {
    const rating = r.rating || 3;

    // Hitung sentimen berdasarkan rating
    if (rating >= 4) pos++;
    else if (rating === 3) neu++;
    else neg++;

    const { problems, isNegative } = analyzeReview(r.text, rating);
    if (isNegative) negativeCount++;

    problems.forEach((p) => {
      if (!categoryScores[p.category]) {
        categoryScores[p.category] = 0;
        categoryKeywords[p.category] = {};
        categoryExcerpts[p.category] = [];
      }
      categoryScores[p.category] += p.score;

      p.matchedKeywords.forEach((kw) => {
        categoryKeywords[p.category][kw] = (categoryKeywords[p.category][kw] || 0) + 1;
      });

      if (categoryExcerpts[p.category].length < 3) {
        categoryExcerpts[p.category].push({
          text: p.excerpt,
          rating: p.originalRating,
          isSarcasm: p.isSarcasm,
        });
      }
    });
  });

  const total = reviews.length || 1;
  const categories = getAllCategories();

  const topProblems = Object.entries(categoryScores)
    .map(([catKey, score]) => {
      const cat = categories[catKey];
      if (!cat) return null;
      const topKeywords = Object.entries(categoryKeywords[catKey] || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([kw, count]) => ({ keyword: kw, count }));

      return {
        category: catKey,
        label: cat.label,
        icon: cat.icon,
        totalScore: Math.round(score * 10) / 10,
        impact: cat.impact,
        topKeywords,
        excerpts: categoryExcerpts[catKey] || [],
        adAngle: cat.adAngle,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalScore - a.totalScore);

  return {
    categoryScores,
    topProblems,
    sentiment: {
      positive: Math.round((pos / total) * 100),
      neutral: Math.round((neu / total) * 100),
      negative: Math.round((neg / total) * 100),
      positiveRange: "4-5 bintang",
      neutralRange: "3 bintang",
      negativeRange: "1-2 bintang",
      breakdown: {
        fiveStar: reviews.filter((r) => r.rating === 5).length,
        fourStar: reviews.filter((r) => r.rating === 4).length,
        threeStar: reviews.filter((r) => r.rating === 3).length,
        twoStar: reviews.filter((r) => r.rating === 2).length,
        oneStar: reviews.filter((r) => r.rating === 1).length,
      }
    },
    totalAnalyzed: reviews.length,
    negativeCount,
    confidence: getConfidenceLevel(negativeCount),
  };
}

// ── Generate rekomendasi iklan dari top problems ───────────────────────────
function generateAdRecommendations(competitorName, topProblems, confidence) {
  if (!topProblems || topProblems.length === 0) return [];

  return topProblems.slice(0, 3).map((problem, idx) => {
    const topKeyword = problem.topKeywords[0]?.keyword || "";
    const excerptSample = problem.excerpts[0]?.text || "";

    // Map keyword spesifik ke rekomendasi yang lebih personal
    const kwSpecificRec = {
      "kotor": "Buat konten 'Gym Terbersih di Area Ini' — tampilkan video tur kebersihan FTL, lantai mengkilap, peralatan disanitasi",
      "bau": "Kampanye 'FTL = Gym Bebas Bau' — konten behind the scenes proses kebersihan harian FTL",
      "bau keringat": "Highlight sistem ventilasi & wangi FTL — 'Workout Segar, Bukan Workout Bau'",
      "alat rusak": "Showcase maintenance rutin FTL — 'Semua Alat FTL Dicek Setiap Hari, No Broken Equipment'",
      "alat sedikit": "Tampilkan inventory alat FTL yang lengkap — foto/video semua area dengan alat melimpah",
      "trainer tidak profesional": "Highlight sertifikasi & pengalaman trainer FTL — 'Trainer FTL Bersertifikat Nasional & Internasional'",
      "trainer cuek": "Konten 'Trainer FTL Selalu Ada Untuk Kamu' — video trainer mendampingi member satu per satu",
      "staff tidak ramah": "Video testimonial member tentang keramahan staff FTL — 'Bukan Sekadar Gym, Tapi Keluarga'",
      "ac rusak": "Konten 'AC FTL Full Power 24 Jam' — tunjukkan thermometer di gym yang sejuk",
      "panas": "Kampanye 'Workout Sejuk di FTL' — testimonial member tentang kenyamanan suhu FTL",
      "mahal": "Kampanye value for money — 'Fasilitas Bintang 5, Harga Bintang 3' + breakdown harga per visit",
      "penuh": "Konten 'Gym Luas, Tidak Pernah Sesak' — video jam ramai tapi masih nyaman di FTL",
      "antri": "Highlight jumlah alat FTL — 'Di FTL, Antre Itu Tidak Ada dalam Kamus Kami'",
      "parkir susah": "Tunjukkan kemudahan akses & parkir FTL — 'Dari Parkir ke Loker, Semua Mudah di FTL'",
      "manajemen buruk": "Konten transparansi FTL — 'Tim FTL Selalu Dengar & Respon Dalam 24 Jam'",
    };

    let rec = kwSpecificRec[topKeyword] || problem.adAngle;

    return {
      priority: idx + 1,
      targetWeakness: problem.label,
      icon: problem.icon,
      recommendation: rec,
      basedOnKeywords: problem.topKeywords.slice(0, 4).map((k) => k.keyword),
      sampleBadReview: excerptSample,
      impactScore: problem.totalScore,
      confidence: confidence,
    };
  });
}

module.exports = { analyzeReview, aggregateReviews, generateAdRecommendations };

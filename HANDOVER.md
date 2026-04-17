# FTL Gym Dashboard — Handover Document
> Dokumen ini berisi semua konteks, keputusan, status, dan aturan pengembangan.
> Baca seluruh dokumen ini sebelum melanjutkan pengembangan.

---

## 1. IDENTITAS PROJECT

- **Nama project:** FTL Gym — Google Reviews Dashboard
- **Owner:** Faisal Ibrahim (akun Claude pertama), dilanjutkan di akun Claude lain
- **Tujuan utama:** Dashboard untuk Manager Ads FTL Gym agar bisa melihat review Google Maps semua cabang, analisis kompetitor, dan mendapat rekomendasi iklan yang tepat sasaran
- **Stack:** Node.js + Express (backend), HTML/CSS/JS vanilla + Chart.js (frontend)
- **Google API:** Google Places API (butuh billing aktif di Google Cloud)

---

## 2. ATURAN PENGEMBANGAN (WAJIB DIIKUTI)

Faisal adalah seorang **perfeksionis**. Berikut aturan yang harus selalu diikuti:

1. **Selalu tanya dulu** jika ada yang tidak jelas sebelum mulai coding
2. **Jangan ubah** struktur, fungsi, tampilan, atau apapun yang tidak diminta — fokus hanya pada yang diminta
3. **Antisipasi error** sebelum terjadi — selalu tambahkan guard, try/catch, dan fallback
4. **Berikan rekomendasi** yang baik jika ada pilihan implementasi
5. **Jangan over-engineer** — tanya dulu apakah fitur tertentu perlu sebelum menambahkan
6. Jika ada update/tambah fitur, **kirim hanya file yang berubah** — jangan kirim ulang semua file kecuali diminta

---

## 3. STRUKTUR PROJECT

```
FTL Reviews Backfire/          ← nama folder di komputer Faisal
  ├── server/
  │     ├── index.js           ← Express server utama + semua API endpoints
  │     ├── keywords.js        ← Dataset 300+ keyword + adaptive learning engine
  │     ├── analyzer.js        ← Engine analisis review 7 layer logic
  │     └── competitor.js      ← Engine analisis kompetitor
  ├── public/
  │     ├── index.html         ← Dashboard utama (Gojek style, Blue Navy)
  │     ├── competitor.html    ← Halaman analisis kompetitor & rekomendasi iklan
  │     └── keywords.html      ← Halaman keyword manager (adaptive learning)
  ├── data/
  │     └── adaptive_keywords.json  ← Storage keyword yang di-approve (dibuat otomatis)
  ├── .env                     ← API key (tidak di-commit ke Git)
  ├── .env.example             ← Template .env
  ├── package.json
  └── README.md
```

---

## 4. CARA MENJALANKAN

```bash
# Masuk folder
cd "FTL Reviews Backfire"

# Install dependencies (hanya perlu sekali)
npm install

# Jalankan server
npm start

# Buka di browser
# http://localhost:3000
```

**Catatan:** Google Places API butuh billing aktif di console.cloud.google.com. Tanpa billing, semua data akan kosong (status REQUEST_DENIED).

---

## 5. DATA CLUB FTL (59 CLUB — DATA INTERNAL)

### Jabodetabek (46 club)
```
FTL - Tanjung Duren, FTL - Rawamangun, FTL - Tebet, FTL - Bekasi Timur,
FTL - Gandaria, FTL - Pondok Gede, FTL - Ciputat, FTL - Pondok Bambu,
FTL - Galaxy, FTL - Menteng, FTL - Cireundeu, FTL - Green Garden,
FTL - Depok Lama, FTL - Cipondoh, FTL - Bendungan Hilir, FTL - Gunung Sahari,
FTL - Kalimalang, FTL - Cikarang, FTL - Citra Garden, FTL - Puri,
FTL - Gading Sunter, FTL - Pasar Minggu, FTL - Mustika Jaya, FTL - Pajajaran,
FTL - Pahlawan, FTL - Kemanggisan, FTL - Cibubur, FTL - Alam Sutera,
FTL - Pamulang, FTL - Sawangan, FTL - Puri Depok Mas, FTL - Satrio,
FTL - Blok M, FTL - SCBD, FTL - Mampang, FTL - Pondok Indah,
FTL - Arjuna Utara, FTL - Agora, FTL - Tomang, FTL - Green Lake City,
FTL - Kebon Sirih, Stride - Latumenten, Stride - Cibinong,
Stride - Pecenongan, Stride - Gading Timur, FTL Pilates - Gading Serpong
```

### Bandung (8 club)
```
FTL - Pasir Koja, FTL - Dago, FTL - Ahmad Yani, FTL - Merdeka,
FTL - KBP, FTL - Soekarno Hatta, FTL - Sukajadi, Stride - Banceuy
```

### Surabaya (3 club)
```
FTL - Gubeng, FTL - A.R. Hakim, FTL - Ciputra World Surabaya
```

### Bali (2 club)
```
FTL - Kerobokan, FTL - Teuku Umar
```

**Catatan penting:**
- Format nama di Google Maps: "FTL - [nama area]", bukan "FTL Gym [nama area]"
- Ada 3 brand: FTL, Stride, FTL Pilates — semua masuk satu dashboard
- Filter brand: semua yang namanya mengandung "FTL" atau "Stride"
- Sistem cari setiap club by nama satu per satu (bukan text search global) supaya dapat semua 59

---

## 6. API ENDPOINTS

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/` | Dashboard utama |
| GET | `/competitor.html` | Halaman analisis kompetitor |
| GET | `/keywords.html` | Halaman keyword manager |
| GET | `/api/dashboard` | Data semua kota + review |
| GET | `/api/branches` | Daftar semua cabang FTL (untuk dropdown) |
| GET | `/api/competitor/:placeId?radius=2` | Analisis kompetitor sekitar 1 cabang |
| GET | `/api/keywords` | Semua adaptive keywords |
| POST | `/api/keywords/approve` | Approve keyword pending |
| POST | `/api/keywords/reject` | Reject keyword pending |
| POST | `/api/keywords/restore` | Restore keyword dari rejected |
| POST | `/api/keywords/delete` | Hapus permanen dari rejected |
| GET | `/api/cache/clear` | Bersihkan cache |

---

## 7. FITUR YANG SUDAH ADA

### Dashboard Utama (index.html)
- [x] Gojek style — Blue Navy (#1B3A6B), putih bersih, bold, modern
- [x] Filter wilayah: Semua / Jabodetabek / Bandung / Surabaya / Bali
- [x] Filter club: dropdown semua club
- [x] Filter periode: Semua / Minggu ini / Bulan ini / 3 bulan / 6 bulan
- [x] Metric cards: rata-rata rating, total reviews, sentimen positif, perlu perhatian
- [x] Insight & rekomendasi otomatis (menyesuaikan filter aktif)
- [x] Rating per kota dengan distribusi bintang 1-5
- [x] Perbandingan rating — pilih 2 kota/club, tampil bar chart
- [x] Tren rating (simulasi 6 bulan — Google tidak kasih data historis)
- [x] Analisis sentimen dengan keterangan range bintang (positif=4-5, netral=3, negatif=1-2)
- [x] Topik yang sering disebut dari keyword matching
- [x] Ulasan terbaru

### Halaman Kompetitor (competitor.html)
- [x] Pilih cabang FTL + radius (1/2/3/5 km)
- [x] Rekomendasi iklan keseluruhan semua kompetitor
- [x] Detail per kompetitor: masalah utama + rekomendasi iklan spesifik
- [x] Filter nama kompetitor (chip)
- [x] Filter masalah utama (chip)
- [x] Confidence level per rekomendasi (Very Low → Very High)
- [x] Lihat review asli (toggle)
- [x] Pencarian kompetitor pakai Google Nearby Search + Haversine distance

### Keyword Manager (keywords.html)
- [x] Suggested keywords (dari review bintang 1-2, min 5x muncul)
- [x] Approve keyword → masuk ke dataset analisis
- [x] Reject keyword (tanpa isian alasan)
- [x] Hapus permanen dari rejected
- [x] Restore dari rejected ke pending
- [x] Storage: data/adaptive_keywords.json (lokal, bisa dibawa pindah laptop)

---

## 8. LIMITASI YANG SUDAH DIKETAHUI & KEPUTUSAN

| Limitasi | Keputusan |
|----------|-----------|
| Google Places hanya kasih 5 review terbaru per tempat | Diterima — kompensasi dengan ambil banyak cabang kompetitor |
| Tidak ada tanggal persis di review Google | Filter pakai kategori waktu (minggu ini, bulan ini, dll) |
| Tren rating tidak ada data historis di Google | Tampil simulasi tren dari rating saat ini |
| Google Places maksimal return 60 hasil per query | Diatasi dengan cari per nama club satu per satu |
| Scraping Google Maps melanggar ToS | Tidak pakai scraping — tetap pakai API resmi |

---

## 9. ENGINE ANALISIS (7 LAYER LOGIC)

File: `server/analyzer.js` + `server/keywords.js`

**Layer 1:** Skip review bintang 5 (kecuali ada sarkasme)
**Layer 2:** Cek pola resolusi ("sudah diperbaiki", dll) → skip jika resolved
**Layer 3:** Cek negasi dalam radius 5 kata ("tidak bau" → bukan negatif)
**Layer 4:** Cek perbandingan positif ("lebih bersih dari gym sebelah")
**Layer 5:** Cek intensifier → naikkan skor ×1.5 ("kotor banget")
**Layer 6:** Bobot rating bintang (1★=×2.0, 2★=×1.5, 3★=×0.8, 4★=×0.2)
**Layer 7:** Sarkasme detection ("bayar mahal tapi...") → flag negatif tinggi

**9 Kategori masalah:** kebersihan, peralatan, staff, ac_ventilasi, harga, parkir, kepadatan, fasilitas, manajemen, jam_operasional

**Adaptive Learning (Opsi B):**
- Sistem scan kata baru dari review bintang 1-2
- Hanya suggest kata yang muncul 5x+
- Ada whitelist 50+ kata positif yang diblokir otomatis
- Manager Ads approve/reject lewat keywords.html
- Approved keyword langsung aktif untuk analisis berikutnya

---

## 10. WARNA & DESIGN SYSTEM

| Variable | Nilai | Keterangan |
|----------|-------|------------|
| `--navy` | `#1B3A6B` | Warna utama (Blue Navy) |
| `--navy-d` | `#152D54` | Navy gelap (hover, border) |
| `--navy-l` | `#EEF2FF` | Navy light (background highlight) |
| `--text` | `#1A1A1A` | Teks utama |
| `--text2` | `#6B7280` | Teks sekunder |
| `--bg` | `#F3F4F6` | Background halaman |
| `--surface` | `#FFFFFF` | Background card |
| `--red` | `#EF4444` | Negatif/error |
| `--amber` | `#F59E0B` | Warning/netral |

**Style:** Gojek style — putih bersih, bold, modern, vector icon (SVG), tanpa emoji

---

## 11. YANG BELUM SELESAI / BISA DIKEMBANGKAN

- [ ] Verifikasi berapa dari 59 club yang berhasil ditemukan Google Places (belum dikonfirmasi)
- [ ] Tren rating masih simulasi — bisa diganti dengan data real kalau ada scheduled fetch + database
- [ ] Deploy ke Railway (online 24 jam) belum dilakukan
- [ ] Export laporan (PDF/Excel) untuk Manager Ads
- [ ] Notifikasi kalau ada review bintang 1-2 masuk
- [ ] Scheduled auto-refresh data setiap X jam
- [ ] Perbandingan rating antar periode
- [ ] Peta lokasi cabang FTL + kompetitor (Google Maps JavaScript API)

---

## 12. FILE .ENV

```
GOOGLE_PLACES_API_KEY=AIza...  ← isi dengan API key Google
BRAND_NAME=FTL
PORT=3000
CACHE_TTL=3600
```

---

## 13. DEPENDENCIES

```json
{
  "axios": "^1.6.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "node-cache": "^5.1.2",
  "nodemon": "^3.0.2"
}
```

---

*Dokumen ini dibuat otomatis pada akhir sesi pengembangan. Selalu update dokumen ini setiap kali ada perubahan signifikan.*

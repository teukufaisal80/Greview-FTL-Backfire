# FTL Gym — Google Reviews Dashboard

Dashboard berbasis Node.js + Express yang mengambil data review dari Google Places API secara real-time.

## Fitur
- Rating & distribusi bintang per kota (Jakarta, Bandung, Surabaya, Bali)
- Analisis sentimen otomatis dari teks review
- Topik yang sering disebut (positif & negatif)
- Ulasan terbaru dari semua cabang
- Caching 1 jam (hemat quota API)
- Tombol refresh manual

---

## Cara Setup

### 1. Clone / download project ini
```bash
cd ftl-gym-dashboard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Buat file .env
```bash
cp .env.example .env
```
Lalu buka `.env` dan isi API key:
```
GOOGLE_PLACES_API_KEY=AIza.....kamu
```

### 4. Cara dapat Google Places API Key (gratis)
1. Buka https://console.cloud.google.com
2. Buat project baru → "FTL Gym Dashboard"
3. APIs & Services → Library → cari "Places API" → Enable
4. APIs & Services → Credentials → Create Credentials → API Key
5. Copy key ke file .env

> Google Cloud memberi $200 credit gratis/bulan — cukup untuk ribuan request.

### 5. Jalankan server
```bash
# Production
npm start

# Development (auto-restart saat file berubah)
npm run dev
```

### 6. Buka di browser
```
http://localhost:3000
```

---

## Deploy ke Railway (gratis)

1. Push project ke GitHub
2. Buka https://railway.app → New Project → Deploy from GitHub
3. Tambahkan Environment Variable: `GOOGLE_PLACES_API_KEY`
4. Railway otomatis deploy dan beri URL publik

---

## Struktur Project

```
ftl-gym-dashboard/
├── server/
│   └── index.js        # Express server + Google Places proxy + caching
├── public/
│   └── index.html      # Dashboard frontend (HTML + Chart.js)
├── .env.example        # Template environment variables
├── .env                # API key kamu (JANGAN di-commit ke Git!)
├── .gitignore
└── package.json
```

---

## API Endpoints

| Endpoint | Keterangan |
|---|---|
| `GET /` | Dashboard HTML |
| `GET /api/dashboard` | Data semua kota (JSON) |
| `GET /api/cache/clear` | Bersihkan cache |

---

## Kustomisasi

Edit file `.env` untuk mengubah:
- `BRAND_NAME` — nama brand yang dicari
- `CITIES` — daftar kota (pisah koma)
- `CACHE_TTL` — durasi cache dalam detik

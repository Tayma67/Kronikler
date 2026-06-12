# YouTube Otomasyonu — Kronikler Shorts

Oyunun kendi life-event havuzundan (238 hikâye) her gün otomatik olarak bir
**"Sen Olsan Ne Yapardın?"** Shorts videosu üretir ve kanala yükler.
Tamamı ücretsiz araçlarla çalışır:

| Parça | Araç | Ücret |
|---|---|---|
| Senaryo | Oyunun `life_events` içerikleri | Ücretsiz (kendi içeriğin) |
| Seslendirme | edge-tts (Microsoft, tr-TR Ahmet sesi) | Ücretsiz |
| Görüntü | Pillow + ffmpeg (oyunun Kül & Köz temasıyla) | Ücretsiz |
| Çalıştırma | GitHub Actions (günlük cron) | Ücretsiz |
| Yükleme | YouTube Data API v3 | Ücretsiz (günlük kota: ~6 video) |

## Video formatı

1080×1920 dikey, ~40-60 saniye, 4 sahne:
**Kanca** (Sen olsan ne yapardın? + başlık) → **Hikâye** → **Seçenekler (A/B/C)**
→ **CTA** ("Cevabını yorumlara yaz"). Seyirciyi yoruma iter, oyunu tanıtır.

## Kurulum (tek seferlik, ~15 dk)

### 1. Google Cloud projesi
1. [console.cloud.google.com](https://console.cloud.google.com) → yeni proje aç (ör. `kronikler-youtube`).
2. **APIs & Services → Library → YouTube Data API v3 → Enable**.
3. **OAuth consent screen**: External seç, uygulama adı yaz, kendi Gmail'ini
   **Test users**'a ekle. (Test modunda kalabilir — kendi hesabın yeter.
   Not: test modunda refresh token 7 günde bir düşer; kalıcı olması için
   consent screen'i "In production"a al — doğrulama istemez çünkü sadece
   kendi hesabın kullanıyor.)
4. **Credentials → Create Credentials → OAuth client ID → Desktop app**.
   Çıkan **Client ID** ve **Client Secret**'ı not et.

### 2. Refresh token al (kendi bilgisayarında)
```bash
pip install google-auth-oauthlib
python youtube/get_refresh_token.py
```
Tarayıcı açılır → YouTube kanalının bağlı olduğu Google hesabıyla izin ver →
terminale yazılan **refresh token**'ı kopyala.

### 3. GitHub Secrets ekle
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Değer |
|---|---|
| `YT_CLIENT_ID` | 1. adımdaki Client ID |
| `YT_CLIENT_SECRET` | 1. adımdaki Client Secret |
| `YT_REFRESH_TOKEN` | 2. adımdaki refresh token |

İsteğe bağlı: **Variables** sekmesine `YT_PRIVACY` = `unlisted` ekleyerek ilk
denemeleri liste dışı yapabilirsin (silince varsayılan `public`).

### 4. Bitti
`.github/workflows/youtube-shorts.yml` her gün **17:00 (TR)** otomatik çalışır.
İlk videoyu beklemeden denemek için: **Actions → YouTube Shorts → Run workflow**.
Üretilen mp4 her koşuda 7 gün artefakt olarak da saklanır (indirip bakabilirsin).

## Nasıl çalışır

```
run_pipeline.py
 ├─ content_source.py  → published.json'a bakarak yayınlanmamış event seçer,
 │                        4 sahnelik senaryo + başlık/açıklama/etiket üretir
 ├─ video_gen.py       → sahne görselleri (Pillow) + tr-TR seslendirme (edge-tts)
 │                        + ffmpeg birleştirme → out/<event_id>.mp4
 ├─ upload.py          → YouTube Data API ile yükler (kategori: Gaming, dil: tr)
 └─ published.json     → yayınlanan event + video id kaydı (workflow geri commitler)
```

238 event ≈ 8 ay günlük içerik; havuz bitince baştan başlar. Oyuna yeni
life-event eklendikçe video havuzu da kendiliğinden büyür.

## Yerel test

```bash
pip install -r youtube/requirements.txt
cd youtube
python run_pipeline.py --no-upload              # video üret, yükleme
python run_pipeline.py --no-upload --silent     # TTS'siz hızlı test
python run_pipeline.py --event-id v2_kumarhane  # belirli hikâye
```

## Ayarlar

- **Sıklık:** workflow'daki `cron` satırı. Günde 2 video için ikinci satır
  ekle (ör. `0 8 * * *`). Kota gereği günde en fazla 6 yükleme.
- **Ses:** `video_gen.py` → `VOICE`. Alternatif ücretsiz Türkçe ses:
  `tr-TR-EmelNeural` (kadın).
- **Gizlilik:** `YT_PRIVACY` repo variable'ı (`public`/`unlisted`/`private`).

## Bilinen sınırlar

- YouTube API yorum yönetimi/analitik bu sürümde yok; sadece üretim + yükleme.
- Yeni Google Cloud projelerinde API ile yüklenen videolar, proje
  doğrulanana dek "private" kilitlenebilir (YouTube politikası). İlk
  yüklemeden sonra videonun durumunu Studio'dan kontrol et; kilitliyse
  [audit doğrulaması](https://support.google.com/youtube/contact/yt_api_form)
  iste (ücretsiz, birkaç gün sürer).

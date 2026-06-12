# YouTube Otomasyonu — "Biliyor muydun?" Shorts

Kendi bilgi destesinden (`facts.py`) her gün otomatik olarak bir
**"Biliyor muydun?"** Shorts videosu üretir ve kanala yükler.
Tamamı ücretsiz araçlarla çalışır:

| Parça | Araç | Ücret |
|---|---|---|
| İçerik | `facts.py` bilgi destesi (67 bilgi, 6 kategori) | Ücretsiz |
| Seslendirme | edge-tts (Microsoft, tr-TR Ahmet sesi) | Ücretsiz |
| Görüntü | Pillow + ffmpeg | Ücretsiz |
| Çalıştırma | GitHub Actions (günlük cron) | Ücretsiz |
| Yükleme | YouTube Data API v3 | Ücretsiz (günlük kota: ~6 video) |

## Video formatı

1080×1920 dikey, ~30-40 saniye, 4 sahne:
**Soru** ("Biliyor muydun?" + kanca sorusu) → **Cevap** (büyük reveal) →
**Açıklama** → **CTA** ("Bildin mi? Yorumlara yaz!"). Soru formatı izleyiciyi
sona kadar tutar, CTA yorum/abone etkileşimi getirir.

## SEO (otomatik yönetiliyor)

- **Başlık:** kanca sorusunun kendisi + 🤯 + `#shorts` (soru başlıkları
  Shorts'ta en yüksek tıklama oranını alır)
- **Açıklama:** soru + cevap + abone/yorum çağrısı + sabit hashtag seti
- **Etiketler:** genel set + kategoriye özel set (`content_source.py` →
  `CATEGORY_TAGS`)
- **Kategori:** Education (27), dil: tr
- **Yayın saati:** 17:00 TR — akşam telefon trafiğinin başı
- Videolardaki marka yazısı: **GÜNDE BİR BİLGİ** (`video_gen.py` → `BRAND`;
  kanal adı önerileri: "Günde Bir Bilgi", "Biliyor muydun?")

## Kurulum (tek seferlik, ~15 dk)

### 1. Google Cloud projesi
1. [console.cloud.google.com](https://console.cloud.google.com) → yeni proje aç.
2. **APIs & Services → Library → YouTube Data API v3 → Enable**.
3. **OAuth consent screen**: External seç, uygulama adı yaz, kendi Gmail'ini
   **Test users**'a ekle. (Not: test modunda refresh token 7 günde bir düşer;
   kalıcı olması için consent screen'i "In production"a al — sadece kendi
   hesabın kullandığı için doğrulama istemez.)
4. **Credentials → Create Credentials → OAuth client ID → Desktop app**.
   Çıkan **Client ID** ve **Client Secret**'ı not et.

### 2. Refresh token al (kendi bilgisayarında)
```bash
pip install google-auth-oauthlib
python get_refresh_token.py
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
Beklemeden denemek için: **Actions → YouTube Shorts → Run workflow**.
Üretilen mp4 her koşuda 7 gün artefakt olarak da saklanır (indirip izleyebilirsin).

## Nasıl çalışır

```
run_pipeline.py
 ├─ facts.py            → içerik destesi (saf veri, kolayca genişletilir)
 ├─ content_source.py   → published.json'a bakıp yayınlanmamış bilgi seçer,
 │                         4 sahnelik senaryo + SEO başlık/açıklama/etiket üretir
 ├─ video_gen.py        → sahne görselleri (Pillow) + tr-TR seslendirme (edge-tts)
 │                         + ffmpeg birleştirme → out/<id>.mp4
 ├─ upload.py           → YouTube Data API ile yükler
 └─ published.json      → yayınlanan bilgi + video id kaydı (workflow geri commitler)
```

67 bilgi ≈ 2 ay günlük içerik. **Yeni içerik eklemek = `facts.py`'a yeni
kayıt eklemek** (id, kategori, soru, cevap, açıklama) — başka hiçbir şey gerekmez.

## Yerel test

```bash
pip install -r requirements.txt
python run_pipeline.py --no-upload               # video üret, yükleme
python run_pipeline.py --no-upload --silent      # TTS'siz hızlı test
python run_pipeline.py --fact-id ahtapot_kalp    # belirli bilgi
```

## Ayarlar

- **Sıklık:** workflow'daki `cron` satırı. Günde 2 video için ikinci satır
  ekle (ör. `0 8 * * *`). Kota gereği günde en fazla 6 yükleme.
- **Ses:** `video_gen.py` → `VOICE`. Alternatif ücretsiz Türkçe ses:
  `tr-TR-EmelNeural` (kadın).
- **Marka yazısı:** `video_gen.py` → `BRAND`.
- **Gizlilik:** `YT_PRIVACY` repo variable'ı (`public`/`unlisted`/`private`).

## Bilinen sınırlar

- Yorum yönetimi/analitik bu sürümde yok; sadece üretim + yükleme.
- Yeni Google Cloud projelerinde API ile yüklenen videolar, proje
  doğrulanana dek "private" kilitlenebilir (YouTube politikası). İlk
  yüklemeden sonra videonun durumunu Studio'dan kontrol et; kilitliyse
  [audit doğrulaması](https://support.google.com/contact/yt_api_form)
  iste (ücretsiz, birkaç gün sürer).

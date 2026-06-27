# Çok Oyuncu Sunucusunu Bağlama — Adım Adım (terminal gerekmez)

Telefondan/tarayıcıdan, ücretsiz, ~10 dakikada. Hiç komut yazmadan.

## 1) Cloudflare hesabı aç (ücretsiz)
- https://dash.cloudflare.com/sign-up → e-posta + şifre ile kayıt ol, e-postanı doğrula.

## 2) workers.dev alt-alan adını belirle
- Panelde sol menüden **Workers & Pages**'e gir.
- İlk girişte senden bir **subdomain** (alt-alan adı) ister — örn. `tayma`. Bir tane
  seç ve kaydet. (Sunucu adresin `...workers.dev` bunun üstüne kurulur.)

## 3) API anahtarı (token) oluştur
- Sağ üstte profil → **My Profile** → **API Tokens** → **Create Token**.
- Şablonlardan **"Edit Cloudflare Workers"**'ı seç → **Use template**.
- Sayfanın altında **Create Token** → çıkan uzun anahtarı **kopyala** (bir daha gösterilmez).
- Aynı sayfada (Workers & Pages ana ekranında, sağda) **Account ID**'ni de bir yere kopyala.

## 4) GitHub'a iki "secret" ekle
- GitHub'da repoya gir: **tayma67/kronikler** → üstten **Settings** → sol menü
  **Secrets and variables** → **Actions** → **New repository secret**.
- Birinci secret:
  - Name: `CLOUDFLARE_API_TOKEN`  · Secret: (3. adımda kopyaladığın anahtar) → **Add secret**.
- İkinci secret:
  - Name: `CLOUDFLARE_ACCOUNT_ID` · Secret: (3. adımdaki Account ID) → **Add secret**.

## 5) Sunucuyu deploy et (tek düğme)
- GitHub'da repoda üstten **Actions** sekmesi → sol listeden **Deploy MP Server** → sağda
  **Run workflow** → açılan kutuda yine **Run workflow**.
- 1-2 dakikada yeşil tik gelir. İşin loguna girersen **"Deploy to Cloudflare"** adımında
  sunucu adresin yazar: `https://kronikler-mp.<alt-alan>.workers.dev`
  (Cloudflare panelinde Workers & Pages altında da görünür.)

## 6) Adresi uygulamaya gir
- Adresteki `https` yerine **`wss`** yaz. Örnek:
  `https://kronikler-mp.tayma.workers.dev`  →  `wss://kronikler-mp.tayma.workers.dev`
- Uygulamada **Çok Oyuncu** ekranını aç → "Sunucu adresi" kutusuna bu **wss://** adresini
  yapıştır → **Kaydet**.

## 7) Test et
- Bir cihaz: **Diyar Kur** → sana 5 harfli bir kod verir (örn. `K7P2M`).
- İkinci cihaz (veya arkadaşın): aynı sunucu adresini girip **Diyara Katıl** → kodu yaz.
- İkiniz de **Diyara Gir** deyip oynamaya başlayın. "Hazırım" deyince (veya 5 dk dolunca)
  ay birlikte ilerler.

## Sık sorunlar
- **"NO_SERVER: sunucu adresi ayarlanmadı"** → 6. adımı atlamışsın; wss:// adresini gir.
- **Deploy kırmızı (hata)** → genelde token yanlış/eksik. 3-4. adımı tekrar yap; tokenın
  "Edit Cloudflare Workers" yetkisinde olduğundan emin ol.
- **Bağlanmıyor** → adres `wss://` ile mi başlıyor, sonunda `/` YOK; doğru kopyaladın mı?
- Hepsi ücretsiz katmanda çalışır; kart bilgisi istemez.

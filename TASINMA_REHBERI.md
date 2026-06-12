# 📱 Railway → Vercel Taşınma Rehberi (sadece iPhone ile, ~10 dk)

Railway deneme süren bitmeden backend'i Vercel'e taşıyoruz. Kod tarafı
HAZIR (backend/api/index.py + vercel.json + frontend env desteği).
Sen telefondan sadece tıklayacaksın.

---

## ADIM 0 — Mongo nerede? (1 dk)

Safari'den **railway.app** → projene gir → servislere bak.

- **Sadece bir servis varsa** (kronikler backend) ve MONGO_URL değişkeni
  `mongodb+srv://...mongodb.net` içeriyorsa → Mongo zaten **Atlas'ta**,
  ADIM 1'İ ATLA, Adım 2'ye geç. (MONGO_URL'i kopyala — lazım olacak.)
- **İkinci bir Mongo servisi varsa** ya da MONGO_URL `railway.internal`
  içeriyorsa → Mongo Railway'de ölecek. ADIM 1 şart.

## ADIM 1 — Ücretsiz MongoDB Atlas (sadece gerekiyorsa, ~4 dk)

1. Safari → **mongodb.com/cloud/atlas** → Sign up (Google ile hızlı).
2. "Deploy a cluster" → **M0 FREE** seç → bölge: Frankfurt → Create.
3. Security Quickstart:
   - Username/password oluştur → **şifreyi not al**.
   - "Where would you like to connect from" → **Allow access from
     anywhere (0.0.0.0/0)** ekle (Vercel IP'leri değişkendir).
4. Database → Connect → **Drivers** → bağlantı dizesini kopyala:
   `mongodb+srv://KULLANICI:SIFRE@cluster0.xxxxx.mongodb.net/`
   (SIFRE kısmına kendi şifreni yaz.)

> Eski kayıtlar taşınmaz (Railway içindeyse). Kayıtlar cihaza bağlı
> test kayıtları — yeni dünyayla devam etmek sorun değil.

## ADIM 2 — Backend'i Vercel'e kur (~3 dk)

1. Safari → **vercel.com** → Add New… → **Project**.
2. `Tayma67/Kronikler` reposunu Import et (zaten bağlı).
3. **ÖNEMLİ:** "Root Directory" → **Edit** → `backend` yaz.
4. Framework Preset: **Other** (otomatik gelirse dokunma).
5. **Environment Variables** bölümüne üç değişken ekle:
   | İsim | Değer |
   |---|---|
   | `MONGO_URL` | Atlas bağlantı dizesi (ya da mevcut Atlas URL'in) |
   | `DB_NAME` | `kronikler` |
   | `JWT_SECRET` | uzun rastgele bir şey (örn. 40 karakter karışık) |
6. **Deploy** → bitince sana bir adres verir:
   `https://kronikler-backend-XXXX.vercel.app` → **kopyala**.
7. Test: Safari'de `https://...vercel.app/api/` aç →
   `{"app":"Kronikler...","status":"ok"}` görmelisin. ✅

## ADIM 3 — Frontend'i yeni backend'e bağla (~2 dk)

1. Vercel → **kronikler** (frontend) projesi → Settings →
   **Environment Variables** → ekle:
   - `REACT_APP_BACKEND_URL` = Adım 2'deki adres (sonunda `/` OLMASIN)
2. Deployments sekmesi → en üstteki deployment → ⋯ → **Redeploy**.
3. Oyunu aç (hard-refresh) → yeni oyun başlat → çalışıyor ✅

## ADIM 4 — Railway'i kapat

Railway projesini silebilir ya da süresi bitince ölüme terk
edebilirsin. Artık her şey Vercel + Atlas: ikisi de kalıcı ücretsiz.

---

## Teknik Notlar (merak edersen)

- Backend artık **serverless**: istek gelince uyanır, boşken para/saat
  yemez — "gün limiti" diye bir derdi yok. İlk istek 1-2 sn soğuk
  başlar, sonrası hızlıdır.
- Bu taşınmayı mümkün kılan bugünkü "Railway diyeti": yanıtlar
  3 MB → tel üstünde 414 KB (gereksiz NPC alanları kırpıldı + gzip).
- Bir şey ters giderse: Vercel'deki backend projesinde Deployments →
  son deploy → **Logs**'a bak, hatayı bana yapıştır.

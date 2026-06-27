# Kronikler — Çok Oyuncu (Multiplayer) Yapısı

Bu belge, çok oyunculu modun mimarisini, hazır olan kod parçalarını, **yarın
yapılacak sunucu bağlama adımlarını** ve kalan tek entegrasyon dikişini anlatır.

## Mimari — Tur-Senkron Paylaşımlı Diyar
- **Otoriteli sunucu + ince istemci.** Paylaşımlı dünya (saat, taht, loncalar,
  sancaklar, ekonomi, oyuncuların kamu haneleri) **sunucuda** tutulur (tek doğru
  kaynak). Kişisel hayat simülasyonu (`game.ts`) **telefonda** koşar.
- **Tur-senkron ay:** Ay yalnız sunucu *tick*'inde ilerler — oyuncuların
  **çoğunluğu "Hazır"** derse VEYA **5 dk** dolarsa (AFK tavanı). Bu, oyunun aylık-tur
  doğasına oturur; sürekli real-time'ın ağ yükü yoktur.
- **Ortak saat + kişisel hayat yayı:** Herkes aynı dünya-ayındadır; her oyuncu o
  saat içinde kendi hayatını (çocukluk→meslek→hanedan→ölüm→vâris) yaşar. Ölünce
  vâris olarak aynı diyarda devam edilir → kalıcı dünya.
- **Çevrimdışı tek oyuncu hiç değişmedi.** MP tamamen additive bir katman; internet
  yoksa tek-oyuncu cihazda offline oynanır.

## Hazır olan kod
**Mobil istemci (`mobile/`)**
- `app/index.tsx` — ana menüde **Tek Oyuncu / Çok Oyuncu** ayrımı.
- `lib/mp/protocol.ts` — istemci↔sunucu sözleşmesi (RealmSnapshot, PlayerPublic,
  SharedIntent, Client/ServerMsg, tick kuralları). **Sunucudaki kopyayla aynı olmalı.**
- `lib/mp/config.ts` — misafir cihaz kimliği + sunucu URL (uygulama-içi ayarlanır
  ya da `DEFAULT_SERVER_URL`).
- `lib/mp/net.ts` — WebSocket istemcisi (otomatik yeniden bağlan + ping + kuyruk).
- `lib/mp/store.tsx` — MP React context (`MpProvider` köke eklendi).
- `lib/mp/world.ts` — paylaşımlı-dünya adaptörü (kamu hanesi + çapraz-etki uygulama).
- `app/cok-oyunculu/index.tsx` — lobi (diyar kur/katıl + sunucu ayarı).
- `app/cok-oyunculu/diyar.tsx` — diyar odası (canlı varlık, saat, hazır-oyu, sohbet).
- `app/cok-oyunculu/oyun.tsx` — paylaşımlı oyun ekranı (game.ts karakteri + senkron
  tick + paylaşımlı eylemler + çapraz etkiler).

**Sunucu (`server/`)** — Cloudflare Worker + Durable Object
- `src/realm.ts` — `RealmDO`: otoriteli diyar (tick, alarm, çapraz-etki çözümü).
- `src/index.ts` — `/realm/:id` → tek DO örneği.
- `src/protocol.ts` — mobil sözleşmenin kopyası.
- `wrangler.toml`, `package.json`, `tsconfig.json`, `README.md`.

## Yarın — sunucu bağlama (~10 dk)
1. `cd server && npm install`
2. `npx wrangler login` (ücretsiz Cloudflare hesabı)
3. `npm run deploy` → adres alırsın: `https://kronikler-mp.<hesap>.workers.dev`
4. Uygulamada **Çok Oyuncu** ekranına `wss://kronikler-mp.<hesap>.workers.dev` gir
   (veya `mobile/lib/mp/config.ts` → `DEFAULT_SERVER_URL`).
5. Test: bir cihaz **Diyar Kur** (5 harf kod), diğeri o kodla **Diyara Katıl**.

Bağlanınca **şunlar uçtan uca çalışır:** lobi, diyar kurma/katılma, canlı varlık,
sohbet, dünya saati, çoğunluk/5dk senkron tick, paylaşımlı taht/lonca/valilik,
çapraz etkiler (kral lonca vergisi vb.), gerçek game.ts karakteri.

## "Tam oyun" parıtesi — TAMAM ✓
MP karakteri artık ortak `GameProvider` deposunda yaşıyor (`enterMp`/`exitMp`,
`mpMode`). Bu sayede **tüm `/oyun` alt-ekranları** (meslek, mektep, beceriler,
ilişkiler, pazar, mülkler, savaş, örgütler…) MP karakteri üstünde **hiç
değiştirilmeden** çalışıyor — tek-oyuncudaki tüm derinlik MP'de de var. MP hub
ekranı (`app/cok-oyunculu/oyun.tsx`) bu ekranlara bağlanır; dünya-saati ilerleme
"Hazırım" oyuyla sunucu tick'inden sürülür (kişisel aksiyonlar zaman ilerletmez).
`mpMode`'da SP kaydına yazılmaz (çevrimdışı kayıt korunur); çıkışta SP kaydı geri
yüklenir. Tek-oyuncu yolu `mpMode=false` ile birebir aynıdır.

> Geriye yalnız **canlı doğrulama** kalıyor: sunucu deploy edilip iki cihazla
> senkron-tick döngüsünün uçtan uca akışı (özellikle aynı anda çok oyuncu hazır
> olunca ve 5 dk dolunca) test edilmeli. Kod hazır; bu, canlı ortamda yapılır.

## Notlar
- **Güvenlik:** sunucu otoriteli; istemci paylaşımlı durumu uyduramaz.
- **Ücretsiz:** Cloudflare free tier (Workers + Durable Objects + WS hibernation)
  başlangıç/test ve küçük-orta ölçek için yeter.
- **Protokol paritesi:** `mobile/lib/mp/protocol.ts` ↔ `server/src/protocol.ts` her
  zaman birebir aynı kalmalı.

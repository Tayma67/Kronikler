# Kronikler — Çok Oyuncu Sunucusu (Cloudflare Worker + Durable Object)

Bu, çok oyunculu **paylaşımlı diyar**ın otoriteli sunucusudur. Ücretsiz Cloudflare
katmanında çalışır. Her diyar (oda) = tek bir `RealmDO` Durable Object örneği:
paylaşımlı durumu (saat, taht, loncalar, sancaklar, ekonomi, oyuncuların kamu
haneleri) tutar, WebSocket bağlantılarını yönetir, tur-senkron **tick**'i
(çoğunluk-hazır VEYA 5 dk alarm) çözer ve çapraz-oyuncu etkilerini uygular.

## Mimari
- **Otoriteli sunucu + ince istemci.** Kişisel hayat simülasyonu (game.ts) telefonda
  koşar; sunucu yalnız paylaşımlı kurumları yönetir ve sonucu yayınlar.
- İstemci ↔ sunucu sözleşmesi: `src/protocol.ts` (mobil taraftaki
  `mobile/lib/mp/protocol.ts`'in birebir kopyası — ikisi her zaman aynı olmalı).

## Yarın yapılacaklar (dağıtım — ~10 dakika)
1. Cloudflare hesabı aç (ücretsiz) + `npm i -g wrangler`, sonra `wrangler login`.
2. Bu klasörde: `npm install`.
3. `npm run deploy`  → Worker yayınlanır, sana bir adres verir:
   `https://kronikler-mp.<hesabın>.workers.dev`
4. Mobil tarafa WebSocket adresini gir (https → **wss**):
   - Uygulamada **Çok Oyuncu** ekranındaki "Sunucu adresi" kutusuna
     `wss://kronikler-mp.<hesabın>.workers.dev` yaz ve kaydet, **veya**
   - `mobile/lib/mp/config.ts` içindeki `DEFAULT_SERVER_URL`'i bu adrese ayarla.
5. İki cihaz/iki kullanıcı: biri **Diyar Kur** (5 harfli kod alır), diğeri o kodla
   **Diyara Katıl**. Aynı dünyada, senkron aylarla yaşamaya başlarsınız.

## Yerel test
`npm run dev` → `wrangler dev` yerelde çalıştırır (ws://127.0.0.1:8787). Mobilde
sunucu adresini buna ayarlayıp test edebilirsin.

## Komutlar
- `npm run dev` — yerel geliştirme.
- `npm run deploy` — Cloudflare'a yayınla.
- `npm run typecheck` — tip denetimi.

## Maliyet
Cloudflare ücretsiz katmanı: Workers + Durable Objects (WebSocket hibernation dahil)
küçük/orta ölçek için ücretsiz yeter. Oyun büyürse ücretli katman gerekebilir.

## Önemli
- `src/protocol.ts` değişirse, mobil `mobile/lib/mp/protocol.ts`'i de aynı yap.
- Diyar durumu DO storage'da kalıcıdır; oyuncular girip çıkar, dünya sürer.

<!-- deploy tetikleyici: 20260627T100010Z -->

<!-- redeploy: 100215Z -->

# Kronikler — Çok Oyuncu (Multiplayer) Yapısı

Bu belge çok oyunculu modun mimarisini ve katmanlarını anlatır. **Sunucu canlı**
(`wss://kronikler-mp.tayma.workers.dev`) ve tüm sistem headless entegrasyon
testleriyle uçtan uca doğrulanmıştır (30/30).

## Mimari — Tur-Senkron Paylaşımlı Diyar
- **Otoriteli sunucu + ince istemci.** Paylaşımlı dünya (saat, taht, beylikler,
  loncalar, sancaklar, ekonomi, oyuncuların kamu haneleri, bağlar, NPC kütüğü)
  **sunucuda** tutulur (tek doğru kaynak). Kişisel hayat simülasyonu (`game.ts`)
  **telefonda** koşar.
- **Tur-senkron ay:** Ay yalnız sunucu *tick*'inde ilerler — **çevrimiçi** canlı
  oyuncuların **çoğunluğu "Hazır"** derse (`>%50`) VEYA **5 dk** dolarsa.
  Çevrimdışılar oranı kilitlemez (4 kişi kalsa kendi aralarında ilerletir).
- **Çevrimdışı tek oyuncu hiç değişmedi.** MP tamamen additive; `mpRealm`/`mpMode`
  bayrakları yalnız MP karakterinde true. SP davranışı birebir korunur.

## Katmanlar (hepsi canlı + test edilmiş)

### 1. Beylik (Mount & Blade) — toprak/grup
5 beylik (Demirhan, Yenişehir, Gümüşhisar, Akşehir, Karahisar). Oyuncu yeterli
güç + altın + reşit yaşla **bey olur / mevcut beyi devirir**, başka beyliğe
**sefer** açıp ilhak eder, **vergi** koyar. Boş beylikleri NPC ocaklar tutar.
Meşruiyet eşikleri SP `throneRequirements` ile uyumlu.

### 2. Sosyal doku — oyuncular arası
Destek (bağış, ittifak, dünür, kefillik), rekabet (sıralama, düello), entrika
(casus, sabotaj, suikast, ayartma, iftira, **pakt-bozma/ihanet**), yardım (borç,
sığınma). Pairwise **bağ** + **şeref/sadakat** ekseni (azalan getiri → farmlanamaz).

### 3. Çevrimdışı varlık & dönüş
- **Kalıcılık:** kişisel karakter her ay sunucuya yedeklenir → çıkıp girince
  **aynı karaktere, aynı dünyada** devam.
- **Seyahate Çık:** kişi dokunulmaz (kişisel saldırı engellenir), beyliği/holdings
  etkileşime açık kalır.
- **NPC-vekil:** seyahatsiz kopan oyuncu vekile düşer → yaşlanır + ölüm riski +
  holdings fethedilir; dönünce devam, vekil ölmüşse oyuncu **ölü bulur → vâris**.

### 4. Paylaşımlı NPC dünyası
Seed'den deterministik **ortak NPC kütüğü** (diyar ileri gelenleri: vezir, lonca
başı, rakip bey, tüccar, âlim, komutan, kadı) → **herkes aynı NPC'leri görür**.
**NPC↔oyuncu ilişkileri kişiye özel** (aynı NPC birine dost, başkasına düşman).
Eylemler: **yanına çek / bir oyuncuya karşı kışkırt / araları düzelt**. NPC nüfuzu
sefere ve suikasta ağırlık katar (seni tutan + hedefi sevmeyen NPC destek olur).

## Kod haritası
**Mobil (`mobile/`):** `app/cok-oyunculu/{index,diyar,oyun,diplomasi}.tsx`,
`lib/mp/{protocol,config,net,store,world}.ts`, `lib/i18n.tsx` (MPX/MSOC/MTRV/MNPC
sözlükleri, 6 dil). **Sunucu (`server/`):** `src/realm.ts` (RealmDO — tick, alarm,
beylik/sosyal/NPC çözümü, kalıcılık, NPC-vekil), `src/index.ts`, `src/protocol.ts`.

## Deploy & oynama
- Sunucu otomatik deploy: `apk` dalına `server/**` push → GitHub Actions
  (`deploy-mp-server.yml`) → Cloudflare. **Canlı:** `kronikler-mp.tayma.workers.dev`.
- Oyna: bir cihaz **Diyar Kur** (5 harf kod), diğeri o kodla **Diyara Katıl**.
  Sunucu adresi APK'ye gömülü (`DEFAULT_SERVER_URL`) — ayar gerekmez.

## Doğrulama (headless entegrasyon testleri, canlı sunucu)
- Beylik/sosyal/sohbet: 14/14 · Kalıcılık/seyahat: 7/7 · NPC-vekil/ölüm: 4/4 ·
  Paylaşımlı NPC: 5/5 → **toplam 30/30**.
- SP regresyon: smoke HATA:0; i18n 6 dil eksik:0.

## Notlar & kısıtlar
- **Protokol paritesi:** `mobile/lib/mp/protocol.ts` ↔ `server/src/protocol.ts`
  her zaman birebir aynı.
- **Dürüst kısıt:** sunucu `game.ts`'i koşturamaz → çevrimdışı vekil hafiftir
  (yaşlanır + ölür + holdings), tam hayat-sim'i yoklukta donar.
- **Ücretsiz:** Cloudflare free tier (Workers + DO + WS hibernation).
- **Sonraki olası işler:** açık oda listesi, MP tutorial/onboarding, sohbet
  moderasyonu, NPC günlük-hayat senkronu (derinleştirme).

# KRONİKLER: KÜLLERİN MİRASI

## GDD v8 — SAHNE: Motordan Tiyatroya

> *"Motor hazır. Şimdi perde."*
>
> v7 oyunu bir **hikâye makinesine** çevirdi: NPC'ler hatırlıyor, hanedanlar
> yarışıyor, yönetmen tempo tutuyor, tohumlar nesil aşıyor. Bu belge tek bir
> soruya adanmıştır: **oyuncu bunu ilk 10 dakikada HİSSEDİYOR mu?**
> Görünmeyen derinlik, yok hükmündedir.

-----

## Belge Hiyerarşisi

| Belge | Rolü |
|---|---|
| **GDD v8 SAHNE** (bu belge) | Sunum, his, onboarding, lansman — **aktif otorite** |
| GDD v7 MASTER | Sistem anayasası — mekanik kararlar için geçerliliğini korur |
| ANALIZ_RAPORU.md | Test bulguları + denge defterinin kaynağı |
| PROJE_DURUMU.md | Oturum/hesap devri durumu |

-----

## 0. Durum: Neyin Üzerine İnşa Ediyoruz

v7 Master Roadmap **tamamlandı** (Adım 0–6 ✅; Adım 7'den sadece lansman
kalemleri kaldı). Doğrulama: 54 birim testi, oyuncu-bot (gerçek HTTP, yüzlerce
hafta), 300 savaşlık fuzz, 10-30 yıllık ekonomi/nüfus simülasyonları,
GDD Başarı Testi ✅.

Sahne katmanından şimdiye dek inenler (MAKYAJ 1-3):
- **Hayat Romanı şeridi** — perde adı, yay rozeti, gerilim közü, acil rozetler
  (elçi/nemesis/söylenti/nam) Dashboard'da
- **Ses** — sentez SFX kiti 7 oyun anına bağlı (hafta çanı, altın, kılıç…)
- **Kimlik** — yaşa/cinsiyete göre avatar, 25 meslek ikonu, yaşa duyarlı hero
- **Duygusal anlar** — ölüm ekranı = romanın son sayfası; NPC "Onun Zihninde"
  kartı; elçi geri sayımı; ROMAN sekmesi; yönetmenin buton fısıltısı

-----

## 0.5 ZAMAN REFORMU — 1 Tur = 1 Ay ✅

Hafta tabanlı zamanın matematiği oyunu öldürüyordu: 7→13 yaş **312
ilerleme**, tam ömür ~3000 dokunuş. Reform:

| | Eski (hafta) | Yeni (ay) |
|---|---|---|
| Çocukluk (7→13) | 312 tur | **72 tur** |
| 7→35 yaş | 1456 tur | **336 tur** |
| Tam ömür (~70) | ~3270 tur | **~750 tur** |
| Mevsim | 12 turda silik | **3 tur — hissedilir** |
| Okul dönemi | 12 hafta (yapay) | 12 ay = **tam 1 yıl** |

Uygulama: takvimin kalbi tek sabit (`calendar_tr.WEEKS_PER_MONTH=1`);
yıl-anlamlı sabitler ay birimine ölçeklendi (nam penceresi 2 yıl=24,
tohum vadeleri, doruk aralığı, perde ömrü, elçi sabrı 6 ay); 130+
görünür "hafta" ifadesi "ay"a çevrildi (veri anahtarlarına dokunulmadı).
Tur-bazlı ekonomi/his değerleri bilinçli korundu — dokunuş başına maliyet
ve ritim aynı, sadece hayat 4× daha hızlı akıyor. Yan kazanç: tarla
yıllık verimi 4× şişkinlikten kurtulup tasarım hedefine oturdu.

-----

## 1. His Anayasası

v7'nin Üç Katman Kuralı mekaniğin anayasasıydı. Bu beşli, **sunumun**
anayasasıdır. Her ekran, her popup, her metin bu süzgeçten geçer:

|#|Kural|Tanım|
|-|------|------|
|H1|**Görünmeyen derinlik yoktur**|Bir sistem oyuncunun 2 dokunuş menzilinde yüzeye çıkmıyorsa, yok demektir. Her omurga sisteminin Dashboard'da bir "çengeli" olmalı.|
|H2|**Sayı değil sahne**|"+4 ilişki" bir muhasebe kaydıdır; "*Hasan sana biraz daha açıldı*" bir sahnedir. Sayı her zaman bir cümlenin gölgesinde gelir.|
|H3|**Her dokunuş cevap verir**|Ses + mikro animasyon + metin. Üçü de yoksa buton ölüdür. (SFX bağlandı; eksik kalan ekranlar §3'te.)|
|H4|**Merak kancasız hafta yok**|Her "Haftayı İlerle" en az bir ileri dönük fısıltı bırakır: kulak misafiri, elçi, söylenti, tohum iması. Yönetmen bunu garanti eder (durgunluk dedektörü).|
|H5|**Türkçe, sıcak, dönem kokulu**|Ham anahtar/İngilizce sızıntısı (STRENGTH, None, {loc}) sıfır tolerans. Metin testten geçer (bkz. metin tarayıcı, 1309 metin ✓).|

-----

## 2. Tasarım Dili: "Kül & Köz"

### Renk
Mevcut token seti korunur (`index.css`):
kül zemin `#0D0A06` · parşömen `#E8D5B0` · altın `#C9A84C` · köz `#E05A30`
· kan `#C84040`. **Anlam haritası:** altın = değer/başarı, köz = gerilim/risk,
kan = tehlike/nemesis, mor `#7B4FAF` = entrika/hanedan, yeşil `#4A9A5A` = kazanç.
Yeni renk eklemek yasak; anlamlar ekranlar arası tutarlı kalır.

### Tipografi
- **Cinzel** — manşet/etiket/ünvan (taş kitabesi sesi)
- **Crimson Text italic** — anlatı/fısıltı/alıntı (kâtip eli)
- Kural: anlatı asla Cinzel'le, rakam asla italikle yazılmaz.

### Hareket
- `rise-in` (giriş), `stat-pop` (delta), kademeli `card-enter` (hasat),
  `tension-pulse` (gerilim 60+), `urgent/envoy-pulse` (acil rozet)
- **Tek kural:** animasyon bilgiyi taşır, süslemez. Sonsuz dönen hiçbir şey
  ekranda ikiden fazla olamaz.

### Ses
- Sentez SFX (dosyasız, ~0 KB) — bağlandı. **Eksik:** müzik katmanı.
  Plan: 3 ambiyans parçası (köy gündüz / kriz / gece-kış), `lib/audio.js`
  music seviyesi hazır, dosyalar `public/audio/`'ya gelince 10 satırlık iş.

-----

## 3. Ekran Ekran Sahne Rehberi

Her ekranın tek cümlelik **duygu görevi** var. Ona hizmet etmeyen her şey gürültü.

| Ekran | Duygu görevi | Durum | Kalan iş |
|---|---|---|---|
| **Yeni Oyun** | "Büyük bir hikâyenin eşiğindeyim" | ✅ manşet eklendi | Arka plana kül/köz partikülü (CSS); 1 cümlelik dünya seed'i ("Bu dünyada Karaoğlu yükseliyor…") |
| **Dashboard** | "Hayatım akıyor ve beni bekleyen şeyler var" | ✅ SagaStrip + ROMAN | Hasat → günlük satırına köprü parıltısı |
| **NPC Detay/Sohbet** | "Karşımda beni hatırlayan biri var" | ✅ kademe + anılar + amaç | Selam vermeyen düşmanda kart yerine tek satır sahne |
| **Rakipler** | "Lig tablosunda ben de varım" | ✅ tablo + elçi sayacı | Sıra değişiminde ↑↓ oku (geçen haftaya göre) |
| **Dedikodular/Nam** | "Hakkımda konuşuyorlar" | ✅ Nam Penceresi | Nam çubuklarına ilk-açılış animasyonu |
| **Kronik** | "Bir roman okuyorum — kendi romanımı" | ✅ Hayat Romanı paneli | Perde başlıklarını yıl gruplarının arasına serpiştir |
| **Ölüm/Miras** | "Bir hayat kapandı; elimde kalanlar bunlar" | ✅ son sayfa | Paylaşılabilir özet kartı (görüntü export) — lansman öncesi |
| **Savaş** | "Kılıç ağır, karar benim" | ✅ ses bağlı | Yara rozetlerinin kalıcılık vurgusu |
| **Mektep** | "Çocukluğum karakterimi döküyor" | ✅ | — |
| **Pazar/Ticaret** | "Tezgâhta karşımda bir İNSAN var" | ✅ tier notu backend'de | `tier_note`'u pazarlık penceresinde göster |

-----

## 4. Onboarding: İlk 10 Dakika

### H6 — Aşamalı Keşif Kuralı (His Anayasası eki)

> **7-13 yaş = keşif dönemi. Her şeyi baştan göstermek hevesi öldürür.**

- Çocuklukta nav sadedir: mektep, aile, kasaba, pazar, hikâyeler.
  Yetişkin sekmeleri (Meslek, Örgütler, Savaş, Gölge, Mülkler, Rakipler,
  Nesil, Hanedan) **gizlidir** — kilit rozeti bile yok; varlıkları sürpriz.
- SagaStrip, gerilim közü ve ROMAN sekmesi 13'te belirir — "dünya açıldı"
  anının görsel parçasıdır.
- Hanedanlar çocukla uğraşmaz (elçi/sabotaj 13+, backend garantisi).
- Tek istisna: 12 yaşında İlerle butonu bir kez fısıldar —
  *"Büyüyorsun… dünya yakında sana açılacak."* (merak kancası, ifşa değil)

Hedef: ilk oturumda **10+ "Haftayı İlerle"** (v7 KPI). Akış:

1. **Manşet + Yeni Yolculuk** (≤60 sn): isim/cinsiyet, tek ekran. ✅
2. **İlk hafta** — `ilk_yil` tutorial yayı otomatik başlar ✅; ilk hasat
   modalı oyuncuya döngüyü öğretir (PLAN→YAŞA→HASAT) ✅.
3. **İlk kanca** (≤ 5. hafta): yönetmen garantisi — kulak misafiri veya
   kıvılcım. Çocuk eventleri tohum eker (oyuncu bilmez — H4).
4. **İlk sistem keşfi** (≤ 10. dk): SagaStrip rozetlerinden biri yanar
   (elçi/söylenti) → oyuncu ilk kez Rakipler ya da Dedikodular'a iner.

**Ölçüm notu:** ilk oturum ilerleme sayısı şimdilik elle test edilir;
analitik entegrasyonu lansman kalemi.

-----

## 5. Varlık İhtiyaç Listesi (kod hazır, dosya bekliyor)

| Varlık | Adet | Yer | Not |
|---|---|---|---|
| Yetişkin hero görselleri | 4 mevsim × {genç, orta, yaşlı} × {e,k} = 24 (min 8) | `public/images/hero/` | Şimdilik mevsim sahne degradeleri köprü görevi görüyor |
| Hanedan armaları | 6 | Rakipler satırı | Şimdilik emoji sembolleri (🐺👑🗡☪️⚔️🌱) iş görüyor |
| Müzik | 3 parça | `public/audio/` | `audio.js` music kanalı hazır |
| Uygulama ikonu + splash | 1 set | PWA manifest | Lansman |
| Ölüm kartı şablonu | 1 | paylaşım görseli | Chronicle 2.0 viral motoru |

-----

## 6. Denge Defteri (analiz bulgularından — sıralı)

|#|Bulgu|Karar|
|-|------|------|
|D1|**İtibar ödül enflasyonu** — life-event'ler +3-5 itibar veriyor, çocuk 2 yılda tavana dayanıyor (kelepçe kondu ama kaynak duruyor)|Life-event itibar deltaları **yarıya** iner (yukarı yuvarlanır: +5→+3, +3→+2, +1→+1). Uygulanacak: `apply_life_event_choice` tek noktadan.|
|D2|**Kalıcı sakatlık sarmalı** — üst üste yenilgi sınırsız kalıcı -stamina biriktiriyor|Kalıcı sakatlık tavanı: **3**. Sonrası ağır yaraya dönüşür (geçici).|
|D3|**Tarla nakit defteri** — hasat yılda bir, bakım haftalık; defter aylarca eksi görünüyor|UX çözümü: mülk kartında "🌱 bekleyen hasat değeri" satırı (tahmini), kod: property_report.|
|D4|**State mimarisi** — tek Mongo dökümanı ~4.5MB; bin oyunculu üretimde I/O yükü|Lansman öncesi mimari iş: world/history ayrı koleksiyon. **v8 kapsamı dışı**, bilinçli erteleme.|

-----

## 7. Lansman Yolu (v7 Adım 7'nin somut hâli)

```
SAHNE-1  His Anayasası borçları (§3 "Kalan iş" sütunu)      ← ŞİMDİ
SAHNE-2  Denge Defteri D1-D3
SAHNE-3  Varlıklar: hero görselleri + müzik + arma seti
SAHNE-4  i18n tamamlama (locales/ hazır; S1-S4 metinleri TR hardcoded)
SAHNE-5  PWA paketi + ölüm kartı paylaşımı + analitik
SAHNE-6  Kapalı test (10 oyuncu) → KPI ölçümü → store
```

KPI hedefleri v7'den aynen taşınır (D1 %35+, ort. oturum 8dk+,
ilk oturum 10+ ilerleme, nesil devrine ulaşma %20+).

-----

## 8. v8 Başarı Testi

> İlk kez oynayan biri, 10. dakikada telefonu arkadaşına uzatıp şunu diyebilmeli:
>
> *"Bak, şu üstteki yazı benim hayatımın bölüm adı. Şu kırmızı çubuk gerilimim —
> dün bir hanedanın adamına yardım ettim diye elçi gönderdiler, şu mor rozet o.
> Bir de hamamda hakkımda konuşmuşlar, gidip yüzleşeceğim."*

Bu cümle kurulamıyorsa hangi çengel kopuk → §3 tablosuna dön.

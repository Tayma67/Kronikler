# KRONİKLER: KÜLLERİN MİRASI

## Master GDD v5.0 — “Sıfırdan AAA’ya” Yol Haritası

**Tarih:** Haziran 2026 | **Mevcut tamamlanma:** ~%15-20 (oynanır ürün olarak) | **Hedef:** Store-ready, 4-5 dilli, offline destekli mobil AAA yaşam simülasyonu

-----

# BÖLÜM 0 — VİZYON VE TASARIM SÜTUNLARI

## 0.1 Tek Cümlelik Vizyon

> “1200’lerin Anadolu’sunda 7 yaşında bir köy çocuğu olarak doğ, yaşayan bir dünyada kendi hikâyeni yaz, öl ve çocuğunla devam et.”

## 0.2 Dört Tasarım Sütunu (her özellik bunlardan en az birine hizmet etmeli)

1. **YAŞAYAN DÜNYA** — Oyuncu hiçbir şey yapmasa bile dünya değişir: NPC’ler evlenir, ölür, zenginleşir; fraksiyonlar savaşır; fiyatlar dalgalanır.
1. **GÖRÜNÜR SONUÇLAR** — Her seçimin izi kalır. 10 yıl önce hakaret ettiğin tüccar, valilik seçiminde sana oy vermez.
1. **NESİLLER BOYU SÜREKLİLİK** — Ölüm son değil. Servet, itibar, düşmanlıklar ve hikâye miras kalır.
1. **DOKUNULABILIR DERINLIK** — Mobil-first: her sistem 2 dokunuşla erişilir, ama 100 saat sonra hâlâ keşfedilecek katman vardır.

## 0.3 Referans Oyunlar (kalite çıtası)

- **BitLife** → tur-tabanlı yaşam akışı, event yazımı
- **Crusader Kings 3** → karakter-odaklı entrika, fraksiyon derinliği
- **Mount & Blade** → ekonomi/ticaret döngüsü, savaş hissi
- **Stardew Valley** → mülk/üretim sahipliği tatmini, cila standardı

## 0.4 Hedef Metrikler (soft launch kriterleri)

|Metrik                              |Minimum|İyi  |
|------------------------------------|-------|-----|
|D1 retention                        |%35    |%45  |
|D7 retention                        |%12    |%20  |
|Ort. oturum süresi                  |8 dk   |15 dk|
|İlk oturumda “Haftayı İlerle” sayısı|10+    |25+  |
|Tutorial tamamlama                  |%70    |%85  |
|Crash-free oran                     |%99    |%99.5|

-----

# BÖLÜM 1 — MEVCUT DURUM HARİTASI (Haziran 2026 Denetimi)

## 1.1 Sistem Olgunluk Tablosu

|Sistem       |Dosya               |Satır|Olgunluk|Not                                                                |
|-------------|--------------------|-----|--------|-------------------------------------------------------------------|
|Fraksiyon    |faction_system.py   |4.258|★★★★☆   |En derin sistem; darbe, koalisyon, savaş var. UI entegrasyonu eksik|
|Game Routes  |game_routes.py      |3.110|★★★☆☆   |101 endpoint; bazıları sığ                                         |
|Okul         |school.py           |1.392|★★★★☆   |Ders havuzu, kulüpler, mini-eventler sağlam                        |
|Life Events  |life_events.py      |1.398|★★★☆☆   |101 event; yaş 25+ için içerik zayıf                               |
|Simülasyon   |simulation.py       |1.106|★★☆☆☆   |Ekonomi tick’i çok basit — REWORK ÖNCELİĞİ                         |
|NPC Etkileşim|npc_interactions.py |1.000|★★★☆☆   |11 tip var; sonuç çeşitliliği az                                   |
|Diyalog      |dialogue.py         |1.356|★★☆☆☆   |Statik havuz; bağlam farkındalığı zayıf                            |
|Game Engine  |game_engine.py      |841  |★★★☆☆   |Snapshot + rutin sistemi iyi temel                                 |
|Kervan       |caravan.py          |510  |★★★☆☆   |Çalışıyor; risk/ödül dengesi test edilmemiş                        |
|Fırsatlar    |opportunities.py    |844  |★★★☆☆   |İçerik hacmi düşük                                                 |
|Valilik      |city_governance.py  |423  |★★☆☆☆   |Vergi + seçim var; yönetim derinliği yok                           |
|Miras/Nesil  |inheritance.py      |347  |★★★☆☆   |Çekirdek çalışıyor; duygusal ağırlık eksik                         |
|Savaş        |(game_routes içinde)|~300 |★☆☆☆☆   |Zar atımı seviyesinde — REWORK ÖNCELİĞİ                            |
|Quest        |(game_routes içinde)|~120 |★☆☆☆☆   |Sadece accept/complete — REWORK ÖNCELİĞİ                           |

## 1.2 Tamamen Eksik Sistemler

- ❌ Tutorial / onboarding (kritik — yeni oyuncu kaybı %100’e yakın olur)
- ❌ Ses ve müzik (sıfır dosya)
- ❌ Mülk sahipliği (dükkân, tarla, ev satın alma/işletme)
- ❌ Üretim zincirleri (hammadde → işlenmiş ürün)
- ❌ Zincirli görev / hikâye yayları
- ❌ Başarım (achievement) sistemi
- ❌ Geç oyun hedefleri (yaş 40+ içerik çölü)
- ❌ Ayarlar ekranı (ses, dil, erişilebilirlik)
- ❌ Çoklu kayıt slotu
- ❌ i18n altyapısı (tüm metinler hardcoded Türkçe)
- ❌ Offline mod
- ❌ Analitik/telemetri
- ❌ Denge konfigürasyonu merkezi (balance_config.py var ama kapsamı dar)

-----

# BÖLÜM 2 — YOL HARİTASI GENEL BAKIŞ

Toplam 7 faz. Her faz sonunda **oynanabilir, test edilebilir bir build** çıkar (senin zip-per-section akışınla uyumlu).

```
FAZ 1  Ekonomi & Mülkiyet Reworku        ███████░░░  ~%15 katkı
FAZ 2  Quest & Hikâye Motoru             ███████░░░  ~%15 katkı
FAZ 3  Savaş & Çatışma Reworku           █████░░░░░  ~%10 katkı
FAZ 4  Yaşam Derinliği & Geç Oyun        ███████░░░  ~%15 katkı
FAZ 5  Onboarding, UX & Cila             ██████░░░░  ~%12 katkı
FAZ 6  i18n + İçerik Genişletme          █████░░░░░  ~%10 katkı
FAZ 7  Mobil Port + Offline + Launch     ████████░░  ~%18 katkı
                                  Mevcut: ~%15 → TOPLAM %100
```

**Bağımlılık kuralları:**

- Faz 1 → Faz 4’ün önkoşulu (mülk olmadan geç oyun hedefi olmaz)
- Faz 2 → Faz 5’in önkoşulu (tutorial, quest motorunu kullanacak)
- Faz 6 (i18n altyapısı) **Faz 1’den itibaren paralel kural olarak başlar**: yeni metin = merkezi dosyadan
- Faz 7 en sona; ama Faz 5’te mobil viewport testi sürekli yapılır

-----

# BÖLÜM 3 — FAZ DETAYLARI

═══════════════════════════════════════════

## FAZ 1 — EKONOMİ & MÜLKİYET REWORKU

═══════════════════════════════════════════
**Amaç:** “Para kazanmak” tek başına bir oyun döngüsü hâline gelsin. Oyuncu çiftçilikten tüccar imparatorluğuna giden görünür bir merdiven tırmansın.

### 1A — Üretim Zincirleri

Yeni `production_chains.py`:

```
HAMMADDE        ARA ÜRÜN        SON ÜRÜN
buğday      →   un          →   ekmek
koyun       →   yün         →   kumaş → kıyafet
demir cevheri → demir       →   silah / alet
üzüm        →   şıra        →   şarap (yüksek kâr, yasal risk)
odun        →   kereste     →   mobilya
deri        →   işlenmiş deri → zırh / çizme
```

- Her dönüşüm bir **işlik** (atölye) ve **zanaatkâr** gerektirir
- Dönüşüm kârı = son ürün fiyatı − (hammadde + işçilik + vergi)
- NPC zanaatkârlar da bu zinciri kullanır → arz gerçek üretimden gelir, sihirli spawn kalkar
- `_economy_tick` rewrite: mevcut “background production” tamamen üretim zinciri çıktısıyla değiştirilir

### 1B — Mülk Sahipliği Sistemi

Yeni `property_system.py` + endpoint seti:

|Mülk          |Maliyet (örnek)|Gelir tipi                    |Yönetim kararı              |
|--------------|---------------|------------------------------|----------------------------|
|Tarla         |800 akçe       |Mevsimlik hasat               |Ekin seçimi, işçi tutma     |
|Dükkân        |2.000          |Haftalık satış                |Stok seçimi, fiyat belirleme|
|İşlik (atölye)|3.500          |Üretim kârı                   |Zanaatkâr tutma, ürün hattı |
|Han           |6.000          |Kervan + yolcu                |Oda fiyatı, güvenlik        |
|Ev (konak)    |1.500-10.000   |Pasif itibar + aile kapasitesi|Genişletme                  |

- Mülkler **lokasyona bağlı**: savaşta yağmalanabilir, valinin vergi politikasından etkilenir
- Mülk yönetimi haftalık tur içinde 1 karar ekranı (mobilde tek kart)
- Çalışan sistemi: NPC’leri işçi olarak tut → maaş öde → üretkenlik NPC stat’larına bağlı
- Miras entegrasyonu: mülkler çocuğa geçer (Faz 4 bağlantısı)

### 1C — Dinamik Fiyat & Piyasa Olayları

- Fiyat formülü rework: `fiyat = baz × (talep/arz)^esneklik × mevsim × olay_çarpanı`
- Piyasa olayları havuzu (20+): kıtlık, bolluk hasadı, kervan baskını arz şoku, savaş talebi (silah/zırh), salgın (ilaç talebi), düğün sezonu (kumaş/şarap)
- **Arbitraj görünürlüğü:** mevcut `/market/arbitrage` endpoint’i Trade UI’da “Tüccar Sezgisi” paneli olur (ticaret skill seviyesiyle açılır)
- Fiyat geçmişi grafiği (son 12 hafta, basit sparkline)

### 1D — Para Ekonomisi Dengesi

- `balance_config.py` genişletme: tüm gelir/gider kalemleri tek tablodan
- Enflasyon kontrolü: dünyadaki toplam para arzı izlenir; NPC harcamaları para batırıcı (sink) olarak ayarlanır
- Para sink’leri: vergi, mülk bakımı, lonca aidatı (Faz 3), rüşvet, düğün masrafı
- Hedef eğri: oyuncu serveti yaş 15’te ~500, yaş 25’te ~5.000, yaş 40’ta ~50.000 akçe (aktif oyunla)

### Faz 1 Çıktıları

- [ ] production_chains.py + economy tick rewrite
- [ ] property_system.py + 8 endpoint (satın al, sat, yönet, işçi tut/çıkar, fiyat belirle, hasat, rapor)
- [ ] Frontend: Mülklerim sayfası, mülk detay kartı, piyasa grafiği, Tüccar Sezgisi paneli
- [ ] 20+ piyasa olayı (Türkçe metinleriyle, merkezi string dosyasından)
- [ ] Denge testi: 100 haftalık otomatik simülasyon scripti → fiyat/servet eğrileri CSV çıktısı
- [ ] **Build: kronikler_v9_ekonomi.zip**

═══════════════════════════════════════════

## FAZ 2 — QUEST & HİKÂYE MOTORU

═══════════════════════════════════════════
**Amaç:** Oyuncuyu hafta ilerletmeye iten “ne olacak şimdi?” hissi. BitLife’ın event yazımı + CK3’ün dallanan entrikaları.

### 2A — Quest Motoru v2 (`quest_engine.py`)

Veri-tabanlı quest tanımı (kod değil JSON/dict):

```python
{
  "id": "kayip_kervan",
  "tur": "zincir",            # tek | zincir | tekrarlanan
  "tetik": {"yas_min": 16, "lokasyon_tipi": "şehir", "skill": {"ticaret": 2}},
  "adimlar": [
    {"id": "a1", "metin_key": "kayip_kervan_a1",
     "secenekler": [
        {"metin_key": "sec_arastir", "test": {"zeka": 6},
         "basari": {"sonraki": "a2", "efekt": {"itibar": +2}},
         "basarisizlik": {"sonraki": "a1_fail", "efekt": {"sağlık": -5}}},
        {"metin_key": "sec_gormezden", "sonraki": null}
     ]},
    ...
  ],
  "zaman_siniri_hafta": 8,
  "odul": {"para": 300, "item": "harita_parcasi", "iliski": {"npc_rolu": "tüccar_loncasi", "delta": +10}}
}
```

- Adımlar arası hafta geçişi olabilir (“2 hafta sonra haberci gelir”)
- Quest durumu state’e yazılır; kaydet/yükle ile uyumlu
- Başarısızlık da hikâyedir: fail dalları ayrı sonuç metinleri taşır

### 2B — Hikâye Yayları (Story Arcs) — Lansman için 12 yay

Her yay 5-12 adım, 2-4 dallanma, kalıcı sonuç bırakır:

1. **Küllerin Sırrı** (ana yay): ailenin geçmişindeki yangının gerçeği — 3 nesle yayılan ipuçları
1. **Gizli Cemiyet’in Daveti**: mevcut gizli cemiyet mekaniğiyle entegre
1. **Vebanın Gölgesi**: salgın yayılırken şifacı/karantina/kaçış seçimleri
1. **Tahtın Gölgesinde**: veliaht entrikası — fraksiyon darbe sistemine bağlanır
1. **Kanlı Miras**: babanın eski düşmanı senden intikam peşinde
1. **İpek Yolu Rüyası**: kervan imparatorluğu kurma yayı (Faz 1 mülk sistemine bağlı)
1. **Yasak Aşk**: farklı sınıftan/fraksiyondan biriyle ilişki — aile/lonca tepkisi
1. **Hocanın Mirası**: okuldaki hocanın gizli kütüphanesi (okul sistemi entegrasyonu)
1. **Haydut Kralı**: suç yolunun zirvesi — crime sistemini yaya dönüştürür
1. **Adalet Terazisi**: haksız yere suçlanma, kendini aklama
1. **Toprak Davası**: komşu köyle su/toprak anlaşmazlığı — valilik mekaniğine bağlı
1. **Son Vasiyet**: ölüm yaklaşırken mirası hazırlama yayı (Faz 4 köprüsü)

### 2C — Dinamik Event Yazım Standardı

- Mevcut FLAVOR_LINES sistemini genişlet: her event = açılış atmosferi + gövde + sonuç
- Bağlam enjeksiyonu: event metinleri `{npc_adi}`, `{lokasyon}`, `{mevsim}`, `{meslek}` değişkenlerini kullanır
- Yaş bantlarına içerik dağılımı hedefi:
  
  |Yaş bandı       |Mevcut event|Hedef  |
  |----------------|------------|-------|
  |7-13 (çocukluk) |~30         |45     |
  |13-18 (gençlik) |~35         |55     |
  |18-30 (yetişkin)|~25         |70     |
  |30-50 (orta yaş)|~8          |50     |
  |50+ (yaşlılık)  |~3          |30     |
  |**Toplam**      |**101**     |**250**|

### 2D — Söylenti & Bilgi Ekonomisi

- rumors.py genişletme (132 satır → hedef ~500): söylentiler **eyleme dönüşür**
- Söylenti türleri: piyasa ipucu (Faz 1 arbitraja bağlı), quest tetikleyici, NPC sırrı (şantaj/itibar silahı), fraksiyon istihbaratı
- Yanlış söylenti riski: kaynak NPC’nin güvenilirlik stat’ı

### Faz 2 Çıktıları

- [ ] quest_engine.py (veri-tabanlı, dallanan, zaman sınırlı)
- [ ] 12 hikâye yayı (yaklaşık 100 adım, ~400 metin parçası)
- [ ] Event havuzu 101 → 250
- [ ] Söylenti reworku
- [ ] Frontend: Quest günlüğü sayfası (aktif/tamamlanan/başarısız), adım ilerleme UI, seçim modalı v2
- [ ] **Build: kronikler_v10_hikaye.zip**

═══════════════════════════════════════════

## FAZ 3 — SAVAŞ & ÇATIŞMA REWORKU

═══════════════════════════════════════════
**Amaç:** Tek butonluk zar atımından, mobilde 60-90 saniyelik taktik mini-oyuna.

### 3A — Taktik Savaş v2 (`combat_engine.py`)

Tur-tabanlı, 3 aşamalı kart-seçim modeli (mobil dostu, animasyona uygun):

1. **Hazırlık:** Duruş seç (Saldırgan / Dengeli / Savunmacı) + ekipman aktif bonusları
1. **Çatışma turları (3-6 tur):** Her tur 3 eylem kartından biri: Hamle / Savuştur / Özel Yetenek (perk’ten gelir). Rakip niyeti kısmen görünür (“kılıcını kaldırıyor…”) → taş-kağıt-makas + stat ağırlığı
1. **Sonuç:** Yaralanma sistemi — ölüm yerine kademeli: sıyrık → yara (haftalarca stat cezası) → sakatlık (kalıcı) → ölüm (sadece kritik dövüşlerde)

- Combat skill + perk entegrasyonu: perk ağacındaki savaş dalı gerçek kart açar
- Kaçma her zaman seçenek (itibar bedeli ile)

### 3B — Savaş Türleri

|Tür                |Tetik                      |Ölçek                                                       |
|-------------------|---------------------------|------------------------------------------------------------|
|Düello             |NPC hakaret/rekabet        |1v1                                                         |
|Soygun savunması   |Seyahat/kervan olayı       |1v2-3                                                       |
|Fraksiyon çatışması|faction war partisipasyonu |Toplu (oyuncu komutan rolünde: taktik seçimi + kritik anlar)|
|Kale kuşatması     |Geç oyun, faction savaşları|Çok aşamalı set-piece                                       |
|Turnuva            |Mevsimlik etkinlik         |Eleme usulü, bahis sistemi                                  |

### 3C — Fraksiyon Savaşlarının Oyunculaştırılması

- faction_system.py’deki savaş simülasyonu zaten derin — eksik olan **oyuncunun içindeki rolü**
- Komutan modu: savaş öncesi 3 stratejik karar (cephe seçimi, ikmal, gece baskını riski) → simülasyon sonucunu ±%30 etkiler
- Savaş sonu ganimet/esir/itibar tablosu

### Faz 3 Çıktıları

- [ ] combat_engine.py (kart-tabanlı taktik sistem)
- [ ] Yaralanma/sakatlık sistemi (player + NPC)
- [ ] 5 savaş türü + turnuva etkinliği
- [ ] Frontend: Battle.jsx tam rewrite — kart animasyonları, niyet göstergesi, yara durum çubuğu
- [ ] **Build: kronikler_v11_savas.zip**

═══════════════════════════════════════════

## FAZ 4 — YAŞAM DERİNLİĞİ & GEÇ OYUN

═══════════════════════════════════════════
**Amaç:** Yaş 30-70 arası “içerik çölünü” doldur. Oyuncunun 3. neslinde hâlâ yeni şeyler görmesi.

### 4A — Kariyer Ustalık Sistemi

Her meslek 5 kademe: Çırak → Kalfa → Usta → Üstat → Efsane

- Kademe atlamak: skill + yıl + ustalık sınavı eventi
- Usta+: çırak alabilir (NPC çırağın gelişimi mini-hikâye), lonca yönetimine aday olabilir
- Meslek-özel içerik: demirciye özel sipariş eventi, şifacıya salgın kriz yönetimi, tüccara lonca ihalesi
- Lonca sistemi: aidat (para sink), lonca görevleri, lonca başkanlığı seçimi (valilik benzeri)

### 4B — Aile 2.0

- **Eş ilişki derinliği:** evlilik sonrası ilişki bakım gerektirir — ihmal → soğuma → kriz eventi
- **Çocuk yetiştirme kararları:** eğitim yönü, çıraklık yerleştirme, çeyiz/miras planlama → çocuğun başlangıç stat’larını şekillendirir (nesil geçişinde oyuncu kendi yatırımının ürününü oynar)
- **Aile itibarı (hanedan puanı):** nesiller boyu biriken görünür skor; konak büyüklüğü, evlilik teklifleri, fraksiyon davetlerini etkiler
- **Aile içi eventler:** kardeş rekabeti, miras kavgası, kara koyun çocuk, torun sevinci

### 4C — Yaşlılık & Vasiyet

- 50+ özel event havuzu (30 event): hastalıklar, bilgelik anları, eski düşmanla yüzleşme, anı yazma
- **Vasiyet ekranı:** ölmeden mülk/para/eşya dağılımını planla; çocuklar arası adaletsizlik → nesil geçişinde kardeş düşmanlığı
- **Ölüm sahnesi reworku:** hayat özetinin sinematik akışı (Chronicle verisinden) — duygusal doruk noktası
- Nesil geçiş bonusu: önceki neslin başarıları yeni nesle “Miras Perki” verir

### 4D — Dünya Geç Oyunu

- **Kral/Sultan yolu:** valilik → bölge beyliği → taht iddiası (faction darbe sistemiyle final entegrasyonu)
- **Şehir kurma:** faction_system’deki city building mekaniğinin oyuncuya açılması
- Dünya çağ olayları: 50-100 haftada bir büyük dönüm noktası (büyük savaş, salgın, taht değişimi) → dünya haritası kalıcı değişir

### Faz 4 Çıktıları

- [ ] Kariyer ustalık + lonca sistemi
- [ ] Aile 2.0 (eş bakımı, çocuk yatırımı, hanedan puanı)
- [ ] Yaşlılık event havuzu + vasiyet ekranı + ölüm sahnesi reworku
- [ ] Kral yolu + şehir kurma oyuncu erişimi
- [ ] **Build: kronikler_v12_yasam.zip**

═══════════════════════════════════════════

## FAZ 5 — ONBOARDING, UX & CİLA

═══════════════════════════════════════════
**Amaç:** İlk 10 dakika kusursuz; her dokunuş tatmin edici.

### 5A — Tutorial (quest motoruyla yapılır — Faz 2 bağımlılığı)

- “İlk Yıl” rehberli yayı: 7 yaşındaki karakterin ilk 8 haftası = doğal tutorial
- Her sistem ilk kez açıldığında 1 kartlık bağlamsal ipucu (toplu metin duvarı yasak)
- Atlanabilir; ayarlardan tekrar açılabilir

### 5B — UX Denetimi & Düzeltme Listesi

- Navigasyon derinliği: hiçbir özellik 3 dokunuştan derinde olmamalı (mevcut: bazı faction ekranları 5 dokunuş)
- Haftayı İlerle akışı: sonuç özetinin okunabilirliği — “bu hafta ne oldu” tek ekran hiyerarşisi
- Boş durum (empty state) tasarımları: envanter boşsa, quest yoksa ne gösterilir
- Yükleme durumları: skeleton ekranlar, optimistik UI
- Erişilebilirlik: font ölçek desteği, kontrast denetimi (WCAG AA)

### 5C — Ses & Müzik

- Müzik: 6-8 parça (ana tema, köy, şehir, savaş, hüzün/ölüm, gerilim) — telifsiz/orijinal Ortadoğu-Anadolu enstrümantal (ney, ud, perküsyon)
- SFX: ~40 ses (buton, para, sayfa, savaş darbeleri, event bildirimi, mevsim geçişi)
- Web Audio API + ayarlardan ayrı müzik/SFX seviyesi

### 5D — Görsel Cila

- Mikro-animasyonlar: stat artışı sayaç animasyonu, para kazanma uçan rakam, kart giriş geçişleri
- Mevsim teması: UI renk paleti mevsimle hafifçe değişir (kış soğuk tonlar, hasat altın)
- Portre sistemi: yaşa göre değişen karakter portreleri (çocuk/genç/yetişkin/yaşlı en az 4 aşama × cinsiyet)
- Haptik geri bildirim noktaları (mobil için işaretle, Faz 7’de aktive et)

### 5E — Sistem Cilası

- Başarım sistemi: 50 başarım (Chronicle verisinden tetiklenir)
- Çoklu kayıt: 3 slot + bulut senkron hazırlığı
- Ayarlar ekranı: ses, dil (Faz 6 hazırlığı), metin hızı, erişilebilirlik
- İstatistik sayfası: hanedan tarihi, rekorlar
- Telemetri: anonim event tracking (retention analizi için) — KVKK/GDPR uyumlu opt-in

### Faz 5 Çıktıları

- [ ] “İlk Yıl” tutorial yayı + bağlamsal ipuçları
- [ ] UX düzeltme listesi (denetimle ~40 madde çıkar) tamamı
- [ ] 6-8 müzik + 40 SFX + ses ayarları
- [ ] Portre sistemi + mikro-animasyon seti
- [ ] Başarımlar, çoklu kayıt, ayarlar, istatistik, telemetri
- [ ] **Build: kronikler_v13_cila.zip**

═══════════════════════════════════════════

## FAZ 6 — i18n + İÇERİK GENİŞLETME

═══════════════════════════════════════════
**Amaç:** 5 dil, çeviriye hazır mimari, içerik hacmini AAA seviyesine tamamlama.

### 6A — i18n Altyapısı (kural Faz 1’de başlar, göç burada biter)

- Backend: tüm metinler `locales/tr.py` → key-tabanlı; event/quest metinleri zaten Faz 2’den itibaren key’li
- Frontend: react-i18next; `locales/tr.json`, `en.json`…
- Değişken enjeksiyonu dil-güvenli: cümle yapısı farklı diller için tam cümle şablonları (kelime ekleme değil)
- Eski hardcode metin göçü: tahmini 3.000-4.000 string — otomatik tarama scripti + elle düzeltme

### 6B — Dil Seti & Çeviri Stratejisi

|Dil       |Pazar gerekçesi            |Yöntem                                |
|----------|---------------------------|--------------------------------------|
|Türkçe    |Ana dil                    |Kaynak                                |
|İngilizce |Global zorunlu             |Profesyonel/yarı-pro + senin denetimin|
|Almanca   |TR diasporası + güçlü pazar|Çeviri ajansı veya AI+editör          |
|İspanyolca|Hacim (LatAm dahil)        |AI+editör                             |
|Arapça    |Tema yakınlığı, MENA pazarı|Pro çeviri (RTL desteği gerekir!)     |

- **RTL desteği** Arapça için frontend iş kalemi: layout mirror, font seti
- Çeviri hacmi tahmini: ~60.000-80.000 kelime (oyun metni yoğun)

### 6C — İçerik Tamamlama Hedefleri (lansman çıtası)

|İçerik            |Faz 5 sonu|Lansman hedefi|
|------------------|----------|--------------|
|Life events       |250       |300           |
|Hikâye yayı       |12        |16            |
|Piyasa olayı      |20        |30            |
|Meslek-özel event |~15       |40            |
|Başarım           |50        |75            |
|NPC diyalog havuzu|mevcut    |2× genişletme |

### Faz 6 Çıktıları

- [ ] i18n altyapı + tam string göçü
- [ ] 5 dil canlı (Arapça RTL dahil)
- [ ] İçerik tamamlama tablosundaki tüm hedefler
- [ ] **Build: kronikler_v14_i18n.zip**

═══════════════════════════════════════════

## FAZ 7 — MOBİL PORT + OFFLINE + LANSMAN

═══════════════════════════════════════════
**Amaç:** Store’da yaşayan, offline oynanabilen ürün.

### 7A — Mimari Dönüşüm: Client-Side Simülasyon

En kritik teknik karar. Mevcut: her “Haftayı İlerle” = sunucu round-trip. Hedef: **simülasyon cihazda çalışır.**

- simulation.py + game_engine.py + faction_system.py → JS/TS portu **veya** Pyodide (WASM Python) değerlendirmesi
  - Öneri: **JS portu** (Pyodide ~10MB+ yük ve başlatma maliyeti mobilde ağır). Port işi büyük ama Faz 1-4’te sistemler veri-tabanlı tasarlandıysa (JSON config’ler) port %60 veri taşıma olur — bu yüzden Faz 1’den itibaren “mantık minimal, veri maksimal” prensibi
- State tek kaynak: cihazda IndexedDB/SQLite; sunucu = yedekleme + hesap senkronu
- Çakışma çözümü: son-yazan-kazanır + cihaz kimliği

### 7B — Capacitor Paketleme

- Capacitor wrapper: iOS + Android tek React kod tabanından
- Native köprüler: haptik, yerel bildirim (“kervanın döndü!”), paylaşım, app review prompt
- Performans bütçesi: ilk açılış <3 sn, hafta ilerletme <500 ms (client-side ile doğal)
- Store varlıkları: ikon seti, ekran görüntüleri (5 dilde), tanıtım videosu (30 sn), store metinleri

### 7C — Monetizasyon (50M hedefi için zorunlu tasarım)

Free-to-play + saygılı model (yaşam simülasyonu kitlesi agresif monetizasyondan nefret eder):

- **Premium sürüm** (tek seferlik): reklamsız + 2 bonus kayıt slotu + kozmetik portre paketi
- **Ödüllü reklam** (opsiyonel): haftalık “Kader Yenile” (event reroll), kervan hızlandırma — **asla pay-to-win stat satışı yok**
- Sezonluk içerik planı: lansman sonrası 6 haftada bir event paketi (canlı oyun ritmi)

### 7D — Lansman Dizisi

1. **Kapalı beta** (TR, 200-500 kişi, TestFlight/Play Internal): 4 hafta, crash + denge verisi
1. **Soft launch** (TR + 1 küçük pazar): retention metrikleri Bölüm 0.4 çıtasını geçene kadar iterasyon
1. **Global lansman**: 5 dil, ASO optimize, basın kiti, içerik üretici erişim programı (Türk YouTuber/streamer’lar başlangıç kaldıracı)

### Faz 7 Çıktıları

- [ ] Simülasyon JS portu + offline-first state mimarisi
- [ ] Capacitor iOS/Android buildleri
- [ ] Monetizasyon entegrasyonu (IAP + ödüllü reklam)
- [ ] Store varlıkları 5 dilde
- [ ] Beta → soft launch → global dizi
- [ ] **Build: kronikler_v15_launch**

-----

# BÖLÜM 4 — SÜREKLİ KURALLAR (her fazda geçerli)

1. **String kuralı:** Yeni metin asla hardcode edilmez → merkezi dosya/key (Faz 6’nın maliyetini şimdiden düşürür)
1. **Veri > kod:** Eventler, questler, dengeler JSON/dict config — Faz 7 JS portunu kolaylaştırır
1. **Her bölüm = çalışan zip:** Senin section-by-section akışın korunur; hiçbir build kırık teslim edilmez
1. **Denge scripti her fazda koşar:** 100 haftalık otomatik simülasyon → CSV → eğri kontrolü
1. **Mobil viewport önce:** Her yeni ekran önce 375px genişlikte tasarlanır
1. **GDD versiyonlama:** Her faz sonunda bu doküman güncellenir (v5.1, v5.2…)

-----

# BÖLÜM 5 — RİSKLER & KARARLAR

|Risk                                                   |Etki             |Önlem                                                                                           |
|-------------------------------------------------------|-----------------|------------------------------------------------------------------------------------------------|
|JS portu (Faz 7) beklenenden büyük çıkar               |Lansman gecikir  |Faz 1’den itibaren veri-tabanlı tasarım; Faz 4 sonunda port spike testi (1 sistemi deneme portu)|
|İçerik yazım hacmi (250+ event, 16 yay) tek kişiye ağır|Kalite düşer     |Claude oturumlarıyla taslak + senin editörlüğün; yaş bandı başına şablonlaştırma                |
|Arapça RTL frontend maliyeti                           |Faz 6 şişer      |Gerekirse Arapça lansman-sonrası v1.1’e ertelenir (karar noktası: Faz 6 başı)                   |
|Ekonomi reworku eski kayıtları bozar                   |Test kaybı       |State migration fonksiyonu (`_ensure_state_fields` deseni zaten var, genişletilir)              |
|50M hedefi vs. gerçeklik                               |Beklenti yönetimi|Soft launch metrikleri karar verir; çıta geçilirse pazarlama yatırımı konuşulur                 |

-----

# BÖLÜM 6 — İLK ADIM

**Faz 1A: Üretim Zincirleri** ile başlanır:

1. `production_chains.py` — zincir tanımları + dönüşüm mantığı
1. `_economy_tick` rewrite — sihirli arz yerine gerçek üretim
1. String kuralı ilk uygulama: piyasa olay metinleri `locales/tr.py`’den
1. 100 haftalık denge scripti
1. → kronikler_v9 zip

*GDD v5.0 sonu — bir sonraki güncelleme: Faz 1 tamamlandığında (v5.1)*
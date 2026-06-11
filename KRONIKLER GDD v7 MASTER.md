# KRONİKLER: KÜLLERİN MİRASI

## Master GDD v7.0 — Menü Oyunundan Hikâye Makinesine

> **v7.0 MASTER** — GDD v6.0 ÇIĞIR + GDD v6.1 DERİNLİK birleşimi  
> Haziran 2026 · Kod tabanı: Kronikler-main (27.400+ satır Python)  
> v5 altyapı fazlarıyla birlikte okunur.

-----

## İçindekiler

- [Vizyon](#vizyon)
- [Teşhis — Neden %15’te Hissediliyor?](#teşhis)
- [Kod Denetimi — Mevcut Durum](#kod-denetimi)
- [Bölüm I — Oynayış Derinleştirme Reworku (v6.1)](#bölüm-i--oynayış-derinleştirme-reworku)
  - [Üç Katman Kuralı](#üç-katman-kuralı)
  - [R1 — Hafta Döngüsü](#r1--hafta-döngüsü)
  - [R2 — Çalışma](#r2--çalışma)
  - [R3 — Ticaret & Pazarlık](#r3--ticaret--pazarlık)
  - [R4 — NPC Sohbet Eli](#r4--npc-sohbet-eli)
  - [R5 — Okul](#r5--okul)
  - [R6 — Suç](#r6--suç)
  - [R7 — Seyahat](#r7--seyahat)
  - [R8 — Fraksiyon Yüzeyi](#r8--fraksiyon-yüzeyi)
  - [R9 — Geri Bildirim Lezzeti](#r9--geri-bildirim-lezzeti)
- [Bölüm II — Dört Omurga Sistemi (v6.0)](#bölüm-ii--dört-omurga-sistemi)
  - [S1 — Rakip Hanedanlar](#s1--rakip-hanedanlar)
  - [S2 — NPC Zihni](#s2--npc-zihni)
  - [S3 — Hikâye Yönetmeni](#s3--hikâye-yönetmeni)
  - [S4 — Sonuç Tohumları](#s4--sonuç-tohumları)
- [Bölüm III — Entegrasyon & Yol Haritası](#bölüm-iii--entegrasyon--yol-haritası)
- [Başarı Testi](#başarı-testi)
- [Hedef KPI’lar](#hedef-kpılar)

-----

## Vizyon

> “1200’lerin Anadolu’sunda 7 yaşında bir köy çocuğu olarak doğ, yaşayan bir dünyada kendi hikâyeni yaz, öl ve çocuğunla devam et.”

### Dört Tasarım Sütunu

|Sütun                       |Açıklama                                                                                                                  |
|----------------------------|--------------------------------------------------------------------------------------------------------------------------|
|**YAŞAYAN DÜNYA**           |Oyuncu hiçbir şey yapmasa bile dünya değişir: NPC’ler evlenir, ölür, zenginleşir; hanedanlar savaşır; fiyatlar dalgalanır.|
|**GÖRÜNÜR SONUÇLAR**        |Her seçimin izi kalır. 10 yıl önce hakaret ettiğin tüccar valilik seçiminde sana oy vermez.                               |
|**NESİLLER BOYU SÜREKLİLİK**|Ölüm son değil. Servet, itibar, düşmanlıklar ve hikâye miras kalır.                                                       |
|**DOKUNULABİLİR DERİNLİK**  |Mobil-first: her sistem 2 dokunuşla erişilir, ama 100 saat sonra hâlâ keşfedilecek katman vardır.                         |

-----

## Teşhis

**Sorun içerik azlığı değil. Sorun oyunun ne olduğu.**

Kronikler şu an bir **menü koleksiyonu**. Oyuncu “Haftayı İlerle”ye basar → rastgele event okur → menülerden işlem yapar. Sistemler var ama birbirleriyle konuşmuyorlar ve *dünya oyuncuyu umursamıyor.*

```
HİS = (Anlamlı KARAR) × (Sonucun AĞIRLIĞI) × (Geri Bildirimin LEZZETİ)

Kronikler'de şu an: KARAR ≈ 0 · AĞIRLIK ≈ düşük · LEZZET ≈ kuru metin → ÇARPIM = SIFIR
```

En sık oyuncu eylemi olan `work` endpoint’inin mevcut implementasyonu:

```python
# game_routes.py — work endpoint özeti
income = random.randint(lo, hi)
player["money"] += income
# bitti. Karar yok. Risk yok. Bilgi yok.
```

Bu desen `trade`, `npc_gift`, `commit_crime`, `travel`, `pay_taxes`… `game_routes.py`‘deki **101 endpoint’in neredeyse tamamında** tekrarlanıyor. İçerik eklemek bunu değiştirmez; oyunun DNA’sı değişmeli.

-----

## Kod Denetimi

> Haziran 2026 itibarıyla mevcut kod tabanının durumu. Toplam ~27.400 satır Python.

|Sistem           |Dosya                 |Satır|Olgunluk|Kritik Boşluk                                                                                                                                     |
|-----------------|----------------------|-----|--------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|**Fraksiyon**    |`faction_system.py`   |4.258|★★★★☆   |UI hiçbir derinliği yüzeye taşımıyor; 4K satır oyuncuya görünmez                                                                                  |
|**Game Routes**  |`game_routes.py`      |3.125|★★★☆☆   |101 endpoint çoğu `random(lo,hi)` — “Üç Katman Kuralı” yokluğu                                                                                    |
|**Diyalog**      |`dialogue.py`         |1.356|★★★☆☆   |NPC konuşma motoru mevcut; R4 Sohbet Eli bu temeli kullanmalı — sıfırdan yazılmamalı                                                              |
|**Okul**         |`school.py`           |1.392|★★★★☆   |Sınıf rekabeti + sınıf arkadaşı kalıcılığı eksik                                                                                                  |
|**Life Events**  |`life_events.py`      |1.403|★★★☆☆   |Seçimler tohum *üretmiyor*; yaş 25+ içerik çölü                                                                                                   |
|**Simülasyon**   |`simulation.py`       |1.197|★★☆☆☆   |Ekonomi tick’i basit; hanedan tick’i henüz yok                                                                                                    |
|**NPC Etkileşim**|`npc_interactions.py` |1.000|★★★☆☆   |11 etkileşim tipi var; `push_personal_memory()` çağrılıyor **ancak hafıza yapısı çok primitif** — duygu_yuku, unutma_hizi, taniklar alanları eksik|
|**NPC Profili**  |`npc_profile.py`      |832  |★★★★☆   |`push_personal_memory()` var ve çağrılıyor ✓; ama yalnızca 12 string’lik düz liste — **yapısal derinleştirme gerekiyor**, sıfırdan yazım değil    |
|**Game Engine**  |`game_engine.py`      |841  |★★★☆☆   |`diff_snapshots()`, `run_npc_daily_routines()`, kariyer sistemi burada; R9 doğrudan bağlı                                                         |
|**Quest Motoru** |`quest_engine.py`     |~480 |★★☆☆☆   |story_arcs & story_flags var; yönetmen entegrasyonu yok                                                                                           |
|**İtibar**       |`social_reputation.py`|~400 |★★★☆☆   |“Nam” profili hesabı yok; dedikodu akışına bağlı değil                                                                                            |
|**Dedikodu**     |`rumors.py`           |212  |★★☆☆☆   |Template havuzu var; oyuncu namı & tanık sistemi yok                                                                                              |
|**Miras**        |`inheritance.py`      |347  |★★★☆☆   |Para + skill geçiyor; tutum mirası + tohum mirası eksik                                                                                           |
|**Anlatı Motoru**|`narrative_engine.py` |486  |★★☆☆☆   |Statik şablonlar; S3 Hikâye Yönetmeni için yeniden yazılacak                                                                                      |
|**Savaş**        |`combat_engine.py`    |~300 |★☆☆☆☆   |Zar atımı seviyesi — v5 Faz 3 önceliği                                                                                                            |


> **Kritik gözlem:** Altyapı kısmen hazır; **bağlantı katmanları eksik.** `dialogue.py`’daki konuşma motoru, `faction_system.py`’daki utility scoring, `rumors.py`’daki template sistemi — hepsi var ama birbirine ve oyuncu deneyimine bağlanmamış.

-----

## Bölüm I — Oynayış Derinleştirme Reworku

> **“Yeni sistem yok. Var olan her eylemi OYUNA çevir.”**  
> Kapsam: Mevcut sistemlerin oynanabilirliğini %10 → %50.  
> Bu reworklar omurga sistemlerinden (Bölüm II) **önce** uygulanır.

### Üç Katman Kuralı

Tüm reworkun anayasası. **Her oyuncu eylemi bu 3 katmanı taşımalı:**

|#|Katman              |Tanım                                                                             |
|-|--------------------|----------------------------------------------------------------------------------|
|1|**ÖNCE — Karar**    |En az 2 anlamlı seçenek, görünür risk/ödül farkıyla. Oyuncu seçerken düşünmeli.   |
|2|**SIRADA — Varyans**|%20-35 ihtimalle mikro-olay araya girer — seçimli, asla zorunlu değil.            |
|3|**SONRA — İz**      |Sonuç bir yere yazılır: skill XP, NPC anısı, nam, tohum. + Lezzetli geri bildirim.|

Bir eylem bu 3 katmanı taşımıyorsa ya derinleştirilir ya da menüden **silinir**. Boş buton his katilidir.

-----

### Rework Uygulama Sırası

|# |Rework          |Neden Bu Sıra                           |Tahmini İş|
|--|----------------|----------------------------------------|----------|
|R1|Hafta Döngüsü   |Her şeyin çerçevesi; anında his değişimi|Orta      |
|R9|Geri Bildirim   |Ucuz, her sistemi anında lezzetlendirir |Küçük     |
|R2|Çalışma         |En sık eylem = en yüksek his kaldıracı  |Orta      |
|R4|NPC Sohbet Eli  |Sosyal motor; R7 de bunu kullanacak     |Büyük     |
|R3|Ticaret/Pazarlık|Ekonomi reworkunun his katmanı          |Orta      |
|R6|Suç             |Bağımsız, hızlı kazanım                 |Orta      |
|R7|Seyahat         |R4 motorunu yeniden kullanır            |Küçük     |
|R5|Okul            |Zaten iyi; cila + tohum ilk atışı       |Küçük     |
|R8|Fraksiyon Yüzeyi|S1 Hanedanlar öncesi zemin              |Orta      |

-----

### R1 — Hafta Döngüsü

> **En kritik rework.** “Haftayı İlerle” yeniden doğuyor: PLAN + YAŞA + HASAT.

**Mevcut sorun:** Oyuncu seyirci. Bas → event listesi oku → tekrar bas. `simulation.py`’daki haftalık tick her şeyi arka planda hallediyor.

#### 1.1 — Hafta Planı (ÖNCE katmanı)

“İlerle”ye basmadan önce oyuncu haftasını 3 slota böler. Dashboard UI’a tek kart olarak eklenir:

```
┌─────────────────────────────────────────────────────────┐
│  [ İŞ ]          [ SOSYAL ]         [ KİŞİSEL ]        │
│  ○ Çalış         ○ Hamam            ○ Dinlen             │
│  ● Fazla mesai   ○ Ziyaret          ○ Antrenman          │
│  ○ Ticaret       ● Pazar            ● Dua/Okuma          │
│                                                          │
│  Seçili plan: Fazla mesai + Pazar + Dua                  │
│  Beklenti: ↑ gelir, risk: sağlık ↓ · sosyal eventler    │
└─────────────────────────────────────────────────────────┘
```

**3 slot = 27 kombinasyon.** Aynı hafta asla aynı hissettirmez. Varsayılan plan hatırlanır → istemeyen oyuncu yine tek dokunuşla ilerler (mobil akıcılık korunur).

Slot seçimi `simulation.py`’daki `_random_events` event havuzunu **ağırlıklandırır**: “Hamam” seçtiysen `rumors.py` eventleri ön plana, “Fazla mesai” seçtiysen üretim eventleri + sağlık risk artışı.

#### 1.2 — Hafta Sonu Hasadı (SONRA katmanı)

Mevcut düz event listesi yerine 3 bölümlü özet ekranı:

|Bölüm             |İçerik                                                  |Uygulama Notu                                                          |
|------------------|--------------------------------------------------------|-----------------------------------------------------------------------|
|**MANŞET**        |1 büyük olay, yönetmen seçer. Büyük punto, vurucu cümle.|S3 yönetmen hazır olunca dramaturjik seçim; şimdilik ağırlıklı rastgele|
|**KAZANÇLAR**     |Para/XP/ilişki delta’ları animasyonlu sayaçlarla        |`diff_snapshots()` zaten `game_engine.py`’da var — sadece UI katmanı   |
|**KULAK MİSAFİRİ**|1 dedikodu/ipucu satırı. Gelecek haftaya merak kancası. |`rumors.py` akışından; oyuncunun namıyla ilgili satır öncelik          |


> **Etki:** Oyuncunun dakikadaki kararı **0 → 3**. Bu tek rework başına his değişimini en çok sağlayan adımdır.

-----

### R2 — Çalışma

> Her iş günü bir mini-sahne. `random(lo,hi)` tarihe karışıyor.

#### 2.1 — Çalışma Tarzı (ÖNCE)

|Tarz     |Gelir|Risk                                     |Yan Etki                     |
|---------|-----|-----------------------------------------|-----------------------------|
|Garantici|×0.8 |Yok                                      |—                            |
|Normal   |×1.0 |Düşük                                    |—                            |
|Hırslı   |×1.4 |%15 başarısızlık (gelir ×0.3 + yorgunluk)|Patron/usta anısı +          |
|Kaytarıcı|×0.4 |%20 yakalanma (itibar −)                 |Sağlık +, gizli event şansı ↑|

Varsayılan “Normal” hatırlanır; değiştirmek istemeyenler için ek dokunuş yok.

#### 2.2 — Meslek Mini-Olayları (SIRADA — %30)

Mesleğe özel havuzlar, her havuz 8-10 adet:

```
# Demirci
"Ağa'nın oğlu kılıç istiyor — acele iş, çifte ücret ama %40 kusur riski. Kabul?"
  → EVET: gelir ×2, itibar +4 (başarılı) VEYA müşteri anısı − (başarısız)
  → HAYIR: kaçırılan fırsat notu

# Tüccar
"Kervandan ucuza kalan mal — menşei şüpheli. Al?"
  → AL: kâr potansiyeli ↑ ama 'sıcak mal' riski

# Çiftçi
"Komşunun öküzü tarlana girdi. Tazminat iste / görmezden gel / öküzü alıkoy"
  → Her seçim push_personal_memory() üretir → S2 bağlanınca otomatik çalışır
```

#### 2.3 — Ustalık İlerlemesi (SONRA)

Her çalışma haftası meslek XP çubuğunu doldurur (HUD’da). Çubuk dolunca kademe eventi. Mevcut `skills.py` sistemiyle doğrudan entegre.

-----

### R3 — Ticaret & Pazarlık

> `Trade.jsx` 1.201 satır ama his yok. Pazarlık + bilgi + risk üçgeni.

#### 3.1 — Pazarlık Mini-Oyunu (ÖNCE)

Her alışverişte opsiyonel, ~10 saniye:

```
┌──────────────────────────────────────────────┐
│  Demircinin Murat: "8 Akçe. Son fiyatım."    │
│                                              │
│  [✓ Kabul Et]  [◈ Karşı Teklif: 6]  [⚡ Blöf]│
│                                              │
│  Blöf: "Çarşıda 5'e buldum."                │
│  Başarılı: tasarruf + XP                     │
│  Tutmazsa: Murat anısı − (bu hafta %15 zam) │
└──────────────────────────────────────────────┘
```

Çekişme barı: Ticaret skill + NPC inatçılığı + ilişki skoru, 2 tur. Skill büyüdükçe NPC’lerin “taban fiyatı” görünmeye başlar → **bilgi = güç döngüsü.**

#### 3.2 — Mal Kalitesi

Mevcut item yapısına tek alan: `kalite: kusurlu | sıradan | iyi | usta_işi`

|Kalite  |Çarpan|Görünürlük                    |
|--------|------|------------------------------|
|Kusurlu |×0.6  |İncele (zeka testi) ile açılır|
|Sıradan |×1.0  |Varsayılan                    |
|İyi     |×1.5  |Görünür                       |
|Usta İşi|×2.5  |Görünür + özel görsel         |

Kusurluyu ucuza alıp bilmeyene satma oyunu doğar — ama nam riski!

#### 3.3 — Stok & Fiyat Hafızası

Sınırlı stok + “geçen hafta fiyatı” görünür. `production_chains.py`’daki arz motoru bunu zaten üretiyor; sadece UI katmanına aktarılacak.

-----

### R4 — NPC Sohbet Eli

> Her etkileşim küçük bir sosyal el oyunu. **“İltifat et → +2” ölüyor.**  
> ⚠️ `dialogue.py` (1.356 satır) bu reworkun temelidir — sıfırdan yazılmayacak, genişletilecek.

#### 4.1 — Konu Kartı Sistemi (ÖNCE)

NPC’ye yaklaşınca 3 “konu kartı” dağıtılır. Kart havuzu bağlamdan üretilir: lokasyon, son dünya olayları, NPC’nin aktif amacı, oyuncunun namı:

```
┌────────────────────────────────────────────────────────┐
│  Demirci Hasan ile konuş                               │
│                                                        │
│  [Havadan sudan]  [Çarşıdaki kavga]  [Kızının nişanı] │
│   güvenli +1        riskli ±4          kişisel +6/−8   │
└────────────────────────────────────────────────────────┘
```

Kişisel kartlar yüksek ödül/yüksek risk: NPC’yi tanımıyorsan (ilişki < 20) ters teper. Doğru kart seçimi NPC hakkında **bilgi açar**: amaç ipucu, ticaret tabanı, sır parçası.

#### 4.2 — Hediye Reworku

“Ne hediye edersen +X” ölür. NPC tercihleri doğar (meslek + kişilikten türetilir):

|NPC      |Kötü Hediye   |İyi Hediye        |Nasıl Öğrenilir|
|---------|--------------|------------------|---------------|
|Şifacı   |Şarap −4      |Nadir bitki ×3    |Sohbetten      |
|Tüccar   |El sanatı −   |Egzotik baharat ++|Dedikodudan    |
|Din adamı|Şarap/silah −8|Kitap/bağış ×2    |Doğrudan sordan|
|Asker    |Süs eşyası −  |Silah/zırh ×2.5   |Gözlemden      |

#### 4.3 — Flört & Evlilik (3 Aşamalı)

Tek zar yerine 3 aşamalı kur süreci. Her aşama 1-2 sahne eventi. Reddedilme **sebep söyler**: “Ailem tüccar istemiyor.” → çözülebilir engel = oynanış. `Marry.jsx` bu aşama mantığıyla yeniden yapılanır.

-----

### R5 — Okul

> `school.py` (1.392 satır) en olgun sistemlerden. Küçük 3 dokunuş yeter.

- **5.1 Ders İçi Anlık Karar:** Olay şansı %65 → %85. Her olaya 1 ek “cesur” seçenek (yüksek risk: hoca anısı ±). Cesur seçimler hoca hafızasına yazılır.
- **5.2 Sınıf Rekabeti:** Dönem sonu sıralaması (5 NPC sınıf arkadaşıyla). Birinciye özel event. S1 Rakip Hanedanlar’ın öncülü.
- **5.3 Arkadaşlık Kalıcılığı:** Sınıf arkadaşları yetişkinlikte geri döner. “Eski sıra arkadaşın artık vergi katibi.” S4 Sonuç Tohumları’nın ilk uygulaması.

-----

### R6 — Suç

> Bas → yakalandın/yakalanmadın devrinin sonu. Planlama + gerginlik + kaçış.

#### 6.1 — İş Seçimi & Keşif

```
Yankesicilik      → risk: DÜŞÜK    kâr: 5-15 akçe
Dükkân soyma      → risk: ORTA     kâr: 30-80 akçe
Kervan baskını    → risk: YÜKSEK   kâr: 100-300 akçe  [asistan gerekir]
Konak soygunu     → risk: KRİTİK   kâr: 500+ akçe     [plan gerekir]
```

**Keşif eylemi (opsiyonel, 1 hafta):** Hedefi izle → başarı şansı +%20 ve “kaçış planı” açılır.

#### 6.2 — İcra Sahnesi

```
[Bekçi döndü — ne yapıyorsun?]
  ● Saklan (zeka testi)       → temiz kaçış olasılığı ↑
  ○ Sustur (güç testi, nam −) → hızlı ama risk
  ○ Kaç (hız testi)           → yakalanma riski, malı bırak
```

Başarısızlık **kademeli**: temiz kaçış / görüldün (nam −, tanık NPC anısı) / yakalandın (mevcut ceza).

#### 6.3 — Sıcak Mal Ekonomisi

Çalıntı itemlar `hot: true` işaretlenir. Eritme için Gölge Eli hanedanı bağlantısı gerekir → S1 Rakip Hanedanlar ile doğrudan köprü.

-----

### R7 — Seyahat

> Yol bir mekân. Işınlanma devrinin sonu. R4 motorunu ücretsiz kullanır.

|Rota         |Süre |Risk         |Sosyal                      |Ödül           |
|-------------|-----|-------------|----------------------------|---------------|
|Ana Yol      |Yavaş|Düşük        |Han molası eventi           |Güvenli        |
|Patika       |Hızlı|Haydut + hava|—                           |Zaman kazanımı |
|Kervana Katıl|Orta |Düşük        |Yolcu sohbet eli (R4 motoru)|Ticaret fırsatı|

Yol eventi garantili (en az 1). Yolcu profili: derviş, kaçak, tüccar, asker — hepsi R4 sohbet eli motorunu kullanır → **bedavaya yeni içerik.**

-----

### R8 — Fraksiyon Yüzeyi

> `faction_system.py` (4.258 satır) oyunun en derin sistemi. UI veri döküyor, sahne sunmuyor.

- **8.1 Haftalık Fraksiyon Sahnesi:** Üyeysen haftada 1 kısa fraksiyon eventi (görev teklifi, iç çekişme, dedikodu). `Factions.jsx`’e event feed bölümü eklenir.
- **8.2 Rütbe = Somut İmtiyaz Listesi:** Her rütbenin NE verdiği tek kartta (indirim, koruma, oy hakkı).
- **8.3 Sahne Olarak Olaylar:** Darbe/koalisyon bildirimleri log satırı değil, 3-5 satırlık mini-sahne. `StoryEventFeed.jsx` bileşeni bunu karşılar.

-----

### R9 — Geri Bildirim Lezzeti

> His formülünün 3. çarpanı. Tüm oyuna yatay katman. Ucuz ama etkisi devasa.

|Özellik                    |Teknik Detay                                                      |Mevcut Bağlantı                           |
|---------------------------|------------------------------------------------------------------|------------------------------------------|
|**Sayı Animasyonları**     |Para/XP/ilişki değişimi: uçan delta +12🪙 + sayaç dönmesi. Saf CSS.|`diff_snapshots()` `game_engine.py`’da var|
|**Stat Değişim Vurgusu**   |Artış yeşil parlama 800ms, düşüş kırmızı titreme.                 |`CharacterSheet.jsx`’e CSS class sistemi  |
|**Event Kart Ritmi**       |Manşet event 150ms gecikmeli kademeli açılış: metin “düşer”.      |`StoryEventFeed.jsx` animasyon katmanı    |
|**Mikro-Metin Çeşitliliği**|Aynı sonucun 4-5 farklı cümlesi. FLAVOR_LINES her sonuca.         |`locales/tr.py` genişletmesi              |
|**Ses Kancaları**          |Şimdilik boş fonksiyon. Sonradan retrofit pahalı.                 |v5-Faz5’te doldurulur                     |

-----

## Bölüm II — Dört Omurga Sistemi

> Bölüm I zeminine oturur. Bu sistemler **ancak R1-R9 tamamlandıktan sonra** uygulanır.  
> Derinliği olmayan bir zemine oturtulan omurga yine “hissedilmez” olur.

```
                    ┌─────────────────────┐
                    │  HİKÂYE YÖNETMENİ  │  ← tempo + dramatik yay
                    └──────────┬──────────┘
         ┌────────────────────┼────────────────────┐
┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│  RAKİP          │  │  NPC ZİHNİ      │  │  SONUÇ          │
│  HANEDANLAR     │◄─┤  (hafıza+amaç)  ├─►│  TOHUMLARI      │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         └────────────────────┴────────────────────┘
```

-----

### S1 — Rakip Hanedanlar

> “Dünya senin sandbox’ın değil; aynı oyunu oynayan 6 aile daha var.”

#### Konsept

Oyun başında dünyaya **6 AI hanedanı** yerleştirilir. Her biri oyuncuyla AYNI kuralları oynar: mülk alır, evlenir, çocuk yetiştirir, fraksiyonlara girer, valilik için yarışır, ölür ve vârisle devam eder.

> ⚠️ **Fraksiyon Entegrasyonu:** 6 AI hanedanı **mevcut `faction_system.py` içinde** çalışır — paralel yeni bir sistem değil. Hanedanlar mevcut fraksiyon mekaniklerinin (koalisyon, darbe, bölge kontrolü) birinci sınıf oyuncuları olur. `world_gen.py` dünya oluştururken her hanedana NPC üyeleri, servet ve başlangıç mülkleri atar.

Sonuç: kıt kaynak rekabeti. Şehirde 4 dükkân varsa ve Karaoğlu hanedanı 3’ünü kapmışsa, oyuncu bunu HİSSEDER.

#### Veri Modeli

```python
hanedan = {
  "id":               "karaoglu",
  "ad":               "Karaoğlu",
  "sembol":           "🐺",
  "renk":             "#8B0000",
  "karakter":         "acimasiz_tuccar",   # 6 arketipten biri
  "uyeler":           [npc_id, ...],       # reis + vâris + 2-4 üye
  "reis":             npc_id,
  "servet":           4200,
  "mulkler":          [...],
  "itibar":           35,
  "oyuncuya_tutum":   -20,                 # -100..+100, olaylarla değişir
  "stratejik_hedef":  "tekel_dokuma"       # AI aktif planı
}
```

#### Hanedan Arketipleri

|Arketip            |Strateji                    |Oyuncuya Tavır                         |
|-------------------|----------------------------|---------------------------------------|
|🐺 Acımasız Tüccar  |Tekel kurma, fiyat kırma    |Rakipsen sabote, ortaksan sömürür      |
|👑 Eski Soylu       |İtibar + evlilik ittifakları|Küçümser; statün artarsa teklif eder   |
|🗡️ Gölge Eli        |Suç, şantaj, kaçakçılık     |Borçlandırır, sır toplar               |
|☪️ Dindar Hayırsever|İtibar tekeli, vakıflar     |Ahlaki baskı, ama kriz anında güvenilir|
|⚔️ Asker Ocağı      |Fraksiyon savaşları, kale   |Güce saygı, zayıflığı ezer             |
|🌱 Yükselen Köylü   |Oyuncunun aynası — sıfırdan |Doğal rakip VEYA doğal kardeş          |

#### Hanedan AI Tick’i (haftalık, hafif)

`simulation.py`’daki haftalık döngüye eklenir:

```python
# faction_system.py'deki ACTION_WEIGHTS ile aynı utility scoring mantığı
eylem_skoru = (hedefe_katki × 3) + (servet_uygunlugu) + (risk_toleransi × arketip_carpani)

HANEDAN_EYLEMLER = [
    "mulk_al", "mulk_sat",
    "evlilik_teklifi",      # oyuncuya da teklif edebilir!
    "fraksiyon_hamlesi",
    "oyuncuya_sabotaj",
    "oyuncuya_ittifak",
    "varis_yatirimi",
    "skandal_ortbas",
]
```

**Performans:** 6 hanedan × 1 eylem = haftada 6 değerlendirme. Mevcut tick’e göz ardı edilebilir yük.

#### Oyuncu-Hanedan Etkileşim Yüzeyi

- **Hanedanlar Sayfası:** 6 ailenin servet/itibar/mülk sıralaması — oyuncu KENDİNİ tabloda görür → lig tablosu psikolojisi
- **İttifak:** Ortak kervan, evlilik bağı, fraksiyon bloku
- **Düşmanlık:** Fiyat savaşı, işçi çalma, şantaj, suikast (geç oyun)
- **Nesil Sürekliliği:** Babanın düşman hanedanı, oğlunun da düşmanıdır — tutum mirası `inheritance.py`’a eklenir

> **Neden çığır?** Sandbox’taki en büyük boşluğu kapatır: **anlam.** “Neden para kazanıyorum?” → “Karaoğlu’ndan önce o hanı almak için.” İçerik yazmadan içerik üretir.

-----

### S2 — NPC Zihni

> “NPC’ler senin hakkında konuşuyor — ve unutmuyorlar.”

#### Hafıza Nesnesi

`npc_profile.push_personal_memory()` çağrılıyor ✓ — ama yapı genişletilecek:

```python
# MEVCUT: sadece düz string listesi (max 12)
npc["personal_memory"].append("oyuncu bana hakaret etti")

# HEDEF: yapısal anı nesnesi
ani = {
  "tur":          "hakaret",       # 30 anı türü
  "hedef":        "player",
  "hafta":        412,
  "duygu_yuku":   -15,             # -50..+50
  "unutma_hizi":  0.98,            # haftalık çarpan; travmalar 1.0 (asla)
  "travma":       False,
  "taniklar":     [npc_id, ...]    # dedikoduya sızabilir
}

# İlişki skoru
iliski_skoru = taban + Σ(aktif_animlarin_duygu_yuku)
```

#### Davranış Eşikleri

|Skor     |NPC Davranışı |Somut Etki                                             |
|---------|--------------|-------------------------------------------------------|
|< -40    |Aktif düşman  |Selam vermez, ticarette %20 zam, fraksiyonda aleyhte oy|
|-40 → -20|Soğuk         |Pazarlıkta kötü niyet, bilgi paylaşmaz                 |
|-20 → +20|Nötr          |Standart                                               |
|+20 → +50|Dost          |İndirim, bilgi paylaşımı                               |
|> +50    |Sadık müttefik|Zor anında yardım, sırrını saklar                      |

#### NPC Amaçları

Her NPC’ye 1 aktif amaç. Oyuncu konuştuğunda amaç sızar:

```
"Şu Demirci Hasan'ın borcunu kapatabilsem kızını isteyebilirim…"
  → Yardım et: borcu öde, ilişki +20, ileride sana borçlu
  → Sömür: bilgiyi kullan, pazarlıkta avantaj
  → Görmezden gel: NPC amacı kendi başına ilerler
```

NPC amaçları kendi kendine ilerler → köyün fakir çocuğu 10 yıl sonra tüccar.

#### Dedikodu Ağı & Nam Profili

```python
# rumors.py genişletmesi
yayilma_sansi = tanik_sayisi × olay_skandali × lokasyon_yogunlugu

# Nam profili — son 2 yılın anılarından
nam_profili = { "cömert": 42, "zalim": 12, "çapkın": 5, "dindar": 30, "mert": 28 }

# Baskın nam somut etki:
if dominant_nam == "zalim":
    korku_iskontosu = True       # insanlar senden çekiniyor
    evlilik_teklifi_ret = True   # iyi aileler reddeder

if dominant_nam == "cömert":
    kriz_halk_destegi = 0.8      # isyan anında halk seni destekler
```

`rumors.py` UI penceresi olur: “Hamamda senin için şöyle demişler…” → Yüzleş / Yay / Sustur (rüşvet).

> **Neden çığır?** Zalim koşusu vs aziz koşusu **bambaşka oyunlar** olur — sıfır yeni içerik yazılmadan.

-----

### S3 — Hikâye Yönetmeni

> “Her hayat bir roman yapısında akar: kuruluş → kriz → doruk → çözülme.”

Left 4 Dead’in AI Director’ı + Shadow of Mordor’un Nemesis’i, metin tabanlı yaşam simülasyonuna uyarlanır. `narrative_engine.py` (486 satır, şu an statik şablonlar) bu sistemi barındıracak şekilde yeniden yazılır.

#### Yönetmen Durumu

```python
yonetmen_durumu = {
  "gerilim":            42,        # 0-100
  "son_doruk_haftasi":  380,
  "aktif_yay":          "yukselis", # yükseliş|kriz|doruk|çözülme|durgun
  "nemesis_id":         "npc_2841",
  "kullanilan_kartlar": []          # tekrar önleme
}
```

#### Tempo Kuralları

|Kural                  |Mekanik                                                                                 |
|-----------------------|----------------------------------------------------------------------------------------|
|**Durgunluk Dedektörü**|8+ hafta önemli olay yoksa → bağlama uygun “kıvılcım kartı” çeker                       |
|**Nefes Kuralı**       |Büyük krizden sonra 3-5 hafta pozitif event garantisi                                   |
|**Doruk Üretimi**      |Gerilim 80’i aşınca (kızgın hanedan + kötü nam + borç) → TEK BÜYÜK EVENT                |
|**Dramaturjik Seçim**  |`_random_events` kaldırılır; yönetmen bağlam + gerilim + kullanılmış kartlara göre seçer|

#### Nemesis Sistemi

Oyuncuyu yenen / küçük düşüren NPC’ler nemesis adayı olur. Geri dönerler:

> *“Yüzündeki yara izini tanıdın. Kestane Geçidi’ndeki adam — seni soyan haydut. Beş yıl olmuş. Şimdi kervan başlarına geçiyordu.”*

Nemesis ölürse kan davası nesle geçer. Maks 1-2 aktif nemesis.

#### Hayat Romanı (Chronicle 2.0)

Yönetmen her hayatı perdelere böler. `Chronicle.jsx`: *“Bölüm III: Karaoğlu’yla Savaş Yılları”*

Ölüm sahnesi = romanın son sayfası. Paylaşılabilir özet kartı → organik pazarlama (BitLife’ın viral motoruydu).

> **Neden çığır?** Tempo sorununu çözen yaşam simi neredeyse yok. Rastgele event çorbası → kişisel dram.

-----

### S4 — Sonuç Tohumları

> “Bugün ektiğin, 10 yıl sonra kapını çalar.”

#### Tohum Nesnesi

```python
tohum = {
  "id":              "yangin_susarlik_412",
  "kaynak":          "yangin_tanikligi_sustun",
  "filizlenme": {
    "hafta_min":     200,
    "hafta_max":     600,
    "kosul":         "itibar > 50"    # isteğe bağlı
  },
  "event_id":        "gecmis_geri_doner_yangin",
  "agirlik":         "buyuk",         # yönetmen doruk üretiminde kullanır
  "nesil_asabilir":  True             # babanın tohumu, oğlu biçer
}
```

#### Temel Özellikler

- **Görünmez:** Oyuncu unuttuğunda filizlenir. En güçlü an: “BUNU HATIRLIYORLAR MIYDI?”
- **Dramaturjik:** Yönetmen tohumları rastgele değil, doruk anında patlatır
- **Nesil Aşan:** `inheritance.py`’a tohum listesi geçişi eklenir
- **Zorunlu Kural:** Yeni yazılan her büyük seçimli event en az 1 tohum tanımlamak ZORUNDA

#### Tohum Örnekleri

|Kaynak Seçim                |Filizlenme|Tetikleyici                 |
|----------------------------|----------|----------------------------|
|Bulunan parayı kestir       |8-15 yıl  |O çocuk büyümüş, sana borçlu|
|Yaralı hayvana yardım etme  |3-6 yıl   |Sahibi iş önerir            |
|Yangın şahitliğinde sus     |5-12 yıl  |Yangın kurbanı vali oldu    |
|Okul kavgasında zayıfı savun|10-20 yıl |Lonca başı oldu ve borçlu   |
|Güçlünün yanını tut         |10-20 yıl |Zayıf geri döndü — affetmedi|

-----

## Bölüm III — Entegrasyon & Yol Haritası

### Entegrasyon Haritası

|Dosya                |Mevcut Durum                                       |Yeni Omurgaya Bağlantısı                                                      |
|---------------------|---------------------------------------------------|------------------------------------------------------------------------------|
|`faction_system.py`  |4.258 satır; utility scoring var; UI’a yansımıyor  |S1 Hanedanlar bu sistemin içinde çalışır. R8 UI pompası ekler.                |
|`dialogue.py`        |1.356 satır NPC konuşma motoru                     |R4 Sohbet Eli bu temeli kullanır — sıfırdan yazılmaz                          |
|`npc_interactions.py`|11 etkileşim; `push_personal_memory()` çağrılıyor ✓|Her etkileşim → yapısal anı nesnesi (S2). Sohbet eli (R4) üstüne oturur.      |
|`npc_profile.py`     |Primitif hafıza listesi; fonksiyon çağrılıyor      |S2 NPC Zihni’nin anahtarı. Anı yapısı genişletilir, amaç sistemi eklenir.     |
|`rumors.py`          |Template var; nam profili yok                      |S2 dedikodu ağının UI’ı. Nam hesabı + tanık yayılma eklenir.                  |
|`life_events.py`     |40+ event; tohum üretmiyor                         |Her büyük seçim → zorunlu tohum. Yönetmen event etiketleme eklenir.           |
|`narrative_engine.py`|486 satır statik şablon                            |S3 Hikâye Yönetmeni burada yaşar. Büyük ölçüde yeniden yazılır.               |
|`game_engine.py`     |`diff_snapshots()`, kariyer, NPC routines          |R9 delta animasyonları doğrudan bağlanır.                                     |
|`inheritance.py`     |Para + skill geçiyor                               |Hanedan tutum mirası + tohum listesi + kan davası devri eklenir.              |
|`simulation.py`      |Haftalık tick; hanedan tick’i yok                  |Hanedan AI tick, amaç ilerleme, dedikodu yayılma, yönetmen gerilim güncelleme.|
|`quest_engine.py`    |story_arcs + story_flags mevcut                    |Yönetmen kartları bu motordan koşar. NPC amaç görevleri bağlanır.             |
|`Chronicle.jsx`      |Mevcut hayat kaydı                                 |Hayat Romanı 2.0: perdeler, bölüm başlıkları, paylaşılabilir kart.            |

-----

### Master Roadmap

Her adım çalışan bir build. Bağımlılıklar kesin.

```
ADIM 0 — v6.1 DERİNLİK REWORKU  ← ŞİMDİ
   R1 → R9 sırayla.
   His temeli kurulmadan başka hiçbir şey hissedilmez.
   Her rework = 1 çalışan build.
   Hedef: %10 → %50 oynanır olgunluk

ADIM 1 — v5-Faz1 EKONOMİ TEMELİ
   production_chains.py + property_system.py UI.
   Hanedan rekabetinin tahtası.

ADIM 2 — v6-S2 NPC ZİHNİ
   Anı yapısı genişletme + amaç sistemi + dedikodu ağı.
   R4 sohbet eli üzerine oturur.

ADIM 3 — v6-S1 RAKİP HANEDANLAR
   6 AI hanedanı, arketip sistemi, haftalık tick.
   NPC Zihni'ni kullanır. faction_system.py içinde çalışır.

ADIM 4 — v5-Faz2 QUEST MOTORU
   Yönetmen kartlarının altyapısı.
   Hikâye yayları tamamlanır.

ADIM 5 — v6-S3 HİKÂYE YÖNETMENİ + NEMESİS
   narrative_engine.py yeniden yazılır.
   Tempo sistemi + Chronicle 2.0.

ADIM 6 — v6-S4 SONUÇ TOHUMLARI
   Tohum altyapısı tüm eventlere retroaktif.
   Nesil aşan tohumlar inheritance.py'a.

ADIM 7 — v5-Faz3-7 SAVAŞ / GEÇ OYUN / MOBİL
   Savaş reworku, yaş 40+ içerik, tutorial,
   ses sistemi, i18n, offline mod, store launch.
```

-----

## Başarı Testi

> v7.0 başarılıysa, 20. saatindeki bir oyuncu şunu yazabilmeli:

-----

*“Karaoğlu hanedanı babamı iflas ettirmişti. Ben 13’ümde intikam yemini ettim. 15 yıl dükkân dükkân büyüdüm, adamlarını ayarttım, kızlarını oğlumla evlendirip içeriden çökerttim. Reisleri öldüğünde cenazesine gittim — ve oyun bana şunu yazdı: ‘Yaşlı kadın sana baktı: Baban da böyle gülerdi.’ TÜYLERİM DİKEN DİKEN OLDU.”*

-----

Bu paragrafın yazılabilmesi için:

|Anlatı Unsuru                     |Gerektiren Sistem                     |Durum      |
|----------------------------------|--------------------------------------|-----------|
|“Karaoğlu babamı iflas ettirmişti”|S1 Rakip Hanedanlar + miras           |🔴 Yapılacak|
|“13’ümde intikam yemini”          |S4 Sonuç Tohumları                    |🔴 Yapılacak|
|“Adamlarını ayarttım”             |S2 NPC Zihni + R4 Sohbet Eli          |🔴 Yapılacak|
|“İçeriden çökerttim”              |S1 + S2 + faction_system              |🔴 Yapılacak|
|“Oyun bana şunu yazdı”            |S3 Hikâye Yönetmeni + nemesis hafızası|🔴 Yapılacak|

**Bu paragraf yazılamıyorsa → hangi sistem koptu, oradan devam.**

-----

## Hedef KPI’lar (Soft Launch)

|Metrik                       |Minimum|İyi  |Hangi Sistem                  |
|-----------------------------|-------|-----|------------------------------|
|D1 Retention                 |%35    |%45  |R1 Hafta Döngüsü              |
|D7 Retention                 |%12    |%20  |S1 Hanedanlar + S2 NPC        |
|Ort. Oturum Süresi           |8 dk   |15 dk|S3 Tempo + R9 Lezzet          |
|İlk oturumda “Haftayı İlerle”|10+    |25+  |R1 + R9                       |
|Chronicle Paylaşımı          |%5     |%15  |Chronicle 2.0 (S3)            |
|Nesil Devrine Ulaşma         |%20    |%40  |S4 Tohumlar + duygusal ağırlık|

-----

## Belge Hiyerarşisi

Bu Master GDD, tüm önceki GDD’lerin üzerinde **otoriter belge** olarak geçerlidir.

- **GDD v5** — altyapı fazları (güncelliğini korur, roadmap Adım 1/4/7’de referans)
- **GDD v6.0 ÇIĞIR** → bu belgede Bölüm II olarak bütünleşik
- **GDD v6.1 DERİNLİK** → bu belgede Bölüm I olarak bütünleşik
- **Niyet Sistemi** → oyuncu kararıyla kapsam dışı (v6.1 kayıtlı)

-----

*KRONİKLER: KÜLLERİN MİRASI — Master GDD v7.0*  
*Haziran 2026*
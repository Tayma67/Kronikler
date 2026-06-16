# Tasarım Araştırması — Metin Tabanlı RPG & Yaşam Simülasyonları

> Amaç: "Kronikler: Küllerin Mirası" (Türkçe, 1247 Anadolu, çevrimdışı, tur-tabanlı,
> nesiller arası mobil yaşam-simi) yol haritasını besleyecek **kaynaklı, uygulanabilir**
> tasarım istihbaratı. 5 açıdan derin web araştırması (BitLife, Reigns, Fallen London,
> Cultist Simulator, 80 Days, Crusader Kings, Rogue Legacy, RimWorld/Dwarf Fortress + Play/ASO).
> Her bölüm: bulgular (kaynaklı) → **Kronikler için aksiyon**.

---

## 1. HİS (Game Feel) & TUTUNDURMA

**Bulgular**
- Salt swipe/karar döngüsü tek başına ~10 dk eğlendirir; **anlamı sayaçlar verir.** Reigns 4 güç göstergesiyle (kilise/halk/ordu/para) her karara ağırlık ve çok-boyutlu kayıp ekledi. ([Game Developer](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-))
- **Anlatı nedenselliği yazılı zincirden değil, filtrelemeden gelir.** Reigns durum-bağımlı bir kart "torbası" kullanır; oyuncu mekanik filtrelemeyi "hikâye" olarak okur — ucuz ama kasıtlı hisseder. ([Game Developer](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-))
- **Kriz/sakinlik ritmi**, düz zorluk eğrisinden iyidir: kriz anında torba daralır (savaş kartları), sakinlikte genişler (mizah). ([Game Developer](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-))
- **Compulsion = ödüllü taban → verimi düşür → geri dönüş yolunu hep göster → tekrar.** Net dönüş yolu yoksa frustrasyon ve churn olur. ([Game Developer](https://www.gamedeveloper.com/design/compulsion-loop-is-withdrawal-driven))
- **Değişken-oranlı (öngörülemez) ödüller** "bir tur daha"yı yaratır (Civ mekanizması). ([Wikipedia: Compulsion loop](https://en.wikipedia.org/wiki/Compulsion_loop))
- BitLife döngüsü = içerikleri yaş evresine göre açan bir **"yaşlan" butonu**; ölüm/kısa-run = tekrar oynanabilirlik özelliği. İç içe menüler friction yaratıyor (kaçın). ([Mechanics of Magic](https://mechanicsofmagic.com/2022/04/12/critical-play-competitive-analysis-on-bitlife/))
- Mobil retention ortalama: D1 ~26-28%, D7 ~8%, D30 <3%; iyi hedef D1 ≥45%, D7 ≥20%. Üst-çeyrek oturum ~7 dk. **Offline = push/LiveOps yok → döngü kendini taşımalı.** ([maf.ad](https://maf.ad/en/blog/mobile-game-retention-benchmarks/), [Business of Apps](https://www.businessofapps.com/data/mobile-game-retention-rates/))

**Kronikler için aksiyon**
1. "Ayı/Nesli İlerle"yi çekirdek döngü yap; her ilerlemeyi **görünür sayaçlarla** (itibar/hazine/güç/halk) anlamlandır.
2. Olayları **durum-bağımlı havuzdan filtrele** (yazılı zincir değil); krizde havuzu daralt, sakinlikte genişlet.
3. Birkaç turda bir **öngörülemez olay + askıda biten anlatı** (cliffhanger) koy.
4. **5-10 dk'lık, tek dokunuşla devam eden** oturumlar; offline olduğundan döngü kendi merakını üretmeli.
5. Ölüm/nesil sonu = renkli özet + sonraki nesle miras; **kayıp değil yeni başlangıç.**
6. Ana döngüyü **yan içerikle** kır (av, pazarlık, entrika); menüleri sığ tut.

---

## 2. YAZIM & ANLATI

**Bulgular**
- **Quality-Based Narrative (QBN) / storylet:** "bir-iki paragraf metin + seçim + sonuç"; sayısal nitelikler hangi storylet'in uygun olduğunu belirler. Sırasız keşfi ucuza çözer, **modüler içerik eklemeye** izin verir. ([emshort.blog](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/))
- **Salience tabanlı seçim:** her metin parçası koşullarla etiketli; motor en *spesifik* eşleşeni gösterir. Yeni özel satır eklemek eskileri bozmaz. ([emshort.blog](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/))
- **Tekrar kırma teknikleri:** rastgele liste seçimi + "sticky random" (bağlam içinde sabit), önem filtresi (her şeyi yazma), clause-combining ("Üç çocuğun da hasta"). ([emshort.blog](https://emshort.blog/2014/11/18/procedural-text-generation-in-if/))
- **Tracery:** JSON üretken gramer; iç içe semboller küçük sözlükten kombinatoryal çeşitlilik üretir; "stored assignment" ile aynı isim tutarlı kalır, ağırlıkla nadirlik ayarlanır. Derinlik (nesting) düz listeden iyi. ([Tracery, Compton & Mateas, FDG 2015](https://www.researchgate.net/publication/300137911_Tracery_An_Author-Focused_Generative_Text_Tool))
- **Ink (80 Days):** cycle/once/shuffle blokları; **yapıyı sabit tut, duyusal detayı koşula göre değiştir.** ([Game Developer](https://www.gamedeveloper.com/design/open-sourcing-80-days-narrative-scripting-language-ink))
- **Emergent:** RimWorld bir "AI Storyteller" ile dramatik tempoyu zamanlar; Dwarf Fortress'te dram simülasyon karmaşıklığından doğar. İkisinde de **NPC özerkliği** "yazılmış" hissi verir. ([Game Developer](https://www.gamedeveloper.com/design/dwarf-fortress-and-rimworld-tell-very-different-stories))
- **Failbetter sert kuralları:** kök ≤30 kelime, seçim ≤20, sonuç ≤100; "oyuncunun ağzına laf, kalbine duygu koyma" — gözlemlenebilir detay ver; dönem havası "baharat, ana malzeme değil"; klişe/anakronizm yok. ([Failbetter Writer Guidelines III](https://www.failbettergames.com/news/fallen-london-writer-guidelines-part-iii))

**Kronikler için aksiyon**
1. **Storylet/QBN mimarisi** kur: olaylar = koşul + kök + seçim + sonuç birimleri (mevcut `events.ts`/`arcs.ts` bu yöne evrilsin).
2. **Salience seçici:** varyantları (dönem/mevsim/ilişki/statü) etiketle, en spesifiği göster; jenerik varsayılan hep dursun.
3. **Tracery tarzı gramer** + **Türkçe ek/çekim modifier'ları** (ünlü uyumu, -e/-a hâli) — şablon metinleri parçala, "kilitli değişken" ile isim tutarlılığı.
4. **Ink cycle mantığı:** tekrar okunan metinlerde (hasat/hastalık/gündelik) iskelet sabit, detay değişken; "sticky random".
5. **Clause-combining + önem filtresi:** robotik tekrarı yok et; ölüm/doğum/ihanet öne, rutin arkaya.
6. **Failbetter metin kuralları** standart olsun (kelime sınırları, 2. tekil şahıs, hissi dikte etme).
7. **Director-lite + NPC özerkliği:** dramatik tempoyu zamanlayan katman + NPC niyet/ruh halinin sonucu belirlemesi (mevcut `npc_state` + `story.tension` büyütülecek).

---

## 3. DENGE & İLERLEME

**Bulgular**
- Ekonomi = **kaynak (tap) vs gider (sink)**; kaynaklar giderleri aşınca enflasyon. Sinkleri kaynak hızına göre boyutla. ([Game Developer](https://www.gamedeveloper.com/design/book-excerpt-game-economy-design-metagame-monetization-and-live-operations))
- **Pasif/idle gelir en büyük enflasyon riski** (offline'da bile birikir) → sıkı tavan + azalan getiri. Çözümler: ölçeklenen maliyet, soft cap, vergi, "converter". ([machinations.io](https://machinations.io/articles/what-is-game-economy-inflation-how-to-foresee-it-and-how-to-overcome-it-in-your-game-design))
- XP eğrileri: lineer (sabit tempo), üstel (geç oyunu yavaşlatır), logaritmik. Saf "her seviye 2×" sinir bozar; **hibrit/polinomial** daha iyi. Formül: E(L)=a·[(1−b^L)/(1−b)]. ([davideaversa.it](https://www.davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/))
- **Rogue Legacy:** ölünce altın varise geçer, kalıcı ağaç açılır — "ölüm asla boşa değil". **"Her şeyin bir trade-off'u olsun"**; zor trait'e bonus bağlayınca en popüler oldu (1 HP + büyük altın). ([Nintendo/Teddy Lee](https://www.nintendo.com/us/whatsnew/indie-world-interview-rogue-legacy-2-game-designer-teddy-lee-talks-about-the-newly-available-heir/))
- **Massive Chalice/CK3:** her varis farklı (bloodline/genetik), kalıtsal trait'ler (Genius vs hastalık) anlamlı stake; hanedanın tükenmesi = oyun sonu. Meta-ilerleme **tavanlanmalı**, yoksa permadeath dengesi bozulur. ([Game Rant CK3](https://gamerant.com/crusader-kings-3-ck3-how-choose-heir/))

**Kronikler için aksiyon**
1. **Kaynak/gider ölç & eşitle:** her gelire ölçeklenen gider; sinkleri üretim hızına göre boyutla.
2. **Pasif gelire (mülk/idle) sıkı tavan + azalan getiri;** aktif kazanç (görev/savaş/kervan) daha cömert.
3. **Para musluğu olmayan sinkler:** vergi, miras vergisi, lüks/itibar harcaması, converter.
4. **Hibrit XP eğrisi** (erken hızlı, geç yavaş), tek parametrik formülle, playtest'le ayarla.
5. **Miras = ilerleme yakıtı:** ölümde servet/itibar/bilgi kalıcı hanedan ağacına aksın.
6. **Her seçim trade-off'lu; riski ödüllendir** (kalıtsal artı/eksi trait + bonus).
7. **Varisi farklı kıl, snowball'u sınırla;** hanedanın tükenmesi gerçek oyun-sonu olsun.

---

## 4. SANAT YÖNÜ (Düşük Bütçe)

**Bulgular**
- **Tek "kart" grameri** en ucuz güçlü kimlik: Cultist Simulator her şeyi kartla anlatır; kimlik tutarlı gramerden gelir, gösterişli sanattan değil. ([Game Developer](https://www.gamedeveloper.com/design/why-the-i-cultist-simulator-i-devs-built-their-lovecraftian-game-on-a-house-of-cards))
- **İş bölümü:** ikon mekaniği, metin atmosferi anlatır; **ikon netliği çekirdek** (bozuk ikon eğlenceyi kırar). ([Thumbsticks](https://www.thumbsticks.com/interview-unseen-arts-behind-cultist-simulator/))
- **80 Days = "azaltma":** çıkarılabilen/birleştirilebilen öğeleri ara; her ekran "parlak dergi sayfası". **Kötü tipografi oyunu bozar**; metni grafik roman gibi diz. ([Vice](https://www.vice.com/en/article/5gk73d/the-makers-of-mobile-hit-80-days-on-the-importance-of-amazing-ui-852))
- **Reigns:** düz-gölgeli, ayırt edilebilir portreler + tek swipe; kısıtlama = marka. ([Wikipedia](https://en.wikipedia.org/wiki/Reigns_(video_game)))
- **game-icons.net:** 4.000+ monokrom SVG, CC BY 3.0, kasıtlı homojen; tek renge boyanır — bedava tutarlı ikon sistemi. ([game-icons.net](https://game-icons.net/about.html)) *(Kronikler bunu zaten kullanıyor.)*
- **Siluet/ahşap-baskı (woodcut)** ucuz ama ayırt edici: Fallen London yıllarca tek sanatçıyla siluetle yürüdü; woodcut tablette dijital çizilir, yüksek kontrast dark+altın paletine oturur. ([Failbetter forum](https://community.failbettergames.com/t/fls-art-direction/18264))
- **Karanlık tema tipografi (somut):** saf beyaz/siyah kullanma (#E0E0E0 / #CCCCCC); ince ağırlıktan kaçın; kontrast ≥4.5:1 gövde, ≥3:1 başlık; harf/satır aralığını aç. Gövde ≥16px, başlık ~1.3×, satır 1.3-1.5×; **en çok 2 font**. ([Design Shack](https://designshack.net/articles/typography/dark-mode-typography/), [UINkits](https://www.uinkits.com/blog-post/how-to-choose-the-right-font-pairings-for-ui-design))

**Kronikler için aksiyon**
1. **Tek kart/parşömen şablonu** (üstte ikon/portre, ortada başlık, altta metin) tüm ekranlara; gramer = marka.
2. **game-icons.net'i tüm UI'da tek altın renge** bütünle (emoji kalıntılarını kaldır); künyeye atıf yaz.
3. **2 font sınırı** (display + gövde); hiyerarşi boyut+ağırlık+renkle. Mevcut Cinzel+Crimson uygun — kontrast/aralık ayarı yap.
4. **Karanlık tema renklerini WCAG'a çek** (#E0E0E0 metin, kömür zemin; ince ağırlık yok).
5. **Portre/sahnede siluet veya woodcut stili** benimse — ucuz, tutarlı, temaya uygun.
6. **"Azaltma" disiplini:** her ekrandan öğe çıkar/birleştir; boşluk+kontrast cilayı bedavaya getirir.

---

## 5. MOBİL & YAYIN (Google Play)

**Bulgular**
- F2P mobil gelirin ~%97'si; paralı etiket no-name indie için install filtresi. ~%82 oyuncu reklamlı-ücretsizi tercih, ama %46.8 reklamdan rahatsız → **frekans kontrolü kritik**. **Ödüllü video** en etkili format (~%62 reklam geliri). ([adapty.io](https://adapty.io/blog/mobile-game-monetization/), [kevurugames](https://kevurugames.com/blog/game-monetization-statistics-in-app-purchases-ads-and-premium-models/))
- Offline tek-oyunculu için temiz model: **ücretsiz + tek seferlik "premium kilit" IAP** (reklam kaldır / tüm hikâye). Para kazanmayı **baştan tasarla** (offline'da sonradan retrofit zor). ([asomobile](https://asomobile.net/en/blog/mobile-market-money-app-monetization-in-2025/), [kevinscolaro](https://kevinscolaro.com/how-to-monetize-mobile-game-guide-indie-developer))
- **ASO (Play):** Başlık 30 / kısa 80 / uzun 4.000 karakter; Google **uzun açıklamayı indeksler** (anahtar kelime 3-5×). Dönüşüm dolaylı sıralama sinyali. **İlk 3 dikey ekran görüntüsü** = ana dönüşüm kaldıracı (Değer→Kullanım→Güven, yazı ≤%20). Feature graphic 1024×500 zorunlu. ([theionproject](https://theionproject.com/blog/google-play-aso-guide-2026/), [asomobile screenshots](https://asomobile.net/en/blog/screenshots-for-app-store-and-google-play-in-2025-a-complete-guide/))
- **Kapalı test zorunluluğu:** 13 Kasım 2023 sonrası açılan **kişisel** hesaplar için **12 test eden / kesintisiz 14 gün** opt-in; sonra "Apply for production", ~7 gün inceleme. Kurumsal hesaplar muaf. ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en))
- **Türkiye top-10 mobil pazar**; İngilizce yeterliliği orta-düşük → **Türkçe listing dönüşümü ciddi artırır**. ([42matters](https://42matters.com/turkey-app-market-statistics))

**Kronikler için aksiyon**
1. **Model:** ücretsiz + tek seferlik "premium kilit" + **yalnız ödüllü/opt-in reklam** (zorunlu interstitial yok). Para akışını baştan tasarla.
2. **12 tester / 14 gün kapalı testi ~3 hafta önceden başlat;** bu süreyi gerçek beta geri bildirimine çevir.
3. **İlk 3 ekran görüntüsü** Değer→Kullanım→Güven, dikey, yazı ≤%20; **feature graphic** (1024×500) hazırla.
4. **Uzun açıklamaya anahtar kelime** ("yaşam simülasyonu", "interaktif roman", "hanedan", "ortaçağ") 3-5× doğal geçir; kısa açıklama = reklam metni.
5. **Türkçe + İngilizce çift dilli** listing; Play A/B store-listing deneylerini kullan.
6. Oyun **veri toplamıyor** → basit gizlilik politikası + "Data safety: veri toplanmaz".

---

## ÖNCELİKLENDİRİLMİŞ SENTEZ (yol haritasına bağlama)
- **En yüksek kaldıraç (hemen, cihaz gerektirmez):** Yazım sistemini **storylet/QBN + salience + Türkçe Tracery**'ye evir; metin tekrarını kır. (Bölüm 2)
- **His:** sayaç-anlamı + havuz filtreleme + cliffhanger + ölüm-yeni-başlangıç. (Bölüm 1)
- **Denge:** pasif gelir tavanı + hibrit XP + trade-off trait + miras=yakıt. (Bölüm 3)
- **Sanat:** tek kart grameri + 2 font + WCAG dark + siluet/woodcut. (Bölüm 4)
- **Yayın:** ücretsiz+premium-kilit, 12/14 kapalı test erken, Türkçe ASO + dikey screenshot. (Bölüm 5)

*Not: Birkaç mobil-tipografi sayısı tek sayfadan değil arama özetinden; Reigns/Toptal bazı sayfaları derin-fetch'i engelledi (en zayıf kaynaklı maddeler bunlar).*
</content>
</invoke>

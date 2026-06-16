# "His" (Game Feel) Araştırması — Kronikler

> Metin/menü/kart ağırlıklı, çevrimdışı, tur-tabanlı mobil yaşam-simi için **his**.
> Aksiyon klişesi (ekran sarsma vb.) yok; incelik var. 5 açıdan kaynaklı derin araştırma
> (Swink Game Feel, Juice it or lose it, NN/g, Material Motion, Reanimated/Moti, expo-haptics,
> UI ses tasarımı, Civ/Reigns/Disco Elysium/80 Days tempo). Her bölüm → **Kronikler aksiyonu**.
> Teknik durum: projede `react-native-reanimated@4.3.1` + `expo-audio` kurulu; **expo-haptics yok** (eklenecek).

---

## 1. TEMELLER & "JUICE"
- Swink'in 3 sütunundan (gerçek-zaman kontrol, simüle uzay, **polish**) menü oyununa **yalnız polish** taşınır: animasyon/ses/parıltı, *simülasyonu değiştirmeden* etkileşimi güçlendirir. ([wikipedia](https://en.wikipedia.org/wiki/Game_feel))
- "Juice = küçük sürpriz ve haz anları"; tek olaya **katman bindirme** (hareket + görsel + ses aynı anda). ([gamedeveloper](https://www.gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-))
- **"Eylem ne kadar sıksa juice o kadar basit"; "ne zaman duracağını bil".** ([gameanalytics](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design))
- Geri bildirim **0.1–0.2 sn** içinde görünür olmalı (NN/g); buton: ~0.95 scale + yumuşak ~200ms. ([nngroup](https://www.nngroup.com/articles/response-times-3-important-limits/))
- Yavaş/strateji oyununda **temiz, bilgilendirici UI > parlak efekt**; "juice detoks" testi: efektleri söndür, çekirdek hâlâ tutuyor mu? Juice *maskelemeli değil, güçlendirmeli.* ([wayline](https://www.wayline.io/blog/the-perils-of-over-juicing))

**Kronikler:** Tek `PressableScale` bileşeni (tüm buton/kartlar); en sık eylemlere basit juice, nadir-önemli anlara (büyük seçim, ölüm, başarım) çok katmanlı; ekran sarsma/parçacık YOK — mürekkep/sayfa/altın parıltı tonunda; ayarlarda "Hareketi azalt".

## 2. ANİMASYON & MİKRO-ETKİLEŞİM (Reanimated/Moti)
- Süreler: küçük geçiş ~150–200ms, genel ~300ms, tam ekran ≤~375ms; **giren ~225ms > çıkan ~195ms** (asimetri doğal durur); >400ms yavaş hisseder. ([Material](https://m1.material.io/motion/duration-easing.html))
- Easing: giriş `cubic-bezier(0,0,0.2,1)`, çıkış `(0.4,0,1,1)`, genel `(0.4,0,0.2,1)`; **linear = mekanik**. ([Material](https://m1.material.io/motion/duration-easing.html))
- Reanimated worklet'leri UI thread'de çalışır (JS thread'i bloklamaz); Moti = Reanimated üstü deklaratif. Layout preset'leri: `FadeInUp`, `SlideInUp`… `.delay(i*step)` ile **staggered**. ([reanimated](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/), [moti](https://moti.fyi/reanimated))
- **Sayı count-up:** sharedValue + `withTiming` + `useDerivedValue` → `AnimatedTextInput.text` (UI thread'de, re-render yok). ([reanimated useDerivedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useDerivedValue/))

**Kronikler:** (a) buton onPressIn `scale 0.97` (~120ms) / onPressOut `withSpring(1)`; (b) stat değişimi (sağlık/akçe/itibar) **count-up + yeşil/kırmızı flash + `+N/−N`**; (c) günlük olay kartları `FadeInUp.delay(i*60).springify()` ile sırayla; (d) ekran geçişi giriş `FadeIn(225)`, çıkış `FadeOut(195)`; (e) tek ortak easing seti.

## 3. HAPTİK (expo-haptics)
- Apple HIG & Android: **"less is more"**; haptik *az ve anlamlı*, sık/önemsiz dokunuşa konmaz; "iyi haptik fark edilmez, kötüsü ilk kapatılan şeydir". Aynı aksiyon = aynı haptik. ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/playing-haptics), [Android](https://developer.android.com/develop/ui/views/haptics/haptics-principles))
- API: `impactAsync(Light/Medium/Heavy)`, `selectionAsync()`, `notificationAsync(Success/Warning/Error)`, Android'de `performAndroidHapticsAsync`. Asla tek sinyal olmasın (kapalı olabilir). ([expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/))

**Kronikler haptik haritası:** Ayı İlerle → `impact(Medium)` · birincil buton → `impact(Light)` · seçim/toggle → `selection` · başarım → `notification(Success)` · ölüm/yıkım → `notification(Warning)` (+ ölümde tek `Heavy`) · hata → `notification(Error)`. Sıradan gezinmede HİÇ. Ayarlarda "Titreşim" anahtarı; tek `playHaptic()` sarmalayıcı (önce ayarı kontrol et).

## 4. SES (UI/anlatı)
- Mikro-SFX **100–300ms**, içerikten kısık; sık çalan ses en kısa/yumuşak + **varyasyon** (round-robin, pitch/volume) → tekrar yorgunluğu olmaz. ([sfxengine](https://sfxengine.com/blog/best-practices-for-game-ui-sounds), [asoundeffect](https://www.asoundeffect.com/game-audio-immersion/))
- Onay = **konsonan**, hata/ölüm = **disonan**; **ducking** (önemli ses çalınca ambient'i kıs) + frekans ayrımı; SFX'leri müziğin key'ine akortla; **sessizlik bir araç**. ([sfxengine](https://sfxengine.com/blog/best-practices-for-game-ui-sounds))
- Yavaş oyunda müzik = melodisiz **drone/pulse/texture** ambient; fark edilmeden katman ekle/çıkar (Disco Elysium, Cultist Simulator/Fallen London modeli). Metin-ağır oyunlar neredeyse sessiz de çıkabilir → opt-in fark yaratır. ([daracrawford](https://daracrawford.com/audio-blog/applying-adaptive-music-to-turn-based-strategy-games))

**Kronikler:** Mevsime göre ambient drone loop (geçişte katman); tap (kısa/varyasyonlu), advance (ayrı konsonan stinger), başarım (key'e akortlu kısa ödül), ölüm (disonan + önce kısa sessizlik); ayarlarda **ayrı "Müzik" ve "SFX"** toggle. Ücretsiz: Freesound (CC), Kenney (CC0), OpenGameArt.

## 5. TEMPO & "BİR TUR DAHA" & METİN HAREKETİ
- Compulsion: her tur **küçük ödül + ufukta büyük hedef**; "bir sonraki turu tease et" (cliffhanger); ilk dakikalarda **garantili kazanım**; **tanımlı son** oyunu unutulmaz kılar. ([Sid Meier](https://www.gamedeveloper.com/game-platforms/just-one-more-turn---game-development-tips-and-tricks-from-the-creator-of-civilization-sid-meier-), [mssv](https://mssv.net/2010/08/16/one-more-turn/))
- **Staggered reveal:** sonuçları tek dökme yerine birer birer aç (modüler vignette = drama + merak boşluğu). ([modular storytelling](https://www.gamedeveloper.com/design/-i-sunless-sea-i-i-80-days-i-and-the-rise-of-modular-storytelling))
- Kilometre taşı anlarını **yükselt**, sıradanı sade tut (kontrast); ödülü **gerilimin hemen ardına** koy (mini-jackpot). ([wayline](https://www.wayline.io/blog/juice-overload-sensory-feedback-hurts-gameplay))
- Typewriter: varsayılan hızlı/anında; sadece sinematik anlara, **ayarlanabilir hız + atlanabilir**; ilk dokunuş satırı *tamamlasın*, ikincisi ilerletsin. Okunabilirlik > efekt. ([typewriter UX](https://itch.io/post/13124132))

**Kronikler:** (a) "Ayı İlerle"de olay kartları kademeli açılsın; (b) her ayın son satırı cliffhanger ("önümüzdeki ay…"); (c) ilk 2-3 ay garantili olumlu olay; (d) dönüm noktası perdesi = en yüksek katman (ışıltı+ses+haptik), gerilimden sonra; (e) doğuş/ölüm sinematiğinde **opsiyonel typewriter** (atlanabilir), oyun içi olaylarda anında metin + `FadeIn`.

---

## UYGULAMA SIRASI (his sprint'i, build gerektirmeyen kod)
1. `PressableScale` + ortak easing/motion sabitleri (`lib/motion.ts`).
2. Stat count-up + `+N/−N` flash bileşeni.
3. Dashboard olay kartlarında staggered `FadeInUp`.
4. `expo-haptics` + `playHaptic()` haritası + ayar anahtarı.
5. Ses katmanları (ambient + advance/achievement/death stinger) + ayrı toggle'lar.
6. Cliffhanger satırı + ilk-ay garantili ödül (denge/yazımla birlikte).
7. Erişilebilirlik: "Hareketi azalt", "Titreşim", "Müzik", "SFX".

*Not: Birkaç madde tek-sayfa yerine arama özetine dayanıyor; en zayıf kaynaklı yerler bunlar.*
</content>

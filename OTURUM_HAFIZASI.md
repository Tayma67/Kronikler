# Oturum Hafızası — Kronikler geliştirme penceresi

> Konuşma bağlamı sıkıştırıldığında ya da konteyner eski bir anlık görüntüye döndüğünde kaybolmasın diye tutulan
> devir notu. Yeni bir oturum önce bunu, sonra `mobile/AGENTS.md` ve `TASARIM_PUSULASI.md`'yi okur.
> Son güncelleme: 7 Ekim 2026 · dal `claude/son-durum-apk-bkyzxp` · son commit `11e8dda`.

## 1. Kullanıcının kararları (kronolojik)

- "Tam yetki veriyorum sana, oyun senin." Ardından tekrar tekrar "Devam" ve "Durma devam, incele neler
  yapılabilir bakalım": oyunu kendi başına incele, iyileştirilecek ya da düzeltilecek ne varsa yap.
- Bekleme şikâyeti ("15 dakikadır bir iş koşuyor, arka planda devam et"): smoke **her 3–4 dalgada bir**,
  **arka planda** koşulur; sonucunu beklerken oturulmaz, iş sürer.
- Yayına hazırlık incelemesi istendi; cevaptan sonra: "PEGI 12 önemli değil, 16 yaş üstü de olabilir. Biz oyunu
  geliştirmeye devam edelim." → yaş sınıfı PEGI 16 / Teen (MAGAZA.md'ye işlendi), yayın işi zorlanmaz.
- 7 Ekim: "Bu sohbet penceresindeki tüm konuşmalarımızı anımsa, hafızanı geri getir, aksilik yaşanmasın."
  → bu dosya yazıldı.

## 2. Kalıcı kurallar (kullanıcı koydu, tartışılmaz)

- Geliştirme ve push yalnız `claude/son-durum-apk-bkyzxp` dalına: `git push -u origin claude/son-durum-apk-bkyzxp`.
  (AGENTS.md'de `apk` dalı yazar; bu pencerede kullanıcının verdiği dal geçerlidir.)
- Commit mesajı **Türkçe, tek satır**, hikâye anlatan tonda. Hiçbir yerde (commit, kod, PR) imza, footer, model
  ya da araç adı yok.
- **ScheduleWakeup, cron, trigger yasak** (kalıcı). Yalnız arka plan bash zincirleri.
- Cloudflare API token'ı asla saklanmaz, yazdırılmaz, commit'lenmez.
- **APK yalnız kullanıcı açıkça isteyince.** PR yalnız istenince.
- Arayüzde emoji yok (GameIcon; ❧ ⚜ ♂ ♀ istisna). Renk ve font yalnız tema jetonlarından.
- Farm yok: para/itibar/XP veren her eylemde tur kilidi, tek seferlik iz ya da azalan getiri.
- Her yeni metin 6 dilde (tr en es pt ar ru). Oyuncuya hitapta AR/RU için `.f` (dişil oyuncu) ya da cinsiyetsiz
  kuruluş; NPC cinsine bağlı satırda `.k` (6 dilde de bulunmalı, denetçi tam anahtar sayar).
- Player/GameState'e eklenen alan opsiyonel; vâris devri `continueAsHeir` içinde açıkça taşınır,
  `heirPreview` ile paritesi korunur.
- MP paritesi: `mobile/lib/mp/protocol.ts` ↔ `server/src/protocol.ts` aynı kalır.
- Başlatılan web sunucusu kapatılır (`pkill -f sunucu.cjs`; çıkış kodu 144 normaldir).

## 3. Çalışma hattı

- Her dalgadan önce senkron bekçisi: `git fetch origin claude/son-durum-apk-bkyzxp && git status -sb`.
  Konteyner bir kez eski anlık görüntüye döndü (mobile/ klasörü yoktu, commit'lenmemiş iş kayboldu); çözüm
  `git checkout -B claude/son-durum-apk-bkyzxp origin/claude/son-durum-apk-bkyzxp` + `npm ci`. Bu yüzden
  **iş bitince hemen commit + push**.
- Hızlı denetimler (mobile/ içinden): `npx tsc --noEmit` · `node scripts/_smoke/i18n-icon-check.cjs` (TEMİZ) ·
  `dil-karisma.cjs` (TEMİZ) · `olay-metin.cjs 30` (TEMİZ) · `migrate-check.cjs` · `olu-karar.cjs` (TEMİZ) ·
  `OYN_LIVES=60 node scripts/_smoke/oynanis.cjs` (ölçütler).
- Smoke: `node scripts/_smoke/run-parallel.cjs` (~15 dk). Çalışma kopyası değişirken doğru commit'i sınamak için
  scratchpad'de ayrı bir git worktree'de (`git worktree add <yol> --detach <commit>`, node_modules sembolik bağı)
  arka planda koşulur.
- i18n anahtar ekleme: her dilin `  <dil>: {` satırındaki `"kart.swipe":` çapasının önüne; değerlerde `"` ve `\`
  yasak. Rusçada kişi adı hâli için `%1:р|в|д|т|п` işareti; hane adı "дом/домом/дома %N" ile çekilir.
  Yüzde her zaman `yuzdeL(n, lang)` ile.
- Web görsel denetim: `npm install --no-save react-dom@19.2.3 react-native-web@^0.21.2` (git ağacı temiz kalır),
  `npx expo export --platform web --output-dir <dizin>`, statik sunucu + Playwright
  (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). CanvasKit/autoplay uyarıları zararsız.

## 4. Bu pencerede yapılanlar (özet; ayrıntı `git log`)

**3–5 Ekim (önceki bağlamlar):** tasarım pusulası ve oynanış ölçütleri; açık hesaplar paneli; ilk dakikanın
sadeleşmesi; kapıdaki insan kartları (düğün, cenaze, kefalet, hakemlik, imece, can borcu, helalleşme, diyet aracısı);
dört sermaye ve yakın çember; aile ihmalinin kademeleri; borcun sebebi; tekrar ölçütü (%19,8 → %6,6); mersiye;
kadın oyuncu, kadın NPC ve dişil meslek/unvanlar için 6 dilde onlarca düzeltme; Rusça ad çekimi; tekil/çoğul;
hayatın sonu ve doğurganlık dengesi; kiler hatası; arayüzde uzun dillerde taşan yazılar.

**7 Ekim:**
- `1124928` `c59abe5` `40457e1` — Zayıf bağlar (pusula 3.8): eski tanıdık kapıya iş haberi, uzak kasabanın pazar
  haberi (kıt mal, medyan 1,6–1,7 kat fiyat) ya da bekâr oyuncuya tanıştırma getiriyor.
- `b004885` — Kan davası yerin asayişine bağlı (pusula 3.5, `asayisOf`): düşük asayişte dava ~9,6 ayda, yüksekte
  ~22,9 ayda tutuşuyor; asayiş ≥55 yerde "kadının daveti" kartı (hükme razı ol: nam +3 şeref −3, dava kapanır /
  reddet: şeref +2, ateş +6). Rusça dava satırlarında hane adları çekimli.
- `d0269e6` `2471ae4` — Rusçada 133, İspanyolca/Portekizcede 19 satıra kadın oyuncu için dişil karşılık.
- `f068c68` `df59c69` — Ölü karar denetimi (`scripts/_smoke/olu-karar.cjs`): 143 kart + 67 yay sahnesinde 34 baskın
  seçenek düzeldi. Kumar, yatırım, kervan ortaklığı, pazar söylentisi, kefil imzası artık gerçek risk
  (`risk: { taban, ticaret?, zeka?, kayip, metin }`, zar kart açılırken `riskiCoz` ile, kayıp metni
  `dil.<id>.r<i>x`). "Dile Düşen Aşk"ta nikâh isteyen bekâr oyuncu gerçekten evleniyor. Hastalık satırları sebebini
  söylüyor (mevsim, meslek, açlık); tekrar %7 → %5,7.
- `11e8dda` — Arayüzdeki sabit "%" önekleri `yuzdeL`'e bağlandı; enflasyon satırları her dilde doğru düzende.
- 31 oyun ekranı 6 dilde tarandı: çökme yok.

## 5. Son ölçümler (oynanis.cjs, 60 hayat)

Ayda pencere ~0,9 · bunalma ~%0 · açık gerilim en çok 2–3 · geri çağırma %100 · tekrar %5,7 · ölüm yaşı medyan 65 ·
15 meslek, entropi ~3,65 bit · ölü karar 0. Smoke: `40457e1` ve `f068c68` 300 hayatta HATA 0.

## 6. Açık işler ve sıradaki adaylar

- `df59c69` ve `11e8dda` için smoke sonucu (7 Ekim akşamı başlatıldı).
- Pusula 3.6 hane asabiyesi: nesiller boyunca zorlukla yükselip rahatla eriyen dayanışma; yeni gösterge eklemeden
  vâris ekranında tek cümle, vârisin başlangıcına küçük etki (süzgeç 3–4'e dikkat).
- Pusula 3.3 Mauss borç defteri (minnet/mahcubiyet) — kısmen var.
- Arapçada kadın oyuncuya şimdiki zaman/emir kipiyle eril hitap taraması (otomatik ayırt etmek zor).
- Çocukluk "babanın işi" satırı en çok yinelenenlerde; mesleğe özgü varyantlar düşünülebilir.
- Ekonomi: pasif oyuncunun parası 60 yaşta ~9.400'e çıkıyor; gerçek oyuncu verisi gelene dek dokunulmadı.
- APK ve PR yok — kullanıcı isterse.

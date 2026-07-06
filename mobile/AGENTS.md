# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Konveyör El Kitabı (devir notu — her ajan/model için bağlayıcı)

Bu oyun "dalga" (Dalga NN) adı verilen küçük, tam doğrulanmış artışlarla geliştirilir.
Aşağıdaki kurallar geçmiş oturumlarda kullanıcıyla kesinleşti; **tartışmasız uygulanır**.

## Sert kurallar

- **Yalnız `apk` dalı.** Geliştirme ve push hedefi `apk`; başka dala izinsiz push yok.
- **Commit mesajları TÜRKÇE**, tek satır, hikâye anlatır tonda. **Footer/imza/model adı/araç adı YOK** —
  commit'te, kodda, PR'da hiçbir yerde model veya araç adı geçmez.
- **Zamanlayıcı yasak:** ScheduleWakeup / cron / trigger KULLANILMAZ (kullanıcı yasağı, kalıcı).
  İzinli tek mekanizma: arka plan bash zincirleri ve bunların bitiş bildirimleri. Ek "izleyici döngüsü" de kurma.
- **Cloudflare API token'ı asla** saklanmaz/yazdırılmaz/commit'lenmez. Sunucu dağıtımı kullanıcının işi:
  `cd server && npx wrangler deploy`.
- **UI'da emoji yok** — yalnız `GameIcon` (lib/icons.tsx; 54 ikon + 34 takma ad). Süs glifleri (❧ ⚜ ♂ ♀) yerleşik istisnadır.
- **Farm yok:** para/itibar/XP veren her yeni eylem tur-kilidi (`p.X_turn === s.turn`), tek-seferlik iz
  veya azalan getiri ile kapatılır. P2W yok.
- **Her yeni metin 6 dilde:** tr en es pt ar ru. Oyuncuya hitap eden cinsiyetli satırlarda AR/RU için `.f`
  dişil varyantı YA DA cinsiyet-nötr (edilgen/nominal) kuruluş. NPC anlatımlarında nötr kuruluş tercih edilir.
- **Şema disiplini:** Player/GameState'e eklenen her alan opsiyonel + ek (eski kayıt kırılmaz).
  Vâris devri `continueAsHeir` içinde açıkça taşınır; `heirPreview` ↔ `continueAsHeir` paritesi korunur.
- **MP paritesi:** `mobile/lib/mp/protocol.ts` ↔ `server/src/protocol.ts` bayt-bayt aynı kalır.
- **Tema disiplini:** renk/font yalnız `lib/theme.ts` jetonlarından (C/F). Yeni ham hex ekleme; gerekirse jetonlaştır.

## Dalga doğrulama hattı (her game.ts değişikliğinde ZORUNLU sıra)

1. **Kuru koşu:** yama betiğini dosya kopyaları üzerinde çalıştır (anchor assert'leri patlarsa gerçek dosyaya dokunma).
2. `npx tsc --noEmit` (mobile/ içinden).
3. Bundle: `npx esbuild lib/game.ts --bundle --format=cjs --outfile=<tmp>` — **external YOK** (react dahil edilir).
4. **Hedefli sim:** değişikliğe özel node betiği; her dal/kapı/bedel/vâris-devri assert edilir.
   - Simde `p.age` ile birlikte `p.base_age` da set edilir.
   - `gainSkill` doğrudan `p.skills`'e değil `p.skill_xp[key]`'e yazar (merakli ×1.15) — assert'ler `skill_xp` üzerinde `>=` ile.
5. **Smoke:** `node scripts/_smoke/run.cjs` → "HATA: 0" şart. (~15-25 dk sürer; normaldir, asılı değildir.)
6. `node scripts/_smoke/migrate-check.cjs` (eski kayıt göçü).
7. **Checker:** `node scripts/_smoke/i18n-icon-check.cjs` → "SONUÇ: 20 sorun kategorisi" (taban; artarsa yeni sorun var demektir).
8. Depo kökünden commit + `git push -u origin apk` (ağ hatasında 2s/4s/8s/16s geri çekilmeli 5 deneme).

UI-dışı dosyalar (docs) için 2 ve 7 yeterli; game.ts'e dokunmayan UI dalgalarında smoke atlanabilir (tsc+checker şart).

## Denetim araçları (scripts/_smoke/)

- `run.cjs` — 300 hayatlık smoke.
- `migrate-check.cjs` — eski kayıt göç bekçisi.
- `i18n-icon-check.cjs` — 6 dil anahtar tamlığı + %N placeholder + kullanılan anahtar varlığı + GameIcon geçerliliği.
- `saga-fuzz.cjs` — Kül Yemini destanı düşman denetimi: 120 hanedan × ≤3 nesil rastgele seçim; değişmez ihlallerinde exit 1.
  Destana (saga) dokunan her dalgadan sonra çalıştırılır.

## APK dağıtımı

- Workflow: `android-apk-local.yml`, ref `apk` (GitHub MCP `actions_run_trigger`). Yapı ~35 dk.
- Kalıcı link: `https://github.com/Tayma67/Kronikler/releases/download/apk-latest/Kronikler.apk`
  (`apk-latest` release'inin asset'i güncellenir; link değişmez). Runner'da npm ECONNRESET görülürse geçicidir — yeniden tetikle.
- Play Store adımları kullanıcıda: keystore (YAYIN.md, alias "kronikler") + Secrets; MAGAZA.md ve SURUM-NOTLARI.md hazır.

## Büyük sistemlerin haritası (hızlı yön bulma)

- **Motor:** `lib/game.ts` (~6300 satır). Değişmez çekirdek: her eylem `clone(prev)` → mutasyon → return.
- **Kül Yemini (ana destan):** `s.saga {act, ch, scene, path, lastTurn, declined}`; `sagaTick` advance'in ay
  kapanışında; `resolveSaga` seçimleri işler; sahne panoda BEKLER (silinmez). Vârise geçer (scene temizlenir,
  declined sıfırlanır). `declined=9` = "haberi Karakuş'a sattı" sentineli (o ömürde destan kapalı).
- **Arz-talep:** NPC meslekleri → `cityProfCounts` (yıl-memolu) → `cityGoodSupply` → `supplyDemandMult` → fiyat.
  NPC yaşam tiki yılda bir (`npcLifeTick`): ölüm/doğum/murat; `npcEvo.prof` = hayaline eren NPC'nin yeni mesleği.
- **i18n:** `lib/i18n.tsx` (~4.4k anahtar × 6 dil). Yeni anahtar ekleme kalıbı: bir anchor anahtarın 6 dildeki
  konumunu bulup ters sırayla blob ekle; değerlerde `"` ve `\` yasak (assert'le).
- **Sinematik prolog:** `app/yeni-oyun.tsx` (Prolog) + `lib/prolog.tsx` (SVG sahne tabloları). Sade mod
  (`lib/perf.ts`) tüm sürekli animasyonları kapatır; <3GB RAM Android'de otomatik açılır.

# MOBİL PORT DURUMU — Kronikler (APK)

> **Oturumlar/sohbetler arası devir dosyası.** Yeni bir Claude oturumu açıldığında
> önce bunu, sonra `mobile/AGENTS.md`'yi oku. Bağlam (sohbet hafızası) kaybolsa da
> bu dosya + git geçmişi (açıklamalı commit'ler) + kod, tam durumu taşır.

Son güncelleme: 2026-06-15 · Dal: **`claude/gifted-volta-fwqcqn`** (tüm port işi buraya push'lanıyor)
Çalışma kuralı: **additif port** — Vercel'deki (`backend/`) sistemleri APK'ya (`mobile/`) ekle,
APK'da daha iyi olanı KORU. `claude-fable-5` ibaresi hiçbir commit/kod/artefakta geçmez.

## Yapı
- Vercel kaynağı: `backend/*.py` (~50 modül) + `frontend/` (React)
- Mobil hedef: `mobile/` (Expo SDK 56 / RN 0.85.3, expo-router, TS strict)
- Çekirdek: `mobile/lib/game.ts` (~2300 satır), `mobile/lib/i18n.tsx`, `mobile/lib/npc-mind.ts`,
  `mobile/lib/events.ts` (ikilemler), `mobile/lib/world.ts`, `mobile/lib/arcs.ts`
- Ekranlar: `mobile/app/oyun/*.tsx` (27 ekran)

## Komutlar (önemli)
- Typecheck: `cd mobile && npx tsc --noEmit`
- **Smoke testi** (her commit öncesi güvenlik kapısı): `cd mobile && bash scripts/smoke.sh`
  → 300 sanal hayat × tüm aksiyonlar; `HATA: 0` aranır. ~5 dk sürer (yaşayan-dünya sistemleri yüzünden).
- **APK derleme**: `cd mobile/android && /opt/gradle-8.14.3/bin/gradle assembleRelease -PreactNativeArchitectures=arm64-v8a`
  → ~60 MB (arm64-v8a tek ABI; çoklu ABI 288 MB olup GitHub 100 MB sınırını aşar). Gradle 9.x KULLANMA (IBM_SEMERU hatası), 8.14.3 kullan.
- APK'yı `dist/Kronikler.apk`'ya kopyala + commit (git'te bu yol izleniyor).
- i18n iş akışı: TR kaynağı yaz → dil başına alt-ajan (en/es/pt/ar/ru) → placeholder/anahtar doğrula → i18n.tsx'e grup ekle + 6 DICTS satırına `...GRUP.xx` ekle.

## Bu oturumda PORTLANANLAR (Vercel → APK, hepsi doğrulandı: tsc + smoke 0 hata + 6 dil)

**Önce: tam çeviri** — 6 dilde %100 anahtar kapsamı; cinsiyete duyarlı çekim (ru/ar dişil
varyantlar, `renderEvt(...,female)`); kültürel isimler; eksik 38 UI dizesi + KARİYER XP tamamlandı.

**Sonra: yaşayan dünya / "ruh" sistemleri (10 sistem):**
1. **NPC yapısal hafıza** (`lib/npc-mind.ts`, Vercel `npc_mind.py`): 34 anı türü, duygu yükü,
   haftalık decay, kalıcı travma; **`relWith(s,id) = taban + Σanı`** (effectiveRel). Sohbet/hediye/
   yardım/istismar/suç anı üretir. `NpcState.anilar`. Decay+budama `advance` tick'inde.
2. **"Seni hatırlıyor" yüzeyi**: NPC ekranında en ağır anılar kişiselleştirilmiş satırlarla (i18n `mem.remember.*`).
3. **Dedikodu ağı** (`gossipTick`): tanıklı skandallar → `s.player_rumors` (kültürel kaynak adları);
   sosyal ekranda **Yüzleş/Yay/Sustur** (`rumorAction`). i18n `rumor.*`.
4. **Sonuç tohumları** (`sowSeed`/`seedTick`/`germinateSeed`, Vercel `story_director.sow_seed`):
   `s.seeds`; yardım→velinimet (nesil aşan), istismar→intikam, ağır suç→geçmiş. Büyük tohumlar
   **doruğu bekler**. Vârise sadece `nesil:true` geçer (continueAsHeir). i18n `seed.*`.
5. **Hanedan AI** (`tickDynasties`, Vercel `dynasties.py`): hanelerin **saklanan, evrilen tutumu**
   (`RivalHouse.attitude`); düşman hane **sabotajı** (mülke gerçek zarar); dost hane **ittifak/evlilik
   teklifleri** (`s.dynastyOffers`, hanedan ekranında Kabul/Reddet → `acceptDynastyOffer`). i18n haberleri.
6. **Mülk tip-bazlı davranış**: tarla mevsimlik, dükkân refaha duyarlı, köklü ev itibar damlası (gelir tick'i).
7. **Baskın nam etkileri** (`dominant_nam`): sosyal ekranda baskın nam + etki; zalim→evlilik teklifi caydırılır (`courtBonus`).
8. **Fraksiyon haftalık sahnesi** + **8 yeni yaşam olayı ikilemi** (events.ts; çocukluk/yaşlılık). `Delta.standing` → lonca itibarı.
9. **Hikâye Yönetmeni doruğu + nefes** (`directorTick`, Vercel `story_director`): gerilim 80+ →
   tek büyük an (olgun büyük tohum dorukta biçilir / hasım doruğu / zafer / dönüm); sonra gerilim↓ + birkaç tur sakinlik (`StoryProgress.breath`). i18n `dir.*`.
10. **Çağ olayları** (`epochTick`, Vercel `legacy_system.epoch_tick`): her ~60-90 turda kalıcı kırılma
    (büyük savaş/salgın/taht/altın çağ) → `s.econ` + sancak gerilimi. i18n `epoch.*`. `s.epochNext`.
11. **İkilem→tohum bağlantısı** (`DILEMMA_SEEDS`, Vercel `LIFE_EVENT_SEEDS`): çocukluk/yaşam ikilem
    seçimleri sessiz tohum eker → yıllar/nesiller sonra dorukta biçilir (örn. çocukken savunduğun çocuk
    lonca başı olur, +100 akçe). `applyDilemma(...,seedKey)`. i18n `seed.*` (2. parti). **İmza döngüsü: ikilem+tohum+yönetmen birleşik.**
12. **İnteraktif sahne mimarisi + suç kesintisi** (`crime_rework`): `s.pendingScene` + `resolveCrimeScene`;
    yakalanmak üzereyken Saklan/Rüşvet/Kaç seçimi (suç ekranında modal). Yeniden kullanılabilir desen — okul/iş sahneleri buna eklenebilir. i18n `crimesc.*`. **Smoke runner pendingScene'i çözer.**
13. **Pazarlık blöfü** (`bargain.py`): mevcut sabır-ibreli pazarlığa "Çarşıda ucuza buldum" blöf hamlesi (pazar.tsx, yüksek risk/ödül). i18n `paz.bluff*`.
14. **Valilik döngüsü** (`city_governance.py`): meşruiyet (`Player.govLeg`, rep/şerefe göre kayar) + isyan→azil (`governorTick`) + meşruiyeti tazeleme (`shoreUpLegitimacy`); gelir meşruiyetle ölçeklenir; UI diyar/[name].tsx. i18n `gov.*`.
15. **Fraksiyon üyelik bedeli** (`FACTION_MEMBERSHIP`): ayrılınca geri dönüş yasağı (`Player.factionBans`, 26/52/156 tur tırmanır) + itibar yarılanması; `factionBanLeft`. UI orgutler.tsx. i18n `evj.facBanned`, `fac.banLeft`.
16. **Per-fraksiyon rütbe unvanları** (`FACTION_HIERARCHIES`): her loncanın kendi kademe adları (`frank.<faction>.<tier>`). UI orgutler.tsx.

## KALAN GEDİKLER (artık çoğu "basitleştirilmiş", "eksik" değil)
> Vercel'in gerçekten EKSİK sistemleri (NPC hafıza, dedikodu, tohum, hanedan AI, yönetmen, çağ,
> suç kesintisi, valilik döngüsü, fraksiyon bedeli) portlandı. Kalanlar mevcut-çalışan sistemlerin
> DERİNLEŞTİRİLMESİ — daha çok emek/UI, daha az "yok":
1. **İnteraktif sahne içeriği genişletme**: `s.pendingScene` mimarisi HAZIR (suç kesintisi kullanıyor);
   okul dersleri / iş olayları / seyahat olaylarını aynı desenle çok-seçimli yapmak. Orta-yüksek değer.
2. **Diyalog derinliği** (`dialogue.py` 1465 satır, 8 konu, 4 katman, sohbet kartları/intel) — APK 4 niyet. Büyük içerik+çeviri işi.
3. **Hikâye Yönetmeni kıvılcım kartları** (durgunlukta flavor + çocukluk seed-eken kartlar) — director'ın 3. ayağı (doruk+nefes hazır).
4. **Savaş reworku** (düşman niyet ipucu, kuşatma/turnuva çok-aşama) — APK düz dövüş çalışıyor.
5. **Üretim zincirleri / kervan gerçek-mal** — APK zanaat/kervan çalışıyor, soyut.
6. **NPC yaşam-simülasyonu** (yaşlanma/ölüm) — DİKKAT: APK'nın deterministik-lokasyon tasarımını KORU (offline için iyi).
7. Daha çok yaşam-olayı içeriği (Vercel ~130, APK ~62 ikilem).

## Notlar / tuzaklar
- Perl `-i` UTF-8'i bozuyor → i18n düzenlemelerinde Python `io.open(encoding='utf-8')` kullan.
- Smoke ~5 dk; "takıldı" sanma, yavaş. 30-50 hayatla hızlı ölçüm yapılabilir (`sed 's/i < 300/i < 30/'`).
- Çocukluk ölümü rastgele; izole motor testlerinde `s.player.dead=false; age=25; health=90` ile yetişkin kur.
- APK 100 MB sınırı → DAİMA `-PreactNativeArchitectures=arm64-v8a`.

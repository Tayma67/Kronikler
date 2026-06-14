# Çeviri Durumu (6 dil: tr/en/es/pt/ar/ru)

Tüm çeviriler `lib/i18n.tsx` içinde blok bloktur; `DICTS` her dil için blokları
`{...}` ile birleştirir. Eksik anahtar TR'ye, o da yoksa anahtarın kendine düşer
(oyun asla bozulmaz). Veri listeleri (perk/achievement/arc/dilemma/subject/...)
**id bazlı** anahtarlanır ve ekranlarda `t("blok." + id + ".alan")` ile çözülür.
Kanonik Türkçe anahtar/oyun-mantığı korunur; yalnızca **gösterim** yerelleşir.

## TAMAM (%100 yerelleşti)
- **UI chrome — tüm ekranlar:** ana menü, açılış sinematiği (NG), pano (DASH),
  alt sekmeler (TAB), karakter künyesi (CHAR), ilişkiler/meslek/şehir/hanedan/atölye (S2),
  açık işler+harita (GV), Hayatın Romanı (ROM), sosyal Mevki/Nam (SOC),
  NPC/nesil/diyar/suç/fırsat/mektep/beceri/hikaye/pazar/haberler chrome (S3),
  loncalar (FAC), çatışma (CB), karşılaşmalar (ENC), eşyalar (IT), ekran adları (SCR), misc (MISC)
- **Takvim:** 12 ay + 4 mevsim (DASH: cal.*)
- **Enumerable veri:** meslekler (locale-data PROF_L10N), yer adları (PLACE_NAMES),
  hünerler/perks (PERK, 24), başarımlar (ACH, 42), dersler (S3 subj.*),
  yatırımlar+vasiyetler (S3 inv./will.), seyahat rotaları (S3 route.*),
  suçlar (S3 crime.*), sohbet niyetleri+ruh halleri (S3 dlg.*),
  ikilemler (DIL, 15 — başlık/metin/seçim/sonuç, seçim anında yerelleşir)
- **Hikâye yayları:** yalnız **başlık + tanıtım** (ARC, 8) — listeler/başlık/görev

## KALAN (hâlâ Türkçe — sıradaki turlar)
1. **Hikâye yayı aşama metinleri** (arcs.ts): her arc'ın stage.text + choice.label +
   choice.result. ~8 arc × ~2-3 aşama × ~2 seçim. Plan: `arc.<id>.<stageId>.x/.c<i>/.r<i>`
   anahtarları; `hikayeler.tsx` stage.text/choice'ları t() ile çözer; sonuç için
   `advanceArc`'a opsiyonel yerel-sonuç parametresi (dilemma deseniyle aynı).
2. **Dünya anlatısı (lore.ts):** worldNews başlık/gövde (rumors zaten lang alıyor),
   şehir tasvirleri (world.ts cityInfo blurb/governor), localSpecialty adları,
   NPC trait/quirk/goal (world.ts üretilen kişilik metinleri).
3. **Diyalog prozası (dialogue.ts converse):** NPC sohbet cümleleri — kişilik/ruh
   hali/ilişkiye göre dallanan üretken metin (en zoru; trait'lere bağlı).
4. **Saklanan günlük/kronik satırları:** game.ts içindeki ~76 `push(s, tip, "Türkçe metin")`
   çağrısı sonucu `history`'ye **düz metin** olarak yazılıyor; sonradan dil değişse de
   eski kayıt o dilde kalır. Tam yerelleşme için ya (a) lang'i oyun mantığına geçirmek
   ya da (b) push'u key+param olarak saklayıp gösterimde çevirmek gerekir — **mimari
   karar + büyük refaktör**; cihazda test edilemediği için riskli. Kullanıcıya danışılmalı.

## Yapı notları
- Yeni blok ekle → `lib/i18n.tsx`'te const tanımla → `DICTS`'in 6 diline `...BLOK.xx` ekle.
- Her batch sonrası: `npx tsc --noEmit` + `npx expo export --platform android` ile doğrula.
- APK: `npx expo prebuild --platform android` → `cd android && ./gradlew :app:assembleRelease --no-daemon`
  (gradle 8.14.3 pinli; ANDROID_HOME=/opt/android-sdk, JAVA_HOME java'dan türetilir).

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

## TAMAM (ek — sonraki turlarda eklendi)
- **Hikâye yayları:** 8 yayın TÜM aşama metinleri + seçimleri + sonuçları (ARCP); `advanceArc`
  opsiyonel yerel sonuç/bitiş etiketi alır.
- **İkilemler:** 15 ikilemin tamamı seçim anında yerel (DIL).
- **Dünya haberleri + dedikodular** (NEWS): worldNews(lang), yer adı placeName, bey unvanı; gossip.*
- **NPC kişilikleri** (locale-data traitL/quirkL/goalL): huy/tuhaflık/hedef + meslek.
- **Diyalog (converse)** (DLG2): NPC sohbet cümleleri — talkWith(lang).
- **Şehir detayı** (CITY): vali unvanı, tasvir, geçim uzmanlığı — cityInfo(lang).
- **Günlük altyapısı (key+param)**: `GameEvent.k/.p`, `push(...loc)`, `applyParams`; pano/kronik/roman
  `e.k ? applyParams(t(e.k), e.p) : e.text` ile gösterir. **Geriye dönük uyumlu** — eski kayıt/çevirisiz
  satır TR text yedeğine düşer; save migration YOK.
- **Günlük satırları (EV bloğu)**: beceri seviye atlama (ev.su.*), çocukluk (ev.cocukluk), mektep
  dersleri (ev.study.*) — 6 dilde.

## KALAN (sıradaki turlar)
1. **Kalan günlük/kronik satırları** (game.ts ~70 push): EV deseniyle çevrilecek.
   - Param'sız / sayısal olanlar kolay: `push(..., {k, p:[sayı]})`.
   - **İsim/ünvan/eşya** içerenler (work→careerTitleL, eat→item, ölüm/doğum→isim):
     param dilden-bağımsız id/sayı saklanmalı, **gösterimde** çözülmeli (örn. work: p=[professionId,
     careerXpThen, earn] → ekranda careerTitleL ile). Bunun için pano/kronik/roman resolver'ına
     anahtar-bazlı özel çözüm (item/title) eklenebilir; veya o param'lar için "it:"/"prof:" ön-eki
     konvansiyonu. Karışık-dil olmaması için TOPLU bitirmek tercih edilir.
2. Şehir/rakip hanedan adları (world.ts HOUSE_NAMES), AD/SOYAD havuzları — özel ad; çevrilmez.

## Yapı notları
- Yeni blok ekle → `lib/i18n.tsx`'te const tanımla → `DICTS`'in 6 diline `...BLOK.xx` ekle.
- Her batch sonrası: `npx tsc --noEmit` + `npx expo export --platform android` ile doğrula.
- APK: `npx expo prebuild --platform android` → `cd android && ./gradlew :app:assembleRelease --no-daemon`
  (gradle 8.14.3 pinli; ANDROID_HOME=/opt/android-sdk, JAVA_HOME java'dan türetilir).

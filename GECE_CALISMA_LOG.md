# 🌙 Gece Çalışma Günlüğü — Kronikler

> Patron uyurken (~10 saat) stüdyo edasıyla otonom çalışma kaydı.
> Kural: **mevcut sistemi bozma, üzerine ekle.** Her iş → test → ayrı commit → push
> (`claude/gifted-volta-fwqcqn`). Main'e dokunulmadı.

Başlangıç: 2026-06-12 21:05 UTC · Baseline: 58 birim testi yeşil ✅

## Stüdyo Yaklaşımı
Yapımcı-yönetmen (ben) işi sıraya koyar; uzman "departman" ajanları paralel
**analiz** yapar (salt-okunur, çakışma yok); uygulamayı ben sıralı yaparım.

Departmanlar:
- 🎨 **Sanat Yönetmeni / UX-Mobil** — kargaşa, mobil yerleşim, tema tutarlılığı
- 🧹 **Kod Hijyeni** — ölü kod, tema sapmaları, tekrar
- ✍️ **Yazı/İçerik** — Türkçe metin tonu, yazım, kısalık
- ⚖️ **Denge** — ANALIZ_RAPORU §4 açık maddeler
- 🧪 **QA** — testleri yeşil tut, kapsama ekle

## Hedef Kalite Çıtası
"Mobil oyuncu açar açmaz 'vay be' der; ekranda boğulmaz; her dokunuş cevap verir;
yazılar sahici ve Türkçe; tek bir tutarlı Kül & Köz estetiği."

---

## İş Günlüğü

### [21:05] Kuruluş
- Görsel üretimi tamamlandı (önceki iş): 37 varlık + ikon, 0 hata, push'landı.
- pytest + mongomock kuruldu; baseline 58/58 yeşil.
- Gerçek tasarım sistemi tespit edildi: `index.css` "Kül & Köz" altın/parşömen
  (CSS değişkenleri + legacy Tailwind köprüsü). `design_guidelines.json` ESKİ —
  referans olarak yaşayan sistem alınacak.
- Departman analiz ajanları başlatıldı.
- Araç: esbuild (tek başına, node_modules'sız) JSX söz-dizimi denetleyici kuruldu →
  `/tmp/jsxcheck.sh`. Baseline: 106/106 frontend dosyası söz dizimi temiz ✅.

### [21:20] Departman raporları geldi (2 paralel ajan)
**Kod Hijyeni:** ölü kod (.bak, SkillTree, Quests/FamilyQuests, Login/Register),
`Kit.jsx` bileşen kütüphanesi var (Coin/Panel/Pill/PageHeader/Stat), tema sapmaları,
`Coin` simge tutarsızlığı. **UX/Mobil:** en büyük sapma NPCDetail (Kit'siz, ham renk
gökkuşağı, native window.confirm); köprü dışı `emerald/red/purple/amber-900` shade'leri;
CityDetail mobil dokunma hedefleri; Recharts neon renkleri. Tam backlog ajanlarda.

### [21:25] ✅ İŞ 1: Zaman-modeli tutarlılığı (GameLayout.jsx)
Tespit: Kanonik gerçek "1 tur = 1 AY" (Zaman Reformu, calendar_tr.py WEEKS_PER_MONTH=1).
Dashboard buna uygun ("AYI İLERLE") ama GameLayout eski "hafta" modelini sızdırıyordu.
Düzeltmeler:
- Kenar çubuğu butonları: "BİR HAFTA İLERLE" → "BİR AY İLERLE"; ikinci buton
  advance(4)/"BİR AY" → advance(3)/"BİR MEVSİM İLERLE" (3 ay = 1 mevsim, tema uyumlu).
- Toast: `${weeks} hafta geçti` → `${weeks} ay geçti`.
- Mobil header butonu: "HAFTA" → "AY".
- Kenar takvimi: her zaman "1. Hafta" yazan anlamsız satır kaldırıldı (week_in_month
  reform sonrası daima 1) → sadece mevsim gösteriyor.
Doğrulama: jsxcheck ✓. Risk: yok (saf etiket/sabit; backend doğru, dokunulmadı).

### [21:40] ✅ İŞ 2: Tema köprüsü genişletmesi (index.css) — global kazanç
Her iki ajanın da #1 önerdiği "tek dosyada onlarca ekranı hizala" işi. Sapma
sayımı: text-red-400 (45×), text-emerald-400 (30×), zinc/amber/sky/purple ham
shade'leri palet dışı neon basıyordu. Yaklaşım: ajanların "kırmızıyı altına ez"
önerisi REDDEDİLDİ — kırmızı anlamlı (zarar). Bunun yerine ham Tailwind renkleri
temanın kendi anlamsal tokenlarına eşlendi (anlam korunur, hue temaya oturur):
- Yeni CSS değişkenleri (Kit.jsx TONES ile tek kaynak): --color-blood/sage/ember/
  ink/azure/rose.
- Metin: red/rose→blood, emerald/green→sage, purple→ink, sky/blue→azure,
  pink→rose, amber-200/300→gold-bright, amber-500→ember, zinc/slate→parşömen.
- Zemin: solid dolgular→temalı solid; ince tonlar (opacity son ekli)→temalı ince ton.
- Kenar: red/emerald/purple/orange tonlu kenarlar→temalı.
Doğrulama: esbuild CSS ✓. Risk: düşük — kanıtlanmış köprü kalıbının (text-stone-*→
parchment) genişletilmesi; sadece off-palette hue düzeltir, layout/anlam değişmez.
NOT: Sayfa-bazlı derin Kit migrasyonu (NPCDetail vb.) ayrıca yapılacak; bu köprü
zemini global olarak temizliyor.

### [22:05] ✅ İŞ 3: NPCDetail — en çok ziyaret edilen sayfanın disiplini
Her iki ajanın da #1 sapma kaynağı dediği sayfa. Köprü zaten renkleri global
temizledi; üstüne iki cerrahi düzeltme:
- **Menü renk disiplini**: 7 farklı çiğ hue (pink/emerald/orange/rose/yellow/red-600)
  → 3 anlamlı ton: sıradan eylemler GOLD, romantik (flört/evlilik) ROSE, tehlikeli
  (hakaret/saldır/dedikodu/kaçır) BLOOD, çıkış nötr. "Kargaşasız" hedefine uygun.
- **Native window.confirm → temalı ConfirmModal**: saldır/kaçır onayları artık
  ham tarayıcı penceresi değil; ModalShell tabanlı, blood-kırmızı "Vazgeç/Onayla"
  kartı + sahici Türkçe uyarı metni. Mobil şaheser hissini kıran #1 ucuzluk gitti.
Doğrulama: jsxcheck ✓. Risk: düşük (renk dizesi + izole modal).
Keşif: Trade/Properties/Legacy/Factions'ta 4 native window.confirm + GameContext'te
ham alert() daha var → paylaşımlı Kit ConfirmModal'a taşınacak (sıradaki).

### [22:35] ✅ İŞ 4: Tüm native popup'lar → tek temalı ConfirmModal
Kullanıcı uyandığında oyunda HİÇBİR yerde ham tarayıcı penceresi görmesin diye:
- `Kit.jsx`'e kanonik `<ConfirmModal>` eklendi (card-frame + köz scrim + ton seçimi).
- Taşınanlar (hepsi "doer+opener" deseniyle, genel ad korunarak — minimal blast):
  · Trade: kervan dağıt · Properties: mülk sat · Legacy: taht iddiası · Factions: isyan
- GameContext'teki ham `alert()` (oyun kurulum hatası) → `toast.error`.
- Onay metinleri sahici Türkçeye çevrildi (kuru "emin misin?" değil, sonucu anlatan).
Doğrulama: jsxcheck 106/106 ✓. Native dialog kalmadı (grep temiz). Risk: düşük
(her dönüşüm izole, mantık korundu, sadece tetikleme akışı modal'a sarıldı).

### [22:55] ✅ İŞ 5: CityDetail pazar grafiği palete çekildi
Recharts neon turuncu/yeşil/mor çizgiler → palet uyumlu + anlamsal (et=kan,
demir=çelik, kumaş=mor boya, silah=köz). Eksen/tooltip/legend temalı. X ekseni
ham "T{tur}" yerine YIL (1 tur=1 ay tutarlı). Para ⚜. Risk: düşük (izole).

### [23:00] ✅ İŞ 6: Para birimi simgesi tek tip (⚜)
HUD'da 'A', Dynasties/KarakterEkrani'nda 🪙 vardı; tasarım sistemi ⚜ kullanıyor.
Hepsi ⚜'ye hizalandı. Risk: yok (simge değişimi).

### [23:05] ✅ İŞ 7: Ölü kod + DEPRECATED işareti
İki import edilmeyen .bak silindi (git'te korunur). design_guidelines.json eski
spec; başına _DEPRECATED + gerçek kaynak (index.css/Kit.jsx) notu. Risk: yok.

### [23:10] ✅ İŞ 8: rise-in animasyonu CANLANDI (33 sayfa)
KRİTİK BULGU: `.rise-in` 33 dosyada kullanılıyor ama CSS tanımı YOKTU → tüm
uygulamadaki sayfa/kart giriş animasyonu hiç çalışmıyordu. Guidelines'ın
"subtle fade-in" hedefi tanımlanıp canlandırıldı (mount'ta bir kez,
prefers-reduced-motion'da kapanır). Risk: yok (saf eklenti). Etki: her ekran
artık nazikçe beliriyor — "yaşayan, cilalı" his. Bedava şaheser dokunuşu.

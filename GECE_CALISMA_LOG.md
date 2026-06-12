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

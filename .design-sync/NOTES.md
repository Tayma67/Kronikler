# design-sync notları — Kronikler / Kül & Köz

- Bu repo bir UYGULAMA (CRA oyunu); tasarım sistemi senkron için
  `frontend/ds-kit/` paketine çıkarıldı (Kit.jsx + Gorsel.jsx re-export).
  Storybook YOK → shape: package.
- Build: paket içinde `npm run build` (esbuild, react external,
  jsx=automatic) → dist/index.js. Kök yarn.lock'a dokunma; paketin
  bağımlılığı yok, esbuild npx ile yeter.
- styles.css uygulamanın index.css'inden TÜRETİLMİŞTİR (token :root +
  bileşen sınıfları + keyframes). Kaynak gerçeği frontend/src/index.css —
  oradaki değişiklikten sonra styles.css tazelenmeli.
- Bileşenler: PageHeader, Panel, Stat, Pill, GoldRule, EmptyState, Coin,
  TONES (+ Portre/Arma görsel köprüleri — resim dosyaları yoksa emoji'ye
  düşerler, beklenen davranış).
- Provider/wrapper GEREKMEZ; tema tamamen CSS token + sınıflarından gelir.
  Fontlar styles.css'in Google Fonts @import'undan (Cinzel + Crimson Text).
- DİL: arayüz Türkçe; 1 tur = 1 AY ("hafta" kelimesi yasak).
- DesignSync aracı uzak ortam oturumunda yoktu (2026-06-12) — proje
  oluşturma/yükleme araçlı bir oturumda yapılacak. projectId henüz YOK.

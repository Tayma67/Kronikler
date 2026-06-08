# Kronikler — v29 Adım 30

## Bu Adımda Yapılanlar — Kriz Olayları Frontend Entegrasyonu

### Backend (game_routes.py)
- `PINNED_TYPES`'a `kriz_kuraklik`, `kriz_veba`, `kriz_yangin` eklendi → WorldNews'te görünür
- `/game/advance` yanıtına `crisis_events` eklendi: o turda tetiklenen kriz olaylarını döner

### Frontend — GameContext.jsx
- `lastCrisisEvents` state eklendi
- advance() fonksiyonunda `data.crisis_events` yakalanıp state'e yazılıyor
- `clearCrisisEvents` context'e eklendi

### Frontend — Dashboard.jsx
- advance sonrası `crisis_events` varsa `toast.error()` ile bildirim gösteriliyor
- Emoji + açıklamalı format: `☀️ Kuraklık`, `💀 Veba`, `🔥 Yangın`

### Frontend — WorldNews.jsx
- `CAT_CONFIG`'e `kriz` kategorisi eklendi (kırmızı tema)
- `TYPE_ICON`'a `kriz_kuraklik`, `kriz_veba`, `kriz_yangin` ikon eşlemeleri eklendi
- `FILTER_OPTIONS`'a `🔥 Kriz` filtre butonu eklendi
- `resolveCategory()` ve `KRIZ_BASLIK` yardımcıları eklendi
- `CrisisBanner` komponenti: aktif kriz olaylarını renkli kart olarak gösterir
- Sayfa başına `CrisisBanner` entegre edildi — pinned_events içinden kriz olayları ayrıştırılıp render edilir

## Sonraki Adım: Adım 31
Nüfus (nufus) frontend gösterimi — CityDetail ve WorldMap'te nüfus sayaçları, kriz sonrası nüfus değişimi log gösterimi.

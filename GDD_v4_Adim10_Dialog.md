# Kronikler: Küllerin Mirası — GDD v4.5 (Adım 10) ✅
## Dialog Derinleştirme — Tamamlandı

---

## YAPILAN DEĞİŞİKLİKLER

### backend/dialogue.py — Tam Refactor (v1 → v2)

**4 Katman aktif:**

| Katman | Fonksiyon | Durum |
|--------|-----------|-------|
| Pool Genişletme | GREETING_BY_BAND (12-15 entry), PROFESSION_TALK (10-12 entry/meslek), MOOD_LINE_POOL (6-8 entry/duygu) | ✅ |
| Bağlam Enjeksiyonu | `_build_context()` | ✅ |
| Hafıza Geri Dönüşü | `_memory_callback()` | ✅ |
| NPC İnisiyatifi | `_spontaneous_line()` | ✅ |
| Oyuncu Farkındalığı | `_player_aware_flavor()` | ✅ |

**generate_response() artık `(response_text, proactive_line)` tuple döndürüyor.**

Pool büyüklükleri:
- GREETING_BY_BAND: 5 band × 8-12 entry = ~50 karşılama varyasyonu
- PROFESSION_TALK: 19 meslek × 6-11 entry = ~180 iş cevabı
- MOOD_LINE_POOL: 8 ruh hali × 4-6 entry = ~40 duygu flavoru
- SEASON_OPENERS: 4 mevsim × 3 entry = 12 mevsimsel açılış
- PLAYER_PROFESSION_CALLBACKS: 12 çapraz meslek kombinasyonu

### backend/game_routes.py — /chat endpoint

`generate_response()` çıktısı artık unpack ediliyor:
```python
response, proactive = generate_response(...)
```

Return'e yeni field'lar eklendi:
- `proactive`: NPC spontan açılış satırı (null olabilir)  
- `last_topic`: Bir önceki konuşma konusu (frontend memory hint için)

### frontend/src/pages/NPCDetail.jsx — ChatModal

**7A — Proactive Line Gösterimi:**
- Proactive satır ayrı baloncuk olarak gösteriliyor (amber/italic stil)
- "✦ NPC bir şey söylemek istiyor" başlığı ile

**7B — Memory Hint:**
- `lastTopic` state'i ile son konuşulan topic takip ediliyor
- NPC hafızasından sayfa açılışında otomatik yükleniyor
- İlgili topic butonuna `↩` işareti ve amber vurgusu ekleniyor

---

## GDD ANA TABLOSU

| # | Adım | Durum |
|---|------|-------|
| 1 | Temel Sistem | ✅ Bitti |
| 2 | NPC Profil Sistemi | ✅ Bitti |
| 3 | Dünya Olayları | ✅ Bitti |
| 4 | Ticaret Sistemi | ✅ Bitti |
| 5 | Savaş Sistemi | ✅ Bitti |
| 6 | Sosyal İtibar | ✅ Bitti |
| 7 | Fraksiyon Sistemi | ✅ Bitti |
| 8 | Okul/Vasıf | ✅ Bitti |
| 9 | Yaşam Olayları | ✅ Bitti |
| **10** | **Dialog Derinleştirme** | ✅ **Bitti** |

---

*GDD v4.5.1 — Dialog Derinleştirme | Adım 10*
*Proje: Kronikler: Küllerin Mirası*

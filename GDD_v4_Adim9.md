# Kronikler: Küllerin Mirası — GDD v4 (Adım 9)

### Yeni Oturum İçin Süreklilik Belgesi

> **Yeni Claude oturumu açtıysan:** Bu dosyayı baştan oku.

-----

## DEVAM NOKTASI

**Son tamamlanan:** Adım 9 — Dünya Olayları & Siyasi Krizler (Dashboard entegrasyonu)  
**Sıradaki:** **Adım 10** — TBD (Faction Savaşları / Miras Derin Sistemi / Çocuk Oyun Modu)

-----

## 1. OYUN KİMLİĞİ

|Alan            |Değer                                              |
|----------------|---------------------------------------------------|
|Ad              |Kronikler: Küllerin Mirası                         |
|Tür             |Türkçe, mobil-öncelikli, kalıcı-dünya RPG          |
|Stack           |React + TailwindCSS + Shadcn UI / FastAPI + MongoDB|
|Test kullanıcısı|test@k.com / test123                               |
|1 tur           |1 hafta                                            |

-----

## 2. MİMARİ — MEVCUT DOSYALAR

### Backend

|Dosya              |Ne Yapar                        |Durum                         |
|-------------------|--------------------------------|------------------------------|
|`simulation.py`    |`advance_time()` — haftalık tick|✅ Kervan tick + world event   |
|`game_engine.py`   |`check_state_triggers()`        |✅ Dokunulmadı                 |
|`game_routes.py`   |Tüm API endpointleri            |✅ `new_world_events` eklendi  |
|`life_events.py`   |100 event sistemi               |✅ Adım 5B-3                   |
|`inheritance.py`   |Nesil devri motoru              |✅ Adım 7                      |
|`caravan.py`       |Kervan motoru                   |✅ Adım 8A+8B                  |
|`world_events.py`  |Dünya olayları motoru           |✅ Adım 9 (zaten vardı)        |
|`world_gen.py`     |Dünya + Player üretimi          |❌ Dokunma                     |
|`faction_system.py`|Faction motoru                  |❌ Dokunma                     |

### Frontend Değişen Dosyalar (9)

|Dosya                |Değişiklik                                              |
|---------------------|--------------------------------------------------------|
|`lib/GameContext.jsx`|`lastWorldEvent` state + `clearWorldEvent` eklendi      |
|`pages/Dashboard.jsx`|`WorldEventBanner` bileşeni + world event toast eklendi |
|`pages/WorldNews.jsx`|Değişmedi (zaten tamamdı)                               |

-----

## 3. DÜNYA OLAYLARI SİSTEMİ — TAMAMLANDI (Adım 9)

### 3.1 Event Akışı (tam)

```
advance() çağrısı
  → simulation.py: tick_world_events() — her 4 haftada generate_world_event()
  → game_routes.py /advance: new_world_events (bu turda started_day==turn olanlar)
  → GameContext.advance(): setLastWorldEvent(new_world_events[0])
  → Dashboard.jsx:
      - toast.info/error → olay duyurusu
      - WorldEventBanner → state.world_events'den aktif tehlike/doğa olayları
  → WorldNews.jsx: /game/world-news → tüm olay geçmişi + aktif liste
```

### 3.2 WorldEventBanner — İçerik

- Sadece `tehlike` + `doğa` kategorisi VEYA kritik tipler gösterilir
  (`savaş_ilanı`, `salgın_hastalık`, `kuraklık`, `büyük_yangın`)
- Her card: kategori ikonu, headline, lokasyon, kalan gün
- Dashboard'da durum uyarılarından önce render edilir

### 3.3 Toast Tipleri

| Kategori | Toast |
|----------|-------|
| tehlike  | `toast.error` — kırmızı |
| diğer    | `toast.info` — mavi |

### 3.4 Backend — `/advance` Response Eki

```json
{
  "new_world_events": [
    {
      "id": "...",
      "type": "kuraklık",
      "category": "doğa",
      "headline": "Büyük Kuraklık Başladı",
      "detail": "...",
      "effects": ["Buğday fiyatı +%30", "Tarım geliri -%20"],
      "location_id": "...",
      "location_name": "Konya",
      "started_day": 12,
      "ends_day": 96,
      "active": true
    }
  ]
}
```

### 3.5 Dünya Olay Tipleri (world_events.py)

```python
WORLD_EVENT_TYPES = [
    "kuraklık",           # Gıda fiyatları artar, tarım geliri düşer
    "bereketli_hasat",    # Gıda bolluğu, çiftçi geliri artar
    "büyük_yangın",       # Servet & güvenlik kaybı
    "salgın_hastalık",    # NPC sağlık kaybı, refah düşer
    "haydut_saldırıları", # Güvenlik düşer, kervan riski artar
    "asker_toplama",      # Silah talebi artar
    "ticaret_patlaması",  # Tüm mal talebi artar
    "yeni_maden",         # Ekonomi boost
    "festival",           # Fiyatlar düşer, mutluluk artar
    "dini_kutlama",       # Sosyal boost
    "soylu_düğünü",       # Sosyal etkinlik
    "göç_dalgası",        # Demografik değişim
    "ünlü_ölümü",         # Haber, etki yok
]
```

-----

## 4. KERVAN SİSTEMİ — REFERANS (8A–8D)

### 4.1 Backend Endpointleri

```
POST /game/caravan/create
GET  /game/caravan/status
POST /game/caravan/disband
GET  /game/caravan/history
GET  /game/caravan/pending-event
```

### 4.2 advance → caravan_event response formatı

```json
{
  "caravan_event": {
    "type": "attack" | "caravan_destroyed" | "arrived",
    "profit": 0.0,
    "lost_value": 0.0,
    "profit_detail": { ... },
    "trade_xp": 3
  }
}
```

-----

## 5. GÜNCEL YOL HARİTASI

|Adım  |Özellik                                 |Durum         |
|------|----------------------------------------|--------------|
|1–7   |[Önceki adımlar]                        |✅ Bitti       |
|8A    |Kervan backend — caravan.py + 4 endpoint|✅ Bitti       |
|8B    |pending_caravan_event + advance entegr. |✅ Bitti       |
|8C    |Trade.jsx Kervan sekmesi                |✅ Bitti       |
|8D    |CaravanResultModal + event bus          |✅ Bitti       |
|**9** |**Dünya Olayları Dashboard entegrasyonu**|✅ **Bitti**  |
|**10**|**TBD**                                 |🔄 **Sıradaki**|

-----

## 6. TASARIM İLKELERİ (Değişmez)

1. Sandbox, sebep-sonuç görünür, 1 tur = 1 hafta
2. Türkçe öncelik, Mobil öncelik
3. Çocukluk önemli (7–12 yaş kısıtlı)

-----

*GDD v4.5 — Dünya Olayları Sistemi Tamamlandı | Adım 9 ✅*  
*Proje: Kronikler: Küllerin Mirası*

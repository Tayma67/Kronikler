# Kronikler: Küllerin Mirası — GDD v4 (Adım 8C)

### Yeni Oturum İçin Süreklilik Belgesi

> **Yeni Claude oturumu açtıysan:** Bu dosyayı baştan oku.

---

## DEVAM NOKTASI

**Son tamamlanan:** Adım 8C — Trade.jsx kervan sekmesi + caravan_event toast entegrasyonu  
**Sıradaki:** **Adım 8D** — Kervan sonuç modalı + GDD/ZIP final

---

## 1. OYUN KİMLİĞİ

| Alan             | Değer                                               |
|------------------|-----------------------------------------------------|
| Ad               | Kronikler: Küllerin Mirası                          |
| Tür              | Türkçe, mobil-öncelikli, kalıcı-dünya RPG           |
| Stack            | React + TailwindCSS + Shadcn UI / FastAPI + MongoDB |
| Test kullanıcısı | test@k.com / test123                                |
| 1 tur            | 1 hafta                                             |

---

## 2. MİMARİ — MEVCUT DOSYALAR

### Backend

| Dosya               | Ne Yapar                         | Durum                          |
|---------------------|----------------------------------|--------------------------------|
| `simulation.py`     | `advance_time()` — haftalık tick | ✅ Kervan tick + pending event  |
| `game_engine.py`    | `check_state_triggers()`         | ✅ Dokunulmadı                  |
| `game_routes.py`    | Tüm API endpointleri             | ✅ 5 kervan endpointi + advance |
| `life_events.py`    | 100 event sistemi                | ✅ Adım 5B-3                    |
| `inheritance.py`    | Nesil devri motoru               | ✅ Adım 7                       |
| `caravan.py`        | Kervan motoru                    | ✅ Adım 8A+8B                   |
| `world_gen.py`      | Dünya + Player üretimi           | ❌ Dokunma                      |
| `faction_system.py` | Faction motoru                   | ❌ Dokunma                      |

### Frontend Sayfaları

| Dosya           | Durum                                |
|-----------------|--------------------------------------|
| Dashboard.jsx   | ✅ caravan_event toast eklendi (8C)   |
| Trade.jsx       | ✅ Kervan sekmesi tamamlandı (8C)     |
| Diğer sayfalar  | ✅ Değişmedi                          |

---

## 3. KERVAN SİSTEMİ — TAM DURUM (8A + 8B + 8C)

### 3.1 Kervan Veri Modeli (Backend — değişmedi)

```python
state["active_caravan"] = {
    "id": str,
    "goods": { good: {"qty": int, "buy_price": float} },
    "cash_on_hand": float,
    "origin_id": str,   "origin_name": str,
    "destination_id": str,   "destination_name": str,
    "route": [loc_id, ...],
    "current_step": int,
    "status": "traveling"|"arrived"|"attacked"|"disbanded",
    "attack_events": [],
    "started_turn": int,
    "arrived_turn": int|None,
    "profit": float|None,
    "profit_detail": {},
}
state["caravan_history"] = [...]
state["pending_caravan_event"] = dict|None
```

### 3.2 Backend Endpointleri (Değişmedi)

```
POST /game/caravan/create
GET  /game/caravan/status
POST /game/caravan/disband
GET  /game/caravan/history
GET  /game/caravan/pending-event
```

### 3.3 advance → caravan_event (8B'de eklendi, 8C'de consume edildi)

`POST /game/advance` döndürür:
```json
{
  "caravan_event": {
    "type": "attack"|"caravan_destroyed"|"arrived",
    "summary": str,
    "profit": float,        // sadece arrived'da
    "lost_value": float,    // sadece attack'ta
    "profit_detail": {}     // sadece arrived'da
  }
}
```

Dashboard.jsx artık bu event'i alıp toast gösteriyor:
- `arrived` → `🚛 Kervanın hedefe ulaştı! Kâr: +X.XA` (success, 5sn)
- `attack`  → `⚔️ Kervanın saldırıya uğradı! Kayıp: X.XA` (error, 5sn)
- `caravan_destroyed` → `💀 Kervanın tamamen yağmalandı!` (error, 6sn)

### 3.4 Trade.jsx Kervan Sekmesi (8C — yeni)

**Bileşenler:**
- `CaravanStatusCard` — aktif kervan: rota, progress bar, kargo özeti, saldırı log, dağıt butonu
- `CaravanCreateForm` — hedef seçimi, mal seçimi, nakit, özet, başlat butonu
- `CaravanHistory` — collapse, son 5 kervan, kâr/zarar badge
- Tab switcher — `Pazar` | `Kervan` sekmeleri

---

## 4. GÜNCEL YOL HARİTASI

| Adım   | Özellik                                    | Durum            |
|--------|--------------------------------------------|------------------|
| 1–7    | [Önceki adımlar]                           | ✅ Bitti          |
| 8A     | Kervan backend — caravan.py + 4 endpoint   | ✅ Bitti          |
| 8B     | pending_caravan_event + advance entegr.    | ✅ Bitti          |
| **8C** | **Trade.jsx Kervan sekmesi**               | ✅ **Bitti**      |
| **8D** | **Kervan sonuç modalı + GDD/ZIP final**    | 🔄 **Sıradaki**  |
| 9      | Dünya olayları & siyasi krizler            | ⏳ Sonraki        |

---

## 5. ADIM 8D PLANI — Kervan Sonuç Modalı

**Amaç:** Kervan "arrived" veya "attacked" durumuna geldiğinde zengin bir modal göster.

**Dosya:** `frontend/src/pages/Trade.jsx` (mevcut, mevcut CaravanStatusCard'a ek)

**Değişiklikler:**

### 5.1 CaravanResultModal (yeni bileşen)
- Trigger: `caravanStatus.caravan.status === "arrived"` veya `"attacked"`
- arrived içeriği:
  - Başlık: "Kervan Ulaştı! ✓"
  - Kâr özeti tablosu: her mal için `alış × qty → satış fiyatı → kâr`
  - Toplam kâr, Trade XP kazanımı
  - "Harika!" kapat butonu
- attacked içeriği:
  - Başlık: "Kervan Saldırıya Uğradı ⚔️"
  - Kayıp listesi
  - Kalan mallar (eğer varsa)
  - "Tamam" kapat butonu

### 5.2 pending-event endpoint poll (opsiyonel)
- Trade sekmesi açıldığında `GET /game/caravan/pending-event` çek
- Event varsa → modal göster → okundu (endpoint zaten temizliyor)

**İlgili API:**
```js
api.get('/game/caravan/pending-event')  // { event: dict|null }
```

---

## 6. TASARIM İLKELERİ (Değişmez)

1. Sandbox, sebep-sonuç görünür, 1 tur = 1 hafta
2. Türkçe öncelik, Mobil öncelik
3. Çocukluk önemli (7–12 yaş kısıtlı)

---

*GDD v4.3 — Kervan Sistemi 8C | Adım 8C ✅*  
*Proje: Kronikler: Küllerin Mirası*

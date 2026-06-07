# Kronikler: Küllerin Mirası — GDD v4 (Adım 8B)

### Yeni Oturum İçin Süreklilik Belgesi

> **Yeni Claude oturumu açtıysan:** Bu dosyayı baştan oku.

---

## DEVAM NOKTASI

**Son tamamlanan:** Adım 8B — pending_caravan_event akışı + advance entegrasyonu
**Sıradaki:** **Adım 8C** — Frontend: Trade.jsx Kervan sekmesi (kurma formu + durum kartı)

---

## 1. OYUN KİMLİĞİ

|Alan            |Değer                                              |
|----------------|---------------------------------------------------|
|Ad              |Kronikler: Küllerin Mirası                         |
|Tür             |Türkçe, mobil-öncelikli, kalıcı-dünya RPG          |
|Stack           |React + TailwindCSS + Shadcn UI / FastAPI + MongoDB|
|Test kullanıcısı|test@k.com / test123                               |
|1 tur           |1 hafta                                            |

---

## 2. MİMARİ — MEVCUT DOSYALAR

### Backend

|Dosya              |Ne Yapar                                    |Durum                         |
|-------------------|--------------------------------------------|------------------------------|
|`simulation.py`    |`advance_time()` — haftalık tick            |✅ Kervan tick + pending event |
|`game_engine.py`   |`check_state_triggers()`                    |✅ Dokunulmadı                |
|`game_routes.py`   |Tüm API endpointleri                        |✅ 5 kervan endpointi + advance|
|`life_events.py`   |100 event sistemi                           |✅ Adım 5B-3                  |
|`inheritance.py`   |Nesil devri motoru                          |✅ Adım 7                     |
|`caravan.py`       |Kervan motoru                               |✅ **Adım 8A+8B**             |
|`world_gen.py`     |Dünya + Player üretimi                      |❌ Dokunma                    |
|`faction_system.py`|Faction motoru                              |❌ Dokunma                    |

### Frontend Sayfaları (Tamamı ✅)

Dashboard, Factions, CharacterSheet, NPCDetail, NPCList, WorldMap,
CityDetail, School, Opportunities, Chronicle, Profession, Quests,
Inventory, Relationships, WorldNews, SkillTree, InheritanceScreen,
Battle, Rumors, Social, Marry, StatAllocate, **Trade** (kervan 8C'de),
Crime, TownFeed, Generation

---

## 3. KERVAN SİSTEMİ — TAM DURUM (8A + 8B)

### 3.1 Kervan Veri Modeli

```python
state["active_caravan"] = {
    "id": str,
    "goods": { good: {"qty": int, "buy_price": float} },
    "cash_on_hand": float,
    "origin_id": str,   "origin_name": str,
    "destination_id": str,   "destination_name": str,
    "route": [loc_id, ...],      # origin → [0-2 ara] → destination
    "current_step": int,          # 0 = origin
    "status": "traveling"|"arrived"|"attacked"|"disbanded",
    "attack_events": [],
    "started_turn": int,
    "arrived_turn": int|None,
    "profit": float|None,
    "profit_detail": {},
}
state["caravan_history"] = [...]         # son 20 kervan
state["pending_caravan_event"] = dict|None
```

### 3.2 Tüm Backend Endpointleri (Tamamlanan)

```
POST /game/caravan/create
  Body: { destination_id, goods: {good: qty}, cash_on_hand }
  → { success, caravan, route_names, total_steps, state }

GET  /game/caravan/status
  → { active, caravan, current_location_name, route_names,
      steps_completed, total_steps, steps_remaining, progress_pct }

POST /game/caravan/disband
  → { success, recovered_goods, cash_returned, state }

GET  /game/caravan/history
  → { history: [...son 20 kervan] }

GET  /game/caravan/pending-event      ← 8B'de eklendi
  → { event: dict|null }
  event.type: "attack"|"caravan_destroyed"|"arrived"
  (event'i okuyunca temizler)
```

### 3.3 advance Endpoint Güncellemesi (8B)

`POST /game/advance` artık şunu da döndürür:
```json
{
  "caravan_event": {
    "type": "attack"|"caravan_destroyed"|"arrived",
    "summary": str,
    "profit": float,          // sadece arrived'da
    "lost_value": float,      // sadece attack'ta
    "profit_detail": {...}    // sadece arrived'da
  }
}
```
`caravan_event` yoksa response'ta bulunmaz (null değil, key yok).

### 3.4 Oyun Mekaniği Özeti

| Konu | Değer |
|------|-------|
| Rota uzunluğu | 1-3 adım (şehir arası = +1-2 ara nokta) |
| Her adım | 1 hafta |
| Kargo limiti | 200 birim toplam |
| Minimum yaş | 13 |
| Saldırı şansı (baz) | %12/adım |
| Saldırı faktörleri | crime/reputation/faction_war/trade_skill |
| Saldırı sonucu | Güç+Dövüş → %10-%90 kayıp |
| Kâr hesabı | dest.piyasa × sell_mult − alış_fiyatı |
| Trade XP | kâr/20 (min 1) |

---

## 4. GÜNCEL YOL HARİTASI

|Adım |Özellik                                     |Durum         |
|-----|--------------------------------------------|--------------|
|1-7  |[Önceki adımlar]                            |✅ Bitti       |
|8A   |Kervan backend — caravan.py + 4 endpoint    |✅ Bitti       |
|**8B**|**pending_caravan_event + advance entegr.**|✅ **Bitti**  |
|**8C**|**Trade.jsx Kervan sekmesi**               |🔄 **Sıradaki**|
|**8D**|**Rota gösterimi + sonuç + GDD/ZIP final** |⏳ Sonraki    |
|9    |Dünya olayları & siyasi krizler             |⏳ Sonraki    |

---

## 5. ADIM 8C PLANI — Frontend Kervan Sekmesi

**Dosya:** `frontend/src/pages/Trade.jsx` (mevcut 15KB)

**Değişiklikler:**
- Sayfa başına 2 sekme: `Pazar` (mevcut) | `Kervan` (yeni)
- Kervan sekmesi içeriği:
  1. **Aktif Kervan Kartı** (varsa): progress bar, rota, durum badge, Dağıt butonu
  2. **Kervan Kur Formu** (aktif kervan yoksa):
     - Hedef şehir seçimi (dropdown)
     - Mal seçimi (envanterdeki mallar, qty slider)
     - Nakit ekleme input
     - Özet (tahmini kâr marjı, toplam adım)
     - "Kervanı Başlat" butonu
  3. **Kervan Geçmişi** (collapse): son 5 kervan, kâr/zarar badge
- `caravan_event` hook'u: advance sonrası toast notification

**İlgili API çağrıları:**
```js
api.get('/game/caravan/status')
api.post('/game/caravan/create', { destination_id, goods, cash_on_hand })
api.post('/game/caravan/disband')
api.get('/game/caravan/history')
```

---

## 6. TASARIM İLKELERİ (Değişmez)

1. Sandbox, sebep-sonuç görünür, 1 tur = 1 hafta
2. Türkçe öncelik, Mobil öncelik
3. Çocukluk önemli (7-12 yaş kısıtlı)

---

*GDD v4.2 — Kervan Sistemi 8B | Adım 8B ✅*
*Proje: Kronikler: Küllerin Mirası*

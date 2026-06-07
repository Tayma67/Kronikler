# Kronikler: Küllerin Mirası — GDD v4 (Adım 8A)

### Yeni Oturum İçin Süreklilik Belgesi

> **Yeni Claude oturumu açtıysan:** Bu dosyayı baştan oku.

---

## DEVAM NOKTASI

**Son tamamlanan:** Adım 8A — Kervan Backend Temel (caravan.py + endpointler)
**Sıradaki:** **Adım 8B** — Backend: Haftalık tick entegrasyonu (zaten eklendi) + pending_caravan_event endpointi + saldırı detayları
**Sonraki:** **Adım 8C** — Frontend: Trade.jsx'e Kervan sekmesi

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

## 2. PLAYER MODEL (Gerçek Kod)

```python
player = {
    "name": str, "gender": "erkek"|"kadın", "age": int, "base_age": 7,
    "money": float, "profession": str, "education": str,
    "reputation": int, "honor": int, "fear": int, "fame": int,
    "health": int, "hunger": int, "crime": int,
    "location_id": str, "kingdom_id": str,
    "spouse_id": str|None, "children_ids": [], "parent_ids": [anne_id, baba_id],
    "inventory": {}, "equipment": {weapon, head, body, hands, legs, feet},
    "wanted_in": [],
    "stats": {strength, intelligence, charisma, stamina},
    "skills": {combat, trade, crafting, social},
    "buffs": {}, "dead": bool,
}
```

---

## 3. MİMARİ — MEVCUT DOSYALAR

### Backend

|Dosya              |Ne Yapar                                    |Durum                         |
|-------------------|--------------------------------------------|------------------------------|
|`simulation.py`    |`advance_time()` — haftalık tick            |✅ Kervan tick hook eklendi    |
|`game_engine.py`   |`check_state_triggers()` — koşul kontrolleri|✅ Dokunulmadı                |
|`game_routes.py`   |Tüm API endpointleri                        |✅ 4 yeni kervan endpointi    |
|`life_events.py`   |100 event, koşul & etki sistemi             |✅ Adım 5B-3'te güncellendi   |
|`inheritance.py`   |Nesil devri motoru                          |✅ Adım 7'de güncellendi      |
|`caravan.py`       |**YENİ** — Kervan motoru                   |✅ **Adım 8A'da eklendi**     |
|`world_gen.py`     |Dünya + Player üretimi                      |❌ Dokunma                    |
|`faction_system.py`|Faction motoru (~2600 satır)                |❌ Dokunma                    |
|`dialogue.py`      |NPC diyalog sistemi                         |❌ Dokunma                    |
|`school.py`        |Okul sistemi                                |❌ Dokunma                    |
|`family_quests.py` |Aile questleri                              |❌ Dokunma                    |
|`world_events.py`  |Dünya olayları                              |❌ Dokunma                    |

### Frontend Sayfaları (Tamamı ✅)

Dashboard, Factions, CharacterSheet, NPCDetail, NPCList, WorldMap,
CityDetail, School, Opportunities, Chronicle, Profession, Quests,
Inventory, Relationships, WorldNews, SkillTree, InheritanceScreen,
Battle, Rumors, Social, Marry, StatAllocate, **Trade** (kervan sekmesi 8C'de gelecek),
Crime, TownFeed, Generation

---

## 4. KERVAN & TİCARET ROTASI SİSTEMİ (Adım 8) 🔄

### 4.1 Adım Planı

|Alt Adım|İçerik                                         |Durum         |
|--------|-----------------------------------------------|--------------|
|**8A**  |caravan.py + 4 endpoint (create/status/disband/history)|✅ **Bitti**|
|**8B**  |pending_caravan_event endpoint + test           |🔄 **Sıradaki**|
|**8C**  |Trade.jsx Kervan sekmesi (kurma + durum)        |⏳ Sonraki    |
|**8D**  |Rota gösterimi + sonuç ekranı + GDD/ZIP final   |⏳ Sonraki    |

### 4.2 Kervan Veri Modeli (state["active_caravan"])

```python
{
    "id": str,                   # 8 karakter UUID
    "goods": {                   # taşınan mallar
        good: {
            "qty": int,
            "buy_price": float,  # alış fiyatı (kâr hesabı için)
        }
    },
    "cash_on_hand": float,       # kervanın yanındaki nakit
    "origin_id": str,
    "origin_name": str,
    "destination_id": str,
    "destination_name": str,
    "route": [loc_id, ...],      # origin → [ara] → destination
    "current_step": int,          # 0 = origin
    "status": "traveling"|"arrived"|"attacked"|"disbanded",
    "attack_events": [],
    "started_turn": int,
    "arrived_turn": int|None,
    "profit": float|None,
    "profit_detail": {},         # good → {qty, buy_price, sell_price, revenue, cost, margin}
}
```

### 4.3 State Yeni Alanları

```python
state["active_caravan"] = dict|None
state["caravan_history"] = [...]         # son 20 kervan
state["pending_caravan_event"] = dict|None  # haftalık tick sonrası UI eventi
```

### 4.4 Backend Endpointleri (8A'da tamamlanan)

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
```

### 4.5 Oyun Mekaniği

- **Rota:** origin → [0-2 ara şehir] → destination (her adım = 1 hafta)
- **Saldırı şansı:** %12 baz, crime/reputation/faction_war/trade_skill ile ±değişim
- **Saldırı sonucu:** Güç & Dövüş becerisine göre kısmi/tam kayıp
- **Varış kârı:** destination piyasa fiyatı × sell_mult − alış fiyatı
- **Trade skill XP:** Kâr/Zarar'a göre otomatik
- **Kargo limiti:** 200 birim

### 4.6 Saldırı Şansı Formülü

```
base = 0.12
+ 0.05 if crime > 50
+ 0.05 if crime > 80
- 0.04 if reputation > 60
- 0.03 if reputation > 80
+ 0.08 if faction_war_active
- 0.03 if trade_skill >= 30
- 0.03 if trade_skill >= 60
result = clamp(0.03, 0.40)
```

---

## 5. FACTION SAVAŞ SİSTEMİ (Adım 6) ✅

### Endpointler

```
GET  /game/factions/wars/detail
POST /game/factions/wars/participate  → { strategy }
POST /game/factions/wars/avoid
```

### Strateji Mekanikleri

|Strateji|ATK Çarpanı|DEF Çarpanı|Özellik             |
|--------|-----------|-----------|--------------------|
|Saldır  |×1.35      |×0.70      |Yüksek risk/ödül    |
|Savun   |×0.70      |×1.45      |Düşük risk, yıpratma|
|Kaç     |—          |—          |İtibar -5, Onur -5  |

---

## 6. ÇOCUK & NESİL SİSTEMİ (Adım 7) ✅

### Endpointler

```
POST /game/children/invest         → { child_id, investment_type }
POST /game/children/set_profession → { child_id, profession }
GET  /game/inheritance/options     → { options, inherited_money, inherited_stats, ... }
```

---

## 7. GÜNCEL YOL HARİTASI

|Adım |Özellik                                     |Durum         |
|-----|--------------------------------------------|--------------|
|1-7  |[Önceki adımlar]                            |✅ Bitti       |
|**8A**|**Kervan backend — caravan.py + endpointler**|✅ **Bitti**  |
|**8B**|**Kervan tick endpoint + pending event**    |🔄 **Sıradaki**|
|**8C**|**Trade.jsx Kervan sekmesi**                |⏳ Sonraki    |
|**8D**|**Rota gösterimi + sonuç + GDD/ZIP**        |⏳ Sonraki    |
|9    |Dünya olayları & siyasi krizler             |⏳ Sonraki    |

---

## 8. ADIM 8B PLANI

**Hedef:** `pending_caravan_event` için endpoint + basit unit testleri

- `GET /game/caravan/pending-event` → `{ event, state }` + event'i temizle
- `caravan.py` içinde ek test senaryosu (saldırı testi)

**İlgili dosyalar:**
- `backend/game_routes.py` → yeni `/caravan/pending-event` endpoint
- `backend/caravan.py` → saldırı test fonksiyonu

---

## 9. TASARIM İLKELERİ (Değişmez)

1. **Sandbox:** Oyuncu istediğini yapabilir — ama her eylemin sonucu var.
2. **Sebep-sonuç görünür:** Her şey history'ye log'lanır.
3. **Zaman hissi:** 1 tur = 1 hafta. Mevsimler gerçek.
4. **Türkçe öncelik:** UI, diyalog, event tamamen Türkçe.
5. **Mobil öncelik:** Büyük dokunma hedefleri.
6. **Çocukluk önemli:** 7-12 yaş kısıtlı ama anlamsız değil.

---

*GDD v4.1 — Kervan Sistemi 8A | Adım 8A ✅*
*Proje: Kronikler: Küllerin Mirası*

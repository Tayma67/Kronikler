# Kronikler: Küllerin Mirası — GDD v4 (Adım 8D)

### Yeni Oturum İçin Süreklilik Belgesi

> **Yeni Claude oturumu açtıysan:** Bu dosyayı baştan oku.

---

## DEVAM NOKTASI

**Son tamamlanan:** Adım 8D — CaravanResultModal + GameContext event bus  
**Sıradaki:** **Adım 9** — Dünya Olayları & Siyasi Krizler

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

### Frontend Değişen Dosyalar (8D)

| Dosya                     | Değişiklik                                     |
|---------------------------|------------------------------------------------|
| `lib/GameContext.jsx`     | `lastCaravanEvent` state + `clearCaravanEvent` |
| `pages/Trade.jsx`         | `CaravanResultModal` bileşeni eklendi          |
| `pages/Dashboard.jsx`     | caravan_event toast (8C'den, değişmedi)        |

---

## 3. KERVAN SİSTEMİ — TAMAMLANDI (8A–8D)

### 3.1 Event Akışı (tam)

```
advance() çağrısı
  → GameContext.advance() → data.caravan_event varsa setLastCaravanEvent()
  → Dashboard.jsx: toast göster (🚛 / ⚔️ / 💀)
  → Trade.jsx (açıksa): lastCaravanEvent → setResultEvent → CaravanResultModal açılır

Trade/Kervan tab açılınca:
  → fetchCaravanStatus() + GET /game/caravan/pending-event
  → pending event varsa → CaravanResultModal açılır
```

### 3.2 CaravanResultModal — İçerik

**arrived:**
- Satış özeti tablosu: `mal × qty | alışFiyatı → satışFiyatı | kâr`
- Toplam kâr (Akçe)
- Trade XP kazanımı
- "Harika! 🎉" butonu

**attack:**
- Hasar raporu (toplam kayıp)
- Kalan mallar (varsa)
- "Tamam" butonu

**caravan_destroyed:**
- Toplam kayıp
- Tüm mallar alındı mesajı
- "Tamam" butonu

### 3.3 Backend Endpointleri (Değişmedi)

```
POST /game/caravan/create
GET  /game/caravan/status
POST /game/caravan/disband
GET  /game/caravan/history
GET  /game/caravan/pending-event
```

### 3.4 advance → caravan_event response formatı

```json
{
  "caravan_event": {
    "type": "attack" | "caravan_destroyed" | "arrived",
    "summary": "string",
    "profit": 0.0,
    "lost_value": 0.0,
    "profit_detail": {
      "buğday": { "qty": 10, "buy_price": 5.0, "sell_price": 7.2, "profit": 22.0 }
    },
    "remaining_goods": { "buğday": 5 },
    "trade_xp": 3
  }
}
```

---

## 4. GÜNCEL YOL HARİTASI

| Adım   | Özellik                                     | Durum            |
|--------|---------------------------------------------|------------------|
| 1–7    | [Önceki adımlar]                            | ✅ Bitti          |
| 8A     | Kervan backend — caravan.py + 4 endpoint    | ✅ Bitti          |
| 8B     | pending_caravan_event + advance entegr.     | ✅ Bitti          |
| 8C     | Trade.jsx Kervan sekmesi                    | ✅ Bitti          |
| **8D** | **CaravanResultModal + event bus**          | ✅ **Bitti**      |
| **9**  | **Dünya Olayları & Siyasi Krizler**         | 🔄 **Sıradaki**  |

---

## 5. ADIM 9 PLANI — Dünya Olayları & Siyasi Krizler

### 5.1 Hedef
Dünya dinamik olsun: krallıklar savaşa girer, ticaret yolları kapanır,
veba yayılır, hasat başarısız olur.

### 5.2 Backend: `world_events.py` (yeni / genişletme)

```python
WORLD_EVENT_TYPES = [
    "war_declaration",       # İki krallık savaşa giriyor
    "plague",                # Şehirde veba — nüfus/üretim düşer
    "drought",               # Hasatta başarısız — fiyatlar artar
    "trade_boom",            # Ticaret patlaması — pazar aktifleşir
    "bandit_surge",          # Eşkıya artışı — kervan riski +%20
    "political_crisis",      # Kral değişiyor / darbe
    "festival",              # Şehirde festival — fiyatlar düşer
]
```

**Her advance_time()'da:**
- %15 şans ile 1 dünya olayı tetikle
- Olay 1-4 hafta sürer
- `state["world_events"]` listesinde sakla
- Kervan + pazar fiyatlarına etki et

### 5.3 Frontend: `WorldNews.jsx` güncellemesi
- Aktif dünya olaylarını kart olarak listele
- Süre göstergesi (kaç hafta daha)
- Fiyat etkisi badge'i (🔴 +%30 / 🟢 -%15)

### 5.4 Frontend: Dashboard entegrasyonu
- Aktif kritik olay varsa Dashboard'da uyarı banner

---

## 6. TASARIM İLKELERİ (Değişmez)

1. Sandbox, sebep-sonuç görünür, 1 tur = 1 hafta
2. Türkçe öncelik, Mobil öncelik
3. Çocukluk önemli (7–12 yaş kısıtlı)

---

*GDD v4.4 — Kervan Sistemi Tamamlandı | Adım 8D ✅*  
*Proje: Kronikler: Küllerin Mirası*

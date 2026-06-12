# PROJE DURUMU — Kronikler: Küllerin Mirası

> Bu dosya oturumlar/hesaplar arası devir içindir. Yeni bir Claude oturumu
> açıldığında önce bunu, sonra `KRONIKLER GDD v7 MASTER.md`'yi oku.
> **Her oturum sonunda bu dosyayı güncelle ve `main`'e push et.**

Son güncelleme: 2026-06-12 · Branch: `main` (doğrudan main'e push ediliyor — Vercel)

## Roadmap Durumu (GDD v7 Master Roadmap)

| Adım | Sistem | Durum | Ana dosyalar |
|---|---|---|---|
| 0 | R1–R9 Derinlik Reworku | ✅ TAMAM | work_rework, bargain, conversation, school, crime_rework, travel_rework, faction_surface |
| 1 | v5-Faz1 Ekonomi Temeli | ✅ TAMAM (doğrulandı) | production_chains, property_system |
| 2 | v6-S2 NPC Zihni | ✅ TAMAM | **npc_mind.py** |
| 3 | v6-S1 Rakip Hanedanlar | ✅ TAMAM | **dynasties.py** |
| 4 | v5-Faz2 Quest Motoru | ✅ TAMAM (önceden vardı) | quest_engine, story_arcs, story_routes |
| 5 | v6-S3 Hikâye Yönetmeni + Nemesis | ✅ TAMAM | **story_director.py** |
| 6 | v6-S4 Sonuç Tohumları | ✅ TAMAM (çekirdek + retroaktif geçiş) | story_director.py (sow_seed, LIFE_EVENT_SEEDS) |
| 7 | v5-Faz3-7 Savaş / Geç Oyun / Mobil / i18n / Store | 🟡 KISMEN | Savaş reworku zaten v7 standardında (combat_engine: duruş+kart+yaralanma); 40+ içerik var (life_events_v2); tutorial var (ilk_yil arc). Kalan: mobil paketleme, ses, i18n tamamlama, offline, store launch — lansman kalemleri |

## Bu Oturumda Yapılanlar (özet)

- **S2 NPC Zihni** (`npc_mind.py`): 30+ türlü yapısal anı nesnesi
  (duygu_yuku/unutma_hizi/travma/taniklar), haftalık decay, travmalar kalıcı.
  İlişki = taban + Σanı. 5 kademeli davranış eşiği (aktif düşman → sadık).
  Amaç eylemleri (Yardım Et / Sömür). Dedikodu ağı → `state["player_rumors"]`.
  Nam profili (cömert/zalim/çapkın/dindar/mert) + baskın nam etkileri.
  Söylenti eylemleri: Yüzleş / Yay / Sustur (rüşvet).
- **S1 Rakip Hanedanlar** (`dynasties.py`): 6 arketip hanedan, haftalık tek
  eylemli utility-AI, KIT mülk slotları (buy_property engeli), veraset/sönme,
  ittifak & evlilik teklifleri, tutum mirası (inheritance), tutum reisin
  zihninden beslenir (S2 köprüsü).
- **S3 Yönetmen** (`story_director.py`): gerilim 0-100, durgunluk dedektörü
  (kıvılcım kartları), nefes kuralı, doruk üretimi (gerilim 80+),
  dramaturjik life-event süzgeci, Nemesis (kan davası nesle geçer),
  perdeler (Chronicle 2.0), ölüm sahnesi = `final_page()`.
- **S4 Tohumlar** (story_director içinde): `sow_seed` çerçevesi, büyük
  tohumlar doruğu bekler, nesil aşma, `LIFE_EVENT_SEEDS` retroaktif haritası
  (bulunan para, yaralı hayvan, okul kavgası, yangın, hasat) + suç tanığı
  ve amaç yardımı tohumları.

## Yeni API Rotaları

- `GET /api/game/hanedanlar` · `POST /api/game/hanedanlar/teklif`
  · `POST /api/game/hanedanlar/{id}/yakinlasma`
- `POST /api/game/npc/{id}/amac` (yardim|somur)
- `GET /api/game/nam` · `POST /api/game/nam/eylem` (yuzles|yay|sustur)
- `GET /api/game/yonetmen`

## Yeni/Değişen Frontend

- `pages/Dynasties.jsx` (rota: `/oyun/hanedanlar`, nav: "Rakipler")
- `pages/Rumors.jsx` → Nam Penceresi (nam çubukları + söylenti eylemleri)
- `pages/NPCDetail.jsx` → sohbette kademe rozeti, "hatırlıyor" satırları,
  Yardım Et / Sömür butonları
- `pages/Chronicle.jsx` → "Hayat Romanı" paneli (perdeler, gerilim, nemesis)
- `pages/Generation.jsx` → miras kartında romanın son sayfası

## Test & Doğrulama

```bash
cd backend && python -m pytest tests/test_npc_mind.py \
  tests/test_dynasties.py tests/test_story_director.py -q
```
Şu an: hepsi yeşil. `tests/test_kkm_*.py` dosyaları canlı sunucu/Mongo ister
(birim testi değil, entegrasyon).

Uçtan uca duman kalıbı (DB'siz):
```python
from world_gen import generate_world, generate_player
from simulation import advance_time, _ensure_state_fields
from faction_system import init_factions_for_world
from dynasties import ensure_dynasties
world = generate_world(n_kingdoms=3, n_cities=4, n_villages=8, n_castles=4, n_npcs=400)
player, m, f = generate_player(world)
state = {"turn": 0, "day": 0, "world": world, "player": player,
         "relationships": {}, "quests": [], "history": []}
_ensure_state_fields(state); init_factions_for_world(state, 0); ensure_dynasties(state)
advance_time(state, weeks=104)
```

## Bilinen Notlar / Tuzaklar

- **Frontend build:** `emergentbase-visual-edits` özel npm paketi bazı
  ortamlarda 403 verir → lokal `yarn install` başarısız olabilir. Vercel'de
  sorun yok(tu); deploy sonrası build'i kontrol et.
- **Sürekli kural:** Mevcut sistemi BOZMA, üzerine genişlet. Tüm yeni
  entegrasyonlar `try/except` ile sarılı — eski kayıtlar lazy migrate olur.
- `push_personal_memory(npc, line, tur=..., hafta=..., taniklar=...)` —
  `tur` verilirse S2 yapısal anı da üretir; eski çağrılar aynen çalışır.
- Hanedan mülkleri `state["world"]["dynasties"][i]["mulkler"]`de yaşar
  (oyuncu mülkleri `state["properties"]`). Slot sorgusu:
  `dynasties.free_slots(state, loc)`.
- Yönetmen durumu `state["yonetmen"]`, tohumlar `state["tohumlar"]`
  (okulun eski `state["seeds"]` listesi AYRI — dokunma).

## GDD Başarı Testi — GEÇTİ ✅

"Karaoğlu babamı iflas ettirmişti..." paragrafının 5 anlatı unsuru da
uçtan uca doğrulandı (sabotaj → tohum → adam ayartma → tutum köprüsü →
veraset → yönetmen perdeleri, 200 haftalık simülasyonda sıfır hata).
GDD'deki Başarı Testi tablosu ✅ olarak güncellendi.

## Sıradaki İş (Adım 7 — kalan lansman kalemleri)

- Mobil paketleme, ses sistemi, offline mod, store launch (repo dışı/altyapı)
- i18n tamamlama: `locales/` var, `t()` kullanımı kısmi — yeni S1-S4
  metinleri şu an Türkçe hardcoded (oyun dili Türkçe; EN için geçiş gerekir)
- İçerik geçişi: daha fazla life-event'e tohum tarifi eklemek
  (`story_director.LIFE_EVENT_SEEDS` — veri eklemek yeterli, kod hazır)
- Chronicle paylaşılabilir özet kartı (final_page verisi hazır; görsel
  kart üretimi frontend işi)

# Kronikler: Küllerin Mirası — Oyun Tasarım Belgesi

> **Yeni sohbette devam ediyorsan:** Bu dosyayı oku, sonra **DEVAM NOKTASI** bölümüne bak.

---

## DEVAM NOKTASI

**Son tamamlanan:** Adım 1 — 4 stub sayfası gerçek UI'ya dönüştürüldü  
**Sıradaki:** Adım 2 — Savaş Sistemi Derinleştirme

---

## 1. OYUN KİMLİĞİ

| Alan | Değer |
|---|---|
| Tür | Türkçe, mobil-öncelikli, kalıcı-dünya RPG |
| Stack | React + TailwindCSS + Shadcn UI / FastAPI + MongoDB |
| Test kullanıcısı | test@k.com / test123 |

**Tek cümle özet:** Oyuncu 7 yaşında köy çocuğu olarak başlar, 13'e kadar aile questleriyle büyür, sonra tam sandbox — faction üyeliği, yöneticilik, savaş, evlilik.

---

## 2. TEMEL MEKANİKLER

### Zaman
- **1 tur = 1 hafta.** 4 hafta = 1 ay. 48 hafta = 1 yıl.
- Mevsimler: İlkbahar (3-5), Yaz (6-8), Sonbahar (9-11), Kış (12,1,2)
- Üretim çarpanları: Yaz 1.25, İlkbahar 1.15, Sonbahar 1.10, Kış 0.55

### Çocukluk (7–12 yaş)
- Sadece aile questleri — stat/skill XP, adulthood'a taşınır
- Yasak: savaş, suç, evlilik, faction, kaleye seyahat → 403

### Yetişkinlik (13+)
- Her şey açılır. Tam sandbox.
- Lord: 13+, Şehir Lordu: 16+, Kral: 18+
- Faction liderliği: tip bazında kıdem gerekir

---

## 3. DOSYA MİMARİSİ

### Backend

| Dosya | Ne Yapar |
|---|---|
| `balance_config.py` | Tüm sayısal sabitler |
| `faction_system.py` | Faction motoru (2600+ satır) |
| `city_governance.py` | Şehir yönetimi |
| `world_gen.py` | Dünya + NPC üretimi |
| `simulation.py` | `advance_time()` — haftalık tick |
| `game_routes.py` | Tüm API endpointleri |
| `game_engine.py` | Yardımcı state fonksiyonları |
| `dialogue.py` | NPC diyalog sistemi — dokunma |
| `school.py` | Okul sistemi — dokunma |
| `family_quests.py` | Aile questleri — dokunma |
| `npc_profile.py` | NPC profil sistemi — dokunma |
| `inheritance.py` | Miras sistemi — dokunma |
| `social_reputation.py` | reputation/honor/fear/fame — dokunma |
| `rumors.py` | Dedikodu üretimi — dokunma |
| `world_events.py` | Dünya olayları — dokunma |
| `opportunities.py` | Fırsat questleri |

### Frontend Sayfaları

| Sayfa | Durum | Not |
|---|---|---|
| `Dashboard.jsx` | ✅ Tam | HUD, hafta atlama, event log |
| `Factions.jsx` | ✅ Tam | 1095 satır, tam sistem |
| `CharacterSheet.jsx` | ✅ Tam | 628 satır |
| `NPCDetail.jsx` | ✅ Tam | bond_info dahil |
| `NPCList.jsx` | ✅ Tam | Lokasyon filtreli |
| `WorldMap.jsx` | ✅ Tam | Krallık/lokasyon listesi |
| `CityDetail.jsx` | ✅ Tam | Market, governance |
| `School.jsx` | ✅ Tam | |
| `Opportunities.jsx` | ✅ Tam | |
| `Chronicle.jsx` | ✅ Tam | Tarih günlüğü |
| `Profession.jsx` | ✅ Tam | Meslek sistemi |
| `Quests.jsx` | ✅ Tam | Aile + normal questler |
| `Inventory.jsx` | ✅ Tam | Ekipman + item kullanımı |
| `Relationships.jsx` | ✅ Tam | Bant sistemi |
| `WorldNews.jsx` | ✅ Tam | Dünya olayları akışı |
| `SkillTree.jsx` | ✅ Tam | Beceri ağacı |
| `InheritanceScreen.jsx` | ✅ Tam | Miras |
| `Battle.jsx` | ✅ Temel | Basit rastgele savaş |
| `Rumors.jsx` | ✅ **YENİ** | Dedikoducu sistemi — Adım 1 |
| `Social.jsx` | ✅ **YENİ** | 4 sosyal stat ekranı — Adım 1 |
| `Marry.jsx` | ✅ **YENİ** | Evlilik & aday ekranı — Adım 1 |
| `StatAllocate.jsx` | ✅ **YENİ** | Stat dağıtım ekranı — Adım 1 |

---

## 4. DÜNYA YAPISI

```
World
├── kingdoms[]      → 3 krallık, kültür, din, kral
├── locations[]     → şehir/köy/kale
├── npcs[]          → tüm NPC'ler (bonds{} alanı ile)
├── governances[]   → lokasyon yönetim objeleri
├── factions[]      → 10 tip, nüfuz tabanlı
└── wars[]          → aktif savaşlar

State
├── world
├── player
├── relationships   → {npc_id: score}
├── quests[]
├── family_quests{}
├── rumors[]        → max 80 son dedikodu
├── history[]       → tüm event log
└── turn            → hafta sayısı
```

---

## 5. FAKSİYON SİSTEMİ

### 10 Faction Tipi

| Tip | Durum | Yeri |
|---|---|---|
| `krallık_ordusu` | Her zaman aktif | Kale |
| `tuccar_loncasi` | Her zaman aktif | Şehir, köy |
| `eskiya_cetesi` | Her zaman aktif | Köylerin %30'u |
| `paralı_asker` | Kademeli açılır (1.) | Kale |
| `dini_tarikat` | Kademeli açılır (2.) | Şehir |
| `ilim_cemiyeti` | Kademeli açılır (3.) | Şehir |
| `zanaatkar_loncasi` | Kademeli açılır (4.) | Şehir |
| `sifaci_birligi` | Kademeli açılır (5.) | Köy |
| `oyuncu_kumpanya` | Kademeli açılır (6.) | Şehir |
| `gizli_cemiyet` | En son açılır (7.) | Şehir (gizli) |

- Her 12 turda bir dormant faction aktifleşir
- Gizli Cemiyet: 5 ipucu toplanınca ifşa edilebilir

### Nüfuz Eşikleri

| Değer | Etki |
|---|---|
| 25+ | Şehirde quest/ticaret avantajı |
| 50+ | Vergi ve politika etkisi |
| 75+ | Aday gösterme hakkı |
| 100 | Lord faction'ın adamı |

### Oyuncu Progression
- `work` → +1 katkı/hafta, `donate` → her 10 altın = 1 katkı
- Rank 1-2: +2 altın/hafta, rank 3+: +5 altın/hafta
- Savaşta rank bonusu: rank 1-2 → +3, rank 6+ → +10

---

## 6. SOSYAL SİSTEM

### 4 Sosyal Stat (social_reputation.py)

| Stat | Aralık | Etki |
|---|---|---|
| `reputation` | -100 / +100 | NPC güveni, ticaret fiyatı, lord kabulü |
| `honor` | 0-100 | Lord kabulü, evlilik şansı, NPC saygısı |
| `fear` | 0-100 | NPC saldırı ihtimali ↓, ilişki kurma zorlaşır |
| `fame` | 0-100 | Yeni fırsatlar, NPC tanıma, ticaret fiyatı ↑ |

### Dedikodular (rumors.py)
- Max 80 rumor bellekte, en yeni 40'ı gösterilir
- Otomatik üretim: dünya olayları → dedikodu
- Sezonluk ortam dedikoduları (%15 şans/hafta)
- NPC konuşmalarında duyulabilir

### Evlilik Akışı
1. NPC ile flört et (`POST /npc/{id}/flirt`) → "dating" statüsü
2. İlişki 50+ ol
3. Evlenme teklifi et (`POST /npc/{id}/propose`)
4. Kabul → `spouse_id` set edilir

---

## 7. AİLE QUESTLERİ (16 quest)

| Quest ID | Min Yaş | Requires | Tip |
|---|---|---|---|
| ev_isleri | 7 | — | collect |
| ekmek_pisir | 7 | — | collect |
| kardes_oyun | 7 | — | chat_count |
| su_tasi | 7 | — | travel_count |
| yagmur_oyunu | 7 | — | chat_count |
| baba_isi | 8 | — | work_count |
| kus_yakala | 8 | — | work_count |
| ihtiyara_yardim | 8 | — | chat_count |
| ilk_silah | 9 | — | equip |
| hikaye_dinle | 9 | — | chat_count |
| kasaba_gezi | 10 | — | travel_count |
| balik_tut | 10 | — | work_count |
| usta_sinavi | 11 | — | work_count |
| kasabada_tek | 11 | usta_sinavi | travel_then_chat |
| son_cocukluk | 12 | kasabada_tek | chat_count |
| yetiskinlige_hazirlik | 12 | — | work_count |

---

## 8. YOL HARİTASI

### ✅ Adım 1 — Stub Sayfaları Tamamla (BITTI)

4 sayfa gerçek UI'ya dönüştürüldü:
- **Rumors.jsx:** Dedikodu kartları, tip filtresi, güvenilirlik badge, zaman etiketi
- **Social.jsx:** 4 sosyal stat (rep/honor/fear/fame), ticaret çarpanları, NPC saldırı riski
- **Marry.jsx:** Eş ekranı, bekar aday listesi, flört → çıkıyorsunuz → evlilik akışı
- **StatAllocate.jsx:** Görsel stat kartları, perk listesi, +1 butonu, puan göstergesi

### 🔲 Adım 2 — Savaş Sistemi Derinleştirme

Mevcut durum: `Battle.jsx` tek buton, rastgele düşman. Backend'de `resolve_battle()` detaylı ama oyuncu görmüyor.

Yapılacaklar:
- Hedef seçimi: lokasyondaki NPC'lerden düşman seç VEYA bandita yolda karşılaşması
- Strateji seçeneği: Saldır / Savun / Kaç
- Faction savaşına katıl: Factions sayfasından aktif savaşta olan faction'ın yanında savaş
- Ganimet listesi görselleştirme
- Savaş sonucu ekranı: kazandın/kaybettin cinematic

### 🔲 Adım 3 — Görsel Dünya Haritası

Mevcut: liste halinde lokasyonlar. Hedef: SVG/canvas bazlı interaktif harita.
- Lokasyon ikonları (şehir/kale/köy)
- Faction nüfuz renk katmanı
- Oyuncu konumu imleci
- Tıkla → CityDetail'e git

### 🔲 Adım 4 — Ticaret & Kervan Sistemi

Kervan rotaları `world_gen.py`'de hazır altyapı var.
- Şehirler arası fiyat farkları göstergesi
- Kervan koruması görevi (quest olarak)
- Eşkıya saldırısı riski (yolculukta)
- Arbitraj fırsatı hesaplayıcı

### 🔲 Adım 5 — Suç & Yasadışı Aktivite UI

`/crime` endpoint var, UI yok.
- Suç tipi seçimi (hırsızlık, dolandırıcılık, kaçakçılık)
- Yakalanma riski göstergesi
- Eşkıya Çetesi entegrasyonu
- Wanted level sistemi

### 🔲 Adım 6 — Çocuk & Nesil Derinleştirme

Miras altyapısı var. Çocuğun büyüme süreci görünür hale getirme.
- Çocuk listesi ekranı (yaş, stat, lokasyon)
- Çocuğa öğret / zaman geçir aksiyonları
- Nesil devri ekranı zenginleştirme

---

## 9. API ENDPOINT LİSTESİ

### Temel
```
POST /api/game/new
GET  /api/game/state
DELETE /api/game/state
POST /api/game/advance?weeks=N
POST /api/game/dismiss-coming-of-age
```

### Dünya & Sosyal
```
POST /api/game/chat              {npc_id, topic}
GET  /api/game/dialog-topics
POST /api/game/travel            {location_id}
POST /api/game/trade             {location_id, good, qty, action}
POST /api/game/marry             {npc_id}
POST /api/game/battle
GET  /api/game/rumors
GET  /api/game/social
```

### NPC Etkileşim
```
GET  /api/game/npc/{id}/profile
POST /api/game/npc/{id}/compliment
POST /api/game/npc/{id}/gift     {item?, amount?}
POST /api/game/npc/{id}/flirt
POST /api/game/npc/{id}/propose
POST /api/game/npc/{id}/insult
POST /api/game/npc/{id}/gossip
POST /api/game/npc/{id}/kidnap
```

### Karakter
```
GET  /api/game/jobs
POST /api/game/job               {profession}
POST /api/game/work
POST /api/game/stat/allocate     {stat}
POST /api/game/use_item          {item, qty}
POST /api/game/equip             {item}
POST /api/game/unequip           {slot}
GET  /api/game/items
GET  /api/game/skills
GET  /api/game/family-quests
POST /api/game/quest/accept      {quest_id}
POST /api/game/quest/complete    {quest_id}
POST /api/game/crime             {crime_type}
POST /api/game/attack_npc        {npc_id}
```

### Governance
```
GET  /api/game/governance
GET  /api/game/governance/{location_id}
POST /api/game/governance/run-for-governor   {location_id}
POST /api/game/governance/pay-taxes          {location_id, amount}
```

### Faction
```
GET  /api/game/factions
GET  /api/game/factions/{id}
POST /api/game/factions/join         {faction_id}
POST /api/game/factions/leave
POST /api/game/factions/create       {name, type, home_location_id}
POST /api/game/factions/rebel
GET  /api/game/factions/influence/preview
POST /api/game/factions/influence    {faction_id, location_id}
POST /api/game/factions/manipulate-npc {npc_id, method}
GET  /api/game/factions/gizli-cemiyet/clues
POST /api/game/factions/gizli-cemiyet/investigate
POST /api/game/factions/gizli-cemiyet/reveal/{id}
POST /api/game/factions/rank-up
POST /api/game/factions/donate       {amount}
```

### Miras
```
GET  /api/game/inheritance/options
POST /api/game/inheritance/begin     {chosen_child_id?}
```

---

## 10. TASARIM İLKELERİ (Değişmez)

1. **Sandbox:** Oyuncu istediğini yapabilir — ama her eylemin sonucu var.
2. **Sebep-sonuç görünür:** Arka planda dönen her şey oyuncuya iz bırakmalı.
3. **Zaman hissi:** Rakamlar değil, takvimde geçen hafta/ay hissi.
4. **Türkçe öncelik:** UI, diyalog, event tamamen Türkçe.
5. **Mobil öncelik:** Büyük dokunma hedefleri, tek el kullanımı.
6. **Çocukluk önemli:** 7-12 yaş kısıtlı ama anlamsız değil.

---

*Son güncelleme: Adım 1 tamamlandı — Rumors, Social, Marry, StatAllocate sayfaları.*

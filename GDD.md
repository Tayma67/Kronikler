# Kronikler: Küllerin Mirası — GDD v4 (Adım 16 ✅)

### Yeni Oturum İçin Süreklilik Belgesi

> **Yeni Claude oturumu açtıysan:** Bu dosyayı baştan oku.

---

## DEVAM NOKTASI

**Son tamamlanan:** Adım 16 — Perk / Skill-up Ekranı (§3.3)
**Sıradaki:** **Adım 17** — Ses & Animasyon Katmanı

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

| Dosya               | Ne Yapar                          | Durum                                            |
|---------------------|-----------------------------------|--------------------------------------------------|
| `simulation.py`     | `advance_time()` — haftalık tick  | ✅ Kervan + world event + life event trigger      |
| `game_engine.py`    | `check_state_triggers()`          | ✅ Dokunulmadı                                    |
| `game_routes.py`    | Tüm API endpointleri (90 route)   | ✅ + `/life-event/pending` + `/life-event/choose` |
| `life_events.py`    | 100 event sistemi                 | ✅                                                |
| `inheritance.py`    | Nesil devri motoru                | ✅                                                |
| `caravan.py`        | Kervan motoru                     | ✅ Adım 8A+8B                                     |
| `world_events.py`   | Dünya olayları motoru             | ✅ Adım 9                                         |
| `dialogue.py`       | Dialog sistemi v2                 | ✅ Adım 10                                        |
| `faction_system.py` | Faction motoru                    | ✅ Mevcut                                         |
| `school.py`         | Mektep / eğitim sistemi           | ✅ Mevcut                                         |
| `npc_interactions.py` | NPC etkileşim motoru            | ✅ Mevcut                                         |
| `opportunities.py`  | Fırsat sistemi                    | ✅ Mevcut                                         |
| `world_gen.py`      | Dünya + Player üretimi            | ❌ Dokunma                                        |

### Frontend — Tüm Sayfalar

| Dosya                           | Ne Yapar                                    | Durum |
|---------------------------------|---------------------------------------------|-------|
| `pages/Dashboard.jsx`           | Ana sayfa + olaylar + hafta ilerlet         | ✅ + LifeEventModal (Adım 12) |
| `pages/GameLayout.jsx`          | Nav bar + "Geri Dön" butonu                | ✅ Adım 14 |
| `lib/GameContext.jsx`           | + lastActionPage state                     | ✅ Adım 14 |
| `hooks/useActionRedirect.js`    | Aksiyon → Dashboard yönlendirme hook       | ✅ Adım 14 |
| `pages/CharacterSheet.jsx`      | Karakter detay + stat'lar                  | ✅ |
| `pages/WorldMap.jsx`            | Harita + seyahat                           | ✅ |
| `pages/CityDetail.jsx`          | Şehir detay + yönetim                      | ✅ |
| `pages/NPCList.jsx`             | NPC listesi                                | ✅ |
| `pages/NPCDetail.jsx`           | NPC profili + etkileşim + Yardım Et        | ✅ Adım 11 |
| `pages/Relationships.jsx`       | İlişkiler özeti                            | ✅ |
| `pages/Trade.jsx`               | Pazar + alım satım                         | ✅ |
| `pages/Factions.jsx`            | Faction sistemi + savaşlar                 | ✅ |
| `pages/School.jsx`              | Mektep + dersler + kulüpler                | ✅ |
| `pages/Battle.jsx`              | Savaş sahnesi                              | ✅ |
| `pages/Crime.jsx`               | Suç / gölge sistemi                        | ✅ |
| `pages/Opportunities.jsx`       | Fırsat listesi                             | ✅ |
| `pages/WorldNews.jsx`           | Dünya haberleri                            | ✅ |
| `pages/Social.jsx`              | Sosyal itibar                              | ✅ |
| `pages/Rumors.jsx`              | Dedikodular                                | ✅ |
| `pages/Marry.jsx`               | Evlilik / aile                             | ✅ |
| `pages/Profession.jsx`          | Meslek seçimi                              | ✅ |
| `pages/StatAllocate.jsx`        | Stat dağıtımı                              | ✅ |
| `pages/Chronicle.jsx`           | Tarih / kronik                             | ✅ |
| `pages/Generation.jsx`          | Nesil devri                                | ✅ |
| `pages/InheritanceScreen.jsx`   | Miras ekranı                               | ✅ |
| `pages/TownFeed.jsx`            | Kasaba akış + NPC dramasi                  | ✅ Adım 13 |
| `pages/NewGame.jsx`             | Yeni oyun kurulumu                         | ✅ |
| `pages/Login.jsx`               | Giriş                                      | ✅ |
| `pages/Register.jsx`            | Kayıt                                      | ✅ |
| `components/LifeEventModal.jsx` | Life event seçim + sonuç popup'ı           | ✅ Adım 12 |
| `lib/GameContext.jsx`           | Global oyun state + advance + action       | ✅ |
| `lib/AuthContext.jsx`           | Auth state                                 | ✅ |
| `App.js`                        | Route tanımları                            | ✅ Adım 11 |

---

## 3. TÜM ADIMLAR — YOL HARİTASI

| Adım | Özellik                                      | Durum               |
|------|----------------------------------------------|---------------------|
| 1    | Temel sistem (auth, game loop, state)        | ✅ Tamamlandı        |
| 2    | NPC Profil Sistemi                           | ✅ Tamamlandı        |
| 3    | Dünya Olayları temel                         | ✅ Tamamlandı        |
| 4    | Ticaret Sistemi                              | ✅ Tamamlandı        |
| 5    | Savaş Sistemi                                | ✅ Tamamlandı        |
| 6    | Sosyal İtibar                                | ✅ Tamamlandı        |
| 7    | Faction + Miras (temel)                      | ✅ Tamamlandı        |
| 8A   | Kervan motoru (backend)                      | ✅ Tamamlandı        |
| 8B   | Kervan frontend + olaylar                    | ✅ Tamamlandı        |
| 8C   | Kervan balans + edge case'ler                | ✅ Tamamlandı        |
| 8D   | Kervan geçmişi + durum gösterimi             | ✅ Tamamlandı        |
| 9    | Dünya Olayları & Siyasi Krizler (Dashboard)  | ✅ Tamamlandı        |
| 10   | Dialog Derinleştirme (v2, proaktif NPC)      | ✅ Tamamlandı        |
| 11   | Quest Yeniden Tasarımı + Aile Yardımı        | ✅ Tamamlandı        |
| 12   | Life Event Popup Sistemi                     | ✅ Tamamlandı        |
| 13   | TownFeed / Kasaba Akış Sayfası               | ✅ Tamamlandı        |
| **14** | **Aksiyon → Dashboard + "Geri Dön"**      | ✅ |
| **15** | **Fırsat Aciliyet Göstergesi (§20.4)**  | ✅ |
| **16** | **Perk / Skill-up Ekranı (§3.3)**      | ✅ |
| 15   | Fırsat Aciliyet Sistemi                      | 📋 Planlandı         |
| 16   | Perk / Skill-up Ekranı                       | 📋 Planlandı         |
| 17   | Ses & Animasyon Katmanı                      | 📋 Planlandı         |

---

## 4. TAMAMLANAN SON ADIMLAR — ÖZET

### Adım 11 — Quest Yeniden Tasarımı + Aile Yardımı (GDD §20)

**Kaldırılanlar:**
- `Quests.jsx` ve `FamilyQuests.jsx` route'lardan çıkarıldı
- `/oyun/gorevler` → `/oyun/firsatlar` redirect
- `/oyun/aile` → `/oyun/iliskiler` redirect
- Primary nav'dan "Görevler" kaldırıldı → "İlişkiler" eklendi

**Yeni — Aile Yardımı:**
- `POST /game/help-parent` — 13 yaş altı için, haftalık 1 kez
- Anne → STA+1, CHA+1, sosyal XP; Baba → STR+1, STA+1, meslek XP
- `NPCDetail.jsx`: `isPlayerParent` + `alreadyHelpedThisWeek` + "Yardım Et" kartı

---

### Adım 12 — Life Event Popup Sistemi (GDD §17.5)

**Backend:**
- `simulation.py`: `maybe_trigger_life_event(state)` advance loop'ta çağrılır
- `GET /game/life-event/pending` — bekleyen event'i döndürür
- `POST /game/life-event/choose` — `{ event_id, choice_index }` → efekt uygular

**Frontend:**
- `LifeEventModal.jsx` (yeni): seçim ekranı (ikon + başlık + 1–3 seçenek) → sonuç ekranı (efekt badge'leri) → "Devam Et"
- `Dashboard.jsx`: advance sonrası pending kontrolü → `showLifeEvent` state → modal

---

### Adım 13 — TownFeed / Kasaba Akış Sayfası

**Sayfa:** `src/pages/TownFeed.jsx` · Route: `/oyun/kasaba` · Nav: "Kasaba" (Coffee ikonu)

**Bölümler:**
- **Yakınındakiler** — aynı lokasyondaki canlı NPC'ler (link + ilişki + meslek)
- **NPC Dramasi** — yüksek yoğunluklu ilişki durumları, italik dramatik cümleler
- **Olay Akışı** — son 40 event, ters kronolojik, filtreli (`hepsi` / `lokasyon` / `önemli`)

State kaynakları: `state.events`, `state.world.npcs`, `state.world.locations` — yeni backend endpoint gerektirmiyor.

---

## 5. ADIM 14 — Aksiyon → Dashboard + "Geri Dön" Butonu (GDD §19)

### 5.1 Amaç
Oyuncu herhangi bir sayfada aksiyon yapınca otomatik Dashboard'a yönlendirilir.
Sağ altta `↩ [SayfaAdı]` butonu bir önceki sayfaya döndürür.

### 5.2 `lib/GameContext.jsx` — Eklenecek
```js
const [lastActionPage, setLastActionPage] = useState(null);

// context value'ya:
lastActionPage,
setLastActionPage,
clearLastActionPage: () => setLastActionPage(null),
```

### 5.3 `src/hooks/useActionRedirect.js` — Yeni dosya
```js
import { useNavigate, useLocation } from "react-router-dom";
import { useGame } from "@/lib/GameContext";

export function useActionRedirect(label) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLastActionPage } = useGame();

  return async (actionFn) => {
    setLastActionPage({ path: location.pathname, label });
    const result = await actionFn();
    navigate("/oyun");
    return result;
  };
}
```

### 5.4 `pages/GameLayout.jsx` — "Geri Dön" butonu
```jsx
{lastActionPage && (
  <button
    onClick={() => { navigate(lastActionPage.path); clearLastActionPage(); }}
    className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5
               text-xs font-heading tracking-wider px-3 py-2
               bg-stone-900 border border-stone-700 rounded-sm
               text-stone-300 hover:text-stone-100 hover:border-stone-500 shadow-lg"
  >
    ↩ {lastActionPage.label}
  </button>
)}
```

### 5.5 Hook kullanılacak sayfalar
| Sayfa | Label |
|-------|-------|
| `Factions.jsx` | "Factions" |
| `School.jsx` | "Mektep" |
| `Crime.jsx` | "Gölge" |
| `Opportunities.jsx` | "Fırsatlar" |
| `NPCDetail.jsx` | "NPC" |

**Yöntem:** Her sayfada `const withRedirect = useActionRedirect("Label")` çağır, aksiyon fonksiyonlarını `withRedirect(() => api.post(...))` ile sar.

---

## 6. ADIM 15 — Fırsat Aciliyet Sistemi (GDD §20.3–20.4)

Dashboard "Bu Hafta" kartına fırsat aciliyet göstergesi ekle:
- `⏳ 1 hafta kaldı` badge'i
- Yapılmazsa olay üretilir: "Fırsatı kaçırdın"
- `Opportunities.jsx`'te `kaçırıldı` durumu badge'i

---

## 7. ADIM 16 — Perk / Skill-up Ekranı (GDD §3.3)

Beceri seviye atlayınca:
- Dramatik açılış animasyonu
- 3 perk seçeneği sunulur (geri alınamaz seçim)
- Dashboard'da olay olarak düşer

---


---

## 9. ADIM 16 — Perk / Skill-up Ekranı (GDD §3.3)

### Amaç
Skill seviyesi atlayınca dramatik bir seçim ekranı açılır.
Oyuncu 3 perk seçeneğinden birini seçer — seçim geri alınamaz.

### Backend — `skills.py`
- `SKILL_PERK_CHOICES`: 4 skill × 3 seviye = 12 perk grubu, her birinde 3 seçenek
- `enqueue_perk_choice(player, skill, level)`: Seviye atlayınca `pending_perk_queue`'ya ekler
- `apply_perk_choice(player, skill, level, perk_key)`: Seçimi `chosen_perks`'e kaydeder, kuyruktan çıkarır
- `get_pending_perk_choice(player)`: Kuyruktan ilk bekleyen seçimi döndürür
- `add_skill_xp()` güncellendi: seviye atlayınca otomatik `enqueue_perk_choice()` çağırır

### Backend — `game_routes.py`
- `GET /game/perk/pending`: Bekleyen perk seçimini döndürür
- `POST /game/perk/choose`: `{skill, level, perk_key}` → seçimi uygular, olaylar bölümüne düşürür
- `GET /game/skills`: `chosen_perks`, `pending_perk_queue`, `perk_choices` alanları eklendi

### Frontend — `PerkChoiceModal.jsx` (yeni)
- 3 phase: `reveal` (1.5s animasyon) → `choose` (3 seçenek) → `result` (seçilen perk)
- Skill'e göre renk teması (kırmızı/sarı/mavi/yeşil)
- Geri alınamaz seçim uyarısı
- Seçim sonrası olaylar bölümüne düşer

### Frontend — `Dashboard.jsx`
- Advance sonrası `GET /perk/pending` kontrolü eklendi
- `PerkChoiceModal` entegre edildi (LifeEventModal ile çakışmaz)

### Frontend — `SkillTree.jsx`
- Yeni 3-seçenek sistemiyle uyumlu
- Seçilen perk yeşil ✓ ile gösterilir
- Reddedilen seçenekler soluk gösterilir
- Pending (seçilmemiş ama uygun) durumu amber rengiyle öne çıkar
- "Hafta ilerlet — perk seçim ekranı açılacak" ipucu

---
## 8. TASARIM İLKELERİ (Değişmez)

1. Sandbox, sebep-sonuç görünür, 1 tur = 1 hafta
2. Türkçe öncelik, Mobil öncelik
3. Çocukluk önemli (7–12 yaş kısıtlı)
4. Her aksiyon hikayeleşir — hem popup'ta yaşanır hem olaylar bölümüne düşer (GDD §17)
5. Geri alınamaz kararlar (perk seçimi, büyük yaşam olayları) dramatik sunulur

---

*GDD v4.16 — Adım 16 ✅ | Haziran 2026*
*Proje: Kronikler: Küllerin Mirası*

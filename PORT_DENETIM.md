# PORT DENETİM RAPORU — Vercel (web) ↔ APK (mobil)

> **Amaç:** Vercel'deki (`backend/*.py` ~33.700 satır / 50+ modül) sistemlerin APK'ya
> (`mobile/` ~6.650 satır TS) ne kadar aktarıldığını modül modül gösteren tek denetim
> tablosu. Vercel'in **%100** aktarıldığından emin olunca tek dala geçilecek.
>
> **Yöntem:** 10 inceleme ajanı her modül grubunu Vercel↔APK olarak karşılaştırdı
> (şirket/departman mantığı, tek elden birleştirildi). Bu dosya tek doğruluk kaynağıdır;
> bağlam (sohbet hafızası) kaybolsa da burası + git geçmişi + kod tam durumu taşır.
>
> Son güncelleme: 2026-06-15 · Dal: `claude/gifted-volta-fwqcqn`
>
> **Referans botlar:** Vercel tarafı `backend/tools/player_bot.py` (gerçek HTTP rotalarını
> oynatır) · APK tarafı `mobile/scripts/smoke.sh` (300 sanal hayat × tüm aksiyonlar, HATA:0 kapısı).

---

## İLERLEME — 7 hedef sistem (2026-06-15)

Çalışma kuralı (/loop): "dur" diyene kadar sırayla port + iyileştir; her sistem tsc+smoke(HATA:0)+commit+push.
- ✅ **Evlat eğitimi haftalık birikimi** (commit 03e4dee)
- ✅ **Şehir yönetim kolları** (vergi/memnuniyet/hazine) (commit 6f80942)
- ✅ **Eyleme dönük söylentiler** (piyasa ipucu + istihbarat) (commit 84dc7d9)
- ✅ **Kariyer merdiveni + stat-XP** (özellikler kullanımla büyür) (commit bu turda)
- ✅ **Üretim zincirleri** (işçili mülk → gerçek hammadde → zanaat zinciri) (commit bu turda)
- ✅ **Tipli dünya olayları** (lokasyon-bazlı, hissedilir: fiyat/gelir/seyahat/kişisel) (commit bu turda)
- ✅ **Fraksiyon AI + güç yüzeyi** (görünür örgüt eylemleri + oyuncu güç eylemi) (commit bu turda)

**🎉 7/7 hedef sistem portlandı.** Kalanlar (diyalog/mektep/savaş derinliği, NPC eylemleri, life-event içeriği) artık mevcut sistemlerin DERİNLEŞTİRİLMESİ — yeni "yok" değil.

> Devam: bir sonraki oturum `mobile/`de `npm install` (gerekiyorsa) → kalan ⬜ sistemleri sırayla.

## 3. GECE ÇALIŞMASI (2026-06-16) — DERİNLEŞTİRMELER TAMAMLANDI

> Tek elden, durmadan. Her biri tsc + smoke (HATA:0) + commit + push. 6 dil dahil.
- ✅ **Denge:** 4 mevsim açlık eğrisi + dayanıklılık-açlık azaltması.
- ✅ **NPC etkileşim eylemleri:** hakaret / flört(kur) / dedikodu / para ver (4/5; saldırı-kaçırma offline combat'a bırakıldı).
- ✅ **Diyalog derinliği:** 4 yeni konu (iş/aile/dünya/hayal) + spontane NPC sözü + hafıza geri çağrımı.
- ✅ **Hayat Romanı:** yıllık anlatı özeti (tema-bazlı paragraf, 9 tema).
- ✅ **Yaşam ikilemleri:** +6 olay (orta yaş/yaşlılık/ekonomik kriz).
- ✅ **Pazarlık:** satıcı kişiliği (cömert/dürüst/tüccar/inatçı/cimri).
- ✅ **Fraksiyon darbe:** sancak hakimiyeti dinamik el değiştirir.
- ✅ **Hikâye Yönetmeni:** kıvılcım kartları (durgunlukta küçük anlar).
- ✅ **Mülk derinliği:** han tipi + mevsimsel üretim.
- ✅ **Kervan:** kâr şeffaflığı (yatırılan→dönen→net).

### Fraksiyon AI MANTIK düzeltmesi + derinleştirme (2026-06-16) ✅
> Kullanıcı: "şifacı savaş açıyordu, herkes herkesle savaşıyordu, dindar+eşkıya ittifakı vardı — mantıksızlık çoktu."
- ✅ **FACTION_TRAITS arketipleri:** aggression + doğal dost/düşman + karaktere uygun eylemler.
- ✅ **Savaş rakibi seçimi:** barışçıl (şifacı) göz dikmez; müttefik (asker-demirci, tüccar-demirci) saldırmaz; düşmanlık iştahı katlar. Arka plan savaşları da arketipe uygun.
- ✅ **AI eylemleri karaktere bağlı:** şifacı yalnız bağış/üye; gölge sabotaj/suikast; asker darbe. Kimse karakterine aykırı davranmıyor.
- ✅ **Müttefik takviyesi:** dostu çok olan taraf savaşta ek ağırlık alır.
- ✅ **Ateşkes:** savaş sonrası ~12 tur yeni savaş yok (sürekli savaş döngüsü kırıldı).
- ✅ **factionStance() diplomasi temeli** + orgutler'de her loncanın mizaç satırı.

### 🌍 YAŞAYAN DÜNYA (2026-06-16) — TAMAM ✅ (determinizmden vazgeçildi, kullanıcı kararı)
> Kullanıcı: "her açılışta birebir aynı olması oyunu yapma amacıma aykırı; yaşayan dünya olacak."
- ✅ **Faz 1:** kalıcı NPC kadrosu — `rosterAt` (deterministik temel + `world.npcEvo`/`npcBorn` evrim katmanı); isimler dile göre çözülür; evrim vârise taşınır.
- ✅ **Faz 2:** yaşam tiki — ölüm/yeni nesil + evlilik + doğum haberleri.
- ✅ **Faz 3:** gerçek yaşlanma (`world.npcYears` dünya saati) — bebek doğar/büyür, yetişkin yaşlanır, yaşlı yaşa-bağlı ölür; her ölüm bir doğumla dengeli → **nüfus stabil (ölçüm: tam 138, boş şehir yok, ort. yaş 32.6)**.
- ✅ Yerleşim ölçeği (şehir 18/kale 12/köy 8) · ölen işçi mülkten çıkar+bildirilir.
- ⬜ İnce: born NPC isimleri dile göre çözülmüyor (tr sabit); oyuncu ailesi (eş/çocuk) henüz roster'a bağlı değil.

### ✅ SP CİLA YOL HARİTASI — FİİLEN TAMAM (2026-06-16)
> Tek-oyunculu artık "kusursuz oynanılır" hedefinde: yaşayan dünya + tam fraksiyon diplomasisi +
> dolu içerik + cila. Final QA: tanımsız i18n anahtarı YOK, smoke HATA:0, 102 dil grubu.
> Kalan tek kalem **eşya kalite incelemesi**: APK pazarında gizli kusurlu mal olmadığından
> tasarıma uymuyor → DÜŞÜRÜLDÜ (zorlamak alış ekonomisini riske atardı).
> **Sıradaki büyük faz: MULTIPLAYER** (kullanıcının sunucu/host kararını bekliyor).

### SP cila — bu seansta tamamlananlar (2026-06-16)
- ✅ Mektep kulüpleri + hoca bağı · ✅ Suç sıcak mal · ✅ Çalışma mini-olayları (15 meslek)
- ✅ Fraksiyon koalisyonu (diplomasi track tam) · ✅ Aile görevleri 10→16 · ✅ Fırsatlar 12→18 (yaşayan-dünya temalı)
- ✅ **Yaşayan dünya (3 faz): kalıcı kadro + yaşam tiki + gerçek yaşlanma** · ✅ ölen işçi temizliği · ✅ Mülk defteri (ledger)
- ⬜ Kalan: eşya kalite incelemesi (alış akışı — dikkatli), seyahat çok-seçimli sahne (dashboard'a global modal), paylaşılabilir final kartı (share infra).

### Tek-oyunculu cila yol haritası (multiplayer ERTELENDİ — önce SP kusursuz)
> Karar: önce single-player kusursuz oynanılır olacak, sonra online entegre edilecek.
- ✅ **Fraksiyon diplomasi tamamlandı:** arketip + ateşkes + müttefik takviyesi + yerel sancak dostluğu + darbe + **koalisyon**.
- ✅ **Mektep** (ders olayları + kulüpler + hoca bağı) · ✅ **Suç sıcak mal** · ✅ **Çalışma mini-olayları (15 meslek)**.
- ⬜ **Seyahat çok-seçimli sahneler** (kervan yolcu profilleri) — `pendingScene` için global sahne modalı gerekir (dashboard'a), orta efor.
- ⬜ **İçerik doluluğu:** aile görevleri 10→16, fırsatlar 12→25 (artık locEvents/tips'e bağlanabilir).
- ⬜ **Cila:** eşya kalite incelemesi (pazar), mülk ledger, paylaşılabilir final kartı.
- ⬜ **QA sertleştirme:** smoke kapsamını derinleştir (vâris zinciri, valilik, fraksiyon gücü, çok-nesil), i18n anahtar denetimini CI kapısı yap.

### Multiplayer (SONRA — notlar)
- Vizyon: aynı dünya/aynı zaman, ~5 kişi, çoğunluk "ay ilerlet"e basınca ilerler, eylemler birbirini etkiler.
- Mimari: otoriter sunucu (çekirdek `game.ts` Node'da koşuyor → yeniden kullanılır) + "tek dünya + N oyuncu" durum refaktörü + oda/hazır-oy netcode. Ücretsiz deneme için Colyseus+Render / Supabase / PartyKit yeterli.
- Ayrı `multiplayer` feature-branch + sunucu ayrı küçük servis. SP kusursuz olunca başlanacak.

---

## 2. DERİN DENETİM (2026-06-15) — KALAN DERİNLEŞTİRMELER

> 7 kilit sistem portlandıktan SONRA, 6 ajanla tüm Vercel tekrar tarandı. Aşağıdakiler
> hâlâ eksik/sığ. Çoğu "yok" değil, mevcut çalışan sistemin DERİNLEŞTİRİLMESİ — ama
> oyunun "yaşam romanı" hissi için kritik. Öncelik = oynanabilirlik etkisi.

### 🔴 Yüksek etki
1. **Denge hatası (HÂLÂ açık):** yetişkin açlık kaybı 8 vs Vercel 5 (+%60); açlık hasarı −6 vs −2 (3×); mevsim çarpanı sadece Kış. → `advance()` ~663. **Efor: küçük, etki büyük.**
2. **Diyalog derinliği:** Vercel 8 konu × 4 katman (bağlam+hafıza geri çağrımı+spontane NPC sözü); APK 4 niyet, `converse()` npc-mind hafızasını kullanmıyor → sohbet statik. **Efor: büyük.**
3. **NPC etkileşim eylemleri (5 eksik):** hakaret, flört/kur (evlilik öncesi), dedikodu yay, para verme, saldırı/kaçırma (combat var ama NPC ekranına bağlı değil). **Efor: orta.**
4. **Yıllık hikâye özeti (`generate_year_story`):** roman.tsx olay LİSTESİ gösteriyor; Vercel paragraf anlatı üretiyor → "roman" hissi eksik. **Efor: orta, yüksek değer.**
5. **Mektep derinliği:** ders içi olaylar (%85 seçimli), kulüpler, hoca NPC ilişkisi, mevsimsel/özel olaylar — APK'da 4 ders+sınav. **Efor: büyük.**

### 🟡 Orta etki
6. **Hikâye Yönetmeni:** kıvılcım kartları (durgunluk destesi), perdeler (Chronicle 2.0 bölüm başlıkları), event-bias, doruğun pozitif varyantları. **Efor: büyük.**
7. **Anlatı motoru:** ilişki-temelli ölüm/doğum/savaş anlatıları + paylaşılabilir final kartı. **Efor: orta.**
8. **Fraksiyon dünya dinamiği:** darbe (fazlı), NPC isyanı/iç savaş, fraksiyonlar arası ilişki/diplomasi/koalisyon/ateşkes, şehir nüfuzu (city_influence), NPC fraksiyon değiştirme, gizli cemiyet operasyon+ifşa. **Efor: büyük (parça parça yapılabilir).**
9. **Yaşam olayı içeriği:** ikilemler 57/170 — orta yaş/yaşlılık/ekonomik kriz eksik; fırsatlar NPC+mevsim+dünya-olayı bağı yok (artık locEvents/tips ile bağlanabilir). **Efor: orta.**
10. **Seyahat & çalışma seçim katmanı:** rota seçimi + kervan yolcu profilleri (seyahat); meslek-özel mini-olay havuzu + seçim (çalışma) — APK otomatik. **Efor: büyük.**
11. **Pazarlık:** satıcı kişiliği + ilişki kademesi + taban görünürlüğü (koz). **Efor: orta.**

### 🟢 Düşük efor / cila
12. Kervan arbitraj kâr detayı + saldırı riski göstergesi. 13. Mülk: han tipi + ledger (muhasebe) + gerçek mevsim çevrimi (propYield mevsimsiz). 14. Suç: sıcak mal + tanık NPC anısı. 15. Eşya kalite incelemesi (trade/inspect). 16. Fraksiyon küçükleri: paralı asker, ambargo/fetva/şeriat, zanaatkar grevi, mevsim savaş çarpanı.

### 🔵 Kasıtlı (dokunma)
- NPC yaşlanma/ölüm/doğum: APK offline deterministik tasarımı gereği KAPALI — risk değil, tercih.

---

## DAL STRATEJİSİ (kullanıcı kararı)

- **2 dal hedefi:** biri Vercel (web) bölümü, biri APK (mobil) bölümü. Şu an tüm port işi
  `claude/gifted-volta-fwqcqn` dalında ilerliyor; sürekli yeni dal AÇILMAYACAK.
- Vercel'deki her şeyin APK'ya aktarıldığı doğrulanınca **tek dala** geçilecek.

---

## GENEL KAPSAMA TABLOSU

Durum: 🟢 iyi (≈%80+) · 🟡 kısmi · 🔴 sığ/eksik · 🔵 kasıtlı sadeleştirme (offline tasarımı)

| Sistem | APK kapsama | Durum | Ana not |
|---|---|---|---|
| NPC zihni / yapısal hafıza (`npc-mind.ts`) | ~85% | 🟢 | 34 anı türü, decay, travma, nam, davranış kademesi portlandı |
| Tohum sistemi (seeds/sowSeed/germinate) | ~80% | 🟢 | `LIFE_EVENT_SEEDS` (Vercel 13 eşleme) APK'da kısmi |
| Hikâye arc / quest motoru (`arcs.ts`) | ~85% | 🟢 | 13 arc, ~52/60 adım; seçim+cooldown var |
| Başarımlar (`achievements`) | ~95% | 🟢 | ~40 rozet portlandı |
| Kariyer merdiveni + skill-XP (`skills.py`) | ~70% | 🟡 | 15/30 meslek, perk sistemi ~%80 |
| Stat-XP ilerleme eğrisi | ~90% | ✅ | PORTLANDI: stat_xp + addStatXp (eğri 25+lvl×15); iş/ders/savaş özelliği kullanımla büyütür; karakter ekranında ilerleme çubuğu; stat_points'e EK |
| Şehir yönetimi (`city_governance.py`) | ~90% | ✅ | PORTLANDI: vergi oranı (tradeoff) + halk memnuniyeti + şehir hazinesi + hazineden proje (hizmet/asayiş); memnuniyet→meşruiyet→azil döngüsü |
| Evlat eğitimi (`legacy_system.py`) | ~95% | ✅ | PORTLANDI: haftalık biriken eğitim yolu (EDU_TRACKS) + UI + 6 dil; vâris bonusu aylara göre ölçekli |
| Aile görevleri (`family_quests.py`) | ~50% | 🟡 | 8/16 görev; ark-zinciri (requires) yok |
| Mülk (`property_system.py`) | ~60% | 🟡 | 4 tip+işçi var; han, ledger, gerçek mevsim çevrimi yok |
| Suç reworku (`crime_rework.py`) | ~55% | 🟡 | kesinti sahnesi var; keşif, kaçış planı, sıcak mal yok |
| Pazarlık (`bargain.py`) | ~50% | 🟡 | sabır ibresi+blöf var; satıcı kişiliği, koz, nam koruması yok |
| Çalışma reworku (`work_rework.py`) | ~50% | 🟡 | 4 tarz var; mesleğe özel mini-olay havuzu sığ |
| Hikâye Yönetmeni (`story_director.py`) | ~45% | 🟡 | gerilim+nefes+doruk var; **kıvılcım kartları, perdeler, event-bias yok** |
| Eşya + kalite (`items.py`/`quality.py`) | ~40% | 🔴 | kalite sistemi (kusurlu/iyi/usta işi + tuzak) tamamen yok |
| Seyahat reworku (`travel_rework.py`) | ~30% | 🔴 | 3 rota var; kervan yolcu profilleri ve olay seçimleri yok |
| Savaş (`combat_engine.py`) | ~25% | 🔴 | duruş+kart var; yaralanma kademesi, niyet ipucu, kuşatma/turnuva çok-aşama yok |
| Üretim zincirleri (`production_chains.py`) | ~80% | ✅ | PORTLANDI: işçili mülk gerçek hammadde üretir (tarla→buğday, değirmen→un) → mevcut tarif/zanaat zincirini besler (propYield); zaten zengin RECIPES + kalite vardı |
| Tipli dünya olayları (`world_events.py`) | ~85% | ✅ | PORTLANDI: lokasyon-bazlı (kuraklık/bereket/eşkıya/panayır/yangın/veba) — fiyat/mülk geliri/seyahat/kişisel etki; diyar "Şehirde Olanlar" |
| Fraksiyon AI + güç yüzeyi (`faction_system.py` 4258) | ~55% | ✅ | PORTLANDI (hissedilir dilim): görünür örgüt eylemleri (bağış/sabotaj→eşkıya olayı/nüfuz→sancak/suikast→rakip güç) + oyuncu-güç (himaye/kese). Daha fazla AI eylemi derinleştirme olarak eklenebilir |
| Diyalog (`dialogue.py` 1464) | ~15% | 🔴 | APK 4 niyet; Vercel 8 konu × 4 katman (bağlam/hafıza/spontane) yok |
| Mektep (`school.py` 1648) | ~15% | 🔴 | 4 ders+sınav var; ders olayları, kulüpler, hoca hafızası, mevsim etkinlik yok |
| Eyleme dönük söylentiler (`rumors.py`) | ~75% | ✅ | PORTLANDI: piyasa ipucu (deterministik GERÇEK arbitraj: ucuz→pahalı şehir) + fraksiyon istihbaratı (savaş önceden duyulur); Haberler'de "Duyumlar". NPC sırrı/şantaj kaldı (bounty NPC yok) |
| NPC etkileşim eylemleri (`npc_interactions.py`) | 4/9 | 🔴 | iltifat/para/hakaret/flört/dedikodu/kaçırma/saldırı yok |
| Yaşam olayları / ikilemler (`life_events*.py`) | 56/169 | 🔴 | orta yaş + yaşlılık + ekonomik kriz ikilemleri eksik |
| Fırsatlar (`opportunities.py`) | 13/25 | 🔴 | sabit havuz; dünya olayına dinamik tepki yok |
| Anlatı motoru (`narrative_engine.py`) | ~20% | 🔴 | eulogy/epithet var; ilişki-temelli ölüm/doğum/savaş anlatısı + yıllık özet yok |
| NPC profil derinliği (`npc_profile.py`) | sade | 🔵 | sır/aktivite/haftalık yaşam yok — **offline deterministik tasarım, kasıtlı** |
| NPC yaşlanma/ölüm/doğum (`simulation.py`) | yok | 🔵/🔴 | Vercel'de de pasif; APK deterministik tasarımı KORUNMALI (offline) |

---

## DENGE SAPMALARI (önce bunlar — küçük efor, büyük etki)

`backend/balance_config.py` ↔ `mobile/lib/game.ts` karşılaştırması:

| Parametre | Vercel | APK | Sapma | Etki |
|---|---|---|---|---|
| Haftalık açlık kaybı (yetişkin) | 5 | 8 | +%60 | Oyuncu çok hızlı acıkıyor |
| Açlık 0'da haftalık hasar | −2 | −6 | 3× | Çok daha hızlı ölüm |
| Doğal sağlık rejenerasyonu | +1 | +2 | 2× | Hasardan çok hızlı iyileşme |
| Mevsim açlık çarpanı | 4 mevsim (İlkbahar 1.0 … Kış 1.3) | sadece Kış 1.3 | İlkbahar/Yaz/Sonbahar yok | Mevsim hissi zayıf |
| Stamina açlık indirimi | 0.15 | yok | — | Dayanıklılık açlığı azaltmıyor |
| Enflasyon (haftalık) | ~%0.1 | %0 | — | Uzun oyunda pazar çökmüyor |

> Not: Bu sapmalar oyun dengesini ölçülebilir biçimde değiştiriyor; doğrulanıp tek tek
> hizalanmalı (smoke ile A/B). Düzeltmesi küçük, etkisi büyük.

---

## DOMAİN BAZINDA DETAY

### 1) Çekirdek haftalık tick (`simulation.py` → `advance()`)
Vercel tick sırası (özet): yaşlanma/ölüm → evlilik/doğum → ölü NPC budama → ekonomi →
kervan → rastgele olay → piyasa olayı → görev üretimi/süresi → dünya olayı → NPC profil
tiki → aile desteği → işgal kontrolü → oyuncu tiki → otomatik yeme.
APK `advance()` karşılığı: turn, kervan, piyasa, dünya olayı (dar kapsam), oyuncu tiki var.
**Eksik:** dinamik görev üretimi/süre, işgal dalgaları, otomatik yeme, ay-sonu "hasat" UI,
NPC profil rutinleri. (NPC yaşlanma/ölüm bilinçli olarak APK'da yok — offline tasarımı.)

### 2) Fraksiyon AI + güç yüzeyi
Vercel `faction_system.py` (4258 satır) bir **dinamik dünya**: ~30 AI eylemi (savaş aç,
suikast, sabotaj, manipülasyon, darbe hazırlığı/fazları, isyan/iç savaş, ambargo, fetva/şeriat,
bölge infiltrasyonu, paralı asker, gizli cemiyet operasyonları + ifşa, koalisyon tetikleme),
faksiyonlar arası ilişki skoru (−100..+100), casus belli, ateşkes, NPC'lerin faksiyon değiştirmesi.
APK'da: katıl/görev/rütbe/sancak gerilimi/savaş + sosyal eksenler. **Diplomasi, çöküş, gizlilik
katmanları %0.** En önemli 3: gizli cemiyet operasyonları+ifşa (büyük), darbe+NPC isyan (büyük),
ilişki skoru+koalisyon (orta).

### 3) Diyalog & NPC etkileşimi (sıradaki iş için en yüksek değer)
`dialogue.py` mimarisi: **8 konu** (selam/iş/aile/dünya/hakkımda/üzgün/hedef/veda) × **4 katman**
(konu havuzu → bağlam enjeksiyonu → hafıza geri çağrımı ~%30 → NPC spontane gündemi ~%25) +
flavor katmanları (meslek farkındalığı, kişilik, suç/itibar filtresi, tekrar cezası).
`PROFESSION_TALK` 18 meslek × ~10 satır. `conversation.py`: 3'lü sohbet kartı (güvenli/riskli/kişisel),
hediye tercihleri (meslek+kişilik → 0× … 2.5×).
APK: `dialogue.ts` (60 satır) **4 niyet** (hoşbeş/iltifat/dert/şaka) — konu/bağlam/hafıza/spontane yok.
NPC eylemleri: VAR → giftTo, proposeMarriage, helpNpcGoal, exploitNpcGoal. YOK → iltifat,
para verme, hakaret, flört, dedikodu, kaçırma, saldırı (`npc_interactions.py` 9 eylemden 4'ü).
Eksik mekanikler: cooldown/spam cezası, tanık→dedikodu kaskadı, meslek hediye tercihi, nam efektleri.
**İş kalemleri (sıralı):** (a) konu yapısı + i18n havuzu, (b) 4 katmanlı `converse` motoru,
(c) eksik 5-7 NPC eylemi, (d) hediye tercihi + nam efektleri.

### 4) Mektep (`school.py` 1648 → ~%15)
Vercel: 4 ders + ders olayları (%85, her derste 2-3 seçim, "cesur" seçenek hoca anısına yazılır),
hoca NPC ilişkisi, 3 öğrenci topluluğu (koro/güreş/çırak), mevsimsel çocukluk etkinlikleri,
özel olaylar (düğün/bayram/yangın/cenaze), sınıf rekabeti, mezuniyet.
APK: 4 ders + 4 derste sınav (stat testli). **Olaylar, kulüpler, hoca hafızası, etkinlikler yok.**

### 5) Savaş (`combat_engine.py` 474 → ~%25)
Vercel: 4 tür (düello/soygun/turnuva/kuşatma), turnuva/kuşatma çok-aşamalı, rakip niyet ipucu
(%70 doğru), yaralanma kademesi (sıyrık→yara→ağır→sakatlık→ölüm, kalıcı sakatlık tavanı 3),
komutan modu (3 stratejik karar ±%30). APK `combat.ts` (79): duruş + taş-kağıt-makas kart var;
**çok-aşama, niyet ipucu, yaralanma kademesi, komutan modu yok.**

### 6) Ekonomi: üretim zincirleri / dünya olayları / fırsatlar / söylentiler
- Üretim: APK'da işçi tut/çıkar UI var ama üretime etki ve kâr yok; ham→ara→nihai akışı yok.
- Dünya olayları: APK piyasa fiyat çarpanı + 4 çağ olayı (epoch) var; lokasyon `wealth/security/
  prosperity/population` etkisi ve haftalık sönüm yok (Vercel 13 olay gerçek etkili).
- Fırsatlar: APK 13 sabit şablon; Vercel 25 dinamik (kuraklık→su taşı, salgın→ilaç ara) — adaptasyon yok.
- Söylentiler: APK yüzleş/yay/sustur; Vercel piyasa ipucu (arbitraj), NPC sırrı (şantaj), fraksiyon
  istihbaratı gibi **eyleme dönük** söylenti yok.

### 7) Yaşam olayları / ikilemler (56/169)
Vercel `life_events.py` (100) + `life_events_v2.py` (69) = 169. APK `events.ts` = 56 (gençliğe ağır).
Eksik kümeler: yetişkinlik (−~52) ve orta yaş (−~33) ikilemleri; ekonomik krizler (borç tuzağı,
tefeci, kuraklık, vergi kararı, sefer çağrısı), siyasi (muhtarlık/lonca seçimi), toplumsal (sel,
veba, asker toplama). En hızlı kazanç: v2'den 40-50 olayı `events.ts`'e taşımak.

### 8) Hikâye Yönetmeni & anlatı (`story_director.py`/`narrative_engine.py`)
VAR: gerilim hesabı+güncelleme, nefes kuralı, tohumlar (sow/seed/germinate), nesil aşma.
EKSİK: **kıvılcım kartları** (durgunlukta 10 kartlı deste — devir notu doğrulandı), doruğun pozitif
varyantları (cömert nam doruğu, hanedan), `LIFE_EVENT_SEEDS` seçim→tohum eşlemesi, **perdeler**
(Chronicle 2.0 dinamik bölüm başlıkları), event-bias (nefeste gergin olayları eleme), ilişki-temelli
ölüm/doğum/savaş anlatıları, yıllık hikâye özeti, paylaşılabilir final kartı.

### 9) NPC zihni/profil/dünya
`npc-mind.ts` Vercel `npc_mind.py`'nin ~%85'i (anı türleri/decay/travma/nam/davranış kademesi tam).
Küçük açık: rüşvet-sonrası "dolandırıcılık" söylentisi döngüsü, söylenti yoğunluğu kalibrasyonu.
`npc_profile.py` derinliği (30 hedef, 50+ sır, 200+ aktivite, haftalık yaşam olayları) APK'da
**kasıtlı olarak sade** — offline deterministik tasarım gereği (KORUNMALI).

---

## ÖNERİLEN ÖNCELİK SIRASI

1. **Denge hizalama** (açlık/sağlık/mevsim sabitleri) — küçük efor, dengeyi hemen düzeltir.
2. **Diyalog derinliği** (8 konu + 4 katman + eksik NPC eylemleri) — oyuncu deneyimine en yüksek etki.
3. **Hikâye Yönetmeni kıvılcım kartları + perdeler** — dramaturji makinesinin eksik ayağı.
4. **Yaşam olayı içeriği** (v2'den 40-50 ikilem) — düşük risk, yüksek doluluk.
5. **Mektep olayları/kulüpler** — büyük ama çocukluk fazına derinlik katar.
6. **Fraksiyon AI eylemleri** (ilişki skoru+koalisyon → darbe/isyan) — dünyayı "canlı" yapar.
7. **Savaş yaralanma + niyet ipucu**, **eşya kalite sistemi**, **üretim/dünya-olay etkileri** — derinlik.

---

## TUZAKLAR / NOTLAR

- Perl `-i` UTF-8'i bozar → i18n düzenlemede Python `io.open(encoding='utf-8')` kullan.
- Smoke ~5 dk (yaşayan-dünya yüzünden yavaş, "takıldı" sanma); hızlı ölçüm için `i < 300`→`i < 30`.
- APK 100 MB sınırı → daima `-PreactNativeArchitectures=arm64-v8a`; Gradle 8.14.3 (9.x IBM_SEMERU hatası).
- Her commit öncesi güvenlik kapısı: `cd mobile && npx tsc --noEmit` + `bash scripts/smoke.sh` (HATA:0).
- **Taze konteyner:** `mobile/node_modules` ephemeral; yoksa önce `cd mobile && npm install --no-audit --no-fund` (~25 sn). Sonra tsc/smoke çalışır (smoke esbuild'i `npx` ile çeker).
- Kural: mevcut çalışan sistemi BOZMA, üzerine ekle (additif port); APK'da daha iyi olanı KORU.
- Bu rapordaki satır/yüzde değerleri ajan taramasından gelir; bir maddeye dokunmadan önce ilgili
  Vercel modülü + APK karşılığı tekrar okunup doğrulanmalı.

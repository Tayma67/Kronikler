# Kronikler — Tam Oyun Analizi ve Test Raporu

Tarih: 2026-06-12 · Yöntem: oyuncu-bot (gerçek HTTP rotaları, mongomock ile
DB'siz) + fonksiyon seviyesi sistem testleri + statik debugger taraması.
Test aracı repoda: `backend/tools/player_bot.py` (tekrarlanabilir).

---

## 1. Test Yöntemi

**Oyuncu gibi:** Bot kayıt olur, yeni oyun açar ve gerçek API üzerinden
yaşar: mektep dersleri/olayları, hafta planı, sohbet eli, amaç eylemleri,
ekmek alımı, ticaret+pazarlık, iş/meslek, suç, savaş, flört→evlilik,
hanedan teklifleri/yakınlaşma, nam söylentileri (yüzleş/sustur/yay),
mülk alımı, nesil devri. Her haftadan sonra invariant denetimi: para/sağlık
sınırları, yaş, state'in JSON'lanabilirliği.

**Debugger gibi:** para/sağlık/itibar mutasyon noktalarının kelepçe taraması,
liste büyüme (cap) denetimi, 10-30 yıllık simülasyonlarda state boyutu ve
nüfus eğrisi, 1300+ oyuncu-görünür metinde bozuk yer tutucu/None avı,
300 savaşlık combat fuzz, ekonomi anomali taraması.

## 2. Bulunan ve DÜZELTİLEN Buglar

| # | Önem | Bug | Düzeltme |
|---|------|-----|----------|
| 1 | KRİTİK | **Auth router hiç mount edilmemişti** — frontend'in AuthContext'i `/api/auth/login\|register\|me` çağırıyor, hepsi 404'tü. Oyun X-Device-ID ile çalıştığından oynanış etkilenmemiş ama kayıt/giriş tamamen ölüydü | `server.py`'a `build_auth_router` eklendi |
| 2 | KRİTİK | **Tohum etkisi parayı eksiye düşürüyordu** — "kayıp kese" tohumu (-20 altın) 10 altınlı çocuğu -10'a indirdi (bot para-iziyle kanıtlandı) | `_germinate` 0'da kelepçeler |
| 3 | ORTA | **Ölü NPC budaması aile bağlarını siliyordu** — kan davası (nemesis mirası), miras ve anlatı, ölünün `children_ids`'ine bakar; budama sonrası sessizce çalışmazdı | Mezar taşı kaydında parent/children/spouse/dynasty bağları korunuyor |
| 4 | ORTA | **Nüfus/state şişmesi** — doğum tavansız: 20 yılda 1820 canlı NPC, 6.4MB state (her istek tam state'i yükler/yazar; Mongo 16MB döküman limiti ufukta) | Nüfus tavanı (kuruluşun 1.5×'inde frenler, 2.5×'te durur) + sınırsız büyüyen `personal_events` kırpıldı. Sonuç: 30 yılda ~1000 canlı, ~4.5MB sabit |
| 5 | ORTA | **İtibar sınırsızdı** — 11 yaşındaki test oyuncusu life-event ödülleriyle itibar 148'e ulaştı (etiketler/etkiler 0-100 varsayar) | Haftalık tick'te ±100 kelepçesi |
| 6 | DÜŞÜK | Oyuncuya görünür metinde ham stat adı: "CHARISMA en az 2 olmalı" | Türkçe stat etiketleri |
| 7 | DÜŞÜK | `npc_profile.py`'da Kiril harf sızıntısı: "edinди" | Düzeltildi |

## 3. Doğrulanan Sistemler

| Sistem | Test | Sonuç |
|---|---|---|
| Kayıt → yeni oyun → haftalık döngü | Bot, yüzlerce hafta | ✓ temiz |
| Mektep kariyeri | Kayıt→ders/olay→15 sınav→kulüp→mezuniyet (288 hafta) | ✓ 0 hata |
| Sohbet eli + NPC Zihni | Bot her hafta; kademe/anı/amaç akışı | ✓ |
| Ticaret + pazarlık + kupon | Bot + fonksiyon | ✓ guard'lar sağlam |
| Savaş motoru | 300 savaş fuzz, 4 tür: zafer/yenilgi/kaçış/ölüm hepsi erişilir, HP-para sınırlı, takılma yok | ✓ 0 hata |
| Seyahat (R7) | 30 rota+olay çözümü | ✓ 0 hata |
| Mülk döngüsü | al→işçi→yükselt→hasat(180 buğday)→sat | ✓ |
| Fraksiyon | katıl→30 hafta→ayrıl | ✓ |
| Fırsatlar | kabul→tamamla (başarı/fiyasko) | ✓ |
| Kervan | kur→8 haftada döndü, kâr işlendi | ✓ |
| Hanedanlar | teklif/yakınlaşma/sabotaj/veraset; lig tablosu | ✓ |
| Nam & söylenti | yüzleş/sustur/yay; korumalar | ✓ |
| Yönetmen/tohum/nemesis | birim + uzun simülasyon | ✓ |
| Nesil devri | fonksiyon + bot (ölüm→miras→devam) | ✓ |
| Metin kalitesi | 8 yıllık simde 1309 benzersiz metin | ✓ bozuk yer tutucu/None yok |
| Ekonomi | 10 yıl, 368 fiyat, NPC servetleri, hazineler | ✓ anomali yok |
| State sözleşmesi | her hafta JSON dump | ✓ |

## 4. Düzeltilmeyen Bulgular (bilinçli — tasarım/altyapı kararı)

1. **İtibar enflasyonu (denge):** Kelepçe tavanı koydum ama kaynak duruyor:
   life-event'lerin çoğu +3-5 itibar veriyor ve haftada ~1 event çözülüyor →
   çocuk 2 yılda 100'e dayanıyor. Öneri: event itibar ödüllerini 1-2'ye
   çekmek VEYA haftalık %2 sönüm (0'a doğru).
2. **State mimarisi:** Tüm dünya tek Mongo dökümanı; her istek ~4MB
   yükler/yazar. Bin oyunculu üretimde gecikme/band genişliği sorunu olur.
   Öneri (büyük iş): world/player/history'yi ayrı koleksiyonlara bölmek.
3. **Frontend auth ölü kodu:** `AuthProvider` hiç mount edilmemiş,
   Login/Register sayfaları route'lanmamış (`useAuth` null-crash ederdi).
   Oyun kimliği = cihaz UUID'si → cihaz değişince kayıt kaybolur, kayıt
   paylaşımı/aktarımı yok. Backend auth artık hazır (bug #1); istenirse
   UI bağlanabilir. Railway'de `JWT_SECRET` env'i tanımlı olmalı.
4. **Savaş yenilgi sarmalı (denge):** Kalıcı sakatlıklar üst üste binebilir;
   art arda kaybeden oyuncu kalıcı -stamina biriktirir. Öneri: kalıcı
   sakatlığa üst sınır (örn. 3).
5. **Tarla negatif nakit akışı (denge/UX):** Bakım+maaş haftalık para
   çekerken hasat yılda bir gelir — defterde aylarca eksi görünür (satınca
   kâra geçer). UX: "hasat bekleniyor" değeri ledger'da gösterilebilir.

## 5. Bot Final Koşusu

(BOT_SEED=99, 500 döngü, tüm düzeltmeler aktif — sonuçlar aşağıda)

<!-- FINAL_RUN -->

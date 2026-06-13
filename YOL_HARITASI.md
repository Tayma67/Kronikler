# Kronikler: Küllerin Mirası — Yol Haritası (Yayına Doğru)

> Durum: Çekirdek + tüm ana sistemler taşındı, offline APK/AAB çıkıyor.
> Eksik olan: **his, denge, yazım, sanat ve gerçek cihaz cilası.** Bu belge
> bunları yayına hazır hâle getirmek için. Etiketler: **[BEN]** kod/içerik
> bende, **[SEN]** karar/sanat/cihaz/Play sende, **[BİRLİKTE]** geri bildirim döngüsü.

---

## 0. Çalışma Düzeni
- **Döngü:** Sen telefonda oynarsın → bug/his notunu atarsın → ben düzeltir, derinleştiririm → yeni APK.
- Ben RN'i **gözle göremiyorum**; bu yüzden görsel/akış kararlarında senin geri bildirimin kritik.
- Her değişiklik `tsc` + bundle ile doğrulanır; haftada birkaç test APK + sürüm dönümlerinde AAB.

---

## 1. HİS (Game Feel) — "elime iyi geliyor" hissi
**Hedef:** Her dokunuş tatmin etsin; geçişler yumuşak, anlar akılda kalsın.

- [ ] **[BİLİNDE]** Geçiş animasyonları: ekranlar arası fade/slide, kart açılışları (react-native-reanimated). **[BEN]**
- [ ] **Dokunsal geri bildirim (haptics):** önemli aksiyonlarda hafif titreşim (expo-haptics). **[BEN]**
- [ ] **Ay ilerletme ritmi:** "Ayı İlerle"de kısa bir geçiş/parşömen efekti, olayların sırayla belirmesi. **[BEN]**
- [ ] **Dönüm noktası perdeleri:** şu an sade; küçük ışıltı/ses ile daha "olay" hissi. **[BEN]**
- [ ] **Boşluk/tipografi cilası:** başlık hiyerarşisi, satır araları, kenar boşlukları — cihazda göz kontrolü. **[BİRLİKTE]**
- [ ] **Yükleniş & splash:** açılışta tema rengiyle akıcı giriş (splash eklendi, cihazda doğrula). **[SEN test]**
- **Kabul:** 5 dk oynayınca "akıcı ve özenli" hissi; kör nokta/sarsıntı yok.

---

## 2. DENGE (Balance) — adil ve sürükleyici
**Hedef:** Ne çok kolay ne sinir bozucu; her yol (zanaat/savaş/ticaret/gölge) uygulanabilir.

Mevcut sayılar (ayar yapılacak yerler — `mobile/lib/game.ts`):
- Beceri: 100 XP = 1 seviye; aksiyon başına 5–14 XP.
- Çalışma kazancı: `base + stat*2 + rnd(6)` × unvan × hüner çarpanı.
- Ölüm: 55+ artan risk; açlık 20 altı sağlık −6/ay.
- Savaş: güç farkı × 0.05 başarı; encounter güç 6–18.

- [ ] **[SEN→BEN]** 3–4 nesil oynayıp not al: "çok hızlı zenginleştim / sürekli açım / savaş çok kolay/zor / ilerleme yavaş". **[BİRLİKTE]**
- [ ] Erken oyun eğrisi: 13–20 yaş geçim sürdürülebilir mi? **[BEN]**
- [ ] Ekonomi: kasaba-bazlı fiyat + kıtlık/bolluk + kervan kârı dengeli mi (sömürü açığı var mı)? **[BEN]**
- [ ] Savaş zorluğu: encounter güçleri ve yaralanma oranı; nemesis adil mi? **[BEN]**
- [ ] Beceri/perk hızı: bir ömürde kaç perk açılıyor (hedef ~6–9)? **[BEN]**
- [ ] Ömür temposu: bir nesil kaç "Ayı İlerle"de bitiyor (hedef: tatmin edici ama sürünmeyen)? **[BEN]**
- **Kabul:** Farklı meslek/yol seçimleri kazançlı; ölüm hak edilmiş hissi; "bir ay daha" dedirten ilerleme.

---

## 3. YAZIM (Writing) — oyunun ruhu
**Hedef:** Türkçe akıcı, döneme (1247) yakışır; tekrar az, his yüksek. (Cihaz gerekmez, hemen başlanabilir.)

- [ ] **Olay metni çeşitliliği:** aylık flavor, ikilemler, hikâye yayları — varyant sayısını artır (tekrar hissini kır). **[BEN]**
- [ ] **Roman (Hayatın Romanı):** olayları kuru cümle yerine **anlatısal** birleştir; bölüm geçişleri, kapanış künyesi zenginleştir. **[BEN]**
- [ ] **NPC diyalogu:** kişilik+ruh haline göre replik havuzunu genişlet; hafızaya gönderme ("geçen sefer..."). **[BEN]**
- [ ] **Dönem dili:** unvanlar, deyimler, mevsim/şehir betimleri — sözlük tutarlılığı. **[BEN]**
- [ ] **Onboarding/öğretici:** ilk 2 ayda nazik ipuçları (zorla değil). **[BEN]**
- [ ] **[SEN]** Ton kararı: ne kadar ağır/edebî vs sade? Birkaç örnek metin onayın. **[BİRLİKTE]**
- **Kabul:** 20 dk oynayınca metin tekrarları rahatsız etmiyor; roman okunası.

---

## 4. SANAT (Art) — görsel kimlik
**Hedef:** Kül & Köz estetiği; portreler/sahneler/ikonlar tutarlı ve güzel.

Mevcut: 14 portre (yaş×cinsiyet), 16 hero sahnesi (yaş×mevsim), 54 game-icon (altın vektör), yeni-oyun arkaplanı.

- [ ] **[SEN]** Portre derinliği kararı: mesleğe/loncaya/statüye göre varyant ister miyiz? (üretimi sen/araç ile) **[BİRLİKTE]**
- [ ] **Hero sahneleri:** önemli anlara özel (evlilik, savaş zaferi, ölüm, taht) görseller. **[SEN üretim → BEN bağlama]**
- [ ] **Lonca armaları / hanedan mühürleri:** 5 lonca + hanedanlar için amblem. **[SEN/araç → BEN]**
- [ ] **Eşya ikonları:** 24 eşya için tutarlı küçük ikon seti (şu an emoji+vektör karışık). **[BEN vektör / SEN özel]**
- [ ] **Harita görseli:** şu an düğüm yerleşimi; elle çizilmiş parşömen harita zemini. **[SEN → BEN bağlama]**
- [ ] **Tutarlılık geçişi:** tüm ekranlarda emoji→game-icon birliği. **[BEN]**
- **Kabul:** Ekranlar arası görsel dil bir bütün; "amatör" hissi yok.

---

## 5. CİHAZ CİLASI & TEKNİK (Device Polish / QA)
**Hedef:** Her telefonda sağlam, hızlı, kayıpsız.

- [ ] **[SEN]** Çok cihaz testi: küçük/büyük ekran, çentik, geri-tuşu davranışı. **[SEN→BEN]**
- [ ] **Uzun kayıt performansı:** çok nesil + uzun geçmiş (history 250 ile sınırlı, NPC 30) — takılma var mı? **[BİRLİKTE]**
- [ ] **Kayıt sağlamlığı:** sürüm güncellemesinde eski kayıt açılıyor mu (migration test). **[SEN test]**
- [ ] **Ses kalitesi:** sentetik tık/çan hoş mu, yoksa gerçek asset mi koyalım? **[BİRLİKTE]**
- [ ] **İkon/splash cihazda:** ana ekran ikonu ve açılış doğru mu. **[SEN test]**
- [ ] **Erişilebilirlik:** font ölçeği, kontrast, dokunma hedef boyutları. **[BEN]**
- **Kabul:** Çökme yok; 3+ nesil akıcı; güncelleme kaydı bozmuyor.

---

## 6. YAYIN (Release) — `mobile/YAYIN.md` ile birlikte
- [ ] **[SEN]** Google Play Developer hesabı (25$), uygulama imzalama.
- [ ] **[SEN/BİRLİKTE]** Mağaza metinleri (başlık, açıklama, kategori, içerik derecesi).
- [ ] **[SEN]** Ekran görüntüleri + öne çıkan görsel (oyunu oynayıp al).
- [ ] **[SEN]** Gizlilik politikası URL (oyun veri toplamıyor → basit).
- [ ] **[BİRLİKTE]** Play "internal testing" ile kapalı beta → geri bildirim turu.
- [ ] **AAB:** `eas build --profile production` (otomatik versionCode).

---

## 7. ZAMAN ÇİZELGESİ (~4 hafta)
| Hafta | Odak | Çıktı |
|------|------|-------|
| **1** | Denge + His + cihaz QA (senin ilk oynayışın) | Oynanış akıcı, dengeli; ilk bug turu kapandı |
| **2** | Yazım derinliği (metin/roman/diyalog/onboarding) | Tekrar azaldı, anlatı güçlendi, öğretici var |
| **3** | Sanat (portre/sahne/arma/ikon/harita) + ses | Görsel-işitsel kimlik bütünleşti |
| **4** | Çok-cihaz QA + performans + mağaza + kapalı beta | Play internal testing'de yayında |

---

## 8. HEMEN (bu hafta)
1. **[SEN]** Son test APK'sını kur, 2–3 nesil oyna, şunları not al: takıldığın yer, sıkıcı/sinir bozucu an, görsel bozukluk, anlamadığın mekanik.
2. **[BEN]** Sen oynarken paralel: **yazım derinliği** (cihaz gerektirmez) — olay/roman/diyalog metin havuzlarını genişletmeye başlarım.
3. **[BİRLİKTE]** Notların gelince 1. Hafta dengesine gireriz.

> Not: Bu belge yaşar; her hafta güncellenir. "Bir an önce" için en hızlı yol — senin oynayış notların + benim paralel yazım/denge çalışmam.

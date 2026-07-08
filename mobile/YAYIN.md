# Yayın Rehberi — Kronikler: Küllerin Mirası

## GÜNCEL BORU HATTI: Doğrudan APK (GitHub Actions — EAS/hesap gerekmez)
- **Tetikleme:** GitHub → Actions → "APK (yerel derleme - hesapsiz)" → Run workflow → branch `apk`.
- **Kalite kapısı:** Derlemeden önce `tsc --noEmit` + 300-hayat smoke koşar; geçmeyen kod APK'ya binemez.
- **Sürüm:** `versionCode` her derlemede `github.run_number` ile otomatik artar (üst üste kurulabilir).
- **Kalıcı indirme linki:** https://github.com/Tayma67/Kronikler/releases/download/apk-latest/Kronikler.apk
- **İmza:** debug anahtarı — doğrudan cihaza kurulum için yeterli; **Play Store için değil** (aşağıya bak).
- Yerel hızlı doğrulama: `cd mobile && npm run typecheck && npm run smoke`.

## GELECEK: Google Play (EAS ile)

## Yapı (build)
- **AAB üret:** `eas build --platform android --profile production`
  - `production` profili App Bundle (.aab) üretir; `autoIncrement` ile versionCode otomatik artar.
- **Test APK:** `eas build --platform android --profile preview` (cihaza doğrudan kurulur).
- Token: EAS hesabına bağlı `EXPO_TOKEN` ya da `eas login`.

## İzinler (temizlendi)
`plugins/withoutRecordAudio.js` config plugin'i şu izinleri kaldırır:
`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`.
Kalan izinler: `INTERNET`, `VIBRATE`, `MODIFY_AUDIO_SETTINGS`, `FOREGROUND_SERVICE*`
(ses çalma için; sesi tümüyle kaldırırsan bunlar da gider).
- Doğrulama: `npx expo config --type introspect` → manifest izinlerine bak.

## Play Console'a yüklemeden önce gerekenler (repo dışı, senin hazırlaman gereken)
- [ ] **Google Play Developer hesabı** (tek seferlik 25$).
- [ ] **Uygulama imzalama:** EAS "Google Play App Signing" ile uyumlu; ilk yüklemede yönergeleri izle.
- [ ] **Mağaza listesi:** başlık, kısa+uzun açıklama (Türkçe), kategori (Oyun > Rol Yapma / Simülasyon), içerik derecesi anketi.
- [x] **Görseller:** 512×512 uygulama ikonu → `mobile/store/icon-512.png` (hazır) · 1024×500 öne çıkan görsel → `mobile/store/feature-graphic.png` (hazır) · en az 2 telefon ekran görüntüsü (oyunu çalıştırıp al — sende).
- [x] **Gizlilik politikası:** `mobile/store/GIZLILIK.md` (TR+EN, hazır). URL olarak GitHub sayfası kullanılabilir:
  `https://github.com/Tayma67/Kronikler/blob/apk/mobile/store/GIZLILIK.md` — Play Console'daki "Privacy policy" alanına bu link yapıştırılır.
- [ ] **Data safety formu:** "Veri toplanmıyor / paylaşılmıyor" (oyun tamamen offline, AsyncStorage cihazda). MP BETA'ya girenler için "app functionality" amaçlı geçici oyun-içi durum paylaşımı işaretlenebilir — GIZLILIK.md'deki MP maddesiyle uyumlu.
- [ ] **Hedef API seviyesi:** EAS varsayılanı güncel Play gereksinimini karşılar.

## Sürüm
- `app.json` version: `1.0.0` · `eas.json` `appVersionSource: remote` + `production.autoIncrement: true` → versionCode EAS'te yönetilir.

## Notlar
- Oyun tamamen **çevrimdışı**; sunucu/hesap gerektirmez, kayıt AsyncStorage'da (`kronikler_save_v1`).
- Ses efektleri varsayılan **kapalı** (Ayarlar'dan açılır); arka plan müziği varsayılan **açık** (sade modda/düşük RAM cihazda varsayılan kapalı, arka planda otomatik susar).

## Yayın Günü Kontrol Listesi (son 24 saat)

1. **Değişiklik dondurma:** Yayından 12 saat önce yeni özellik girmez; yalnız kritik düzeltme (tam doğrulama hattıyla).
2. **Son build:** En son commit'i kapsayan APK'yı tetikle, `apk-latest` linkinin o build'i verdiğini indirerek doğrula.
3. **Temiz cihaz duman testi:** APK'yı hiç kurulmamış bir telefona kur → yeni oyun → isim/cinsiyet (kadınla da dene) → ilk 12 ay → kayıt/çık/gir → "Devam Et".
4. **Eski kayıt testi:** Önceki sürüm yüklü cihazda üzerine kur; kayıt açılmalı (göç bekçisi CI'da da koşuyor).
5. **Paylaşım linki:** `https://github.com/Tayma67/Kronikler/releases/download/apk-latest/Kronikler.apk` — kalıcıdır, her build'de en günceli verir.
6. **MP (opsiyonel):** Sunucu güncellemesi için `cd server && npx wrangler deploy` (canlı v2'de kaldıysa MP BETA eski protokolde çalışır; SP etkilenmez).
7. **Kalıcı imza (opsiyonel, Play Store öncesi şart):** `keytool -genkeypair -v -keystore kronikler.keystore -alias kronikler -keyalg RSA -keysize 2048 -validity 10000` → GitHub Secrets'a `KEYSTORE_BASE64` + `KEYSTORE_PASSWORD` → sonraki build otomatik kalıcı imzalı. İmza değişimi mevcut kurulumlara "kaldır-yeniden kur" gerektirir; geniş dağıtımdan ÖNCE yapılmalı.

## Mağaza görselleri

- **Öne çıkan görsel (feature graphic, 1024×500):** `mobile/store/feature-graphic.png` — hazır, doğrudan Play Console > Mağaza girişi > Grafikler alanına yüklenir. Kaynağı repo içi fresk + Cinzel; istenirse `store/` altında yeniden üretilebilir.
- Ekran görüntüleri: cihazdan alınmalı (min 2 adet, 16:9 veya 9:16). Önerilen sahneler: pano (hero + şerit), savaş meydanı, harita, nesil ekranı, pazar.

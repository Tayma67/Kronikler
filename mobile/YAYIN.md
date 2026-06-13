# Google Play Yayın Kontrol Listesi — Kronikler: Küllerin Mirası

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
- [ ] **Görseller:** 512×512 uygulama ikonu, 1024×500 öne çıkan görsel, en az 2 telefon ekran görüntüsü (oyunu çalıştırıp al).
- [ ] **Gizlilik politikası URL'si** (zorunlu). Oyun çevrimdışı/veri toplamıyor → basit bir "veri toplanmaz" politikası yeterli.
- [ ] **Data safety formu:** "Veri toplanmıyor / paylaşılmıyor" (oyun tamamen offline, AsyncStorage cihazda).
- [ ] **Hedef API seviyesi:** EAS varsayılanı güncel Play gereksinimini karşılar.

## Sürüm
- `app.json` version: `1.0.0` · `eas.json` `appVersionSource: remote` + `production.autoIncrement: true` → versionCode EAS'te yönetilir.

## Notlar
- Oyun tamamen **çevrimdışı**; sunucu/hesap gerektirmez, kayıt AsyncStorage'da (`kronikler_save_v1`).
- Ses varsayılan **kapalı** (Ayarlar'dan açılır).

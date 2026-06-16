# EAS ile Android Derleme — Kurulum (telefondan yapılabilir)

## Tek seferlik hazırlık
1. **Expo hesabı** aç (ücretsiz): https://expo.dev  → kayıt ol.
2. **Erişim anahtarı** üret: expo.dev → sağ üst profil → **Account settings → Access tokens → Create token**. (Bir kez gösterilir, kopyala.)
3. **GitHub gizli anahtarı** ekle: bu repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `EXPO_TOKEN`
   - Value: (2. adımdaki token)
4. **Proje bağlama** (bir kez): `mobile/app.json` içine `extra.eas.projectId` gerekir. Bunu ben senin token'ınla bağlarım ya da ilk derlemede oluşur.

## Derleme (her seferinde)
- GitHub → **Actions** → "Android Derleme (EAS)" → **Run workflow** → profil seç:
  - **preview** → kurulabilir test `.apk` (Android cihazda).
  - **production** → Play Store için `.aab`.
- Derleme **Expo bulutunda** çalışır; bittiğinde **expo.dev → Projects → Builds** altında indirme bağlantısı çıkar (telefondan da indirilir).

## Play Store'a yükleme
- Google Play **geliştirici hesabı** (tek sefer 25$) gerekir: https://play.google.com/console
- `production` AAB'yi Play Console → Üretim/İç test → yeni sürüm olarak yükle (telefon tarayıcısından yapılabilir).

## Senin telefonunda test (iPhone)
- Android derlemesi iPhone'a kurulmaz. iPhone'da test için **Expo Go** kullan (App Store) — JS uygulamayı canlı gösterir.

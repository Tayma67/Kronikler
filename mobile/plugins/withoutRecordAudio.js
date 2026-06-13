// İstenmeyen izinleri kaldırır: kayıt (RECORD_AUDIO), ekran-üstü (SYSTEM_ALERT_WINDOW),
// eski depolama izinleri. Ses çalma için gerekenler (MODIFY_AUDIO_SETTINGS, FOREGROUND_SERVICE*)
// ve INTERNET/VIBRATE bırakılır. Çevrimdışı oyun; mikrofon/depolama/overlay gerekmez.
const { withAndroidManifest } = require("@expo/config-plugins");
const STRIP = [
  "android.permission.RECORD_AUDIO",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];
const bare = STRIP.map((p) => p.replace("android.permission.", ""));

module.exports = function withoutUnneededPermissions(config) {
  if (config.android && Array.isArray(config.android.permissions)) {
    config.android.permissions = config.android.permissions.filter(
      (p) => !STRIP.includes(p) && !bare.includes(p)
    );
  }
  return withAndroidManifest(config, (cfg) => {
    const m = cfg.modResults;
    if (m.manifest && Array.isArray(m.manifest["uses-permission"])) {
      m.manifest["uses-permission"] = m.manifest["uses-permission"].filter(
        (p) => !(p && p.$ && STRIP.includes(p.$["android:name"]))
      );
    }
    return cfg;
  });
};

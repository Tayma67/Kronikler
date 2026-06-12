# Görsel QA — backend'siz ekran render

UI değişikliklerini **gerçek tarayıcıda** (Mongo/backend gerekmeden) görsel
doğrulamak için. `/game/state` sahte bir oyun state'iyle mock'lanır, diğer tüm
API çağrıları abort edilir (uygulama zaten bunlara karşı `.catch/try` ile
savunmalı). Bu hat gece çalışmasında 7 ekranı doğrulamak için kullanıldı.

## Kurulum (tek sefer)
```bash
# 1) Üretim derlemesi (eslint react-hooks dahil gerçek build)
cd frontend && CI=false npm run build

# 2) Görsel QA bağımlılığı (proje dependency'si DEĞİL — sadece dev/QA)
cd /tmp && npm i playwright && npx playwright install chromium

# 3) Sahte state üret (backend çekirdeği, Mongo gerekmez)
cd <repo> && PYTHONPATH=backend PYTHONHASHSEED=0 \
  python frontend/tools/visual_qa/gen_state.py frontend/tools/visual_qa/state.json
```

## Kullanım
```bash
# SPA sunucusu (ayrı terminal / arka plan)
node frontend/tools/visual_qa/serve.js 8079 &

# Ekran görüntüsü al (route → png)
cd frontend/tools/visual_qa
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node screenshot.js /oyun           /tmp/dashboard.png  8079 state.json
node screenshot.js /oyun/ticaret     /tmp/trade.png      8079 state.json
node screenshot.js /oyun/karakter    /tmp/character.png  8079 state.json
node screenshot.js /oyun/hanedanlar  /tmp/dynasties.png  8079 state.json
```

Notlar:
- Uygulama açılışta state'i mock'tan alır; world dolu olduğu için otomatik
  `/oyun`'a yönlenir. Doğrudan alt route'lar (`/oyun/ticaret`) SPA fallback
  sayesinde çalışır.
- Veri-bağımlı listeler (ilişkiler, hanedanlar vb.) boş-durum gösterir — bu
  uçlar mock'ta abort edildiği için normaldir; tema/yerleşim yine doğrulanır.
- `state.json` git'e EKLENMEZ (üretilir). Yaş 14'e ilerletilir → yetişkin UI açık.

#!/usr/bin/env bash
# Canlı MP entegrasyon testleri (deploy edilmiş sunucuya karşı). 2+ WebSocket istemcisi
# açıp katıl→senkron→tick→beylik/sosyal/NPC/offline akışlarını uçtan uca doğrular.
# Kullanım: bash server/test/run-all.sh   (MP_URL ile başka sunucu hedeflenebilir)
set -e; cd "$(dirname "$0")"
CA=${NODE_EXTRA_CA_CERTS:-/root/.ccr/ca-bundle.crt}
for f in mp_itest mp_itest2 mp_itest3 mp_itest4 mp_itest5 mp_itest6 mp_itest7 mp_itest8 mp_itest9 mp_itest10 mp_itest11; do
  echo "=== $f ==="
  NODE_EXTRA_CA_CERTS="$CA" node "$f.cjs" | grep -E "SONUÇ|✓|HATA:" || true
done

#!/usr/bin/env bash
# Headless runtime smoke testi: çekirdeği (game.ts) esbuild ile node'a bundle edip
# binlerce hayat boyunca tüm aksiyonlarla koşturur. RN/i18n bağımlılıkları stub'lanır.
set -e
cd "$(dirname "$0")/.."
D=scripts/_smoke
npx esbuild lib/game.ts --bundle --platform=node --format=cjs --jsx=transform \
  --alias:react=$PWD/$D/react-stub.cjs --alias:react/jsx-runtime=$PWD/$D/react-stub.cjs \
  --alias:react/jsx-dev-runtime=$PWD/$D/react-stub.cjs --alias:react-native=$PWD/$D/react-stub.cjs \
  --alias:@react-native-async-storage/async-storage=$PWD/$D/as-stub.cjs \
  --outfile=/tmp/kronikler-game-bundle.cjs >/dev/null
node $D/run.cjs

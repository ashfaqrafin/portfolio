#!/bin/sh
# Usage: run.sh <outPrefix> <width> <height> <dpr> <times> [bench]
cd "$(dirname "$0")/.." || exit 1
npx next dev -p 3111 > .preview/dev.log 2>&1 &
DEV=$!
for i in $(seq 1 90); do
  if curl -s -o /dev/null http://127.0.0.1:3111/; then break; fi
  sleep 1
done
node .preview/shot.mjs "http://localhost:3111/?hero-debug" ".preview/$1" "$2" "$3" "$4" "$5" "$6"
kill $DEV 2>/dev/null
tail -n 15 .preview/dev.log

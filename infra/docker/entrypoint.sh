#!/usr/bin/env sh
set -e

if [ "$ROLE" = "frontend" ] || [ "$ROLE" = "web" ]; then
  API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3001/api}"
  mkdir -p /app/apps/frontend/public
  cat > /app/apps/frontend/public/env.js <<EOF
window.__ENV__ = { NEXT_PUBLIC_API_URL: "${API_URL}" };
EOF
fi

if [ "$ROLE" = "migrate" ]; then
  i=0
  until [ $i -ge 20 ]; do
    pnpm --filter backend prisma:migrate && pnpm --filter backend seed && exit 0
    i=$((i+1))
    echo "Migration attempt $i failed, retrying..."
    sleep 2
  done
  echo "Migration failed after 20 attempts"
  exit 1
fi

exec "$@"

#!/usr/bin/env sh
set -e

if [ "$ROLE" = "frontend" ] || [ "$ROLE" = "web" ]; then
  API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3001/api}"
  mkdir -p /app/apps/frontend/public
  cat > /app/apps/frontend/public/env.js <<EOF
window.__ENV__ = { NEXT_PUBLIC_API_URL: "${API_URL}" };
EOF
fi

exec "$@"

#!/bin/sh
# Daily jobs. Separated from the five-minute loop because running them on that
# cadence would be wasteful at best and, for anything that emails a customer,
# actively wrong.
set -u
. /etc/phoxta/worker-cron.env

post() {
  fn="$1"; body="$2"
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$SUPABASE_URL/functions/v1/$fn" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "x-cron-secret: $CRON_SECRET" \
    -H "Content-Type: application/json" \
    -d "$body")
  echo "$fn -> HTTP $code"
}

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
post billing-alerts '{}'   # renewal / trial-ending notices (0069 expects daily)
echo "daily done"

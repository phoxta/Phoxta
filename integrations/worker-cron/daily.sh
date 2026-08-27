#!/bin/sh
# Daily jobs. Separated from the five-minute loop because running them on that
# cadence would be wasteful at best and, for anything that emails a customer,
# actively wrong.
set -u
. /etc/phoxta/worker-cron.env

post() {
  fn="$1"; body="$2"
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    --connect-timeout 15 --max-time "${WORKER_CRON_MAX_TIME:-240}" \
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

# The wide sweep behind the five-minute one. ping.sh runs agent-catchup over the
# last six hours, which is right for a message the live path has just deferred —
# but a message that slipped through while the whole loop was down would fall out
# of that window and be lost, which is the original complaint again. Once a day
# over 48 hours catches those. Idempotent: anything already answered has a
# delivered reply after it and is no longer a candidate, and every gate (the
# switch, the watermark, the per-thread ceiling, the daily cap) runs again.
post agent-catchup '{"hours":48,"limit":10}'
echo "daily done"

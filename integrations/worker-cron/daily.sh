#!/bin/sh
# Daily jobs. Separated from the five-minute loop because running them on that
# cadence would be wasteful at best and, for anything that emails a customer,
# actively wrong. Scheduled at 06:15 UTC by deploy/oracle/install.sh.
#
# For weeks this file existed and was scheduled NOWHERE: install.sh installed
# ping.sh alone, so renewal warnings and the 48-hour catch-up never ran. Every
# worker below now beats cron_heartbeats, so a day with no beat shows on the
# console instead of being found out when a renewal goes out unannounced.
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
post billing-alerts '{}'   # renewal / trial-ending notices + the dunning ladder (0069 expects daily)

# The wide sweep behind the five-minute one. ping.sh runs agent-catchup over the
# last six hours, which is right for a message the live path has just deferred —
# but a message that slipped through while the whole loop was down would fall out
# of that window and be lost, which is the original complaint again. Once a day
# over 48 hours catches those. Idempotent: anything already answered has a
# delivered reply after it and is no longer a candidate, and every gate (the
# switch, the watermark, the per-thread ceiling, the daily cap) runs again.
post agent-catchup '{"hours":48,"limit":10}'

# Quality grading of the conversations the agent handled. It reads closed
# threads and writes scores, so once a day is plenty and five minutes would be
# a model call per tick for nothing new. Accepts the same shared cron secret.
post qa-scorer '{}'

# knowledge-build is NOT here on purpose: knowledge.sh owns it (03:30 UTC) and
# loops it until nothing is pending. Running it again here would walk every
# business a second time three hours later for no change.
echo "daily done"

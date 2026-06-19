#!/bin/sh
# Railway cron: nudge the Supabase background workers on a schedule so queued work
# gets processed even when no user is on the dashboard. Each function authorises
# the cron path off x-cron-secret; the anon key is only there to pass the gateway.
# Runs one-shot (see railway.json cronSchedule), then exits.
set -u

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

post embed-worker   '{}'                 # drain the RAG embedding queue
post agent-worker   '{}'                 # appointment reminders + outbound task queue
post gmail-sync     '{}'                 # pull connected Gmail inboxes into the unified Inbox
post automation-run '{"mode":"cron"}'    # run due scheduled AI automations (self-throttles)
echo "worker-cron done"

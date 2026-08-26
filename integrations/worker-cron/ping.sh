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

post embed-worker      '{}'              # drain the RAG embedding queue
post agent-worker      '{}'              # appointment reminders + outbound task queue
post gmail-sync        '{}'              # pull connected Gmail inboxes into the unified Inbox
post automation-run    '{"mode":"cron"}' # run due scheduled AI automations (self-throttles)

# Housekeeping that nothing was scheduling. ops-maintenance expires abandoned
# pending orders and restores their stock, flags SLA breaches and spreads
# unassigned conversations across the team -- all idempotent (SLA flagging
# dedupes through sla_events), so a five-minute cadence is safe and makes the
# SLA flag prompt rather than hourly.
post ops-maintenance   '{}'

# The autopilot tick: takes the objectives that are due, decides one next
# action for each, and runs it through the governed tool path. It also records
# the heartbeat that proves this whole script ran -- if cron_heartbeats stops
# advancing, the background loop has stopped, wherever it is hosted.
post objective-planner '{}'
echo "worker-cron done"

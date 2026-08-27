#!/bin/sh
# Cron tick — system cron on the Oracle Cloud VM. Nudges the Supabase workers on a schedule so queued work
# gets processed even when no user is on the dashboard. Each function authorises
# the cron path off x-cron-secret; the anon key is only there to pass the gateway.
# Runs one-shot (see deploy/oracle/install.sh for the schedule), then exits.
set -u

# The tick is one-shot on a */5 schedule (deploy/oracle/install.sh)
# and the calls are sequential, so ONE slow worker delays every worker after it —
# and mail is third in line. Without a ceiling a hung Twilio call in agent-worker
# pushes the mail sync past the next tick and the run is simply lost. 100s of
# connect+transfer each keeps the whole script inside its five minutes.
CURL_MAX="${WORKER_CRON_MAX_TIME:-100}"

post() {
  fn="$1"; body="$2"
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    --connect-timeout 15 --max-time "$CURL_MAX" \
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

# The repair worker, and the ONLY thing that retries a customer message the live
# path could not answer. gmail-sync replies to at most GMAIL_SYNC_MAX_REPLIES_PER_RUN
# messages a tick and files the rest; a model error, a provider 4xx or a function
# timeout leaves a message filed and unanswered; and the next sync skips all of
# them on the provider_sid dedupe without re-reading the gates. Left off the loop,
# every one of those is "an email came in and the AI did not pick it up" all over
# again, which is the bug this whole change exists to fix. Six hours back, five
# per business per tick, so a backlog drains steadily instead of in a burst.
post agent-catchup     '{"hours":6,"limit":5}'

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

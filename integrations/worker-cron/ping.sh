#!/bin/sh
# Cron tick — system cron on the Oracle Cloud VM. Nudges the Supabase workers on a schedule so queued work
# gets processed even when no user is on the dashboard. Each function authorises
# the cron path off x-cron-secret; the anon key is only there to pass the gateway.
# Runs one-shot (see deploy/oracle/install.sh for the schedule), then exits.
set -u

# ── WHY THE CALLS FAN OUT ────────────────────────────────────────────────────
#
# They used to run one after another. That made the tick's length the SUM of
# nine workers, so a single slow one spent everybody else's budget: with a 100s
# ceiling each, a bad tick could run past fifteen minutes while cron started
# another every five, and the log showed a steady trickle of HTTP 000 — curl
# giving up — concentrated in whatever sat late in the list. Mail was third.
#
# They are independent HTTP calls to independent workers, so there is nothing
# to gain from ordering them. Fanned out, the tick takes as long as the SLOWEST
# worker rather than all of them added up, and each gets its full ceiling.
#
# The one real ordering is kept: agent-catchup repairs what gmail-sync could not
# answer, so it still runs after the sync it repairs.
CURL_MAX="${WORKER_CRON_MAX_TIME:-100}"

# One tick at a time. The fan-out keeps a run well inside five minutes, but if
# Supabase is having a bad day a tick can still overrun, and a second one
# starting on top of it adds load to a backend that is already struggling —
# which is how a slow morning turns into a stuck one.
# It FAILS OPEN on purpose: if flock is missing or the lock file cannot be
# written, the tick runs unlocked rather than skipping. A lock that cannot be
# taken must never be able to stop the loop — that would turn a missing
# utility into a silent, total outage of every background worker.
LOCK=/var/lock/phoxta-worker-cron.lock
if command -v flock >/dev/null 2>&1 && : > "$LOCK" 2>/dev/null; then
  exec 9>"$LOCK"
  if ! flock -n 9; then
    echo "previous tick still running — skipping this one"
    exit 0
  fi
fi

OUT=$(mktemp -d) || exit 1
trap 'rm -rf "$OUT"' EXIT INT TERM

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
  rc=$?
  # curl reports 000 for "no HTTP response", which covers two different things
  # and the log used to blur them. Exit 28 is OUR ceiling running out — the
  # request reached Supabase and the worker carries on there after we hang up,
  # so it is not lost work and not something to go looking for. Anything else
  # is a connection that genuinely failed, which is worth noticing.
  if [ "$code" = "000" ]; then
    if [ "$rc" -eq 28 ]; then
      echo "$fn -> no reply within ${CURL_MAX}s (still running on Supabase)"
    else
      echo "$fn -> unreachable (curl exit $rc)"
    fi
  else
    echo "$fn -> HTTP $code"
  fi
}

# Each lane writes to its own file so the fan-out does not interleave lines
# mid-word; they are printed in a fixed order afterwards, so the log reads the
# same as it always did.
( post embed-worker      '{}' ) > "$OUT/1" 2>&1 &   # drain the RAG embedding queue
( post agent-worker      '{}' ) > "$OUT/2" 2>&1 &   # appointment reminders + outbound task queue

# Mail, and its repair worker, in that order.
#
# gmail-sync pulls connected Gmail inboxes into the unified Inbox. It replies to
# at most GMAIL_SYNC_MAX_REPLIES_PER_RUN messages a tick and files the rest; a
# model error, a provider 4xx or a function timeout leaves a message filed and
# unanswered; and the next sync skips all of them on the provider_sid dedupe
# without re-reading the gates. agent-catchup is the ONLY thing that retries
# those. Left off, every one is "an email came in and the AI did not pick it up"
# all over again, which is the bug this exists to fix. Six hours back, five per
# business per tick, so a backlog drains steadily instead of in a burst.
( post gmail-sync        '{}'
  post agent-catchup     '{"hours":6,"limit":5}' ) > "$OUT/3" 2>&1 &

( post automation-run    '{"mode":"cron"}' ) > "$OUT/4" 2>&1 &  # due scheduled AI automations (self-throttles)

# Housekeeping that nothing was scheduling. ops-maintenance expires abandoned
# pending orders and restores their stock, flags SLA breaches and spreads
# unassigned conversations across the team -- all idempotent (SLA flagging
# dedupes through sla_events), so a five-minute cadence is safe and makes the
# SLA flag prompt rather than hourly.
( post ops-maintenance   '{}' ) > "$OUT/5" 2>&1 &

# Scheduled social posts. One row per channel per post, claimed atomically, so
# two overlapping ticks cannot publish the same thing twice. This is what makes
# scheduling mean anything: the post goes out whether or not anybody has the
# dashboard open.
( post social-publish    '{}' ) > "$OUT/6" 2>&1 &

# The autopilot tick: takes the objectives that are due, decides one next
# action for each, and runs it through the governed tool path. It also records
# the heartbeat that proves this whole script ran -- if cron_heartbeats stops
# advancing, the background loop has stopped, wherever it is hosted.
( post objective-planner '{}' ) > "$OUT/7" 2>&1 &

# The Telegram operator's proactive tick: push approval cards for actions queued
# outside a Telegram chat, and send each owner their morning brief when it is
# morning where they are. Idempotent (tg_pushed_at / last_brief_at), so a repeat
# tick never double-sends; a no-op when nobody is linked.
( post telegram-digest   '{}' ) > "$OUT/8" 2>&1 &

wait

for i in 1 2 3 4 5 6 7 8; do
  [ -f "$OUT/$i" ] && cat "$OUT/$i"
done
echo "worker-cron done"

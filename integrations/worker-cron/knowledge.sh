#!/bin/sh
# Rebuild every business's auto knowledge base.
#
# Deliberately NOT in the 5-minute worker loop: change detection means an
# unchanged business costs no model call, but walking every org has a real DB
# cost and positioning prose does not shift hour to hour. Daily is the honest
# cadence — a business that edits its pages sees the agent catch up overnight.
# Scheduled at 03:30 UTC by deploy/oracle/install.sh.
#
# ── WHY IT LOOPS ─────────────────────────────────────────────────────────────
# knowledge-build builds at most a couple of businesses per call (three model
# calls each; Supabase kills a function at 150s) and answers with `pending` —
# how many it did not reach. This used to be ONE call, so with more than two
# businesses needing a rebuild, the rest were never built: the first two got a
# fresh knowledge base every night and everyone else kept last month's. The
# function was designed to be looped; this is the loop. Bounded, so a function
# that always says "pending" cannot run all morning.
set -u
. /etc/phoxta/worker-cron.env

MAX_ROUNDS="${KNOWLEDGE_MAX_ROUNDS:-40}"
PER_CALL="${KNOWLEDGE_ORGS_PER_CALL:-3}"

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) knowledge-build ==="
i=0
while [ "$i" -lt "$MAX_ROUNDS" ]; do
  i=$((i + 1))
  # Body and status on one read: the last line is the code, the rest is JSON.
  out=$(curl -s -m 600 -w '\n%{http_code}' -X POST "$SUPABASE_URL/functions/v1/knowledge-build" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "x-cron-secret: $CRON_SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"maxOrgs\":$PER_CALL}")
  code=$(printf '%s\n' "$out" | tail -n 1)
  body=$(printf '%s\n' "$out" | sed '$d')
  # No jq on a minimal VM; the field is a bare integer so grep is enough.
  pending=$(printf '%s' "$body" | grep -o '"pending":[0-9]*' | head -n 1 | cut -d: -f2)
  echo "round $i -> HTTP $code, pending ${pending:-?}"
  # Anything but a clean 200 with a readable count ends the loop: retrying a
  # failing function forty times is forty times the damage, not forty chances.
  [ "$code" = "200" ] || break
  [ -n "$pending" ] || break
  [ "$pending" -gt 0 ] || break
done
echo "knowledge done after $i round(s)"

#!/bin/sh
# Rebuild every business's auto knowledge base.
#
# Deliberately NOT in the 5-minute worker loop: change detection means an
# unchanged business costs no model call, but walking every org has a real DB
# cost and positioning prose does not shift hour to hour. Daily is the honest
# cadence — a business that edits its pages sees the agent catch up overnight.
set -u
. /etc/phoxta/worker-cron.env
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) knowledge-build ==="
curl -s -m 600 -X POST "$SUPABASE_URL/functions/v1/knowledge-build" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
echo

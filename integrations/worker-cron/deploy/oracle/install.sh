#!/usr/bin/env bash
# Phoxta worker-cron on the Oracle Always Free VM.
#
# Replaces the Railway cron service. Railway's free tier proved unreliable for
# this (the sibling voice service in the same project had no deployment at all),
# and a five-line curl loop does not need a container platform — system cron on
# a box we already run is fewer moving parts and no third-party dependency.
#
# Three schedules, three scripts, three logs:
#   ping.sh       every 5 minutes  — the worker tick (queues, mail, social, autopilot)
#   knowledge.sh  03:30 UTC daily  — rebuild every business's auto knowledge base
#   daily.sh      06:15 UTC daily  — renewal warnings + dunning, 48h catch-up, QA scoring
#
# The first version of this file installed ping.sh and nothing else, so daily.sh
# and knowledge.sh sat in the repo, scheduled nowhere, and renewal warnings
# never went out. If you add a script, add it HERE — the repo is not the
# schedule, this file is.
#
# Run ON THE VM:  sudo bash install.sh /path/to/worker-cron.env
# Re-running is safe: every step overwrites what it installed last time.
set -euo pipefail

ENV_SRC="${1:-}"
[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
[ -n "$ENV_SRC" ] && [ -f "$ENV_SRC" ] || { echo "Usage: sudo bash install.sh <worker-cron.env>"; exit 1; }

SRC="$(cd "$(dirname "$0")/../.." && pwd)"

install -d -m 755 /opt/phoxta/worker-cron
install -d -m 700 /etc/phoxta

# The scripts are edited on Windows, so CRLF is stripped on the way in — a
# carriage return at the end of a shebang line is "bad interpreter", and one at
# the end of a variable assignment is a value that never compares equal.
for f in ping.sh daily.sh knowledge.sh; do
  install -m 755 "$SRC/$f" "/opt/phoxta/worker-cron/$f"
  sed -i 's/\r$//' "/opt/phoxta/worker-cron/$f"
done
install -m 600 "$ENV_SRC" /etc/phoxta/worker-cron.env
sed -i 's/\r$//' /etc/phoxta/worker-cron.env

# The wrapper sources the secrets and timestamps each run, so the log answers
# "did it fire, and what did Supabase say" without any external service.
# (daily.sh and knowledge.sh source the env file and print their own stamp.)
cat > /opt/phoxta/worker-cron/run.sh <<'EOF'
#!/bin/sh
set -u
. /etc/phoxta/worker-cron.env
export SUPABASE_URL SUPABASE_ANON_KEY CRON_SECRET
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
sh /opt/phoxta/worker-cron/ping.sh
EOF
chmod 755 /opt/phoxta/worker-cron/run.sh

# Every 5 minutes, matching the Railway cronSchedule it replaces; the two daily
# jobs at quiet hours, knowledge first so the embeddings it queues are indexed
# by the 5-minute tick well before the working day.
cat > /etc/cron.d/phoxta-worker-cron <<'EOF'
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
*/5 * * * * root /opt/phoxta/worker-cron/run.sh >> /var/log/phoxta-worker-cron.log 2>&1
30 3 * * *  root sh /opt/phoxta/worker-cron/knowledge.sh >> /var/log/phoxta-worker-knowledge.log 2>&1
15 6 * * *  root sh /opt/phoxta/worker-cron/daily.sh >> /var/log/phoxta-worker-daily.log 2>&1
EOF
chmod 644 /etc/cron.d/phoxta-worker-cron

# Unbounded logs on a 50 GB boot volume is how you lose a server six months from
# now, so rotate from day one. The daily logs are small; they keep longer so a
# missed renewal warning can still be traced a season later.
cat > /etc/logrotate.d/phoxta-worker-cron <<'EOF'
/var/log/phoxta-worker-cron.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    copytruncate
}
/var/log/phoxta-worker-daily.log /var/log/phoxta-worker-knowledge.log {
    monthly
    rotate 6
    compress
    missingok
    notifempty
    copytruncate
}
EOF

systemctl enable --now cron >/dev/null 2>&1 || systemctl enable --now crond >/dev/null 2>&1 || true

echo "installed:"
cat /etc/cron.d/phoxta-worker-cron | grep -v '^[A-Z]'
echo "running the 5-minute tick once now to prove it works:"
/opt/phoxta/worker-cron/run.sh

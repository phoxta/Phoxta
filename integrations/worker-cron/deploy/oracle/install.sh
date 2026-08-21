#!/usr/bin/env bash
# Phoxta worker-cron on the Oracle Always Free VM.
#
# Replaces the Railway cron service. Railway's free tier proved unreliable for
# this (the sibling voice service in the same project had no deployment at all),
# and a five-line curl loop does not need a container platform — system cron on
# a box we already run is fewer moving parts and no third-party dependency.
#
# Run ON THE VM:  sudo bash install.sh /path/to/worker-cron.env
set -euo pipefail

ENV_SRC="${1:-}"
[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
[ -n "$ENV_SRC" ] && [ -f "$ENV_SRC" ] || { echo "Usage: sudo bash install.sh <worker-cron.env>"; exit 1; }

install -d -m 755 /opt/phoxta/worker-cron
install -d -m 700 /etc/phoxta

install -m 755 "$(dirname "$0")/../../ping.sh" /opt/phoxta/worker-cron/ping.sh
sed -i 's/\r$//' /opt/phoxta/worker-cron/ping.sh
install -m 600 "$ENV_SRC" /etc/phoxta/worker-cron.env
sed -i 's/\r$//' /etc/phoxta/worker-cron.env

# The wrapper sources the secrets and timestamps each run, so the log answers
# "did it fire, and what did Supabase say" without any external service.
cat > /opt/phoxta/worker-cron/run.sh <<'EOF'
#!/bin/sh
set -u
. /etc/phoxta/worker-cron.env
export SUPABASE_URL SUPABASE_ANON_KEY CRON_SECRET
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
sh /opt/phoxta/worker-cron/ping.sh
EOF
chmod 755 /opt/phoxta/worker-cron/run.sh

# Every 5 minutes, matching the Railway cronSchedule it replaces.
cat > /etc/cron.d/phoxta-worker-cron <<'EOF'
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
*/5 * * * * root /opt/phoxta/worker-cron/run.sh >> /var/log/phoxta-worker-cron.log 2>&1
EOF
chmod 644 /etc/cron.d/phoxta-worker-cron

# Unbounded logs on a 50 GB boot volume is how you lose a server six months from
# now, so rotate from day one.
cat > /etc/logrotate.d/phoxta-worker-cron <<'EOF'
/var/log/phoxta-worker-cron.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    copytruncate
}
EOF

systemctl enable --now cron >/dev/null 2>&1 || systemctl enable --now crond >/dev/null 2>&1 || true

echo "installed. running once now to prove it works:"
/opt/phoxta/worker-cron/run.sh

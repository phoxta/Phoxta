#!/usr/bin/env bash
# Phoxta voice server — one-shot setup for a fresh Oracle Cloud Always Free VM.
# Run ON THE VM, from this directory:  sudo bash bootstrap.sh
set -euo pipefail

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
[ -f ./voice.env ] || { echo "Missing ./voice.env — copy voice.env.example and fill it in first."; exit 1; }
[ -f ./.env ]      || { echo "Missing ./.env — needs VOICE_DOMAIN and ACME_EMAIL."; exit 1; }

say "Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# Oracle's Ubuntu images ship an iptables INPUT policy that drops everything
# except SSH. This is THE classic reason an OCI box looks dead on 80/443 even
# after the VCN security list is opened — both layers must allow the traffic.
say "Opening ports 80 and 443 on the host firewall"
if command -v netfilter-persistent >/dev/null 2>&1; then
  for p in 80 443; do
    iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null \
      || iptables -I INPUT 1 -p tcp --dport "$p" -j ACCEPT
  done
  netfilter-persistent save
elif command -v firewall-cmd >/dev/null 2>&1; then   # Oracle Linux images
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
else
  echo "!! No known firewall tool found — open 80/443 manually."
fi

say "Building and starting the stack (first ARM build takes a few minutes)"
docker compose up -d --build

say "Waiting for the certificate and health check"
domain="$(grep -E '^VOICE_DOMAIN=' ./.env | cut -d= -f2-)"
for i in $(seq 1 30); do
  if curl -fsS --max-time 5 "https://${domain}/health" >/dev/null 2>&1; then
    say "Live: https://${domain}/health"
    echo "Twilio should stream to: wss://${domain}/ws"
    exit 0
  fi
  sleep 10
done

echo "!! Not healthy yet. Check:  docker compose logs --tail=50"
echo "   Most common causes: DNS not yet pointing at this VM, or the VCN"
echo "   security list still missing an ingress rule for TCP 80/443."
exit 1

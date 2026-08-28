# ARM64, DELIBERATELY. Oracle's Always Free VM is Ampere (aarch64) and the
# official Puppeteer image publishes amd64 only — pulling it here produced
# "exec format error" on every binary inside it, including /bin/sh. Debian
# builds Chromium for arm64, so the browser comes from the distro and puppeteer
# is pointed at it rather than downloading one it cannot run.
FROM node:22-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=8790

# fonts-liberation is the fallback face. The design fonts themselves come over
# the network from Google Fonts at render time — the same source the editor
# uses — so the container needs outbound access, and a design in a face it
# cannot fetch would otherwise silently rasterise in the fallback.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium fonts-liberation fonts-noto-color-emoji ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# dist/ is BUILT FROM THE REPO and shipped in — it imports the app's own
# renderer through the @ alias, so it cannot be built here.
COPY server.mjs ./
COPY dist ./dist

EXPOSE 8790
CMD ["node", "server.mjs"]

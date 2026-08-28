# design-render

A design document in, a PNG out — with no browser open.

## Why it exists

A Phoxta design is JSON painted in the browser. That is right for the editor and
useless to anything autonomous: the agent could compose a post and never turn it
into a file, so every generated design waited for a person to open it and press
save. An unattended content plan cannot wait for that.

## Why it is a headless browser and not a rasteriser library

It mounts the **same `DesignSvg`** the editor mounts and calls the **same
`exportPng`** the download button calls. A server-side rasteriser written
against resvg or sharp would be a second implementation of text layout, and text
layout is precisely where two implementations diverge — the editor measures
wrapping against the real font, so a renderer that measured differently would
put the line breaks somewhere else and every generated post would be subtly
wrong in a way nobody would think to check.

`dist/` is therefore **built from the repo** (`npm run build` here bundles out of
`src/` through the `@` alias) and shipped to the box. It cannot be built on the
box, and that is deliberate: a copy of the renderer vendored into this folder
would drift from the editor the first time a layer type was added.

## Deploying

```bash
# 1. From the repo root, build the browser bundle
node integrations/design-render/build.mjs

# 2. Ship the service (dist/ included — it cannot be built on the VM)
ssh ubuntu@<VM> 'rm -rf ~/design-render && mkdir -p ~/design-render/dist'
scp integrations/design-render/{server.mjs,package.json,Dockerfile} ubuntu@<VM>:~/design-render/
scp integrations/design-render/dist/* ubuntu@<VM>:~/design-render/dist/

# 3. Build and start, from the voice stack's compose file
ssh ubuntu@<VM> 'cd ~/pipecat-voice/deploy/oracle && sudo docker compose up -d --build render'
```

It runs as the `render` service in the **voice stack's** `docker-compose.yml`,
and is reached at `https://voice.phoxta.com/render` — a path on the existing
host rather than a subdomain of its own, so there is no second DNS record and no
second certificate for a service only Supabase edge functions ever call.

`RENDER_SECRET` lives in `deploy/oracle/render.env` on the box and as a Supabase
secret, alongside `RENDER_URL`. The service refuses to start without it: the
endpoint rasterises whatever it is given.

## Two traps, both of which bit during the first deploy

**The VM is arm64.** Oracle's Always Free tier is Ampere (aarch64), and the
official Puppeteer image publishes amd64 only. Pulling it produced
`exec format error` on every binary inside it, including `/bin/sh`. The
Dockerfile therefore takes Chromium from Debian, which does build for arm64, and
points puppeteer at it with `PUPPETEER_EXECUTABLE_PATH`.

**`docker compose up -d caddy` does not reload Caddy.** Compose sees the
container as up to date and leaves it alone, so an edited `Caddyfile` is
ignored and the new route 404s through to the voice service — which answers
`{"detail":"Not Found"}` and looks like the render service is broken. Reload it
explicitly:

```bash
sudo docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Validate before reloading, since this file also serves the phone line:

```bash
sudo docker run --rm -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -e VOICE_DOMAIN=voice.phoxta.com -e STATUS_DOMAIN=status.phoxta.com -e ACME_EMAIL=x@y.z \
  caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

## Checking it

```bash
curl https://voice.phoxta.com/health          # the phone line, which shares this host
curl https://voice.phoxta.com/render/health   # {"ok":true,"browser":…}

curl -X POST https://voice.phoxta.com/render/render \
  -H 'content-type: application/json' -H "x-render-secret: $RENDER_SECRET" \
  -d '{"doc":{"templateId":"v1","content":{"title":"Hello"},"images":{}},"scale":2}' \
  -o out.png
```

A cold first render pays for Chrome starting and the fonts arriving; after that
it is around two seconds. Renders are serialised — one browser, one page, one at
a time — because the caller is a worker rather than a person waiting, and a
queue of one is far easier to reason about than a pool that can exhaust the box.

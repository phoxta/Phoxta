/*
 * Phoxta — design-render: a design document in, a PNG out.
 *
 * WHY THIS EXISTS. A design is JSON painted in the browser, which is right for
 * the editor and useless to anything autonomous: the agent could compose a post
 * and never turn it into a file, so every generated design needed a person to
 * open it and press save before it could be published. That made an unattended
 * content pipeline impossible — the one thing a 30-day plan has to be.
 *
 * ONE BROWSER, ONE PAGE, ONE RENDER AT A TIME. Chrome is expensive to start
 * (~1s) and cheap to keep, so it is launched once and reused. Renders are
 * serialised rather than run in parallel pages: they are seconds long, the
 * caller is a cron worker rather than a person waiting, and a queue of one is
 * far easier to reason about than a pool that can exhaust a 1GB box.
 *
 * THE PAGE IS RELOADED BETWEEN RENDERS ONLY IF IT DIED. A long-lived page
 * accumulates nothing here — every render mounts and unmounts its own root —
 * so reloading each time would just pay for the fonts again.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, "dist");
const PORT = Number(process.env.PORT || 8790);
const SECRET = process.env.RENDER_SECRET || "";
/** A render that has not finished by now is wedged; fail it and let the caller retry. */
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 45_000);

if (!SECRET) {
  console.error("RENDER_SECRET is not set. Refusing to start: this endpoint rasterises anything it is given.");
  process.exit(1);
}

const MIME = { ".js": "text/javascript", ".html": "text/html; charset=utf-8" };

let browser = null;
let page = null;
/** Renders run one at a time; this is the tail of that queue. */
let queue = Promise.resolve();

async function ensurePage(origin) {
  if (browser && page && !page.isClosed()) return page;
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      // --no-sandbox: this runs as a dedicated user in a container on a box we
      // own, and the only thing it ever loads is our own bundle.
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
    });
    browser.on("disconnected", () => { browser = null; page = null; });
  }
  page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1500, deviceScaleFactor: 1 });
  await page.goto(`${origin}/index.html`, { waitUntil: "networkidle0" });
  // Fonts before the first render, not during it: the first design through a
  // cold page would otherwise be laid out in the fallback face.
  await page.evaluate(() => window.fontsReady());
  return page;
}

async function render(origin, doc, templateId, scale, format) {
  const run = queue.then(async () => {
    const p = await ensurePage(origin);
    const out = await p.evaluate(
      (d, t, s, f) => window.renderDesign(d, t, s, f),
      doc, templateId, scale, format,
    );
    const b64 = String(out?.dataUrl ?? "").split(",")[1] ?? "";
    if (!b64) throw new Error("the renderer returned nothing");
    // missing[] is the export saying "this reference did not make it into the
    // file". It MUST reach the caller: this endpoint serves an unattended
    // pipeline, and a pipeline that publishes a design with a silent hole
    // where the photograph was is exactly the failure a person at the
    // download button would have caught.
    return { buf: Buffer.from(b64, "base64"), missing: out?.missing ?? [] };
  });
  // Keep the queue moving even when one render throws.
  queue = run.then(() => undefined, () => undefined);
  return await Promise.race([
    run,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`render timed out after ${RENDER_TIMEOUT_MS}ms`)), RENDER_TIMEOUT_MS)),
  ]);
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  const origin = `http://127.0.0.1:${PORT}`;

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true, browser: Boolean(browser) }));
  }

  // The bundle, for the headless browser only — and genuinely only. These two
  // files used to be served to anyone who found the port, which mapped the
  // service's internals for free. The one client that cannot present the
  // secret is the Puppeteer page THIS process opens against 127.0.0.1 (a page
  // navigation carries no custom headers), so loopback is allowed through and
  // everything else needs the same secret as /render. /health stays open — it
  // is the only route that is.
  if (url === "/render.js" || url === "/index.html") {
    const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
    if (!loopback && req.headers["x-render-secret"] !== SECRET) {
      res.writeHead(401, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: "Not authorised." }));
    }
    const file = path.join(DIST, url.slice(1));
    return fs.readFile(file, (e, b) => {
      if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] });
      res.end(b);
    });
  }

  if (url === "/render" && req.method === "POST") {
    if (req.headers["x-render-secret"] !== SECRET) {
      res.writeHead(401, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: "Not authorised." }));
    }
    let raw = "";
    let refused = false;
    req.on("data", (c) => {
      raw += c;
      // A design document is tens of kilobytes; anything approaching a
      // megabyte is not one. Answer 413 BEFORE tearing the socket down — a
      // bare req.destroy() hung up mid-request, so the worker on the other end
      // saw ECONNRESET instead of a reason it could log, and retried a request
      // that could never succeed.
      if (raw.length > 4_000_000 && !refused) {
        refused = true;
        res.writeHead(413, { "content-type": "application/json" });
        res.end(
          JSON.stringify({ error: "Body too large — a design document is tens of kilobytes." }),
          () => req.destroy(),
        );
      }
    });
    req.on("end", async () => {
      if (refused) return;
      try {
        const body = JSON.parse(raw || "{}");
        if (!body?.doc) throw new Error("no doc given");
        // "jpeg" is the one other format the exporter speaks (Instagram's
        // publish API takes JPEG only); anything else means PNG.
        const format = body.format === "jpeg" ? "jpeg" : "png";
        const { buf, missing } = await render(
          origin, body.doc, String(body.templateId ?? body.doc.templateId ?? ""),
          Number(body.scale) || 2, format,
        );
        if (missing.length) {
          // FAIL, do not deliver. The bytes encode fine with a hole where an
          // asset was, and the caller is an unattended pipeline — this is the
          // only moment anything can stop a holed design being published.
          // 422: the request was well-formed; the document is not completely
          // renderable.
          res.writeHead(422, {
            "content-type": "application/json",
            "x-render-missing": String(missing.length),
          });
          return res.end(JSON.stringify({
            error: "Some of the design's assets could not be inlined; refusing to deliver a holed image.",
            missing,
          }));
        }
        res.writeHead(200, {
          "content-type": format === "jpeg" ? "image/jpeg" : "image/png",
          "content-length": buf.length,
          // Zero, explicitly, so the caller can rely on the header existing
          // rather than reading absence as success.
          "x-render-missing": "0",
        });
        res.end(buf);
      } catch (e) {
        console.error("render failed:", e?.message ?? e);
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: String(e?.message ?? e) }));
      }
    });
    return;
  }

  // Nothing else exists — and nothing else is even acknowledged without the
  // secret. /health is the only open route on this service.
  if (req.headers["x-render-secret"] !== SECRET) {
    res.writeHead(401, { "content-type": "application/json" });
    return res.end(JSON.stringify({ error: "Not authorised." }));
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => console.log(`design-render on :${PORT}`));

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, async () => {
    try { await browser?.close(); } catch { /* going down anyway */ }
    process.exit(0);
  });
}

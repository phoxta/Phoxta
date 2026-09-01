import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const ROOT = process.argv[2];
const SP = process.argv[3];
const MIME = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
               ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
// Built from DESIGN_FONTS — the one registry the editor and the exporter
// already share — via the types bundle run.mjs builds into the scratch dir
// before this suite runs. This URL was hand-written once and drifted (missing
// faces, stale weight ranges), so the rig measured text against different
// fonts from the app and the parity it certified was parity with nothing.
const { DESIGN_FONTS } = await import(pathToFileURL(path.join(SP, "types.bundle.mjs")).href);
const FONTS = "https://fonts.googleapis.com/css2?" +
  DESIGN_FONTS.map((f) => `family=${f.query}`).join("&") + "&display=swap";

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(`<!doctype html><meta charset=utf-8><link href="${FONTS}" rel=stylesheet><style>*{margin:0}</style><div id=r></div><script src="/rig.js"></script>`);
  }
  const file = url === "/rig.js" ? path.join(SP, "parity-rig.js") : path.join(ROOT, "public", decodeURIComponent(url));
  fs.readFile(file, (e, b) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(b);
  });
});
await new Promise((r) => server.listen(0, r));

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1120, height: 700 });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 900));

const results = [];
const check = (name, ok, detail) => results.push([ok, name, detail]);

// ── 1. The markup is the same design ─────────────────────────────────────
// Only the viewBox and the editor's artboard EDGE may differ: one is the
// window onto the page, the other says where the page stops. Everything else
// disagreeing means the preview is previewing something else.
const m = await page.evaluate(() => {
  // Editor-only chrome is stripped from both, exactly as the export strips it.
  // The viewBox is the one legitimate difference: it is the window onto the
  // page, not part of the page.
  const norm = (sel) => {
    const el = document.querySelector(sel).cloneNode(true);
    el.querySelectorAll("[data-editor-only]").forEach((n) => n.remove());
    return el.outerHTML
      .replace(/viewBox="[^"]*"/, "")
      // Element ids are namespaced per rendered design so two tiles from one
      // template cannot capture each other's gradients. Two instances
      // therefore differ by that namespace, and only by it.
      .replace(/(id|clip-path|mask|fill)="((?:url\(#)?)[A-Za-z0-9_-]*?(-(?:page|grad|mask|clip|m|chip)-)/g, '$1="$2NS$3')
      .replace(/(id|clip-path|mask|fill)="((?:url\(#)?)[A-Za-z0-9_-]*?(-page)/g, '$1="$2NS$3')
      .replace(/\s+/g, " ");
  };
  return { tile: norm("#tile svg"), canvas: norm("#canvas svg") };
});
let at = 0;
while (at < m.tile.length && m.tile[at] === m.canvas[at]) at++;
check("the tile and the editor draw the same markup", m.tile === m.canvas,
      m.tile === m.canvas ? `${m.tile.length} chars` : `diverge at ${at}: ${JSON.stringify(m.tile.slice(at, at + 70))} vs ${JSON.stringify(m.canvas.slice(at, at + 70))}`);

// ── 2. And the same pixels ─────────────────────────────────────
// Rasterised inside the page rather than compared as PNG bytes. The two
// viewBoxes are arithmetically equal but not textually so -- one is written
// "1080", the other "1079.9999999999999" -- which moves every edge by a
// fraction of a pixel and makes the files differ while the picture does not.
// Byte equality would fail forever and say nothing.
//
// The ground is mid-grey on purpose: if either surface leaves the artboard
// transparent, the grey shows through and the difference is enormous.
const diff = await page.evaluate(async () => {
  const rasterise = (svg, w, h) => new Promise((resolve, reject) => {
    const src = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#7a7a7a";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(ctx.getImageData(0, 0, w, h).data);
    };
    img.onerror = () => reject(new Error("could not rasterise"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
  });

  const W = 400, H = 500;
  const a = await rasterise(document.querySelector("#tile svg"), W, H);
  const b = await rasterise(document.querySelector("#canvas svg"), W, H);
  let off = 0, worst = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    worst = Math.max(worst, d);
    // 24/255 is well above antialiasing noise and well below any real change
    // of colour, position or wrap.
    if (d > 24) off++;
  }
  return { off, total: a.length / 4, worst };
});
const ratio = diff.off / diff.total;
check("the tile and the editor paint the same pixels", ratio < 0.005,
      `${(ratio * 100).toFixed(3)}% of pixels differ (worst channel delta ${diff.worst})`);

// ── 3. The artboard is opaque everywhere ─────────────────────────────────
// A social post is a photograph-sized rectangle, not a sticker: a transparent
// background is always a bug, and it is one you cannot see against a white
// page — only in whatever the file is later dropped onto.
const opaque = await page.evaluate(() => {
  const first = (sel) => {
    const svg = document.querySelector(sel);
    const el = svg.firstElementChild;
    return el && el.tagName === "rect" && el.getAttribute("fill") === "#ffffff"
      && el.getAttribute("width") === "1080" && el.getAttribute("height") === "1350";
  };
  return { tile: first("#tile svg"), canvas: first("#canvas svg") };
});
check("both surfaces paint an opaque artboard first", opaque.tile && opaque.canvas,
      `tile ${opaque.tile}, canvas ${opaque.canvas}`);

// ── 4. The export is the whole page, whatever the editor is looking at ──
// The editor is deliberately zoomed to 2.4x and panned off-centre here. Its
// SVG is a window onto the artboard, and the export clones that SVG -- so if
// the viewBox is not reset, the file is a crop of whatever happened to be on
// screen. That is invisible in the editor and wrong only in the download.
{
  const png = await page.evaluate(async () => {
    const { w, h, url } = await window.exportView();
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, w, h).data;
    // Compare against the tile, which is known to be the whole page.
    const tile = document.querySelector("#tile svg");
    return { w, h, corners: [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
    ].map(([x, y]) => {
      const i = (y * w + x) * 4;
      return `${px[i]},${px[i + 1]},${px[i + 2]},${px[i + 3]}`;
    }), tileBox: tile.getAttribute("viewBox") };
  });
  check("the export is the artboard's own size", png.w === 1080 && png.h === 1350, `${png.w}x${png.h}`);
  // Every corner opaque means the artboard fills the frame: a viewBox left at
  // the editor's would letterbox the design and leave the corners empty.
  const opaqueCorners = png.corners.every((c) => c.endsWith(",255"));
  check("the export fills the frame rather than exporting the viewport",
        opaqueCorners, png.corners.join("  "));
}

// ── 5. Two designs from one template keep their own colours ──────────
// Gradients, masks and clip paths are referenced by id, and an id is global to
// the document -- so two tiles built from the same template define the same
// ids, every reference resolves to whichever came first, and the second tile
// silently paints in the first one's brand colours.
{
  const twins = await page.evaluate(() => {
    const ids = (sel) => [...document.querySelectorAll(`${sel} [id]`)].map((n) => n.id);
    // Every url(#x) must resolve to an element inside its OWN design. The
    // browser resolves an id to the first match in the whole document, so a
    // reference that leaves its tile is painting with a neighbour's colours.
    const escapes = (sel) => {
      const root = document.querySelector(sel);
      const out = [];
      for (const n of root.querySelectorAll("*")) {
        for (const a of n.attributes) {
          const m = /^url\(#(.+)\)$/.exec(a.value);
          if (!m) continue;
          if (!root.querySelector(`[id="${CSS.escape(m[1])}"]`)) out.push(`${n.tagName}.${a.name}`);
          else if (document.getElementById(m[1]) !== root.querySelector(`[id="${CSS.escape(m[1])}"]`)) {
            out.push(`${n.tagName}.${a.name} -> another design`);
          }
        }
      }
      return out;
    };
    return { idsA: ids("#twinA"), idsB: ids("#twinB"), escA: escapes("#twinA"), escB: escapes("#twinB") };
  });
  const shared = twins.idsA.filter((id) => twins.idsB.includes(id));
  check("two designs on one page do not share element ids", shared.length === 0,
        shared.length ? `${shared.length} shared, e.g. ${shared.slice(0, 3).join(", ")}` : "all unique");
  const escaped = [...twins.escA, ...twins.escB];
  check("no design paints with another design's gradients or masks", escaped.length === 0,
        escaped.length ? `${escaped.length} stray reference(s): ${escaped.slice(0, 3).join(", ")}` : "all local");
}

// ── 6. Nothing paints outside the page ─────────────────────────
// A layer can be dragged off the artboard. The artboard is the design: an SVG
// clips to its own viewport, so the editor -- which shows margin around the
// page -- would paint the stray layer in that margin, and the tile and the
// export would not. Three surfaces, three answers.
{
  const spill = await page.evaluate(() => {
    const svg = document.querySelector("#spill svg");
    const painted = [...svg.querySelectorAll("rect, image, text")].filter((n) => !n.closest("[data-editor-only]"));
    // Anything whose box starts left of the page must be clipped by something.
    const strays = painted.filter((n) => Number(n.getAttribute("x")) < -1);
    return {
      strays: strays.length,
      clipped: strays.every((n) => n.closest("[clip-path]") !== null),
    };
  });
  check("a layer dragged off the page is clipped to it",
        spill.strays === 0 || spill.clipped,
        `${spill.strays} layer(s) outside, clipped: ${spill.clipped}`);
}

// ── 7. missing[] tells the truth ─────────────────────────────────────────
// The export drops any reference it cannot inline and RECORDS it — that
// record is what the render service turns into a 422 so the unattended
// pipeline cannot publish a holed design. Both halves of the contract are
// pinned: a remote host that cannot be fetched lands in missing[], and a
// data-URI photo never does.
{
  const remote = await page.evaluate(() => window.exportMissing("remote"));
  check("a photo the export cannot fetch is recorded in missing[]",
        Array.isArray(remote) && remote.length === 1 && String(remote[0]).includes("photos.invalid"),
        JSON.stringify(remote));
  const inline = await page.evaluate(() => window.exportMissing("data"));
  check("a data-URI photo is never missing",
        Array.isArray(inline) && inline.length === 0, JSON.stringify(inline));
}

console.log("");
for (const [ok, name, detail] of results) console.log(`${ok ? "PASS" : "FAIL"} ${name}  —  ${detail}`);
if (errs.length) console.log("\nPAGE ERRORS:\n" + errs.slice(0, 4).join("\n"));
console.log(`\n${results.filter(([o]) => o).length}/${results.length} passing`);
await browser.close();
server.close();
if (results.some(([o]) => !o)) process.exitCode = 1;

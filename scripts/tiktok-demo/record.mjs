/**
 * Records the TikTok integration end to end and writes an mp4 for app review.
 *
 * WHY THIS IS A SCRIPT AND NOT A VIDEO IN THE REPO. TikTok's reviewer is being
 * asked to believe that the flow works. The only footage worth sending is
 * footage of it actually happening — a real consent screen, a real token, a
 * real post on a real account. Anything assembled from mock screens would be a
 * misrepresentation to a reviewer, and would be found out the moment they
 * tested it themselves. So this drives the real, deployed app and records
 * whatever genuinely occurs, including a failure if one occurs.
 *
 * TWO LEGS NEED A HUMAN, and no automation changes that:
 *   - signing in to the Phoxta console
 *   - signing in to TikTok and pressing Authorize
 * Both are on purpose: they are the consent the whole integration rests on.
 * The script opens a real browser window, waits for you at each of those two
 * points, and drives everything else itself.
 *
 * RUN IT:
 *   node scripts/tiktok-demo/record.mjs
 *
 * Optional, to skip the waiting at the Phoxta login only:
 *   DEMO_EMAIL=you@phoxta.com DEMO_PASSWORD=… node scripts/tiktok-demo/record.mjs
 *
 * BEFORE IT CAN WORK, three things must be true in the TikTok portal:
 *   1. the redirect URI is whitelisted, exactly:
 *      https://ktgleoqvdikngocygdkn.supabase.co/functions/v1/social-callback
 *   2. your own TikTok account is added as a Target User / test user — an
 *      unaudited app may only act for accounts on that list
 *   3. the app requests user.info.basic and video.publish
 * Until the app is audited TikTok forces privacy_level SELF_ONLY, so the post
 * this records will be visible only to the account that owns it. That is the
 * platform's rule, and it is what a reviewer expects to see at this stage.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const OUT = path.join(process.cwd(), "scripts", "tiktok-demo", "out");
fs.mkdirSync(OUT, { recursive: true });

const SITE = process.env.DEMO_SITE ?? "https://www.phoxta.com";
const WEBM = path.join(OUT, "tiktok-demo.webm");
const MP4 = path.join(OUT, "tiktok-demo.mp4");

/** A caption burned over the video, so a reviewer knows what they are watching. */
const say = async (pg, text, ms = 2600) => {
  await pg.evaluate((t) => {
    let el = document.getElementById("__demo_caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "__demo_caption";
      el.style.cssText = [
        "position:fixed", "left:0", "right:0", "bottom:0", "z-index:2147483647",
        "background:rgba(29,29,29,.92)", "color:#fff", "font:600 20px/1.4 system-ui,sans-serif",
        "padding:16px 24px", "text-align:center", "pointer-events:none",
      ].join(";");
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
  await new Promise((r) => setTimeout(r, ms));
};

const clearCaption = (pg) =>
  pg.evaluate(() => document.getElementById("__demo_caption")?.remove()).catch(() => {});

/** Wait for the person to finish a step only they can do. */
async function waitForHuman(pg, until, prompt) {
  console.log(`\n  >>> ${prompt}`);
  await say(pg, prompt, 1200);
  for (;;) {
    await new Promise((r) => setTimeout(r, 1000));
    try { if (await until()) return; } catch { /* mid-navigation */ }
  }
}

const br = await puppeteer.launch({
  headless: false,          // you have to be able to type into it
  defaultViewport: null,
  args: ["--window-size=1440,900", "--no-sandbox"],
});
const pg = (await br.pages())[0];
await pg.setViewport({ width: 1440, height: 810 });

console.log("Recording. Two pauses will wait for you: the Phoxta sign-in, and TikTok's Authorize.");
await pg.goto(SITE + "/signin", { waitUntil: "networkidle2" });
const recorder = await pg.screencast({ path: WEBM });

try {
  await say(pg, "Phoxta — the console a small business owner runs their shop from.", 3000);

  // ── 1. sign in ────────────────────────────────────────────────────────────
  if (process.env.DEMO_EMAIL && process.env.DEMO_PASSWORD) {
    await say(pg, "Signing in to the Phoxta console.", 1500);
    await pg.type('input[type="email"]', process.env.DEMO_EMAIL, { delay: 40 });
    await pg.type('input[type="password"]', process.env.DEMO_PASSWORD, { delay: 40 });
    await pg.keyboard.press("Enter");
  }
  await waitForHuman(pg, async () => pg.url().includes("/dashboard"),
    "Sign in to Phoxta in this window. Recording continues automatically.");
  await clearCaption(pg);

  // ── 2. the studio ─────────────────────────────────────────────────────────
  await say(pg, "The design studio: the owner makes a post for their own business.", 3200);
  await waitForHuman(pg, async () => pg.url().includes("/ops/designs"),
    "Open a business, then Console → Studio (Graphics). Recording continues.");
  await clearCaption(pg);
  await new Promise((r) => setTimeout(r, 1500));

  // ── 3. connect the account ────────────────────────────────────────────────
  await say(pg, "Accounts — the owner connects their own TikTok account.", 3000);
  const connect = await pg.evaluateHandle(() => {
    const rows = [...document.querySelectorAll(".soa__row")];
    const row = rows.find((r) => r.textContent?.includes("TikTok"));
    return [...(row?.querySelectorAll("button") ?? [])].find((b) => /connect/i.test(b.textContent ?? ""));
  });
  if (connect && (await connect.evaluate((n) => !!n))) {
    await connect.asElement()?.click();
  }

  await say(pg, "TikTok asks the owner to sign in and authorise Phoxta.", 2600);
  await waitForHuman(pg,
    async () => (await br.pages()).some((p) => p.url().includes("social=connected-tiktok")) || pg.url().includes("social=connected-tiktok"),
    "In the TikTok tab: sign in and press Authorize. Recording continues when it returns.");
  await pg.bringToFront();
  await clearCaption(pg);
  await say(pg, "The account is connected. Phoxta stores only the token and the handle.", 3200);

  // ── 4. schedule ───────────────────────────────────────────────────────────
  await say(pg, "The owner picks a design and schedules it.", 2600);
  const sched = await pg.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Schedule"));
  await sched.asElement()?.click();
  await new Promise((r) => setTimeout(r, 1200));

  await pg.type("textarea", "Our new autumn range is live today.", { delay: 45 });
  await say(pg, "A caption, the accounts to post to, and a time.", 3000);

  const go = await pg.evaluateHandle(() =>
    [...document.querySelectorAll(".dsn-brief-dlg__acts button")].find((b) => /schedule/i.test(b.textContent ?? "")));
  await go.asElement()?.click();
  await new Promise((r) => setTimeout(r, 2500));

  await say(pg, "It is queued on the server — it goes out whether or not this page is open.", 3600);
  await say(pg, "Publishing runs on a five-minute tick and reports each channel separately.", 3600);

  // ── 5. the result ─────────────────────────────────────────────────────────
  await waitForHuman(pg, async () => {
    await pg.reload({ waitUntil: "networkidle2" }).catch(() => {});
    return pg.evaluate(() => !!document.querySelector(".soq__t.is-sent"));
  }, "Waiting for the tick to publish it (up to five minutes). Leave this window alone.");
  await clearCaption(pg);
  await say(pg, "Published. TikTok forces SELF_ONLY until the app is audited, so it is private to the owner.", 4200);
  await say(pg, "Disconnecting is one click and deletes the stored token.", 3200);
} catch (e) {
  // A failure is left in the recording on purpose. A demo that quietly skips
  // the step that broke is worth nothing to a reviewer or to you.
  console.error("\n  The run did not complete: " + (e?.message ?? e));
  await say(pg, "The run stopped here: " + String(e?.message ?? e).slice(0, 90), 4000).catch(() => {});
} finally {
  await recorder.stop();
  await br.close();
}

// mp4, because that is what the portal accepts. H.264 + faststart so it plays
// in a browser without downloading the whole file first.
execFileSync("ffmpeg", [
  "-y", "-i", WEBM,
  "-c:v", "libx264", "-preset", "medium", "-crf", "23",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-vf", "scale=1280:-2",
  MP4,
], { stdio: "inherit" });

const mb = (fs.statSync(MP4).size / 1024 / 1024).toFixed(1);
console.log(`\n  ${MP4}  (${mb} MB)`);

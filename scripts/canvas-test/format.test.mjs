/**
 * Formatting PART of a sentence.
 *
 * The run model always allowed it; there was nowhere to press, so B/I/U applied
 * to the whole layer. This drives the real bridge — the same runsToHtml the
 * editor writes and the same htmlToRuns it reads back — over a DOM selection,
 * which is exactly what the toolbar does.
 */
import { runsToHtml, htmlToRuns } from "./html.bundle.mjs";

const PALETTE = { ink: "#1D1D1D", accent: "#F0460E", white: "#FFFFFF", muted: "#585959", bg: "#F2F2F2" };
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { if (c) { pass++; return; } fail++; console.log("  FAIL  " + n + (d ? "  — " + d : "")); };

const host = document.createElement("div");
// execCommand only acts inside an editable host — exactly as the real editor
// is. Without this the marks silently do nothing and the test measures the
// wrong thing.
host.contentEditable = "true";
document.body.appendChild(host);
host.focus();

/** Select the first occurrence of `word` inside the host. */
function select(word) {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const i = n.textContent.indexOf(word);
    if (i < 0) continue;
    const r = document.createRange();
    r.setStart(n, i);
    r.setEnd(n, i + word.length);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    return r;
  }
  throw new Error("not found: " + word);
}

// ── bold one keyword, leave the rest alone ────────────────────────────────
host.innerHTML = runsToHtml([{ text: "Buy the business today" }], PALETTE);
select("business");
document.execCommand("bold");
{
  const runs = htmlToRuns(host, PALETTE);
  const bolded = runs.filter((r) => r.bold).map((r) => r.text).join("");
  const plainText = runs.map((r) => r.text).join("");
  ok("only the selected word is bold", bolded === "business", `got "${bolded}"`);
  ok("the sentence is intact", plainText === "Buy the business today", plainText);
  ok("the rest is not bold", runs.some((r) => !r.bold && r.text.includes("Buy")));
}

// ── colour one word, as the toolbar does it ───────────────────────────────
host.innerHTML = runsToHtml([{ text: "Own a business that works" }], PALETTE);
{
  const range = select("business");
  const span = document.createElement("span");
  span.dataset.role = "accent";
  span.style.color = PALETTE.accent;
  span.appendChild(range.extractContents());
  range.insertNode(span);

  const runs = htmlToRuns(host, PALETTE);
  const tinted = runs.filter((r) => r.fill === "accent").map((r) => r.text).join("");
  ok("only that word carries the role", tinted === "business", `got "${tinted}"`);
  ok("the role survives as a ROLE, not a hex",
     runs.some((r) => r.fill === "accent"),
     JSON.stringify(runs.map((r) => r.fill)));
  ok("the sentence is intact", runs.map((r) => r.text).join("") === "Own a business that works");
}

// ── two marks on different words at once ──────────────────────────────────
host.innerHTML = runsToHtml([{ text: "bold here italic there" }], PALETTE);
select("bold"); document.execCommand("bold");
select("italic"); document.execCommand("italic");
{
  const runs = htmlToRuns(host, PALETTE);
  ok("first word bold only", runs.some((r) => r.text.includes("bold") && r.bold && !r.italic));
  ok("second word italic only", runs.some((r) => r.text.includes("italic") && r.italic && !r.bold));
}

// ── scale one word ────────────────────────────────────────────────────────
host.innerHTML = runsToHtml([{ text: "make THIS bigger" }], PALETTE);
{
  const range = select("THIS");
  const span = document.createElement("span");
  span.dataset.scale = "1.5";
  span.style.fontSize = "1.5em";
  span.appendChild(range.extractContents());
  range.insertNode(span);
  const runs = htmlToRuns(host, PALETTE);
  const big = runs.find((r) => r.scale === 1.5);
  ok("scale applies to just that word", big?.text === "THIS", JSON.stringify(runs));
}

console.log(`\nformat: ${pass} passed, ${fail} failed`);
window.__result = { pass, fail };

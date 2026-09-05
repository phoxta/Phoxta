/**
 * Parity gate: proves the rewrite did not change the presentation layer.
 *
 * Tailwind v4 generates CSS by scanning source for class strings, so comparing
 * the class strings of the two apps is the earliest and sharpest signal that a
 * pixel moved. Copy strings are compared the same way.
 *
 * Every difference must be explained by one of:
 *   - DELETED       source files with no counterpart (Next-only constructs)
 *   - DEAD_REGIONS  code defined but never invoked, so never rendered
 *   - APPROVED      a sanctioned visible change (V1–V7) or a contract §2/§5 removal
 * Anything else is a regression and exits non-zero.
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const NEW_ROOT = join(here, "..", "..");
const OLD_ROOT = join(NEW_ROOT, "..", "travel");

/**
 * Source files with no wamwam counterpart: Next.js constructs that cannot exist
 * in a Vite app (each has a replacement — public/robots.txt, scripts/gen-sitemap.mjs,
 * types/vite-env.d.ts, the index.html head), plus AccountButton, which rendered
 * null on every page because it read ready:false from a context it sat outside.
 * The eleven zero-importer UI orphans are NOT here; they were ported.
 */
const DELETED = new Set([
    "components/AccountButton.tsx", "routers/types.ts", "app/layout.tsx", "app/opengraph-image.tsx",
    "app/robots.ts", "app/sitemap.ts", "app/type.d.ts", "type.d.ts",
]);

/**
 * Regions defined but never invoked in the source, so their class and copy
 * strings have no rendered trace. Verified by grepping each symbol's call count.
 */
const DEAD_REGIONS = [
    { file: "app/(app)/(listings)/experience-listings/[handle]/page.tsx", symbol: "renderSidebarPriceAndForm", indent: 2 },
    { file: "app/(app)/(listings)/stay-listings/[handle]/page.tsx", symbol: "renderSidebarPriceAndForm", indent: 2 },
    { file: "app/(app)/(listings)/stay-listings/[handle]/page.tsx", symbol: "renderSectionRoomRates", indent: 2 },
    { file: "app/(app)/(listings)/car-listings/[handle]/page.tsx", symbol: "renderSidebarPriceAndForm", indent: 2 },
    { file: "components/header/navigation/header-navigation.tsx", symbol: "ListItem", indent: 0 },
];

/** Differences explained by an approved change. Reason is printed, not just suppressed. */
const APPROVED = new Map([
    ["mt-2 text-sm text-red-600", "V2(c): the contact form's failure message — the one new element in the port"],
    ["nav-mobile-sub-menu border-l border-border ps-4 pb-1", "§2: nav-mobile-sub-menu matches no rule in any stylesheet"],
    ["border-l border-border ps-4 pb-1", "§2: the same list, with the no-op class removed"],
    [
        "relative top-px ms-1 size-3 transition duration-300 group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180",
        "§5: radix emits data-state, never data-popup-open/data-open — both variants were dead",
    ],
    ["relative top-px ms-1 size-3 transition duration-300", "§5: the same chevron with the dead variants removed"],
    ["relative top-[60%] h-2 w-2 rotate-45 rounded-ss-sm bg-border shadow-md", "§5: NavigationMenuIndicator was never imported"],
]);

/**
 * Families of dead variants, matched by substring. All three are Base-UI
 * attribute selectors that radix-ui never emits:
 *   - `data-open` / `data-closed`  → radix emits `data-state="open"|"closed"`
 *   - `[viewport=false]`           → NavigationMenu defaults viewport={true} and
 *                                    its only consumer never overrides it, so
 *                                    the element always carries data-viewport="true"
 * Verified by reading the component defaults and every call site.
 */
const APPROVED_PATTERNS = [
    // Each of these matches BOTH the original string and its stripped counterpart,
    // so the removal is explained on the MISSING and the ADDED side alike.
    {
        match: "ease-[cubic-bezier(0.22,1,0.36,1)]",
        why: "§5: NavigationMenuContent — viewport is always true (its only consumer never overrides the default), so the [viewport=false] block could never match",
    },
    {
        match: "origin-top-center relative mt-1.5",
        why: "§5: NavigationMenuViewport — radix emits data-state, never data-open/data-closed",
    },
    { match: "data-[state=hidden]:animate-out", why: "§5: NavigationMenuIndicator was never imported" },
    {
        match: "btn bg-dark text-white",
        why: "assistant launcher: fixed positioning moved from an inline style to classes so it can clear the mobile quick-nav, whose Menu button it was covering",
    },
    {
        match: "d-flex flex-column",
        why: "assistant panel: same move, so it sits above the repositioned launcher",
    },
];

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
    }
    return out;
}

/** className="…" / className={'…'} / className={`…`} plus single-literal clsx()/cn() args. */
const CLASS_RE = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)\s*\})/g;
const CLSX_RE = /\b(?:clsx|cn)\s*\(\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
const TEXT_RE = />\s*([A-Za-z][^<>{}]{2,}?)\s*</g;

/** Reject matches that are TypeScript, not rendered copy. */
function isCode(t) {
    return /[?:;=(){}[\]]|=>|\bconst\b|\blet\b|\breturn\b|\bfunction\b/.test(t);
}

function stripDead(code, rel) {
    for (const dead of DEAD_REGIONS) {
        if (dead.file !== rel) continue;
        const at = code.indexOf(dead.symbol);
        if (at === -1) continue;
        const from = code.lastIndexOf("\n", at);
        const close = "\n" + " ".repeat(dead.indent) + "}";
        const end = code.indexOf(close, at);
        if (end > from) code = code.slice(0, from) + code.slice(end + close.length);
    }
    return code;
}

function extract(root, skip = new Set()) {
    const classes = new Map();
    const texts = new Map();
    for (const f of walk(join(root, "src"))) {
        const rel = relative(join(root, "src"), f).replace(/\\/g, "/");
        if (skip.has(rel) || rel.startsWith("shims/")) continue;
        let code = readFileSync(f, "utf8")
            .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
        code = stripDead(code, rel);

        const addClass = (raw) => {
            // Template literals: only the static segments reach the DOM verbatim.
            for (const seg of String(raw).split(/\$\{[^}]*\}/)) {
                const s = seg.trim().replace(/\s+/g, " ");
                if (!s) continue;
                if (!classes.has(s)) classes.set(s, new Set());
                classes.get(s).add(rel);
            }
        };
        for (const m of code.matchAll(CLASS_RE)) addClass(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? "");
        for (const m of code.matchAll(CLSX_RE)) addClass(m[1] ?? m[2] ?? m[3] ?? "");

        for (const m of code.matchAll(TEXT_RE)) {
            const t = m[1].replace(/\s+/g, " ").trim();
            if (t.split(" ").length < 3 || isCode(t)) continue;
            if (!texts.has(t)) texts.set(t, new Set());
            texts.get(t).add(rel);
        }
    }
    return { classes, texts };
}

/**
 * The reference inventory.
 *
 * businesses/travel has been removed, so the class and copy strings it rendered
 * live here as a committed fixture instead. Run this script with --snapshot
 * while that tree exists to regenerate it; without the tree, the fixture is the
 * only source and the gate still works.
 */
const FIXTURE = join(here, "baseline", "travel-inventory.json");

function loadReference() {
    if (existsSync(join(OLD_ROOT, "src"))) {
        const x = extract(OLD_ROOT, DELETED);
        if (process.argv.includes("--snapshot")) {
            const toObj = (m) => Object.fromEntries([...m].map(([k, v]) => [k, [...v]]));
            writeFileSync(FIXTURE, JSON.stringify({ classes: toObj(x.classes), texts: toObj(x.texts) }, null, 0));
            console.log(`snapshot written: ${x.classes.size} classes, ${x.texts.size} copy strings -> ${FIXTURE}`);
        }
        return x;
    }
    if (!existsSync(FIXTURE)) {
        console.error("No reference: businesses/travel is gone and no fixture exists at " + FIXTURE);
        process.exit(2);
    }
    const raw = JSON.parse(readFileSync(FIXTURE, "utf8"));
    const toMap = (o) => new Map(Object.entries(o).map(([k, v]) => [k, new Set(v)]));
    return { classes: toMap(raw.classes), texts: toMap(raw.texts) };
}

const oldX = loadReference();
const newX = extract(NEW_ROOT);

const reasonFor = (x) => APPROVED.get(x) ?? APPROVED_PATTERNS.find((p) => x.includes(p.match))?.why;

const report = (label, items, index) => {
    const unexplained = items.filter((x) => !reasonFor(x));
    const explained = items.filter((x) => reasonFor(x));
    if (explained.length) {
        console.log(`\n${label} — ${explained.length} explained:`);
        for (const x of explained) console.log(`  · ${reasonFor(x)}`);
    }
    if (unexplained.length) {
        console.log(`\n${label} — ${unexplained.length} UNEXPLAINED:`);
        for (const x of unexplained) console.log(`  "${x}"\n      ${[...index.get(x)].join(", ")}`);
    }
    return unexplained.length;
};

console.log(`class strings: travel=${oldX.classes.size} wamwam=${newX.classes.size}`);
let failures = 0;
failures += report("MISSING in wamwam", [...oldX.classes.keys()].filter((c) => !newX.classes.has(c)), oldX.classes);
failures += report("ADDED in wamwam", [...newX.classes.keys()].filter((c) => !oldX.classes.has(c)), newX.classes);

console.log(`\ncopy strings (>=3 words): travel=${oldX.texts.size} wamwam=${newX.texts.size}`);
failures += report("MISSING copy", [...oldX.texts.keys()].filter((t) => !newX.texts.has(t)), oldX.texts);

const baselineDir = join(here, "baseline");
const distDir = join(NEW_ROOT, "dist", "assets");
if (existsSync(distDir) && existsSync(join(baselineDir, "css-sizes.txt"))) {
    const base = Object.fromEntries(
        readFileSync(join(baselineDir, "css-sizes.txt"), "utf8").trim().split("\n").map((l) => {
            const [name, size] = l.split(" ");
            return [name.replace(/-[A-Za-z0-9_-]+\.css$/, ""), Number(size)];
        }),
    );
    console.log("\nbuilt CSS vs travel baseline:");
    for (const f of readdirSync(distDir).filter((x) => x.endsWith(".css"))) {
        const key = f.replace(/-[A-Za-z0-9_-]+\.css$/, "");
        const size = statSync(join(distDir, f)).size;
        const b = base[key];
        console.log(`  ${f}: ${size} bytes${b ? ` (baseline ${b}, ${(((size - b) / b) * 100).toFixed(1)}%)` : ""}`);
    }
}

console.log(`\n${failures === 0 ? "PARITY OK — every difference is accounted for" : `${failures} UNEXPLAINED differences`}`);
process.exit(failures === 0 ? 0 : 1);

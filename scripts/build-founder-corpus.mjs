// Build the Founder Toolkit advisor corpus.
//
// Reads the distilled reference files from the `entrepreneur-handbook` skill
// and emits a chunked, typed corpus the `founder-advice` edge function bundles.
//
// Why bundle rather than embed in the database: the corpus is small, static and
// versioned with the code, so retrieval needs no vector store, no embedding
// spend and no migration. Retrieval is keyword scoring over section titles and
// content, which is accurate enough because the source files are already
// organised by topic and every section is labelled.
//
// Run: npm run founder:corpus

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = join(ROOT, ".claude", "skills", "entrepreneur-handbook", "reference");
const OUT = join(ROOT, "supabase", "functions", "founder-advice", "corpus.ts");

// Sections that help a founder. Everything else (Sources, The minds, Build
// ideas for the app) is provenance or product notes, not advice.
const KEEP = new Set([
    "Purpose",
    "Core ideas",
    "Core ideas (current consensus)",
    "What changed since 2018",
    "Frameworks & tables",
    "Frameworks & playbooks",
    "Benchmarks & numbers (2024-2026)",
    "Decision rules & rules of thumb",
    "Process / steps",
    "Worksheets, checklists & questions",
    "Regional notes",
    "AI-era notes",
    "Examples & cautionary tales",
    "Pitfalls",
    "Key terms",
    "Summing up (book)",
]);

// Human labels for citation, keyed by file basename.
const LABELS = {
    "01-founder-fit": "Founder fit (handbook ch 1)",
    "02-opportunity": "The opportunity (handbook ch 2)",
    "03-business-model-and-strategy": "Business model and strategy (handbook ch 3)",
    "04-legal-structure": "Legal structure (handbook ch 4)",
    "05-business-plan": "The business plan (handbook ch 5)",
    "06-startup-financing": "Startup financing (handbook ch 6)",
    "07-growth-financing": "Growth financing (handbook ch 7)",
    "08-angels-and-vc": "Angels and venture capital (handbook ch 8)",
    "09-going-public": "Going public (handbook ch 9)",
    "10-sustaining-growth": "Sustaining growth (handbook ch 10)",
    "11-leadership": "Leadership (handbook ch 11)",
    "12-entrepreneurial-spirit": "Keeping the entrepreneurial spirit (handbook ch 12)",
    "13-harvest-and-exit": "Harvest and exit (handbook ch 13)",
    "A-financial-statements": "Financial statements (handbook appendix A)",
    "B-breakeven": "Breakeven analysis (handbook appendix B)",
    "C-valuation": "Valuation (handbook appendix C)",
    "D-rule-144": "Selling restricted stock, US (handbook appendix D)",
    glossary: "Glossary",
    "S01-sales": "Sales (2026 layer)",
    "S02-marketing": "Marketing (2026 layer)",
    "S03-hiring-and-people": "Hiring and people (2026 layer)",
    "S04-operations": "Operations (2026 layer)",
    "S05-metrics-and-unit-economics": "Metrics and unit economics (2026 layer)",
    "S06-financing-2026": "Financing (2026 layer)",
    "S07-ai-native-company": "Building with AI (2026 layer)",
    "S08-global-lens": "Country and region (2026 layer)",
    "S09-legal-and-structure-2026": "Legal structure (2026 layer)",
    "S10-launch-method-2026": "Product-market fit and strategy (2026 layer)",
    "S11-leadership-and-scaling-2026": "Leadership and scaling (2026 layer)",
    "S12-exit-and-liquidity-2026": "Exit, liquidity and valuation (2026 layer)",
    "S13-founder-evidence-and-pitching-2026": "Founder evidence and pitching (2026 layer)",
};

/** Split a markdown file into { heading, body } chunks on H2 boundaries. */
function sections(md) {
    const out = [];
    const lines = md.split("\n");
    let heading = null;
    let buf = [];
    for (const line of lines) {
        const m = /^##\s+(.*)$/.exec(line);
        if (m) {
            if (heading) out.push({ heading, body: buf.join("\n").trim() });
            heading = m[1].trim();
            buf = [];
        } else if (heading) {
            buf.push(line);
        }
    }
    if (heading) out.push({ heading, body: buf.join("\n").trim() });
    return out;
}

/** Hard cap a chunk so one section cannot dominate a prompt. */
function cap(text, limit = 6000) {
    if (text.length <= limit) return text;
    const cut = text.slice(0, limit);
    const lastBreak = cut.lastIndexOf("\n");
    return `${lastBreak > limit * 0.6 ? cut.slice(0, lastBreak) : cut}\n[section truncated]`;
}

function collect() {
    const chunks = [];
    const files = [
        ...readdirSync(REF)
            .filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "further-reading.md" && f !== "00-journey-map.md")
            .map((f) => ({ path: join(REF, f), rel: f })),
        ...readdirSync(join(REF, "modern"))
            .filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "00-index.md")
            .map((f) => ({ path: join(REF, "modern", f), rel: `modern/${f}` })),
    ];

    for (const { path, rel } of files) {
        const md = readFileSync(path, "utf8");
        const key = basename(rel, ".md");
        const label = LABELS[key] ?? key;
        for (const s of sections(md)) {
            if (!KEEP.has(s.heading)) continue;
            if (!s.body || s.body.length < 40) continue;
            chunks.push({
                ref: rel,
                label,
                heading: s.heading,
                text: cap(s.body),
            });
        }
    }
    return chunks;
}

const chunks = collect();
const bytes = chunks.reduce((n, c) => n + c.text.length, 0);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
    OUT,
    `// GENERATED FILE - do not edit by hand.
// Built by scripts/build-founder-corpus.mjs from the entrepreneur-handbook skill.
// Regenerate with: npm run founder:corpus

export interface Chunk {
    /** Source reference file, used for citation. */
    ref: string;
    /** Human label shown to the founder. */
    label: string;
    /** The H2 section this came from. */
    heading: string;
    /** The distilled content. */
    text: string;
}

export const CORPUS: Chunk[] = ${JSON.stringify(chunks, null, 0)};

export const CORPUS_BUILT = ${JSON.stringify(new Date().toISOString().slice(0, 10))};
`,
    "utf8",
);

console.log(`founder corpus: ${chunks.length} chunks, ${(bytes / 1024).toFixed(0)} KB of text`);
console.log(`wrote ${OUT}`);

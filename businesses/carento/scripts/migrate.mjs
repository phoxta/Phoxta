import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "src");

async function* walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
    }
}

function transform(source) {
    let output = source;
    const log = [];

    const useClientRegex = /^\s*(["'])use client\1\s*;?\s*\r?\n/;
    if (useClientRegex.test(output)) {
        output = output.replace(useClientRegex, "");
        log.push("use-client");
    }

    if (/from\s+["']next\/image["']/.test(output)) {
        output = output.replace(/from\s+["']next\/image["']/g, 'from "@/components/common/Image"');
        log.push("next/image");
    }
    if (/from\s+["']next\/link["']/.test(output)) {
        output = output.replace(/from\s+["']next\/link["']/g, 'from "@/components/common/Link"');
        log.push("next/link");
    }
    if (/from\s+["']next\/dynamic["']/.test(output)) {
        output = output.replace(/from\s+["']next\/dynamic["']/g, 'from "@/util/dynamic"');
        log.push("next/dynamic");
    }

    if (/from\s+["']next\/navigation["']/.test(output)) log.push("next/navigation-REMAINING");
    if (/from\s+["']next\/router["']/.test(output)) log.push("next/router-REMAINING");
    if (/from\s+["']next\/font/.test(output)) log.push("next/font-REMAINING");

    return { output, log };
}

async function main() {
    let touched = 0, total = 0, stripped = 0;
    const problems = [];

    for await (const file of walk(ROOT)) {
        total++;
        const src = await fs.readFile(file, "utf8");
        const { output, log } = transform(src);
        if (output !== src) {
            await fs.writeFile(file, output, "utf8");
            touched++;
            if (log.includes("use-client")) stripped++;
        }
        if (log.some((x) => x.includes("REMAINING"))) {
            problems.push({ file: path.relative(ROOT, file), log });
        }
    }

    console.log(`Scanned ${total} files, rewrote ${touched}. Stripped "use client" from ${stripped}.`);
    if (problems.length) {
        console.log("\nRemaining Next.js-specific imports (need manual review):");
        for (const p of problems) console.log(` - ${p.file}: ${p.log.join(", ")}`);
    } else {
        console.log("No remaining Next.js-specific imports.");
    }
}

main().catch((err) => { console.error(err); process.exit(1); });

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.resolve(ROOT, "..", "1.carento_nextjs_template", "app");
const PAGES_OUT = path.join(ROOT, "src", "pages");

const toPascal = (s) =>
    s
        .split(/[-_]/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join("");

const ensureDir = (p) => fs.mkdir(p, { recursive: true });
const exists = async (p) => {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
};

// Rename `export default function X(` -> `export default function NewName(`
function renameDefaultFn(source, newName) {
    return source.replace(
        /export\s+default\s+function\s+[A-Za-z_$][\w$]*\s*\(/,
        `export default function ${newName}(`
    );
}

async function main() {
    await ensureDir(PAGES_OUT);
    const routes = [];

    // Root page -> Home
    const rootPage = path.join(APP_DIR, "page.tsx");
    if (await exists(rootPage)) {
        const src = await fs.readFile(rootPage, "utf8");
        await fs.writeFile(path.join(PAGES_OUT, "Home.tsx"), renameDefaultFn(src, "Home"));
        routes.push({ path: "/", importName: "Home", filename: "Home" });
    }

    // All slug folders
    const entries = await fs.readdir(APP_DIR, { withFileTypes: true });
    for (const e of entries) {
        if (!e.isDirectory()) continue;
        const pageFile = path.join(APP_DIR, e.name, "page.tsx");
        if (!(await exists(pageFile))) continue;

        const slug = e.name;
        // Special case: `app/404/page.tsx` -> NotFound page (catch-all route `*`)
        if (slug === "404") {
            const src = await fs.readFile(pageFile, "utf8");
            await fs.writeFile(path.join(PAGES_OUT, "NotFound.tsx"), renameDefaultFn(src, "NotFound"));
            continue;
        }

        // Legal identifier-safe filename: digits-only slug (e.g. "404") already handled above
        // But names starting with digits need prefix if they slip through
        let filename = toPascal(slug);
        if (/^\d/.test(filename)) filename = "Page" + filename;

        const src = await fs.readFile(pageFile, "utf8");
        await fs.writeFile(
            path.join(PAGES_OUT, `${filename}.tsx`),
            renameDefaultFn(src, filename)
        );
        routes.push({ path: `/${slug}`, importName: filename, filename });
    }

    routes.sort((a, b) => a.path.localeCompare(b.path));

    const imports = routes
        .map((r) => `import ${r.importName} from "@/pages/${r.filename}";`)
        .join("\n");
    const entriesCode = routes
        .map((r) => `    { path: ${JSON.stringify(r.path)}, element: <${r.importName} /> },`)
        .join("\n");

    const routerTsx = `import { createBrowserRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";
${imports}

export const router = createBrowserRouter([
${entriesCode}
    { path: "*", element: <NotFound /> },
]);
`;
    await fs.writeFile(path.join(ROOT, "src", "router.tsx"), routerTsx);
    console.log(
        `Generated ${routes.length} pages + NotFound; router.tsx written.`
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

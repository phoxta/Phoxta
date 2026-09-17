import puppeteer from "puppeteer";

const BASE = "http://localhost:3015";

const asMember = async (page, memberId) => {
    await page.evaluateOnNewDocument((id) => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", id);
    }, memberId);
};

const run = async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const errors = [];
    const report = [];

    for (const [memberId, label] of [
        ["mem-ife", "Ife (parent)"],
        ["mem-tunde", "Tunde (parent)"],
        ["mem-dami", "Dami (child)"],
        ["mem-tobi", "Tobi (child)"],
        ["mem-folake", "Folake (guest)"],
    ]) {
        const page = await browser.newPage();
        page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
        page.on("console", (m) => m.type() === "error" && errors.push(`${label} console: ${m.text().slice(0, 200)}`));
        await asMember(page, memberId);
        await page.goto(`${BASE}/grow/learning`, { waitUntil: "networkidle0" });
        await new Promise((r) => setTimeout(r, 1200));
        const info = await page.evaluate(() => {
            const text = document.body.innerText;
            return {
                heads: [...document.querySelectorAll("h1,h2,h3")].map((h) => h.textContent?.trim()).filter(Boolean).slice(0, 10),
                cycling: /Cycling training|HIIT Indoor|Climb Like A Pro/i.test(text),
                lessonsStat: (text.match(/(\d+)\s*\n?\s*in \d+ playlists/) ?? [])[0] ?? null,
                suggestCopy: (text.match(/Only ever from the .{0,40}/) ?? [])[0] ?? null,
                horizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
            };
        });
        report.push({ label, ...info });
        await page.close();
    }

    // A child's lesson page: no outbound YouTube link.
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(`lesson: ${e.message}`));
    await asMember(page, "mem-tobi");
    await page.goto(`${BASE}/grow/learning`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));
    const firstLesson = await page.evaluate(() => {
        const a = [...document.querySelectorAll("a")].find((x) => x.getAttribute("href")?.includes("/lessons/"));
        return a?.getAttribute("href") ?? null;
    });
    let lesson = { href: firstLesson, visibleYouTubeLinks: null, note: null };
    if (firstLesson) {
        await page.goto(`${BASE}${firstLesson}`, { waitUntil: "networkidle0" });
        await new Promise((r) => setTimeout(r, 1500));
        lesson = await page.evaluate(() => {
            const links = [...document.querySelectorAll("a")].filter((a) => /youtube\.com|youtu\.be/i.test(a.getAttribute("href") ?? ""));
            const visible = links.filter((a) => a.getBoundingClientRect().width > 0 && getComputedStyle(a).display !== "none");
            return {
                href: location.pathname,
                total: links.length,
                visibleYouTubeLinks: visible.length,
                note: /no way out to YouTube/i.test(document.body.innerText),
            };
        });
    }
    await page.close();
    await browser.close();
    console.log(JSON.stringify({ report, lesson, errors }, null, 2));
};

run().catch((e) => {
    console.error(e);
    process.exit(1);
});

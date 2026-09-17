import puppeteer from "puppeteer";

const run = async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", "mem-ife");
    });
    await page.goto("http://localhost:3015/grow/learning/lessons/lv-1", { waitUntil: "domcontentloaded", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 3500));
    const out = await page.evaluate(() => {
        const links = [...document.querySelectorAll("a")].filter((a) => /youtube\.com/.test(a.getAttribute("href") ?? ""));
        return {
            h1: document.querySelector("h1")?.textContent,
            visibleYouTubeLinks: links.filter((a) => a.getBoundingClientRect().width > 0).length,
            hasChildSafeControl: /Mark adults only|Mark child-safe/.test(document.body.innerText),
            noExitNote: /no way out to YouTube/i.test(document.body.innerText),
        };
    });
    console.log(JSON.stringify({ out, errors }, null, 2));
    await browser.close();
};
run().catch((e) => {
    console.error(e);
    process.exit(1);
});

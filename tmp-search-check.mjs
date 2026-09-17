import puppeteer from "puppeteer";

const open = async (browser, memberId, path) => {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.evaluateOnNewDocument((id) => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", id);
    }, memberId);
    await page.goto(`http://localhost:3015${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2500));
    return { page, errors };
};

const run = async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const out = {};

    for (const [who, q] of [
        ["mem-ife", "climb"],
        ["mem-ife", "cycling"],
        ["mem-dami", "cycling"],
        ["mem-tobi", "physics"],
        ["mem-tobi", "volcano"],
    ]) {
        const { page, errors } = await open(browser, who, `/search?q=${encodeURIComponent(q)}`);
        const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
        out[`${who}:${q}`] = {
            leaksCycling: /Cycling training|Climb Like|HIIT Indoor|Clean Your Bike/i.test(body),
            tail: body.split("Create your own family").pop().slice(0, 220),
            errors,
        };
        await page.close();
    }

    const { page, errors } = await open(browser, "mem-ife", "/grow/learning/lessons/lv-1");
    out.parentLesson = await page.evaluate(() => {
        const links = [...document.querySelectorAll("a")].filter((a) => /youtube\.com/.test(a.getAttribute("href") ?? ""));
        return {
            title: document.querySelector("h1")?.textContent,
            visibleYouTubeLinks: links.filter((a) => a.getBoundingClientRect().width > 0).length,
            hasChildSafeControl: /Mark adults only|Mark child-safe/.test(document.body.innerText),
        };
    });
    out.parentLessonErrors = errors;
    await page.close();
    await browser.close();
    console.log(JSON.stringify(out, null, 2));
};
run().catch((e) => {
    console.error(e);
    process.exit(1);
});

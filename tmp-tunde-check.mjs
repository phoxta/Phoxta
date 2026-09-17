import puppeteer from "puppeteer";

const run = async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.stack ?? e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 400)}`));
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem("wafe:mode", "demo");
        localStorage.setItem("wafe:demo:view-as", "mem-tunde");
    });
    await page.goto("http://localhost:3015/grow/learning", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 2000));
    const text = await page.evaluate(() => document.body.innerText.slice(0, 1200));
    console.log("TEXT:\n" + text);
    console.log("\nERRORS:\n" + errors.join("\n---\n"));
    await browser.close();
};
run().catch((e) => {
    console.error(e);
    process.exit(1);
});

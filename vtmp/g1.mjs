import puppeteer from "puppeteer";

const B = "http://localhost:3015";
const errs = [];

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text().slice(0, 300)); });

await page.goto(B + "/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
    localStorage.setItem("wafe:mode", "demo");
    localStorage.setItem("wafe:demo:view-as", "mem-ife");
});
await page.goto(B + "/execute/goals", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));

const info = await page.evaluate(() => {
    const txt = document.body.innerText;
    const btns = [...document.querySelectorAll("button")].map((b) => b.innerText.trim().replace(/\s+/g," ")).filter(Boolean);
    const links = [...document.querySelectorAll("a")].map((a) => a.getAttribute("href") + " :: " + a.innerText.trim().replace(/\s+/g," ").slice(0,60));
    return { txt, btns: [...new Set(btns)], links: [...new Set(links)], url: location.href };
});
console.log("URL", info.url);
console.log("=== TEXT ===\n" + info.txt);
console.log("=== BUTTONS ===\n" + info.btns.join("\n"));
console.log("=== LINKS ===\n" + info.links.join("\n"));
console.log("=== ERRS ===\n" + errs.join("\n"));
await browser.close();

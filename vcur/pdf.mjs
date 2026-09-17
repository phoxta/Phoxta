import { launch, boot, text, sleep, clickText } from "./h.mjs";

const { browser, page, errors } = await launch();
await boot(page, "mem-ife", "/grow/curricula/mem-tobi");
console.log("Term report:", await clickText(page, "button", "Term report"));
await sleep(600);
// intercept the iframe as soon as it is added
await page.evaluate(() => {
    window.__cap = null;
    const obs = new MutationObserver(() => {
        const f = document.querySelector("iframe[title='Term report']");
        if (f && f.contentDocument && f.contentDocument.body && f.contentDocument.body.innerHTML.length > 10 && !window.__cap) {
            window.__cap = f.contentDocument.documentElement.outerHTML;
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.__printed = 0;
    const p = Window.prototype.print;
    Window.prototype.print = function () { try { window.top.__printed++; } catch (e) { void e; } };
    void p;
});
console.log("Export btn:", await clickText(page, "button", "Export to PDF"));
await sleep(250);
const cap = await page.evaluate(() => {
    const f = document.querySelector("iframe[title='Term report']");
    const html = window.__cap || (f && f.contentDocument ? f.contentDocument.documentElement.outerHTML : null);
    return { html, printed: window.__printed };
});
console.log("printed:", cap.printed);
console.log("html len:", cap.html ? cap.html.length : null);
if (cap.html) {
    const stripped = cap.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    console.log("--- printed sheet text ---");
    console.log(stripped.slice(0, 1800));
}
console.log("ERRORS:", errors);
await browser.close();

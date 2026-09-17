export async function clickExact(page, text, sel = "button, a") {
    return await page.evaluate((s, t) => {
        const els = Array.from(document.querySelectorAll(s)).filter((e) => (e.innerText || "").trim() === t);
        const open = els.find((e) => !e.closest("dialog") || e.closest("dialog").open);
        if (!open) return false; open.click(); return true;
    }, sel, text);
}
export async function dialogText(page) {
    return await page.evaluate(() => Array.from(document.querySelectorAll("dialog")).filter(d=>d.open).map(d=>d.innerText).join("\n---\n") || "NO OPEN DIALOG");
}
export async function inDialog(page, fn) {
    return await page.evaluate(new Function("f", "const d=Array.from(document.querySelectorAll('dialog')).find(x=>x.open); if(!d) return 'NO OPEN DIALOG'; return (" + fn + ")(d);"));
}

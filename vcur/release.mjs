import { launch, boot, viewAs, text, sleep, clickText, BASE } from "./h.mjs";

const { browser, page, errors } = await launch();

// as Tobi first: the hidden 62% must not be anywhere
await boot(page, "mem-tobi", "/grow/curricula");
let t = await text(page);
console.log("child sees 62%:", /62%/.test(t), "| sees 'Eights are the shaky ones':", t.includes("Eights are the shaky"));
console.log("child MATHS line:", (t.match(/MATHS[\s\S]{0,40}/) || [""])[0].replace(/\n/g, " | "));
const raw = await page.evaluate(() => localStorage.getItem("wafe:demo:curricula:v1"));
console.log("hidden grade in localStorage (parent-side store, expected true):", raw.includes("Eights are the shaky"));

// parent releases it
await viewAs(page, "mem-ife", "/grow/curricula/mem-tobi/assignments/asn-t-m3");
t = await text(page);
console.log("parent sees mark:", /62%/.test(t), "| release button:", t.includes("Release the mark"));
console.log("clicked release:", await clickText(page, "button", "Release the mark"));
await sleep(900);
t = await text(page);
console.log("after release parent says child can see:", t.includes("can see this mark"), "| btn now:", t.includes("Keep it back"));

// child again
await viewAs(page, "mem-tobi", "/grow/curricula");
t = await text(page);
console.log("child NOW sees 62%:", /62%/.test(t), "| comment:", t.includes("Eights are the shaky"));
console.log("child MATHS line:", (t.match(/MATHS[\s\S]{0,40}/) || [""])[0].replace(/\n/g, " | "));

// child cannot grade / cannot see parent controls
console.log("child sees 'Mark it':", t.includes("Mark it"), "| 'Award a badge':", t.includes("Award a badge"), "| 'Term report':", t.includes("Term report"), "| 'Set work':", t.includes("Set work"));

// child on sibling's page -> must be denied
await page.goto(BASE + "/grow/curricula/mem-dami", { waitUntil: "networkidle2" });
await sleep(900);
t = await text(page);
console.log("child on sibling page URL:", page.url());
console.log("sibling page shows Dami work?", t.includes("Macbeth") || t.includes("Trigonometry"), "| text:", t.slice(t.indexOf("Wàfè") + 5, 400).replace(/\n+/g, " | ").slice(0, 500));
console.log("ERRORS:", errors);
await browser.close();

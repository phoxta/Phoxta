import { launch, boot, go, txt, hscroll, SHOTS } from "./_bv_lib.mjs";

const { browser, page, errs } = await launch();
const body = async () => (await txt(page)).split("Create your own family")[1] ?? await txt(page);
const st = () => page.evaluate(() => JSON.parse(localStorage.getItem("wafe:demo:bible:v1")));

const PRIV_IFE = "My own heart about the business";
const PRIV_DAMI = "That I would stop being so afraid of the results";
const ADULT_TAGGED = ["The building fund at the chapel", "Mrs Hall next door", "Tunde's men's group"]; // check later

await boot(page, "mem-ife", "/");
await page.evaluate(() => localStorage.removeItem("wafe:demo:bible:v1"));

// which open prayers are not child-safe?
await go(page, "/grow/bible");
const s = await st();
console.log("OPEN prayers (title | vis | childSafe | tags | guests | fromGuest):");
for (const p of s.prayers.filter(p=>p.status==="open")) console.log("  ", [p.title, p.visibility, p.childSafe, p.tags.join("+"), p.sharedWithGuests, p.fromGuest].join(" | "));
console.log("\nwallGuestIds:", JSON.stringify(s.wallGuestIds), "graceDays:", JSON.stringify(s.graceDays));

for (const who of ["mem-dami","mem-tobi","mem-ayo","mem-folake","mem-dayo"]) {
  await page.evaluate((v) => localStorage.setItem("wafe:demo:view-as", v), who);
  for (const path of ["/grow/bible", "/grow/bible/prayer", "/grow/bible/verses"]) {
    await go(page, path);
    const t = await body();
    console.log("\n############ " + who + " " + path + " ############");
    console.log(t.slice(0, 2600));
  }
}
console.log("\nERRORS:", JSON.stringify(errs));
await browser.close();

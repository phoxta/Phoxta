import { boot, go } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories", 2500);
const dump = await page.evaluate(() => {
    const k = Object.keys(localStorage).filter(k=>k.includes("memories"));
    const out = {keys:k};
    for (const key of k) { try { const v = JSON.parse(localStorage.getItem(key)); out.summary = { photos: v.photos?.length, albums: v.albums?.map(a=>({id:a.id,title:a.title,tripId:a.tripId,visibility:a.visibility,auto:a.auto})), reels: v.reels?.map(r=>({id:r.id,title:r.title,status:r.status,autoKind:r.autoKind,frames:(v.frames||[]).filter(f=>f.reelId===r.id).length})), links: v.links, grants: v.grants, events: v.events?.length, }; } catch(e){ out.err = String(e); } }
    return out;
});
console.log(JSON.stringify(dump, null, 1).slice(0, 6000));
await browser.close();

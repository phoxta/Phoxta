import { boot, go, shot } from "./_vmem_lib.mjs";
const { browser, page } = await boot({});
await go(page, "/create/memories", 2500);
const a = await page.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1")); return v.albums.map(x=>({id:x.id,title:x.title,vis:x.visibility,shared:x.sharedWith,contrib:x.contributorIds||x.contributors,childSafe:x.childSafe})); });
console.log(JSON.stringify(a,null,1));
await browser.close();

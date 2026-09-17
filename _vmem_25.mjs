import { boot, go, shot } from "./_vmem_lib.mjs";
import { clickExact, dialogText } from "./_vmem_lib2.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories", 2500);
console.log("open upload:", await clickExact(page, "Add pictures"));
await new Promise(r=>setTimeout(r,900));
const acc = await page.evaluate(()=>{const i=document.querySelector('input[type=file]'); return i? i.getAttribute("accept"): "NO INPUT";});
console.log("accept:", acc);
// build files in-page and inject
const res = await page.evaluate(async ()=>{
  const mk = async (w,h,type,name)=>{ const c=document.createElement("canvas"); c.width=w;c.height=h; const x=c.getContext("2d"); const g=x.createLinearGradient(0,0,w,h); g.addColorStop(0,"#c33"); g.addColorStop(1,"#39c"); x.fillStyle=g; x.fillRect(0,0,w,h); const b=await new Promise(r=>c.toBlob(r,type,0.9)); return new File([b],name,{type,lastModified:Date.now()}); };
  const jpg = await mk(3000,2000,"image/jpeg","big-photo.jpg");
  const png = await mk(2400,1200,"image/png","wide.png");
  const heic = new File([new Uint8Array(2048)], "from-iphone.heic", {type:"image/heic", lastModified: Date.now()});
  const mp4 = new File([new Uint8Array(4096)], "clip.mp4", {type:"video/mp4", lastModified: Date.now()});
  const gif = new File([new Uint8Array(64)], "nope.gif", {type:"image/gif"});
  const dt = new DataTransfer(); [jpg,png,heic,mp4,gif].forEach(f=>dt.items.add(f));
  const inp = document.querySelector('input[type=file]');
  inp.files = dt.files;
  inp.dispatchEvent(new Event("change",{bubbles:true}));
  return {sizes:[jpg.size,png.size,heic.size,mp4.size]};
});
console.log("injected:", JSON.stringify(res));
await new Promise(r=>setTimeout(r,6000));
console.log("--- DIALOG AFTER PICK ---\n"+(await dialogText(page)).slice(0,1400));
await shot(page,"12-upload-staged");
console.log("errors:", errors.filter(e=>e.startsWith("pageerror")).slice(0,4).join(" ~ ")||"none");
await browser.close();

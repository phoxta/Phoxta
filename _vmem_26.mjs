import { boot, go, shot } from "./_vmem_lib.mjs";
import { clickExact, dialogText } from "./_vmem_lib2.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories", 2500);
await clickExact(page, "Add pictures"); await new Promise(r=>setTimeout(r,900));
// choose an album
await page.evaluate(()=>{ const ds=Array.from(document.querySelectorAll('[role=dialog],dialog')).filter(d=>d.offsetParent!==null); });
await page.evaluate(async ()=>{
  const mk = async (w,h,type,name)=>{ const c=document.createElement("canvas"); c.width=w;c.height=h; const x=c.getContext("2d"); x.fillStyle="#c33"; x.fillRect(0,0,w,h); const b=await new Promise(r=>c.toBlob(r,type,0.9)); return new File([b],name,{type,lastModified:Date.now()}); };
  const jpg = await mk(3000,2000,"image/jpeg","big-photo.jpg");
  const png = await mk(2400,1200,"image/png","wide.png");
  const heic = new File([new Uint8Array(2048)], "from-iphone.heic", {type:"image/heic"});
  const mp4 = new File([new Uint8Array(4096)], "clip.mp4", {type:"video/mp4"});
  const dt = new DataTransfer(); [jpg,png,heic,mp4].forEach(f=>dt.items.add(f));
  const inp = document.querySelector('input[type=file]'); inp.files = dt.files; inp.dispatchEvent(new Event("change",{bubbles:true}));
});
await new Promise(r=>setTimeout(r,5000));
const clicked = await page.evaluate(()=>{ const b=Array.from(document.querySelectorAll("button")).find(b=>/^Add \d+ pictures$/.test(b.innerText.trim())); if(b){b.click();return b.innerText.trim();} return "not found"; });
console.log("commit:", clicked);
await new Promise(r=>setTimeout(r,2500));
const added = await page.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1")); return v.photos.slice(-4).map(p=>({fmt:p.format,kind:p.kind,w:p.width,h:p.height,bytes:p.bytes,needsConversion:p.needsConversion,poster:!!p.posterUrl,url:p.url.slice(0,30)})); });
console.log("PERSISTED:", JSON.stringify(added,null,1));
// reload and confirm they survive + show
await go(page, "/create/memories", 3000);
const count = await page.evaluate(()=>{const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1"));return v.photos.length;});
console.log("photo count after reload:", count);
const txt = await page.evaluate(()=>document.querySelector("main").innerText);
console.log("stat line:", (txt.match(/PICTURES\n\d+/)||[""])[0]);
console.log("errors:", errors.filter(e=>e.startsWith("pageerror")).slice(0,4).join(" ~ ")||"none");
await shot(page,"13-after-upload");
await browser.close();

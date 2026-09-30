import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const base=process.env.SCHOOL_TEST_URL||'http://localhost:3014';
const org='2a51e95e-258d-405d-920b-6271d893344f';
const userId='00000000-0000-4000-8000-000000000999';
const browser=await puppeteer.launch({headless:true});
const results=[];
async function open(role,path,width=390){
 const context=await browser.createBrowserContext();const page=await context.newPage();await page.setViewport({width,height:850});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const user={id:userId,email:'browser-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
 if(role!=='anonymous')await page.evaluateOnNewDocument((user)=>{const now=Math.floor(Date.now()/1000);const enc=v=>btoa(JSON.stringify(v));const access_token=`${enc({alg:'HS256'})}.${enc({sub:user.id,exp:now+3600,role:'authenticated'})}.test-only`;localStorage.setItem('startup-school-auth',JSON.stringify({access_token,refresh_token:'test-only',token_type:'bearer',expires_in:3600,expires_at:now+3600,user}));},user);
 await page.setRequestInterception(true);
 page.on('request',request=>{
   if(!request.url().includes('.supabase.co')){void request.continue();return;}
   // No synthetic credentials or test mutations are ever sent to Supabase.
   let data=[];const url=request.url();
   if(url.includes('/app_resolve_domain'))data=[{organization_id:org,name:'Startup School',branding:null}];
   else if(url.includes('/organizations'))data={id:org,name:'Startup School',branding:null};
   else if(url.includes('/cs_staff_identity'))data={assignments:['anonymous','learner'].includes(role)?[]:[{id:'a1',role,scope_type:'school',scope_id:'',expires_at:null}]};
   else if(url.includes('/cs_entitlements'))data=role==='learner'?{plan:'self_study',status:'active',granted_at:new Date().toISOString()}:null;
   else if(url.includes('/auth/v1/user'))data=user;
   else if(url.includes('/cs_courses'))data=[{id:'course-test',title:'Test a business opportunity',slug:'opportunity',published:true,category_id:'start',mentor_id:'mentor-test'}];
   else if(url.includes('/cs_categories'))data=[{id:'start',name:'Start'}];
   else if(url.includes('/cs_mentors'))data=[{id:'mentor-test',name:'Your lecturer',user_id:userId}];
   else if(url.includes('/cs_school_command'))data={id:'revision-test',state:'draft',version:1,review_notes:'',document:{title:'Test a business opportunity',blurb:'A practical course',description:'Find a real customer need.',outcomes:['Test demand'],modules:[{id:'m1',title:'Opportunity',lessons:[{id:'l1',title:'The customer problem',kind:'article',body:'**Understand the problem.**\n\n1. Speak to customers.\n2. Record the evidence.',video_url:'',captions_url:'',duration_sec:600,questions:[]}]}]}};
   void request.respond({status:request.method()==='OPTIONS'?204:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'},body:request.method()==='OPTIONS'?undefined:JSON.stringify(data)});
 });
 await page.goto(base+path,{waitUntil:'networkidle0',timeout:60000});
 return {page,context,errors};
}
try{
 for(const width of [320,390,1440]){
   const {page,context,errors}=await open('anonymous','/pricing',width);
   const text=await page.$eval('body',el=>el.innerText);
   for(const price of ['\u00a3250','\u00a31,200','\u00a35,000'])assert(text.includes(price),`Missing price ${price}`);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Pricing overflow');assert.deepEqual(errors,[]);results.push(`Pricing ${width}px: prices, navigation, no horizontal overflow`);await context.close();
 }
 for(const role of ['owner','lecturer','mentor','content_editor','support','finance','launch_coordinator']){
   const {page,context,errors}=await open(role,'/staff',390);
   assert((await page.url()).endsWith('/staff'));
   const nav=await page.$eval('nav[aria-label="Staff workspace"]',el=>el.innerText);
   if(role==='mentor')assert(!nav.includes('Content')&&!nav.includes('People'));
   if(role==='content_editor')assert(nav.includes('Content')&&!nav.includes('Operations'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${role}: overflow`);
   await page.$eval('#staff-main',el=>el.scrollTop=500);
   assert.equal(await page.evaluate(()=>window.scrollY),0,'Outer document scrolled');assert.deepEqual(errors,[]);
   results.push(`${role}: staff route without payment, scoped navigation, isolated scroll`);await context.close();
 }
 for(const role of ['owner','lecturer','mentor']){
   const {page,context,errors}=await open(role,'/staff/teaching',390);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${role} teaching overflow`);assert.deepEqual(errors,[]);results.push(`${role}: teaching page renders`);await context.close();
 }
 for(const path of ['/staff/people','/staff/operations','/staff/support','/programme']){
   const {page,context,errors}=await open('owner',path,390);assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path}: overflow`);results.push(`${path}: mobile render`);await context.close();
 }
 const editor=await open('content_editor','/staff/content',390);
 await editor.page.click('article button');await editor.page.waitForFunction(()=>document.body.innerText.includes('Lesson editor'));
 assert(!(await editor.page.$eval('body',el=>el.innerText)).includes('Approve & publish'));
 assert(await editor.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Editor overflow');assert.deepEqual(editor.errors,[]);results.push('Editor: opens private revision, no publisher controls, mobile layout');await editor.context.close();
 for(const role of ['anonymous','learner']){
   const {page,context}=await open(role,'/staff/people');assert((await page.url()).includes(role==='anonymous'?'/login':'/pricing'));results.push(`${role}: staff access denied`);await context.close();
 }
 console.log(JSON.stringify({passed:results.length,results},null,2));
}finally{await browser.close();}

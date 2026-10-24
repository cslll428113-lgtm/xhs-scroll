const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const mode of ['native','router','href-router']){
   const page=await browser.newPage();
   await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:'<a class="cover" href="/bad"><img id="cover"></a>'}));
   await page.goto('https://fixture.test/feed');
   await page.addScriptTag({path:path.resolve(__dirname,'../card-click.js')});
   const result=await page.evaluate(mode=>{
    const a=document.querySelector('a');let calls=0,wasPrevented;
    const handler=e=>{calls++;wasPrevented=e.defaultPrevented;if(mode==='router'||mode==='href-router'){if(e.defaultPrevented)return;if(mode==='href-router'&&!a.getAttribute('href'))return;history.pushState({},'', '/opened');e.preventDefault();}if(mode==='stop')e.stopPropagation();if(mode==='immediate')e.stopImmediatePropagation();};
    a.addEventListener('click',handler);
    XhsCardClick.click(a);
    return {calls,wasPrevented,href:a.getAttribute('href')};
   },mode);
   await page.waitForTimeout(100);
   assert.equal(result.calls,1);assert.equal(result.wasPrevented,false);assert.equal(result.href,'/bad');
   assert.equal(new URL(page.url()).pathname,mode!=='native'?'/opened':'/feed');
   console.log('PASS:',mode,'— handler runs before cancellation, no native navigation');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

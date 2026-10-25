const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const A='a'.repeat(24),B='b'.repeat(24),C='c'.repeat(24);
const url=id=>`https://www.xiaohongshu.com/explore/${id}?xsec_token=original-${id[0]}&xsec_source=pc_feed`;
const storedQueue=()=>JSON.stringify({version:2,items:[A,B,C].map(id=>({href:url(id)})),collapsed:false});
function setup(options={}){
 const controls=new Map(),listeners={},windowEvents={},assignments=[],refreshes=[],messages=[];const storage=options.storage||new Map([['shuluo-xhs-queue-v2',storedQueue()]]);let video,comments;
 class Node{
  constructor(){this.isConnected=true;this.listeners={};this.style={cssText:'',setProperty:(k,v)=>this.hidden=v==='none'};this.attrs={};this.loop=true;this.currentTime=10;this.currentSrc='media-a';this.playCount=0;this.className='';this.classList={add(){},remove(){}};}
  getBoundingClientRect(){return {left:100,top:100,right:600,bottom:600,width:this.hidden?0:500,height:this.hidden?0:500};}
  hasAttribute(k){return k in this.attrs;}getAttribute(k){return this.attrs[k]??null;}setAttribute(k,v){this.attrs[k]=v;if(k==='style')this.hidden=/display.*none/.test(v);}removeAttribute(k){delete this.attrs[k];if(k==='style')this.hidden=false;}
  addEventListener(k,fn){this.listeners[k]=fn;}removeEventListener(k){delete this.listeners[k];}closest(){return null;}querySelector(){return null;}
  play(){this.playCount++;return Promise.resolve();}scrollIntoView(){throw Error('Must not scroll a native video to navigate');}click(){throw Error('Must not close a post or click stale cards');}
  attachShadow(){return {innerHTML:'',querySelector:s=>{if(!controls.has(s))controls.set(s,new Node());return controls.get(s);}};}
 }
 video=new Node();comments=new Node();comments.hidden=true;
 let detail=!options.list,scrolls=0;
 const feedScroll={scrollTop:125,scrollLeft:0,parentElement:null,style:{scrollBehavior:"smooth"}};
 const makeCard=({id,video:isVideo=true})=>{
  const card=new Node();card.parentElement=feedScroll;
  card.scrollIntoView=()=>{scrolls++;feedScroll.scrollTop=900;if(options.more?.length){const more=options.more.splice(0);cards.push(...more.map(makeCard));}else throw Error('No further fixture items');};
  const cover=new Node();cover.attrs.href=url(id);
  cover.ownerDocument={defaultView:{getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})}};
  cover.getBoundingClientRect=()=>({width:detail?0:238,height:detail?0:317});
  cover.click=()=>{detail=true;video=new Node();video.currentSrc='media-'+id;context.location.href=url(id);context.location.pathname=new URL(url(id)).pathname;};
  const hidden=new Node();hidden.attrs.href=url(id);hidden.ownerDocument=cover.ownerDocument;hidden.getBoundingClientRect=()=>({width:0,height:0});hidden.click=()=>{throw Error('hidden SEO link clicked');};
  card.querySelectorAll=s=>s==='a.cover[href]'?[cover]:s==='a.title[href]'?[]:[hidden,cover];
  card.querySelector=s=>{if(s.includes('.play-icon'))return isVideo?new Node():null;if(s.includes('a.cover'))return cover;if(s==='.title')return {textContent:'Video '+id[0]};return null;};
  return card;
 };
 const cards=(options.cards||[]).map(makeCard);
 const current=options.href||url(A);
 const doc={hidden:false,activeElement:null,body:new Node(),documentElement:{append(){}},getElementById(){return null;},createElement(){return new Node();},addEventListener(k,f){listeners[k]=f;},querySelectorAll(s){if(s==='video')return detail?[video]:[];if(s==='.note-detail-mask,#noteContainer')return detail?[new Node()]:[];if(s.includes('.close-circle')){const close=new Node();close.click=()=>{detail=false;context.location.href='https://www.xiaohongshu.com/explore';context.location.pathname='/explore';};return detail?[close]:[];}if(s.includes('comments-container'))return [comments];if(s.includes('note-item'))return cards;return [];}};
 let scan;const context={URL,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(options.failStorage)throw Error('quota');storage.set(k,v);}},document:doc,location:{href:current,pathname:new URL(current).pathname,hash:new URL(current).hash,assign:href=>assignments.push(href),reload:()=>{if(options.failRefresh)throw Error('reload failed');refreshes.push('reload');},replace:href=>{if(options.failRefresh)throw Error('replace failed');refreshes.push(href);}},innerWidth:1000,innerHeight:800,console,Date:options.clock?class extends Date{static now(){return options.clock.now;}}:Date,Map,Promise,getComputedStyle:e=>({display:e.hidden?'none':'block',visibility:'visible',opacity:'1'}),chrome:{runtime:{sendMessage:(msg,cb)=>{messages.push(msg);cb({ok:true});}},storage:{local:{set(){},get(defaults,cb){cb({...defaults,collect:!!options.collect});}}}},MutationObserver:class{observe(){}disconnect(){}},setTimeout:fn=>{Promise.resolve().then(fn);return 1;},clearTimeout(){},setInterval:fn=>{scan=fn;return 1;},clearInterval(){},window:{addEventListener(k,fn){windowEvents[k]=fn;}}};
 let pipHooks,pipActive=false;
 if(options.pip)context.testPip={create:hooks=>{pipHooks=hooks;return {active:()=>pipActive,supported:()=>true,sync(){},open(){pipActive=true;hooks.onChange();return true;},close(){pipActive=false;hooks.onChange();}};}};
 context.XhsFloating={install:()=>({restore(){},fit(){}})};context.XhsCardClick={click:card=>card.click()};
 vm.createContext(context);for(const f of ['policy.js','queue.js','live-queue.js','card-target.js','navigation.js','close-control.js','pip.js','content.js']){if(f==='content.js'&&context.testPip)context.XhsPip=context.testPip;vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),context);}
 return {video,comments,doc,pipHooks:()=>pipHooks,controls,listeners,windowEvents,assignments,refreshes,messages,storage,scan:()=>scan(),getFeedPosition:()=>feedScroll.scrollTop,getScrolls:()=>scrolls,getHref:()=>context.location.href,replaceCards:items=>cards.splice(0,cards.length,...items.map(makeCard))};
}
test('manual mode replays without changing the page',()=>{const x=setup();x.video.listeners.ended({currentTarget:x.video});assert.equal(x.video.currentTime,0);assert.equal(x.video.playCount,1);assert.deepEqual(x.assignments,[]);});
test('background and text editing prevent automatic switches',()=>{for(const kind of ['background','editing']){const x=setup();x.controls.get('#auto').onchange({target:{checked:true}});if(kind==='background')x.doc.hidden=true;else x.doc.activeElement={closest:()=>({})};x.video.listeners.ended({currentTarget:x.video});assert.deepEqual(x.assignments,[]);assert.equal(x.video.playCount,1);}});
test('opened comments keep current video repeating',()=>{const x=setup();x.controls.get('#auto').onchange({target:{checked:true}});x.controls.get('#comments').onclick();x.comments.hidden=false;x.video.listeners.ended({currentTarget:x.video});assert.deepEqual(x.assignments,[]);assert.equal(x.video.playCount,1);});
test('disable restores native looping and hidden comments',()=>{const x=setup();x.comments.hidden=false;x.controls.get('#auto').onchange({target:{checked:true}});assert.equal(x.comments.hidden,true);x.controls.get('#enabled').onchange({target:{checked:false}});assert.equal(x.comments.hidden,false);assert.equal(x.video.loop,true);assert.equal(x.video.listeners.ended,undefined);});
test('scrolling inside comments is not intercepted',()=>{const x=setup();let prevented=false;x.listeners.wheel({target:{closest:()=>({})},deltaY:100,deltaX:0,clientX:300,clientY:300,composedPath:()=>[],preventDefault(){prevented=true;}});assert.equal(prevented,false);});
test('obsolete stored URL list is not revived on an error/detail page',()=>{const x=setup();assert.match(x.controls.get('#queueinfo').textContent,/当前页面暂无视频列表/);assert.equal(x.controls.get('#start').disabled,true);});

test('opening, scanning, and reaching list end never scrolls or loads the feed',async()=>{
 const x=setup({list:true,href:'https://www.xiaohongshu.com/explore',cards:[{id:A},{id:B}],more:[{id:C}]});
 x.controls.get('#start').onclick();await new Promise(r=>setImmediate(r));x.scan();await new Promise(r=>setImmediate(r));
 assert.match(x.controls.get('#queueinfo').textContent,/2 条/);assert.equal(x.getScrolls(),0);assert.deepEqual(x.assignments,[]);
 await x.controls.get('#next').onclick();assert.match(x.controls.get('#queueinfo').textContent,/待播 0 条 · 当前列表 2 条/);
 await x.controls.get('#next').onclick();assert.equal(x.getScrolls(),0);assert.deepEqual(x.assignments,[]);
});

test('compact panel starts folded and both controls change hidden state',()=>{
 const x=setup();assert.equal(x.controls.get('#panel').hidden,true);assert.equal(x.controls.get('#mini').hidden,false);
 x.controls.get('#mini').onclick();assert.equal(x.controls.get('#panel').hidden,false);assert.equal(x.controls.get('#mini').hidden,true);
 x.controls.get('#fold').onclick();assert.equal(x.controls.get('#panel').hidden,true);assert.equal(x.controls.get('#mini').hidden,false);
});

test('old collection preference never causes the original page to scroll',async()=>{
 const clock={now:Date.now()};const x=setup({clock,collect:true,list:true,href:'https://www.xiaohongshu.com/explore',cards:[{id:A},{id:B}],more:[{id:C}]});
 x.controls.get('#start').onclick();await new Promise(r=>setImmediate(r));x.scan();await new Promise(r=>setImmediate(r));
 assert.match(x.controls.get('#queueinfo').textContent,/2 条/);assert.equal(x.getScrolls(),0);assert.equal(x.getFeedPosition(),125);assert.deepEqual(x.assignments,[]);
});
test('hidden feed covers still collected and found before closing note modal',async()=>{
 const x=setup({cards:[{id:A},{id:B}]});
 assert.match(x.controls.get('#queueinfo').textContent,/待播 1 条 · 当前列表 2 条/);
 await x.controls.get('#next').onclick();
 assert.match(x.controls.get('#queueinfo').textContent,/待播 0 条 · 当前列表 2 条/);assert.deepEqual(x.assignments,[]);
});

test('dedicated tab opens an existing note without waiting for collection',async()=>{
 const x=setup({collect:true,list:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream',cards:[{id:A},{id:B}],more:[{id:C}]});
 await new Promise(r=>setImmediate(r));x.scan();await new Promise(r=>setImmediate(r));
 assert.match(x.controls.get('#queueinfo').textContent,/专用模式/);assert.equal(x.controls.get('#stream').hidden,true);assert.equal(x.controls.get('#start').style.display,'none');assert.equal(x.getFeedPosition(),125);assert.deepEqual(x.assignments,[]);
});

test('opening dedicated stream pauses original autoplay and leaves its feed alone',()=>{const x=setup({collect:true,cards:[]});x.controls.get('#auto').onchange({target:{checked:true}});x.controls.get('#stream').onclick();assert.equal(x.controls.get('#auto').checked,false);assert.equal(x.getScrolls(),0);assert.deepEqual(x.assignments,[]);});

test('folded controls navigate without expanding settings',async()=>{const x=setup({cards:[{id:A},{id:B}]});assert.equal(x.controls.get('#compact').hidden,false);assert.equal(x.controls.get('#panel').hidden,true);await x.controls.get('#mini-next').onclick();assert.match(x.controls.get('#queueinfo').textContent,/待播 0 条/);assert.equal(x.controls.get('#panel').hidden,true);});
test('arrow keys navigate when folded even with comments visible',async()=>{const x=setup({cards:[{id:A},{id:B}]});x.comments.hidden=false;let prevented=false;x.listeners.keydown({key:'ArrowDown',composedPath:()=>[],preventDefault(){prevented=true;},stopPropagation(){}});await new Promise(r=>setImmediate(r));assert.equal(prevented,true);assert.match(x.controls.get('#queueinfo').textContent,/待播 0 条/);});
test('arrow keys inside a comment or text field retain native behavior',()=>{const x=setup({cards:[{id:A},{id:B}]});let prevented=false;x.listeners.keydown({key:'ArrowDown',composedPath:()=>[{matches:()=>true}],preventDefault(){prevented=true;},stopPropagation(){}});assert.equal(prevented,false);});
test('resizing schedules a player scan instead of leaving stale state',()=>{const x=setup();assert.equal(typeof x.windowEvents.resize,'function');assert.doesNotThrow(()=>x.windowEvents.resize());});


test('replaced feed drops stale first entry before start',async()=>{
 const x=setup({list:true,href:'https://www.xiaohongshu.com/red_video',cards:[{id:A},{id:B}]});
 x.replaceCards([{id:B},{id:C}]);x.scan();
 assert.match(x.controls.get('#queueinfo').textContent,/当前列表 2 条/);
 await x.controls.get('#start').onclick();await new Promise(r=>setImmediate(r));
 assert.equal(x.getHref(),url(B));
});
test('start synchronizes cards even before the periodic scan',async()=>{
 const x=setup({list:true,href:'https://www.xiaohongshu.com/red_video',cards:[{id:A}]});
 x.replaceCards([{id:C}]);await x.controls.get('#start').onclick();await new Promise(r=>setImmediate(r));
 assert.equal(x.getHref(),url(C));
});
test('refresh uses new document cards instead of saved queue',async()=>{
 const old=setup({list:true,href:'https://www.xiaohongshu.com/red_video',cards:[{id:A},{id:B}]});
 const x=setup({storage:old.storage,list:true,href:'https://www.xiaohongshu.com/red_video',cards:[{id:C}]});
 assert.match(x.controls.get('#queueinfo').textContent,/当前列表 1 条/);
 await x.controls.get('#start').onclick();await new Promise(r=>setImmediate(r));assert.equal(x.getHref(),url(C));
});
test('empty replacement clears stale list and disables start',()=>{
 const x=setup({list:true,href:'https://www.xiaohongshu.com/red_video',cards:[{id:A}]});
 x.replaceCards([]);x.scan();assert.equal(x.controls.get('#start').disabled,true);
});
test('current playback remains an anchor when feed cards are replaced',async()=>{
 const x=setup({cards:[{id:A},{id:B}]});x.replaceCards([{id:C}]);x.scan();
 await x.controls.get('#next').onclick();assert.equal(x.getHref(),url(C));
});


test('dedicated page with enough cards opens immediately without filling a large buffer',async()=>{
 const ids=Array.from({length:35},(_,i)=>(i+1).toString(16).padStart(24,'0'));
 const x=setup({collect:true,list:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream',cards:ids.map(id=>({id}))});
 await new Promise(r=>setImmediate(r));
 for(let i=0;i<50;i++)x.scan();
 await new Promise(r=>setImmediate(r));assert.equal(x.getHref(),url(ids[0]));assert.equal(x.getScrolls(),0);
 await x.controls.get('#next').onclick();assert.equal(x.getHref(),url(ids[1]));assert.equal(x.getScrolls(),0);
});
test('dedicated page never scrolls even when cards run low',async()=>{
 const x=setup({collect:false,list:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream',cards:[{id:A}],more:[{id:B}]});
 await new Promise(r=>setImmediate(r));assert.equal(x.getScrolls(),0);
});


test('expanded refresh button reloads the dedicated feed only after a click',()=>{
 const x=setup({list:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream'});
 for(let i=0;i<50;i++)x.scan();assert.deepEqual(x.refreshes,[]);
 x.controls.get('#refresh').onclick();assert.deepEqual(x.refreshes,['reload']);
 x.controls.get('#refresh').onclick();assert.equal(x.refreshes.length,1);
 assert.equal(x.messages.length,0);
});
test('compact refresh returns from the playing note to a fresh official feed',async()=>{
 const x=setup({list:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream',cards:[{id:A}]});
 await new Promise(r=>setImmediate(r));assert.equal(x.getHref(),url(A));
 x.controls.get('#mini-refresh').onclick();
 assert.deepEqual(x.refreshes,['https://www.xiaohongshu.com/red_video#shuluo-stream']);assert.equal(x.controls.get('#panel').hidden,true);
});
test('ordinary homepage refresh button opens a separate tab and never refreshes the homepage',()=>{
 const x=setup({list:true,href:'https://www.xiaohongshu.com/explore',cards:[{id:A}]});
 x.controls.get('#refresh').onclick();assert.equal(x.messages[0].type,'xhs-open-stream');
 assert.deepEqual(x.refreshes,[]);assert.deepEqual(x.assignments,[]);assert.equal(x.getScrolls(),0);
});
test('refresh failure releases the controls and reports the error',()=>{
 const x=setup({list:true,failRefresh:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream'});
 x.controls.get('#refresh').onclick();assert.equal(x.controls.get('#refresh').disabled,false);
 assert.match(x.controls.get('#status').textContent,/未能刷新/);
});
test('refresh starts the new document from fresh cards without old entries',async()=>{
 const old=setup({list:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream',cards:[{id:A},{id:B}]});
 await new Promise(r=>setImmediate(r));old.controls.get('#refresh').onclick();
 const x=setup({storage:old.storage,list:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream',cards:[{id:C}]});
 await new Promise(r=>setImmediate(r));assert.equal(x.getHref(),url(C));
 assert.match(x.controls.get('#queueinfo').textContent,/当前列表 1 条/);assert.deepEqual(x.refreshes,[]);
});
test('all loaded videos are retained beyond old limits and history is not trimmed',async()=>{
 const ids=Array.from({length:240},(_,i)=>(i+1).toString(16).padStart(24,'0'));
 const x=setup({list:true,href:'https://www.xiaohongshu.com/explore',cards:ids.map(id=>({id}))});
 assert.match(x.controls.get('#queueinfo').textContent,/当前列表 240 条/);
 await x.controls.get('#start').onclick();await new Promise(r=>setImmediate(r));
 assert.match(x.controls.get('#queueinfo').textContent,/待播 239 条/);assert.equal(x.getScrolls(),0);
});


test('PiP autoplay continues on a background tab, with comments left on the original page',async()=>{
 const x=setup({pip:true,cards:[{id:A},{id:B}]});
 x.controls.get('#pip').onclick();x.pipHooks().onAuto(true);
 x.comments.hidden=false;x.doc.hidden=true;x.doc.activeElement={closest:()=>({})};
 x.video.listeners.ended({currentTarget:x.video});
 await new Promise(r=>setImmediate(r));
 assert.equal(x.getHref(),url(B));assert.equal(x.getScrolls(),0);assert.deepEqual(x.refreshes,[]);
});
test('background watchdog scans the next source while PiP is open',async()=>{
 const x=setup({pip:true,cards:[{id:A},{id:B}]});x.controls.get('#pip').onclick();x.doc.hidden=true;
 await x.pipHooks().onNavigate(1);x.scan();
 assert.equal(x.pipHooks().getVideo().currentSrc,'media-'+B);
});
test('disabling closes PiP and restores ordinary background behavior',()=>{
 const x=setup({pip:true,cards:[{id:A},{id:B}]});x.controls.get('#pip').onclick();
 x.controls.get('#enabled').onchange({target:{checked:false}});
 assert.equal(x.controls.get('#pip').textContent,'小窗刷视频');assert.equal(x.controls.get('#pip').disabled,true);
});
test('PiP refresh is explicit and uses only the dedicated tab',async()=>{
 const x=setup({pip:true,list:true,href:'https://www.xiaohongshu.com/red_video#shuluo-stream',cards:[{id:A}]});
 await new Promise(r=>setImmediate(r));x.controls.get('#pip').onclick();
 assert.deepEqual(x.refreshes,[]);x.pipHooks().onRefresh();
 assert.equal(x.storage.get('shuluo-pip-refresh'),'1');assert.equal(x.refreshes.length,1);
});

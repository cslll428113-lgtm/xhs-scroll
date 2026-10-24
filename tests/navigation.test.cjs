const {test}=require('node:test');const assert=require('node:assert/strict');const {create}=require('../navigation.js');
function fixture(){
 const calls=[];const oldVideo={};let state={id:'old',video:oldVideo,src:'old-src'};let blocked=false;let lookups=0;
 const adapter={
  clickCard:card=>card.click(),
  blocked:()=>blocked,snapshot:()=>state,hasDetail:()=>!!state.video,
  closeCurrent:()=>{calls.push('close');state={id:null,video:null};return true;},
  findCard:id=>{lookups++;const lookup=lookups;return {click(){calls.push('click-'+lookup);state={id,video:{},src:'new-src'};}};},
  waitUntil:async f=>f()
 };
 return {calls,adapter,get:()=>state,set:s=>state=s,block:()=>blocked=true};
}
test('fresh card is re-resolved after modal closes, then video verified',async()=>{const f=fixture();assert.deepEqual(await create(f.adapter).open('next'),{ok:true});assert.deepEqual(f.calls,['close','click-3']);assert.equal(f.get().id,'next');});
test('starting from list clicks original card without closing anything',async()=>{const f=fixture();f.set({id:null,video:null});assert.equal((await create(f.adapter).open('next')).ok,true);assert.deepEqual(f.calls,['click-3']);});
test('no target card leaves current modal untouched',async()=>{const f=fixture();f.adapter.findCard=()=>null;assert.deepEqual(await create(f.adapter).open('next'),{ok:false,reason:'missing-card'});assert.deepEqual(f.calls,[]);});
test('close timeout never clicks the next card',async()=>{const f=fixture();f.adapter.closeCurrent=()=>{f.calls.push('close');return true;};assert.deepEqual(await create(f.adapter).open('next'),{ok:false,reason:'close-failed'});assert.deepEqual(f.calls,['close']);});
test('missing close control does not use URL navigation as fallback',async()=>{const f=fixture();f.adapter.closeCurrent=()=>false;assert.deepEqual(await create(f.adapter).open('next'),{ok:false,reason:'no-close'});assert.deepEqual(f.calls,[]);});
test('login/security prompt stops further card clicks',async()=>{const f=fixture();f.block();assert.deepEqual(await create(f.adapter).open('next'),{ok:false,reason:'blocked'});assert.deepEqual(f.calls,[]);});
test('URL change alone cannot count as successful playback',async()=>{const f=fixture();f.adapter.findCard=id=>({click:()=>f.set({id,video:null})});assert.deepEqual(await create(f.adapter).open('next'),{ok:false,reason:'open-failed'});});
test('old video still present cannot count as target playback',async()=>{const f=fixture();const old=f.get();f.adapter.findCard=id=>({click:()=>f.set({...old,id})});assert.deepEqual(await create(f.adapter).open('next'),{ok:false,reason:'open-failed'});});
test('two transitions in same page preserve working navigation',async()=>{const f=fixture();const nav=create(f.adapter);assert.equal((await nav.open('next')).ok,true);assert.equal((await nav.open('third')).ok,true);assert.equal(f.get().id,'third');});

test('hidden preflight target is checked for layout only after closing modal',async()=>{const f=fixture();let detail=true;f.adapter.closeCurrent=()=>{detail=false;f.set({video:null});return true;};f.adapter.findCard=(id,requireLayout)=>requireLayout&&detail?null:{click:()=>f.set({id,video:{},src:'new'})};assert.equal((await create(f.adapter).open('next')).ok,true);});

test('responsive header is allowed to settle before closing',async()=>{const f=fixture();let checks=0;f.adapter.canClose=()=>++checks>=2;f.adapter.waitUntil=async check=>check()||check();assert.equal((await create(f.adapter).open('next')).ok,true);assert.equal(checks,2);});

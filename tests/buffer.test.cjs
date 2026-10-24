const {test}=require('node:test');const assert=require('node:assert/strict');const {create}=require('../buffer.js');
function fixture({items=3,batch=7,allowed=true}={}){
 let count=items,clock=0,steps=0,restores=0,running=false;
 const a={now:()=>clock,wait:async ms=>{clock+=ms;},allowed:()=>allowed,count:()=>count,remaining:()=>count,collect(){},savePosition:()=>()=>{restores++;},advance:()=>{steps++;count+=batch;},progress:v=>running=v};
 const buffer=create(a);return {a,buffer,result:()=>({count,steps,restores,running}),allow:v=>allowed=v,advanceClock:ms=>clock+=ms};
}
test('one fill loads multiple batches up to target instead of stopping on first new card',async()=>{const f=fixture();await f.buffer.fill();assert.deepEqual(f.result(),{count:31,steps:4,restores:1,running:false});});
test('successful refill resumes after a ten-second gap',async()=>{const f=fixture({items:1,batch:1});await f.buffer.fill({target:2});f.advanceClock(10001);await f.buffer.fill({target:4});assert.equal(f.result().count,4);});
test('sufficient buffer does not scroll or take ownership of feed',async()=>{const f=fixture({items:35});await f.buffer.fill();assert.equal(f.result().steps,0);assert.equal(f.result().restores,0);});
test('empty responses stop after two attempts, back off, then allow retry',async()=>{const f=fixture({batch:0});await f.buffer.fill();assert.equal(f.result().steps,2);await f.buffer.fill();assert.equal(f.result().steps,2);f.advanceClock(30001);await f.buffer.fill();assert.equal(f.result().steps,4);});
test('cancel restores scroll synchronously and prevents subsequent batches',async()=>{
 const f=fixture();let release;f.a.wait=()=>new Promise(r=>release=r);
 const work=f.buffer.fill();await Promise.resolve();assert.equal(f.result().steps,1);
 f.buffer.cancel();assert.equal(f.result().restores,1);release();await work;
 assert.equal(f.result().steps,1);assert.equal(f.result().restores,1);assert.equal(f.buffer.running,false);
});
test('concurrent fill shares one worker and disallowed state stops it',async()=>{
 const f=fixture();const a=f.buffer.fill();assert.equal(f.buffer.fill(),a);f.allow(false);await a;assert.equal(f.result().steps,0);assert.equal(f.buffer.running,false);
});

test('new cards count as progress when live list size stays constant',async()=>{
 const f=fixture({items:3,batch:0});let revision=0;f.a.revision=()=>revision;f.a.advance=()=>revision++;
 assert.equal(await f.buffer.fill({target:10,maxPasses:2}),true);assert.equal(revision,2);
});
test('rolling refill keeps loading after the initial thirty',async()=>{
 const f=fixture({items:1,batch:7});await f.buffer.fill({target:30});
 f.advanceClock(10001);await f.buffer.fill({target:120,maxPasses:2});
 assert.ok(f.result().count>30);
 for(let i=0;i<10;i++){f.advanceClock(10001);await f.buffer.fill({target:120,maxPasses:2});}
 assert.ok(f.result().count>=120);
 f.a.remaining=()=>0;f.advanceClock(10001);await f.buffer.fill({target:120,maxPasses:2});
 assert.ok(f.result().count>120);
});


test('mutation bursts cannot immediately restart a successful worker',async()=>{
 const f=fixture({items:0,batch:1});await f.buffer.fill({target:12,maxPasses:1});
 for(let i=0;i<100;i++)await f.buffer.fill({target:12,maxPasses:1});
 assert.equal(f.result().steps,1);
 f.advanceClock(10001);await f.buffer.fill({target:12,maxPasses:1});assert.equal(f.result().steps,2);
});
test('cancelled work stays paused across repeated scans',async()=>{
 const f=fixture();let release;f.a.wait=()=>new Promise(r=>release=r);
 const work=f.buffer.fill();await Promise.resolve();f.buffer.cancel();release();await work;
 f.a.wait=async()=>{};
 for(let i=0;i<100;i++)await f.buffer.fill();
 assert.equal(f.result().steps,1);assert.equal(f.buffer.running,false);
});
test('user interaction postpones collection even when there is no active worker',async()=>{
 const f=fixture();f.buffer.cancel();await f.buffer.fill();assert.equal(f.result().steps,0);
 f.advanceClock(10001);await f.buffer.fill({maxPasses:1});assert.equal(f.result().steps,1);
});


test('navigation can cancel idle collection without postponing future loading',async()=>{
 const f=fixture();f.buffer.cancel({pause:false});await f.buffer.fill({maxPasses:1});assert.equal(f.result().steps,1);
});


test('one empty automatic pass backs off for thirty seconds',async()=>{
 const f=fixture({batch:0});await f.buffer.fill({maxPasses:1});assert.equal(f.result().steps,1);
 f.advanceClock(10001);await f.buffer.fill({maxPasses:1});assert.equal(f.result().steps,1);
 f.advanceClock(20000);await f.buffer.fill({maxPasses:1});assert.equal(f.result().steps,2);
});

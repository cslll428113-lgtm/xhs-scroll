const {test}=require('node:test');const assert=require('node:assert/strict');const {install,clamp}=require('../floating.js');
function fixture(){
 const events={},winEvents={};let saved;
 const host={style:{},getBoundingClientRect:()=>({left:100,top:100,width:224,height:350})};
 const handle={addEventListener:(k,f)=>events[k]=f,setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}};
 const win={innerWidth:1000,innerHeight:800,addEventListener:(k,f)=>winEvents[k]=f};
 const api=install({host,handles:[handle],win,onSave:p=>saved=p});
 const event=(x,y)=>({button:0,target:handle,pointerId:1,clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}});
 return {api,host,events,winEvents,win,event,getSaved:()=>saved};
}
test('drag follows pointer and persists location',()=>{const f=fixture();f.events.pointerdown(f.event(110,110));f.events.pointermove(f.event(260,210));f.events.pointerup(f.event(260,210));assert.deepEqual(f.getSaved(),{x:250,y:200});assert.equal(f.host.style.left,'250px');assert.equal(f.host.style.right,'auto');});
test('click after drag is suppressed but a new ordinary click can expand',()=>{const f=fixture();f.events.pointerdown(f.event(110,110));f.events.pointermove(f.event(200,200));f.events.pointerup(f.event(200,200));let stopped=0;f.events.click({preventDefault(){},stopImmediatePropagation(){stopped++;}});assert.equal(stopped,1);f.events.pointerdown(f.event(200,200));f.events.pointerup(f.event(200,200));f.events.click({preventDefault(){},stopImmediatePropagation(){stopped++;}});assert.equal(stopped,1);});
test('restore and viewport resize keep the panel reachable',()=>{const f=fixture();f.api.restore({x:900,y:750});assert.equal(f.host.style.left,'768px');assert.equal(f.host.style.top,'442px');f.win.innerWidth=500;f.win.innerHeight=500;f.winEvents.resize();assert.equal(f.host.style.left,'268px');assert.equal(f.host.style.top,'142px');});
test('non-finite positions ignored; boundaries clamped',()=>{const f=fixture();f.api.restore({x:NaN,y:10});assert.equal(f.host.style.left,undefined);assert.deepEqual(clamp({x:-100,y:-10},{width:50,height:50},{width:100,height:100}),{x:8,y:8});});

test('resize clamps a panel that has never been dragged',()=>{const f=fixture();f.win.innerWidth=250;f.win.innerHeight=370;f.winEvents.resize();assert.equal(f.host.style.left,'18px');assert.equal(f.host.style.top,'12px');});

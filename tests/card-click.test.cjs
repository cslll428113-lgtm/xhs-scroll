const {test}=require('node:test');const assert=require('node:assert/strict');const {click}=require('../card-click.js');
function fixture({stop=false,pagePrevent=false,throwHandler=false}={}){
 const listeners=new Set(),steps=[];let navigated=false,handled=0,preCancelled,seenHref;
 class Click extends Event{constructor(type,opts){super(type,opts);}}
 const win={MouseEvent:Click,addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)};
 const attrs=new Map([['href','/next?original-token']]);
 const a={isConnected:true,ownerDocument:{defaultView:win},getAttribute:k=>attrs.get(k)??null,hasAttribute:k=>attrs.has(k),removeAttribute:k=>attrs.delete(k),setAttribute:(k,v)=>attrs.set(k,v),querySelector:()=>child};
 const child={dispatchEvent:e=>{handled++;preCancelled=e.defaultPrevented;seenHref=attrs.get('href');if(throwHandler)throw Error('fixture');if(pagePrevent)e.preventDefault();if(!stop)for(const f of listeners)f(e);if(!e.defaultPrevented&&attrs.has('href'))navigated=true;}};
 return {a,steps,listeners,run:()=>click(a,(...s)=>steps.push(s)),result:()=>({navigated,handled,preCancelled,seenHref})};
}
test('page handler sees uncancelled child event; native fallback prevented',()=>{const f=fixture();f.run();assert.deepEqual(f.result(),{navigated:false,handled:1,preCancelled:false,seenHref:'/next?original-token'});assert.equal(f.a.getAttribute('href'),'/next?original-token');assert.equal(f.listeners.size,0);assert.equal(f.steps[0][1].childTarget,true);});
test('DOM href remains readable during a page handler',()=>{const f=fixture({pagePrevent:true});f.run();assert.equal(f.result().seenHref,'/next?original-token');assert.equal(f.result().navigated,false);});
test('page router default prevention is recorded separately',()=>{const f=fixture({pagePrevent:true});f.run();assert.equal(f.steps[0][1].pagePrevented,true);});
test('throwing dispatch leaves original href intact and removes guard',()=>{const f=fixture({throwHandler:true});assert.throws(()=>f.run());assert.equal(f.a.getAttribute('href'),'/next?original-token');assert.equal(f.listeners.size,0);});

const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function boot(storage){
 const listeners={},events={};const ctx={Date,URL,Set,JSON,Object,Array,queueMicrotask,location:{pathname:'/explore/'+'a'.repeat(24),href:'https://www.xiaohongshu.com/explore/'+'a'.repeat(24)+'?xsec_token=PRIVATE'},performance:{getEntriesByType:()=>[{type:'navigate'}]},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{addEventListener:(k,fn)=>listeners[k]=fn},window:{addEventListener:(k,fn)=>events[k]=fn}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../diagnostics.js','utf8'),ctx);
 return {api:ctx.XhsDiagnostics,listeners,events,ctx};
}
test('click and unload trace survives a fresh document boot',async()=>{
 const storage=new Map();const first=boot(storage);
 const a={href:first.ctx.location.href,hasAttribute:()=>true,getAttribute:()=> '_self'};
 first.listeners.click({isTrusted:false,defaultPrevented:false,target:{closest:()=>a},composedPath:()=>[]});await Promise.resolve();first.events.pagehide({persisted:false});
 const second=boot(storage);const text=second.api.exportText();const events=JSON.parse(text).records.map(x=>x.event);
 assert.deepEqual(events,['boot','card-click','card-click-after','pagehide','boot']);
 assert.equal(text.includes('PRIVATE'),false);assert.equal(text.includes('a'.repeat(24)),false);assert.equal(text.includes('https://'),false);
});
test('manual click trace records trusted and default-prevention independently',async()=>{
 const x=boot(new Map());const e={isTrusted:true,defaultPrevented:false,target:{closest:()=>({href:x.ctx.location.href,hasAttribute:()=>true,getAttribute:()=> '_self'})},composedPath:()=>[]};
 x.listeners.click(e);e.defaultPrevented=true;await Promise.resolve();const r=JSON.parse(x.api.exportText()).records.at(-1);assert.equal(r.trusted,true);assert.equal(r.defaultPrevented,true);
});
test('diagnostic export rejects arbitrary string payloads',()=>{const x=boot(new Map());x.api.add('test',{url:'https://example.com/private?token=secret',name:'a name with spaces',valid:'open-timeout',count:2});const text=x.api.exportText();assert.equal(text.includes('secret'),false);assert.equal(text.includes('a name'),false);assert.equal(text.includes('open-timeout'),true);});

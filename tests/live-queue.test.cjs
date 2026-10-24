const {test}=require('node:test');
const assert=require('node:assert/strict');
const {note,adjacent}=require('../queue.js');
const {sync}=require('../live-queue.js');
const item=n=>({...note(`https://www.xiaohongshu.com/red_video/${n.toString(16).padStart(24,'0')}?xsec_token=new-${n}`),title:`Video ${n}`});

test('live snapshot replaces old candidates instead of accumulating stale entries',()=>{
 assert.deepEqual(sync([item(1),item(2)],[item(3)],null),[item(3)]);
 assert.deepEqual(sync([item(1)],[],null),[]);
});
test('same note uses fresh signed link and title from current page',()=>{
 const fresh={...item(1),href:item(1).href+'&fresh=1',title:'fresh'};
 assert.deepEqual(sync([item(1)],[item(1),fresh],null),[fresh]);
});
test('missing playback anchor survives while all stale alternatives are removed',()=>{
 assert.deepEqual(sync([item(1),item(2)],[item(3)],item(1).href),[item(1),item(3)]);
});
test('rolling queue continues beyond five hundred lifetime notes',()=>{
 const feed=Array.from({length:800},(_,i)=>item(i+1));
 let previous=[];
 for(const n of [1,31,121,301,501,601]){
  const current=item(n);previous=sync(previous,feed,current.href,{history:30,ahead:160});
  assert.equal(adjacent(previous,current.href,1).id,item(n+1).id);
  assert.ok(previous.length<=191);
 }
 assert.equal(previous.at(-1).id,item(761).id);
});


test('default snapshot retains all currently loaded videos and previous entries',()=>{
 const feed=Array.from({length:700},(_,i)=>item(i+1));
 assert.equal(sync([],feed,null).length,700);
 const result=sync([],feed,item(650).href);
 assert.equal(result.length,700);assert.equal(result[0].id,item(1).id);
 assert.equal(adjacent(result,item(650).href,-1).id,item(649).id);
});

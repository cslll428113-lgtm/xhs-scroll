const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../pip.js');
function fixture(options={}){
 class El{
  constructor(){this.listeners={};this.paused=false;this.muted=false;this.children=[];this.parentNode=null;this.root=true;}
  get isConnected(){return this.parentNode?this.parentNode.isConnected:this.root;}
  addEventListener(n,f){this.listeners[n]=f;}
  removeEventListener(n,f){if(this.listeners[n]===f)delete this.listeners[n];}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  append(el){el.remove();this.children.push(el);el.parentNode=this;el.ownerDocument=d;if(el.id)nodes.set('#'+el.id,el);}
  insertBefore(el,ref){el.remove();this.children.splice(this.children.indexOf(ref),0,el);el.parentNode=this;}
  replaceWith(el){const p=this.parentNode;p.insertBefore(el,this);this.remove();}
  remove(){if(this.parentNode){const children=this.parentNode.children;children.splice(children.indexOf(this),1);}this.parentNode=null;this.root=false;}
 }
 const nodes=new Map(),keys={},events={};
 const d={head:new El(),body:new El(),createElement:()=>new El(),createComment:()=>new El(),querySelector:s=>{if(!nodes.has(s))nodes.set(s,new El());return nodes.get(s);},addEventListener:(k,f)=>keys[k]=f};
 let requests=0,focus=0,refreshes=0;
 const target={document:d,closed:false,innerHeight:580,focus(){focus++;},addEventListener:(k,f)=>events[k]=f,close(){this.closed=true;events.pagehide?.();}};
 const origin=new El();let video=options.noVideo?null:new El();if(video)origin.append(video);const initial=video;
 const notices=[],directions=[],state={enabled:true,busy:false,auto:false,canPrev:false,canNext:true,status:'待播 2 条'};
 const win={focus(){},documentPictureInPicture:options.unsupported?undefined:{requestWindow(){requests++;return options.opening||Promise.resolve(target);}}};
 const api=create({win,getVideo:()=>video,getState:()=>state,onNavigate:dir=>directions.push(dir),onAuto:value=>state.auto=value,onRefresh:()=>refreshes++,onNotice:msg=>notices.push(msg)});
 return {api,target,nodes,keys,events,state,initial,origin,notices,directions,requests:()=>requests,focus:()=>focus,refreshes:()=>refreshes,setVideo:v=>video=v,makeVideo:()=>{const v=new El();origin.append(v);return v;}};
}
test('PiP uses the original player and leaves a restoration marker',async()=>{
 const x=fixture();assert.equal(await x.api.open(),true);
 assert.equal(x.initial.parentNode,x.nodes.get('#screen'));assert.equal(x.initial.muted,false);
 assert.equal(x.api.video(),x.initial);assert.equal(x.origin.children.length,1);
 assert.equal(x.nodes.get('#prev').disabled,true);assert.equal(x.nodes.get('#next').disabled,false);
});
test('navigation restores original player before the website closes it',async()=>{
 const x=fixture();await x.api.open();x.state.busy=true;x.api.sync();
 assert.equal(x.initial.parentNode,x.origin);assert.equal(x.api.video(),null);assert.equal(x.initial.listeners.play,undefined);
 assert.equal(x.api.active(),true);assert.equal(x.nodes.get('#play').disabled,true);
 const next=x.makeVideo();x.setVideo(next);x.api.sync();assert.equal(next.parentNode,x.origin);
 x.state.busy=false;x.api.sync();assert.equal(next.parentNode,x.nodes.get('#screen'));assert.equal(x.requests(),1);
});
test('empty transition retains window and attaches next player',async()=>{
 const x=fixture();await x.api.open();x.setVideo(null);x.api.sync();
 assert.equal(x.api.active(),true);assert.equal(x.initial.parentNode,x.origin);
 assert.equal(x.nodes.get('#play').disabled,true);const next=x.makeVideo();x.setVideo(next);x.api.sync();
 assert.equal(x.api.video(),next);
});
test('closing returns the original player and preserves playing or paused state',async()=>{
 for(const paused of [false,true]){const x=fixture();x.initial.paused=paused;await x.api.open();x.events.pagehide();
 assert.equal(x.initial.parentNode,x.origin);assert.equal(x.initial.paused,paused);assert.equal(x.api.active(),false);
 await x.api.open();assert.equal(x.requests(),2);assert.equal(x.api.video(),x.initial);}
});
test('removed website player is paused and discarded instead of resurrected',async()=>{
 const x=fixture();await x.api.open();x.origin.root=false;assert.equal(x.api.video(),null);
 x.setVideo(null);x.api.sync();assert.equal(x.initial.paused,true);assert.equal(x.initial.parentNode,null);
});
test('unsupported browsers and empty players give a useful message without opening',async()=>{
 for(const options of [{unsupported:true},{noVideo:true}]){const x=fixture(options);assert.equal(await x.api.open(),false);assert.equal(x.requests(),0);assert.equal(x.notices.length,1);}
});
test('repeated open clicks share one pending browser request',async()=>{
 let resolve;const x=fixture({opening:new Promise(r=>resolve=r)});
 const a=x.api.open(),b=x.api.open();assert.equal(x.requests(),1);resolve(x.target);assert.equal(await a,true);assert.equal(await b,true);
 await x.api.open();assert.equal(x.requests(),1);assert.equal(x.focus(),1);
});
test('disabling or leaving the page cancels a pending open',async()=>{
 let resolve;const x=fixture({opening:new Promise(r=>resolve=r)});const p=x.api.open();x.api.close();resolve(x.target);
 assert.equal(await p,false);assert.equal(x.target.closed,true);assert.equal(x.api.active(),false);
});
test('play, pause, mute, auto and refresh act on the original controller',async()=>{
 const x=fixture();await x.api.open();await x.nodes.get('#play').onclick();assert.equal(x.initial.paused,true);
 await x.nodes.get('#play').onclick();assert.equal(x.initial.paused,false);
 x.nodes.get('#mute').onclick();assert.equal(x.initial.muted,true);
 x.nodes.get('#auto').onchange({target:{checked:true}});assert.equal(x.state.auto,true);
 assert.equal(x.refreshes(),0);x.nodes.get('#refresh').onclick();assert.equal(x.refreshes(),1);
 x.nodes.get('#prev').onclick();x.nodes.get('#next').onclick();assert.deepEqual(x.directions,[-1,1]);
});
test('PiP keyboard ignores typing, modifiers, repeats, and unrelated keys',async()=>{
 const x=fixture();await x.api.open();let prevented=0;
 const key=e=>x.keys.keydown({key:'ArrowDown',target:{closest:()=>null},preventDefault(){prevented++;},...e});
 key({ctrlKey:true});key({repeat:true});key({key:'a'});key({target:{closest:()=>({})}});
 assert.equal(prevented,0);key({});key({key:'ArrowUp'});assert.equal(prevented,2);assert.deepEqual(x.directions,[1,-1]);
});
test('wheel accumulates only vertical gestures over the PiP video',async()=>{
 const x=fixture();await x.api.open();const wheel=x.nodes.get('#screen').listeners.wheel;
 const e={deltaX:0,deltaY:35,deltaMode:0,preventDefault(){}};
 wheel({...e,ctrlKey:true});wheel({...e,deltaX:90});assert.deepEqual(x.directions,[]);
 wheel(e);assert.deepEqual(x.directions,[]);wheel(e);assert.deepEqual(x.directions,[1]);
});
test('rejected browser requests leave controller inactive and can retry',async()=>{
 let reject;const x=fixture({opening:new Promise((resolve,r)=>reject=r)});const p=x.api.open();reject(Error('activation'));
 assert.equal(await p,false);assert.equal(x.api.active(),false);assert.match(x.notices[0],/未能打开/);
 await x.api.open();assert.equal(x.requests(),2);
});

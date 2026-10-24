(function(root){
  'use strict';
  function sync(previous,incoming,currentHref,{history=Infinity,ahead=Infinity}={}){
    // DOM snapshot is authoritative. Missing cards must not survive a feed
    // replacement just because they were collected earlier in this document.
    const items=[],indices=new Map();
    for(const raw of incoming){
      const entry=root.XhsQueue.note(raw?.href);if(!entry)continue;
      const item={...entry,title:String(raw.title||'视频').slice(0,120)};
      if(indices.has(item.id))items[indices.get(item.id)]=item;
      else{indices.set(item.id,items.length);items.push(item);}
    }
    const current=root.XhsQueue.note(currentHref);
    if(!current)return items.slice(0,ahead);
    const index=items.findIndex(item=>item.id===current.id);
    if(index>=0)return items.slice(Math.max(0,index-history),index+ahead+1);
    // A currently playing note may be absent from a replaced/virtualized feed.
    // Keep only that playback anchor, followed by actual live candidates.
    const old=previous.find(item=>item.id===current.id);
    if(!old&&!items.length)return [];
    const playing=old||{...current,title:'当前视频'};
    return [playing,...items.slice(0,ahead)];
  }
  root.XhsLiveQueue={sync};
  if(typeof module!=='undefined')module.exports=root.XhsLiveQueue;
})(globalThis);

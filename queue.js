(function(root){
  'use strict';
  function note(href,base='https://www.xiaohongshu.com/'){
    try{
      const u=new URL(href,base);
      if(u.origin!=='https://www.xiaohongshu.com'||u.username||u.password)return null;
      const match=u.pathname.match(/^\/(?:explore|search_result|red_video)\/([a-f0-9]{24})\/?$/i)
        ||u.pathname.match(/^\/user\/profile\/[a-f0-9]{24}\/([a-f0-9]{24})\/?$/i);
      return match?{id:match[1].toLowerCase(),href:u.href}:null;
    }catch{return null;}
  }
  function merge(previous,incoming){
    const list=[];const index=new Map();
    for(const item of [...previous,...incoming]){
      const entry=note(item?.href);if(!entry)continue;
      entry.title=String(item.title||'视频').slice(0,120);
      if(index.has(entry.id))list[index.get(entry.id)]=entry;
      else if(list.length<500){index.set(entry.id,list.length);list.push(entry);}
    }return list;
  }
  function adjacent(items,currentHref,dir){
    if(dir!==1&&dir!==-1)return null;
    const current=note(currentHref);if(!current)return null;
    const i=items.findIndex(x=>x.id===current.id);
    if(i<0)return null;
    return items[i+dir]||null;
  }
  function read(raw){
    try{const value=JSON.parse(raw);if(value?.version!==2||!Array.isArray(value.items))return null;
      return {version:2,items:merge([],value.items),collapsed:value.collapsed===true,resumeId:/^[a-f0-9]{24}$/.test(value.resumeId||'')?value.resumeId:''};
    }catch{return null;}
  }
  root.XhsQueue={note,merge,adjacent,read};
  if(typeof module!=='undefined')module.exports=root.XhsQueue;
})(globalThis);

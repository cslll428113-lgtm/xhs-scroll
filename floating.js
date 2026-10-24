(function(root){
  'use strict';
  function clamp(position,size,viewport){
    return {x:Math.max(8,Math.min(position.x,Math.max(8,viewport.width-size.width-8))),y:Math.max(8,Math.min(position.y,Math.max(8,viewport.height-size.height-8)))};
  }
  function install({host,handles,win,onSave}){
    let position=null,drag=null,suppressClick=false;
    const bounds=()=>({width:win.innerWidth,height:win.innerHeight});
    function place(next){
      const box=host.getBoundingClientRect();
      position=clamp(next,box,bounds());
      Object.assign(host.style,{left:position.x+'px',top:position.y+'px',right:'auto',bottom:'auto'});
    }
    function fit(){const box=host.getBoundingClientRect();place(position||{x:box.left,y:box.top});}
    function restore(next){if(next&&Number.isFinite(next.x)&&Number.isFinite(next.y))place(next);}
    for(const handle of handles){
      handle.addEventListener('pointerdown',e=>{
        if(e.button!==0||e.target.closest?.('input,textarea,button')&&e.target!==handle)return;
        const box=host.getBoundingClientRect();
        drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:{x:box.left,y:box.top},moved:false};
        suppressClick=false;handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(!drag.moved&&Math.hypot(dx,dy)<5)return;
        drag.moved=true;suppressClick=true;e.preventDefault();
        place({x:drag.start.x+dx,y:drag.start.y+dy});
      });
      const finish=e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const moved=drag.moved;drag=null;
        if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
        if(moved)onSave?.({...position});
      };
      handle.addEventListener('pointerup',finish);
      handle.addEventListener('pointercancel',finish);
      handle.addEventListener('lostpointercapture',finish);
      handle.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
    }
    win.addEventListener('resize',fit);
    if(win.ResizeObserver)new win.ResizeObserver(fit).observe(host);
    return {restore,fit};
  }
  root.XhsFloating={install,clamp};
  if(typeof module!=='undefined')module.exports=root.XhsFloating;
})(globalThis);

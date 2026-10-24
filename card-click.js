(function(root){
  'use strict';
  // Let page handlers run first; cancel the anchor's browser default only
  // after dispatch. This does not pre-cancel events that Vue Router checks.
  function click(anchor,onStep=()=>{}){
    if(!anchor?.isConnected)throw new Error('Detached card');
    const win=anchor.ownerDocument.defaultView;
    const child=anchor.querySelector('img,video,.play-icon')||anchor;
    const event=new win.MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:win,button:0,buttons:0});
    const guard=e=>{
      if(e!==event)return;
      onStep('card-handler-result',{pagePrevented:e.defaultPrevented,childTarget:child!==anchor});
      e.preventDefault();
    };
    win.addEventListener('click',guard,{passive:false});
    // Keep the original href available to the website's click handlers.
    // User diagnostics confirm this site's click reaches the window guard.
    // Cancel only at the end, after the site's handlers have had their turn.
    try{
      child.dispatchEvent(event);
    }finally{
      win.removeEventListener('click',guard);
    }
    return event.defaultPrevented;
  }
  root.XhsCardClick={click};
  if(typeof module!=='undefined')module.exports=root.XhsCardClick;
})(globalThis);

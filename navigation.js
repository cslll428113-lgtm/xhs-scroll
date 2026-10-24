(function(root){
  'use strict';
  function create(adapter){
    let busy=false;
    async function open(id){
      if(busy||adapter.blocked())return {ok:false,reason:'blocked'};
      if(!adapter.findCard(id,false))return {ok:false,reason:'missing-card'};
      busy=true;
      try{
        adapter.onStep?.('transition-start');
        const before=adapter.snapshot();
        if(before.video||adapter.hasDetail()){
          adapter.onStep?.('before-close');
          // Responsive layouts may replace the header for a short interval.
          if(adapter.canClose&&!await adapter.waitUntil(adapter.canClose,2000))return {ok:false,reason:'no-close'};
          if(!adapter.closeCurrent())return {ok:false,reason:'no-close'};
          const closed=await adapter.waitUntil(()=>!adapter.snapshot().video&&!adapter.hasDetail());
          adapter.onStep?.(closed?'close-ok':'close-timeout');
          if(!closed)return {ok:false,reason:'close-failed'};
        }
        if(adapter.blocked())return {ok:false,reason:'blocked'};
        // Closing a Vue modal can replace the feed DOM. Never reuse a stale card.
        const ready=await adapter.waitUntil(()=>!!adapter.findCard(id,true));
        const fresh=ready&&adapter.findCard(id,true);
        if(!fresh)return {ok:false,reason:'target-not-ready'};
        adapter.onStep?.('before-card-click');
        adapter.clickCard(fresh);
        adapter.onStep?.('card-click-returned');
        const opened=await adapter.waitUntil(()=>{
          const next=adapter.snapshot();
          return next.id===id&&!!next.video&&
            (next.video!==before.video||next.src!==before.src);
        });
        if(adapter.blocked())return {ok:false,reason:'blocked'};
        adapter.onStep?.(opened?'new-video-confirmed':'open-timeout');
        return opened?{ok:true}:{ok:false,reason:'open-failed'};
      }catch{return {ok:false,reason:'open-failed'};}
      finally{busy=false;}
    }
    return {open};
  }
  root.XhsNavigation={create};
  if(typeof module!=='undefined')module.exports=root.XhsNavigation;
})(globalThis);

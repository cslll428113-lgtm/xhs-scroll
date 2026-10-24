(function(root){
  'use strict';
  function create(a){
    let task=null,cancelCurrent=null,retryAt=0;
    function cancel({pause=true}={}){if(pause||task)retryAt=Math.max(retryAt,a.now()+10000);cancelCurrent?.();}
    function fill({target=30,maxPasses=6,force=false}={}){
      if(task)return task;
      if(!a.allowed()||(!force&&a.now()<retryAt)||a.remaining()>=target)return Promise.resolve(false);
      // Reserve the gap before starting, including cancelled/no-progress work.
      // Frequent DOM scans must never restart a cancelled collector.
      retryAt=a.now()+10000;
      const restore=a.savePosition();let cancelled=false,restored=false;
      const finishPosition=()=>{if(!restored){restored=true;restore();}};
      cancelCurrent=()=>{cancelled=true;finishPosition();};
      task=(async()=>{
        await Promise.resolve();let grew=false,stalled=0;
        try{
          a.progress(true);
          for(let pass=0;pass<maxPasses&&!cancelled&&a.allowed()&&a.remaining()<target;pass++){
            const before=a.count(),revision=a.revision?.();
            const hasNew=()=>a.count()>before||(a.revision&&a.revision()!==revision);a.advance(pass);
            const deadline=a.now()+3000;
            while(!cancelled&&a.allowed()&&a.now()<deadline){
              await a.wait(120);if(cancelled)break;a.collect();if(hasNew())break;
            }
            if(cancelled||!a.allowed())break;
            if(hasNew()){grew=true;stalled=0;}
            else if(++stalled>=2){retryAt=a.now()+30000;break;}
            if(a.remaining()<target)await a.wait(180);
          }
          retryAt=Math.max(retryAt,a.now()+(stalled?30000:10000));
          return grew;
        }catch{retryAt=a.now()+30000;return false;}
        finally{finishPosition();task=null;cancelCurrent=null;a.progress(false);}
      })();return task;
    }
    return {fill,cancel,get running(){return !!task;}};
  }
  root.XhsBuffer={create};
  if(typeof module!=='undefined')module.exports=root.XhsBuffer;
})(globalThis);

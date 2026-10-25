(function(root){
  'use strict';
  // Use the original media element, including cross-origin and blob sources.
  // Restore it before the site's router closes/replaces its player.
  function create({win=root,getVideo,getState,onNavigate,onAuto,onRefresh,onNotice,onChange=()=>{}}){
    let pip=null,source=null,anchor=null,pending=null,epoch=0,moving=false,unbind=()=>{},wheel=0,wheelTime=0;
    const active=()=>!!pip&&!pip.closed;
    const supported=()=>typeof win.documentPictureInPicture?.requestWindow==='function';
    function release(){
      unbind();unbind=()=>{};
      const v=source,marker=anchor;source=null;anchor=null;
      if(!v)return;
      const playing=!v.paused;
      if(marker?.parentNode?.isConnected){
        marker.replaceWith(v);
        if(playing)v.play().catch(()=>onNotice('浏览器暂停了播放，请点一下播放按钮'));
      }else{v.pause();v.remove();marker?.remove();}
    }
    function cleanup(target){
      if(pip!==target)return;
      release();pip=null;onChange();
    }
    function close(){epoch++;const target=pip;if(!target)return;cleanup(target);if(!target.closed)target.close();}
    function sync(){
      if(!active()||moving)return;
      const d=pip.document,s=getState(),v=getVideo();
      d.querySelector('#prev').disabled=!s.enabled||s.busy||!s.canPrev;
      d.querySelector('#next').disabled=!s.enabled||s.busy||!s.canNext;
      d.querySelector('#play').disabled=!s.enabled||s.busy||!v;
      d.querySelector('#play').textContent=v?.paused?'播放':'暂停';
      d.querySelector('#mute').disabled=!v;
      d.querySelector('#mute').textContent=v?.muted?'开启声音':'静音';
      d.querySelector('#auto').checked=s.auto;
      d.querySelector('#auto').disabled=!s.enabled;
      d.querySelector('#refresh').disabled=s.busy;
      d.querySelector('#info').textContent=s.status;
      if(v===source&&anchor?.isConnected&&!s.busy&&s.enabled)return;
      moving=true;
      try{
        release();
        if(!v||s.busy||!s.enabled)return;
        if(!v.parentNode?.isConnected)return;
        const playing=!v.paused;
        anchor=v.ownerDocument.createComment('shuluo-pip-player');
        v.parentNode.insertBefore(anchor,v);source=v;
        d.querySelector('#screen').append(v);
        const refresh=()=>{sync();};
        for(const name of ['play','pause','volumechange'])v.addEventListener(name,refresh);
        unbind=()=>{for(const name of ['play','pause','volumechange'])v.removeEventListener(name,refresh);};
        if(playing)v.play().catch(()=>{if(source===v)onNotice('浏览器暂停了小窗播放，请点一下播放按钮');});
      }catch{
        release();close();onNotice('当前视频无法显示到小窗，请留在网页播放');
      }finally{moving=false;}
    }
    async function togglePlay(){
      const v=getVideo();if(!v)return;
      if(v.paused){try{await v.play();}catch{onNotice('播放被浏览器暂停，请返回视频页点一下播放');}}
      else v.pause();
      sync();
    }
    async function open(){
      if(active()){pip.focus();return true;}
      if(pending)return pending;
      if(!supported()){onNotice('此浏览器不支持小窗刷视频，请使用新版桌面 Chrome 或 Edge');return false;}
      if(!getVideo()){onNotice('请先开始播放一条视频，再打开小窗');return false;}
      const session=++epoch;
      // Invoke requestWindow synchronously in the click handler to retain activation.
      const opening=(async()=>{
        try{
          const target=await win.documentPictureInPicture.requestWindow({width:340,height:580});
          if(session!==epoch){target.close();return false;}
          pip=target;const d=pip.document;d.title='小红薯顺滑刷';
          d.head.innerHTML='<style>*{box-sizing:border-box}html,body{height:100%;margin:0;background:#16171c;color:#f5f5f7;font:13px/1.5 system-ui,"Microsoft YaHei",sans-serif}body{display:flex;flex-direction:column}#screen{flex:1;min-height:0;background:#000;display:grid;place-items:center}video{position:static!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;min-height:0!important;object-fit:contain!important;transform:none!important}footer{flex:none;padding:9px 10px}#buttons{display:flex;gap:6px}button{flex:1;min-width:0;background:#30313a;color:inherit;border:1px solid #ffffff20;border-radius:8px;padding:8px 4px;font:inherit;cursor:pointer}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible{outline:2px solid #ff5578}#options{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}#options button{flex:0 1 auto;padding:5px 8px}label{display:flex;align-items:center;gap:5px}input{accent-color:#ff3159}#info{font-size:12px;color:#bdbdc9;overflow-wrap:anywhere;margin:7px 0 0}#hint{color:#9999a8;font-size:11px;margin:4px 0 0}</style>';
          d.body.innerHTML='<div id="screen"></div><footer><div id="buttons"><button id="prev" type="button">↑ 上一条</button><button id="play" type="button">暂停</button><button id="next" type="button">下一条 ↓</button></div><div id="options"><label><input id="auto" type="checkbox">自动下一条</label><button id="refresh" type="button">换一批</button><button id="back" type="button">回到网页</button></div><p id="info" role="status"></p><p id="hint">小窗内可滚轮 / ↑↓ 切换；换批刷新后需重新打开小窗。</p></footer>';
          d.querySelector('#prev').onclick=()=>onNavigate(-1);
          d.querySelector('#next').onclick=()=>onNavigate(1);
          d.querySelector('#play').onclick=togglePlay;
          const mute=d.createElement('button');mute.id='mute';mute.type='button';mute.textContent='静音';
          d.querySelector('#options').append(mute);
          mute.onclick=()=>{const v=getVideo();if(v){v.muted=!v.muted;sync();}};
          d.querySelector('#auto').onchange=e=>onAuto(e.target.checked);
          d.querySelector('#refresh').onclick=onRefresh;
          d.querySelector('#back').onclick=()=>{win.focus();close();};
          d.addEventListener('keydown',e=>{
            if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.repeat||e.target?.closest?.('input,textarea,[contenteditable="true"]'))return;
            if(!['ArrowUp','ArrowDown'].includes(e.key))return;
            e.preventDefault();onNavigate(e.key==='ArrowDown'?1:-1);
          });
          d.querySelector('#screen').addEventListener('wheel',e=>{
            if(e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
            e.preventDefault();const now=Date.now();
            if(now-wheelTime>180||Math.sign(e.deltaY)!==Math.sign(wheel))wheel=0;
            wheelTime=now;wheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?target.innerHeight:1);
            if(Math.abs(wheel)>=65){const dir=Math.sign(wheel);wheel=0;onNavigate(dir);}
          },{passive:false});
          target.addEventListener('pagehide',()=>cleanup(target),{once:true});
          sync();if(!active())return false;
          onChange();return true;
        }catch{close();onNotice('小窗未能打开，请在视频播放后重新点击“小窗刷视频”');return false;}
      })();
      pending=opening;try{return await opening;}finally{pending=null;}
    }
    return {open,close,sync,active,supported,video:()=>source&&anchor?.isConnected?source:null};
  }
  root.XhsPip={create};
  if(typeof module!=='undefined')module.exports=root.XhsPip;
})(globalThis);

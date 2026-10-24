(() => {
  'use strict';
  if (document.getElementById('shuluo-xhs')) return;
  const COMMENT = '.comments-container,.comment-list,.comments-list,.comment-panel,.comment-container,[data-testid="comment-panel"]';
  const EDIT = 'input,textarea,[contenteditable="true"],[role="textbox"]';
  const state = {enabled:true,auto:false,video:null,busy:false,cooldown:0,source:'',wheel:0,wheelTime:0,commentIntent:false,collapsed:false,blocked:false};
  const saved = new Map();
  const loopSaved = new Map();
  const QUEUE_KEY='shuluo-xhs-queue-v2';
  let dedicated=false;
  try{if(location.pathname.startsWith('/red_video')&&location.hash==='#shuluo-stream')sessionStorage.setItem('shuluo-stream','1');dedicated=sessionStorage.getItem('shuluo-stream')==='1';}catch{}
  let initialStarted=false,queue=[],resumeId='';
  try{const stored=XhsQueue.read(sessionStorage.getItem(QUEUE_KEY));if(stored){state.collapsed=stored.collapsed;resumeId=stored.resumeId;}}catch{}
  // Only cards in the original live page are navigable; do not revive old URL queues.
  let lastUrl = location.href, scanTimer, watchTimer, notice='', noticeUntil=0;
  function persistQueue(){try{sessionStorage.setItem(QUEUE_KEY,JSON.stringify({version:2,items:queue,collapsed:state.collapsed,resumeId}));return true;}catch{return false;}}
  function say(text){notice=text;noticeUntil=Date.now()+10000;update();}
  function collectQueue(){
    const incoming=[];
    for(const card of document.querySelectorAll('section.note-item,[data-testid="note-item"],.note-item')){
      if(!card.querySelector('.play-icon,video,[data-note-type="video"],[class*="video-icon"]'))continue;
      const link=XhsCardTarget.select(card,{requireLayout:false});
      const item=link&&XhsQueue.note(link.getAttribute('href'),location.href);
      if(item)incoming.push({...item,title:(card.querySelector('.title')?.textContent||'视频').trim()});
    }
    const currentHref=activeVideo()?location.href:null;
    const next=XhsLiveQueue.sync(queue,incoming,currentHref);
    if(JSON.stringify(next)!==JSON.stringify(queue)){queue=next;persistQueue();}
  }
  const host = document.createElement('div'); host.id='shuluo-xhs';
  host.style.cssText='position:fixed;right:20px;bottom:28px;z-index:2147483646';
  document.documentElement.append(host);
  const shadow=host.attachShadow({mode:'open'});
  const trace=(event,data)=>globalThis.XhsDiagnostics?.add(event,data);
  let folded=true;
  shadow.innerHTML=`<style>
  :host{all:initial}[hidden]{display:none!important}*{box-sizing:border-box}section{width:min(224px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow-y:auto;background:#202127;color:#f5f5f7;border:1px solid #ffffff25;border-radius:14px;padding:11px;box-shadow:0 6px 24px #0004;font:12px/1.4 system-ui,"Microsoft YaHei",sans-serif}header{cursor:grab;touch-action:none;user-select:none;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}b{font-size:13px}button{font:inherit;color:inherit;background:#ffffff10;border:1px solid #ffffff18;border-radius:8px;padding:6px;cursor:pointer}button:disabled{opacity:.35;cursor:default}button:focus-visible,input:focus-visible{outline:2px solid #ff5578;outline-offset:2px}label{display:flex;justify-content:space-between;align-items:center;margin:7px 0}input{accent-color:#ff3159}.row{display:flex;gap:6px;margin:8px 0}.row button{flex:1}#queueinfo,#status{color:#b0b0bb;font-size:11px;margin:7px 0;white-space:normal;overflow-wrap:anywhere;line-height:1.6}#mini{touch-action:none;user-select:none;border:0;border-radius:50%;width:36px;height:36px;background:#ff3159;color:white;box-shadow:0 3px 14px #0004;font:20px system-ui;cursor:pointer}#compact{display:flex;align-items:center;gap:3px;padding:4px;border:1px solid #ffffff20;border-radius:24px;background:#202127;box-shadow:0 3px 14px #0004}#compact button{width:34px;height:34px;padding:0;border:0;border-radius:50%;font:18px system-ui;color:#fff;background:transparent;cursor:pointer}#compact #mini{background:#ff3159;box-shadow:none}#compact button:disabled{opacity:.3}#diagnostic{margin-top:8px}textarea{width:100%;height:120px;font-size:10px;resize:vertical;background:#121318;color:#ddd;border:1px solid #ffffff30;border-radius:6px}#fold{font-size:11px;padding:3px 7px}
  </style><div id="wrap"><section id="panel" aria-label="刷视频" hidden><header id="dragbar" title="拖动移动"><b>刷视频 · 拖动移动</b><button id="fold" type="button" aria-label="收起面板">收起</button></header><label>启用<input id="enabled" type="checkbox" checked></label><label>自动下一条<input id="auto" type="checkbox"></label><div class="row"><button id="prev" type="button">↑ 上一条</button><button id="next" type="button">↓ 下一条</button></div><div id="queueinfo"></div><button id="stream" type="button" style="width:100%;margin:6px 0">独立刷视频</button><button id="start" type="button" style="width:100%">开始</button><button id="refresh" type="button" style="width:100%;margin-top:6px">换一批视频（刷新独立页）</button><button id="comments" type="button" style="width:100%;margin-top:6px">评论</button><div id="status" role="status"></div><button id="diagnose" type="button" style="width:100%">查看诊断</button><div id="diagnostic" hidden><textarea id="report" aria-label="诊断记录" readonly></textarea><span style="font-size:11px">点文本框，Ctrl+A、Ctrl+C 复制</span></div></section><div id="compact" aria-label="视频快捷控制"><button id="mini-prev" type="button" aria-label="上一条视频" title="上一条 · ↑">↑</button><button id="mini" type="button" aria-label="展开设置，拖动移动" title="展开设置 · 拖动移动">⋯</button><button id="mini-next" type="button" aria-label="下一条视频" title="下一条 · ↓">↓</button><button id="mini-refresh" type="button" aria-label="换一批视频，刷新独立页" title="换一批视频（刷新独立页）">↻</button></div></div>`;
  const $=s=>shadow.querySelector(s);
  const floating=XhsFloating.install({host,handles:[$('#dragbar'),$('#mini')],win:window,onSave:position=>chrome.storage.local.set({position})});
  function visible(el) { if(!el?.isConnected) return false; const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>2&&r.height>2&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'; }
  function panelNodes() { return [...document.querySelectorAll(COMMENT)].filter(el=>!el.closest('#shuluo-xhs')); }
  function editing() { return !!document.activeElement?.closest?.(EDIT); }
  function commentsOpen() {return state.commentIntent || panelNodes().some(visible);}
  function blocked() {return [...document.querySelectorAll('.login-container,.login-modal,[role="dialog"]')].some(el=>visible(el)&&/登录|验证码|验证身份|操作频繁/.test(el.textContent||''));}
  function mode() {return XhsPolicy.decision({...state,comments:commentsOpen(),editing:editing(),hidden:document.hidden,blocked:blocked()});}
  function update() {
    const labels={off:'已关闭',blocked:'网页提示登录或验证，请先手动处理','repeat-comments':'正在看评论 · 循环当前视频','repeat-hidden':'页面在后台 · 暂停自动切换',next:'自动模式 · 播完切换下一条','repeat-manual':'手动模式 · 滚轮 / ↑↓ 切换'};
    $('#queueinfo').textContent=queue.length?`${dedicated?'专用模式 · ':''}待播 ${remaining()} 条 · 当前列表 ${queue.length} 条`:'当前页面暂无视频列表';
    $('#stream').hidden=dedicated;
    $('#refresh').textContent=dedicated?'换一批视频（刷新独立页）':'打开新一批视频';
    $('#refresh').disabled=state.busy;$('#mini-refresh').disabled=state.busy;
    $('#mini-refresh').title=dedicated?'换一批视频（刷新独立页）':'在独立页打开新一批视频';
    $('#mini-refresh').setAttribute('aria-label',$('#mini-refresh').title);
    $('#start').style.display=state.video?'none':'block';
    $('#start').disabled=!state.enabled||!queue.length||state.busy;
    $('#prev').disabled=!state.enabled||!XhsQueue.adjacent(queue,location.href,-1)||state.busy;
    $('#next').disabled=!state.enabled||!queue.length||!state.video||state.busy;
    $('#mini-prev').disabled=$('#prev').disabled;$('#mini-next').disabled=$('#next').disabled;
    $('#status').textContent=Date.now()<noticeUntil?notice:state.busy?'正在打开下一条视频…':state.video?labels[mode()]:'已收集当前页面视频；看完可点 ↻ 换一批。';
    $('#enabled').checked=state.enabled;$('#auto').checked=state.auto;$('#auto').disabled=!state.enabled;
    $('#status').title=$('#status').textContent;
    $('#comments').textContent=commentsOpen()?'收起评论':'展开评论';
  }
  function restoreComments(){for(const [el,old] of saved){if(el.isConnected){if(old===null)el.removeAttribute('style');else el.setAttribute('style',old);}}saved.clear();}
  function collapseComments(){for(const el of panelNodes()){if(!saved.has(el))saved.set(el,el.getAttribute('style'));el.style.setProperty('display','none','important');}}
  function setComments(open){state.commentIntent=open;state.collapsed=!open;persistQueue();if(open)restoreComments();else collapseComments();update();}
  function replay(v){if(!v?.isConnected)return;v.currentTime=0;v.play().catch(()=>{ $('#status').textContent='浏览器暂停了播放，请点一下视频'; });}
  function onEnded(e){const v=e.currentTarget;if(v!==state.video||!state.enabled)return;if(mode()==='next')void navigate(1,true);else replay(v);}
  function timeUpdate(e){const v=e.currentTarget;if(v!==state.video||!state.enabled)return;/* Native players can re-enable loop; ended will not fire when loop=true. */if(v.loop)v.loop=false;}
  function detach(){if(state.video){state.video.removeEventListener('ended',onEnded);state.video.removeEventListener('timeupdate',timeUpdate);}state.video=null;}
  function activeVideo(){return [...document.querySelectorAll('video')].filter(visible).sort((a,b)=>{const area=x=>{const r=x.getBoundingClientRect();return Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));};return area(b)-area(a);})[0]||null;}
  function scan(){
    if(!state.enabled){update();return;}
    collectQueue();
    for(const el of saved.keys())if(!el.isConnected)saved.delete(el);
    for(const el of loopSaved.keys())if(!el.isConnected)loopSaved.delete(el);
    const v=activeVideo();
    if(v!==state.video){detach();state.video=v;if(v){if(!loopSaved.has(v))loopSaved.set(v,v.loop);v.loop=false;v.addEventListener('ended',onEnded);v.addEventListener('timeupdate',timeUpdate);if(resumeId===XhsQueue.note(location.href)?.id){resumeId='';persistQueue();v.play().catch(()=>say('浏览器阻止了自动播放，请点一下视频'));}}}
    if(location.href!==lastUrl){lastUrl=location.href;state.commentIntent=false;}
    if(state.collapsed&&!state.commentIntent)collapseComments();
    update();
    if(dedicated&&!initialStarted&&!state.busy&&!state.video&&/^\/red_video\/?$/.test(location.pathname)&&queue.length){
      initialStarted=true;void openEntry(queue.find(item=>findCard(item.id,false)));
    }
  }
  const CARDS='section.note-item,[data-testid="note-item"],.note-item';
  function findCard(id,requireLayout=false){
    for(const card of document.querySelectorAll(CARDS)){
      const cover=XhsCardTarget.select(card,{requireLayout});
      if(cover&&XhsQueue.note(cover.getAttribute('href'),location.href)?.id===id)return cover;
    }return null;
  }
  function hasDetail(){return [...document.querySelectorAll('.note-detail-mask,#noteContainer')].some(visible);}
  function closeCurrent(){
    const button=XhsCloseControl.find(document,visible);
    trace('close-control',{found:!!button,compact:innerWidth<900});
    if(!button)return false;
    button.click();return true;
  }
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function waitUntil(check,timeout=5000){
    const until=Date.now()+timeout;
    do{if(check())return true;if(blocked()||!state.enabled)return false;await wait(100);}while(Date.now()<until);
    return false;
  }
  const navigator=XhsNavigation.create({clickCard:card=>XhsCardClick.click(card,trace),findCard,hasDetail,closeCurrent,canClose:()=>!!XhsCloseControl.find(document,visible),blocked:()=>blocked()||!state.enabled,waitUntil,onStep:step=>trace(step,{cards:queue.length,hasVideo:!!activeVideo(),hasDetail:hasDetail()}),
    snapshot:()=>{const video=activeVideo();return {id:XhsQueue.note(location.href)?.id,video,src:video?.currentSrc};}});
  function remaining(){
    const i=queue.findIndex(item=>item.id===XhsQueue.note(location.href)?.id);
    return i<0?queue.length:Math.max(0,queue.length-i-1);
  }
  async function openEntry(entry){
    if(!state.enabled||!entry||state.busy||blocked())return false;
    if(!findCard(entry.id,false)){say('这张卡片已不在当前列表，已停止切换');return false;}
    state.busy=true;noticeUntil=0;update();
    try{
      trace('switch-request',{cards:queue.length,hasCard:!!findCard(entry.id)});
      const result=await navigator.open(entry.id);
      trace('switch-result',{ok:result.ok,reason:result.reason||'ok'});
      if(!result.ok){
        const messages={'blocked':'网页要求登录或验证，请先手动处理','missing-card':'目标卡片已不在原列表，已停止','target-not-ready':'关闭帖子后，目标封面仍未就绪，已停止','no-close':'没有识别到当前帖子的关闭按钮，需要适配当前页面','close-failed':'当前帖子没有正常关闭，已停止切换','open-failed':'网页未接管本次点击，已停止；请复制诊断记录'};
        say(messages[result.reason]||'未能切换，已停止');return false;
      }
      state.commentIntent=false;scan();
      if(state.collapsed)collapseComments();
      if(state.video)state.video.play().catch(()=>say('浏览器暂停了自动播放，请点一下视频'));
      return true;
    }finally{state.busy=false;update();}
  }
  async function navigate(dir,automatic=false){
    if(!state.enabled||!state.video||state.busy||Date.now()<state.cooldown||blocked())return false;
    if(automatic&&mode()!=='next')return false;
    state.cooldown=Date.now()+850;
    const video=state.video;const currentHref=location.href;
    collectQueue();let entry=XhsQueue.adjacent(queue,currentHref,dir);
    if(!entry){
      if(automatic)replay(video);
      say(queue.length?'本批已看完，点 ↻ 换一批视频。':'当前页面没有可切换的视频列表');return false;
    }
    if(automatic&&mode()!=='next')return false;
    const ok=await openEntry(entry);
    if(!ok&&automatic){state.auto=false;chrome.storage.local.set({auto:false});if(video.isConnected)replay(video);update();}
    return ok;
  }
  document.addEventListener('wheel',e=>{
    if(!state.enabled||!state.video||state.busy||e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||e.composedPath().includes(host))return;
    if(e.target.closest?.(COMMENT+','+EDIT))return;
    const r=state.video.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
    e.preventDefault();e.stopPropagation();const now=Date.now();if(now-state.wheelTime>180||Math.sign(e.deltaY)!==Math.sign(state.wheel))state.wheel=0;state.wheelTime=now;state.wheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
    if(Math.abs(state.wheel)>=65){const dir=Math.sign(state.wheel);state.wheel=0;void navigate(dir);}
  },{capture:true,passive:false});
  document.addEventListener('keydown',e=>{
    if(!state.enabled||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.repeat||!['ArrowDown','ArrowUp'].includes(e.key))return;
    const path=e.composedPath();
    // Visible comments suspend automatic switching, but an explicit arrow
    // still navigates unless the user is typing or focusing comment content.
    if(editing()||path.some(el=>el?.matches?.(EDIT+','+COMMENT)))return;
    if(activeVideo()!==state.video)scan();
    if(!state.video||blocked())return;
    e.preventDefault();e.stopPropagation();void navigate(e.key==='ArrowDown'?1:-1);
  },true);
  document.addEventListener('click',e=>{
    if(!state.enabled||e.composedPath().includes(host))return;
    collectQueue();
    const node=e.target.closest?.('button,[role="button"],.chat-wrapper,.comment-icon,.comment-button');
    if(node&&/评论|comment/i.test((node.getAttribute('aria-label')||'')+' '+(node.getAttribute('title')||'')+' '+node.className))setComments(true);
    if(e.target.closest?.(COMMENT+','+EDIT)&&state.video)setComments(true);
    schedule();
  },true);
  function schedule(){clearTimeout(scanTimer);scanTimer=setTimeout(scan,150);}
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
  const onResize=()=>{floating.fit();schedule();};
  window.addEventListener('resize',onResize);window.visualViewport?.addEventListener('resize',onResize);
  document.addEventListener('visibilitychange',update);window.addEventListener('popstate',schedule);
  $('#stream').onclick=()=>{
    const old={auto:state.auto};
    // Pause this tab before opening another one. Its feed stays where it is.
    state.auto=false;update();
    chrome.runtime.sendMessage({type:'xhs-open-stream'},result=>{
      if(chrome.runtime.lastError||!result?.ok){Object.assign(state,old);say('未能打开专用页，请重新加载扩展后再试');}
    });
  };
  function refreshBatch(){
    if(state.busy)return;
    // Refresh is explicit and restricted to this dedicated tab. An ordinary
    // feed opens a separate tab so posts on the original page are preserved.
    if(!dedicated){$('#stream').onclick();return;}
    trace('refresh-batch',{cards:queue.length});
    state.busy=true;noticeUntil=0;update();
    try{
      if(/^\/red_video\/?$/.test(location.pathname))location.reload();
      else location.replace('https://www.xiaohongshu.com/red_video#shuluo-stream');
    }catch{state.busy=false;say('未能刷新独立页，请手动刷新此标签页');}
  }
  $('#refresh').onclick=refreshBatch;$('#mini-refresh').onclick=refreshBatch;
  $('#start').onclick=()=>{collectQueue();if(state.enabled&&queue.length)openEntry(queue.find(item=>findCard(item.id,false)));};
  $('#prev').onclick=()=>navigate(-1);$('#next').onclick=()=>navigate(1);
  $('#mini-prev').onclick=()=>navigate(-1);$('#mini-next').onclick=()=>navigate(1);
  $('#comments').onclick=()=>setComments(!commentsOpen());
  function setFolded(value){folded=value;$('#panel').hidden=value;$('#mini').hidden=!value;$('#compact').hidden=!value;floating.fit();trace('panel-fold',{folded:value});try{chrome.storage.local.set({folded:value});}catch{}}
  $('#fold').onclick=()=>setFolded(true);$('#mini').onclick=()=>setFolded(false);
  $('#diagnose').onclick=()=>{$('#diagnostic').hidden=!$('#diagnostic').hidden;trace('report-state',{cards:queue.length,hasVideo:!!activeVideo(),unavailable:!!document.body?.innerText?.includes('当前笔记暂时无法浏览')});floating.fit();$('#report').value=globalThis.XhsDiagnostics?.exportText()||'诊断脚本未加载';trace('report-open');};
  $('#report').onclick=()=>{$('#report').select();};
  $('#auto').onchange=e=>{state.auto=e.target.checked;if(state.auto)setComments(false);chrome.storage.local.set({auto:state.auto});update();};
  $('#enabled').onchange=e=>{state.enabled=e.target.checked;chrome.storage.local.set({enabled:state.enabled});if(!state.enabled){restoreComments();for(const [v,loop] of loopSaved)if(v.isConnected)v.loop=loop;detach();}scan();};
  chrome.storage.local.get({enabled:true,auto:false,folded:true,position:null},prefs=>{state.enabled=prefs.enabled;state.auto=prefs.auto;setFolded(prefs.folded);floating.restore(prefs.position);scan();});
  trace('ui-ready');
  // One small watchdog; no high-frequency DOM polling or network requests.
  function startWatch(){clearInterval(watchTimer);watchTimer=setInterval(()=>{if(!document.hidden)scan();},1000);}
  startWatch();
  window.addEventListener('pageshow',e=>{if(e.persisted){state.busy=false;observer.observe(document.body,{childList:true,subtree:true});startWatch();scan();}});
  window.addEventListener('pagehide',()=>{persistQueue();detach();clearInterval(watchTimer);observer.disconnect();restoreComments();for(const [v,loop] of loopSaved)if(v.isConnected)v.loop=loop;});
})();

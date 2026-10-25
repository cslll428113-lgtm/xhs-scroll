(() => {
  'use strict';
  const key='shuluo-xhs-diagnostic-v1';
  const knownUi=new Set(['fold','mini','prev','next','start','comments','diagnose','enabled','auto','collect','stream','mini-prev','mini-next','pip','refresh','mini-refresh']);
  let records=[];
  try{const stored=JSON.parse(sessionStorage.getItem(key)||'[]');if(Array.isArray(stored))records=stored.slice(-100);}catch{}
  function route(){
    const path=location.pathname;
    return /^\/(explore|search_result|red_video)\/[a-f0-9]{24}/i.test(path)?'note':(path==='/explore'||path==='/red_video')?'feed':path==='/search_result'?'search':path==='/404'?'error':'other';
  }
  // Export only bounded structural facts: never URLs, tokens, text, account data, or note IDs.
  function add(event,details={}){
    const safe={};
    for(const [k,v] of Object.entries(details))if(typeof v==='boolean'||typeof v==='number'||(typeof v==='string'&&/^[a-zA-Z0-9_.:-]{0,80}$/.test(v)))safe[k]=v;
    records.push({t:Date.now(),event,route:route(),...safe});records=records.slice(-100);
    try{sessionStorage.setItem(key,JSON.stringify(records));}catch{}
  }
  function exportText(){return JSON.stringify({version:'0.5.0',records},null,2);}
  globalThis.XhsDiagnostics={add,exportText};
  add('boot',{navigationType:performance.getEntriesByType('navigation')[0]?.type||'unknown'});
  window.addEventListener('pagehide',e=>add('pagehide',{persisted:!!e.persisted}));
  window.addEventListener('pageshow',e=>add('pageshow',{persisted:!!e.persisted}));
  window.addEventListener('error',e=>add('script-error',{name:e.error?.name||'Error',line:e.lineno||0}));
  document.addEventListener('click',e=>{
    const path=e.composedPath();const ui=path.find(el=>knownUi.has(el?.id));
    if(ui&&path.some(el=>el?.id==='shuluo-xhs')){add('ui-click',{control:ui.id,trusted:e.isTrusted});return;}
    const anchor=e.target.closest?.('.note-item a.cover,.note-item a.title,[data-testid="note-item"] a');
    if(!anchor)return;
    let hasToken=false;try{hasToken=new URL(anchor.href,location.href).searchParams.has('xsec_token');}catch{}
    add('card-click',{trusted:e.isTrusted,target:anchor.getAttribute('target')||'none',hasToken,tag:e.target.tagName||'unknown',hasHref:anchor.hasAttribute('href')});
    queueMicrotask(()=>add('card-click-after',{trusted:e.isTrusted,defaultPrevented:e.defaultPrevented}));
  },true);
})();

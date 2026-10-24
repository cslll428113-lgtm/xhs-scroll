(function(root){
  'use strict';
  function find(doc,visible){
    const known='.note-detail-mask .close-circle,.note-detail-mask .close-icon,.close-circle,[aria-label="关闭笔记"]';
    const direct=[...doc.querySelectorAll(known)].find(visible);if(direct)return direct;
    const scopes=[...doc.querySelectorAll('.note-detail-mask,#noteContainer,.note-container,[role="dialog"]')].filter(visible);
    const semantic='button[aria-label="关闭"],button[aria-label="返回"],[role="button"][aria-label="关闭"],[role="button"][aria-label="返回"],[aria-label="关闭笔记"],button[title="关闭"],button[title="返回"],.close-icon,.close-box,.close-button,.back-button,.back-btn';
    for(const scope of scopes){
      const control=[...scope.querySelectorAll(semantic)].find(visible);if(control)return control;
      // Compact layouts may expose only an SVG icon in a wrapper. Match a
      // close/back symbol in the note's top-left header, never an arbitrary X.
      const bounds=scope.getBoundingClientRect();
      for(const use of scope.querySelectorAll('svg use')){
        const symbol=use.getAttribute('href')||use.getAttribute('xlink:href')||'';
        if(!/(?:#|[-_])(close|back|arrow-left)(?:$|[-_])/i.test(symbol))continue;
        const svg=use.closest('svg');
        const button=svg?.closest('button,[role="button"],.reds-button-new,.close-box,.close-icon,.close-circle')||svg?.parentElement;
        if(!button||!scope.contains(button)||!visible(button))continue;
        const r=button.getBoundingClientRect();
        if(r.width<=80&&r.height<=80&&r.top>=bounds.top-5&&r.top<bounds.top+120&&r.left<bounds.left+120)return button;
      }
    }
    return null;
  }
  root.XhsCloseControl={find};
  if(typeof module!=='undefined')module.exports=root.XhsCloseControl;
})(globalThis);

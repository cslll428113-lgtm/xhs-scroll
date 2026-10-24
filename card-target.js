(function(root){
  'use strict';
  function usable(link){
    if(!link?.isConnected)return false;
    const box=link.getBoundingClientRect();
    if(box.width<=2||box.height<=2)return false;
    const style=link.ownerDocument.defaultView.getComputedStyle(link);
    return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0';
  }
  function select(card,{requireLayout=true}={}){
    // querySelector('preferred, fallback') uses document order, not priority.
    // The real cards put a zero-size hidden note link before a.cover.
    // Select each class of candidate separately; never click hidden links.
    for(const selector of ['a.cover[href]','a.title[href]','a[href*="/explore/"],a[href*="/search_result/"],a[href*="/red_video/"]']){
      for(const link of card.querySelectorAll(selector)){
        if(!link.isConnected)continue;
        // Named cover/title is the interactive element even while its feed
        // ancestor is hidden by a note modal. Unnamed URLs need layout proof.
        if(!requireLayout&&selector!=='a[href*="/explore/"],a[href*="/search_result/"],a[href*="/red_video/"]')return link;
        if(usable(link))return link;
      }
    }
    return null;
  }
  root.XhsCardTarget={select};
  if(typeof module!=='undefined')module.exports=root.XhsCardTarget;
})(globalThis);

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
    const fallback='a[href*="/explore/"],a[href*="/search_result/"],a[href*="/red_video/"],a[href*="/user/profile/"]';
    for(const selector of ['a.cover[href]','a.title[href]',fallback]){
      const links=card.matches?.(selector)?[card,...card.querySelectorAll(selector)]:card.querySelectorAll(selector);
      for(const link of links){
        if(!link.isConnected)continue;
        if(root.XhsQueue&&!root.XhsQueue.note(link.getAttribute('href'),link.ownerDocument.baseURI))continue;
        // Named cover/title is the interactive element even while its feed
        // ancestor is hidden by a note modal. Unnamed URLs need layout proof.
        if(!requireLayout&&selector!==fallback)return link;
        if(usable(link))return link;
      }
    }
    return null;
  }
  function isVideo(card){
    if(card.querySelector('.play-icon,video,[data-note-type="video"],[class*="video-icon"],[data-type="video"],svg[class*="play"],svg[class*="video"],[aria-label="播放视频"]'))return true;
    // Profile cards can render their play badge as an SVG sprite, without
    // the feed's .play-icon class. Both SVG href spellings are in use.
    return [...card.querySelectorAll('svg use')].some(use=>{
      const href=use.getAttribute('href')||use.getAttribute('xlink:href')||'';
      const symbol=href.split('#')[1]||'';
      return /(?:^|[-_])(?:video|play)(?:$|[-_])/i.test(symbol);
    });
  }
  root.XhsCardTarget={select,isVideo};
  if(typeof module!=='undefined')module.exports=root.XhsCardTarget;
})(globalThis);

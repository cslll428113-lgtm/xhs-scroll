(function(root){
  'use strict';
  function advance(cards){
    // Waterfall DOM order is not vertical order. The final card can be in a
    // short column, so scrolling it need not reach the actual loading edge.
    let edge=null,bottom=-Infinity;
    for(const card of cards){const rect=card.getBoundingClientRect();if(rect.height>0&&rect.bottom>=bottom){edge=card;bottom=rect.bottom;}}
    if(!edge)return;
    edge.scrollIntoView({block:'end',behavior:'instant'});
    for(let el=edge.parentElement;el;el=el.parentElement){
      if(el.scrollHeight>el.clientHeight+2)el.scrollTop=el.scrollHeight;
    }
  }
  root.XhsFeedScroll={advance};
  if(typeof module!=='undefined')module.exports=root.XhsFeedScroll;
})(globalThis);

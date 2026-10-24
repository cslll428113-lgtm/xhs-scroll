const {test}=require('node:test');const assert=require('node:assert/strict');const {select}=require('../card-target.js');
function link(cls,width,height,opts={}){
 const style={display:'block',visibility:'visible',opacity:'1',...opts.style};
 return {cls,isConnected:opts.connected!==false,getBoundingClientRect:()=>({width,height}),ownerDocument:{defaultView:{getComputedStyle:()=>style}}};
}
function card(links){return {querySelectorAll:selector=>links.filter(a=>selector==='a.cover[href]'?a.cls.split(' ').includes('cover'):selector==='a.title[href]'?a.cls==='title':a.cls!=='author')};}
test('real user structure: zero-size first link is skipped in favor of cover',()=>{const hidden=link('',0,0),cover=link('cover mask ld',237.66,317),title=link('title',213.66,19.6);assert.equal(select(card([hidden,cover,title,link('author',74,20)])),cover);});
test('cover has priority even when title is earlier in document order',()=>{const title=link('title',200,20),cover=link('cover mask ld',238,317);assert.equal(select(card([link('',0,0),title,cover])),cover);});
test('hidden and detached cover rejected, visible title used',()=>{const title=link('title',200,20);for(const cover of [link('cover',200,300,{style:{display:'none'}}),link('cover',200,300,{connected:false}),link('cover',0,0)])assert.equal(select(card([link('',0,0),cover,title])),title);});
test('no usable note link returns null rather than activating hidden URL',()=>{assert.equal(select(card([link('',0,0),link('author',74,20)])),null);});
test('offscreen layout-sized covers remain available without scrolling the feed',()=>{const cover=link('cover',200,300);assert.equal(select(card([link('',0,0),cover])),cover);});

test('named cover remains identifiable under modal even at zero size',()=>{const cover=link('cover mask ld',0,0),hidden=link('',0,0);assert.equal(select(card([hidden,cover]),{requireLayout:false}),cover);assert.equal(select(card([hidden,cover]),{requireLayout:true}),null);});

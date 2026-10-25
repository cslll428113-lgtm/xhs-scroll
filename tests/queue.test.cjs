const {test}=require('node:test');const assert=require('node:assert/strict');const {note,merge,read}=require('../queue.js');
const A='a'.repeat(24);
test('external, script, and credential-containing URLs rejected',()=>{for(const url of ['javascript:alert(1)','https://evil.test/explore/'+A,'https://www.xiaohongshu.com.evil.test/explore/'+A,'https://user:pass@www.xiaohongshu.com/explore/'+A])assert.equal(note(url),null);});
test('original note query preserved and duplicate cards coalesced',()=>{const href='https://www.xiaohongshu.com/explore/'+A+'?xsec_token=a%2Bb%3D&xsec_source=pc_feed';assert.equal(note(href).href,href);assert.equal(merge([{href}],[{href}]).length,1);});
test('malformed or older storage does not crash page',()=>{for(const s of ['bad',null,'{"version":1,"items":[]}','{"version":2,"items":null}'])assert.equal(read(s),null);});

test('live RED video routes preserve signed query and share identity with explore',()=>{const href='https://www.xiaohongshu.com/red_video/'+A+'?xsec_token=test%2Btoken&xsec_source=pc_dual_feed';assert.equal(note(href).id,A);assert.equal(note(href).href,href);assert.equal(merge([{href:'https://www.xiaohongshu.com/explore/'+A}],[{href}]).length,1);assert.equal(note('https://www.xiaohongshu.com/red_video'),null);});

test('profile note URLs keep note identity and the original signed URL',()=>{
 const user='d'.repeat(24),href=`https://www.xiaohongshu.com/user/profile/${user}/${A}?xsec_token=a%2Bb%3D&xsec_source=pc_user`;
 assert.equal(note(href).id,A);assert.equal(note(href).href,href);
 assert.equal(merge([{href:'https://www.xiaohongshu.com/explore/'+A}],[{href}]).length,1);
 assert.equal(note(`/user/profile/${user}`),null);
 for(const path of [`/user/profile/${user}/likes`,`/user/profile/${user}/${A}/extra`,`/user/profile/invalid/${A}`])assert.equal(note(path),null);
});

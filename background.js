// Only create a new official video-feed tab; never navigate or refresh the sender.
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message?.type!=='xhs-open-stream')return false;
  try{if(new URL(sender.url).origin!=='https://www.xiaohongshu.com')return false;}catch{return false;}
  chrome.tabs.create({url:'https://www.xiaohongshu.com/red_video#shuluo-stream',active:true},tab=>{
    const error=chrome.runtime.lastError;
    respond(error?{ok:false}:{ok:!!tab});
  });return true;
});

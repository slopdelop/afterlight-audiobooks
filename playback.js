/** Keep a restored position pending until the media element confirms the seek. */
export function loadAudioAt(audio,src,position,{duration,signal,timeoutMs=45000}={}){
 return new Promise((resolve,reject)=>{
  let finished=false,requested=false,timer;
  const events=['loadedmetadata','loadeddata','canplay','seeked','durationchange'];
  const cleanup=()=>{clearTimeout(timer);for(const event of events)audio.removeEventListener(event,attempt);audio.removeEventListener('error',failed);signal?.removeEventListener('abort',aborted);};
  const finish=error=>{if(finished)return;finished=true;cleanup();error?reject(error):resolve();};
  const failed=()=>finish(Error('The audio could not load. Your saved place is kept. Reconnect or download the chapter and try Play again.'));
  const aborted=()=>finish(new DOMException('Audio source replaced','AbortError'));
  function attempt(){
   if(finished||audio.readyState<1)return;
   const end=Number.isFinite(audio.duration)?Math.min(duration,audio.duration):duration;
   const target=Math.min(end,Math.max(0,Number(position)||0)),close=Math.abs(audio.currentTime-target)<.15;
   // A nonzero currentTime assignment can be asynchronous or rejected until data arrives.
   if(close&&!audio.seeking&&(target===0||audio.readyState>=2)){finish();return;}
   if(audio.seeking)return;
   if(!requested||!close){try{audio.currentTime=target;requested=true;}catch{/* Retry when loadeddata/canplay confirms that seeking is available. */}}
  }
  if(signal?.aborted){aborted();return;}
  for(const event of events)audio.addEventListener(event,attempt);
  audio.addEventListener('error',failed);signal?.addEventListener('abort',aborted,{once:true});
  timer=setTimeout(()=>finish(Error('The audio has not returned to your saved place yet. Your place is kept; tap Play to retry.')),timeoutMs);
  try{audio.pause();audio.src=src;audio.load();attempt();}catch(error){finish(error);}
 });
}
// Called synchronously from the user's Play gesture or the lock-screen action.
// Optional session configuration must never prevent the native play request.
export function requestNativePlay(audio,navigatorLike={}){
 try{if(navigatorLike.audioSession&&navigatorLike.audioSession.type!=='playback')navigatorLike.audioSession.type='playback';}catch{}
 try{return Promise.resolve(audio.play());}catch(error){return Promise.reject(error);}
}

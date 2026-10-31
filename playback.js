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
/** Resolve just one next source while playback is active, without loading another media element. */
export function createPreparedSource(resolve,{release=src=>{if(src.startsWith('blob:'))URL.revokeObjectURL(src);}}={}){
 let entry=null;
 const key=c=>JSON.stringify([c.id,c.src]);
 function clear(){const old=entry;entry=null;if(old?.src)release(old.src);}
 return {
  prepare(chapter){
   if(!chapter){clear();return Promise.resolve(null);}
   if(entry?.key===key(chapter))return entry.promise;
   clear();const current={key:key(chapter),src:null};entry=current;
   current.promise=Promise.resolve().then(()=>resolve(chapter)).then(src=>{
    if(entry!==current){release(src);return null;}
    current.src=src;return src;
   },()=>null);
   return current.promise;
  },
  take(chapter){if(entry?.key!==key(chapter)||!entry.src)return null;const src=entry.src;entry=null;return src;},
  clear
 };
}
// Called synchronously from Play, a lock-screen action, or the chapter-ended handler.
// Optional session configuration must never prevent the native play request.
export function requestNativePlay(audio,navigatorLike={}){
 try{if(navigatorLike.audioSession&&navigatorLike.audioSession.type!=='playback')navigatorLike.audioSession.type='playback';}catch{}
 try{return Promise.resolve(audio.play());}catch(error){return Promise.reject(error);}
}

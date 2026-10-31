/** Portrait is a preference: iOS may not expose or permit the orientation-lock API. */
export function requestPortraitLock(screenLike=globalThis.screen){
 try{
  if(typeof screenLike?.orientation?.lock!=='function')return Promise.resolve(false);
  return Promise.resolve(screenLike.orientation.lock('portrait')).then(()=>true,()=>false);
 }catch{return Promise.resolve(false);}
}

/** Stop the fixed paged reader from handing single-finger pans to the document. */
export function createViewportGuard({documentLike=globalThis.document,windowLike=globalThis.window}={}){
 const request=()=>{if(!documentLike.hidden&&windowLike.matchMedia?.('(pointer: coarse)').matches)requestPortraitLock(windowLike.screen);};
 const preventOuterPan=event=>{
  if(documentLike.body.dataset.view!=='reader'||!documentLike.body.classList.contains('reading-paged')||event.touches.length!==1||event.target.closest?.('dialog'))return;
  if(event.cancelable)event.preventDefault();
 };
 documentLike.addEventListener('touchmove',preventOuterPan,{passive:false});
 documentLike.addEventListener('pointerup',request);
 documentLike.addEventListener('visibilitychange',request);
 documentLike.addEventListener('fullscreenchange',request);
 windowLike.screen?.orientation?.addEventListener?.('change',request);
 request();
 return {destroy(){
  documentLike.removeEventListener('touchmove',preventOuterPan);
  for(const event of ['pointerup','visibilitychange','fullscreenchange'])documentLike.removeEventListener(event,request);
  windowLike.screen?.orientation?.removeEventListener?.('change',request);
 }};
}

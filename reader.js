/** Paragraph boundaries are audio positions; chapter/paragraph IDs survive reloads. */
export function paragraphIndexAt(paragraphs,seconds){if(!paragraphs.length)return -1;let lo=0,hi=paragraphs.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(paragraphs[mid].start<=seconds)lo=mid;else hi=mid-1;}return lo;}
export function validateTranscript(raw,chapterId,duration){if(raw?.version!==1||raw.chapterId!==chapterId||!Array.isArray(raw.paragraphs)||!raw.paragraphs.length)throw Error('This chapter text is not available yet.');let previous=-1;const ids=new Set();for(const p of raw.paragraphs){if(typeof p.id!=='string'||ids.has(p.id)||typeof p.text!=='string'||!p.text.trim()||!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<0||p.start<=previous||p.end<=p.start||p.end>duration+.5)throw Error('This chapter text has invalid timing.');ids.add(p.id);previous=p.start;}return raw;}
export function readingPosition(paragraphs,paragraphId,fallback=0){const p=paragraphs.find(p=>p.id===paragraphId);return p?p.start:Math.max(0,fallback);}

/** CSS columns keep the original prose intact, including paragraphs longer than one page. */
export function createReaderPager({viewport,content,onChange=()=>{},onTurn=()=>{},gap=32,pageTurnEffect=createPageTurnEffect({viewport,content})}){
 let enabled=false,page=0,count=1,touch=null,suppressClick=false;
 const blocks=()=>[...content.querySelectorAll('[data-reader-paragraph]')];
 const width=()=>viewport.getBoundingClientRect().width||viewport.clientWidth;
 const stride=()=>width()+gap;
 function notify(){onChange({page,count});}
 function show(target,turning=false){if(!turning)pageTurnEffect.cancel();page=Math.max(0,Math.min(count-1,target));viewport.scrollTo({left:page*stride(),top:0,behavior:'instant'});notify();}
 function paragraphPage(index){const rect=blocks()[index]?.getClientRects()[0];return rect?Math.floor((rect.left-viewport.getBoundingClientRect().left+viewport.scrollLeft+1)/stride()):0;}
 function firstVisible(){const edge=viewport.getBoundingClientRect();return blocks().findIndex(block=>[...block.getClientRects()].some(r=>r.width>0&&r.right>edge.left+1&&r.left<edge.right-1));}
 function layout(index=0){
  if(!enabled||!viewport.clientWidth||!viewport.clientHeight)return;
  content.style.setProperty('--reader-page-width',width()+'px');
  count=Math.max(1,Math.ceil((content.scrollWidth+gap-1)/stride()));show(paragraphPage(index));
 }
 function turn(delta){if(!enabled)return;const next=Math.max(0,Math.min(count-1,page+delta));if(next===page)return;const reveal=pageTurnEffect.prepare(next>page?1:-1);show(next,true);reveal();const index=firstVisible();if(index>=0)onTurn(index);}
 viewport.addEventListener('touchstart',e=>{suppressClick=false;touch=enabled&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 viewport.addEventListener('touchcancel',()=>{touch=null;});
 viewport.addEventListener('touchend',e=>{
  if(!touch||!enabled)return;const start=touch;touch=null;const end=e.changedTouches[0],selection=globalThis.getSelection?.();if(!end||selection&&!selection.isCollapsed)return;
  const dx=end.clientX-start.x,dy=end.clientY-start.y;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){suppressClick=true;turn(dx<0?1:-1);}
 },{passive:true});
 viewport.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopPropagation();}},true);
 viewport.addEventListener('keydown',e=>{if(!enabled||!['ArrowLeft','ArrowRight','PageUp','PageDown',' '].includes(e.key)||e.altKey||e.ctrlKey||e.metaKey)return;e.preventDefault();e.stopPropagation();turn(['ArrowLeft','PageUp'].includes(e.key)||e.key===' '&&e.shiftKey?-1:1);});
 return {layout,turn,showParagraph(index){if(enabled){const target=paragraphPage(index);if(target!==page)show(target);}},setEnabled(value){enabled=value;touch=null;if(!value){pageTurnEffect.cancel();viewport.scrollTo({left:0,top:0,behavior:'instant'});page=0;count=1;}},get enabled(){return enabled;}};
}

/** Visual copies only: the real page and its saved position change synchronously. */
export function createPageTurnEffect({viewport,content,documentLike=viewport.ownerDocument,windowLike=documentLike?.defaultView||globalThis,duration=460}){
 let running=null;
 const motion=windowLike.matchMedia?.('(prefers-reduced-motion: reduce)');
 function cancel(){
  const previous=running;running=null;if(!previous)return;
  windowLike.clearTimeout?.(previous.timer);
  for(const animation of previous.animations)animation.cancel();
  previous.stage.remove();
 }
 function snapshot(rect){
  const copy=content.cloneNode(true);copy.removeAttribute('id');
  for(const el of copy.querySelectorAll('[id]'))el.removeAttribute('id');
  for(const el of copy.querySelectorAll('[tabindex]'))el.setAttribute('tabindex','-1');
  Object.assign(copy.style,{position:'absolute',top:'0',left:'0',margin:'0',width:rect.width+'px',height:rect.height+'px',transform:`translate3d(${-viewport.scrollLeft}px,0,0)`});
  return copy;
 }
 function prepare(direction){
  cancel();
  const rect=viewport.getBoundingClientRect();
  if(motion?.matches||documentLike?.hidden||!documentLike?.createElement||typeof content.animate!=='function'||!viewport.parentElement||!rect.width||!rect.height)return ()=>{};
  try{
   const stage=documentLike.createElement('div');stage.className='reader-turn-stage';stage.setAttribute('aria-hidden','true');stage.inert=true;
   Object.assign(stage.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
   const sheet=className=>{const el=documentLike.createElement('div');el.className=className;el.append(snapshot(rect));return el;};
   const old=sheet(direction>0?'reader-turn-leaf':'reader-turn-base');stage.append(old);viewport.parentElement.append(stage);
   const current={stage,animations:[],timer:null};running=current;
   return ()=>{
    if(running!==current)return;
    try{
     const shadow=documentLike.createElement('div');shadow.className='reader-turn-shadow';stage.append(shadow);
     const leaf=direction>0?old:sheet('reader-turn-leaf');
     if(direction<0)stage.append(leaf);
     const fold=documentLike.createElement('div');fold.className='reader-turn-fold';leaf.append(fold);
     const flat='rotateY(0deg) skewY(0deg)',folded='rotateY(-102deg) skewY(-1.5deg)';
     const options={duration,easing:'cubic-bezier(.35,.05,.35,1)',fill:'both'};
     current.animations.push(leaf.animate(direction>0?[{transform:flat},{transform:folded}]:[{transform:folded},{transform:flat}],options));
     current.animations.push(fold.animate([{opacity:0},{opacity:.9,offset:.45},{opacity:0}],options));
     current.animations.push(shadow.animate([{opacity:0},{opacity:.75,offset:.45},{opacity:0}],options));
     const finish=()=>{if(running===current)cancel();};
     Promise.all(current.animations.map(a=>a.finished)).then(finish,finish);
     current.timer=windowLike.setTimeout?.(finish,duration+150);
    }catch{cancel();}
   };
  }catch{cancel();return ()=>{};}
 }
 motion?.addEventListener?.('change',cancel);
 documentLike?.addEventListener?.('visibilitychange',()=>{if(documentLike.hidden)cancel();});
 windowLike.addEventListener?.('resize',cancel);
 return {prepare,cancel};
}

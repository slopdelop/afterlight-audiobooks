/** Paragraph boundaries are audio positions; chapter/paragraph IDs survive reloads. */
export function paragraphIndexAt(paragraphs,seconds){if(!paragraphs.length)return -1;let lo=0,hi=paragraphs.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(paragraphs[mid].start<=seconds)lo=mid;else hi=mid-1;}return lo;}
export function validateTranscript(raw,chapterId,duration){if(raw?.version!==1||raw.chapterId!==chapterId||!Array.isArray(raw.paragraphs)||!raw.paragraphs.length)throw Error('This chapter text is not available yet.');let previous=-1;const ids=new Set();for(const p of raw.paragraphs){if(typeof p.id!=='string'||ids.has(p.id)||typeof p.text!=='string'||!p.text.trim()||!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<0||p.start<=previous||p.end<=p.start||p.end>duration+.5)throw Error('This chapter text has invalid timing.');ids.add(p.id);previous=p.start;}return raw;}
export function readingPosition(paragraphs,paragraphId,fallback=0){const p=paragraphs.find(p=>p.id===paragraphId);return p?p.start:Math.max(0,fallback);}

/** CSS columns keep the original prose intact, including paragraphs longer than one page. */
export function createReaderPager({viewport,content,onChange=()=>{},onTurn=()=>{},gap=32}){
 let enabled=false,page=0,count=1,touch=null,suppressClick=false;
 const blocks=()=>[...content.querySelectorAll('[data-reader-paragraph]')];
 const width=()=>viewport.getBoundingClientRect().width||viewport.clientWidth;
 const stride=()=>width()+gap;
 function notify(){onChange({page,count});}
 function show(target){page=Math.max(0,Math.min(count-1,target));viewport.scrollTo({left:page*stride(),top:0,behavior:'instant'});notify();}
 function paragraphPage(index){const rect=blocks()[index]?.getClientRects()[0];return rect?Math.floor((rect.left-viewport.getBoundingClientRect().left+viewport.scrollLeft+1)/stride()):0;}
 function firstVisible(){const edge=viewport.getBoundingClientRect();return blocks().findIndex(block=>[...block.getClientRects()].some(r=>r.width>0&&r.right>edge.left+1&&r.left<edge.right-1));}
 function layout(index=0){
  if(!enabled||!viewport.clientWidth||!viewport.clientHeight)return;
  content.style.setProperty('--reader-page-width',width()+'px');
  count=Math.max(1,Math.ceil((content.scrollWidth+gap-1)/stride()));show(paragraphPage(index));
 }
 function turn(delta){if(!enabled)return;const next=Math.max(0,Math.min(count-1,page+delta));if(next===page)return;show(next);const index=firstVisible();if(index>=0)onTurn(index);}
 viewport.addEventListener('touchstart',e=>{suppressClick=false;touch=enabled&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 viewport.addEventListener('touchcancel',()=>{touch=null;});
 viewport.addEventListener('touchend',e=>{
  if(!touch||!enabled)return;const start=touch;touch=null;const end=e.changedTouches[0],selection=globalThis.getSelection?.();if(!end||selection&&!selection.isCollapsed)return;
  const dx=end.clientX-start.x,dy=end.clientY-start.y;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){suppressClick=true;turn(dx<0?1:-1);}
 },{passive:true});
 viewport.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopPropagation();}},true);
 viewport.addEventListener('keydown',e=>{if(!enabled||!['ArrowLeft','ArrowRight','PageUp','PageDown',' '].includes(e.key)||e.altKey||e.ctrlKey||e.metaKey)return;e.preventDefault();e.stopPropagation();turn(['ArrowLeft','PageUp'].includes(e.key)||e.key===' '&&e.shiftKey?-1:1);});
 return {layout,turn,showParagraph(index){if(enabled)show(paragraphPage(index));},setEnabled(value){enabled=value;touch=null;if(!value){viewport.scrollTo({left:0,top:0,behavior:'instant'});page=0;count=1;}},get enabled(){return enabled;}};
}

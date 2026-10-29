import {reviewMarkup} from './casting-view.js';
export const RATINGS_KEY='afterlight-voice-ratings-v1';
export const FAVOURITES_KEY='afterlight-casting-favourites-v1';
export function mergeRoundRatings(existing,ratings,voices){const all={...(existing||{})};for(const v of voices)delete all[v.id];return {...all,...ratings};}
export function restoreFavourites(raw,voices){const result={};for(const role of ['han','leia'])if(voices.some(v=>v.id===raw?.[role]&&v.role===role))result[role]=raw[role];return result;}
export function roundFavourites(raw,mode,voices){return restoreFavourites(raw?.rounds?.[mode]||(mode==='casting'?raw:{}),voices);}
export function mergeFavourites(raw,mode,favourites){return {...raw,rounds:{...raw?.rounds,[mode]:favourites}};}

export function restoreRatings(raw,voices){
 const ratings={};if(raw?.version!==1||!raw.ratings||typeof raw.ratings!=='object')return ratings;
 for(const {id} of voices){const value=raw.ratings[id];if(Number.isInteger(value)&&value>=1&&value<=5)ratings[id]=value;}
 return ratings;
}
export function formatRatings(catalog,ratings){
 return ['Afterlight voice review',`Round: ${catalog.round}`,...Object.entries(catalog.favourites||{}).map(([role,id])=>`Favourite ${role}: ${catalog.voices.find(v=>v.id===id)?.name||id} [${id}]`),'',...catalog.voices.map(v=>`${v.role}: ${v.name} [${v.id}]: ${ratings[v.id]?ratings[v.id]+'/5':'Not rated'} — ${v.description}`)].join('\n');
}
export function writeRatingsToClipboard(text,clipboard=globalThis.navigator?.clipboard){
 if(!clipboard?.writeText)return Promise.reject(Error('Clipboard is unavailable'));
 return clipboard.writeText(text);
}

// One preview element, separate from chapter playback and its saved position.
export function createVoiceReview({panel,openPanel,settingsPanel,beforePreview,onStop,toast}){
 let catalog=null,ratings={},current=null,preview=null,mode='design',openToken=0;const catalogs={};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const inReview=()=>!!panel.querySelector('#voiceReview');
 function setStatus(message){const el=panel.querySelector('#reviewStatus');if(el)el.textContent=message;}
 function save(){try{let old;try{old=JSON.parse(localStorage.getItem(RATINGS_KEY));}catch{}localStorage.setItem(RATINGS_KEY,JSON.stringify({version:1,round:catalog.round,ratings:mergeRoundRatings(old?.ratings,ratings,catalog.voices)}));return true;}catch{setStatus('Device storage is unavailable. Copy your results before leaving.');return false;}}
 function syncPlayback(){
  panel.querySelectorAll('[data-review-play]').forEach(b=>{const playing=current?.id===b.dataset.reviewPlay&&!preview.paused;b.textContent=playing?'Pause':'Play';b.setAttribute('aria-label',`${playing?'Pause':'Play'} ${catalog.voices.find(v=>v.id===b.dataset.reviewPlay).role+' '+catalog.voices.find(v=>v.id===b.dataset.reviewPlay).name}`);});
  try{if(inReview()&&current&&'mediaSession'in navigator)navigator.mediaSession.playbackState=preview.paused?'paused':'playing';}catch{}
 }
 function stop(){if(preview){preview.pause();preview.removeAttribute('src');preview.load();}current=null;onStop?.();}
 async function open(nextMode='design'){
  stop();mode=nextMode;const token=++openToken;
  openPanel('Voice review','<p>Loading voice samples…</p>');
  try{
   const data=catalogs[mode]||await fetch(({design:'assets/voice-design.json',casting:'assets/original-casting.json',previous:'assets/voice-auditions.json'})[mode]).then(r=>{if(!r.ok)throw Error('Connect to the internet to load the voice list.');return r.json();});if(token!==openToken)return;catalogs[mode]=data;catalog=data;
   if(!panel.open||panel.querySelector('#voiceReview')||panel.querySelector('#panelTitle').textContent!=='Voice review')return;
   let raw=null;try{raw=JSON.parse(localStorage.getItem(RATINGS_KEY));}catch{}
   ratings=restoreRatings(raw,catalog.voices);
   try{catalog.favourites=roundFavourites(JSON.parse(localStorage.getItem(FAVOURITES_KEY)),mode,catalog.voices);}catch{catalog.favourites={};}
   openPanel('Voice review',reviewMarkup(catalog,ratings,mode,esc));
   preview=panel.querySelector('#voicePreview');
   for(const event of ['play','pause','ended'])preview.addEventListener(event,syncPlayback);
   preview.addEventListener('error',()=>setStatus('Sample could not load. Check your connection and tap Play again.'));
  }catch(error){if(panel.open&&panel.querySelector('#panelTitle').textContent==='Voice review')openPanel('Voice review',`<p>${esc(error.message)}</p><button class="subtle-button full-width" data-review-back>Back to Settings</button>`);}
 }
 async function resume(){
  if(!preview||!current)return;
  beforePreview();
  try{await preview.play();}catch{setStatus('Tap Play to start the sample.');return;}
  try{if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:current.name,artist:'Afterlight voice review',album:catalog.round});navigator.mediaSession.playbackState='playing';}}catch{}
 }
 async function copy(){
  const text=formatRatings(catalog,ratings);
  // Call Clipboard.writeText directly in the tap handler for iPhone Safari.
  try{await writeRatingsToClipboard(text);setStatus('Copied. Paste your ratings into Codex.');toast('Voice ratings copied.');}
  catch{const field=panel.querySelector('#voiceRatingsText');field.value=text;panel.querySelector('#manualRatings').hidden=false;field.focus();field.select();field.setSelectionRange(0,text.length);setStatus('Copy is unavailable here. Press and hold the selected results, then choose Copy.');}
 }
 panel.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-review-back'))settingsPanel();
  if(button.dataset.reviewRound){open(button.dataset.reviewRound);return;}
  if(button.id==='replayVoice'&&current){preview.currentTime=0;resume();return;}
  if(button.dataset.reviewFavourite){const v=catalog.voices.find(v=>v.id===button.dataset.reviewFavourite);if(!v)return;if(catalog.favourites[v.role]===v.id)delete catalog.favourites[v.role];else catalog.favourites[v.role]=v.id;try{let saved={};try{saved=JSON.parse(localStorage.getItem(FAVOURITES_KEY))||{};}catch{}localStorage.setItem(FAVOURITES_KEY,JSON.stringify(mergeFavourites(saved,mode,catalog.favourites)));setStatus('Favourite saved. This does not change your audiobook casting.');}catch{setStatus('Storage unavailable. Copy results to retain your choice.');}panel.querySelectorAll('[data-review-favourite]').forEach(b=>{const selected=catalog.favourites[b.dataset.role]===b.dataset.reviewFavourite;b.setAttribute('aria-pressed',String(selected));b.textContent=selected?'✓ Favourite':'Choose favourite';});return;}
  if(button.id==='copyVoiceRatings')copy();
  if(button.dataset.reviewPlay){
   const selected=catalog.voices.find(v=>v.id===button.dataset.reviewPlay);if(!selected)return;
   if(current?.id===selected.id&&!preview.paused){preview.pause();return;}
   if(current?.id!==selected.id){preview.pause();current=selected;preview.src=selected.src;preview.hidden=false;panel.querySelector('#replayVoice').hidden=false;const label=panel.querySelector('#previewLabel');label.textContent='Sample: '+selected.role+' · '+selected.name;label.hidden=false;}
   resume();
  }
  if(button.dataset.reviewClear){delete ratings[button.dataset.reviewClear];refreshRating(button.dataset.reviewClear);save();}
 });
 function refreshRating(id){
  const row=panel.querySelector(`[data-review-row="${id}"]`);
  row.querySelectorAll('[data-review-rating]').forEach(input=>{input.checked=Number(input.value)===ratings[id];input.closest('label').classList.toggle('is-filled',Number(input.value)<=(ratings[id]||0));});
  row.querySelector('[data-review-score]').textContent=ratings[id]?ratings[id]+' / 5':'Not rated';row.querySelector('[data-review-clear]').hidden=!ratings[id];
 }
 panel.addEventListener('change',e=>{if(!e.target.dataset.reviewRating)return;const id=e.target.dataset.reviewRating,value=Number(e.target.value);if(!catalog.voices.some(v=>v.id===id)||!Number.isInteger(value)||value<1||value>5)return;ratings[id]=value;refreshRating(id);if(save())setStatus('Rating saved.');});
 panel.addEventListener('close',stop);
 return {open,stop,get active(){return inReview()&&!!current;},remote(action,d={}){if(!preview)return;if(action==='play')resume();if(action==='pause')preview.pause();if(action==='seekbackward')preview.currentTime=Math.max(0,preview.currentTime-(d.seekOffset||15));if(action==='seekforward')preview.currentTime=Math.min(preview.duration||0,preview.currentTime+(d.seekOffset||30));if(action==='seekto')preview.currentTime=Math.max(0,Math.min(preview.duration||0,d.seekTime||0));}};
}

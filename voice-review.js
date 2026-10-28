export const RATINGS_KEY='afterlight-voice-ratings-v1';

export function restoreRatings(raw,voices){
 const ratings={};if(raw?.version!==1||!raw.ratings||typeof raw.ratings!=='object')return ratings;
 for(const {id} of voices){const value=raw.ratings[id];if(Number.isInteger(value)&&value>=1&&value<=5)ratings[id]=value;}
 return ratings;
}
export function formatRatings(catalog,ratings){
 return ['Afterlight voice review',`Round: ${catalog.round}`,'',...catalog.voices.map(v=>`${v.name} [${v.id}]: ${ratings[v.id]?ratings[v.id]+'/5':'Not rated'} — ${v.description}`)].join('\n');
}
export function writeRatingsToClipboard(text,clipboard=globalThis.navigator?.clipboard){
 if(!clipboard?.writeText)return Promise.reject(Error('Clipboard is unavailable'));
 return clipboard.writeText(text);
}

// One preview element, separate from chapter playback and its saved position.
export function createVoiceReview({panel,openPanel,settingsPanel,beforePreview,onStop,toast}){
 let catalog=null,ratings={},current=null,preview=null,loadPromise=null;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const inReview=()=>!!panel.querySelector('#voiceReview');
 function setStatus(message){const el=panel.querySelector('#reviewStatus');if(el)el.textContent=message;}
 function save(){try{localStorage.setItem(RATINGS_KEY,JSON.stringify({version:1,round:catalog.round,ratings}));return true;}catch{setStatus('Device storage is unavailable. Copy your results before leaving.');return false;}}
 function syncPlayback(){
  panel.querySelectorAll('[data-review-play]').forEach(b=>{const playing=current?.id===b.dataset.reviewPlay&&!preview.paused;b.textContent=playing?'Pause':'Play';b.setAttribute('aria-label',`${playing?'Pause':'Play'} ${catalog.voices.find(v=>v.id===b.dataset.reviewPlay).name}`);});
  try{if(inReview()&&current&&'mediaSession'in navigator)navigator.mediaSession.playbackState=preview.paused?'paused':'playing';}catch{}
 }
 function stop(){if(preview){preview.pause();preview.removeAttribute('src');preview.load();}current=null;onStop?.();}
 async function open(){
  openPanel('Voice review','<p>Loading voice samples…</p>');
  try{
   if(!catalog){loadPromise??=fetch('assets/voice-auditions.json').then(r=>{if(!r.ok)throw Error('Connect to the internet to load the voice list.');return r.json();}).catch(e=>{loadPromise=null;throw e;});catalog=await loadPromise;}
   if(!panel.open||panel.querySelector('#voiceReview')||panel.querySelector('#panelTitle').textContent!=='Voice review')return;
   let raw=null;try{raw=JSON.parse(localStorage.getItem(RATINGS_KEY));}catch{}
   ratings=restoreRatings(raw,catalog.voices);
   openPanel('Voice review',`<section id="voiceReview"><button class="back-button" data-review-back>‹ Settings</button><p>Play a sample, then tap 1–5 stars. Ratings save on this device.</p><p class="review-note">AI voices · Same Chapter 6 dialogue for each character. Your audiobook casting stays unchanged.</p><audio id="voicePreview" controls preload="none" hidden aria-label="Voice sample"></audio><p id="previewLabel" class="review-note" hidden></p>${['han','leia'].map(role=>`<h3>${role==='han'?'Han Solo':'Leia Organa'}</h3>${catalog.voices.filter(v=>v.role===role).map(v=>`<article class="review-voice" data-review-row="${esc(v.id)}"><div class="review-heading"><div><strong>${esc(v.name)}</strong><small>${esc(v.description)} · ${Math.round(v.seconds)} sec</small></div><button class="subtle-button" data-review-play="${esc(v.id)}" aria-label="Play ${esc(v.name)}">Play</button></div><div class="voice-stars" role="radiogroup" aria-label="Rating for ${esc(v.name)}">${[1,2,3,4,5].map(n=>`<label class="voice-star ${n<=(ratings[v.id]||0)?'is-filled':''}"><input class="sr-only" type="radio" name="rating-${esc(v.id)}" data-review-rating="${esc(v.id)}" value="${n}" aria-label="${n} out of 5 stars for ${esc(v.name)}" ${ratings[v.id]===n?'checked':''}><span aria-hidden="true">★</span></label>`).join('')}</div><div class="review-rating"><span data-review-score="${esc(v.id)}">${ratings[v.id]?ratings[v.id]+' / 5':'Not rated'}</span><button class="text-button" data-review-clear="${esc(v.id)}" ${ratings[v.id]?'':'hidden'}>Clear rating</button></div></article>`).join('')}`).join('')}<div class="review-export"><button id="copyVoiceRatings" class="primary full-width">Copy results</button><p id="reviewStatus" role="status" aria-live="polite">Paste the copied results into Codex when you’re ready.</p><div id="manualRatings" hidden><label class="form-field">Select and copy these results<textarea id="voiceRatingsText" rows="9" readonly></textarea></label></div></div></section>`);
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
  if(button.id==='copyVoiceRatings')copy();
  if(button.dataset.reviewPlay){
   const selected=catalog.voices.find(v=>v.id===button.dataset.reviewPlay);if(!selected)return;
   if(current?.id===selected.id&&!preview.paused){preview.pause();return;}
   if(current?.id!==selected.id){preview.pause();current=selected;preview.src=selected.src;preview.hidden=false;const label=panel.querySelector('#previewLabel');label.textContent='Sample: '+selected.name;label.hidden=false;}
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

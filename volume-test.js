import {requestNativePlay} from './playback.js';

export const VOLUME_TEST_KEY='afterlight-volume-test-v1';
export function readTestLevel(storage){try{const raw=JSON.parse(storage.getItem(VOLUME_TEST_KEY));if(Number.isFinite(raw?.level)&&raw.level>=0&&raw.level<=100)return Math.round(raw.level);}catch{}return 50;}
export function createVolumePlayer(media,{createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),navigatorLike=globalThis.navigator,onState=()=>{}}={}){
 let context=null,source=null,gain=null,level=50,disposed=false;
 const notify=()=>{if(!disposed)onState();};
 for(const event of ['play','pause','playing','waiting','ended','timeupdate','error'])media.addEventListener(event,notify);
 function setLevel(next){if(!Number.isFinite(next)||next<0||next>100)throw Error('Choose a level from 0 to 100%.');level=next;if(gain)gain.gain.setTargetAtTime(level/100,context.currentTime,.03);}
 function stop(){if(disposed)return;disposed=true;media.pause();for(const event of ['play','pause','playing','waiting','ended','timeupdate','error'])media.removeEventListener(event,notify);try{source?.disconnect();gain?.disconnect();}catch{}try{Promise.resolve(context?.close()).catch(()=>{});}catch{}media.removeAttribute('src');media.load();}
 function play(){
  if(disposed)return Promise.reject(Error('Open the volume test again.'));
  try{
   if(!context){context=createContext();source=context.createMediaElementSource(media);gain=context.createGain();gain.gain.value=level/100;source.connect(gain);gain.connect(context.destination);context.onstatechange=notify;}
   // Both calls stay in the tap/lock-screen action, before the first await.
   const waking=context.resume(),playing=requestNativePlay(media,navigatorLike);
   return Promise.all([waking,playing]).then(()=>{if(!disposed)notify();}).catch(error=>{media.pause();throw error;});
  }catch(error){stop();return Promise.reject(error);}
 }
 return {play,pause:()=>media.pause(),stop,setLevel,get level(){return level;},get state(){return context?.state||'not started';}};
}

export function createVolumeTest({panel,openPanel,settingsPanel,beforePreview,onStop,storage,createPlayer=createVolumePlayer}){
 let media=null,player=null,title='',release=null,token=0,started=false;
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const active=()=>!!player&&!!panel.querySelector('#volumeTest');
 const status=text=>{const el=panel.querySelector('#volumeTestStatus');if(el)el.textContent=text;};
 function sync(){
  if(!active())return;
  const button=panel.querySelector('#volumeTestPlay');button.textContent=media.paused?'Play test':'Pause test';
  if(media.error)status('The test audio could not load. Reopen the test when connected.');
  else status(`${media.paused?'Paused':'Playing'} · ${Math.floor(media.currentTime)} seconds · Audio processing: ${player.state}`);
  try{if(started&&'mediaSession'in navigator){navigator.mediaSession.playbackState=media.paused?'paused':'playing';if(Number.isFinite(media.duration)&&media.duration>0)navigator.mediaSession.setPositionState({duration:media.duration,playbackRate:1,position:Math.min(media.currentTime,media.duration)});}}catch{}
 }
 function stop(){token++;started=false;const wasOpen=!!player;player?.stop();player=null;media=null;release?.();release=null;if(wasOpen)onStop();}
 function open(config){
  stop();openPanel('Volume test',`<section id="volumeTest"><p class="eyebrow">EXPERIMENTAL</p><p>Try an app-only volume level before we change normal playback.</p><p><strong>${esc(config.title)}</strong><br>This separate player starts at the beginning. Your audiobook position is kept.</p><label class="form-field" for="volumeTestLevel">Test audio level <output id="volumeTestValue">50%</output><input id="volumeTestLevel" type="range" min="0" max="100" step="1" aria-label="Test audio level" style="width:100%"></label><div class="choice-grid">${[25,50,75,100].map(n=>`<button class="choice" data-test-level="${n}">${n}%</button>`).join('')}</div><p>This level is saved only for the test on this device. Your phone’s volume still affects what you hear; this cannot measure it.</p><button id="volumeTestPlay" class="primary full-width">Play test</button><button id="volumeTestRestart" class="subtle-button full-width">Restart test</button><p id="volumeTestStatus" role="status" aria-live="polite">Ready. No test audio is playing.</p><p>To check iPhone behavior: play, lock the phone, pause and resume from the lock screen. Confirm the level stays consistent and audio remains audible.</p><button id="volumeTestBack" class="subtle-button full-width">Back to Settings</button><audio id="volumeTestAudio" preload="metadata" playsinline crossorigin="anonymous"></audio></section>`);
  title=config.title;release=config.release;media=panel.querySelector('#volumeTestAudio');media.src=config.src;
  player=createPlayer(media,{onState:sync});
  const level=readTestLevel(storage);player.setLevel(level);panel.querySelector('#volumeTestLevel').value=level;panel.querySelector('#volumeTestValue').textContent=level+'%';
 }
 function setLevel(value,save=true){
  if(!active())return;player.setLevel(value);panel.querySelector('#volumeTestLevel').value=value;panel.querySelector('#volumeTestValue').textContent=value+'%';
  if(save)try{storage.setItem(VOLUME_TEST_KEY,JSON.stringify({version:1,level:value}));}catch{status('The test level works, but device storage could not save it.');}
 }
 async function play(){
  if(!active())return;const current=token;
  started=true;beforePreview();
  try{
   if(media.ended)media.currentTime=0;
   const starting=player.play();
   try{if('mediaSession'in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:'Afterlight volume test',artist:title,album:'Experimental app volume'});}catch{}
   await starting;
  }catch(error){if(current===token)status(error?.message||'Audio processing could not start. Reopen the test and tap Play.');}
 }
 panel.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.id==='volumeTestBack'){settingsPanel();return;}
  if(!active())return;
  if(button.dataset.testLevel){setLevel(Number(button.dataset.testLevel));return;}
  if(button.id==='volumeTestPlay'){if(media.paused)play();else player.pause();}
  if(button.id==='volumeTestRestart'){media.currentTime=0;sync();}
 });
 panel.addEventListener('input',e=>{if(e.target.id==='volumeTestLevel')setLevel(Number(e.target.value));});
 panel.addEventListener('change',e=>{if(e.target.id==='volumeTestLevel')setLevel(Number(e.target.value));});
 panel.addEventListener('close',stop);
 return {open,stop,get active(){return active()&&started;},remote(action,d={}){if(!active()||!started)return;if(action==='play')play();if(action==='pause')player.pause();if(action==='seekbackward')media.currentTime=Math.max(0,media.currentTime-(d.seekOffset||15));if(action==='seekforward'&&Number.isFinite(media.duration))media.currentTime=Math.min(media.duration,media.currentTime+(d.seekOffset||30));if(action==='seekto'&&Number.isFinite(d.seekTime)&&Number.isFinite(media.duration))media.currentTime=Math.max(0,Math.min(media.duration,d.seekTime));}};
}

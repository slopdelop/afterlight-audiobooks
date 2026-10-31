import {createPositionTracker,restoreProgress,persistProgress} from '../progress.js';
import {createSleepTimer} from '../sleep.js';
import {loadAudioAt,requestNativePlay,createPreparedSource} from '../playback.js';
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import * as core from '../core.js';
class FakeAudio extends EventTarget{constructor(){super();this.actual=0;this.requested=0;this.duration=1190.86;this.readyState=0;this.paused=true;this.seeking=false;}get currentTime(){return this.actual;}set currentTime(p){this.requested=p;this.seeking=true;}load(){this.actual=0;this.readyState=0;this.seeking=false;}pause(){this.paused=true;}metadata(){this.readyState=1;this.dispatchEvent(new Event('loadedmetadata'));}settle(){this.actual=this.requested;this.seeking=false;this.readyState=4;this.dispatchEvent(new Event('seeked'));}}
function harness(extra={}){const audio=new FakeAudio(),stored=new Map(),elements=new Map();const element=id=>{if(id==='audio')return audio;if(!elements.has(id))elements.set(id,{style:{},classList:{add(){},remove(){}},setAttribute(){},querySelector(){return {dataset:{}};}});return elements.get(id);};const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').split('function openPanel')[0].replace(/^import .*;\r?\n/gm,'');const context={...core,createSleepTimer,createPositionTracker,restoreProgress,persistProgress,loadAudioAt,requestNativePlay,createPreparedSource,getAudio:async()=>null,location:{href:'https://example.test/afterlight/'},...extra,document:{getElementById:element},navigator:{},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},paintIcons(){},icon(){return "";},renderReaderControls(){},URL,setTimeout,clearTimeout,AbortController,DOMException,console};vm.runInNewContext(source+`\nbook={id:'b'};chapter={id:'c',duration:1190.86};state.positions.c={position:600,updatedAt:1};globalThis.h={setSource,checkpoint,position,openBook,prepareSleep,sleep,get saved(){return state.positions.c.position;},get ready(){return ready;}};`,context);return {audio,h:context.h,context};}
test('metadata before the restore seek cannot overwrite the saved listening place with zero',async()=>{const {audio,h}=harness();const loading=h.setSource('chapter.mp3',600);audio.metadata();h.checkpoint(true);assert.equal(h.saved,600);assert.equal(h.ready,false);assert.equal(h.position(),600);audio.settle();await loading;h.checkpoint(true);assert.equal(h.saved,600);assert.equal(h.ready,true);});

test('a failed restore keeps the saved time and can be retried without starting at zero',async()=>{const {audio,h}=harness();const loading=h.setSource('chapter.mp3',600);const rejected=assert.rejects(loading,/saved place is kept/);audio.metadata();audio.dispatchEvent(new Event('error'));await rejected;h.checkpoint(true);assert.equal(h.saved,600);assert.equal(h.position(),600);assert.equal(h.ready,false);const retry=h.setSource('chapter.mp3',600);audio.metadata();audio.settle();await retry;assert.equal(h.position(),600);});
test('a seek rejected at metadata is retried when the audio data arrives',async()=>{const audio=new FakeAudio();let rejectSeek=true;Object.defineProperty(audio,'currentTime',{get:()=>audio.actual,set:p=>{if(rejectSeek)throw Error('Not seekable yet');audio.requested=p;audio.seeking=true;}});let done=false;const pending=loadAudioAt(audio,'chapter.mp3',600,{duration:1190.86}).then(()=>done=true);audio.metadata();assert.equal(done,false);rejectSeek=false;audio.readyState=4;audio.dispatchEvent(new Event('canplay'));assert.equal(audio.requested,600);audio.settle();await pending;assert.equal(audio.actual,600);});
test('replacing a loading source cannot let its stale completion reset the new source',async()=>{const {audio,h}=harness();const old=h.setSource('old.mp3',600);audio.metadata();const current=h.setSource('new.mp3',900);audio.metadata();h.checkpoint(true);assert.equal(h.saved,600);assert.equal(h.position(),900);audio.settle();await Promise.all([old,current]);h.checkpoint(true);assert.equal(h.saved,900);assert.equal(h.ready,true);});
test('restore timeout fails safely rather than claiming the audio is ready at zero',async()=>{const audio=new FakeAudio();await assert.rejects(loadAudioAt(audio,'slow.mp3',600,{duration:1190.86,timeoutMs:5}),/saved place/);assert.equal(audio.actual,0);});

test('sleep expiry saves before iOS discards the media clock, and later checkpoints keep that place',async()=>{
 const {audio,h}=harness({createSleepTimer:(audio,options)=>createSleepTimer(audio,{...options,schedule:()=>1,cancel:()=>{}})});
 const loading=h.setSource('chapter.mp3',1100);audio.metadata();audio.settle();await loading;
 audio.paused=false;audio.dispatchEvent(new Event('play'));h.prepareSleep(60);
 audio.pause=()=>{audio.paused=true;audio.actual=0;audio.readyState=0;};
 audio.actual=1160;audio.dispatchEvent(new Event('timeupdate'));
 assert.equal(h.saved,1160);h.checkpoint(true);assert.equal(h.saved,1160);h.sleep.destroy();
});

test('remote resume reloads the native pipeline and requests Play synchronously, then restores the saved seek',async()=>{
 const {audio,h,context}=harness();const initial=h.setSource('chapter.mp3',600);audio.metadata();audio.settle();await initial;
 let calls=0;audio.play=()=>{calls++;audio.paused=false;return Promise.resolve();};
 vm.runInNewContext('globalThis.remoteResume=()=>playAudio(false,{remote:true});',context);
 const resumed=context.remoteResume();assert.equal(calls,1,'native Play must precede any await');assert.equal(h.position(),600);h.checkpoint(true);assert.equal(h.saved,600);
 audio.metadata();audio.settle();await resumed;assert.equal(audio.actual,600);assert.equal(h.ready,true);
});

test('a genuine full-chapter end records completion even if iOS resets currentTime before the ended callback',async()=>{
 const {audio,h,context}=harness();const loading=h.setSource('chapter.mp3',1100);audio.metadata();audio.settle();await loading;
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),a=source.indexOf("audio.addEventListener('ended',async()=>"),b=source.indexOf('\ndocument.querySelector',a);
 vm.runInNewContext("book={id:'b',chapters:[chapter]};sourceHasPlayed=true;renderLibrary=()=>{};playingUI=()=>{};",context);
 vm.runInNewContext(source.slice(a,b),context);audio.actual=0;audio.ended=true;audio.paused=true;audio.dispatchEvent(new Event('ended'));await Promise.resolve();
 assert.equal(h.saved,1190.86);assert.equal(vm.runInNewContext('state.positions.c.completed',context),true);
});


test('opening a book pauses any current playback and requests selection without autoplay',async()=>{const {audio,h,context}=harness();vm.runInNewContext("globalThis.openCalls=[];choose=async(...args)=>openCalls.push(args);",context);audio.paused=false;await h.openBook('b');assert.equal(audio.paused,true);assert.equal(context.openCalls.length,1);assert.equal(context.openCalls[0][2],false);});
test('setting an app sleep timer does not call pause, load or change currentTime',()=>{const {audio,h}=harness({createSleepTimer:(audio,options)=>createSleepTimer(audio,{...options,schedule:()=>1,cancel:()=>{}})});audio.paused=false;audio.actual=600;let pauses=0,loads=0;audio.pause=()=>pauses++;audio.load=()=>loads++;h.prepareSleep(1500);assert.equal(pauses,0);assert.equal(loads,0);assert.equal(audio.actual,600);assert.equal(h.sleep.remaining,1500);h.sleep.destroy();});
test('a chapter end continues an active minute timer even if ordinary auto-next is disabled',async()=>{const {audio,h,context}=harness({createSleepTimer:(audio,options)=>createSleepTimer(audio,{...options,schedule:()=>1,cancel:()=>{}})});const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),a=source.indexOf("audio.addEventListener('ended',async()=>"),b=source.indexOf("\ndocument.querySelector",a);vm.runInNewContext("book={id:'b',chapters:[chapter,{id:'next',duration:900}]};ready=true;pendingSeek=null;sourceHasPlayed=true;state.autoNext=false;renderLibrary=()=>{};playingUI=()=>{};globalThis.nextCalls=[];choose=async(...args)=>nextCalls.push(args);",context);vm.runInNewContext(source.slice(a,b),context);audio.paused=false;audio.actual=1100;h.prepareSleep(300);audio.actual=1190.86;audio.paused=true;audio.dispatchEvent(new Event('ended'));await Promise.resolve();assert.equal(context.nextCalls.length,1);assert.equal(context.nextCalls[0][1],'next');assert.equal(context.nextCalls[0][2],true);assert.ok(Math.abs(h.sleep.remaining-209.14)<.01);h.sleep.destroy();});

const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function transitionHarness(extra={}){
 const fixture=harness({createSleepTimer:(audio,options)=>createSleepTimer(audio,{...options,schedule:()=>1,cancel:()=>{}}),...extra});
 const {audio,h,context}=fixture;
 const loading=h.setSource('current.mp3',1100);audio.metadata();audio.settle();await loading;
 vm.runInNewContext(`
  globalThis.next={id:'next',src:'audio/next.mp3',number:7,duration:900};
  book={id:'b',chapters:[chapter,next]};books=[book];state.autoNext=true;state.smartResume=false;state.speed=1.25;
  renderPlayer=()=>{};renderLibrary=()=>{};renderProgress=()=>{};playingUI=()=>{};showView=()=>{};media=()=>{};
  sourceHasPlayed=true;
 `,context);
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),a=source.indexOf("audio.addEventListener('ended',async()=>"),b=source.indexOf('\ndocument.querySelector',a);
 vm.runInNewContext(source.slice(a,b),context);
 const calls=[];audio.play=()=>{calls.push({src:audio.src,rate:audio.playbackRate});audio.paused=false;audio.ended=false;audio.dispatchEvent(new Event('play'));return Promise.resolve();};
 return {...fixture,calls,end(){audio.actual=1190.86;audio.ended=true;audio.paused=true;audio.dispatchEvent(new Event('ended'));}};
}

test('auto-next requests native playback in the ended callback even when storage and metadata are stalled',async()=>{
 const {audio,h,context,calls,end}=await transitionHarness({getAudio:()=>new Promise(()=>{})});
 vm.runInNewContext('prepareNextSource();',context);end();
 assert.equal(calls.length,1,'no storage or metadata await may precede native Play');
 assert.equal(calls[0].src,'https://example.test/afterlight/audio/next.mp3');assert.equal(calls[0].rate,1.25);
 assert.equal(vm.runInNewContext('state.positions.c.completed',context),true);assert.equal(h.ready,false);
 audio.duration=900;audio.metadata();await tick();assert.equal(h.ready,true);assert.equal(calls.length,1,'metadata must not start playback a second time');
});

test('a prepared imported chapter advances offline immediately and preserves its saved seek and the minute timer',async()=>{
 const {audio,h,context,calls,end}=await transitionHarness({getAudio:async()=>new Blob(['silent fake data'])});
 vm.runInNewContext("next.src='local:next';state.positions.next={position:120,updatedAt:1};state.autoNext=false;state.speed=1;",context);
 await vm.runInNewContext('nextSource.prepare(next)',context);
 audio.paused=false;h.prepareSleep(300);end();
 assert.equal(calls.length,1);assert.match(calls[0].src,/^blob:/);assert.equal(h.position(),120);
 assert.ok(Math.abs(h.sleep.remaining-209.14)<.01);assert.equal(vm.runInNewContext('state.positions.c.completed',context),true);
 audio.duration=900;audio.metadata();h.checkpoint(true);assert.equal(vm.runInNewContext('state.positions.next.position',context),120);
 audio.settle();await tick();assert.equal(h.ready,true);assert.equal(audio.actual,120);
 audio.actual=150;audio.dispatchEvent(new Event('timeupdate'));assert.ok(Math.abs(h.sleep.remaining-179.14)<.01);
 audio.actual=330;audio.dispatchEvent(new Event('timeupdate'));assert.equal(audio.paused,true);assert.equal(h.sleep.expired,true);
 URL.revokeObjectURL(audio.src);h.sleep.destroy();
});

for(const timer of ['end','expired','disabled'])test(`auto-next stays stopped for ${timer} playback`,async()=>{
 const {audio,h,context,calls,end}=await transitionHarness();
 if(timer==='disabled')vm.runInNewContext('state.autoNext=false;',context);
 else{audio.paused=false;if(timer==='end')h.sleep.end();else h.prepareSleep(1);}
 end();await tick();assert.equal(calls.length,0);assert.equal(vm.runInNewContext('chapter.id',context),'c');assert.equal(vm.runInNewContext('state.positions.c.completed',context),true);
 h.sleep.destroy();
});

test('a rejected background play leaves completion and the next saved place intact for retry',async()=>{
 const {audio,h,context,end}=await transitionHarness();
 vm.runInNewContext('state.positions.next={position:120,updatedAt:1};',context);
 audio.play=()=>Promise.reject(Error('Background play blocked'));end();await tick();
 assert.equal(h.ready,false);assert.equal(vm.runInNewContext('state.positions.c.completed',context),true);assert.equal(vm.runInNewContext('state.positions.next.position',context),120);
 assert.equal(h.position(),120);
});

test('manually opening a chapter with an already prepared source still stays paused',async()=>{
 const {audio,h,context,calls}=await transitionHarness();
 await vm.runInNewContext('nextSource.prepare(next)',context);
 const opening=vm.runInNewContext("choose('b','next',false)",context);
 assert.equal(calls.length,0);audio.duration=900;audio.metadata();await opening;
 assert.equal(h.ready,true);assert.equal(audio.paused,true);assert.equal(calls.length,0);
});

test('prepared source ownership transfers to playback; replacing or cancelling preparations releases unused URLs',async()=>{
 const released=[],pending=new Map();
 const queue=createPreparedSource(c=>new Promise(resolve=>pending.set(c.id,resolve)),{release:src=>released.push(src)});
 const first={id:'a',src:'local:a'},second={id:'b',src:'local:b'};
 const a=queue.prepare(first);await tick();const b=queue.prepare(second);await tick();
 pending.get('a')('blob:stale');await a;assert.deepEqual(released,['blob:stale']);
 pending.get('b')('blob:used');await b;assert.equal(queue.take({...second,src:'local:changed'}),null);
 assert.equal(queue.take(second),'blob:used');queue.clear();assert.deepEqual(released,['blob:stale']);
 const c=queue.prepare(first);await tick();pending.get('a')('blob:unused');await c;queue.clear();assert.deepEqual(released,['blob:stale','blob:unused']);
 const failure=createPreparedSource(async()=>{throw Error('Storage unavailable');});await failure.prepare(first);assert.equal(failure.take(first),null);
});

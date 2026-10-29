import test from 'node:test';
import assert from 'node:assert/strict';
import {createVolumePlayer,readTestLevel,VOLUME_TEST_KEY} from '../volume-test.js';

function fixture(){
 const calls=[],media=new class extends EventTarget{
  paused=true;currentTime=0;
  play(){calls.push('play');this.paused=false;return Promise.resolve();}
  pause(){calls.push('pause');this.paused=true;}
  removeAttribute(name){calls.push('remove '+name);}
  load(){calls.push('load');}
 }();
 Object.defineProperty(media,'volume',{set(){throw Error('Native volume must not be changed');}});
 const gain={gain:{value:1,setTargetAtTime(v,time,smoothing){calls.push(['level',v,time,smoothing]);}},connect(dest){calls.push(['output',dest]);},disconnect(){calls.push('disconnect gain');}};
 const context={state:'suspended',currentTime:4,destination:{},createMediaElementSource(m){assert.equal(m,media);calls.push('source');return {connect(n){assert.equal(n,gain);calls.push('route');},disconnect(){calls.push('disconnect source');}};},createGain:()=>gain,resume(){calls.push('resume');this.state='running';return Promise.resolve();},close(){calls.push('close');this.state='closed';return Promise.resolve();}};
 const player=createVolumePlayer(media,{createContext:()=>context,navigatorLike:{}});
 return {calls,media,gain,context,player};
}

test('volume preferences reject invalid storage and remain separate from audiobook progress',()=>{
 const values=[null,'broken','{}','{"level":-1}','{"level":101}','{"level":"25"}'];
 for(const value of values)assert.equal(readTestLevel({getItem:key=>{assert.equal(key,VOLUME_TEST_KEY);return value;}}),50);
 assert.equal(readTestLevel({getItem:()=>'{"version":1,"level":25}'}),25);
 assert.equal(readTestLevel({getItem:()=>'{"version":1,"level":0}'}),0);
 assert.equal(readTestLevel({getItem(){throw Error('Storage denied');}}),50);
});

test('the dedicated player applies the preferred gain before playback and ramps live changes',async()=>{
 const {calls,player,gain,context}=fixture();player.setLevel(25);const start=player.play();
 assert.equal(gain.gain.value,.25);assert.ok(calls.includes('resume'));assert.ok(calls.includes('play'),'Play must be requested before awaiting context resume');await start;
 player.setLevel(0);assert.deepEqual(calls.at(-1),['level',0,4,.03]);player.setLevel(100);assert.deepEqual(calls.at(-1),['level',1,4,.03]);
 player.pause();context.state='suspended';await player.play();assert.equal(calls.filter(c=>c==='source').length,1,'resume reuses the existing audio graph');
 assert.equal(calls.filter(c=>c==='resume').length,2);for(const n of [-1,101,NaN])assert.throws(()=>player.setLevel(n));player.stop();
});

test('leaving the experiment stops its media, disconnects output and closes processing',()=>{
 const {calls,player,media}=fixture();player.play();player.stop();assert.equal(media.paused,true);
 for(const value of ['disconnect source','disconnect gain','close','remove src','load'])assert.ok(calls.includes(value));
 const count=calls.length;player.stop();assert.equal(calls.length,count);
});

test('unsupported processing fails closed instead of playing an unattenuated fallback',async()=>{
 const {media,calls}=fixture();const player=createVolumePlayer(media,{createContext(){throw Error('Web Audio unavailable');},navigatorLike:{}});
 await assert.rejects(player.play(),/Web Audio unavailable/);assert.equal(calls.includes('play'),false);assert.equal(media.paused,true);
});

test('a rejected processing resume pauses the test rather than leaving a native player running',async()=>{
 const {media,context}=fixture();context.resume=()=>Promise.reject(Error('Suspended by iOS'));
 const player=createVolumePlayer(media,{createContext:()=>context,navigatorLike:{}});
 await assert.rejects(player.play(),/Suspended by iOS/);assert.equal(media.paused,true);player.stop();
});

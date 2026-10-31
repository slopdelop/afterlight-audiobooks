import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {requestPortraitLock,createViewportGuard} from '../viewport.js';

test('portrait lock requests the supported native API and safely handles absent, rejected and throwing APIs',async()=>{
 const calls=[],screen={orientation:{lock(value){calls.push(value);return Promise.resolve();}}};
 assert.equal(await requestPortraitLock(screen),true);assert.deepEqual(calls,['portrait']);
 assert.equal(await requestPortraitLock({}),false);
 assert.equal(await requestPortraitLock({orientation:{lock:()=>Promise.reject(Error('Not supported'))}}),false);
 assert.equal(await requestPortraitLock({orientation:{lock(){throw Error('Full screen required');}}}),false);
 const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.orientation,'portrait');
});

function fixture(){
 const events=new Map(),orientationEvents=new Map();let locks=0,prevented=0,paged=true;
 const documentLike={hidden:false,body:{dataset:{view:'reader'},classList:{contains:()=>paged}},addEventListener(type,fn,options){events.set(type,{fn,options});},removeEventListener(type){events.delete(type);}};
 const windowLike={matchMedia:()=>({matches:true}),screen:{orientation:{lock(){locks++;return Promise.resolve();},addEventListener(type,fn){orientationEvents.set(type,fn);},removeEventListener(type){orientationEvents.delete(type);}}}};
 const guard=createViewportGuard({documentLike,windowLike});
 const pan=(extra={})=>events.get('touchmove').fn({touches:[{}],target:{closest:()=>null},cancelable:true,preventDefault(){prevented++;},...extra});
 return {guard,events,orientationEvents,documentLike,windowLike,pan,setPaged:value=>paged=value,locks:()=>locks,prevented:()=>prevented};
}

test('fixed pages block outer pans without blocking scroll mode, dialogs, pinch zoom or other app screens',()=>{
 const f=fixture();assert.equal(f.events.get('touchmove').options.passive,false);f.pan();assert.equal(f.prevented(),1);
 f.pan({touches:[{},{}]});f.pan({target:{closest:()=>({})}});f.pan({cancelable:false});assert.equal(f.prevented(),1);
 f.setPaged(false);f.pan();assert.equal(f.prevented(),1);f.setPaged(true);
 for(const view of ['player','library']){f.documentLike.body.dataset.view=view;f.pan();}assert.equal(f.prevented(),1);f.guard.destroy();assert.equal(f.events.size,0);assert.equal(f.orientationEvents.size,0);
});

test('portrait requests retry on phone gestures and return to foreground, but not while hidden or on desktop',()=>{
 const f=fixture();assert.equal(f.locks(),1);f.events.get('pointerup').fn();assert.equal(f.locks(),2);
 f.documentLike.hidden=true;f.events.get('visibilitychange').fn();assert.equal(f.locks(),2);
 f.documentLike.hidden=false;f.events.get('visibilitychange').fn();assert.equal(f.locks(),3);
 f.windowLike.matchMedia=()=>({matches:false});f.events.get('pointerup').fn();assert.equal(f.locks(),3);f.guard.destroy();
});

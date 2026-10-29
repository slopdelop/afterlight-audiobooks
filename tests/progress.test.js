import test from 'node:test';
import assert from 'node:assert/strict';
import {STATE_KEY,initialState} from '../core.js';
import {createPositionTracker,restoreProgress,persistProgress} from '../progress.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
const record=(position,updatedAt,completed=false)=>({position,updatedAt,completed,finishedAt:completed?updatedAt:null});

test('a discarded iOS media clock cannot rewind progress; intentional seeks can',()=>{
 const tracker=createPositionTracker();tracker.reset(1400);
 const audio={currentTime:1400,readyState:4,seeking:false};
 assert.equal(tracker.sample(audio,1508),1400);
 audio.currentTime=0;audio.readyState=0;assert.equal(tracker.sample(audio,1508),1400);
 audio.readyState=4;audio.currentTime=.1;assert.equal(tracker.sample(audio,1508),1400);
 audio.currentTime=1402;assert.equal(tracker.sample(audio,1508),1402);
 tracker.reset(1200);audio.currentTime=1200;assert.equal(tracker.sample(audio,1508),1200);
 tracker.reset(0);audio.currentTime=0;assert.equal(tracker.sample(audio,1508),0);
});

test('an idle older tab cannot erase newer chapter progress or chapter completion',()=>{
 const disk=storage(),old=initialState();old.positions.six=record(300,100);old.last={bookId:'b',chapterId:'six'};persistProgress(disk,old);
 const active=restoreProgress(disk);active.positions.six=record(1190,200,true);active.positions.seven=record(1400,300);active.last={bookId:'b',chapterId:'seven'};persistProgress(disk,active);
 old.speed=1.25;persistProgress(disk,old);
 const result=restoreProgress(disk);assert.equal(result.positions.seven.position,1400);assert.equal(result.positions.six.completed,true);assert.equal(result.last.chapterId,'seven');
 assert.equal(old.positions.six.position,300,'idle tab retains its unchanged checkpoint baseline');
});

test('the separate journal recovers progress when the main state is malformed or a write is interrupted',()=>{
 const disk=storage(),state=initialState();state.positions.seven=record(1420,500);state.last={bookId:'b',chapterId:'seven'};
 const original=disk.setItem;disk.setItem=(k,v)=>{if(k===STATE_KEY)throw Error('Interrupted');original(k,v);};
 assert.throws(()=>persistProgress(disk,state));disk.setItem=original;disk.setItem(STATE_KEY,'broken');
 const restored=restoreProgress(disk);assert.equal(restored.positions.seven.position,1420);assert.equal(restored.last.chapterId,'seven');
});

test('intentional newer rewinds and explicit backup restoration are respected',()=>{
 const disk=storage(),state=initialState();state.positions.seven=record(1508,300,true);persistProgress(disk,state);
 state.positions.seven=record(1000,400);persistProgress(disk,state);
 assert.equal(restoreProgress(disk).positions.seven.position,1000);assert.equal(restoreProgress(disk).positions.seven.finishedAt,300);
 const backup=initialState();backup.positions.seven=record(600,50);persistProgress(disk,backup,{replace:true});
 assert.equal(restoreProgress(disk).positions.seven.position,600);
});

test('an idle tab cannot replace a newer selection of a chapter not started yet',()=>{
 const disk=storage(),old=initialState();old.positions.six=record(300,100);old.last={bookId:'b',chapterId:'six',updatedAt:100};persistProgress(disk,old);
 const selected=restoreProgress(disk);selected.last={bookId:'b',chapterId:'eight',updatedAt:300};persistProgress(disk,selected,{selection:true});
 persistProgress(disk,old);assert.equal(restoreProgress(disk).last.chapterId,'eight');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {clamp} from '../core.js';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function readerHarness(){
 const elements=new Map(),calls={saved:[],seek:[],play:0,view:[]};
 const $=id=>{if(!elements.has(id))elements.set(id,{events:{},addEventListener(type,fn){this.events[type]=fn;},querySelector(){return {focus(){}};}});return elements.get(id);};
 const context={$,clamp,calls,readerOwnsPosition:false,readerIndex:0,readerPosition:0,view:'reader',ready:true,chapter:{id:'c',duration:300},audio:{paused:true},state:{mode:'read'},readerData:{chapterId:'c',paragraphs:[{start:0},{start:40},{start:85}]},document:{addEventListener(){}},openReader(){},openPanel(){},highlightReader(){},save(){},position:()=>0,showView:view=>calls.view.push(view),seek:async p=>calls.seek.push(p),playAudio:async()=>calls.play++,checkpoint(){calls.saved.push({position:context.readerPosition,readerOwnsPosition:context.readerOwnsPosition});},setReaderLocation(i,p){context.readerIndex=i;context.readerPosition=p;}};
 const resume=source.slice(source.indexOf('async function resumeReading('),source.indexOf('function readerIntent('));
 const handlers=source.slice(source.indexOf("$('openReader').onclick="),source.indexOf("document.addEventListener('click',e=>{const selected=e.target.closest('[data-reader-size]')"));
 vm.runInNewContext(resume+handlers,context);
 return {$,calls,context};
}
test('selecting prose saves the paragraph without playing or leaving reading mode',()=>{
 const {$,calls,context}=readerHarness();
 $('readerText').events.click({target:{closest:()=>({dataset:{readerParagraph:'2'}})}});
 assert.equal(context.readerPosition,85);assert.equal(context.view,'reader');assert.equal(calls.play,0);
 assert.deepEqual(calls.saved,[{position:85,readerOwnsPosition:true}]);assert.deepEqual(calls.view,[]);
});
test('Listen transfers the selected reading place to the player and remains paused',async()=>{
 const {$,calls,context}=readerHarness();context.readerPosition=85;context.readerOwnsPosition=true;
 await $('readerListen').onclick();
 assert.deepEqual(calls.seek,[85]);assert.deepEqual(calls.view,['player']);assert.equal(calls.play,0);assert.equal(context.state.mode,'listen');
});
test('keyboard paragraph selection saves and clamps at the last paragraph without playback',()=>{
 const {$,calls,context}=readerHarness();
 for(let i=0;i<4;i++)$('readerText').events.keydown({key:'ArrowDown',preventDefault(){},stopPropagation(){}});
 assert.equal(context.readerIndex,2);assert.equal(context.readerPosition,85);assert.equal(calls.play,0);assert.equal(calls.saved.length,4);
});
test('lock-screen chapter handlers work without transport buttons in the document',async()=>{
 const handlers={},calls=[],context={book:{id:'b',chapters:[{id:'first'},{id:'second'}]},chapter:{id:'first'},audio:{paused:true,pause(){}},navigator:{mediaSession:{setActionHandler:(name,fn)=>handlers[name]=fn}},choose:async(...args)=>calls.push(args),playAudio(){},seek(){},position:()=>0};
 const change=source.slice(source.indexOf('function changeChapter('),source.indexOf('function morePanel('));
 const remote=source.slice(source.indexOf("if('mediaSession'in navigator){for"),source.indexOf("async function init()"));
 vm.runInNewContext(change+remote,context);await handlers.nexttrack();
 assert.equal(calls[0][1],'second');assert.equal(calls[0][2],false);
 context.chapter={id:'second'};await handlers.previoustrack();assert.equal(calls[1][1],'first');
});

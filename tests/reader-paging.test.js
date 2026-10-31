import test from 'node:test';
import assert from 'node:assert/strict';
import {createReaderPager} from '../reader.js';
import {initialState,restoreState} from '../core.js';

function fixture(){
 const events={},changes=[],turns=[];
 const viewport={clientWidth:300,clientHeight:600,scrollLeft:0,scrollTo({left}){this.scrollLeft=left;},getBoundingClientRect(){return {left:20,right:20+this.clientWidth};},addEventListener(type,fn){events[type]=fn;}};
 // A long paragraph spans the first two columns; no text is cloned or omitted.
 const fragments=[[0],[0,1],[1],[2]],blocks=fragments.map(pages=>({getClientRects:()=>pages.map(page=>({left:20+page*(viewport.clientWidth+32)-viewport.scrollLeft,right:20+page*(viewport.clientWidth+32)+viewport.clientWidth-viewport.scrollLeft,width:viewport.clientWidth}))}));
 const content={style:{setProperty(){}},get scrollWidth(){return 3*(viewport.clientWidth+32)-32;},querySelectorAll:()=>blocks};
 const pager=createReaderPager({viewport,content,onChange:c=>changes.push(c),onTurn:i=>turns.push(i)});
 pager.setEnabled(true);pager.layout(0);return {pager,viewport,events,changes,turns,content};
}

test('reading style defaults to scrolling and restores only supported styles without changing progress',()=>{
 assert.equal(initialState().readerLayout,'scroll');
 for(const value of [null,'invalid',true,{}])assert.equal(restoreState({version:1,readerLayout:value}).readerLayout,'scroll');
 const state=restoreState({version:1,readerLayout:'pages',positions:{c:{position:85,updatedAt:1}},reading:{c:{paragraphId:'p3',position:85}}});
 const restored=restoreState(JSON.parse(JSON.stringify(state)));assert.equal(restored.readerLayout,'pages');assert.equal(restored.positions.c.position,85);assert.equal(restored.reading.c.paragraphId,'p3');
});

test('turning pages saves the first visible paragraph including a paragraph continued from the previous page',()=>{
 const {pager,viewport,changes,turns}=fixture();assert.deepEqual(changes.at(-1),{page:0,count:3});
 pager.turn(-1);assert.equal(turns.length,0);pager.turn(1);assert.equal(viewport.scrollLeft,332);assert.deepEqual(turns,[1]);
 pager.turn(1);assert.deepEqual(changes.at(-1),{page:2,count:3});assert.deepEqual(turns,[1,3]);
 pager.turn(1);assert.deepEqual(turns,[1,3]);pager.turn(-1);assert.equal(turns.at(-1),1);
});

test('restoring, resizing and audio-follow navigation keep the paragraph anchor without writing reading progress',()=>{
 const {pager,viewport,changes,turns}=fixture();pager.layout(3);assert.equal(changes.at(-1).page,2);
 viewport.clientWidth=400;pager.layout(3);assert.equal(viewport.scrollLeft,864);assert.equal(changes.at(-1).page,2);
 pager.showParagraph(2);assert.equal(changes.at(-1).page,1);assert.equal(turns.length,0);
 pager.setEnabled(false);assert.equal(viewport.scrollLeft,0);pager.turn(1);assert.equal(turns.length,0);
});

test('swipes turn one page and suppress paragraph-click side effects; vertical gestures and multi-touch do not turn',()=>{
 const {events,changes}=fixture();const touch=(x,y)=>({clientX:x,clientY:y});
 events.touchstart({touches:[touch(260,100)]});events.touchend({changedTouches:[touch(100,110)]});assert.equal(changes.at(-1).page,1);
 let prevented=0,stopped=0;events.click({preventDefault(){prevented++;},stopPropagation(){stopped++;}});assert.equal(prevented,1);assert.equal(stopped,1);
 events.touchstart({touches:[touch(260,100)]});events.touchend({changedTouches:[touch(250,400)]});assert.equal(changes.at(-1).page,1);
 events.touchstart({touches:[touch(260,100),touch(250,100)]});events.touchend({changedTouches:[touch(100,100)]});assert.equal(changes.at(-1).page,1);
 events.touchstart({touches:[touch(260,100)]});events.touchcancel();events.touchend({changedTouches:[touch(100,100)]});assert.equal(changes.at(-1).page,1);
});

test('keyboard page navigation works in both directions and leaves modified shortcuts alone',()=>{
 const {events,changes}=fixture();let prevented=0;
 const key=(key,extra={})=>events.keydown({key,preventDefault(){prevented++;},stopPropagation(){},...extra});
 key('PageDown');assert.equal(changes.at(-1).page,1);key('ArrowRight');assert.equal(changes.at(-1).page,2);
 key(' ',{shiftKey:true});assert.equal(changes.at(-1).page,1);key('PageUp');assert.equal(changes.at(-1).page,0);
 key('ArrowRight',{ctrlKey:true});assert.equal(changes.at(-1).page,0);assert.equal(prevented,4);
});

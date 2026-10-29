import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeRoundRatings,restoreFavourites,formatRatings,FAVOURITES_KEY} from '../voice-review.js';
import {reviewMarkup} from '../casting-view.js';
const voices=[{id:'h1',role:'han',name:'Candidate A',description:'hidden method',seconds:35,text:'Han: Text',src:'a.mp3'},{id:'h2',role:'han',name:'Candidate B',description:'other method',seconds:35},{id:'l1',role:'leia',name:'Candidate A',description:'third method',seconds:35}];
test('editing a round preserves old ratings while clearing the selected current rating',()=>{
 assert.deepEqual(mergeRoundRatings({old_han:5,h1:4,h2:3},{h2:2},voices),{old_han:5,h2:2});
});
test('favourites select Han and Leia independently and reject unknown or wrong-role voices',()=>{
 assert.deepEqual(restoreFavourites({han:'h2',leia:'l1'},voices),{han:'h2',leia:'l1'});
 assert.deepEqual(restoreFavourites({han:'l1',leia:'unknown'},voices),{});
 assert.notEqual(FAVOURITES_KEY,'afterlight-v1');
});
test('export includes independent favourites and method context',()=>{
 const text=formatRatings({round:'Original casting',voices,favourites:{han:'h2',leia:'l1'}},{h1:4});
 assert.match(text,/Favourite han: Candidate B \[h2\]/);assert.match(text,/Favourite leia: Candidate A \[l1\]/);assert.match(text,/hidden method/);
});
test('round presents neutral labels, expandable methods and script, replay and previous auditions',()=>{
 const html=reviewMarkup({round:'Casting',voices,favourites:{han:'h1'}},{},'casting',s=>String(s).replaceAll('<','&lt;'));
 assert.match(html,/<details><summary>How this candidate was made<\/summary><p>hidden method/);
 assert.match(html,/Read the audition text/);assert.match(html,/Previous auditions/);assert.match(html,/Replay sample/);assert.doesNotMatch(html,/autoplay/);
 assert.equal((html.match(/data-review-favourite=/g)||[]).length,3);
 const previous=reviewMarkup({round:'Previous',voices},{},'previous',String);assert.doesNotMatch(previous,/data-review-favourite=/);
});
test('new casting keeps the previous round and uses the same scripts and narration for each character',()=>{
 const current=JSON.parse(fs.readFileSync(new URL('../assets/original-casting.json',import.meta.url),'utf8'));
 const old=JSON.parse(fs.readFileSync(new URL('../assets/voice-auditions.json',import.meta.url),'utf8'));
 assert.equal(current.voices.length,6);assert.equal(old.voices.length,8);
 for(const role of ['han','leia']){
  const candidates=current.voices.filter(v=>v.role===role);assert.equal(candidates.length,3);
  assert.equal(new Set(candidates.map(v=>v.text)).size,1);
  const narration=v=>JSON.stringify(v.timeline.filter(t=>t.kind==='narrator').map(t=>({part:t.part,text:t.text,sha:t.source_sha256})));
  assert.equal(new Set(candidates.map(narration)).size,1);
  for(const v of candidates){assert.ok(v.seconds>=28&&v.seconds<=48);assert.ok(fs.statSync(new URL('../'+v.src,import.meta.url)).size>10000);}
 }
});

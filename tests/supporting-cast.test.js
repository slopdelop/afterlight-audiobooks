import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {restoreFavourites,mergeFavourites,roundFavourites} from '../voice-review.js';
import {reviewMarkup} from '../casting-view.js';
const roles=['palpatine','amedda','wuher','duros','patron','officer','droid','admiral','greejatus','intelligence','sim'];
test('supporting round covers every remaining speaking role with two direct designs',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('../assets/supporting-cast.json',import.meta.url),'utf8'));
 assert.equal(c.voices.length,22);assert.deepEqual(Object.keys(c.characters).sort(),roles.toSorted());
 assert.equal(new Set(c.voices.map(v=>v.seed)).size,22);
 for(const role of roles){const v=c.voices.filter(v=>v.role===role);assert.equal(v.length,2);assert.equal(v[0].text,v[1].text);for(const voice of v){assert.equal(voice.method,'voice_design');assert.equal(voice.narrator,false);assert.equal(voice.generation.temperature,.9);assert.ok(fs.statSync(new URL('../'+voice.src,import.meta.url)).size>5000);}}
 const chosen=JSON.parse(fs.readFileSync(new URL('../assets/selected-character-voices.json',import.meta.url),'utf8'));
 assert.equal(chosen.voices.han.audition_id,'vd2_han_c_1');assert.equal(chosen.voices.leia.audition_id,'vd2_leia_a_1');assert.equal(chosen.narrator,'julian_vale');
});
test('favourites support arbitrary characters without losing the selected Han and Leia round',()=>{
 const voices=roles.map(role=>({id:role+'_1',role}));
 const picks={palpatine:'palpatine_1',sim:'sim_1',admiral:'admiral_1'};
 assert.deepEqual(restoreFavourites(picks,voices),picks);
 const previous={rounds:{design:{han:'vd2_han_c_1',leia:'vd2_leia_a_1'}}};
 const next=mergeFavourites(previous,'ensemble',picks);
 assert.deepEqual(roundFavourites(next,'ensemble',voices),picks);assert.deepEqual(next.rounds.design,previous.rounds.design);
 assert.deepEqual(restoreFavourites({palpatine:'sim_1',sim:'unknown'},voices),{});
});
test('all supporting characters and their notes render with a character selector',()=>{
 const catalog={round:'Supporting cast',characters:Object.fromEntries(roles.map(r=>[r,{name:r+' name'}])),voices:roles.map(r=>({role:r,id:r,name:'Candidate 1',description:'Interpretation',text:'Book dialogue',seconds:5}))};
 const html=reviewMarkup(catalog,{},'ensemble',String);
 for(const role of roles){assert.ok(html.includes(`data-casting-role="${role}"`));assert.ok(html.includes(role+' name'));}
 assert.match(html,/data-review-character/);assert.match(html,/data-review-round-select/);assert.doesNotMatch(html,/autoplay/);
});

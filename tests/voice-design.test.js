import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {roundFavourites,mergeFavourites} from '../voice-review.js';
test('new design favourites preserve legacy original-round choices',()=>{
 const original=[{id:'h',role:'han'},{id:'l',role:'leia'}],design=[{id:'dh',role:'han'},{id:'dl',role:'leia'}];
 const legacy={han:'h',leia:'l'};
 const saved=mergeFavourites(legacy,'design',{han:'dh',leia:'dl'});
 assert.deepEqual(roundFavourites(saved,'casting',original),legacy);
 assert.deepEqual(roundFavourites(saved,'design',design),{han:'dh',leia:'dl'});
 const changed=mergeFavourites(saved,'casting',{leia:'l'});
 assert.deepEqual(roundFavourites(changed,'design',design),{han:'dh',leia:'dl'});
 assert.deepEqual(roundFavourites(changed,'casting',original),{leia:'l'});
});
test('published direct samples contain only the correct characters dialogue and distinct design prompts',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../assets/voice-design.json',import.meta.url),'utf8'));
 assert.equal(catalog.voices.length,24);
 assert.equal(new Set(catalog.voices.map(v=>v.seed)).size,24);
 for(const role of ['han','leia']){
  const voices=catalog.voices.filter(v=>v.role===role);assert.equal(voices.length,12);
  assert.equal(new Set(voices.map(v=>v.text)).size,1);assert.equal(new Set(voices.map(v=>v.prompt)).size,4);
  for(const prompt of new Set(voices.map(v=>v.prompt))){const group=voices.filter(v=>v.prompt===prompt);assert.equal(group.length,3);assert.deepEqual(group.map(v=>v.sample_number),[1,2,3]);}
  for(const v of voices){assert.equal(v.generation.temperature,.9);assert.equal(v.generation.top_p,1);assert.equal(v.generation.do_sample,true);assert.equal(v.generation.subtalker_temperature,.9);}
  for(const v of voices){assert.equal(v.narrator,false);assert.equal(v.singleContinuousTake,true);assert.equal(v.method,'voice_design');assert.ok(v.model.endsWith('-VoiceDesign'));assert.ok(v.seconds>8&&v.seconds<45);assert.doesNotMatch(v.text,/Narrator:|leaned forward|hologram appeared/i);assert.ok(fs.statSync(new URL('../'+v.src,import.meta.url)).size>10000);}
 }
});
test('earlier VoiceDesign auditions and favourites remain available after sampling the new round',()=>{
 const old=JSON.parse(fs.readFileSync(new URL('../assets/voice-design-round1.json',import.meta.url),'utf8'));
 assert.equal(old.voices.length,6);
 const saved=mergeFavourites({rounds:{design:{han:'vd_han_b',leia:'vd_leia_c'}}},'design',{han:'vd2_han_a_1'});
 assert.deepEqual(roundFavourites(saved,'design1',old.voices),{han:'vd_han_b',leia:'vd_leia_c'});
 for(const v of old.voices)assert.ok(fs.existsSync(new URL('../'+v.src,import.meta.url)));
});

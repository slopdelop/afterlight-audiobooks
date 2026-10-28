import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {restoreRatings,formatRatings,writeRatingsToClipboard,RATINGS_KEY} from '../voice-review.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../assets/voice-auditions.json',import.meta.url),'utf8'));
test('published review list has two fresh continuous takes per character with audio files',()=>{
 assert.equal(catalog.voices.length,4);assert.equal(new Set(catalog.voices.map(v=>v.id)).size,4);
 for(const role of ['han','leia'])assert.equal(catalog.voices.filter(v=>v.role===role).length,2);
 for(const voice of catalog.voices){assert.ok(voice.seconds>5);assert.equal(voice.singleContinuousTake,true);assert.ok(voice.src.startsWith('audio/voice-review/'));assert.ok(fs.statSync(new URL('../'+voice.src,import.meta.url)).size>10000);}
});
test('ratings restore only known voice IDs and integer stars from one to five',()=>{
 assert.deepEqual(restoreRatings(null,catalog.voices),{});
 assert.deepEqual(restoreRatings({version:1,ratings:{han_a:5,han_b:4,leia_c:5}},catalog.voices),{});
 assert.deepEqual(restoreRatings({version:1,ratings:{han_r2_icl:5,han_r2_embedding:0,han_bad:6,leia_r2_iclad:'4',leia_r2_icl:2.5,leia_r2_embedding:3,unknown:4}},catalog.voices),{han_r2_icl:5,leia_r2_embedding:3});
 const raw={version:1,ratings:{han_r2_icl:4,leia_r2_icl:5}};
 assert.deepEqual(restoreRatings(JSON.parse(JSON.stringify(raw)),catalog.voices),raw.ratings);
 assert.notEqual(RATINGS_KEY,'afterlight-v1');
});
test('clipboard export identifies every voice, the round, and unrated entries',()=>{
 const text=formatRatings(catalog,{han_r2_embedding:4,leia_r2_embedding:5});
 assert.ok(text.includes(catalog.round));assert.ok(text.includes('Han B [han_r2_embedding]: 4/5'));assert.ok(text.includes('Leia B [leia_r2_embedding]: 5/5'));assert.ok(text.includes('Han A [han_r2_icl]: Not rated'));
 for(const voice of catalog.voices)assert.ok(text.includes(`[${voice.id}]`));
});
test('clipboard request is issued synchronously during the tap, and failures reach fallback',async()=>{
 const text=formatRatings(catalog,{han_r2_icl:5});let copied=null;
 const pending=writeRatingsToClipboard(text,{writeText(value){copied=value;return Promise.resolve();}});
 assert.equal(copied,text);await pending;
 await assert.rejects(writeRatingsToClipboard(text,null),/unavailable/);
 await assert.rejects(writeRatingsToClipboard(text,{writeText:()=>Promise.reject(Error('Denied'))}),/Denied/);
});
test('denied clipboard access exposes selected, copyable text without losing ratings',async()=>{
 const source=fs.readFileSync(new URL('../voice-review.js',import.meta.url),'utf8');
 const copy=source.slice(source.indexOf('async function copy(){'),source.indexOf("panel.addEventListener('click'"));
 const manual={hidden:true},field={value:'',focus(){this.focused=true;},select(){this.selected=true;},setSelectionRange(start,end){this.range=[start,end];}};
 const statuses=[],context={catalog,ratings:{han_r2_icl:4,leia_r2_icl:5},formatRatings,writeRatingsToClipboard:()=>Promise.reject(Error('Denied')),panel:{querySelector:s=>s==='#manualRatings'?manual:field},setStatus:s=>statuses.push(s),toast:()=>assert.fail('Copy success must not be reported')};
 await vm.runInNewContext(copy+'copy();',context);
 assert.equal(manual.hidden,false);assert.equal(field.value,formatRatings(catalog,context.ratings));assert.equal(field.focused,true);assert.equal(field.selected,true);assert.deepEqual(field.range,[0,field.value.length]);assert.match(statuses[0],/Copy is unavailable/);
});

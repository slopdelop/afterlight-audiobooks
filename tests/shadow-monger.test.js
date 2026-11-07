import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nextChapter,bookResume,restoreState,completedProgress} from '../core.js';
import {validateTranscript,paragraphIndexAt} from '../reader.js';
import {mp3Frames,boundedMp3} from '../mp3.js';
import {archivedAudioPaths} from '../tools/build.mjs';

const id='shadow-monger-book-one';
const mediaCommit='10efb99ba0f45102d268424b2ece6c584b0b160a';
const mediaOrigin=`https://raw.githubusercontent.com/slopdelop/afterlight-audiobooks/${mediaCommit}/`;
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url));
const json=path=>JSON.parse(read(path).toString('utf8'));
const hash=data=>createHash('sha256').update(data).digest('hex');
const catalog=json('catalog.json');
const book=catalog.books.find(b=>b.id===id);

// Content tests become mandatory as soon as the new book is actually staged.
// An absent complete book is not advertised by a placeholder catalog entry.
test('Shadow Monger is complete and preserves prior catalog entries', {skip:!book},()=>{
 const manifest=json(`manuscript/${id}/production.json`);
 assert.equal(book.title,'The Shadow Monger');assert.equal(book.ongoing,false);
 assert.equal(book.series,'The Shadow Monger Saga');assert.equal(book.narrator,'Synthetic ensemble · Elliot Mercer narration');
 assert.deepEqual(book.chapters.map(c=>c.number),Array.from({length:25},(_,i)=>i+1));
 assert.deepEqual(book,manifest.book);
 assert.equal(book.cover,`assets/${id}.svg`);assert.equal(book.artwork,'assets/icon-512.png');
 const cover=manifest.coverAsset;assert.equal(cover.path,book.cover);assert.equal(hash(read(cover.path).toString('utf8').replaceAll('\r\n','\n')),cover.sha256);
 const worker=read('sw.js').toString('utf8'),shell=worker.match(/const SHELL=\[([\s\S]*?)\]\.concat\(TEXT_ASSETS\);/);assert.ok(shell);
 const offline=[...shell[1].matchAll(/['"]([^'"]+)['"]/g)].map(m=>m[1]);assert.ok(offline.includes(book.cover));for(const path of manifest.previousWorkerShell)assert.ok(offline.includes(path),path);
 for(const old of manifest.previousBooks)assert.deepEqual(catalog.books.find(b=>b.id===old.id),old);
 for(const old of manifest.previousAssets){const data=read(old.path),committed=/\.(json|svg|css|js|html)$/.test(old.path)?data.toString('utf8').replaceAll('\r\n','\n'):data;assert.equal(hash(committed),old.sha256,old.path);}
 const ids=catalog.books.flatMap(b=>b.chapters.map(c=>c.id));assert.equal(new Set(ids).size,ids.length);
});

test('Shadow Monger reader preserves every canonical paragraph and full measured timeline', {skip:!book},()=>{
 const manifest=json(`manuscript/${id}/production.json`);
 assert.equal(manifest.chapters.length,25);
 for(const row of manifest.chapters){
  const c=book.chapters.find(c=>c.number===row.number);assert.equal(c.id,`${id}-${String(row.number).padStart(2,'0')}`);
  const d=json(c.transcript);validateTranscript(d,c.id,c.duration);assert.equal(d.duration,c.duration);
  assert.equal(d.paragraphs.length,row.canonicalParagraphs.length);assert.equal(d.paragraphs[0].start,0);assert.equal(d.paragraphs.at(-1).end,c.duration);
  d.paragraphs.forEach((p,i)=>{const source=row.canonicalParagraphs[i];assert.equal(hash(p.text),source.textSha256,`${c.id}/${i}`);assert.equal(p.kind==='title',source.kind==='title');assert.equal(!!p.breakBefore,source.breakBefore);if(i)assert.equal(p.start,d.paragraphs[i-1].end);assert.equal(paragraphIndexAt(d.paragraphs,p.start),i);});
 }
});

test('Shadow Monger actual MP3 frames support timing and bounded sleep playback', {skip:!book},()=>{
 const manifest=json(`manuscript/${id}/production.json`);
 for(const c of book.chapters){
  const data=read(c.archiveSrc??c.src),row=manifest.chapters.find(r=>r.number===c.number);
  assert.equal(data.length,row.audio.bytes);assert.equal(hash(data),row.audio.sha256);
  const parsed=mp3Frames(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
  assert.ok(Math.abs(parsed.duration-c.duration)<.2,`${c.id}: ${parsed.duration} vs ${c.duration}`);
  const target=Math.min(61,c.duration/2), bounded=boundedMp3(parsed,target);
  assert.ok(bounded.duration>=target&&bounded.duration-target<.05);assert.ok(bounded.blob.size<data.length);
 }
});

test('Shadow Monger Pages archive exclusions cover only its exact pinned chapter audio', {skip:!book},()=>{
 const expected=book.chapters.map(c=>`audio/${id}/chapter-${String(c.number).padStart(2,'0')}.mp3`);
 assert.deepEqual([...archivedAudioPaths(catalog)].sort(),expected);
 book.chapters.forEach((c,i)=>{assert.equal(c.archiveSrc,expected[i]);assert.equal(c.src,mediaOrigin+expected[i]);});
 const mixed=structuredClone(catalog),changed=mixed.books.find(b=>b.id===id);
 delete changed.chapters.at(-1).archiveSrc;
 assert.throws(()=>archivedAudioPaths(mixed),/coverage/);
 changed.chapters.at(-1).archiveSrc=expected.at(-1);
 changed.chapters.at(-1).src=mediaOrigin+expected[0];
 assert.throws(()=>archivedAudioPaths(mixed),/pinned audio archive/);
});

test('Shadow Monger transitions and completed-book progress remain independent of earlier books', {skip:!book},()=>{
 for(let i=0;i<24;i++)assert.equal(nextChapter(book,book.chapters[i].id),book.chapters[i+1]);
 assert.equal(nextChapter(book,book.chapters.at(-1).id),null);
 const last=book.chapters.at(-1),old={position:90,updatedAt:100,completed:true,finishedAt:80};
 const state=restoreState({version:1,positions:{'older-existing-id':old},last:{bookId:id,chapterId:last.id}});
 for(const c of book.chapters)state.positions[c.id]=completedProgress(null,c.duration,500);
 const round=restoreState(JSON.parse(JSON.stringify(state)));assert.deepEqual(round.positions['older-existing-id'],old);
 assert.equal(bookResume(book,round).c.id,last.id);assert.equal(round.positions[last.id].finishedAt,500);
});

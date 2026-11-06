import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {validateTranscript,paragraphIndexAt} from '../reader.js';
import {bookResume,restoreState,nextChapter,validCatalog,completedProgress} from '../core.js';
import {mp3Frames,boundedMp3} from '../mp3.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const production=JSON.parse(fs.readFileSync(new URL('../manuscript/hollow-throne/production.json',import.meta.url),'utf8'));
const catalog=JSON.parse(fs.readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const book=validCatalog(catalog).find(row=>row.id==='hollow-throne');
const numbers=Array.from({length:15},(_,i)=>i+17);
const numberWords=['Seventeen','Eighteen','Nineteen','Twenty','Twenty-One','Twenty-Two','Twenty-Three','Twenty-Four','Twenty-Five','Twenty-Six','Twenty-Seven','Twenty-Eight','Twenty-Nine','Thirty','Thirty-One'];
const local=path=>{
 assert.equal(typeof path,'string');
 assert.ok(!path.includes('\\')&&!path.startsWith('/')&&!path.split('/').includes('..'),`Not an app-relative path: ${path}`);
 const target=resolve(root,path);
 assert.ok(target.startsWith(root.endsWith(sep)?root:root+sep),`Path escaped app: ${path}`);
 return target;
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const textBytes=path=>Buffer.from(fs.readFileSync(local(path),'utf8').replace(/\r\n/g,'\n'),'utf8');
const json=path=>JSON.parse(fs.readFileSync(local(path),'utf8'));
const chapterFor=number=>book.chapters.find(row=>row.number===number);
const manifestFor=number=>production.chapters.find(row=>row.number===number);
const canonicalParagraphs=markdown=>{
 const raw=markdown.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trim().replace(/^#{1,6}\s+/gm,'')+'\n';
 const output=[];
 let scene=false;
 for(const match of raw.matchAll(/\S[^\n]*(?:\n(?!\n)[^\n]*)*/g)){
  const text=match[0].trim();
  if(['§','***','* * *','---'].includes(text)){scene=true;continue;}
  output.push({text,breakBefore:scene});scene=false;
 }
 return output;
};
async function streamedHash(path){
 const digest=createHash('sha256');let bytes=0;
 for await(const chunk of fs.createReadStream(local(path),{highWaterMark:1024*1024})){digest.update(chunk);bytes+=chunk.length;}
 return {sha256:digest.digest('hex'),bytes};
}

test('the completed book adds exactly chapters 17–31 while keeping earlier catalog identities',()=>{
 assert.equal(production.schemaVersion,1);
 assert.equal(production.bookId,book.id);
 assert.deepEqual(production.chapters.map(row=>row.number),numbers);
 assert.deepEqual(book.chapters.map(row=>row.number),Array.from({length:26},(_,i)=>i+6));
 assert.equal(book.ongoing,false);
 assert.deepEqual(book.chapters.filter(row=>row.number<17),production.previous_chapters);
 for(const number of numbers){
  const chapter=chapterFor(number),row=manifestFor(number);
  assert.deepEqual(chapter,row.chapter);
  assert.equal(chapter.id,`hollow-throne-${number}`);
  assert.equal(chapter.src,`audio/hollow-throne/chapter-${number}.mp3`);
  assert.equal(chapter.transcript,`text/hollow-throne/chapter-${number}.json`);
  assert.equal(row.manuscript,`manuscript/hollow-throne/chapter-${number}.md`);
  assert.equal(chapter.duration,row.duration);
  assert.ok(Number.isFinite(row.duration)&&row.duration>0);
 }
});

test('all fifteen readers preserve the full manuscript, original paragraph boundaries and scene breaks',()=>{
 for(const number of numbers){
  const chapter=chapterFor(number),row=manifestFor(number);
  const manuscript=textBytes(row.manuscript);
  assert.equal(sha(manuscript),row.manuscript_sha256,`Chapter ${number} manuscript hash`);
  const data=json(chapter.transcript);
  const expected=canonicalParagraphs(manuscript.toString('utf8'));
  assert.equal(sha(textBytes(chapter.transcript)),row.reader_sha256,`Chapter ${number} reader hash`);
  assert.equal(data.paragraphs.length,row.paragraphs);
  assert.deepEqual(data.paragraphs.map(p=>({text:p.text,breakBefore:!!p.breakBefore})),expected,`Chapter ${number} canonical prose and paragraphs`);
  assert.equal(sha(Buffer.from(data.paragraphs.map(p=>p.text).join('').replace(/\s/g,''),'utf8')),row.reader_text_sha256);
  assert.equal(data.paragraphs[0].text,`Chapter ${numberWords[number-17]}: ${chapter.title}`);
  assert.equal(row.heading_tts_text,`Chapter ${numberWords[number-17]}.`,`Chapter ${number} spoken heading omits the descriptive title`);
  assert.ok(data.paragraphs.some(p=>p.breakBefore),`Chapter ${number} retains its scene transitions`);
 }
});

test('reading synchronization covers every new chapter from zero to the catalog duration',()=>{
 for(const number of numbers){
  const chapter=chapterFor(number),data=json(chapter.transcript);
  validateTranscript(data,chapter.id,chapter.duration);
  assert.equal(data.duration,chapter.duration);
  assert.equal(data.paragraphs[0].start,0);
  assert.equal(data.paragraphs.at(-1).end,chapter.duration);
  for(let i=0;i<data.paragraphs.length;i++){
   const p=data.paragraphs[i];
   assert.equal(p.id,`p${String(i+1).padStart(4,'0')}`);
   assert.equal(paragraphIndexAt(data.paragraphs,p.start),i);
   if(i+1<data.paragraphs.length)assert.equal(p.end,data.paragraphs[i+1].start);
  }
 }
});

test('all new MP3s match production hashes, durations and sleep-timer frame boundaries',{concurrency:false},async()=>{
 // Deliberately process one chapter at a time. No browser, playback, or user state.
 for(const number of numbers){
  await verifyMp3(manifestFor(number),chapterFor(number));
 }
});
async function verifyMp3(row,chapter){
 const actual=await streamedHash(chapter.src);
 assert.equal(actual.sha256,row.audio_sha256,`Chapter ${row.number} MP3 hash`);
 assert.equal(actual.bytes,row.audio_bytes);
 assert.ok(actual.bytes<100*1024*1024,'A single chapter remains bounded for frame-based sleep preparation');
 // Read directly into one ArrayBuffer instead of retaining a Buffer and its copy.
 const buffer=new ArrayBuffer(actual.bytes),fd=fs.openSync(local(chapter.src),'r');
 try{
  const view=new Uint8Array(buffer);let offset=0;
  while(offset<view.length){const count=fs.readSync(fd,view,offset,view.length-offset,null);assert.ok(count>0);offset+=count;}
 }finally{fs.closeSync(fd);}
 const parsed=mp3Frames(buffer);
 assert.ok(Math.abs(parsed.duration-chapter.duration)<.15,`Chapter ${row.number} MPEG frame duration`);
 const cutoff=Math.min(90,chapter.duration/2);
 const limited=boundedMp3(parsed,cutoff);
 const sliced=mp3Frames(await limited.blob.arrayBuffer());
 assert.ok(sliced.duration>=cutoff&&sliced.duration<cutoff+.1);
 const final=boundedMp3(parsed,chapter.duration+1);
 assert.ok(Math.abs(final.duration-parsed.duration)<1e-8,'End-of-chapter slice includes every speech frame');
}

test('all earlier published reader and audio assets remain unchanged',{concurrency:false},async()=>{
 assert.equal(production.previous_assets.length,22);
 const required=new Set();
 for(let number=6;number<=16;number++)for(const [directory,suffix] of [['audio','mp3'],['text','json']])required.add(`${directory}/hollow-throne/chapter-${String(number).padStart(2,'0')}.${suffix}`);
 assert.deepEqual(new Set(production.previous_assets.map(row=>row.path)),required);
 for(const row of production.previous_assets){
  // Git normalizes committed text to LF; Windows checkouts may use CRLF.
  const actual=row.path.endsWith('.json')?{sha256:sha(textBytes(row.path)),bytes:textBytes(row.path).length}:await streamedHash(row.path);
  assert.equal(actual.sha256,row.sha256,row.path);
  assert.equal(actual.bytes,row.bytes,row.path);
 }
});

test('completed chapter 6–16 history survives the catalog expansion and resumes at 17',()=>{
 const old=book.chapters.filter(c=>c.number<17),finishedAt=86400000;
 const positions=Object.fromEntries(old.map(c=>[c.id,{position:c.duration,completed:true,updatedAt:finishedAt,finishedAt}]));
 const reading={'hollow-throne-16':{paragraphId:'p0044',position:120,updatedAt:finishedAt}};
 const bookmark={id:'synthetic-bookmark',bookId:book.id,chapterId:'hollow-throne-16',position:120,label:'Synthetic checkpoint'};
 const state=restoreState({version:1,last:{bookId:book.id,chapterId:'hollow-throne-16'},positions,reading,bookmarks:[bookmark],readerLayout:'pages',mode:'read'});
 assert.equal(bookResume(book,state).c.id,'hollow-throne-17');
 assert.equal(nextChapter(book,'hollow-throne-16').id,'hollow-throne-17');
 assert.deepEqual(state.positions,positions);
 assert.deepEqual(state.reading,reading);
 assert.deepEqual(state.bookmarks,[bookmark]);
 assert.equal(state.readerLayout,'pages');
 assert.equal(state.mode,'read');
 state.last={bookId:book.id,chapterId:'hollow-throne-18'};
 state.positions['hollow-throne-18']={position:321,completed:false,updatedAt:finishedAt+100,finishedAt:null};
 const checkpoint=restoreState(JSON.parse(JSON.stringify(state)));
 assert.equal(bookResume(book,checkpoint).c.id,'hollow-throne-18');
 assert.equal(bookResume(book,checkpoint).p,321);
 for(const chapter of old)assert.equal(checkpoint.positions[chapter.id].finishedAt,finishedAt);
});

test('chapter progression reaches 31 and leaves a finished book at its saved endpoint',()=>{
 for(let number=17;number<31;number++)assert.equal(nextChapter(book,`hollow-throne-${number}`).id,`hollow-throne-${number+1}`);
 assert.equal(nextChapter(book,'hollow-throne-31'),null);
 const positions=Object.fromEntries(book.chapters.map(c=>[c.id,completedProgress(null,c.duration,86401000)]));
 const state=restoreState({version:1,last:{bookId:book.id,chapterId:'hollow-throne-31'},positions});
 const resume=bookResume(book,state);
 assert.equal(resume.c.id,'hollow-throne-31');
 assert.equal(resume.p,chapterFor(31).duration);
 assert.equal(state.positions['hollow-throne-31'].completed,true);
 assert.equal(state.positions['hollow-throne-31'].finishedAt,86401000);
});

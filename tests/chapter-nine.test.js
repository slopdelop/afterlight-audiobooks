import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateTranscript,paragraphIndexAt} from '../reader.js';
import {bookResume,restoreState,nextChapter} from '../core.js';
import {mp3Frames,boundedMp3} from '../mp3.js';

const book=JSON.parse(fs.readFileSync(new URL('../catalog.json',import.meta.url),'utf8')).books.find(b=>b.id==='hollow-throne');
const chapter=book.chapters.find(c=>c.number===9);

test('Chapter 9 retains the complete manuscript in ordered book paragraphs with reading sync',()=>{
    assert.equal(chapter.id,'hollow-throne-09');
    const data=JSON.parse(fs.readFileSync(new URL('../'+chapter.transcript,import.meta.url),'utf8'));
    validateTranscript(data,chapter.id,chapter.duration);
    assert.equal(data.paragraphs[0].start,0);
    assert.equal(data.paragraphs.at(-1).end,chapter.duration);
    assert.equal(data.paragraphs.at(-1).text,'End of Chapter Nine.');
    assert.ok(data.paragraphs.some(p=>p.text.includes('The last time Luke Skywalker')&&p.text.includes('He was determined not to repeat')));
    const text=data.paragraphs.map(p=>p.text).join('').replace(/\s/g,'');
    assert.equal(createHash('sha256').update(text).digest('hex'),'45cd76769114034959dc23b21b39d8ff5ef7aa9f11784fd80ed094e15cad82e3');
    for(let i=0;i<data.paragraphs.length;i++){
        const p=data.paragraphs[i];
        assert.equal(paragraphIndexAt(data.paragraphs,p.start),i);
        if(i+1<data.paragraphs.length)assert.equal(p.end,data.paragraphs[i+1].start);
    }
});

test('Chapter 9 MP3 agrees with the catalog and supports the existing sleep-timer slicing',async()=>{
    const bytes=fs.readFileSync(new URL('../'+chapter.src,import.meta.url));
    const parsed=mp3Frames(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    assert.ok(Math.abs(parsed.duration-chapter.duration)<.15);
    const limited=mp3Frames(await boundedMp3(parsed,90).blob.arrayBuffer());
    assert.ok(limited.duration>=90&&limited.duration<90.1);
});

test('adding Chapter 9 preserves completed chapter history and offers it after Chapter 8',()=>{
    const positions=Object.fromEntries(book.chapters.filter(c=>c.number<9).map(c=>[c.id,{position:c.duration,completed:true,updatedAt:3000}]));
    const state=restoreState({version:1,last:{bookId:book.id,chapterId:'hollow-throne-08'},positions});
    assert.equal(bookResume(book,state).c.id,chapter.id);
    assert.equal(nextChapter(book,'hollow-throne-08').id,chapter.id);
    for(const c of book.chapters.filter(c=>c.number<9)){
        assert.equal(state.positions[c.id].position,c.duration);
        assert.equal(state.positions[c.id].completed,true);
        assert.equal(state.positions[c.id].finishedAt,3000);
    }
});

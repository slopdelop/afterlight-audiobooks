import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateTranscript,paragraphIndexAt} from '../reader.js';
import {bookResume,restoreState,nextChapter} from '../core.js';
import {mp3Frames,boundedMp3} from '../mp3.js';

const book=JSON.parse(fs.readFileSync(new URL('../catalog.json',import.meta.url),'utf8')).books.find(b=>b.id==='hollow-throne');
const chapter=book.chapters.find(c=>c.number===13);

test('Chapter 13 retains the complete manuscript in ordered book paragraphs with reading sync',()=>{
    assert.equal(chapter.id,'hollow-throne-13');
    const data=JSON.parse(fs.readFileSync(new URL('../'+chapter.transcript,import.meta.url),'utf8'));
    validateTranscript(data,chapter.id,chapter.duration);
    assert.equal(data.paragraphs[0].start,0);
    assert.equal(data.paragraphs.at(-1).end,chapter.duration);
    assert.equal(data.paragraphs.at(-1).text,'End of Chapter Thirteen.');
    assert.ok(data.paragraphs.some(p=>p.text.includes('The Emperor had been dreaming of a boy')&&p.text.includes('green lightsaber')));
    const text=data.paragraphs.map(p=>p.text).join('').replace(/\s/g,'');
    assert.equal(createHash('sha256').update(text).digest('hex'),'9879c57816701f929a1195bd769ce9bec9706de37c09ead5902f1872cd94f92e');
    for(let i=0;i<data.paragraphs.length;i++){
        const p=data.paragraphs[i];
        assert.equal(paragraphIndexAt(data.paragraphs,p.start),i);
        if(i+1<data.paragraphs.length)assert.equal(p.end,data.paragraphs[i+1].start);
    }
});

test('Chapter 13 MP3 agrees with the catalog and supports the existing sleep-timer slicing',async()=>{
    const bytes=fs.readFileSync(new URL('../'+chapter.src,import.meta.url));
    const parsed=mp3Frames(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    assert.ok(Math.abs(parsed.duration-chapter.duration)<.15);
    const limited=mp3Frames(await boundedMp3(parsed,90).blob.arrayBuffer());
    assert.ok(limited.duration>=90&&limited.duration<90.1);
});

test('adding Chapter 13 preserves completed chapter history and offers it after Chapter 12',()=>{
    const positions=Object.fromEntries(book.chapters.filter(c=>c.number<13).map(c=>[c.id,{position:c.duration,completed:true,updatedAt:3000}]));
    const state=restoreState({version:1,last:{bookId:book.id,chapterId:'hollow-throne-12'},positions});
    assert.equal(bookResume(book,state).c.id,chapter.id);
    assert.equal(nextChapter(book,'hollow-throne-12').id,chapter.id);
    for(const c of book.chapters.filter(c=>c.number<13)){
        assert.equal(state.positions[c.id].position,c.duration);
        assert.equal(state.positions[c.id].completed,true);
        assert.equal(state.positions[c.id].finishedAt,3000);
    }
});

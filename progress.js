import {STATE_KEY,restoreState} from './core.js';

const JOURNAL_KEY='afterlight-progress-v1';
const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key));}catch{return null;}};
const lastUpdated=state=>Number(state.last?.updatedAt)||state.positions[state.last?.chapterId]?.updatedAt||0;
function mergeRecords(a={},b={}){const out={...a};for(const [id,p] of Object.entries(b)){const old=out[id],winner=!old||p.updatedAt>old.updatedAt?p:old;out[id]={...winner,...((old?.finishedAt||p.finishedAt)?{finishedAt:old?.finishedAt||p.finishedAt}:{})};}return out;}
/** Keep a separate progress journal: older tabs/releases only write STATE_KEY. */
export function restoreProgress(storage){
 const state=restoreState(read(storage,STATE_KEY)),journal=restoreState(read(storage,JOURNAL_KEY));
 state.positions=mergeRecords(state.positions,journal.positions);
 state.reading=mergeRecords(state.reading,journal.reading);
 if(journal.last&&lastUpdated(journal)>=lastUpdated(state))state.last=journal.last;
 return state;
}
export function persistProgress(storage,state,{replace=false,selection=false}={}){
 const latest=restoreProgress(storage);
 const next={...state};
 if(!replace){next.positions=mergeRecords(state.positions,latest.positions);next.reading=mergeRecords(state.reading,latest.reading);if(!selection&&lastUpdated(latest)>lastUpdated(state))next.last=latest.last;}
 // Journal first so an interrupted main-state write still preserves progress.
 storage.setItem(JOURNAL_KEY,JSON.stringify({version:1,positions:next.positions,reading:next.reading,last:next.last}));
 storage.setItem(STATE_KEY,JSON.stringify(next));
 return next;
}

/** Browser media resets are not user seeks. Only an explicit seek may rewind. */
export function createPositionTracker(){
 let saved=0;
 return {reset(p){saved=Math.max(0,Number(p)||0);},sample(audio,duration){
  const raw=Number(audio.currentTime);
  if(audio.readyState>=2&&!audio.seeking&&Number.isFinite(raw)&&raw>=saved-.25)saved=Math.min(duration,Math.max(saved,raw));
  return Math.min(duration,saved);
 },get value(){return saved;}};
}

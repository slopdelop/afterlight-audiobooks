/** A listening-time clock; changing it never pauses or replaces the media source. */
export function createSleepTimer(audio,{onExpire=()=>{},onChange=()=>{},schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}={}){
 let mode='off',left=0,last=Number(audio.currentTime)||0,rate=Number(audio.playbackRate)||1,running=false,job=null,expired=false;
 const clear=()=>{if(job!==null)cancel(job);job=null;};
 const baseline=()=>{last=Number(audio.currentTime)||0;rate=Number(audio.playbackRate)||1;};
 function arm(){clear();if(mode==='minutes'&&running&&!audio.paused)job=schedule(()=>{job=null;capture();},Math.max(20,Math.min(1000,left*1000)));}
 function capture(){if(mode==='minutes'&&running&&!audio.seeking){const current=Number(audio.currentTime)||0;left=Math.max(0,left-Math.max(0,current-last)/rate);}baseline();if(mode==='minutes'&&left<=.015){clear();mode='off';left=0;running=false;expired=true;audio.pause();onExpire();onChange();return;}arm();onChange();}
 function start(seconds){if(!Number.isFinite(seconds)||seconds<=0||seconds>86400)throw Error('Enter a timer between 1 minute and 1,440 minutes.');clear();mode='minutes';left=seconds;expired=false;baseline();running=!audio.paused&&!audio.seeking;arm();onChange();}
 function stop(){clear();mode='off';left=0;expired=false;running=false;baseline();onChange();}
 function end(){stop();mode='end';onChange();}
 const handlers={timeupdate:capture,play:()=>{baseline();running=true;arm();},playing:()=>{baseline();running=true;arm();},pause:()=>{capture();running=false;clear();},waiting:()=>{capture();running=false;clear();},seeking:()=>{running=false;baseline();clear();},seeked:()=>{baseline();running=!audio.paused;arm();},ratechange:()=>{capture();rate=Number(audio.playbackRate)||1;},ended:()=>{capture();running=false;clear();}};
 for(const [event,handler]of Object.entries(handlers))audio.addEventListener(event,handler);
 return {start,cancel:stop,end,capture,beforeSeek:()=>{capture();running=false;clear();},clearExpiry:()=>{expired=false;},get mode(){return mode;},get remaining(){return left;},get expired(){return expired;},destroy(){clear();for(const [event,handler]of Object.entries(handlers))audio.removeEventListener(event,handler);}};
}

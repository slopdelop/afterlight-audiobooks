const BUILD='__AFTERLIGHT_BUILD__';
const CACHE='afterlight-shell-'+BUILD;
const TEXT_ASSETS=[];
const SHELL=['./','index.html','styles.css','app.js','core.js','icons.js','storage.js','mp3.js','updates.js','reader.js','manifest.webmanifest','catalog.json','version.json','assets/icon-180.png','assets/icon-192.png','assets/icon-512.png','assets/hollow-throne.png','assets/hollow-throne-square.png'].concat(TEXT_ASSETS);
self.addEventListener('install',event=>event.waitUntil((async()=>{try{const cache=await caches.open(CACHE);await cache.addAll(SHELL.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));}catch(error){await caches.delete(CACHE);throw error;}})()));
// A downloaded release waits until the player decides it is safe to switch.
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('afterlight-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('range')||url.pathname.endsWith('.mp3'))return;
 if(url.pathname.endsWith('/catalog.json')){event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-store'});if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}catch{return (await caches.match(request))||Response.error();}})());return;}
 // Navigation and code stay on the same cached release until activation.
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(request.mode==='navigate')return (await cache.match(new URL('index.html',self.registration.scope)))||fetch(request);const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&url.pathname.includes('/text/')&&url.pathname.endsWith('.json'))await cache.put(request,response.clone());return response;})());});

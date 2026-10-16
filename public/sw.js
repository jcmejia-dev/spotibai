const CACHE="spotibai-shell-v1";
const SHELL=["/offline.html","/spotibai-icon.png","/manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET"||new URL(request.url).origin!==self.location.origin)return;
 const path=new URL(request.url).pathname;
 if(path.startsWith("/api/")||path.includes("/auth/")||path.startsWith("/_next/image"))return;
 if(request.mode==="navigate"){
  event.respondWith(fetch(request).catch(()=>caches.match("/offline.html")));
  return;
 }
 if(path.startsWith("/_next/static/")||SHELL.includes(path)){
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&response.type==="basic"){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(request,copy))}return response})));
 }
});

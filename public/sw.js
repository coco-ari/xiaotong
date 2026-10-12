const CACHE='xiaotong-shell-v4';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE&&/^(xiaobu|xiaotong)-/.test(key))await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(u.origin===self.location.origin&&u.pathname.startsWith(new URL(self.registration.scope).pathname+'assets/')&&event.request.method==='GET')event.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(event.request);if(hit)return hit;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;})());
});
const receipt=(id,event)=>fetch(new URL('api/receipt',self.registration.scope),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,event})}).catch(()=>{});
self.addEventListener('push',event=>{let payload;try{payload=event.data.json();}catch{payload={title:'小彤',body:'你的新消息已经准备好了。'};}event.waitUntil((async()=>{
 await self.registration.showNotification(payload.title||'小彤',{body:payload.body,tag:payload.id||'xiaotong',icon:new URL('xiaotong-icon-192-v3.png',self.registration.scope).href,data:{id:payload.id},silent:false});
 if(payload.id)await receipt(payload.id,'shown');
})());});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const {id}=event.notification.data||{};if(id)await receipt(id,'clicked');const url=new URL(self.registration.scope);url.searchParams.set('view','feed');const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of clients)if(client.url.startsWith(self.registration.scope)){await client.focus();client.postMessage({type:'open-feed'});return;}return self.clients.openWindow(url.href);})());});

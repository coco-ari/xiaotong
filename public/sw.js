const CACHE='xiaobu-shell-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE&&key.startsWith('xiaobu-'))await caches.delete(key);await self.clients.claim();})()));
// Data always comes from the server. Only static versioned assets may be cached.
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(u.origin===self.location.origin&&u.pathname.startsWith(new URL(self.registration.scope).pathname+'assets/')&&event.request.method==='GET'){
    event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(event.request);if(hit)return hit;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;})());
  }
});
const receipt=(id,event)=>fetch(new URL('api/receipt',self.registration.scope),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,event})}).catch(()=>{});
self.addEventListener('push',event=>{
  let payload;try{payload=event.data.json();}catch{payload={title:'小步的温柔提醒',body:'有一件小事，还等着你。'};}
  event.waitUntil((async()=>{
    await self.registration.showNotification(payload.title,{body:payload.body,tag:payload.id||'xiaobu',icon:new URL('icon-192.png',self.registration.scope).href,badge:new URL('icon-192.png',self.registration.scope).href,data:{id:payload.id,taskId:payload.taskId},silent:false});
    if(payload.id)await receipt(payload.id,'shown');
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const {id,taskId}=event.notification.data||{};if(id)await receipt(id,'clicked');
    const url=new URL(self.registration.scope);if(taskId)url.searchParams.set('task',taskId);
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients)if(client.url.startsWith(self.registration.scope)){await client.focus();client.postMessage({type:'open-task',taskId});return;}
    return self.clients.openWindow(url.href);
  })());
});

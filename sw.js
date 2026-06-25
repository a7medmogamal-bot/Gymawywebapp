const CACHE_NAME='gymawy-v10';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.url.includes('firestore')||e.request.url.includes('googleapis'))return;e.respondWith(fetch(e.request).then(r=>{if(r&&r.status===200){const rc=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,rc));}return r;}).catch(()=>caches.match(e.request)));});
self.addEventListener('push',e=>{let d={};try{d=e.data?.json()||{};}catch(ex){d={title:'Gymawy',body:e.data?.text()||''};}e.waitUntil(self.registration.showNotification(d.title||'Gymawy',{body:d.body||'',icon:'https://i.ibb.co/XZH0qHBR/logo.png',vibrate:[200,100,200],data:{url:d.url||'/'}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow(e.notification.data?.url||'/'));});
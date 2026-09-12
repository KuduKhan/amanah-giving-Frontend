const CACHE='amanah-offline-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/amanah-logo.png'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('amanah-offline-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
// Never cache sessions, receipts, API responses, or authenticated pages.
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||event.request.mode!=='navigate')return;event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));});

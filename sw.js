const C='cap-v5';
const A=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin||/\/gestion-/.test(u.pathname)||/\/\.netlify\//.test(u.pathname))return;
  e.respondWith(fetch(e.request).then(res=>{const cp=res.clone();if(res.ok)caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))
});

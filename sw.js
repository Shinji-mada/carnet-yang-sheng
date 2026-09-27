/* Carnet Yang Sheng : fonctionnement hors ligne */
const VERSION='ys-0.11.0-bdddb099';
const CORE=["./", "index.html", "app.css?v=c2f8164b", "app.js?v=900f24eb", "data.json", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "fonts/notoserifsc-500.woff2", "fonts/notoserifsc-700.woff2", "fonts/atkinson-400.woff2", "fonts/atkinson-700.woff2"];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(url.searchParams.has('maj'))return;
  const fresh=req.mode==='navigate'||url.pathname.endsWith('data.json');
  if(fresh){
    e.respondWith(fetch(req).then(r=>{
      if(r.ok){const cp=r.clone();caches.open(VERSION).then(c=>c.put(req,cp));}
      return r;
    }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{
    if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(req,cp));}
    return res;
  })));
});

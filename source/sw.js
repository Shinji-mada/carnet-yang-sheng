/* Carnet Yang Sheng : fonctionnement hors ligne */
const VERSION='__VERSION__';
const CORE=__CORE__;
self.addEventListener('install',e=>{
  /* La version anglaise n'est gardée hors ligne que si elle l'était déjà (appli passée en anglais) */
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE).then(()=>caches.match('data-en.json',{ignoreSearch:true})).then(r=>r?c.add('data-en.json').catch(()=>{}):null)).then(()=>self.skipWaiting()));
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
  const fresh=req.mode==='navigate'||/data(-en)?\.json$/.test(url.pathname);
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

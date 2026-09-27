/* Carnet Yang Sheng : logique de l'appli */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JOURS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const JOURS_C=['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
const TYPES={protocole:'Protocole',recette:'Recette'};
const TECH={d:['↺','Pression forte, rotation anti-horaire'],t:['↻','Pression douce, rotation horaire'],w:['♨︎','Chaleur douce, à distance']};
const PHASE={d:'Disperser',t:'Tonifier',w:'Réchauffer'};
const SIDE=['Côté gauche','Côté droit'];
const UNIT={g:'g',kg:'kg',ml:'ml',cl:'cl',l:'l',tsp:'c. à café',tbsp:'c. à soupe',pinch:'pincée',cup:'tasse'};
const TABS=['carnet','cuisine','symptomes','infos'];
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const standalone=window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true);
if(standalone)document.documentElement.classList.add('standalone');

function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
function storedSet(k){try{const a=JSON.parse(store(k)||'[]');return new Set(Array.isArray(a)?a:[]);}catch(e){return new Set();}}

/* ---------- État ---------- */
const view=$('#view');
let DATA=null,loadError=false,fiches=[],SYM={},INGC={};
let tab=TABS.includes(store('ys.onglet'))?store('ys.onglet'):'carnet';
let fiche=null;
const scrollMem={};
let filter=store('ys.filtre')||'tout';if(!TYPES[filter])filter='tout';
let query='';
const have=storedSet('ys.cuisine');
const symSel=storedSet('ys.symptomes');
const portions={};
let installEvt=null;
const T=new Map();
let act=null,iv=null,last=0,ac=null,wl=null;

/* ---------- Données ---------- */
function parseDate(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function longDate(d){return d?`${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`:'';}
function fold(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function norm(d){
  if(!d||!d.id||!TYPES[d.type])return null;
  const e=Object.assign({},d);
  e._d=parseDate(e.date);
  e._items=[];
  (Array.isArray(e.phases)?e.phases:[]).forEach(ph=>(Array.isArray(ph.items)?ph.items:[]).forEach(it=>e._items.push(Object.assign({m:ph.m||'d'},it))));
  e._sym=(Array.isArray(e.symptomes)?e.symptomes:[]).filter(s=>SYM[s]);
  e._keys=[...new Set((e.ingredients||[]).filter(i=>i&&i.cle&&!i.base).map(i=>i.cle))];
  const p=[e.titre,e.contexte,(e.tags||[]).join(' '),e._sym.map(s=>SYM[s].nom).join(' ')];
  if(e.principe)p.push(e.principe.zh,e.principe.py,e.principe.fr);
  e._items.forEach(it=>p.push(it.ab,it.py,it.zh));
  (e.ingredients||[]).forEach(i=>p.push(i.nom));
  (e.produits||[]).forEach(x=>p.push(x.nom));
  const h=fold(p.join(' '));
  e._hay=h+' '+h.replace(/\s+/g,'');
  return e;
}
function byId(id){return fiches.find(e=>e.id===id);}
function matches(e){const q=fold(query).trim();if(!q)return true;return e._hay.includes(q)||e._hay.includes(q.replace(/\s+/g,''));}
function minutes(e){return Math.round(e._items.reduce((a,p)=>a+(+p.s||0)*(p.b?2:1),0)/60);}
function meta(e){
  if(e.type==='protocole')return `${e._items.length} ${e.unite||'points'} · ${minutes(e)} min`;
  const m=[];if(e.portions)m.push(e.portions+' portions');if(e.duree)m.push(e.duree);return m.join(' · ');
}
async function loadData(){
  if(window.YS_DATA)return window.YS_DATA;
  const r=await fetch('data.json',{cache:'no-cache'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}

/* ---------- Éléments communs ---------- */
const SEAL='<div class="seal" lang="zh-Hans" aria-hidden="true"><span>养</span><span>生</span></div>';
function card(e,extra){
  const live=act&&T.get(act)&&T.get(act).eid===e.id;
  return `<button type="button" class="entry ${e.type}" data-open="${esc(e.id)}" aria-label="${esc(TYPES[e.type]+', '+e.titre)}">
<span class="txt"><span class="kind">${TYPES[e.type]}${live?'<span class="live">en cours</span>':''}</span><span class="etitle">${esc(e.titre)}</span><span class="emeta">${esc(meta(e))}</span>${extra||''}</span>
${e.principe&&e.principe.zh?`<span class="eprin" lang="zh-Hans" aria-hidden="true">${esc(e.principe.zh)}</span>`:''}
</button>`;
}
function plural(n,s,p){return n+' '+(n>1?p:s);}

/* ---------- Carnet ---------- */
function renderCarnet(){
  view.innerHTML=`<header class="mast">${SEAL}<div><h1>Carnet Yang Sheng</h1><p class="lede">Protocoles et recettes, du plus récent au plus ancien.</p></div></header>
<div class="tools">
<div class="seg" role="group" aria-label="Afficher">
<button type="button" data-f="tout">Tout <span class="n"></span></button>
<button type="button" data-f="protocole">Protocoles <span class="n"></span></button>
<button type="button" data-f="recette">Recettes <span class="n"></span></button>
</div>
<label class="find" for="q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<input id="q" type="search" placeholder="Chercher un point, un plat, un symptôme" autocomplete="off" aria-label="Chercher dans le carnet"></label>
</div>
<div id="timeline" aria-live="polite"></div>`;
  const q=$('#q');q.value=query;
  q.addEventListener('input',()=>{query=q.value;renderTimeline();});
  renderTimeline();
}
function renderTimeline(){
  const box=$('#timeline');if(!box)return;
  const counts={tout:fiches.length,protocole:0,recette:0};
  fiches.forEach(e=>counts[e.type]++);
  view.querySelectorAll('.seg button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.f===filter));b.querySelector('.n').textContent=counts[b.dataset.f];});
  if(!fiches.length){box.innerHTML='<p class="msg">Le carnet est vide pour l\'instant.</p>';return;}
  const shown=fiches.filter(e=>(filter==='tout'||e.type===filter)&&matches(e));
  if(!shown.length){box.innerHTML=`<p class="msg">Aucune fiche ne correspond${query.trim()?` à « ${esc(query.trim())} »`:''}.</p>`;return;}
  let h='',month='',day=null;
  const close=()=>{if(day!==null)h+='</div></section>';};
  shown.forEach(e=>{
    const d=e._d,mk=d?d.getFullYear()+'-'+d.getMonth():'?',dk=e.date||'?';
    if(mk!==month){close();day=null;month=mk;h+=`<h2 class="month">${d?MOIS[d.getMonth()]+' '+d.getFullYear():'Sans date'}</h2>`;}
    if(dk!==day){close();day=dk;h+=`<section class="day" aria-label="${esc(longDate(d))}"><div class="date" aria-hidden="true"><span class="d">${d?d.getDate():'–'}</span><span class="w">${d?JOURS_C[d.getDay()]:''}</span></div><div class="entries">`;}
    h+=card(e);
  });
  close();
  box.innerHTML=h;
}

/* ---------- Ma cuisine ---------- */
function renderCuisine(){
  const cat=Array.isArray(DATA.ingredients)?DATA.ingredients:[];
  let h=`<h1 class="vh">Ma cuisine</h1><p class="lede">Coche ce que tu as sous la main. L'eau, le sel et l'huile sont comptés d'office.</p>
<div class="chips och" role="group" aria-label="Ingrédients">${cat.map(i=>`<button type="button" class="chip" data-ing="${esc(i.id)}" aria-pressed="${have.has(i.id)}">${esc(i.nom)}</button>`).join('')}</div>`;
  if(have.size)h+='<button type="button" class="linkbtn" data-clear="ing">Tout décocher</button>';
  const recs=fiches.filter(e=>e.type==='recette').map(e=>({e,got:e._keys.filter(k=>have.has(k))}));
  if(!have.size){
    h+=`<h2 class="results-h">${plural(recs.length,'recette','recettes')} dans l'appli</h2><div class="entries">${recs.map(r=>card(r.e)).join('')}</div>`;
  }else{
    const m=recs.filter(r=>r.got.length).sort((a,b)=>(b.got.length/b.e._keys.length)-(a.got.length/a.e._keys.length)||b.got.length-a.got.length);
    h+=`<h2 class="results-h">${m.length?plural(m.length,'recette possible','recettes possibles'):'Aucune recette avec ces ingrédients'}</h2>`;
    if(m.length){
      h+='<div class="entries">'+m.map(r=>{
        const miss=r.e._keys.filter(k=>!have.has(k)).map(k=>(INGC[k]||k).toLowerCase());
        const extra=`<span class="ematch">Tu as ${r.got.length} ingrédient${r.got.length>1?'s':''} sur ${r.e._keys.length}</span><span class="emiss">${miss.length?'Il manque : '+esc(miss.join(', ')):'Tu as tout ce qu\'il faut'}</span>`;
        return card(r.e,extra);
      }).join('')+'</div>';
    }else h+='<p class="msg">Coche d\'autres ingrédients, ou regarde toutes les recettes dans le carnet.</p>';
  }
  view.innerHTML=h;
}

/* ---------- Symptômes ---------- */
function renderSym(){
  const list=Array.isArray(DATA.symptomes)?DATA.symptomes:[];
  let h=`<h1 class="vh">Symptômes</h1><p class="lede">Choisis ce que tu ressens. Les protocoles et les recettes qui y répondent s'affichent.</p>
<div class="chips" role="group" aria-label="Symptômes">${list.map(s=>`<button type="button" class="chip" data-sym="${esc(s.id)}" aria-pressed="${symSel.has(s.id)}">${esc(s.nom)}</button>`).join('')}</div>`;
  const sel=[...symSel].filter(s=>SYM[s]);
  if(sel.length){
    h+='<button type="button" class="linkbtn" data-clear="sym">Tout décocher</button>';
    h+=`<div class="alert" role="note"><h2>Quand consulter</h2><ul>${sel.map(s=>`<li><b>${esc(SYM[s].nom)}.</b> ${esc(SYM[s].alerte)}</li>`).join('')}</ul></div>`;
    const m=fiches.map(e=>({e,n:e._sym.filter(s=>symSel.has(s)).length})).filter(r=>r.n).sort((a,b)=>b.n-a.n);
    h+=`<h2 class="results-h">${m.length?plural(m.length,'fiche','fiches'):'Aucune fiche pour l\'instant'}</h2>`;
    if(m.length)h+='<div class="entries">'+m.map(r=>card(r.e,sel.length>1?`<span class="ematch">Répond à ${r.n} de tes ${sel.length} symptômes</span>`:'')).join('')+'</div>';
  }
  h+='<p class="fine">Ces fiches accompagnent le bien-être selon la médecine traditionnelle chinoise. Elles ne remplacent pas un avis médical.</p>';
  view.innerHTML=h;
}

/* ---------- Infos ---------- */
function renderInfos(){
  const nP=fiches.filter(e=>e.type==='protocole').length,nR=fiches.length-nP;
  const lastDate=fiches.reduce((a,e)=>e.date&&e.date>a?e.date:a,'');
  let inst;
  if(standalone)inst='<p>L\'appli est installée sur ce téléphone.</p>';
  else if(installEvt)inst='<p>Ajoute Carnet Yang Sheng à tes applis pour l\'ouvrir d\'un appui, même sans connexion.</p><button type="button" class="primary" data-install="1">Installer l\'appli</button>';
  else inst='<p>Dans Chrome, ouvre le menu ⋮ en haut à droite, puis choisis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».</p>';
  view.innerHTML=`<header class="mast">${SEAL}<div><h1>Carnet Yang Sheng</h1><p class="lede">Version ${esc(DATA.version||'')}</p></div></header>
<section class="card"><h2>Installer sur ton téléphone</h2>${inst}</section>
<section class="card"><h2>À lire avant d'utiliser</h2><p>Carnet Yang Sheng propose des routines de bien-être inspirées de la médecine traditionnelle chinoise : auto-massage de points, chaleur et recettes.</p><p>Ce n'est ni un diagnostic ni un traitement. Si un symptôme dure, s'aggrave ou t'inquiète, consulte un médecin. En urgence, appelle le 15 ou le 112.</p></section>
<section class="card"><h2>Tes données</h2><p>L'appli ne demande aucun compte et ne collecte aucune donnée personnelle. Tes ingrédients cochés et tes symptômes choisis restent sur ce téléphone.</p></section>
<section class="card"><h2>Contenu</h2><dl class="kv"><dt>Protocoles</dt><dd>${nP}</dd><dt>Recettes</dt><dd>${nR}</dd><dt>Dernier ajout</dt><dd>${esc(longDate(parseDate(lastDate)))}</dd></dl></section>
<p class="fine">Polices Atkinson Hyperlegible et Noto Serif SC, sous licence SIL Open Font License.</p>`;
}

/* ---------- Fiche ---------- */
function prinHTML(e){
  const p=e.principe;if(!p)return'';
  return `<div class="prin">${p.zh?`<span class="pz" lang="zh-Hans">${esc(p.zh)}</span>`:''}<span class="pp">${p.py?`<b>${esc(p.py)}</b>`:''}${p.fr?`<span>${esc(p.fr)}</span>`:''}</span></div>`;
}
function timerBtn(key){return `<button class="timer" type="button" data-tk="${esc(key)}"><span class="lab"><span class="s"></span><span class="h"></span></span><span class="time"></span></button>`;}
function protoHTML(e){
  let h=`<div class="sum"><p>${e._items.length} ${esc(e.unite||'points')}, environ ${minutes(e)} minutes.${e.consigne?' '+esc(e.consigne):''}</p><div class="hrow"><span class="count" data-count="${esc(e.id)}"></span><button class="ghost" type="button" data-reset="${esc(e.id)}">Réinitialiser</button></div></div>`;
  let k=0;
  (e.phases||[]).forEach(ph=>{
    const m=TECH[ph.m]?ph.m:'d';
    h+=`<h2 class="phase ${m}">${esc(ph.titre||PHASE[m])}</h2>`;
    (ph.items||[]).forEach(it=>{
      const idx=k++,key=e.id+'|p'+idx;
      const tech=Array.isArray(it.tech)&&it.tech.length===2?it.tech:TECH[m];
      const labels=Array.isArray(it.sl)&&it.sl.length===2?it.sl:SIDE;
      h+=`<article class="pt ${m}" data-card="${esc(key)}">
<div class="meta"><span class="num">${idx+1}</span><span class="ab">${esc(it.ab)}</span></div>
${it.zh?`<div class="pt-zh" lang="zh-Hans" aria-hidden="true">${esc(it.zh)}</div>`:''}
<h3 class="pt-py">${esc(it.py)}</h3>
${it.loc?`<p class="loc"><span class="k">Où</span>${esc(it.loc)}</p>`:''}
${it.act?`<p class="act"><span class="k">Effet</span>${esc(it.act)}</p>`:''}
<p class="tech"><span class="ic" aria-hidden="true">${esc(tech[0])}</span><span>${esc(tech[1])}</span></p>
${timerBtn(key)}
<div class="foot"><div class="dots">${it.b?'<span class="dot">Gauche</span><span class="dot">Droite</span>':'<span class="dot">Centre</span>'}</div><button class="redo" type="button" data-redo="${esc(key)}">Recommencer</button></div>
</article>`;
      ensureT(key,{eid:e.id,kind:'pt',total:Math.max(5,+it.s||60),b:!!it.b,labels,title:(it.ab?it.ab+' · ':'')+(it.py||'')});
    });
  });
  if(e.note)h+=`<p class="note">${esc(e.note)}</p>`;
  if(Array.isArray(e.produits)&&e.produits.length)h+='<h2 class="sec">Produits</h2><ul class="prod">'+e.produits.map(p=>`<li><b>${esc(p.nom)}</b><span>${esc(p.texte)}</span></li>`).join('')+'</ul>';
  if(e.regle)h+=`<p class="rule">${esc(e.regle)}</p>`;
  return h;
}
function frac(v){
  const w=Math.floor(v+1e-9),r=Math.round((v-w)*4)/4;
  if(r===1)return String(w+1);
  const f={0.25:'¼',0.5:'½',0.75:'¾'}[r]||'';
  return (w?String(w):'')+(w&&f?' ':'')+f||'0';
}
function qty(i,f){
  const u=i.u||null;let v=(+i.q||0)*f;
  if(u==='g'||u==='ml'||u==='cl'){v=v>=100?Math.round(v/5)*5:Math.max(1,Math.round(v));return{txt:v.toLocaleString('fr-FR')+' '+UNIT[u],v};}
  if(u==='kg'||u==='l'){v=Math.round(v*100)/100;return{txt:v.toLocaleString('fr-FR')+' '+UNIT[u],v};}
  if(u){v=Math.max(.25,Math.round(v*4)/4);return{txt:frac(v)+' '+(UNIT[u]||u),v};}
  v=Math.max(.5,Math.round(v*2)/2);return{txt:frac(v),v};
}
function fill(text,ings,f){
  const map={};(ings||[]).forEach(i=>{if(i&&i.id)map[i.id]=i;});
  return esc(text).replace(/\{([A-Za-z0-9_-]+)\}/g,(m,id)=>{
    const i=map[id];if(!i)return m;
    const q=qty(i,f);let s=i.suffixe||'';
    if(s&&q.v<=1&&s.endsWith('s'))s=s.slice(0,-1);
    return `<strong>${esc(q.txt+(s?' '+s:''))}</strong>`;
  });
}
function recipeHTML(e){
  const base=Math.max(1,+e.portions||1),n=portions[e.id]||base,f=n/base;
  let h='';
  if(e.appareil||e.duree)h+=`<p class="device">${esc([e.appareil,e.duree].filter(Boolean).join(' · '))}</p>`;
  h+=`<div class="serv"><span class="serv-l">Portions</span><div class="stepper"><button type="button" data-serv="-1" aria-label="Une portion de moins"${n<=1?' disabled':''}>−</button><output aria-live="polite">${n}</output><button type="button" data-serv="1" aria-label="Une portion de plus"${n>=12?' disabled':''}>+</button></div></div>`;
  h+='<h2 class="sec">Ingrédients</h2><ul class="ing">'+(e.ingredients||[]).map(i=>`<li><span class="q">${esc(qty(i,f).txt)}</span><span>${esc(i.nom)}${i.cle&&have.has(i.cle)?'<span class="have">✓ tu en as</span>':''}${i.note?`<small>${esc(i.note)}</small>`:''}</span></li>`).join('')+'</ul>';
  h+='<h2 class="sec">Étapes</h2><ol class="steps">';
  (e.etapes||[]).forEach((s,i)=>{
    const key=e.id+'|s'+i,has=+s.s>0;
    h+=`<li class="step" data-card="${esc(key)}"><span class="snum" aria-hidden="true">${i+1}</span><div><h3>${esc(s.titre)}</h3><p>${fill(s.texte,e.ingredients,f)}</p>${has?timerBtn(key)+`<div class="foot"><button class="redo" type="button" data-plus="${esc(key)}">Ajouter 5 min</button><button class="redo" type="button" data-redo="${esc(key)}">Recommencer</button></div>`:''}</div></li>`;
    if(has)ensureT(key,{eid:e.id,kind:'step',total:+s.s,b:false,labels:SIDE,title:s.titre||'Étape '+(i+1)});
  });
  h+='</ol>';
  if(Array.isArray(e.notes)&&e.notes.length)h+='<h2 class="sec">Notes</h2><ul class="notes">'+e.notes.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
  return h;
}
function renderFiche(){
  const e=byId(fiche);if(!e)return;
  view.innerHTML=`<div class="fiche ${e.type}"><div class="bar"><button class="back" id="back" type="button"><span aria-hidden="true">‹</span>Retour</button><span class="kind">${TYPES[e.type]}</span></div>
<header class="dhead"><p class="eyebrow">${esc(longDate(e._d))}</p><h1 class="dtitle">${esc(e.titre)}</h1>${e.contexte?`<p class="ctx">${esc(e.contexte)}</p>`:''}
${e._sym.length?`<div class="for" aria-label="Pour">${e._sym.map(s=>`<span>${esc(SYM[s].nom)}</span>`).join('')}</div>`:''}${prinHTML(e)}</header>
${e.type==='protocole'?protoHTML(e):recipeHTML(e)}</div>`;
  T.forEach((t,k)=>{if(t.eid===e.id)updT(k);});
  counts(e.id);
}

/* ---------- Rendu et navigation ---------- */
function render(){
  document.querySelectorAll('.tab').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(!DATA){
    view.innerHTML=loadError?'<p class="msg">Le contenu n\'a pas pu se charger. Vérifie ta connexion et rouvre l\'appli.</p>':'<p class="msg" style="border:0">Ouverture du carnet…</p>';
    return;
  }
  if(fiche&&byId(fiche))renderFiche();
  else{fiche=null;({carnet:renderCarnet,cuisine:renderCuisine,symptomes:renderSym,infos:renderInfos})[tab]();}
  mini();
}
function goTab(t){
  if(!TABS.includes(t))return;
  if(!fiche)scrollMem[tab]=window.scrollY;
  const same=t===tab&&!fiche;
  tab=t;fiche=null;store('ys.onglet',t);
  try{history.replaceState(null,'','#'+t);}catch(e){}
  render();
  window.scrollTo(0,same?0:(scrollMem[t]||0));
}
function openFiche(id){
  scrollMem[tab]=window.scrollY;fiche=id;
  try{history.pushState({ys:id},'','#f-'+id);}catch(e){}
  render();window.scrollTo(0,0);
  const b=$('#back');if(b)b.focus({preventScroll:true});
}
function closeFiche(){
  fiche=null;try{history.replaceState(null,'','#'+tab);}catch(e){}
  render();window.scrollTo(0,scrollMem[tab]||0);
}
function goBack(){
  if(history.state&&history.state.ys){try{history.back();return;}catch(e){}}
  closeFiche();
}
window.addEventListener('popstate',()=>{
  const h=decodeURIComponent((location.hash||'').slice(1));
  if(h.startsWith('f-')&&byId(h.slice(2))){fiche=h.slice(2);render();window.scrollTo(0,0);return;}
  fiche=null;if(TABS.includes(h))tab=h;
  render();window.scrollTo(0,scrollMem[tab]||0);
});

/* ---------- Minuteurs ---------- */
function ensureT(key,o){
  const t=T.get(key);
  if(t&&t.base===o.total){t.title=o.title;t.labels=o.labels;t.b=o.b;return t;}
  if(t&&act===key)stop();
  const n={key,eid:o.eid,kind:o.kind,title:o.title,labels:o.labels,b:o.b,base:o.total,total:o.total,rem:o.total,run:false,done:false,side:0};
  T.set(key,n);return n;
}
function fmt(sec){
  sec=Math.max(0,Math.ceil(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60,p=x=>String(x).padStart(2,'0');
  return h?`${h}:${p(m)}:${p(s)}`:`${m}:${p(s)}`;
}
function sel(key){return document.querySelector(`[data-tk="${key.replace(/["\\]/g,'\\$&')}"]`);}
function updT(key){
  const t=T.get(key);if(!t)return;
  const btn=sel(key);
  if(btn){
    const cardEl=btn.closest('[data-card]');
    cardEl.classList.toggle('running',t.run);cardEl.classList.toggle('done',t.done);
    btn.style.setProperty('--p',t.done?1:Math.min(1,Math.max(0,1-t.rem/t.total)));
    let s=t.kind==='pt'?(t.b?t.labels[t.side]:'Point central'):'Minuteur',h;
    if(t.done){s='Terminé';h=t.kind==='pt'?(t.b?'Les deux côtés sont faits':'Point fait'):'Étape terminée';}
    else if(t.run)h='En cours, touche pour mettre en pause';
    else if(t.rem<t.total)h='En pause, touche pour reprendre';
    else h=(t.b&&t.side===1)?'Touche pour lancer la symétrie':'Touche pour lancer';
    btn.querySelector('.s').textContent=s;
    btn.querySelector('.h').textContent=h;
    btn.querySelector('.time').textContent=t.done?'✓':fmt(t.rem);
    btn.setAttribute('aria-label',`${t.title}, ${s}, ${t.done?'':fmt(t.rem)+', '}${h}`);
    if(t.kind==='pt'){
      const d=cardEl.querySelectorAll('.dot');
      if(t.b&&d.length===2){d[0].classList.toggle('ok',t.side>0||t.done);d[1].classList.toggle('ok',t.done);}
      else if(d[0])d[0].classList.toggle('ok',t.done);
    }
  }
  if(t.kind==='pt')counts(t.eid);
  mini();
}
function counts(eid){
  const el=document.querySelector(`[data-count="${eid.replace(/["\\]/g,'\\$&')}"]`);if(!el)return;
  let n=0,d=0;T.forEach(t=>{if(t.eid===eid&&t.kind==='pt'){n++;if(t.done)d++;}});
  el.textContent=`${d} / ${n} faits`;
}
function audio(){try{if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){}}
function beep(n,f){if(!ac)return;try{for(let k=0;k<n;k++){const t=ac.currentTime+k*.42,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.35,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.36);}}catch(e){}}
function buzz(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}
async function lock(){try{if('wakeLock' in navigator&&!wl){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null;});}}catch(e){}}
function unlock(){try{if(wl&&!act){wl.release();wl=null;}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&act)lock();});
function stop(){if(act){const t=T.get(act);if(t)t.run=false;}act=null;clearInterval(iv);iv=null;}
function start(key){
  const t=T.get(key);if(!t||t.done)return;
  if(act&&act!==key){const prev=act;stop();updT(prev);}
  audio();t.run=true;act=key;last=performance.now();
  if(!iv)iv=setInterval(loop,200);
  lock();updT(key);
}
function pause(key){const t=T.get(key);if(!t)return;if(act===key)stop();t.run=false;unlock();updT(key);}
function loop(){
  if(!act)return;
  const t=T.get(act);if(!t){stop();return;}
  const now=performance.now();t.rem-=(now-last)/1000;last=now;
  if(t.rem<=0)finish(act);else updT(act);
}
function finish(key){
  const t=T.get(key);stop();
  if(t.kind==='pt'&&t.b&&t.side===0){t.side=1;t.rem=t.total;beep(2,660);buzz([150,80,150]);updT(key);return;}
  t.done=true;t.rem=0;beep(3,880);buzz([200,100,200,100,300]);updT(key);unlock();
  if(t.kind==='pt'&&fiche===t.eid){
    const cards=[...view.querySelectorAll('.pt[data-card]')];
    const i=cards.findIndex(c=>c.dataset.card===key);
    const next=cards.slice(i+1).find(c=>{const x=T.get(c.dataset.card);return x&&!x.done;});
    if(next)next.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
  }
}
function toggle(key){const t=T.get(key);if(!t||t.done)return;t.run?pause(key):start(key);}
function redo(key){const t=T.get(key);if(!t)return;if(act===key)stop();Object.assign(t,{run:false,done:false,side:0,total:t.base,rem:t.base});unlock();updT(key);}
function plus(key){const t=T.get(key);if(!t)return;if(t.done){t.done=false;t.total=300;t.rem=300;}else{t.total+=300;t.rem+=300;}updT(key);}
function resetEntry(eid){
  T.forEach((t,k)=>{if(t.eid===eid&&t.kind==='pt'){if(act===k)stop();Object.assign(t,{run:false,done:false,side:0,total:t.base,rem:t.base});updT(k);}});
  unlock();window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});
}
function mini(){
  const bar=$('#mini'),t=act&&T.get(act);
  if(!t||t.eid===fiche){bar.hidden=true;return;}
  bar.hidden=false;
  $('#mini-title').textContent=t.title+(t.kind==='pt'&&t.b?' · '+t.labels[t.side].toLowerCase():'');
  $('#mini-time').textContent=fmt(t.rem);
}

/* ---------- Interactions ---------- */
function toggleIn(set,id,key){set.has(id)?set.delete(id):set.add(id);store(key,JSON.stringify([...set]));}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  const d=b.dataset;
  if(d.tab){goTab(d.tab);return;}
  if(d.open){openFiche(d.open);return;}
  if(b.id==='back'){goBack();return;}
  if(d.f){filter=d.f;store('ys.filtre',filter);renderTimeline();return;}
  if(d.tk){toggle(d.tk);return;}
  if(d.redo){redo(d.redo);return;}
  if(d.plus){plus(d.plus);return;}
  if(d.reset){resetEntry(d.reset);return;}
  if(d.ing){toggleIn(have,d.ing,'ys.cuisine');const y=window.scrollY;renderCuisine();window.scrollTo(0,y);const c=view.querySelector(`[data-ing="${d.ing}"]`);if(c)c.focus({preventScroll:true});return;}
  if(d.sym){toggleIn(symSel,d.sym,'ys.symptomes');const y=window.scrollY;renderSym();window.scrollTo(0,y);const c=view.querySelector(`[data-sym="${d.sym}"]`);if(c)c.focus({preventScroll:true});return;}
  if(d.clear==='ing'){have.clear();store('ys.cuisine','[]');renderCuisine();return;}
  if(d.clear==='sym'){symSel.clear();store('ys.symptomes','[]');renderSym();return;}
  if(d.install&&installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;if(tab==='infos'&&!fiche)renderInfos();});return;}
  if(d.serv&&fiche){
    const e=byId(fiche);if(!e)return;
    const base=Math.max(1,+e.portions||1);
    portions[e.id]=Math.min(12,Math.max(1,(portions[e.id]||base)+(+d.serv)));
    const y=window.scrollY;renderFiche();window.scrollTo(0,y);
    const s=view.querySelector(`[data-serv="${d.serv}"]`);if(s&&!s.disabled)s.focus({preventScroll:true});
    return;
  }
  if(b.id==='mini-open'&&act){
    const t=T.get(act);if(!t)return;const key=act;
    openFiche(t.eid);
    const el=sel(key);if(el)el.closest('[data-card]').scrollIntoView({block:'center'});
  }
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;if(tab==='infos'&&!fiche&&DATA)renderInfos();});

/* ---------- Démarrage ---------- */
(function initRoute(){
  const h=decodeURIComponent((location.hash||'').slice(1));
  if(TABS.includes(h))tab=h;
  else if(h.startsWith('f-'))fiche=h.slice(2);
})();
render();
loadData().then(d=>{
  DATA=d||{};
  SYM={};(Array.isArray(DATA.symptomes)?DATA.symptomes:[]).forEach(s=>{if(s&&s.id)SYM[s.id]=s;});
  INGC={};(Array.isArray(DATA.ingredients)?DATA.ingredients:[]).forEach(i=>{if(i&&i.id)INGC[i.id]=i.nom;});
  fiches=(Array.isArray(DATA.fiches)?DATA.fiches:[]).map(norm).filter(Boolean)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(+a.ordre||0)-(+b.ordre||0)||String(a.titre).localeCompare(String(b.titre),'fr'));
  if(fiche&&!byId(fiche))fiche=null;
  render();
}).catch(()=>{loadError=true;render();});

if('serviceWorker' in navigator&&!window.YS_DATA&&location.protocol==='https:'){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}
})();

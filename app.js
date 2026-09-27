/* Carnet Yang Sheng : logique de l'appli */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JOURS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const JOURS_C=['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
const TYPES={protocole:'Protocole',recette:'Recette'};
const TECH={d:['↺','Pression forte, rotation anti-horaire'],t:['↻','Pression douce, rotation horaire'],w:['♨︎','Moxa à 2-3 cm ou bouillotte, jusqu\'à chaleur agréable']};
const PHASE={d:'Disperser',t:'Tonifier',w:'Réchauffer (moxa ou bouillotte)'};
const SIDE=['Côté gauche','Côté droit'];
const UNIT={g:'g',kg:'kg',ml:'ml',cl:'cl',l:'l',tsp:'c. à café',tbsp:'c. à soupe',pinch:'pincée',cup:'tasse'};
const TABS=['symptomes','tableaux','cuisine','carnet','infos'];
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const standalone=window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true);
if(standalone)document.documentElement.classList.add('standalone');

function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
function storedJSON(k,def){try{const v=JSON.parse(store(k)||'null');return v==null?def:v;}catch(e){return def;}}
function storedSet(k){const a=storedJSON(k,[]);return new Set(Array.isArray(a)?a:[]);}
function saveSet(k,s){store(k,JSON.stringify([...s]));}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

/* ---------- État ---------- */
const view=$('#view');
let DATA=null,loadError=false,fiches=[],tableaux=[],SYM={},SYMCATS=[],ORG={},ORGS=[],AXES=[],INGC={},INGCATS=[],PTS={};
let tab=TABS.includes(store('ys.onglet'))?store('ys.onglet'):'symptomes';
let route=null;
const scrollMem={};
let filter=store('ys.filtre')||'tout';if(!['tout','protocole','recette','favoris'].includes(filter))filter='tout';
let query='',symQuery='',tabQuery='';
let symMode='choisir',showAll=false;
const openCats=new Set();
const have=storedSet('ys.cuisine');
const symSel=storedSet('ys.symptomes');
let favs=storedJSON('ys.favoris',[]);if(!Array.isArray(favs))favs=[];
let varPref=store('ys.variante')||'cuiseur';
const recVar={},portions={};
let installEvt=null;
const T=new Map();
let act=null,iv=null,last=0,ac=null,wl=null;

/* ---------- Données ---------- */
function parseDate(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function longDate(d){return d?`${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`:'';}
function fold(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function hayOf(parts){const h=fold(parts.filter(Boolean).join(' '));return h+' '+h.replace(/\s+/g,'');}
function matchQ(hay,q){q=fold(q).trim();if(!q)return true;return hay.includes(q)||hay.includes(q.replace(/\s+/g,''));}
function resolveItem(it,m){
  const o=Object.assign({m},it);
  if(it.p){
    const b=PTS[it.p]||{};
    o.ab=it.p;o.py=it.py||b.py||it.p;o.zh=it.zh||b.zh;o.loc=it.loc||b.loc;o.act=it.pourquoi||it.act||b.act;
    o.b=it.b!==undefined?it.b:b.b;o.grossesse=b.grossesse;o.dos=b.dos;
  }
  return o;
}
function phasesOf(e){
  e._items=[];
  e._phases=(Array.isArray(e.phases)?e.phases:[]).map(ph=>{
    const m=TECH[ph.m]?ph.m:'d';
    const items=(Array.isArray(ph.items)?ph.items:[]).map(it=>resolveItem(it,m));
    e._items.push(...items);
    return {m,titre:ph.titre,items};
  });
}
function normFiche(d){
  if(!d||!d.id||!TYPES[d.type])return null;
  const e=Object.assign({},d,{kind:'f'});
  e._d=parseDate(e.date);
  phasesOf(e);
  e._sym=(Array.isArray(e.symptomes)?e.symptomes:[]).filter(s=>SYM[s]);
  e._keys=[...new Set((e.ingredients||[]).filter(i=>i&&i.cle&&!i.base).map(i=>i.cle))];
  e._var=Array.isArray(e.variantes)&&e.variantes.length?e.variantes:(Array.isArray(e.etapes)?[{id:'base',nom:'',etapes:e.etapes}]:[]);
  e._tab=[];
  e._hay=hayOf([e.titre,e.contexte,(e.tags||[]).join(' '),e._sym.map(s=>SYM[s].nom).join(' '),e.principe&&[e.principe.zh,e.principe.py,e.principe.fr].join(' '),
    e._items.map(it=>[it.ab,it.py,it.zh].join(' ')).join(' '),(e.ingredients||[]).map(i=>i.nom).join(' '),(e.produits||[]).map(x=>x.nom).join(' ')]);
  return e;
}
function normTableau(d){
  if(!d||!d.id||!d.nom)return null;
  const t=Object.assign({},d,{kind:'t'});
  phasesOf(t);
  t._cle=(t.cle||[]).filter(s=>SYM[s]);t._autres=(t.autres||[]).filter(s=>SYM[s]);t._contre=(t.contre||[]).filter(s=>SYM[s]);
  t._org=ORG[t.organe]||{nom:'',zh:''};
  t._hay=hayOf([t.nom,t.zh,t.py,t.resume,t._org.nom,t.principe&&[t.principe.zh,t.principe.py,t.principe.fr].join(' '),
    [...t._cle,...t._autres].map(s=>SYM[s].nom).join(' '),t._items.map(it=>[it.ab,it.py].join(' ')).join(' ')]);
  return t;
}
function fiche(id){return fiches.find(e=>e.id===id);}
function tableau(id){return tableaux.find(e=>e.id===id);}
function item(kind,id){return kind==='t'?tableau(id):fiche(id);}
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

/* ---------- Favoris ---------- */
function isFav(k,id){return favs.some(f=>f.k===k&&f.id===id);}
function toggleFav(k,id){
  if(isFav(k,id))favs=favs.filter(f=>!(f.k===k&&f.id===id));
  else favs.unshift({k,id,d:today()});
  store('ys.favoris',JSON.stringify(favs));
}

/* ---------- Éléments communs ---------- */
const SEAL='<div class="seal" lang="zh-Hans" aria-hidden="true"><span>养</span><span>生</span></div>';
function plural(n,s,p){return n+' '+(n>1?p:s);}
function symName(id){return SYM[id]?SYM[id].nom:id;}
function cardF(e,extra){
  const live=act&&T.get(act)&&T.get(act).eid===e.id;
  return `<button type="button" class="entry ${e.type}" data-open="${esc(e.id)}" aria-label="${esc(TYPES[e.type]+', '+e.titre)}">
<span class="txt"><span class="kind">${TYPES[e.type]}${live?'<span class="live">en cours</span>':''}</span><span class="etitle">${esc(e.titre)}</span><span class="emeta">${esc(meta(e))}</span>${extra||''}</span>
${e.principe&&e.principe.zh?`<span class="eprin" lang="zh-Hans" aria-hidden="true">${esc(e.principe.zh)}</span>`:''}
</button>`;
}
function cardT(t,extra,noResume){
  const live=act&&T.get(act)&&T.get(act).eid===t.id;
  return `<button type="button" class="entry tableau" data-opent="${esc(t.id)}" aria-label="${esc('Tableau, '+t.nom)}">
<span class="txt"><span class="kind">${esc(t._org.nom)}${live?'<span class="live">en cours</span>':''}</span><span class="etitle">${esc(t.nom)}</span>${noResume?'':`<span class="emeta clamp">${esc(t.resume||'')}</span>`}${extra||''}</span>
${t.zh?`<span class="eprin" lang="zh-Hans" aria-hidden="true">${esc(t.zh)}</span>`:''}
</button>`;
}
function searchBox(id,val,ph,label){
  return `<label class="find" for="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input id="${id}" type="search" value="${esc(val)}" placeholder="${esc(ph)}" autocomplete="off" aria-label="${esc(label)}"></label>`;
}
function symChip(id){return `<button type="button" class="chip" data-sym="${esc(id)}" aria-pressed="${symSel.has(id)}">${esc(symName(id))}</button>`;}

/* ---------- Symptômes ---------- */
function matchTableaux(){
  return tableaux.map(t=>{
    let got=0,tot=0,cleGot=0;const m=[];
    t._cle.forEach(s=>{tot+=2;if(symSel.has(s)){got+=2;cleGot++;m.push(s);}});
    t._autres.forEach(s=>{tot+=1;if(symSel.has(s)){got+=1;m.push(s);}});
    const contra=t._contre.filter(s=>symSel.has(s));
    const score=got-1.5*contra.length,cov=tot?got/tot:0;
    return {t,got,tot,cleGot,m,contra,score,cov,rank:score+4*cov};
  }).filter(r=>r.m.length&&r.score>0&&(r.cleGot>=1||r.m.length>=2)).sort((a,b)=>b.rank-a.rank);
}
function force(r){
  if(r.cleGot>=2&&r.cov>=0.4)return['forte','Correspondance forte'];
  if(r.score>=3)return['moyenne','Correspondance moyenne'];
  return['faible','Piste possible'];
}
function renderSym(){
  if(symMode==='resultats'&&symSel.size)return renderSymResults();
  const sel=[...symSel].filter(s=>SYM[s]);
  let h=`<h1 class="vh">Symptômes</h1><p class="lede">Coche ce que tu ressens, même un peu. L'appli cherche les tableaux de la médecine chinoise qui te ressemblent.</p>
<div class="tools">${searchBox('sq',symQuery,'Chercher un symptôme','Chercher un symptôme')}</div>`;
  if(sel.length)h+=`<div class="picked"><div class="picked-h"><span>${plural(sel.length,'symptôme choisi','symptômes choisis')}</span><button type="button" class="linkbtn" data-clear="sym">Tout effacer</button></div><div class="chips">${sel.map(symChip).join('')}</div></div>`;
  h+='<div id="symlist"></div>';
  const n=sel.length?matchTableaux().length:0;
  if(sel.length)h+=`<div class="cta-wrap"><button type="button" class="cta" data-mode="resultats">${n?`Voir ${plural(n,'tableau','tableaux')}`:'Voir les résultats'} <span aria-hidden="true">→</span></button></div>`;
  view.innerHTML=h;
  const q=$('#sq');q.addEventListener('input',()=>{symQuery=q.value;renderSymList();});
  renderSymList();
}
function renderSymList(){
  const box=$('#symlist');if(!box)return;
  const q=symQuery.trim();
  if(q){
    const hits=Object.values(SYM).filter(s=>matchQ(fold(s.nom)+' '+fold(s.nom).replace(/\s+/g,''),q));
    box.innerHTML=hits.length?`<div class="chips">${hits.map(s=>symChip(s.id)).join('')}</div>`:`<p class="msg">Aucun symptôme ne correspond à « ${esc(q)} ».</p>`;
    return;
  }
  box.innerHTML=SYMCATS.map(c=>{
    const list=Object.values(SYM).filter(s=>s.cat===c.id);if(!list.length)return'';
    const k=list.filter(s=>symSel.has(s.id)).length;
    return `<details class="cat" data-cat="${esc(c.id)}"${openCats.has(c.id)?' open':''}><summary><span>${esc(c.nom)}</span>${k?`<span class="cat-n">${k}</span>`:''}</summary><div class="chips">${list.map(s=>symChip(s.id)).join('')}</div></details>`;
  }).join('');
  box.querySelectorAll('details.cat').forEach(d=>d.addEventListener('toggle',()=>{d.open?openCats.add(d.dataset.cat):openCats.delete(d.dataset.cat);}));
}
function renderSymResults(){
  const sel=[...symSel].filter(s=>SYM[s]);
  const res=matchTableaux();
  let h=`<div class="bar"><button class="back" type="button" data-mode="choisir"><span aria-hidden="true">‹</span>Modifier</button><span class="kind">${plural(sel.length,'symptôme','symptômes')}</span></div>
<h1 class="vh" style="margin-top:18px">Tes résultats</h1>
<div class="chips small">${sel.map(s=>`<button type="button" class="chip" data-sym="${esc(s)}" aria-pressed="true" aria-label="Retirer ${esc(symName(s))}">${esc(symName(s))}</button>`).join('')}</div>`;
  const alerts=sel.filter(s=>SYM[s].alerte);
  if(alerts.length)h+=`<div class="alert" role="note"><h2>Quand consulter</h2><ul>${alerts.map(s=>`<li><b>${esc(SYM[s].nom)}.</b> ${esc(SYM[s].alerte)}</li>`).join('')}</ul></div>`;
  if(!res.length){
    h+='<p class="msg">Pas encore de tableau qui correspond. Ajoute d\'autres symptômes, ou regarde les tableaux par organe.</p>';
  }else{
    const shown=showAll?res:res.slice(0,5);
    h+=`<h2 class="results-h">${plural(res.length,'tableau possible','tableaux possibles')}</h2><div class="entries">`;
    shown.forEach(r=>{
      const [cls,lab]=force(r);
      const miss=r.t._cle.filter(s=>!symSel.has(s)).slice(0,4);
      const extra=`<span class="match"><span class="force ${cls}">${lab}</span><span class="emeta">${r.m.length} signe${r.m.length>1?'s':''} sur ${r.t._cle.length+r.t._autres.length}</span></span><span class="emiss">Tu as : ${esc(r.m.map(s=>symName(s).toLowerCase()).join(', '))}</span>${r.contra.length?`<span class="emiss">Mais : ${esc(r.contra.map(s=>symName(s).toLowerCase()).join(', '))}</span>`:''}`;
      h+=`<div class="result">${cardT(r.t,extra,true)}${miss.length?`<div class="verify"><span>Signes clés à vérifier</span><div class="chips small">${miss.map(s=>`<button type="button" class="chip add" data-sym="${esc(s)}" aria-pressed="false">+ ${esc(symName(s))}</button>`).join('')}</div></div>`:''}</div>`;
    });
    h+='</div>';
    if(res.length>5&&!showAll)h+=`<button type="button" class="ghost wide" data-more="1">Voir les ${res.length-5} autres</button>`;
    const recs=[],prots=[];
    res.slice(0,3).forEach(r=>{(r.t.recettes||[]).forEach(id=>{const e=fiche(id);if(e&&!recs.includes(e))recs.push(e);});(r.t.fiches||[]).forEach(id=>{const e=fiche(id);if(e&&!prots.includes(e))prots.push(e);});});
    fiches.filter(e=>e.type==='protocole'&&e._sym.some(s=>symSel.has(s))).forEach(e=>{if(!prots.includes(e))prots.push(e);});
    if(recs.length)h+=`<h2 class="results-h">Recettes adaptées</h2><div class="entries">${recs.slice(0,6).map(e=>cardF(e)).join('')}</div>`;
    if(prots.length)h+=`<h2 class="results-h">Protocoles complets</h2><div class="entries">${prots.map(e=>cardF(e)).join('')}</div>`;
  }
  h+='<p class="fine">Ces correspondances orientent ta pratique de bien-être selon la médecine traditionnelle chinoise. Elles ne sont pas un diagnostic et ne remplacent pas un avis médical.</p>';
  view.innerHTML=h;
}

/* ---------- Tableaux ---------- */
function renderTableaux(){
  view.innerHTML=`<h1 class="vh">Tableaux</h1><p class="lede">Les grands tableaux de la médecine chinoise, organe par organe, avec leurs points et leurs recettes.</p>
<div class="tools">${searchBox('tq',tabQuery,'Chercher un tableau, un organe, un point','Chercher un tableau')}</div><div id="tablist"></div>`;
  const q=$('#tq');q.addEventListener('input',()=>{tabQuery=q.value;renderTabList();});
  renderTabList();
}
function renderTabList(){
  const box=$('#tablist');if(!box)return;
  let h='',n=0;
  ORGS.forEach(o=>{
    const list=tableaux.filter(t=>t.organe===o.id&&matchQ(t._hay,tabQuery));
    if(!list.length)return;n+=list.length;
    h+=`<h2 class="org"><span class="org-zh" lang="zh-Hans">${esc(o.zh||'')}</span><span>${esc(o.nom)}</span><span class="org-n">${list.length}</span></h2><div class="entries">${list.map(t=>cardT(t)).join('')}</div>`;
  });
  box.innerHTML=n?h:`<p class="msg">Aucun tableau ne correspond à « ${esc(tabQuery.trim())} ».</p>`;
}
function signChips(list,key){
  return list.map(s=>`<button type="button" class="chip sign${key?' key':''}" data-sym="${esc(s)}" aria-pressed="${symSel.has(s)}">${esc(symName(s))}</button>`).join('');
}
function renderTableauDetail(t){
  const favd=isFav('t',t.id);
  let h=`<div class="fiche tableau">${barHTML('t',t.id,favd,t._org.nom)}
<header class="dhead"><p class="eyebrow">${esc(t._org.nom)}</p><h1 class="dtitle">${esc(t.nom)}</h1>
<p class="sub"><span lang="zh-Hans">${esc(t.zh||'')}</span>${t.py?` · ${esc(t.py)}`:''}</p>
${t.resume?`<p class="ctx">${esc(t.resume)}</p>`:''}</header>`;
  if(t.consulter)h+=`<div class="alert" role="note"><h2>Avis médical</h2><p>${esc(t.consulter)}</p></div>`;
  if(Array.isArray(t.causes)&&t.causes.length)h+=`<h2 class="sec">Causes fréquentes</h2><ul class="bullets">${t.causes.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`;
  if(t.mecanisme)h+=`<h2 class="sec">Ce qui se passe</h2><p class="prose">${esc(t.mecanisme)}</p>`;
  h+=`<h2 class="sec">Signes</h2><p class="hint">Les signes clés sont en gras. Touche un signe pour l'ajouter à tes symptômes.</p><div class="chips">${signChips(t._cle,true)}${signChips(t._autres,false)}</div>`;
  h+=`<dl class="kv tongue">${t.langue?`<dt>Langue</dt><dd>${esc(t.langue)}</dd>`:''}${t.pouls?`<dt>Pouls</dt><dd>${esc(t.pouls)}</dd>`:''}</dl>`;
  h+=prinHTML(t);
  if(t._items.length){
    h+='<h2 class="sec">Points d\'auto-massage</h2>';
    if(t.moxa)h+=`<p class="hint">${esc(t.moxa)}</p>`;
    h+=protoHTML(t);
  }
  const recs=(t.recettes||[]).map(fiche).filter(Boolean);
  if(recs.length)h+=`<h2 class="sec">Recettes adaptées</h2><div class="entries">${recs.map(e=>cardF(e)).join('')}</div>`;
  const prots=(t.fiches||[]).map(fiche).filter(Boolean);
  if(prots.length)h+=`<h2 class="sec">Protocole complet</h2><div class="entries">${prots.map(e=>cardF(e)).join('')}</div>`;
  if(t.privilegier||t.eviter)h+=`<h2 class="sec">Alimentation et hygiène de vie</h2><div class="dual">${t.privilegier?`<div class="card good"><h3>À privilégier</h3><p>${esc(t.privilegier)}</p></div>`:''}${t.eviter?`<div class="card bad"><h3>À éviter</h3><p>${esc(t.eviter)}</p></div>`:''}</div>`;
  if(Array.isArray(t.conseils)&&t.conseils.length)h+=`<h2 class="sec">Conseils</h2><ul class="bullets">${t.conseils.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`;
  h+='<p class="fine">Ce tableau décrit un déséquilibre selon la médecine traditionnelle chinoise. Il ne remplace pas un avis médical.</p></div>';
  view.innerHTML=h;
  afterDetail(t);
}

/* ---------- Cuisine ---------- */
function renderCuisine(){
  const recs=fiches.filter(e=>e.type==='recette');
  let h=`<h1 class="vh">Cuisine</h1><p class="lede">Diététique chinoise au quotidien, à la casserole, au cuiseur ou à la cocotte.</p>
<details class="cat pick" data-cat="_ing"${openCats.has('_ing')||have.size?' open':''}><summary><span>J'ai dans ma cuisine…</span>${have.size?`<span class="cat-n">${have.size}</span>`:''}</summary>
${INGCATS.map(c=>{const list=Object.values(INGC).filter(i=>i.cat===c.id);return list.length?`<p class="subcat">${esc(c.nom)}</p><div class="chips och">${list.map(i=>`<button type="button" class="chip" data-ing="${esc(i.id)}" aria-pressed="${have.has(i.id)}">${esc(i.nom)}</button>`).join('')}</div>`:'';}).join('')}
${have.size?'<button type="button" class="linkbtn" data-clear="ing">Tout décocher</button>':''}
<p class="fine">L'eau, le sel, l'huile, la sauce soja et le sucre sont comptés d'office.</p></details>`;
  if(have.size){
    const m=recs.map(e=>({e,got:e._keys.filter(k=>have.has(k))})).filter(r=>r.got.length).sort((a,b)=>(b.got.length/b.e._keys.length)-(a.got.length/a.e._keys.length)||b.got.length-a.got.length);
    h+=`<h2 class="results-h">${m.length?'Avec tes ingrédients':'Aucune recette avec ces ingrédients'}</h2>`;
    if(m.length)h+='<div class="entries">'+m.map(r=>{
      const miss=r.e._keys.filter(k=>!have.has(k)).map(k=>(INGC[k]?INGC[k].nom:k).toLowerCase());
      return cardF(r.e,`<span class="ematch">Tu as ${r.got.length} ingrédient${r.got.length>1?'s':''} sur ${r.e._keys.length}</span><span class="emiss">${miss.length?'Il manque : '+esc(miss.join(', ')):'Tu as tout ce qu\'il faut'}</span>`);
    }).join('')+'</div>';
  }
  h+='<h2 class="results-h">Toutes les recettes</h2>';
  AXES.forEach(a=>{
    const list=recs.filter(e=>e.axe===a.id);if(!list.length)return;
    h+=`<h3 class="axe"><span class="org-zh" lang="zh-Hans">${esc(a.zh||'')}</span>${esc(a.nom)}</h3><div class="entries">${list.map(e=>cardF(e)).join('')}</div>`;
  });
  const other=recs.filter(e=>!AXES.some(a=>a.id===e.axe));
  if(other.length)h+=`<h3 class="axe">Autres</h3><div class="entries">${other.map(e=>cardF(e)).join('')}</div>`;
  view.innerHTML=h;
  const d=view.querySelector('details.pick');
  if(d)d.addEventListener('toggle',()=>{d.open?openCats.add('_ing'):openCats.delete('_ing');});
}

/* ---------- Carnet ---------- */
function renderCarnet(){
  view.innerHTML=`<header class="mast">${SEAL}<div><h1>Carnet Yang Sheng</h1><p class="lede">Tes favoris et toutes les fiches, du plus récent au plus ancien.</p></div></header>
<div class="tools">
<div class="seg seg4" role="group" aria-label="Afficher">
<button type="button" data-f="tout">Tout <span class="n"></span></button>
<button type="button" data-f="favoris">Favoris <span class="n"></span></button>
<button type="button" data-f="protocole">Protocoles <span class="n"></span></button>
<button type="button" data-f="recette">Recettes <span class="n"></span></button>
</div>
${searchBox('q',query,'Chercher un point, un plat, un symptôme','Chercher dans le carnet')}
</div>
<div id="timeline" aria-live="polite"></div>`;
  const q=$('#q');q.addEventListener('input',()=>{query=q.value;renderTimeline();});
  renderTimeline();
}
function renderTimeline(){
  const box=$('#timeline');if(!box)return;
  const favItems=favs.map(f=>({f,e:item(f.k,f.id)})).filter(x=>x.e);
  const counts={tout:fiches.length,favoris:favItems.length,protocole:0,recette:0};
  fiches.forEach(e=>counts[e.type]++);
  view.querySelectorAll('.seg button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.f===filter));b.querySelector('.n').textContent=counts[b.dataset.f];});
  let rows;
  if(filter==='favoris'){
    if(!favItems.length){box.innerHTML='<p class="msg">Pas encore de favori. Touche l\'étoile en haut d\'une fiche ou d\'un tableau pour l\'ajouter ici.</p>';return;}
    rows=favItems.filter(x=>matchQ(x.e._hay,query)).map(x=>({date:x.f.d,e:x.e}));
  }else{
    rows=fiches.filter(e=>(filter==='tout'||e.type===filter)&&matchQ(e._hay,query)).map(e=>({date:e.date,e}));
  }
  if(!rows.length){box.innerHTML=`<p class="msg">Aucune fiche ne correspond${query.trim()?` à « ${esc(query.trim())} »`:''}.</p>`;return;}
  let h='',month='',day=null;
  const close=()=>{if(day!==null)h+='</div></section>';};
  rows.forEach(({date,e})=>{
    const d=parseDate(date),mk=d?d.getFullYear()+'-'+d.getMonth():'?',dk=date||'?';
    if(mk!==month){close();day=null;month=mk;h+=`<h2 class="month">${d?MOIS[d.getMonth()]+' '+d.getFullYear():'Sans date'}</h2>`;}
    if(dk!==day){close();day=dk;h+=`<section class="day" aria-label="${esc(longDate(d))}"><div class="date" aria-hidden="true"><span class="d">${d?d.getDate():'–'}</span><span class="w">${d?JOURS_C[d.getDay()]:''}</span></div><div class="entries">`;}
    h+=e.kind==='t'?cardT(e):cardF(e);
  });
  close();
  box.innerHTML=h;
}

/* ---------- Infos ---------- */
const GUIDE=[
 ['Trouver un point : le cun','Le cun est l\'unité de mesure de ton propre corps. 1 cun correspond à la largeur de ton pouce au niveau de l\'articulation. 1,5 cun, c\'est l\'index et le majeur serrés. 3 cun, les quatre doigts serrés au niveau de l\'articulation du milieu. Le bon endroit est souvent un petit creux, un peu plus sensible au toucher.'],
 ['Disperser ou tonifier','Disperser : pression ferme, rotation dans le sens inverse des aiguilles d\'une montre, environ une minute. Pour ce qui est en excès : blocage, chaleur, douleur vive. Tonifier : pression douce, rotation dans le sens des aiguilles d\'une montre, une à deux minutes. Pour ce qui manque : fatigue, froid, vide. Dans une séance, commence toujours par disperser, puis tonifie.'],
 ['La chaleur : moxa ou bouillotte','Le moxa est un bâton d\'armoise qui se consume. Tiens-le à 2 ou 3 cm de la peau et éloigne-le dès que ça pique. Sans moxa, une bouillotte posée sur le point fait déjà du bien. Pas de chaleur en cas de fièvre, de signes de chaleur (langue rouge, soif), ni sur une peau abîmée. Aère la pièce et éteins le moxa en l\'étouffant dans du sel ou du sable, jamais avec de l\'eau sur le bâton encore en main.'],
 ['Précautions','Ne masse pas une plaie, une brûlure, un bouton, une varice ou une zone gonflée et chaude. Enceinte, évite GI 4, Rt 6, VB 21, V 60 et les points du bas-ventre, et demande conseil à un praticien. Si un point fait vraiment mal, allège la pression. Ces routines accompagnent ta santé, elles ne remplacent pas un avis médical.']
];
const LEXIQUE=[
 ['Qi','L\'énergie qui anime et fait fonctionner le corps. Il circule dans les méridiens.'],
 ['Sang','Il nourrit et humidifie les organes, les tissus et l\'esprit. Plus large que le sang au sens occidental.'],
 ['Yin et Yang','Le Yin rafraîchit, humidifie et calme ; le Yang réchauffe, active et fait monter. La santé est leur équilibre.'],
 ['Vide et plénitude','Vide : quelque chose manque (Qi, Sang, Yin, Yang). Plénitude : quelque chose est en trop ou bloqué (Froid, Chaleur, Humidité, stagnation).'],
 ['Humidité','Une accumulation lourde et collante : lourdeur, ballonnements, enduit épais sur la langue.'],
 ['Mucosités','De l\'Humidité épaissie : glaires, gorge encombrée, parfois esprit embrumé.'],
 ['Chaleur et Froid','La Chaleur rougit, assèche et agite. Le Froid contracte, ralentit et fait mal, et la chaleur le soulage.'],
 ['Vent','Ce qui arrive vite et bouge : début de rhume, démangeaisons qui changent de place, douleurs qui se déplacent.'],
 ['Shen','L\'esprit, qui loge dans le Cœur : sommeil, mémoire, humeur.'],
 ['Jing','L\'essence profonde, stockée dans le Rein : croissance, vitalité, vieillissement.']
];
function renderInfos(){
  const nP=fiches.filter(e=>e.type==='protocole').length,nR=fiches.length-nP;
  let inst;
  if(standalone)inst='<p>L\'appli est installée sur ce téléphone.</p>';
  else if(installEvt)inst='<p>Ajoute Carnet Yang Sheng à tes applis pour l\'ouvrir d\'un appui, même sans connexion.</p><button type="button" class="primary" data-install="1">Installer l\'appli</button>';
  else inst='<p>Dans Chrome, ouvre le menu ⋮ en haut à droite, puis choisis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».</p>';
  const acc=(list)=>list.map(([t,p])=>`<details class="cat"><summary><span>${esc(t)}</span></summary><p class="prose">${esc(p)}</p></details>`).join('');
  view.innerHTML=`<header class="mast">${SEAL}<div><h1>Carnet Yang Sheng</h1><p class="lede">Version ${esc(DATA.version||'')}</p></div></header>
<section class="card"><h2>À lire avant d'utiliser</h2><p>Carnet Yang Sheng propose des routines de bien-être inspirées de la médecine traditionnelle chinoise : auto-massage de points, chaleur et recettes.</p><p>Ce n'est ni un diagnostic ni un traitement. Si un symptôme dure, s'aggrave ou t'inquiète, consulte un médecin. En urgence, appelle le 15 ou le 112.</p></section>
<h2 class="sec">Bien masser</h2>${acc(GUIDE)}
<h2 class="sec">Petit lexique</h2>${acc(LEXIQUE)}
<section class="card"><h2>Installer sur ton téléphone</h2>${inst}</section>
<section class="card"><h2>Tes données</h2><p>L'appli ne demande aucun compte et ne collecte aucune donnée personnelle. Tes symptômes, tes ingrédients et tes favoris restent sur ce téléphone.</p></section>
<section class="card"><h2>Contenu</h2><dl class="kv"><dt>Symptômes</dt><dd>${Object.keys(SYM).length}</dd><dt>Tableaux</dt><dd>${tableaux.length}</dd><dt>Points</dt><dd>${Object.keys(PTS).length}</dd><dt>Recettes</dt><dd>${nR}</dd><dt>Protocoles</dt><dd>${nP}</dd></dl></section>
<p class="fine">Polices Atkinson Hyperlegible et Noto Serif SC, sous licence SIL Open Font License.</p>`;
}

/* ---------- Fiche ---------- */
function barHTML(k,id,favd,label){
  return `<div class="bar"><button class="back" id="back" type="button"><span aria-hidden="true">‹</span>Retour</button><span class="bar-r"><span class="kind">${esc(label)}</span><button type="button" class="star" data-fav="${k}:${esc(id)}" aria-pressed="${favd}" aria-label="${favd?'Retirer des favoris':'Ajouter aux favoris'}">${favd?'★':'☆'}</button></span></div>`;
}
function prinHTML(e){
  const p=e.principe;if(!p)return'';
  return `<div class="prin">${p.zh?`<span class="pz" lang="zh-Hans">${esc(p.zh)}</span>`:''}<span class="pp">${p.py?`<b>${esc(p.py)}</b>`:''}${p.fr?`<span>${esc(p.fr)}</span>`:''}</span></div>`;
}
function timerBtn(key){return `<button class="timer" type="button" data-tk="${esc(key)}"><span class="lab"><span class="s"></span><span class="h"></span></span><span class="time"></span></button>`;}
function tkey(e,suffix){return e.kind+':'+e.id+'|'+suffix;}
function protoHTML(e){
  const cons=e.consigne||'Une séance par jour. Commence par disperser, puis tonifie. Sur les points doubles, le minuteur se relance pour le côté opposé.';
  let h=`<div class="sum"><p>${e._items.length} ${esc(e.unite||'points')}, environ ${minutes(e)} minutes. ${esc(cons)}</p><div class="hrow"><span class="count" data-count="${esc(e.kind+':'+e.id)}"></span><button class="ghost" type="button" data-reset="${esc(e.kind+':'+e.id)}">Réinitialiser</button></div></div>`;
  let k=0;
  e._phases.forEach(ph=>{
    const m=ph.m;
    h+=`<h3 class="phase ${m}">${esc(ph.titre||PHASE[m])}</h3>`;
    ph.items.forEach(it=>{
      const idx=k++,key=tkey(e,'p'+idx);
      const tech=Array.isArray(it.tech)&&it.tech.length===2?it.tech:TECH[m];
      const labels=Array.isArray(it.sl)&&it.sl.length===2?it.sl:SIDE;
      const showAb=it.ab&&it.ab!==it.py;
      h+=`<article class="pt ${m}" data-card="${esc(key)}">
<div class="meta"><span class="num">${idx+1}</span>${showAb?`<span class="ab">${esc(it.ab)}</span>`:''}</div>
${it.zh?`<div class="pt-zh" lang="zh-Hans" aria-hidden="true">${esc(it.zh)}</div>`:''}
<h4 class="pt-py">${esc(it.py)}</h4>
${it.loc?`<p class="loc"><span class="k">Où</span>${esc(it.loc)}</p>`:''}
${it.act?`<p class="act"><span class="k">Effet</span>${esc(it.act)}</p>`:''}
${it.dos?'<p class="flag soft">Dans le dos : avec une balle contre un mur, ou par un proche.</p>':''}
${it.grossesse?'<p class="flag">À éviter pendant la grossesse.</p>':''}
<p class="tech"><span class="ic" aria-hidden="true">${esc(tech[0])}</span><span>${esc(tech[1])}</span></p>
${timerBtn(key)}
<div class="foot"><div class="dots">${it.b?'<span class="dot">Gauche</span><span class="dot">Droite</span>':'<span class="dot">Centre</span>'}</div><button class="redo" type="button" data-redo="${esc(key)}">Recommencer</button></div>
</article>`;
      ensureT(key,{eid:e.id,ekind:e.kind,kind:'pt',total:Math.max(5,+it.s||60),b:!!it.b,labels,title:(showAb?it.ab+' · ':'')+(it.py||'')});
    });
  });
  if(e.note)h+=`<p class="note">${esc(e.note)}</p>`;
  if(Array.isArray(e.produits)&&e.produits.length)h+='<h3 class="sec">Produits</h3><ul class="prod">'+e.produits.map(p=>`<li><b>${esc(p.nom)}</b><span>${esc(p.texte)}</span></li>`).join('')+'</ul>';
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
function currentVar(e){
  if(!e._var.length)return null;
  const want=recVar[e.id]||varPref;
  return e._var.find(v=>v.id===want)||e._var[0];
}
function recipeHTML(e){
  const base=Math.max(1,+e.portions||1),n=portions[e.id]||base,f=n/base;
  const v=currentVar(e);
  let h='';
  if(e.precautions)h+=`<div class="alert soft" role="note"><h2>Précaution</h2><p>${esc(e.precautions)}</p></div>`;
  if(e.duree)h+=`<p class="device">Durée : ${esc(e.duree)}</p>`;
  if(e._var.length>1)h+=`<div class="seg varseg" role="group" aria-label="Mode de cuisson" style="grid-template-columns:repeat(${e._var.length},minmax(0,1fr))">${e._var.map(x=>`<button type="button" data-var="${esc(e.id)}:${esc(x.id)}" aria-pressed="${x===v}">${esc(x.nom)}</button>`).join('')}</div>`;
  else if(v&&v.nom)h+=`<p class="device">${esc(v.nom)}</p>`;
  h+=`<div class="serv"><span class="serv-l">Portions</span><div class="stepper"><button type="button" data-serv="-1" aria-label="Une portion de moins"${n<=1?' disabled':''}>−</button><output aria-live="polite">${n}</output><button type="button" data-serv="1" aria-label="Une portion de plus"${n>=12?' disabled':''}>+</button></div></div>`;
  h+='<h2 class="sec">Ingrédients</h2><ul class="ing">'+(e.ingredients||[]).map(i=>`<li><span class="q">${esc(qty(i,f).txt)}</span><span>${esc(i.nom)}${i.cle&&have.has(i.cle)?'<span class="have">✓ tu en as</span>':''}${i.note?`<small>${esc(i.note)}</small>`:''}</span></li>`).join('')+'</ul>';
  if(v){
    h+='<h2 class="sec">Étapes</h2><ol class="steps">';
    (v.etapes||[]).forEach((s,i)=>{
      const key=tkey(e,v.id+'|s'+i),has=+s.s>0;
      h+=`<li class="step" data-card="${esc(key)}"><span class="snum" aria-hidden="true">${i+1}</span><div><h3>${esc(s.titre)}</h3><p>${fill(s.texte,e.ingredients,f)}</p>${has?timerBtn(key)+`<div class="foot"><button class="redo" type="button" data-plus="${esc(key)}">Ajouter 5 min</button><button class="redo" type="button" data-redo="${esc(key)}">Recommencer</button></div>`:''}</div></li>`;
      if(has)ensureT(key,{eid:e.id,ekind:'f',kind:'step',total:+s.s,b:false,labels:SIDE,title:s.titre||'Étape '+(i+1)});
    });
    h+='</ol>';
  }
  if(Array.isArray(e.notes)&&e.notes.length)h+='<h2 class="sec">Notes</h2><ul class="bullets">'+e.notes.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
  return h;
}
function renderFicheDetail(e){
  const favd=isFav('f',e.id);
  const tabs=e._tab.map(tableau).filter(Boolean);
  view.innerHTML=`<div class="fiche ${e.type}">${barHTML('f',e.id,favd,TYPES[e.type])}
<header class="dhead"><p class="eyebrow">${esc(e.type==='recette'?((AXES.find(a=>a.id===e.axe)||{}).nom||'Recette'):longDate(e._d))}</p><h1 class="dtitle">${esc(e.titre)}</h1>${e.contexte?`<p class="ctx">${esc(e.contexte)}</p>`:''}
${tabs.length?`<div class="for"><span class="for-l">Conseillé pour</span>${tabs.map(t=>`<button type="button" class="tag" data-opent="${esc(t.id)}">${esc(t.nom)}</button>`).join('')}</div>`:''}
${e._sym.length?`<div class="for">${e._sym.map(s=>`<span class="tag static">${esc(symName(s))}</span>`).join('')}</div>`:''}${prinHTML(e)}</header>
${e.type==='protocole'?protoHTML(e):recipeHTML(e)}</div>`;
  afterDetail(e);
}
function afterDetail(e){
  T.forEach((t,k)=>{if(t.eid===e.id&&t.ekind===e.kind)updT(k);});
  counts(e.kind+':'+e.id);
}

/* ---------- Rendu et navigation ---------- */
function render(){
  document.querySelectorAll('.tab').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(!DATA){
    view.innerHTML=loadError?'<p class="msg">Le contenu n\'a pas pu se charger. Vérifie ta connexion et rouvre l\'appli.</p>':'<p class="msg" style="border:0">Ouverture du carnet…</p>';
    return;
  }
  const e=route&&item(route.kind,route.id);
  if(e){e.kind==='t'?renderTableauDetail(e):renderFicheDetail(e);}
  else{route=null;({symptomes:renderSym,tableaux:renderTableaux,cuisine:renderCuisine,carnet:renderCarnet,infos:renderInfos})[tab]();}
  mini();
}
function rerenderKeep(sel){
  const el=sel&&document.querySelector(sel);const before=el?el.getBoundingClientRect().top:null;const y=window.scrollY;
  render();
  const after=sel&&document.querySelector(sel);
  if(after&&before!==null)window.scrollTo(0,window.scrollY+after.getBoundingClientRect().top-before);else window.scrollTo(0,y);
}
function goTab(t){
  if(!TABS.includes(t))return;
  if(!route)scrollMem[tab]=window.scrollY;
  const same=t===tab&&!route;
  tab=t;route=null;store('ys.onglet',t);
  try{history.replaceState(null,'','#'+t);}catch(e){}
  render();
  window.scrollTo(0,same?0:(scrollMem[t]||0));
}
function openItem(kind,id){
  if(!route)scrollMem[tab]=window.scrollY;
  route={kind,id};
  try{history.pushState({ys:kind+':'+id},'','#'+kind+'-'+id);}catch(e){}
  render();window.scrollTo(0,0);
  const b=$('#back');if(b)b.focus({preventScroll:true});
}
function closeItem(){
  route=null;try{history.replaceState(null,'','#'+tab);}catch(e){}
  render();window.scrollTo(0,scrollMem[tab]||0);
}
function goBack(){
  if(history.state&&history.state.ys){try{history.back();return;}catch(e){}}
  closeItem();
}
function parseHash(){
  const h=decodeURIComponent((location.hash||'').slice(1));
  const m=/^([ft])-(.+)$/.exec(h);
  if(m)return{route:{kind:m[1],id:m[2]}};
  return{tab:TABS.includes(h)?h:null};
}
window.addEventListener('popstate',()=>{
  const p=parseHash();
  if(p.route&&item(p.route.kind,p.route.id)){route=p.route;render();window.scrollTo(0,0);return;}
  route=null;if(p.tab)tab=p.tab;
  render();window.scrollTo(0,scrollMem[tab]||0);
});

/* ---------- Minuteurs ---------- */
function ensureT(key,o){
  const t=T.get(key);
  if(t&&t.base===o.total){t.title=o.title;t.labels=o.labels;t.b=o.b;return t;}
  if(t&&act===key)stop();
  const n={key,eid:o.eid,ekind:o.ekind,kind:o.kind,title:o.title,labels:o.labels,b:o.b,base:o.total,total:o.total,rem:o.total,run:false,done:false,side:0};
  T.set(key,n);return n;
}
function fmt(sec){
  sec=Math.max(0,Math.ceil(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60,p=x=>String(x).padStart(2,'0');
  return h?`${h}:${p(m)}:${p(s)}`:`${m}:${p(s)}`;
}
function q(attr,val){return document.querySelector(`[${attr}="${String(val).replace(/["\\]/g,'\\$&')}"]`);}
function updT(key){
  const t=T.get(key);if(!t)return;
  const btn=q('data-tk',key);
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
  if(t.kind==='pt')counts(t.ekind+':'+t.eid);
  mini();
}
function counts(ref){
  const el=q('data-count',ref);if(!el)return;
  let n=0,d=0;T.forEach(t=>{if(t.ekind+':'+t.eid===ref&&t.kind==='pt'){n++;if(t.done)d++;}});
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
  if(t.kind==='pt'&&route&&route.id===t.eid&&route.kind===t.ekind){
    const cards=[...view.querySelectorAll('.pt[data-card]')];
    const i=cards.findIndex(c=>c.dataset.card===key);
    const next=cards.slice(i+1).find(c=>{const x=T.get(c.dataset.card);return x&&!x.done;});
    if(next)next.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
  }
}
function toggle(key){const t=T.get(key);if(!t||t.done)return;t.run?pause(key):start(key);}
function redo(key){const t=T.get(key);if(!t)return;if(act===key)stop();Object.assign(t,{run:false,done:false,side:0,total:t.base,rem:t.base});unlock();updT(key);}
function plus(key){const t=T.get(key);if(!t)return;if(t.done){t.done=false;t.total=300;t.rem=300;}else{t.total+=300;t.rem+=300;}updT(key);}
function resetEntry(ref){
  T.forEach((t,k)=>{if(t.ekind+':'+t.eid===ref&&t.kind==='pt'){if(act===k)stop();Object.assign(t,{run:false,done:false,side:0,total:t.base,rem:t.base});updT(k);}});
  unlock();window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});
}
function mini(){
  const bar=$('#mini'),t=act&&T.get(act);
  if(!t||(route&&route.id===t.eid&&route.kind===t.ekind)){bar.hidden=true;return;}
  bar.hidden=false;
  $('#mini-title').textContent=t.title+(t.kind==='pt'&&t.b?' · '+t.labels[t.side].toLowerCase():'');
  $('#mini-time').textContent=fmt(t.rem);
}

/* ---------- Interactions ---------- */
function toggleIn(set,id,key){set.has(id)?set.delete(id):set.add(id);saveSet(key,set);}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  const d=b.dataset;
  if(d.tab){goTab(d.tab);return;}
  if(d.open){openItem('f',d.open);return;}
  if(d.opent){openItem('t',d.opent);return;}
  if(b.id==='back'){goBack();return;}
  if(d.mode){symMode=d.mode;showAll=false;render();window.scrollTo(0,0);return;}
  if(d.more){showAll=true;rerenderKeep('[data-more]');return;}
  if(d.f){filter=d.f;store('ys.filtre',filter);renderTimeline();return;}
  if(d.tk){toggle(d.tk);return;}
  if(d.redo){redo(d.redo);return;}
  if(d.plus){plus(d.plus);return;}
  if(d.reset){resetEntry(d.reset);return;}
  if(d.fav){const i=d.fav.indexOf(':');toggleFav(d.fav.slice(0,i),d.fav.slice(i+1));const on=isFav(d.fav.slice(0,i),d.fav.slice(i+1));b.setAttribute('aria-pressed',String(on));b.textContent=on?'★':'☆';b.setAttribute('aria-label',on?'Retirer des favoris':'Ajouter aux favoris');return;}
  if(d.var){const i=d.var.indexOf(':');const id=d.var.slice(0,i),v=d.var.slice(i+1);recVar[id]=v;varPref=v;store('ys.variante',v);rerenderKeep(`[data-var="${d.var.replace(/["\\]/g,'\\$&')}"]`);return;}
  if(d.sym){
    toggleIn(symSel,d.sym,'ys.symptomes');
    if(route){b.setAttribute('aria-pressed',String(symSel.has(d.sym)));return;}
    if(symMode==='resultats'&&!symSel.size)symMode='choisir';
    rerenderKeep(`[data-sym="${d.sym.replace(/["\\]/g,'\\$&')}"]`);
    const c=q('data-sym',d.sym);if(c)c.focus({preventScroll:true});
    return;
  }
  if(d.ing){toggleIn(have,d.ing,'ys.cuisine');rerenderKeep(`[data-ing="${d.ing}"]`);const c=q('data-ing',d.ing);if(c)c.focus({preventScroll:true});return;}
  if(d.clear==='ing'){have.clear();saveSet('ys.cuisine',have);render();return;}
  if(d.clear==='sym'){symSel.clear();saveSet('ys.symptomes',symSel);symMode='choisir';render();return;}
  if(d.install&&installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;if(tab==='infos'&&!route)renderInfos();});return;}
  if(d.serv&&route&&route.kind==='f'){
    const e=fiche(route.id);if(!e)return;
    const base=Math.max(1,+e.portions||1);
    portions[e.id]=Math.min(12,Math.max(1,(portions[e.id]||base)+(+d.serv)));
    rerenderKeep(`[data-serv="${d.serv}"]`);
    const s=q('data-serv',d.serv);if(s&&!s.disabled)s.focus({preventScroll:true});
    return;
  }
  if(b.id==='mini-open'&&act){
    const t=T.get(act);if(!t)return;const key=act;
    openItem(t.ekind,t.eid);
    const el=q('data-tk',key);if(el)el.closest('[data-card]').scrollIntoView({block:'center'});
  }
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;if(tab==='infos'&&!route&&DATA)renderInfos();});

/* ---------- Démarrage ---------- */
(function initRoute(){
  const p=parseHash();
  if(p.route)route=p.route;
  else if(p.tab)tab=p.tab;
  else if(location.hash==='#carnet')tab='carnet';
})();
render();
loadData().then(d=>{
  DATA=d||{};
  PTS=DATA.points&&typeof DATA.points==='object'?DATA.points:{};
  SYM={};(Array.isArray(DATA.symptomes)?DATA.symptomes:[]).forEach(s=>{if(s&&s.id)SYM[s.id]=s;});
  SYMCATS=Array.isArray(DATA.categories_symptomes)?DATA.categories_symptomes:[];
  if(!SYMCATS.length)SYMCATS=[{id:undefined,nom:'Symptômes'}];
  ORGS=Array.isArray(DATA.organes)?DATA.organes:[];ORG={};ORGS.forEach(o=>{ORG[o.id]=o;});
  AXES=Array.isArray(DATA.axes)?DATA.axes:[];
  INGCATS=Array.isArray(DATA.categories_ingredients)?DATA.categories_ingredients:[];
  INGC={};(Array.isArray(DATA.ingredients)?DATA.ingredients:[]).forEach(i=>{if(i&&i.id)INGC[i.id]=i;});
  if(!INGCATS.length)INGCATS=[{id:undefined,nom:''}];
  fiches=(Array.isArray(DATA.fiches)?DATA.fiches:[]).map(normFiche).filter(Boolean)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(+a.ordre||0)-(+b.ordre||0)||String(a.titre).localeCompare(String(b.titre),'fr'));
  tableaux=(Array.isArray(DATA.tableaux)?DATA.tableaux:[]).map(normTableau).filter(Boolean);
  tableaux.forEach(t=>(t.recettes||[]).forEach(id=>{const e=fiche(id);if(e&&!e._tab.includes(t.id))e._tab.push(t.id);}));
  [...symSel].forEach(s=>{if(!SYM[s])symSel.delete(s);});
  [...have].forEach(s=>{if(!INGC[s])have.delete(s);});
  favs=favs.filter(f=>item(f.k,f.id));
  if(symSel.size&&tab==='symptomes'&&!route)symMode='resultats';
  if(route&&!item(route.kind,route.id))route=null;
  render();
}).catch(()=>{loadError=true;render();});

if('serviceWorker' in navigator&&!window.YS_DATA&&location.protocol==='https:'){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}
})();

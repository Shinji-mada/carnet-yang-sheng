/* Carnet Yang Sheng : logique de l'appli */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cssq=s=>String(s).replace(/["\\]/g,'\\$&');
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
function arr(v){return Array.isArray(v)?v:[];}
const J=JSON.stringify;

/* ---------- État ---------- */
const view=$('#view');
let DATA=null,FIGS={},SYMFREQ={},loadError=false,fiches=[],tableaux=[],SYM={},SYMCATS=[],ORG={},ORGS=[],AXES=[],INGC={},INGCATS=[],PTS={};
let tab=TABS.includes(store('ys.onglet'))?store('ys.onglet'):'symptomes';
let route=null;
const scrollMem={};
let filter=store('ys.filtre')||'tout';if(!['tout','protocole','recette'].includes(filter))filter='tout';
let query='',symQuery='',tabQuery='';
let symMode='choisir',showAll=false,openCat=null,ingOpen=false;
const have=storedSet('ys.cuisine');
const symSel=storedSet('ys.symptomes');
let favs=arr(storedJSON('ys.favoris',[]));
let carnets=arr(storedJSON('ys.carnets',[])).filter(c=>c&&c.id&&c.nom).map(c=>({id:c.id,nom:c.nom,items:arr(c.items)}));
let recents=arr(storedJSON('ys.recents',[]));
let masques=arr(storedJSON('ys.masques',[]));
let carnetSel=store('ys.carnet')||'tout';
let auto=store('ys.auto')==='1';
let collOrder=arr(storedJSON('ys.ordre-carnets',[]));
let selMode=false;const selSet=new Set(),manageSel=new Set();
let toutTri=store('ys.tri-tout')==='perso'?'perso':'date';
let toutOrdre=arr(storedJSON('ys.ordre-tout',[]));
let profil=storedJSON('ys.profil',{})||{};
const FB=__FIREBASE__,COMPTE_URL='__COMPTE_URL__';
let user=null,compte=null,compteP=null,syncState='',syncErr='',syncing=false,syncAgain=false,pushT=null,lastSnap='';
let varPref=store('ys.variante')||'cuiseur';
const recVar={},portions={},ingDone={};
let installEvt=null;
const T=new Map();
let act=null,iv=null,last=0,ac=null,wl=null,pendingNext=null;

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
  e._phases=arr(e.phases).map(ph=>{
    const m=TECH[ph.m]?ph.m:'d';
    const items=arr(ph.items).map(it=>resolveItem(it,m));
    e._items.push(...items);
    return {m,titre:ph.titre,items};
  });
}
function normFiche(d){
  if(!d||!d.id||!TYPES[d.type])return null;
  const e=Object.assign({},d,{kind:'f'});
  e._d=parseDate(e.date);
  phasesOf(e);
  e._sym=arr(e.symptomes).filter(s=>SYM[s]);
  e._keys=[...new Set(arr(e.ingredients).filter(i=>i&&i.cle&&!i.base).map(i=>i.cle))];
  e._var=arr(e.variantes).length?e.variantes:(Array.isArray(e.etapes)?[{id:'base',nom:'',etapes:e.etapes}]:[]);
  e._tab=[];
  e._hay=hayOf([e.titre,e.contexte,arr(e.tags).join(' '),e._sym.map(s=>SYM[s].nom).join(' '),e.principe&&[e.principe.zh,e.principe.py,e.principe.fr].join(' '),
    e._items.map(it=>[it.ab,it.py,it.zh].join(' ')).join(' '),arr(e.ingredients).map(i=>i.nom).join(' '),arr(e.produits).map(x=>x.nom).join(' ')]);
  return e;
}
function normTableau(d){
  if(!d||!d.id||!d.nom)return null;
  const t=Object.assign({},d,{kind:'t'});
  phasesOf(t);
  t._cle=arr(t.cle).filter(s=>SYM[s]);t._autres=arr(t.autres).filter(s=>SYM[s]);t._contre=arr(t.contre).filter(s=>SYM[s]);
  t._org=ORG[t.organe]||{nom:'',zh:''};
  t._label=t.etiquette||t._org.nom;
  t._groups=[t.organe,...arr(t.groupes)];
  t._rep=arr(t.reperes);
  t._hay=hayOf([t.nom,t.zh,t.py,t.resume,t.simple,t._rep.join(' '),t._label,t.principe&&[t.principe.zh,t.principe.py,t.principe.fr].join(' '),
    [...t._cle,...t._autres].map(s=>SYM[s].nom).join(' '),t._items.map(it=>[it.ab,it.py].join(' ')).join(' ')]);
  return t;
}
function fiche(id){return fiches.find(e=>e.id===id);}
function tableau(id){return tableaux.find(e=>e.id===id);}
function item(kind,id){return kind==='t'?tableau(id):fiche(id);}
function titleOf(e){return e.kind==='t'?e.nom:e.titre;}
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

/* ---------- Carnets, favoris, récents ---------- */
function persist(){
  store('ys.favoris',JSON.stringify(favs));store('ys.carnets',JSON.stringify(carnets));
  store('ys.recents',JSON.stringify(recents));store('ys.masques',JSON.stringify(masques));store('ys.carnet',carnetSel);store('ys.ordre-carnets',JSON.stringify(collOrder));store('ys.tri-tout',toutTri);store('ys.ordre-tout',JSON.stringify(toutOrdre));store('ys.profil',JSON.stringify(profil));
  const snap=J(dataOnly());if(snap!==lastSnap){lastSnap=snap;schedulePush();}
}
function coll(cid){if(cid==='favoris')return favs;if(cid==='recents')return recents;const c=carnets.find(x=>x.id===cid);return c?c.items:null;}
function collName(cid){if(cid==='tout')return'Toutes les fiches';if(cid==='favoris')return'Favoris';if(cid==='recents')return'Récents';const c=carnets.find(x=>x.id===cid);return c?c.nom:'';}
function inColl(cid,k,id){const it=coll(cid);return !!(it&&it.some(x=>x.k===k&&x.id===id));}
function addTo(cid,k,id){const it=coll(cid);if(it&&!inColl(cid,k,id)){it.unshift({k,id,d:today()});persist();return true;}return false;}
function removeFrom(cid,k,id){const it=coll(cid);if(!it)return null;const i=it.findIndex(x=>x.k===k&&x.id===id);if(i<0)return null;const [x]=it.splice(i,1);persist();return {x,i};}
function restoreAt(cid,rec){const it=coll(cid);if(it&&rec){it.splice(Math.min(rec.i,it.length),0,rec.x);persist();}}
function isFav(k,id){return inColl('favoris',k,id);}
function isHidden(k,id){return masques.some(m=>m.k===k&&m.id===id);}
function pushRecent(k,id){recents=recents.filter(r=>!(r.k===k&&r.id===id));recents.unshift({k,id,d:today()});recents=recents.slice(0,20);persist();}
function splitKey(v){const i=String(v).indexOf(':');return [v.slice(0,i),v.slice(i+1)];}
function keyOf(x){return x.k+':'+x.id;}
function toutKeys(){
  const all=fiches.map(e=>'f:'+e.id);
  if(toutTri!=='perso')return all;
  const set=new Set(all),known=toutOrdre.filter(k=>set.has(k)),ks=new Set(known);
  return [...all.filter(k=>!ks.has(k)),...known];
}
function mergeOrder(full,vis){
  const set=new Set(vis),pos=[];full.forEach((k,i)=>{if(set.has(k))pos.push(i);});
  if(pos.length!==vis.length)return full;
  const out=full.slice();pos.forEach((p,j)=>{out[p]=vis[j];});return out;
}
function isCustom(cid){return !!carnets.find(c=>c.id===cid);}
function orderedColls(){
  const all=[['tout','Tout'],['favoris','★ Favoris'],['recents','Récents'],...carnets.map(c=>[c.id,c.nom])];
  const ids=all.map(x=>x[0]),ord=collOrder.filter(id=>ids.includes(id));
  ids.forEach(id=>{if(!ord.includes(id))ord.push(id);});
  return ord.map(id=>all.find(x=>x[0]===id));
}
function newCarnet(nom){const c={id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),nom:nom.trim().slice(0,40),items:[]};carnets.push(c);persist();return c;}

/* ---------- Éléments communs ---------- */
const SEAL='<div class="seal" lang="zh-Hans" aria-hidden="true"><span>养</span><span>生</span></div>';
function plural(n,s,p){return n+' '+(n>1?p:s);}
function symName(id){return SYM[id]?SYM[id].nom:id;}
function liveOn(e){const t=act&&T.get(act);return !!(t&&t.eid===e.id&&t.ekind===e.kind);}
function cardF(e,extra){
  return `<button type="button" class="entry ${e.type}" data-open="${esc(e.id)}" data-lp="f:${esc(e.id)}" aria-label="${esc(TYPES[e.type]+', '+e.titre)}">
<span class="txt"><span class="kind">${TYPES[e.type]}${liveOn(e)?'<span class="live">en cours</span>':''}${isFav('f',e.id)?'<span class="favdot" aria-label="favori">★</span>':''}</span><span class="etitle">${esc(e.titre)}</span><span class="emeta">${esc(meta(e))}</span>${extra||''}</span>
${e.principe&&e.principe.zh?`<span class="eprin" lang="zh-Hans" aria-hidden="true">${esc(e.principe.zh)}</span>`:''}
</button>`;
}
function cardT(t,extra,noResume){
  return `<button type="button" class="entry tableau" data-opent="${esc(t.id)}" data-lp="t:${esc(t.id)}" aria-label="${esc('Tableau, '+t.nom)}">
<span class="txt"><span class="kind">${esc(t._label)}${liveOn(t)?'<span class="live">en cours</span>':''}${isFav('t',t.id)?'<span class="favdot" aria-label="favori">★</span>':''}</span><span class="etitle">${esc(t.nom)}</span><span class="emeta clamp">${esc(t.simple||(noResume?'':t.resume)||'')}</span>${t._rep.length?`<span class="reperes"><b>Souvent :</b> ${esc(t._rep.slice(0,4).join(' · '))}</span>`:''}${extra||''}</span>
${t.zh?`<span class="eprin" lang="zh-Hans" aria-hidden="true">${esc(t.zh)}</span>`:''}
</button>`;
}
function card(e,extra){return e.kind==='t'?cardT(e,extra):cardF(e,extra);}
function searchBox(id,val,ph,label){
  return `<label class="find" for="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input id="${id}" type="search" value="${esc(val)}" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(label)}"></label>`;
}
function symChip(id){return `<button type="button" class="chip" data-sym="${esc(id)}" aria-pressed="${symSel.has(id)}">${esc(symName(id))}</button>`;}

/* ---------- Toast et feuille d'actions ---------- */
let toastT=null,toastAt=0;
function hideStaleToast(){const t=$('#toast');if(t&&!t.hidden&&Date.now()-toastAt>900){t.hidden=true;clearTimeout(toastT);}}
function toast(msg,undo,label,ms){
  const t=$('#toast');if(!t)return;toastAt=Date.now();
  t.querySelector('.toast-m').textContent=msg;
  const b=t.querySelector('.toast-b');b.hidden=!undo;b.textContent=label||'Annuler';
  b.onclick=()=>{t.hidden=true;clearTimeout(toastT);undo&&undo();};
  t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},ms||(undo?5000:2600));
}
let sheetOpen=false,ignorePop=false,sheetReturn=null,ghostUntil=0;
function openSheet(title,sub,bodyHTML,onReady){
  const s=$('#sheet');
  s.querySelector('.sheet-t').textContent=title||'';
  const st=s.querySelector('.sheet-s');st.textContent=sub||'';st.hidden=!sub;
  s.querySelector('.sheet-body').innerHTML=bodyHTML;
  if(!sheetOpen){const sh=s.querySelector('.sheet');if(sh)sh.scrollTop=0;sheetReturn=document.activeElement;try{history.pushState(Object.assign({},history.state||{},{sheet:1}),'');}catch(e){}}
  s.hidden=false;sheetOpen=true;document.body.classList.add('noscroll');
  const f=s.querySelector('input,.sheet-body button');if(f)f.focus({preventScroll:true});
  if(onReady)onReady(s);
}
let afterPop=null,popTimer=null;
function flushPop(){clearTimeout(popTimer);ignorePop=false;const f=afterPop;afterPop=null;if(f)f();}
function closeSheet(fromPop,then){
  const s=$('#sheet');if(!sheetOpen){if(then)then();return;}
  s.hidden=true;sheetOpen=false;document.body.classList.remove('noscroll');
  if(sheetReturn&&sheetReturn.isConnected)sheetReturn.focus({preventScroll:true});
  if(!fromPop&&history.state&&history.state.sheet){
    ignorePop=true;afterPop=then||null;clearTimeout(popTimer);popTimer=setTimeout(flushPop,700);
    try{history.back();}catch(e){flushPop();}
    return;
  }
  if(then)then();
}
function rows(list){return list.map(r=>`<button type="button" class="sheet-row${r.danger?' danger':''}${r.on?' on':''}" data-act="${esc(r.act)}"${r.on!==undefined?` aria-pressed="${r.on}"`:''}><span>${esc(r.label)}</span>${r.note?`<small>${esc(r.note)}</small>`:''}</button>`).join('');}
let sheetCtx=null;
function itemMenu(k,id,cid){
  const e=item(k,id);if(!e)return;
  sheetCtx={k,id,cid};
  const here=route&&route.kind===k&&route.id===id;
  const list=here?[]:[{act:'open',label:'Ouvrir'}];
  if(cid!=='favoris')list.push({act:'fav',label:isFav(k,id)?'Retirer des favoris':'Ajouter aux favoris'});
  list.push({act:'addto',label:'Ajouter à un carnet…'});
  const custom=cid&&!['tout','favoris','recents'].includes(cid);
  if(custom)list.push({act:'moveto',label:'Déplacer vers un autre carnet…'});
  if(cid&&!['tout','recents'].includes(cid))list.push({act:'top',label:'Mettre en tête du carnet'});
  list.push({act:'share',label:'Partager'});
  if(cid&&tab==='carnet'&&!route)list.push({act:'select',label:'Sélectionner plusieurs fiches'});
  if(cid==='tout')list.push({act:'hide',label:'Masquer de « Toutes les fiches »',danger:true});
  else if(cid==='recents')list.push({act:'forget',label:'Retirer des récents',danger:true});
  else if(cid)list.push({act:'remove',label:cid==='favoris'?'Retirer des favoris':'Retirer de ce carnet',danger:true});
  openSheet(titleOf(e),e.kind==='t'?'Tableau · '+e._label:TYPES[e.type],rows(list));
}
function addToMenu(move){
  const {k,id,cid}=sheetCtx;
  const list=carnets.filter(c=>!(move&&c.id===cid)).map(c=>({act:(move?'mv:':'tg:')+c.id,label:c.nom,on:move?undefined:inColl(c.id,k,id),note:plural(c.items.length,'fiche','fiches')}));
  openSheet(move?'Déplacer vers…':'Ajouter à un carnet',titleOf(item(k,id)),
    (list.length?rows(list):'<p class="sheet-empty">Tu n\'as pas encore de carnet personnel.</p>')+
    `<form class="sheet-new" data-newfor="${move?'move':'add'}"><label for="newc">Nouveau carnet</label><div><input id="newc" type="text" maxlength="40" placeholder="Ex. : Recettes du moment" autocomplete="off"><button type="submit" class="primary">Créer</button></div></form>`);
}
const NEWFORM=(kind,label)=>`<form class="sheet-new" data-newfor="${kind}"><label for="newc">${label||'Nouveau carnet'}</label><div><input id="newc" type="text" maxlength="40" placeholder="Ex. : Recettes pour l'hiver" autocomplete="off"><button type="submit" class="primary">Créer</button></div></form>`;
function collMenu(cid){
  sheetCtx={cid};
  const custom=isCustom(cid);
  const list=[];
  if(custom)list.push({act:'rename',label:'Renommer'});
  list.push({act:'selectin',label:'Sélectionner des fiches'});
  list.push({act:'manage',label:'Gérer mes carnets…'});
  if(custom)list.push({act:'delcarnet',label:'Supprimer ce carnet',danger:true});
  openSheet(collName(cid),'Astuce : reste appuyé sur un onglet puis fais-le glisser pour changer sa place.',rows(list));
}
function manageSheet(){
  sheetCtx={};
  let h='';
  if(carnets.length){
    const all=carnets.every(c=>manageSel.has(c.id));
    h+=rows([{act:'mkall',label:all?'Tout décocher':'Tout cocher'}]);
    h+=rows(carnets.map(c=>({act:'mk:'+c.id,label:c.nom,on:manageSel.has(c.id),note:plural(c.items.length,'fiche','fiches')})));
    h+=`<button type="button" class="sheet-row danger" data-act="mkdel"${manageSel.size?'':' disabled'}><span>Supprimer la sélection${manageSel.size?' ('+manageSel.size+')':''}</span></button>`;
  }else h+='<p class="sheet-empty">Tu n\'as pas encore de carnet personnel.</p>';
  openSheet('Mes carnets',carnets.length?'Coche les carnets à supprimer. Les fiches, elles, restent dans l\'appli.':'',h+NEWFORM('manage'));
}
function newCarnetFor(k,id,src){
  sheetCtx={k,id,cid:src};
  openSheet('Nouveau carnet',titleOf(item(k,id)),NEWFORM('add','Nom du carnet'));
}
function multiMenu(move){
  sheetCtx={multi:true};
  const list=carnets.filter(c=>c.id!==carnetSel).map(c=>({act:(move?'mm:':'ma:')+c.id,label:c.nom,note:plural(c.items.length,'fiche','fiches')}));
  openSheet(move?'Déplacer vers…':'Ajouter à un carnet',plural(selSet.size,'fiche sélectionnée','fiches sélectionnées'),
    (list.length?rows(list):'<p class="sheet-empty">Tu n\'as pas encore d\'autre carnet.</p>')+NEWFORM(move?'multimove':'multi'));
}
function selKeys(){return [...selSet].map(splitKey).filter(([k,id])=>item(k,id));}
function endSel(){selMode=false;selSet.clear();}
function multiInto(target,move){
  const keys=selKeys(),src=carnetSel,tIt=coll(target);if(!tIt||!keys.length)return;
  const tSnap=tIt.slice(),sIt=move?coll(src):null,sSnap=sIt?sIt.slice():null;
  keys.slice().reverse().forEach(([k,id])=>addTo(target,k,id));
  if(move)keys.forEach(([k,id])=>removeFrom(src,k,id));
  endSel();closeSheet();refresh();
  toast((move?plural(keys.length,'fiche déplacée','fiches déplacées')+' vers « ':plural(keys.length,'fiche ajoutée','fiches ajoutées')+' à « ')+collName(target)+' »',
    ()=>{tIt.splice(0,tIt.length,...tSnap);if(sIt)sIt.splice(0,sIt.length,...sSnap);persist();refresh();});
}
function selAction(a){
  const keys=selKeys();if(!keys.length)return;const cid=carnetSel;
  if(a==='fav'){
    const added=keys.filter(([k,id])=>addTo('favoris',k,id));endSel();refresh();
    toast(added.length?plural(added.length,'fiche ajoutée','fiches ajoutées')+' aux favoris':'Déjà dans les favoris',added.length?()=>{added.forEach(([k,id])=>removeFrom('favoris',k,id));refresh();}:null);return;
  }
  if(a==='add'||a==='move'){multiMenu(a==='move');return;}
  if(a==='rm'){
    if(cid==='tout'){
      const add=keys.filter(([k,id])=>!isHidden(k,id)).map(([k,id])=>({k,id}));masques.push(...add);persist();endSel();refresh();
      toast(plural(add.length,'fiche masquée','fiches masquées'),()=>{masques=masques.filter(m=>!add.some(x=>x.k===m.k&&x.id===m.id));persist();refresh();});return;
    }
    const it=coll(cid);if(!it)return;const snap=it.slice();
    keys.forEach(([k,id])=>removeFrom(cid,k,id));endSel();refresh();
    toast(plural(keys.length,'fiche retirée','fiches retirées')+' de « '+collName(cid)+' »',()=>{it.splice(0,it.length,...snap);persist();refresh();});
  }
}
function visKeys(){return [...document.querySelectorAll('#timeline [data-lp]')].map(c=>c.dataset.lp);}
function selInfo(){
  const bar=$('#selbar');if(!bar)return;const n=selSet.size;
  bar.querySelector('.seln').textContent=n?plural(n,'fiche sélectionnée','fiches sélectionnées'):'Touche les fiches à cocher';
  const vis=visKeys(),all=vis.length>0&&vis.every(v=>selSet.has(v));
  const a=bar.querySelector('[data-selall]');a.textContent=all?'Tout décocher':'Tout cocher';
  document.querySelectorAll('[data-selact]').forEach(b=>{b.disabled=!n;});
}
function toggleSel(c){const v=c.dataset.lp;selSet.has(v)?selSet.delete(v):selSet.add(v);c.setAttribute('aria-pressed',String(selSet.has(v)));selInfo();}
function decorateSel(box){
  box.classList.toggle('selecting',selMode);
  if(!selMode)return;
  box.querySelectorAll('[data-lp]').forEach(c=>c.setAttribute('aria-pressed',String(selSet.has(c.dataset.lp))));
  const custom=isCustom(carnetSel);
  const btn=(a,ic,l)=>`<button type="button" data-selact="${a}" disabled><span aria-hidden="true">${ic}</span>${l}</button>`;
  box.insertAdjacentHTML('afterbegin',`<div class="selbar" id="selbar"><button type="button" class="linkbtn" data-selall="1">Tout cocher</button><span class="seln" aria-live="polite"></span><button type="button" class="primary sm" data-selend="1">Terminer</button></div>`);
  box.insertAdjacentHTML('beforeend',`<div class="selact">${carnetSel!=='favoris'?btn('fav','★','Favoris'):''}${btn('add','+','Ajouter à…')}${custom?btn('move','⇄','Déplacer'):''}${btn('rm','✕',carnetSel==='tout'?'Masquer':'Retirer')}</div>`);
  selInfo();
}
function renameSheet(cid){
  const c=carnets.find(x=>x.id===cid);if(!c)return;
  sheetCtx={cid};
  openSheet('Renommer le carnet','',`<form class="sheet-new" data-rename="${esc(cid)}"><label for="newc">Nom</label><div><input id="newc" type="text" maxlength="40" value="${esc(c.nom)}" autocomplete="off"><button type="submit" class="primary">Enregistrer</button></div></form>`);
}
function newCarnetSheet(){
  sheetCtx={};
  openSheet('Nouveau carnet','Rassemble les fiches de ton choix : recettes du moment, protocole d\'un patient, cure d\'hiver…',`<form class="sheet-new" data-newfor="plain"><label for="newc">Nom</label><div><input id="newc" type="text" maxlength="40" placeholder="Ex. : Recettes du moment" autocomplete="off"><button type="submit" class="primary">Créer</button></div></form>`);
}
const PT_ALIAS={'EX-LE 2':'He Ding','EX-LE 4':'Nei Xi Yan','EX-HN 3':'Yin Tang','EX-HN 5':'Tai Yang'};
function figKeys(it){
  const raw=it.p?[it.p]:String(it.ab||'').split('+').map(x=>x.trim());
  const ks=raw.map(k=>PT_ALIAS[k]||k).filter(k=>PTS[k]&&PTS[k].vue&&FIGS[PTS[k].vue]);
  return ks.length&&ks.every(k=>PTS[k].vue===PTS[ks[0]].vue)?ks:ks.slice(0,1);
}
function figSheet(keys){
  keys=String(keys).split('|').filter(k=>PTS[k]);if(!keys.length)return;
  const p0=PTS[keys[0]],f=FIGS[p0.vue];if(!f)return;
  const W=+String(f.vb).split(' ')[2]||200;let marks='';
  keys.forEach(ab=>{
    const p=PTS[ab],x=+p.x,y=+p.y,xs=[x];if(f.sym&&p.b&&Math.abs(x-W/2)>2)xs.push(W-x);
    const right=x<W-56,lx=right?x+10:x-10,ly=y<16?y+18:y-8;
    marks+=xs.map((cx,i)=>`<circle class="fig-halo" cx="${cx}" cy="${y}" r="11"></circle><circle class="fig-dot${i?' alt':''}" cx="${cx}" cy="${y}" r="4.6"></circle>`).join('')+
      `<text class="fig-lab" x="${lx}" y="${ly}" text-anchor="${right?'start':'end'}">${esc(ab)}</text>`;
  });
  const both=keys.some(ab=>PTS[ab].b),mirrored=f.sym&&both;
  openSheet(keys.length>1?keys.join(' et '):keys[0]+' · '+(p0.py||''),f.nom,`<div class="fig"><svg class="fig-svg" viewBox="${esc(f.vb)}" role="img" aria-label="Emplacement : ${esc(keys.join(', '))}, ${esc(f.nom)}">${f.svg}${marks}</svg></div>
${keys.map(ab=>{const p=PTS[ab];return `${p.zh?`<p class="fig-zh" lang="zh-Hans">${esc(p.zh)} <span>${esc(p.py||'')}</span></p>`:''}<p class="fig-loc"><b>${esc(ab)} :</b> ${esc(p.loc||'')}</p>`;}).join('')}
${both?`<p class="fine">Point présent des deux côtés du corps${mirrored?' (les deux sont marqués)':''} : masse-le à gauche puis à droite.</p>`:'<p class="fine">Point unique, sur la ligne du milieu du corps.</p>'}
<p class="fine">Repère : 1 cun correspond à la largeur de ton pouce. Le bon endroit est souvent un petit creux, un peu plus sensible au toucher. Schéma indicatif.</p>`);
}
async function shareApp(){
  const url=location.origin+location.pathname;
  try{if(navigator.share){await navigator.share({title:'Carnet Yang Sheng',text:'Carnet Yang Sheng : symptômes, tableaux, points d\'acupression et recettes de médecine chinoise.',url});return;}}catch(err){if(err&&err.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(url);toast('Lien copié');}catch(err){toast(url);}
}
async function share(k,id){
  const e=item(k,id);if(!e)return;
  const url=location.origin+location.pathname+'#'+k+'-'+id;
  try{if(navigator.share){await navigator.share({title:titleOf(e),text:titleOf(e)+' · Carnet Yang Sheng',url});return;}}catch(err){if(err&&err.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(url);toast('Lien copié');}catch(err){toast(url);}
}
function onSheetAct(a){
  const ctx=sheetCtx||{};const {k,id,cid}=ctx;
  if(a==='select'){closeSheet();selMode=true;selSet.clear();selSet.add(k+':'+id);refresh();return;}
  if(a==='selectin'){closeSheet();carnetSel=cid;persist();selMode=true;selSet.clear();if(tab!=='carnet'||route)goTab('carnet');else refresh();return;}
  if(a==='manage'){manageSel.clear();manageSheet();return;}
  if(a==='mkall'){const all=carnets.every(c=>manageSel.has(c.id));carnets.forEach(c=>all?manageSel.delete(c.id):manageSel.add(c.id));manageSheet();return;}
  if(a.startsWith('mk:')){const c=a.slice(3);manageSel.has(c)?manageSel.delete(c):manageSel.add(c);manageSheet();return;}
  if(a==='mkdel'){
    const removed=[];carnets.forEach((c,i)=>{if(manageSel.has(c.id))removed.push([i,c]);});if(!removed.length)return;
    carnets=carnets.filter(c=>!manageSel.has(c.id));if(!coll(carnetSel)&&carnetSel!=='tout')carnetSel='tout';
    manageSel.clear();persist();closeSheet();refresh();
    toast(plural(removed.length,'carnet supprimé','carnets supprimés'),()=>{removed.forEach(([i,c])=>carnets.splice(i,0,c));persist();refresh();});return;
  }
  if(a.startsWith('ma:')){multiInto(a.slice(3),false);return;}
  if(a.startsWith('mm:')){multiInto(a.slice(3),true);return;}
  if(a==='open'){closeSheet(false,()=>openItem(k,id));return;}
  if(a==='fav'){const on=!isFav(k,id);on?addTo('favoris',k,id):removeFrom('favoris',k,id);closeSheet();toast(on?'Ajouté aux favoris':'Retiré des favoris');refresh();return;}
  if(a==='addto'){addToMenu(false);return;}
  if(a==='moveto'){addToMenu(true);return;}
  if(a==='top'){const it=coll(cid);const r=removeFrom(cid,k,id);if(it&&r){it.unshift(r.x);persist();}closeSheet();refresh();return;}
  if(a==='share'){closeSheet();share(k,id);return;}
  if(a==='hide'){masques.push({k,id});persist();closeSheet();refresh();toast('Fiche masquée',()=>{masques=masques.filter(m=>!(m.k===k&&m.id===id));persist();refresh();});return;}
  if(a==='forget'){const r=removeFrom('recents',k,id);closeSheet();refresh();toast('Retiré des récents',()=>{restoreAt('recents',r);refresh();});return;}
  if(a==='remove'){const r=removeFrom(cid,k,id);closeSheet();refresh();toast(cid==='favoris'?'Retiré des favoris':'Retiré de « '+collName(cid)+' »',()=>{restoreAt(cid,r);refresh();});return;}
  if(a.startsWith('tg:')){const c=a.slice(3);const on=!inColl(c,k,id);on?addTo(c,k,id):removeFrom(c,k,id);const b=$(`#sheet [data-act="${cssq(a)}"]`);if(b){b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on);const n=b.querySelector('small');if(n)n.textContent=plural(coll(c).length,'fiche','fiches');}toast(on?'Ajouté à « '+collName(c)+' »':'Retiré de « '+collName(c)+' »');refresh();return;}
  if(a.startsWith('mv:')){const c=a.slice(3);removeFrom(cid,k,id);addTo(c,k,id);closeSheet();refresh();toast('Déplacé vers « '+collName(c)+' »');return;}
  if(a==='rename'){renameSheet(cid);return;}
  if(a==='delcarnet'){const c=carnets.find(x=>x.id===cid);openSheet('Supprimer « '+(c?c.nom:'')+' » ?','Les fiches restent dans l\'appli : seul ce carnet disparaît.',rows([{act:'delok',label:'Supprimer le carnet',danger:true},{act:'close',label:'Garder'}]));return;}
  if(a==='delok'){const i=carnets.findIndex(x=>x.id===cid);if(i>-1){const [c]=carnets.splice(i,1);if(carnetSel===cid)carnetSel='tout';persist();closeSheet();refresh();toast('Carnet supprimé',()=>{carnets.splice(i,0,c);carnetSel=c.id;persist();refresh();});}return;}
  if(a==='close'){closeSheet();return;}
  if(a.startsWith('prov:')){provSignIn(a.slice(5));return;}
  if(a==='acc:signup'||a==='acc:login'){accSheet(a.slice(4));return;}
  if(a==='acc:reset'){resetPw();return;}
  if(a==='acc:sync'){syncNow();return;}
  if(a==='acc:nophoto'){profil.photo='';persist();accSheet();refresh();return;}
  if(a==='acc:logout'){logout();return;}
  if(a==='acc:delete'){openSheet('Supprimer ton compte ?','Ton compte et la copie en ligne de tes carnets seront effacés définitivement. Ce qui est enregistré sur ce téléphone reste.',rows([{act:'acc:delok',label:'Supprimer définitivement',danger:true},{act:'close',label:'Garder mon compte'}]));sheetCtx={acc:true,mode:'delete'};return;}
  if(a==='acc:delok'){deleteAccount();return;}
}
function onSheetSubmit(f){
  const inp=f.querySelector('input');const nom=(inp.value||'').trim();
  if(!nom){inp.focus();inp.classList.add('err');return;}
  if(f.dataset.newfor==='nom'){profil.nom=nom.slice(0,40);persist();if(compte&&user)compte.renommer(profil.nom).catch(()=>{});accSheet();refresh();toast('Nom enregistré');return;}
  if(f.dataset.rename){const c=carnets.find(x=>x.id===f.dataset.rename);if(c){c.nom=nom.slice(0,40);persist();}closeSheet();refresh();toast('Carnet renommé');return;}
  if(f.dataset.newfor==='manage'){newCarnet(nom);manageSheet();refresh();toast('Carnet créé');return;}
  const c=newCarnet(nom);
  const ctx=sheetCtx||{};
  if(f.dataset.newfor==='multi'||f.dataset.newfor==='multimove'){multiInto(c.id,f.dataset.newfor==='multimove');return;}
  if(f.dataset.newfor==='add'){const mv=ctx.cid&&isCustom(ctx.cid)&&ctx.cid!==c.id;const rec=mv?removeFrom(ctx.cid,ctx.k,ctx.id):null;addTo(c.id,ctx.k,ctx.id);closeSheet();refresh();toast((mv?'Déplacé vers « ':'Ajouté à « ')+c.nom+' »',()=>{removeFrom(c.id,ctx.k,ctx.id);if(rec)restoreAt(ctx.cid,rec);refresh();});return;}
  if(f.dataset.newfor==='move'){removeFrom(ctx.cid,ctx.k,ctx.id);addTo(c.id,ctx.k,ctx.id);closeSheet();refresh();toast('Déplacé vers « '+c.nom+' »');return;}
  carnetSel=c.id;persist();closeSheet(false,()=>{if(tab!=='carnet'||route)goTab('carnet');else refresh();});toast('Carnet créé. Reste appuyé sur une fiche pour l\'y ajouter.');
}
function refresh(){const y=window.scrollY;render();window.scrollTo(0,y);}

/* ---------- Compte et synchronisation ---------- */
function normItem(x){return x&&x.k&&x.id?{k:String(x.k),id:String(x.id),d:String(x.d||'')}:null;}
function normList(a){return arr(a).map(normItem).filter(Boolean);}
function norm(r){
  r=r||{};const p=r.profil||{};
  return {favoris:normList(r.favoris),
    carnets:arr(r.carnets).filter(c=>c&&c.id).map(c=>({id:String(c.id),nom:String(c.nom||'Carnet').slice(0,40),items:normList(c.items)})),
    recents:normList(r.recents).slice(0,20),masques:normList(r.masques),ordre:arr(r.ordre).map(String),
    triTout:r.triTout==='perso'?'perso':'date',ordreTout:arr(r.ordreTout).map(String),
    profil:{nom:String(p.nom||'').slice(0,40),photo:typeof p.photo==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(p.photo)?p.photo:''}};
}
function dataOnly(){return norm({favoris:favs,carnets,recents,masques,ordre:collOrder,triTout:toutTri,ordreTout:toutOrdre,profil});}
function adopt(d){
  d=norm(d);
  favs=d.favoris;carnets=d.carnets;recents=d.recents;masques=d.masques;collOrder=d.ordre;toutTri=d.triTout;toutOrdre=d.ordreTout;profil=d.profil;
  if(carnetSel!=='tout'&&!coll(carnetSel))carnetSel='tout';
  lastSnap=J(dataOnly());persist();
}
/* Première connexion sur cet appareil : on additionne ce qui est ici et ce qui est en ligne */
function mergeUnion(l,r){
  const uniq=list=>{const seen=new Set();return list.filter(x=>{const k=keyOf(x);if(seen.has(k))return false;seen.add(k);return true;});};
  const cs=r.carnets.map(c=>({id:c.id,nom:c.nom,items:c.items.slice()}));
  l.carnets.forEach(c=>{const m=cs.find(x=>x.id===c.id);if(m)m.items=uniq([...m.items,...c.items]);else cs.push({id:c.id,nom:c.nom,items:c.items.slice()});});
  return norm({favoris:uniq([...r.favoris,...l.favoris]),carnets:cs,recents:uniq([...r.recents,...l.recents]),masques:uniq([...r.masques,...l.masques]),
    ordre:r.ordre.length?r.ordre:l.ordre,triTout:r.triTout==='perso'||l.triTout!=='perso'?r.triTout:l.triTout,ordreTout:r.ordreTout.length?r.ordreTout:l.ordreTout,
    profil:{nom:r.profil.nom||l.profil.nom,photo:r.profil.photo||l.profil.photo}});
}
/* Ensuite : fusion à trois voies à partir du dernier état synchronisé */
function m3list(b,l,r,kf){
  b=arr(b);l=arr(l);r=arr(r);
  if(J(l)===J(b))return r;if(J(r)===J(b))return l;
  const K=x=>kf?kf(x):x,bk=new Set(b.map(K)),lk=new Set(l.map(K)),rk=new Set(r.map(K));
  return [...r.filter(x=>!bk.has(K(x))&&!lk.has(K(x))),...l.filter(x=>!(bk.has(K(x))&&!rk.has(K(x))))];
}
function m3val(b,l,r){return J(l)!==J(b)?l:r;}
function merge3(b,l,r){
  const bc=b.carnets,lc=l.carnets,rc=r.carnets,find=(list,id)=>list.find(c=>c.id===id);
  const ids=m3list(bc.map(c=>c.id),lc.map(c=>c.id),rc.map(c=>c.id));
  return norm({favoris:m3list(b.favoris,l.favoris,r.favoris,keyOf),recents:m3list(b.recents,l.recents,r.recents,keyOf),masques:m3list(b.masques,l.masques,r.masques,keyOf),
    carnets:ids.map(id=>{const B=find(bc,id)||{nom:'',items:[]},L=find(lc,id),R=find(rc,id);if(!L)return R;if(!R)return L;return {id,nom:m3val(B.nom,L.nom,R.nom),items:m3list(B.items,L.items,R.items,keyOf)};}).filter(Boolean),
    ordre:m3val(b.ordre,l.ordre,r.ordre),triTout:m3val(b.triTout,l.triTout,r.triTout),ordreTout:m3val(b.ordreTout,l.ordreTout,r.ordreTout),
    profil:{nom:m3val(b.profil.nom,l.profil.nom,r.profil.nom),photo:m3val(b.profil.photo,l.profil.photo,r.profil.photo)}});
}
function loadCompte(){
  if(!FB)return Promise.reject(new Error('off'));
  if(!compteP)compteP=import(COMPTE_URL).then(m=>{compte=m;return m.init(FB,onUser).then(()=>m,e=>{accErr(errMsg(e));return m;});}).catch(e=>{compteP=null;throw e;});
  return compteP;
}
function onUser(u){
  const was=user&&user.uid;user=u;store('ys.compte.attente','');
  if(!u){syncState='';if(was){store('ys.sync.uid','');store('ys.sync.base','');}accRefresh();return;}
  accRefresh();syncNow();
}
async function syncNow(){
  if(!user||!compte)return;
  if(syncing){syncAgain=true;return;}
  clearTimeout(pushT);pushT=null;
  if(navigator.onLine===false){syncState='horsligne';accRefresh();return;}
  syncing=true;syncState='encours';accRefresh();
  try{
    const raw=await compte.lire(),local=dataOnly(),bound=store('ys.sync.uid')===user.uid;
    const base=bound?storedJSON('ys.sync.base',null):null;
    let merged=local;
    if(raw){const remote=norm(raw);merged=base?merge3(norm(base),local,remote):mergeUnion(local,remote);}
    if(J(merged)!==J(local)){adopt(merged);if(!lp)refresh();}
    if(!raw||J(merged)!==J(norm(raw)))await compte.ecrire(Object.assign({v:1},merged,{maj:Date.now()}));
    store('ys.sync.base',J(merged));store('ys.sync.uid',user.uid);store('ys.sync.at',String(Date.now()));
    if(!bound&&raw)toast('Tes carnets sont synchronisés avec ton compte');
    syncState='ok';syncErr='';
  }catch(e){syncState=navigator.onLine===false||/unavailable|network/i.test((e&&(e.code||e.message))||'')?'horsligne':'erreur';syncErr=errMsg(e);}
  syncing=false;accRefresh();
  if(syncAgain){syncAgain=false;syncNow();}
}
function schedulePush(){if(!user||!compte)return;clearTimeout(pushT);pushT=setTimeout(syncNow,1500);}
function errMsg(e){
  if(e)try{console.warn('[compte]',e);}catch(_){}
  const c=(e&&e.code)||'';
  const M={'auth/invalid-email':'Cette adresse e-mail n\'est pas valide.','auth/missing-email':'Écris ton adresse e-mail.','auth/missing-password':'Écris ton mot de passe.',
    'auth/weak-password':'Mot de passe trop court : 6 caractères minimum.','auth/email-already-in-use':'Un compte existe déjà avec cette adresse : connecte-toi plutôt.',
    'auth/invalid-credential':'E-mail ou mot de passe incorrect.','auth/wrong-password':'E-mail ou mot de passe incorrect.','auth/user-not-found':'E-mail ou mot de passe incorrect.',
    'auth/invalid-login-credentials':'E-mail ou mot de passe incorrect.','auth/user-disabled':'Ce compte a été désactivé.',
    'auth/too-many-requests':'Trop d\'essais. Réessaie dans quelques minutes.','auth/network-request-failed':'Pas de connexion internet.',
    'auth/unauthorized-domain':'Ce site n\'est pas encore autorisé pour la connexion (réglage Firebase).','auth/operation-not-allowed':'Cette façon de se connecter n\'est pas encore activée.',
    'auth/account-exists-with-different-credential':'Un compte existe déjà avec cet e-mail, créé d\'une autre façon (Google ou e-mail).',
    'auth/requires-recent-login':'Par sécurité, reconnecte-toi puis recommence.','auth/popup-blocked':'La fenêtre de connexion a été bloquée.',
    'permission-denied':'Accès refusé par le serveur (règles de sécurité).','unavailable':'Serveur injoignable pour le moment.'};
  if(M[c])return M[c];
  if(e&&e.message==='off')return 'La connexion n\'est pas encore disponible.';
  if(navigator.onLine===false)return 'Pas de connexion internet.';
  return 'Une erreur est survenue'+(c?' ('+c+')':'')+'. Réessaie.';
}
function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return 'à l\'instant';if(m<60)return 'il y a '+m+' min';const h=Math.round(m/60);if(h<24)return 'il y a '+h+' h';return 'le '+new Date(t).toLocaleDateString('fr-FR');}
function syncLabel(){
  if(syncState==='encours')return 'Synchronisation en cours…';
  if(syncState==='horsligne')return 'Hors ligne : tes changements seront envoyés dès le retour du réseau.';
  if(syncState==='erreur')return 'La synchronisation a échoué. '+(syncErr||'');
  const at=+store('ys.sync.at')||0;return at?'Carnets synchronisés '+ago(at)+'.':'';
}
function shownName(){return profil.nom||(user&&user.nom)||'';}
function avatarHTML(cls){
  const ph=profil.photo||(user&&user.photo)||'',nm=shownName()||(user&&user.email)||'?';
  return ph?`<img class="avatar ${cls||''}" src="${esc(ph)}" alt="" referrerpolicy="no-referrer">`:`<span class="avatar ${cls||''}" aria-hidden="true">${esc(nm.trim().charAt(0).toUpperCase()||'?')}</span>`;
}
function accBtnInner(){return user?avatarHTML('sm')+`<span class="acc-n">${esc(shownName()||'Mon compte')}</span>`:'<span class="acc-n">Se connecter</span>';}
function accCardInner(){
  return user?`<h2>Ton compte</h2><div class="acc-id">${avatarHTML()}<div><b>${esc(shownName()||'Sans nom')}</b><span>${esc(user.email||'')}</span></div></div><p class="acc-sync ${syncState}">${esc(syncLabel())}</p><button type="button" class="primary" data-account="1">Gérer mon compte</button>`
    :`<h2>Ton compte</h2><p>Connecte-toi pour retrouver tes carnets, favoris et récents sur un autre téléphone. C'est facultatif.</p><button type="button" class="primary" data-account="1">Se connecter ou créer un compte</button>`;
}
function accRefresh(){
  if(sheetOpen&&sheetCtx&&sheetCtx.acc&&sheetCtx.mode!=='delete'){
    const f=$('#sheet .acc-form');const typing=f&&!user&&[...f.elements].some(x=>x.value);
    if(!typing)accSheet(sheetCtx.mode);else{const s=$('#sheet .acc-sync');if(s)s.textContent=syncLabel();}
  }
  const hb=$('#accbtn');if(hb){hb.innerHTML=accBtnInner();hb.setAttribute('aria-label',user?'Ton compte':'Se connecter');}
  const ic=$('#acccard');if(ic)ic.innerHTML=accCardInner();
}
function accSheet(mode){
  sheetCtx={acc:true,mode:mode||'login'};
  if(user){
    openSheet('Ton compte','',`<div class="acc-id">${avatarHTML('big')}<div><b>${esc(shownName()||'Sans nom')}</b><span>${esc(user.email||'')}</span></div></div>
<p class="acc-sync ${syncState}" role="status">${esc(syncLabel())}</p>`+
      rows([{act:'acc:sync',label:'Synchroniser maintenant'}])+
      `<label class="sheet-row" for="acc-photo"><span>${profil.photo?'Changer ma photo':'Ajouter une photo de profil'}</span><input id="acc-photo" type="file" accept="image/*" hidden></label>`+
      (profil.photo?rows([{act:'acc:nophoto',label:'Retirer ma photo'}]):'')+
      `<form class="sheet-new" data-newfor="nom"><label for="newc">Nom affiché</label><div><input id="newc" type="text" maxlength="40" value="${esc(shownName())}" autocomplete="nickname"><button type="submit" class="primary">Enregistrer</button></div></form>`+
      rows([{act:'acc:logout',label:'Se déconnecter'},{act:'acc:delete',label:'Supprimer mon compte',danger:true}]));
    return;
  }
  const su=sheetCtx.mode==='signup';
  openSheet(su?'Créer un compte':'Se connecter','',`<p class="acc-intro">Retrouve tes carnets, favoris et récents sur un autre téléphone. Le compte est facultatif : sans compte, tout reste sur cet appareil.</p>
<button type="button" class="prov" data-act="prov:google">Continuer avec Google</button>${FB&&FB.facebook?'<button type="button" class="prov" data-act="prov:facebook">Continuer avec Facebook</button>':''}
<p class="or"><span>ou avec ton e-mail</span></p>
<form class="acc-form" data-mode="${su?'signup':'login'}" novalidate>
${su?'<label>Prénom ou pseudo<input name="nom" type="text" maxlength="40" autocomplete="nickname"></label>':''}
<label>E-mail<input name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false"></label>
<label>Mot de passe${su?' (6 caractères minimum)':''}<span class="pw"><input name="mdp" type="password" autocomplete="${su?'new-password':'current-password'}"><button type="button" data-pwtoggle="1" aria-label="Afficher le mot de passe">Afficher</button></span></label>
<p class="acc-err" role="alert" hidden></p>
<button type="submit" class="primary wide">${su?'Créer mon compte':'Se connecter'}</button>
</form>
<p class="acc-switch">${su?'Déjà un compte ? <button type="button" class="linkbtn inline" data-act="acc:login">Se connecter</button>':'Pas encore de compte ? <button type="button" class="linkbtn inline" data-act="acc:signup">Créer un compte</button></p><p class="acc-switch"><button type="button" class="linkbtn inline" data-act="acc:reset">Mot de passe oublié ?</button>'}</p>
<p class="fine">Avec un compte sont enregistrés en ligne : ton e-mail, ton nom, ta photo si tu en mets une, tes carnets, favoris, récents et ton classement. Tes symptômes et tes ingrédients restent sur ce téléphone.</p>`);
}
function accErr(msg){const p=$('#sheet .acc-err');if(p){p.textContent=msg||'';p.hidden=!msg;}else if(msg)toast(msg);}
function accBusy(on){document.querySelectorAll('#sheet .prov,#sheet .acc-form [type="submit"]').forEach(b=>{b.disabled=on;});const f=$('#sheet .acc-form');if(f)f.setAttribute('aria-busy',String(on));}
async function provSignIn(p){
  accErr('');accBusy(true);
  try{const m=await loadCompte();store('ys.compte.attente','1');await m.fournisseur(p);}
  catch(e){store('ys.compte.attente','');if(!e||!/popup-closed|cancelled-popup/.test(e.code||''))accErr(errMsg(e));}
  accBusy(false);
}
async function accSubmit(f){
  const v=n=>{const x=f.elements.namedItem(n);return x?x.value:'';};
  const mode=f.dataset.mode,email=v('email').trim(),mdp=v('mdp'),nom=v('nom').trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){accErr('Écris une adresse e-mail valide.');f.elements.namedItem('email').focus();return;}
  if(mdp.length<6){accErr('Le mot de passe doit faire au moins 6 caractères.');f.elements.namedItem('mdp').focus();return;}
  accErr('');accBusy(true);
  try{const m=await loadCompte();if(mode==='signup'){if(nom){profil.nom=nom.slice(0,40);persist();}await m.inscription(email,mdp,nom);}else await m.connexion(email,mdp);}
  catch(e){accErr(errMsg(e));}
  accBusy(false);
}
async function resetPw(){
  const f=$('#sheet .acc-form'),email=f?f.elements.namedItem('email').value.trim():'';
  if(!/^\S+@\S+\.\S+$/.test(email)){accErr('Écris d\'abord ton adresse e-mail ci-dessus, puis touche « Mot de passe oublié ? ».');return;}
  try{const m=await loadCompte();await m.oubli(email);accErr('');toast('E-mail envoyé : suis le lien reçu pour choisir un nouveau mot de passe.');}
  catch(e){accErr(errMsg(e));}
}
async function logout(){
  try{if(compte)await compte.deconnexion();}catch(e){}
  user=null;store('ys.sync.uid','');store('ys.sync.base','');syncState='';
  closeSheet();refresh();toast('Tu es déconnecté. Tes carnets restent sur ce téléphone.');
}
async function deleteAccount(){
  try{
    await compte.supprimer();user=null;store('ys.sync.uid','');store('ys.sync.base','');syncState='';
    closeSheet();refresh();toast('Compte supprimé. Tes carnets restent sur ce téléphone.');
  }catch(e){
    if(e&&e.code==='auth/requires-recent-login'){try{await compte.deconnexion();}catch(_){}user=null;store('ys.sync.uid','');store('ys.sync.base','');accSheet('login');accErr('Par sécurité, reconnecte-toi, puis recommence : Ton compte, puis « Supprimer mon compte ».');}
    else accErr(errMsg(e));
  }
}
function handlePhoto(file){
  if(!file)return;
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{
    const S=256,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');const m=Math.min(img.naturalWidth,img.naturalHeight);
    g.drawImage(img,(img.naturalWidth-m)/2,(img.naturalHeight-m)/2,m,m,0,0,S,S);URL.revokeObjectURL(url);
    profil.photo=c.toDataURL('image/jpeg',0.82);persist();accSheet();refresh();toast('Photo enregistrée');
  };
  img.onerror=()=>{URL.revokeObjectURL(url);toast('Cette image ne peut pas être lue.');};
  img.src=url;
}

/* ---------- Symptômes ---------- */
function matchTableaux(){
  return tableaux.map(t=>{
    let got=0,tot=0,cleGot=0;const m=[];
    t._cle.forEach(s=>{tot+=2;if(symSel.has(s)){got+=2;cleGot++;m.push(s);}});
    t._autres.forEach(s=>{tot+=1;if(symSel.has(s)){got+=1;m.push(s);}});
    const contra=t._contre.filter(s=>symSel.has(s));
    const score=got-1.5*contra.length,cov=tot?got/tot:0;
    const r={t,got,tot,cleGot,m,contra,score,cov,rank:score+4*cov+0.75*(m.length-1)};
    r.pct=compat(r,symSel.size);return r;
  }).filter(r=>r.m.length&&r.score>0&&r.pct>0).sort((a,b)=>b.pct-a.pct||b.rank-a.rank||b.cleGot-a.cleGot);
}
/* Compatibilité en % : part de tes symptômes présents dans le tableau (55 %), part de ses signes clés
   que tu as (30 %), part de tous ses signes (15 %) ; prudence tant qu'il y a moins de 3 symptômes ;
   chaque signe contraire retire un quart. */
function compat(r,n){
  if(!n)return 0;
  const E=r.m.length/n,K=r.t._cle.length?r.cleGot/r.t._cle.length:0;
  const p=(0.55*E+0.3*K+0.15*r.cov)*Math.min(1,(n+1)/4)*Math.max(0,1-0.25*r.contra.length);
  return Math.max(1,Math.min(100,Math.round(p*100)));
}
function force(r){
  if(r.pct>=70)return['forte','compatibilité forte'];
  if(r.pct>=45)return['moyenne','compatibilité moyenne'];
  return['faible','piste possible'];
}
function ringHTML(p,cls,big){return `<span class="ring ${cls}${big?' big':''}" role="img" aria-label="Compatible à ${p} %"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="15.5"></circle><circle class="ring-fg" cx="18" cy="18" r="15.5" pathLength="100" style="--p:${p}"></circle></svg><b aria-hidden="true">${p}<small>%</small></b></span>`;}
function renderSym(){
  if(symMode==='resultats'&&symSel.size)return renderSymResults();
  view.innerHTML=`<h1 class="vh">Symptômes</h1><p class="lede">Coche ce que tu ressens, même un peu. L'appli cherche les tableaux de la médecine chinoise qui te ressemblent.</p>
<div class="tools ac-wrap">${searchBox('sq',symQuery,'Tape les premières lettres : fat, toux, diarr…','Chercher un symptôme')}<div class="ac" id="ac" role="listbox" aria-label="Suggestions" hidden></div></div>
<div id="symlist"></div><div class="cta-wrap" id="symcta" hidden></div>`;
  const q=$('#sq'),acb=$('#ac');
  q.addEventListener('input',()=>{symQuery=q.value;renderAC();});
  q.addEventListener('focus',renderAC);
  q.addEventListener('blur',()=>{setTimeout(()=>{if(document.activeElement!==q){acb.hidden=true;}},150);});
  q.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'){const f=acb.querySelector('[data-acsym]');if(f){ev.preventDefault();pickSuggestion(f.dataset.acsym);}}
    else if(ev.key==='Escape'){acb.hidden=true;}
  });
  acb.addEventListener('pointerdown',ev=>ev.preventDefault());
  renderSymList();renderCTA();
}
function suggest(q){
  const f=fold(q).trim();if(!f)return[];
  const words=f.split(/\s+/),split=s=>s.split(/[\s,'’()\-:.]+/);
  return Object.values(SYM).map(s=>{
    const n=fold(s.nom),syn=fold(s.syn||'');let sc=0;
    if(n.startsWith(f))sc=100;
    else if(split(n).some(w=>w.startsWith(f)))sc=80;
    else if(split(syn).some(w=>w.startsWith(f)))sc=70;
    else if(n.includes(f))sc=50;
    else if(syn.includes(f))sc=40;
    else if(words.length>1&&words.every(w=>n.includes(w)||syn.includes(w)))sc=30;
    return {s,sc};
  }).filter(x=>x.sc).sort((a,b)=>b.sc-a.sc||(SYMFREQ[b.s.id]||0)-(SYMFREQ[a.s.id]||0)||a.s.nom.length-b.s.nom.length).slice(0,8).map(x=>x.s);
}
function hl(nom,q){
  const f=fold(q).trim(),n=fold(nom);if(!f)return esc(nom);
  let i=-1;const re=/[\s,'’()\-:.]/;
  for(let k=n.indexOf(f);k>-1;k=n.indexOf(f,k+1)){if(k===0||re.test(n[k-1])){i=k;break;}}
  if(i<0)i=n.indexOf(f);
  if(i<0||n.length!==nom.length)return esc(nom);
  return esc(nom.slice(0,i))+'<mark>'+esc(nom.slice(i,i+f.length))+'</mark>'+esc(nom.slice(i+f.length));
}
function catName(id){const c=SYMCATS.find(x=>x.id===id);return c?c.nom:'';}
function renderAC(){
  const box=$('#ac');if(!box)return;
  if(!symQuery.trim()){box.hidden=true;box.innerHTML='';return;}
  const list=suggest(symQuery);
  const f=fold(symQuery).trim();
  const tabs=f.length<3?[]:tableaux.filter(t=>t._rep.some(r=>fold(r).split(/[\s,'’()\-]+/).some(w=>w.startsWith(f))||fold(r).startsWith(f))).slice(0,4);
  let h=list.map(s=>`<button type="button" class="ac-item" role="option" data-acsym="${esc(s.id)}" aria-selected="${symSel.has(s.id)}"><span class="ac-n">${hl(s.nom,symQuery)}</span><span class="ac-c">${esc(catName(s.cat))}</span>${symSel.has(s.id)?'<span class="ac-ok" aria-hidden="true">✓</span>':''}</button>`).join('');
  if(tabs.length)h+=`<p class="ac-h">Tableaux liés à « ${esc(symQuery.trim())} »</p>`+tabs.map(t=>`<button type="button" class="ac-item ac-tab" data-opent="${esc(t.id)}"><span class="ac-n">${esc(t.nom)}</span><span class="ac-c">${esc(t._rep.find(r=>fold(r).includes(f))||t._label)}</span></button>`).join('');
  box.innerHTML=h||'<p class="ac-empty">Aucun symptôme ne correspond. Essaie un autre mot.</p>';
  box.hidden=false;
}
function pickSuggestion(id){
  const was=symSel.has(id);
  if(!was){symSel.add(id);saveSet('ys.symptomes',symSel);}
  document.querySelectorAll(`[data-sym="${cssq(id)}"]`).forEach(c=>c.setAttribute('aria-pressed','true'));
  symQuery='';const q=$('#sq');if(q){q.value='';q.focus({preventScroll:true});}
  renderAC();updateCatCounts();renderCTA();
  toast(was?'Déjà choisi : '+symName(id):'Ajouté : '+symName(id),was?null:()=>{symSel.delete(id);saveSet('ys.symptomes',symSel);document.querySelectorAll(`[data-sym="${cssq(id)}"]`).forEach(c=>c.setAttribute('aria-pressed','false'));updateCatCounts();renderCTA();});
}
function catList(c){return arr(c.liste).length?c.liste.map(id=>SYM[id]).filter(Boolean):Object.values(SYM).filter(s=>s.cat===c.id);}
function catCount(cat){const c=SYMCATS.find(x=>x.id===cat);return c?catList(c).filter(s=>symSel.has(s.id)).length:0;}
function renderSymList(){
  const box=$('#symlist');if(!box)return;
  box.innerHTML=SYMCATS.map(c=>{
    const list=catList(c);if(!list.length)return'';
    const k=catCount(c.id);
    return `<details class="cat${arr(c.liste).length?' theme':''}" data-cat="${esc(c.id)}"${openCat===c.id?' open':''}><summary><span>${esc(c.nom)}</span>${k?`<span class="cat-n">${k}</span>`:''}</summary><div class="chips">${list.map(s=>symChip(s.id)).join('')}</div></details>`;
  }).join('');
  accordion(box,v=>{openCat=v;});
}
function accordion(box,setOpen){
  let anchorTop=null;
  box.querySelectorAll('details.cat>summary').forEach(s=>s.addEventListener('click',()=>{anchorTop=s.getBoundingClientRect().top;}));
  box.querySelectorAll('details.cat').forEach(d=>d.addEventListener('toggle',()=>{
    if(d.open){
      setOpen(d.dataset.cat);
      box.querySelectorAll('details.cat[open]').forEach(o=>{if(o!==d)o.open=false;});
      if(anchorTop!==null){const s=d.querySelector('summary');window.scrollBy(0,s.getBoundingClientRect().top-anchorTop);}
    }else if(![...box.querySelectorAll('details.cat')].some(o=>o.open)){setOpen(null);}
    anchorTop=null;
  }));
}
function updateCatCounts(){
  document.querySelectorAll('#symlist details.cat').forEach(d=>{
    const k=catCount(d.dataset.cat);const sm=d.querySelector('summary');let n=sm.querySelector('.cat-n');
    if(k){if(!n){n=document.createElement('span');n.className='cat-n';sm.appendChild(n);}n.textContent=k;}else if(n)n.remove();
  });
}
function renderCTA(){
  const box=$('#symcta');if(!box)return;
  const n=symSel.size;
  if(!n){box.hidden=true;box.innerHTML='';return;}
  const res=matchTableaux(),best=res[0];
  box.innerHTML=`<div class="cta-bar"><div class="cta-t"><b>${plural(n,'symptôme','symptômes')}</b><span>${best?'Le plus proche : '+esc(best.t.nom)+' ('+best.pct+' %)':'Ajoute d\'autres signes pour affiner'}</span></div><button type="button" class="cta-x" data-clear="sym" aria-label="Effacer tous les symptômes">Effacer</button><button type="button" class="cta" data-mode="resultats">Voir${res.length?' ('+res.length+')':''} <span aria-hidden="true">→</span></button></div>`;
  box.hidden=false;
}
function renderSymResults(){
  const sel=[...symSel].filter(s=>SYM[s]);
  const res=matchTableaux();
  let h=`<div class="bar"><button class="back" type="button" data-mode="choisir"><span aria-hidden="true">‹</span>Modifier</button><span class="kind">${plural(sel.length,'symptôme','symptômes')}</span></div>
<h1 class="vh" style="margin-top:18px">Tes résultats</h1><p class="hint">Touche un symptôme pour le retirer, ou <button type="button" class="linkbtn inline" data-clear="sym">efface tout</button>.</p>
<div class="chips small">${sel.map(s=>`<button type="button" class="chip rm" data-sym="${esc(s)}" aria-pressed="true" aria-label="Retirer ${esc(symName(s))}">${esc(symName(s))} <span aria-hidden="true">×</span></button>`).join('')}</div>`;
  const alerts=sel.filter(s=>SYM[s].alerte);
  if(alerts.length)h+=`<div class="alert" role="note"><h2>Quand consulter</h2><ul>${alerts.map(s=>`<li><b>${esc(SYM[s].nom)}.</b> ${esc(SYM[s].alerte)}</li>`).join('')}</ul></div>`;
  if(!res.length){
    h+='<p class="msg">Pas encore de tableau qui correspond. Ajoute d\'autres symptômes, ou regarde les tableaux par organe.</p>';
  }else{
    const shown=showAll?res:res.slice(0,5);
    h+=sel.length===1?`<h2 class="results-h">${plural(res.length,'tableau contient','tableaux contiennent')} ce signe</h2><p class="hint">Regarde les autres signes de chaque tableau (en gras, les signes clés) : celui où tu te reconnais le plus est le bon point de départ. Touche un signe pour l'ajouter.</p>`
      :`<h2 class="results-h">${plural(res.length,'tableau possible','tableaux possibles')}</h2>`;
    h+='<div class="entries">';
    shown.forEach(r=>{
      const [cls,lab]=force(r);
      const missK=r.t._cle.filter(s=>!symSel.has(s)),missO=r.t._autres.filter(s=>!symSel.has(s)&&!/^langue|^enduit|^pointe|^bords/.test(s));
      const miss=[...missK.map(s=>[s,1]),...missO.map(s=>[s,0])].slice(0,Math.max(6,missK.length));
      const extra=`<span class="match">${ringHTML(r.pct,cls)}<span class="match-t"><b>${r.pct} % compatible</b><span>avec tes symptômes · ${lab}</span></span></span><span class="emiss">Tu as : ${esc(r.m.map(s=>symName(s).toLowerCase()).join(', '))}</span>${r.contra.length?`<span class="emiss">Mais : ${esc(r.contra.map(s=>symName(s).toLowerCase()).join(', '))}</span>`:''}`;
      h+=`<div class="result">${cardT(r.t,extra,true)}${miss.length?`<div class="verify"><span>As-tu aussi ces signes ?</span><div class="chips small">${miss.map(([s,k])=>`<button type="button" class="chip add${k?' key':''}" data-sym="${esc(s)}" aria-pressed="false">+ ${esc(symName(s))}</button>`).join('')}</div></div>`:''}</div>`;
    });
    h+='</div>';
    if(res.length>5&&!showAll)h+=`<button type="button" class="ghost wide" data-more="1">Voir les ${res.length-5} autres</button>`;
    const recs=[],prots=[];
    res.slice(0,3).forEach(r=>{arr(r.t.recettes).forEach(id=>{const e=fiche(id);if(e&&!recs.includes(e))recs.push(e);});arr(r.t.fiches).forEach(id=>{const e=fiche(id);if(e&&!prots.includes(e))prots.push(e);});});
    fiches.filter(e=>e.type==='protocole'&&e._sym.some(s=>symSel.has(s))).forEach(e=>{if(!prots.includes(e))prots.push(e);});
    if(recs.length)h+=`<h2 class="results-h">Recettes adaptées</h2><div class="entries">${recs.slice(0,6).map(e=>cardF(e)).join('')}</div>`;
    if(prots.length)h+=`<h2 class="results-h">Protocoles complets</h2><div class="entries">${prots.map(e=>cardF(e)).join('')}</div>`;
  }
  h+='<p class="fine">Ces correspondances orientent ta pratique de bien-être selon la médecine traditionnelle chinoise. Elles ne sont pas un diagnostic et ne remplacent pas un avis médical.</p>';
  view.innerHTML=h;
}
function toggleSym(id,anchor){
  const before=anchor&&anchor.isConnected?anchor.getBoundingClientRect().top:null;
  symSel.has(id)?symSel.delete(id):symSel.add(id);saveSet('ys.symptomes',symSel);
  const on=symSel.has(id);
  document.querySelectorAll(`[data-sym="${cssq(id)}"]`).forEach(c=>c.setAttribute('aria-pressed',String(on)));
  if(route)return;
  if(tab==='symptomes'&&symMode==='choisir'){
    updateCatCounts();renderCTA();renderAC();
    if(before!==null&&anchor.isConnected)window.scrollBy(0,anchor.getBoundingClientRect().top-before);
    return;
  }
  if(symMode==='resultats'&&!symSel.size)symMode='choisir';
  refresh();
}

/* ---------- Tableaux ---------- */
function groupsWith(){return ORGS.map(o=>({o,list:tableaux.filter(t=>t._groups.includes(o.id))})).filter(g=>g.list.length);}
function renderTableaux(){
  const gs=groupsWith();
  view.innerHTML=`<h1 class="vh">Tableaux</h1><p class="lede">Les tableaux de la médecine chinoise, organe par organe, avec leurs signes, leurs points et leurs recettes.</p>
<div class="tools">${searchBox('tq',tabQuery,'Chercher un tableau, un organe, un point','Chercher un tableau')}</div>
<nav class="jump" aria-label="Aller à un organe">${gs.map(g=>`<button type="button" class="jump-b" data-jump="${esc(g.o.id)}"><span lang="zh-Hans">${esc(g.o.zh||'')}</span>${esc(g.o.nom)}</button>`).join('')}</nav>
<div id="tablist"></div>`;
  const q=$('#tq');q.addEventListener('input',()=>{tabQuery=q.value;renderTabList();});
  renderTabList();
}
function renderTabList(){
  const box=$('#tablist');if(!box)return;
  let h='',n=0;
  groupsWith().forEach(({o,list})=>{
    list=list.filter(t=>matchQ(t._hay,tabQuery)&&(!tabQuery.trim()||t.organe===o.id));
    if(!list.length)return;n+=list.length;
    const also=tabQuery.trim()||o.id==='combines'?[]:tableaux.filter(t=>t.organe==='combines'&&String(t.etiquette||'').split(' · ').includes(o.nom));
    h+=`<section class="grp" id="grp-${esc(o.id)}"><h2 class="org"><span class="org-zh" lang="zh-Hans">${esc(o.zh||'')}</span><span>${esc(o.nom)}${o.sous?`<small>${esc(o.sous)}</small>`:''}</span><span class="org-n">${list.length}</span></h2><div class="entries">${list.map(t=>cardT(t)).join('')}</div>${also.length?`<div class="also"><span>Avec un autre organe</span>${also.map(t=>`<button type="button" class="also-b" data-opent="${esc(t.id)}"><b>${esc(t.etiquette)}</b> ${esc(t.nom)}</button>`).join('')}</div>`:''}</section>`;
  });
  box.innerHTML=n?h:`<p class="msg">Aucun tableau ne correspond à « ${esc(tabQuery.trim())} ».</p>`;
  const nav=view.querySelector('.jump');if(nav)nav.hidden=!!tabQuery.trim();
}
function signChips(list,key){
  return list.map(s=>`<button type="button" class="chip sign${key?' key':''}" data-sym="${esc(s)}" aria-pressed="${symSel.has(s)}">${esc(symName(s))}</button>`).join('');
}
function renderTableauDetail(t){
  const n=[...t._cle,...t._autres].filter(s=>symSel.has(s)).length;
  const me=n?matchTableaux().find(x=>x.t===t):null;let compatH='';
  if(me){const [cls,lab]=force(me);compatH=`<div class="compat">${ringHTML(me.pct,cls,true)}<div><b>Compatible à ${me.pct} % avec tes symptômes</b><span>${esc(lab.charAt(0).toUpperCase()+lab.slice(1))} · ${symSel.size===1?'ton signe s\'y retrouve':me.m.length+' de tes '+symSel.size+' signes s\'y retrouve'+(me.m.length>1?'nt':'')}</span></div></div>`;}
  let h=`<div class="fiche tableau">${barHTML('t',t.id,t._label)}
<header class="dhead"><p class="eyebrow">${esc(t._label)}</p><h1 class="dtitle">${esc(t.nom)}</h1>
${t.simple?`<p class="dsimple">${esc(t.simple)}</p>`:''}${t._rep.length?`<p class="dreps"><b>Souvent :</b>${t._rep.map(r=>`<span>${esc(r)}</span>`).join('')}</p><p class="dnote">Repères pour s'orienter : un tableau de médecine chinoise n'est pas un diagnostic médical.</p>`:''}
${compatH}<p class="sub"><span lang="zh-Hans">${esc(t.zh||'')}</span>${t.py?` · ${esc(t.py)}`:''}</p>
${t.resume?`<p class="ctx">${esc(t.resume)}</p>`:''}</header>`;
  if(t.consulter)h+=`<div class="alert" role="note"><h2>Avis médical</h2><p>${esc(t.consulter)}</p></div>`;
  if(arr(t.causes).length)h+=`<h2 class="sec">Causes fréquentes</h2><ul class="bullets">${t.causes.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`;
  if(t.mecanisme)h+=`<h2 class="sec">Ce qui se passe</h2><p class="prose">${esc(t.mecanisme)}</p>`;
  h+=`<h2 class="sec">Signes${n?` <span class="sec-n">${n} chez toi</span>`:''}</h2><p class="hint">Les signes clés sont en gras. Touche un signe pour l'ajouter à tes symptômes.</p><div class="chips">${signChips(t._cle,true)}${signChips(t._autres,false)}</div>`;
  h+=`<dl class="kv tongue">${t.langue?`<dt>Langue</dt><dd>${esc(t.langue)}</dd>`:''}${t.pouls?`<dt>Pouls</dt><dd>${esc(t.pouls)}</dd>`:''}</dl>`;
  h+=prinHTML(t);
  if(t._items.length){
    h+='<h2 class="sec">Points d\'auto-massage</h2>';
    if(t.moxa)h+=`<p class="hint">${esc(t.moxa)}</p>`;
    h+=protoHTML(t);
  }
  const recs=arr(t.recettes).map(fiche).filter(Boolean);
  if(recs.length)h+=`<h2 class="sec">Recettes adaptées</h2><div class="entries">${recs.map(e=>cardF(e)).join('')}</div>`;
  const prots=arr(t.fiches).map(fiche).filter(Boolean);
  if(prots.length)h+=`<h2 class="sec">Protocole complet</h2><div class="entries">${prots.map(e=>cardF(e)).join('')}</div>`;
  if(t.privilegier||t.eviter)h+=`<h2 class="sec">Alimentation et hygiène de vie</h2><div class="dual">${t.privilegier?`<div class="card good"><h3>À privilégier</h3><p>${esc(t.privilegier)}</p></div>`:''}${t.eviter?`<div class="card bad"><h3>À éviter</h3><p>${esc(t.eviter)}</p></div>`:''}</div>`;
  if(arr(t.conseils).length)h+=`<h2 class="sec">Conseils</h2><ul class="bullets">${t.conseils.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`;
  h+='<p class="fine">Ce tableau décrit un déséquilibre selon la médecine traditionnelle chinoise. Il ne remplace pas un avis médical.</p></div>';
  view.innerHTML=h;
  afterDetail(t);
}

/* ---------- Cuisine ---------- */
function renderCuisine(){
  const recs=fiches.filter(e=>e.type==='recette');
  let h=`<h1 class="vh">Cuisine</h1><p class="lede">Diététique chinoise au quotidien : à la casserole, au cuiseur, à la cocotte ou au four.</p>
<details class="cat pick" data-cat="_ing"${ingOpen?' open':''}><summary><span>J'ai dans ma cuisine…</span>${have.size?`<span class="cat-n">${have.size}</span>`:''}</summary>
${INGCATS.map(c=>{const list=Object.values(INGC).filter(i=>i.cat===c.id);return list.length?`<p class="subcat">${esc(c.nom)}</p><div class="chips och">${list.map(i=>`<button type="button" class="chip" data-ing="${esc(i.id)}" aria-pressed="${have.has(i.id)}">${esc(i.nom)}</button>`).join('')}</div>`:'';}).join('')}
${have.size?'<button type="button" class="linkbtn" data-clear="ing">Tout décocher</button>':''}
<p class="fine">L'eau, le sel, l'huile, la sauce soja et le sucre sont comptés d'office.</p></details>
<div id="cuisres"></div>`;
  h+='<h2 class="results-h">Toutes les recettes</h2>';
  AXES.forEach(a=>{
    const list=recs.filter(e=>e.axe===a.id);if(!list.length)return;
    h+=`<h3 class="axe"><span class="org-zh" lang="zh-Hans">${esc(a.zh||'')}</span>${esc(a.nom)}<span class="org-n">${list.length}</span></h3><div class="entries">${list.map(e=>cardF(e)).join('')}</div>`;
  });
  const other=recs.filter(e=>!AXES.some(a=>a.id===e.axe));
  if(other.length)h+=`<h3 class="axe">Autres</h3><div class="entries">${other.map(e=>cardF(e)).join('')}</div>`;
  view.innerHTML=h;
  const d=view.querySelector('details.pick');
  if(d)d.addEventListener('toggle',()=>{ingOpen=d.open;});
  renderCuisRes();
}
function renderCuisRes(){
  const box=$('#cuisres');if(!box)return;
  const recs=fiches.filter(e=>e.type==='recette');
  if(!have.size){box.innerHTML='';return;}
  const m=recs.map(e=>({e,got:e._keys.filter(k=>have.has(k))})).filter(r=>r.got.length).sort((a,b)=>(b.got.length/b.e._keys.length)-(a.got.length/a.e._keys.length)||b.got.length-a.got.length);
  let h=`<h2 class="results-h">${m.length?'Avec tes ingrédients':'Aucune recette avec ces ingrédients'}</h2>`;
  if(m.length)h+='<div class="entries">'+m.slice(0,8).map(r=>{
    const miss=r.e._keys.filter(k=>!have.has(k)).map(k=>(INGC[k]?INGC[k].nom:k).toLowerCase());
    return cardF(r.e,`<span class="ematch">Tu as ${r.got.length} ingrédient${r.got.length>1?'s':''} sur ${r.e._keys.length}</span><span class="emiss">${miss.length?'Il manque : '+esc(miss.join(', ')):'Tu as tout ce qu\'il faut'}</span>`);
  }).join('')+'</div>';
  box.innerHTML=h;
}
function toggleIng(id,anchor){
  const before=anchor.getBoundingClientRect().top;
  have.has(id)?have.delete(id):have.add(id);saveSet('ys.cuisine',have);
  document.querySelectorAll(`[data-ing="${cssq(id)}"]`).forEach(c=>c.setAttribute('aria-pressed',String(have.has(id))));
  const sm=view.querySelector('details.pick>summary');
  if(sm){let n=sm.querySelector('.cat-n');if(have.size){if(!n){n=document.createElement('span');n.className='cat-n';sm.appendChild(n);}n.textContent=have.size;}else if(n)n.remove();}
  renderCuisRes();
  window.scrollBy(0,anchor.getBoundingClientRect().top-before);
}

/* ---------- Carnet ---------- */
function collCount(cid){
  if(cid==='tout')return fiches.filter(e=>!isHidden('f',e.id)).length;
  const it=coll(cid);return it?it.filter(x=>item(x.k,x.id)).length:0;
}
function renderCarnet(){
  if(carnetSel!=='tout'&&!coll(carnetSel))carnetSel='tout';
  const custom=isCustom(carnetSel);
  let h=`${FB?`<div class="accrow"><button type="button" class="accbtn" id="accbtn" data-account="1" aria-label="${user?'Ton compte':'Se connecter'}">${accBtnInner()}</button></div>`:''}<header class="mast">${SEAL}<div><h1>Carnet Yang Sheng</h1><p class="lede">Reste appuyé sur une fiche pour la ranger ou la glisser dans un carnet, et sur un onglet pour le déplacer.</p></div></header>
<nav class="colls" aria-label="Carnets">${orderedColls().map(([id,n])=>`<button type="button" class="coll${id===carnetSel?' on':''}" data-coll-sel="${esc(id)}" data-lpc="${esc(id)}" aria-pressed="${id===carnetSel}">${esc(n)}<span class="n">${collCount(id)}</span></button>`).join('')}<button type="button" class="coll add" data-newcarnet="1">+ Nouveau carnet</button>${carnets.length?'<button type="button" class="coll add" data-manage="1">Gérer</button>':''}</nav>
<div class="tools"><div class="coll-h"><h2>${esc(collName(carnetSel))}</h2><span class="coll-a">${selMode?'':'<button type="button" class="ghost" data-selstart="1">Sélectionner</button>'}${custom?`<button type="button" class="ghost" data-cmenu="${esc(carnetSel)}" aria-label="Options du carnet">Options</button>`:''}</span></div>`;
  if(carnetSel==='tout')h+=`<div class="seg segf" role="group" aria-label="Afficher"><button type="button" data-f="tout">Tout <span class="n"></span></button><button type="button" data-f="protocole">Protocoles <span class="n"></span></button><button type="button" data-f="recette">Recettes <span class="n"></span></button></div>
<div class="trirow"><span id="tri-l">Classement</span><div class="seg segt" role="group" aria-labelledby="tri-l"><button type="button" data-tri="date">Par date</button><button type="button" data-tri="perso">Mon ordre</button></div></div>`;
  h+=`${searchBox('q',query,'Chercher un point, un plat, un symptôme','Chercher dans le carnet')}</div><div id="timeline" aria-live="polite"></div>`;
  view.innerHTML=h;
  const q=$('#q');q.addEventListener('input',()=>{query=q.value;renderTimeline();});
  renderTimeline();
  const on=view.querySelector('.coll.on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest',inline:'center'});
}
function renderTimeline(){
  const box=$('#timeline');if(!box)return;
  delete box.dataset.sort;
  if(carnetSel==='tout'){
    const vis=fiches.filter(e=>!isHidden('f',e.id));
    const counts={tout:vis.length,protocole:0,recette:0};vis.forEach(e=>counts[e.type]++);
    view.querySelectorAll('.segf button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.f===filter));b.querySelector('.n').textContent=counts[b.dataset.f];});
    view.querySelectorAll('.segt button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tri===toutTri)));
    const byKey={};fiches.forEach(e=>{byKey['f:'+e.id]=e;});
    const rowsList=toutKeys().map(k=>byKey[k]).filter(e=>e&&!isHidden('f',e.id)&&(filter==='tout'||e.type===filter)&&matchQ(e._hay,query));
    let h='';
    if(!rowsList.length)h=`<p class="msg">Aucune fiche ne correspond${query.trim()?` à « ${esc(query.trim())} »`:''}.</p>`;
    else{
      if(rowsList.length>1&&!selMode)h+=`<p class="hint">${toutTri==='perso'?'Dans ton ordre. Reste appuyé puis fais glisser une fiche pour la déplacer.':'Classées par date. Reste appuyé puis fais glisser une fiche pour la placer où tu veux.'}</p>`;
      if(toutTri==='perso')h+=`<div class="entries" data-coll="tout" data-sort="tout">${rowsList.map(e=>cardF(e)).join('')}</div>`;
      else{
        let month='',day=null;const close=()=>{if(day!==null)h+='</div></section>';};
        rowsList.forEach(e=>{
          const d=e._d,mk=d?d.getFullYear()+'-'+d.getMonth():'?',dk=e.date||'?';
          if(mk!==month){close();day=null;month=mk;h+=`<h2 class="month">${d?MOIS[d.getMonth()]+' '+d.getFullYear():'Sans date'}</h2>`;}
          if(dk!==day){close();day=dk;h+=`<section class="day" aria-label="${esc(longDate(d))}"><div class="date" aria-hidden="true"><span class="d">${d?d.getDate():'–'}</span><span class="w">${d?JOURS_C[d.getDay()]:''}</span></div><div class="entries" data-coll="tout">`;}
          h+=cardF(e);
        });
        close();
      }
    }
    const nm=masques.filter(m=>item(m.k,m.id)).length;
    if(nm)h+=`<p class="masked">${plural(nm,'fiche masquée','fiches masquées')} <button type="button" class="linkbtn" data-unhide="1">Tout réafficher</button></p>`;
    box.innerHTML=h;
    if(toutTri==='date'&&rowsList.length>1)box.dataset.sort='tout';
    decorateSel(box);return;
  }
  const it=(coll(carnetSel)||[]).map(x=>({x,e:item(x.k,x.id)})).filter(r=>r.e);
  if(!it.length){
    box.innerHTML=carnetSel==='favoris'?'<p class="msg">Pas encore de favori. Touche l\'étoile d\'une fiche, ou reste appuyé dessus et choisis « Ajouter aux favoris ».</p>':
      carnetSel==='recents'?'<p class="msg">Les fiches et tableaux que tu ouvres apparaîtront ici.</p>':
      '<p class="msg">Ce carnet est vide. Reste appuyé sur une fiche ou un tableau, n\'importe où dans l\'appli, puis fais-la glisser vers ce carnet en haut de l\'écran, ou choisis « Ajouter à un carnet ».</p>';
    box.classList.remove('selecting');return;
  }
  const shown=it.filter(r=>matchQ(r.e._hay,query));
  if(!shown.length){box.innerHTML=`<p class="msg">Aucune fiche ne correspond à « ${esc(query.trim())} ».</p>`;decorateSel(box);return;}
  const sortable=carnetSel!=='recents';
  const hint=selMode||shown.length<2?'':sortable?'Reste appuyé puis fais glisser une fiche pour la placer où tu veux, ou vers un autre carnet.':'Les récents se classent tout seuls. Fais glisser une fiche vers le haut pour la ranger dans un carnet.';
  box.innerHTML=`${hint?`<p class="hint">${hint}</p>`:''}<div class="entries${sortable?' sortable':''}" data-coll="${esc(carnetSel)}"${sortable?` data-sort="${esc(carnetSel)}"`:''}>${shown.map(r=>card(r.e)).join('')}</div>`;
  decorateSel(box);
}

/* ---------- Infos ---------- */
const GUIDE=[
 ['Trouver un point : le cun','Le cun est l\'unité de mesure de ton propre corps. 1 cun correspond à la largeur de ton pouce au niveau de l\'articulation. 1,5 cun, c\'est l\'index et le majeur serrés. 3 cun, les quatre doigts serrés au niveau de l\'articulation du milieu. Le bon endroit est souvent un petit creux, un peu plus sensible au toucher.'],
 ['Disperser ou tonifier','Disperser : pression ferme, rotation dans le sens inverse des aiguilles d\'une montre, environ une minute. Pour ce qui est en excès : blocage, chaleur, douleur vive. Tonifier : pression douce, rotation dans le sens des aiguilles d\'une montre, une à deux minutes. Pour ce qui manque : fatigue, froid, vide. Dans une séance, commence toujours par disperser, puis tonifie.'],
 ['Enchaîner les points sans toucher le téléphone','Dans une séance, active « Enchaîner automatiquement » : à la fin d\'un côté, l\'appli sonne et lance le côté opposé ou le point suivant 5 secondes plus tard. Tes mains restent sur les points.'],
 ['La chaleur : moxa ou bouillotte','Le moxa est un bâton d\'armoise qui se consume. Tiens-le à 2 ou 3 cm de la peau et éloigne-le dès que ça pique. Sans moxa, une bouillotte posée sur le point fait déjà du bien. Pas de chaleur en cas de fièvre, de signes de chaleur (langue rouge, soif), ni sur une peau abîmée. Aère la pièce et éteins le moxa en l\'étouffant dans du sel ou du sable.'],
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
  const acc=(list,g)=>`<div class="accwrap" data-acc="${g}">`+list.map(([t,p],i)=>`<details class="cat" data-cat="${g}${i}"><summary><span>${esc(t)}</span></summary><p class="prose">${esc(p)}</p></details>`).join('')+'</div>';
  view.innerHTML=`<header class="mast">${SEAL}<div><h1>Carnet Yang Sheng</h1><p class="lede">Version ${esc(DATA.version||'')}</p></div></header>
${FB?`<section class="card acc-card" id="acccard">${accCardInner()}</section>`:''}
<section class="card"><h2>À lire avant d'utiliser</h2><p>Carnet Yang Sheng propose des routines de bien-être inspirées de la médecine traditionnelle chinoise : auto-massage de points, chaleur et recettes.</p><p>Ce n'est ni un diagnostic ni un traitement. Si un symptôme dure, s'aggrave ou t'inquiète, consulte un médecin. En urgence, appelle le 15 ou le 112.</p></section>
<h2 class="sec">Bien masser</h2>${acc(GUIDE,'g')}
<h2 class="sec">Petit lexique</h2>${acc(LEXIQUE,'l')}
<section class="card"><h2>Astuces</h2><p>Reste appuyé sur une fiche ou un tableau pour l'ajouter aux favoris ou à un carnet, le partager ou le retirer. Sans lâcher, fais-la glisser vers le haut de l'écran pour la déposer dans un carnet.</p><p>Dans le carnet : fais glisser une fiche pour changer l'ordre, reste appuyé sur un onglet pour le déplacer, et touche « Sélectionner » pour cocher plusieurs fiches à la fois (tout cocher, favoris, ajouter, déplacer, retirer).</p><p>« Partager » envoie un lien direct vers la fiche : pratique pour transmettre une recette ou un protocole.</p></section>
<section class="card"><h2>Installer sur ton téléphone</h2>${inst}</section>
<section class="card"><h2>Faire découvrir l'appli</h2><p>Envoie le lien à tes proches : ils l'ouvrent dans Chrome et l'installent comme toi.</p><button type="button" class="primary" data-shareapp="1">Partager l'appli</button></section>
<section class="card"><h2>Tes données</h2>${FB?'<p>Sans compte, rien ne quitte ce téléphone. Le compte est facultatif : si tu en crées un, ton e-mail, ton nom, ta photo, tes carnets, favoris, récents et ton classement sont gardés sur un serveur sécurisé (Google Firebase) pour les retrouver sur un autre appareil. Tu peux supprimer ton compte à tout moment depuis « Ton compte ».</p><p>Tes symptômes et tes ingrédients restent toujours sur ce téléphone.</p>':'<p>L\'appli ne demande aucun compte et ne collecte aucune donnée personnelle. Tes symptômes, tes ingrédients, tes favoris et tes carnets restent sur ce téléphone.</p>'}</section>
<section class="card"><h2>Contenu</h2><dl class="kv"><dt>Symptômes</dt><dd>${Object.keys(SYM).length}</dd><dt>Tableaux</dt><dd>${tableaux.length}</dd><dt>Points</dt><dd>${Object.keys(PTS).length}</dd><dt>Recettes</dt><dd>${nR}</dd><dt>Protocoles</dt><dd>${nP}</dd></dl></section>
<p class="fine">Polices Atkinson Hyperlegible et Noto Serif SC, sous licence SIL Open Font License.</p>`;
  view.querySelectorAll('.accwrap').forEach(w=>accordion(w,()=>{}));
}

/* ---------- Fiche ---------- */
function barHTML(k,id,label){
  const favd=isFav(k,id);
  return `<div class="bar"><button class="back" id="back" type="button"><span aria-hidden="true">‹</span>Retour</button><span class="bar-r"><span class="kind">${esc(label)}</span><button type="button" class="star" data-fav="${k}:${esc(id)}" aria-pressed="${favd}" aria-label="${favd?'Retirer des favoris':'Ajouter aux favoris'}">${favd?'★':'☆'}</button><button type="button" class="more" data-menu="${k}:${esc(id)}" aria-label="Plus d'options"><span aria-hidden="true">⋯</span></button></span></div>`;
}
function prinHTML(e){
  const p=e.principe;if(!p)return'';
  return `<div class="prin">${p.zh?`<span class="pz" lang="zh-Hans">${esc(p.zh)}</span>`:''}<span class="pp">${p.py?`<b>${esc(p.py)}</b>`:''}${p.fr?`<span>${esc(p.fr)}</span>`:''}</span></div>`;
}
function timerBtn(key){return `<button class="timer" type="button" data-tk="${esc(key)}"><span class="lab"><span class="s"></span><span class="h"></span></span><span class="time"></span></button>`;}
function tkey(e,suffix){return e.kind+':'+e.id+'|'+suffix;}
function protoHTML(e){
  const cons=e.consigne||'Une séance par jour. Commence par disperser, puis tonifie. Sur les points doubles, le minuteur se relance pour le côté opposé.';
  let h=`<div class="sum"><p>${e._items.length} ${esc(e.unite||'points')}, environ ${minutes(e)} minutes. ${esc(cons)}</p>
<button type="button" class="switch" data-auto="1" aria-pressed="${auto}"><span class="sw" aria-hidden="true"></span><span><b>Enchaîner automatiquement</b><small>Lance le côté ou le point suivant 5 s après la sonnerie</small></span></button>
<div class="hrow"><span class="count" data-count="${esc(e.kind+':'+e.id)}"></span><button class="ghost" type="button" data-reset="${esc(e.kind+':'+e.id)}">Réinitialiser</button></div></div>`;
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
${figKeys(it).length?`<button type="button" class="voir" data-fig="${esc(figKeys(it).join('|'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>Voir l'image pour l'emplacement du point</button>`:''}
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
  if(arr(e.produits).length)h+='<h3 class="sec">Produits</h3><ul class="prod">'+e.produits.map(p=>`<li><b>${esc(p.nom)}</b><span>${esc(p.texte)}</span></li>`).join('')+'</ul>';
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
  const map={};arr(ings).forEach(i=>{if(i&&i.id)map[i.id]=i;});
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
  const v=currentVar(e);const done=ingDone[e.id]||new Set();
  let h='';
  if(e.precautions)h+=`<div class="alert soft" role="note"><h2>Précaution</h2><p>${esc(e.precautions)}</p></div>`;
  if(e.duree)h+=`<p class="device">Durée : ${esc(e.duree)}</p>`;
  if(e._var.length>1)h+=`<div class="seg varseg" role="group" aria-label="Mode de cuisson" style="grid-template-columns:repeat(${e._var.length},minmax(0,1fr))">${e._var.map(x=>`<button type="button" data-var="${esc(e.id)}:${esc(x.id)}" aria-pressed="${x===v}">${esc(x.nom)}</button>`).join('')}</div>`;
  else if(v&&v.nom)h+=`<p class="device">${esc(v.nom)}</p>`;
  h+=`<div class="serv"><span class="serv-l">Portions</span><div class="stepper"><button type="button" data-serv="-1" aria-label="Une portion de moins"${n<=1?' disabled':''}>−</button><output aria-live="polite">${n}</output><button type="button" data-serv="1" aria-label="Une portion de plus"${n>=12?' disabled':''}>+</button></div></div>`;
  h+='<h2 class="sec">Ingrédients</h2><p class="hint">Touche un ingrédient pour le cocher pendant que tu cuisines.</p><ul class="ing">'+arr(e.ingredients).map(i=>`<li><button type="button" class="ingrow" data-ingdone="${esc(e.id)}:${esc(i.id)}" aria-pressed="${done.has(i.id)}"><span class="q">${esc(qty(i,f).txt)}</span><span class="nm">${esc(i.nom)}${i.cle&&have.has(i.cle)?'<span class="have">✓ tu en as</span>':''}${i.note?`<small>${esc(i.note)}</small>`:''}</span></button></li>`).join('')+'</ul>';
  if(v){
    h+='<h2 class="sec">Étapes</h2><ol class="steps">';
    arr(v.etapes).forEach((s,i)=>{
      const key=tkey(e,v.id+'|s'+i),has=+s.s>0;
      h+=`<li class="step" data-card="${esc(key)}"><span class="snum" aria-hidden="true">${i+1}</span><div><h3>${esc(s.titre)}</h3><p>${fill(s.texte,e.ingredients,f)}</p>${has?timerBtn(key)+`<div class="foot"><button class="redo" type="button" data-plus="${esc(key)}">Ajouter 5 min</button><button class="redo" type="button" data-redo="${esc(key)}">Recommencer</button></div>`:''}</div></li>`;
      if(has)ensureT(key,{eid:e.id,ekind:'f',kind:'step',total:+s.s,b:false,labels:SIDE,title:s.titre||'Étape '+(i+1)});
    });
    h+='</ol>';
  }
  if(arr(e.notes).length)h+='<h2 class="sec">Notes</h2><ul class="bullets">'+e.notes.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
  return h;
}
function renderFicheDetail(e){
  const tabs=e._tab.map(tableau).filter(Boolean);
  view.innerHTML=`<div class="fiche ${e.type}">${barHTML('f',e.id,TYPES[e.type])}
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
  if(t!=='carnet')endSel();
  tab=t;route=null;store('ys.onglet',t);hideStaleToast();
  try{history.replaceState(null,'','#'+t);}catch(e){}
  render();
  window.scrollTo(0,same?0:(scrollMem[t]||0));
}
function openItem(kind,id){
  if(!item(kind,id))return;
  if(!route)scrollMem[tab]=window.scrollY;
  route={kind,id};pushRecent(kind,id);hideStaleToast();
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
  if(ignorePop){flushPop();return;}
  if(sheetOpen){closeSheet(true);return;}
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
function q(attr,val){return document.querySelector(`[${attr}="${cssq(val)}"]`);}
function updT(key){
  const t=T.get(key);if(!t)return;
  const btn=q('data-tk',key);
  if(btn){
    const cardEl=btn.closest('[data-card]');
    cardEl.classList.toggle('running',t.run);cardEl.classList.toggle('done',t.done);cardEl.classList.toggle('next',!!(pendingNext&&pendingNext.key===key));
    btn.style.setProperty('--p',t.done?1:Math.min(1,Math.max(0,1-t.rem/t.total)));
    let s=t.kind==='pt'?(t.b?t.labels[t.side]:'Point central'):'Minuteur',h;
    if(t.done){s='Terminé';h=t.kind==='pt'?(t.b?'Les deux côtés sont faits':'Point fait'):'Étape terminée';}
    else if(pendingNext&&pendingNext.key===key)h=`Démarre dans ${pendingNext.n} s, touche pour lancer tout de suite`;
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
function unlock(){try{if(wl&&!act&&!pendingNext){wl.release();wl=null;}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(act||pendingNext))lock();});
function stop(){if(act){const t=T.get(act);if(t)t.run=false;}act=null;clearInterval(iv);iv=null;}
function start(key){
  const t=T.get(key);if(!t||t.done)return;
  cancelPending(key);
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
function nextPointKey(key){
  const t=T.get(key);if(!t)return null;
  const ref=t.ekind+':'+t.eid+'|p';const idx=+key.split('|p').pop();
  for(let i=idx+1;i<200;i++){const k=ref+i;const x=T.get(k);if(!x)return null;if(!x.done)return k;}
  return null;
}
function finish(key){
  const t=T.get(key);stop();
  if(t.kind==='pt'&&t.b&&t.side===0){t.side=1;t.rem=t.total;beep(2,660);buzz([150,80,150]);updT(key);if(auto)schedule(key);return;}
  t.done=true;t.rem=0;beep(3,880);buzz([200,100,200,100,300]);updT(key);
  if(t.kind==='pt'){
    const nk=nextPointKey(key);
    if(nk&&route&&route.id===t.eid&&route.kind===t.ekind){const el=q('data-tk',nk);if(el)el.closest('[data-card]').scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});}
    if(nk&&auto)schedule(nk);
  }
  unlock();
}
function schedule(key){
  cancelPending();
  pendingNext={key,n:5,iv:setInterval(()=>{
    if(!pendingNext)return;
    pendingNext.n--;
    if(pendingNext.n<=0){const k=pendingNext.key;clearInterval(pendingNext.iv);pendingNext=null;start(k);}
    else updT(pendingNext.key);
  },1000)};
  lock();updT(key);
}
function cancelPending(exceptKey){
  if(!pendingNext)return;
  const k=pendingNext.key;clearInterval(pendingNext.iv);pendingNext=null;
  if(k!==exceptKey)updT(k);
}
function toggle(key){const t=T.get(key);if(!t||t.done)return;if(pendingNext&&pendingNext.key===key){start(key);return;}t.run?pause(key):start(key);}
function redo(key){cancelPending();const t=T.get(key);if(!t)return;if(act===key)stop();Object.assign(t,{run:false,done:false,side:0,total:t.base,rem:t.base});unlock();updT(key);}
function plus(key){const t=T.get(key);if(!t)return;if(t.done){t.done=false;t.total=300;t.rem=300;}else{t.total+=300;t.rem+=300;}updT(key);}
function resetEntry(ref){
  cancelPending();
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

/* ---------- Appui long et glisser-déposer ---------- */
let lp=null,suppressClick=false;
function lpTarget(el){return el&&el.closest?el.closest('[data-lp],[data-lpc]'):null;}
function lpCtx(card){const c=card.closest('[data-coll]');return c?c.dataset.coll:null;}
function openLpMenu(card){const [k,id]=splitKey(card.dataset.lp);itemMenu(k,id,lpCtx(card));}
function suppress(){suppressClick=true;setTimeout(()=>{suppressClick=false;},500);}
function showDock(L){
  const d=$('#dock');if(!d)return;
  const [k,id]=splitKey(L.el.dataset.lp);
  const targets=[['favoris','★ Favoris'],...carnets.map(c=>[c.id,c.nom])].filter(([cid])=>cid!==L.cid);
  d.querySelector('.dock-in').innerHTML=targets.map(([cid,n])=>`<span class="dock-b${inColl(cid,k,id)?' has':''}" data-drop="${esc(cid)}">${esc(n)}</span>`).join('')+'<span class="dock-b new" data-drop="__new">+ Nouveau carnet</span>';
  d.hidden=false;
}
function hideDock(){const d=$('#dock');if(d){d.hidden=true;d.querySelector('.dock-in').innerHTML='';}}
function dockHit(x,y){
  const d=$('#dock');if(!d||d.hidden)return null;let hit=null;
  d.querySelectorAll('[data-drop]').forEach(b=>{const r=b.getBoundingClientRect();const on=!hit&&x>=r.left-6&&x<=r.right+6&&y>=r.top-10&&y<=r.bottom+10;b.classList.toggle('over',on);if(on)hit=b;});
  return hit;
}
function place(x,y){
  const r=lp.el.getBoundingClientRect();
  lp.tx=x-lp.offX-(r.left-lp.tx);lp.ty=y-lp.offY-(r.top-lp.ty);
  lp.el.style.transform=`translate(${lp.tx}px,${lp.ty}px) scale(1.03)`;
}
function dragChip(x,y){
  for(const c of lp.list.querySelectorAll('[data-lpc]')){
    if(c===lp.el)continue;const r=c.getBoundingClientRect();
    if(x>=r.left&&x<=r.right&&y>=r.top-4&&y<=r.bottom+4){
      const ref=x>r.left+r.width/2?c.nextElementSibling:c;
      if(ref!==lp.el&&ref!==lp.el.nextElementSibling)lp.list.insertBefore(lp.el,ref);
      break;
    }
  }
  place(x,y);
}
view.addEventListener('pointerdown',ev=>{
  if(ev.pointerType==='mouse')return;
  const el=lpTarget(ev.target);if(!el)return;
  const chip=el.dataset.lpc!==undefined;
  if(!chip&&selMode&&tab==='carnet'&&!route)return;
  lp={el,chip,x:ev.clientX,y:ev.clientY,pid:ev.pointerId,armed:false,drag:false,tx:0,ty:0,max:0,over:null};
  lp.t=setTimeout(()=>{if(!lp)return;lp.armed=true;buzz(15);el.classList.add('lifted');},450);
});
window.addEventListener('pointermove',ev=>{
  if(!lp||ev.pointerId!==lp.pid)return;
  const x=ev.clientX,y=ev.clientY,dist=Math.hypot(x-lp.x,y-lp.y);
  if(!lp.armed){if(dist>10){clearTimeout(lp.t);lp=null;}return;}
  lp.max=Math.max(lp.max,dist);
  if(!lp.drag){
    if(dist<=6)return;
    lp.drag=true;const r=lp.el.getBoundingClientRect();lp.offX=x-r.left;lp.offY=y-r.top;
    lp.el.classList.add('dragging');
    if(lp.chip){lp.list=lp.el.parentElement;lp.order0=[...lp.list.querySelectorAll('[data-lpc]')].map(c=>c.dataset.lpc).join('|');}
    else{lp.list=lp.el.closest('[data-sort]');lp.cid=lpCtx(lp.el);if(lp.list){lp.order0=sortKeys(lp.list).join('|');lp.raf=requestAnimationFrame(autoScroll);}showDock(lp);}
  }
  lp.lastX=x;lp.lastY=y;
  if(lp.chip){dragChip(x,y);return;}
  const over=dockHit(x,y);lp.over=over;
  if(lp.list&&!over)reorder(y);
  place(x,y);
},{passive:true});
function sortKeys(list){return [...list.querySelectorAll('[data-lp]')].map(c=>c.dataset.lp);}
function reorder(y){
  const cards=[...lp.list.querySelectorAll('[data-lp]')].filter(c=>c!==lp.el);if(!cards.length)return;
  let before=null;
  for(const c of cards){const r=c.getBoundingClientRect();if(y<r.top+r.height/2){before=c;break;}}
  if(before){if(before!==lp.el.nextElementSibling)before.parentNode.insertBefore(lp.el,before);}
  else{const last=cards[cards.length-1];if(last.nextElementSibling!==lp.el)last.parentNode.insertBefore(lp.el,last.nextElementSibling);}
}
function autoScroll(){
  if(!lp||!lp.drag||!lp.list)return;
  const y=lp.lastY,h=window.innerHeight,dk=$('#dock'),top=dk&&!dk.hidden?dk.getBoundingClientRect().bottom:0;
  let v=0;
  if(!lp.over){if(y>h-150)v=Math.min(24,4+(y-(h-150))/4);else if(y<top+70)v=-Math.min(24,4+(top+70-y)/4);}
  if(v){const y0=window.scrollY;window.scrollBy(0,v);if(window.scrollY!==y0){reorder(lp.lastY);place(lp.lastX,lp.lastY);}}
  lp.raf=requestAnimationFrame(autoScroll);
}
function lpEnd(cancel){
  if(!lp)return;clearTimeout(lp.t);
  const L=lp;lp=null;if(L.raf)cancelAnimationFrame(L.raf);
  L.el.classList.remove('lifted','dragging');L.el.style.transform='';
  hideDock();
  if(cancel)return;
  if(L.armed&&(!L.drag||L.max<=24))suppress();
  if(L.chip){
    if(L.drag){const ids=[...L.list.querySelectorAll('[data-lpc]')].map(c=>c.dataset.lpc);if(ids.join('|')!==L.order0){collOrder=ids;persist();toast('Nouvelle place enregistrée');}}
    else if(L.armed){ghostUntil=Date.now()+350;collMenu(L.el.dataset.lpc);}
    return;
  }
  const [k,id]=splitKey(L.el.dataset.lp);
  if(L.drag&&L.over){dropInto(L.over.dataset.drop,k,id,L.cid);return;}
  if(L.drag&&L.list){const vis=sortKeys(L.list);if(vis.join('|')!==L.order0)saveOrder(L.list.dataset.sort,vis,L.el);return;}
  if(L.drag&&L.max>24)return;
  if(L.armed){ghostUntil=Date.now()+350;openLpMenu(L.el);}
}
function saveOrder(cid,vis,el){
  const key=el.dataset.lp,top=el.getBoundingClientRect().top;
  const keep=()=>{const c=document.querySelector(`#timeline [data-lp="${cssq(key)}"]`);if(c)window.scrollBy(0,c.getBoundingClientRect().top-top);};
  if(cid==='tout'){
    const oldTri=toutTri,oldOrd=toutOrdre.slice();
    toutOrdre=mergeOrder(toutKeys(),vis);toutTri='perso';persist();renderTimeline();keep();
    toast(oldTri==='perso'?'Nouvel ordre enregistré':'Fiche déplacée : classement « Mon ordre »',()=>{toutTri=oldTri;toutOrdre=oldOrd;persist();renderTimeline();});
    return;
  }
  const it=coll(cid);if(!it)return;const snap=it.slice();
  const merged=mergeOrder(it.map(keyOf),vis);it.sort((a,b)=>merged.indexOf(keyOf(a))-merged.indexOf(keyOf(b)));persist();
  if(query.trim()){renderTimeline();keep();}
  toast('Nouvel ordre enregistré',()=>{it.splice(0,it.length,...snap);persist();renderTimeline();});
}
function dropInto(target,k,id,src){
  if(target==='__new'){ghostUntil=Date.now()+350;newCarnetFor(k,id,src);return;}
  const move=!!(src&&isCustom(src)&&isCustom(target));
  const had=inColl(target,k,id);
  if(had&&!move){toast('Déjà dans « '+collName(target)+' »');return;}
  const rec=move?removeFrom(src,k,id):null;
  if(!had)addTo(target,k,id);
  refresh();
  toast((move?'Déplacé vers « ':'Ajouté à « ')+collName(target)+' »',()=>{if(!had)removeFrom(target,k,id);if(rec)restoreAt(src,rec);refresh();});
}
window.addEventListener('pointerup',()=>lpEnd(false));
window.addEventListener('pointercancel',()=>{if(lp&&lp.armed&&!lp.drag){lpEnd(false);}else lpEnd(true);});
document.addEventListener('touchmove',ev=>{if(lp&&lp.armed)ev.preventDefault();},{passive:false});
view.addEventListener('contextmenu',ev=>{
  const el=lpTarget(ev.target);if(!el)return;ev.preventDefault();if(lp)return;
  if(el.dataset.lpc!==undefined)collMenu(el.dataset.lpc);else openLpMenu(el);
});

/* ---------- Interactions ---------- */
document.addEventListener('click',ev=>{
  if(Date.now()<ghostUntil&&ev.target.closest&&ev.target.closest('#sheet')){ghostUntil=0;ev.preventDefault();ev.stopPropagation();return;}
  if(suppressClick&&view.contains(ev.target)){ev.preventDefault();ev.stopPropagation();suppressClick=false;return;}
  if(ev.target.id==='sheet'){closeSheet();return;}
  const b=ev.target.closest('button');if(!b)return;
  const d=b.dataset;
  if(b.closest('#sheet')){
    if(d.pwtoggle){const i=b.parentNode.querySelector('input'),show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'Masquer':'Afficher';b.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe');return;}
    if(d.act)onSheetAct(d.act);else if(b.classList.contains('sheet-cancel'))closeSheet();return;
  }
  if(d.account){if(!FB)return;accSheet(user?'':'login');if(!compte&&navigator.onLine!==false)loadCompte().catch(()=>{});return;}
  if(selMode&&tab==='carnet'&&!route){const c=b.closest('[data-lp]');if(c&&c.closest('#timeline')){toggleSel(c);return;}}
  if(d.selstart){selMode=true;selSet.clear();refresh();return;}
  if(d.selend){endSel();refresh();return;}
  if(d.selall){const vis=visKeys(),all=vis.every(v=>selSet.has(v));vis.forEach(v=>all?selSet.delete(v):selSet.add(v));document.querySelectorAll('#timeline [data-lp]').forEach(c=>c.setAttribute('aria-pressed',String(selSet.has(c.dataset.lp))));selInfo();return;}
  if(d.selact){selAction(d.selact);return;}
  if(d.manage){manageSel.clear();manageSheet();return;}
  if(d.tab){goTab(d.tab);return;}
  if(d.open){openItem('f',d.open);return;}
  if(d.opent){openItem('t',d.opent);return;}
  if(b.id==='back'){goBack();return;}
  if(d.mode){symMode=d.mode;showAll=false;render();window.scrollTo(0,0);return;}
  if(d.more){showAll=true;rerenderKeep('[data-more]');return;}
  if(d.f){filter=d.f;store('ys.filtre',filter);renderTimeline();return;}
  if(d.tri){if(toutTri!==d.tri){toutTri=d.tri;persist();renderTimeline();toast(toutTri==='perso'?'Classement dans ton ordre':'Classement par date');}return;}
  if(d.collSel){if(selMode&&d.collSel!==carnetSel)endSel();carnetSel=d.collSel;query='';persist();render();return;}
  if(d.newcarnet){newCarnetSheet();return;}
  if(d.cmenu){collMenu(d.cmenu);return;}
  if(d.unhide){const old=masques;masques=[];persist();refresh();toast('Fiches réaffichées',()=>{masques=old;persist();refresh();});return;}
  if(d.menu){const i=d.menu.indexOf(':');itemMenu(d.menu.slice(0,i),d.menu.slice(i+1),null);return;}
  if(d.jump){const s=$('#grp-'+cssq(d.jump));if(s)s.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});return;}
  if(d.acsym){pickSuggestion(d.acsym);return;}
  if(d.tk){toggle(d.tk);return;}
  if(d.redo){redo(d.redo);return;}
  if(d.plus){plus(d.plus);return;}
  if(d.reset){resetEntry(d.reset);return;}
  if(d.auto){auto=!auto;store('ys.auto',auto?'1':'0');document.querySelectorAll('[data-auto]').forEach(x=>x.setAttribute('aria-pressed',String(auto)));if(!auto)cancelPending();toast(auto?'Enchaînement automatique activé':'Enchaînement automatique désactivé');return;}
  if(d.fav){const i=d.fav.indexOf(':'),k=d.fav.slice(0,i),id=d.fav.slice(i+1);const on=!isFav(k,id);on?addTo('favoris',k,id):removeFrom('favoris',k,id);b.setAttribute('aria-pressed',String(on));b.textContent=on?'★':'☆';b.setAttribute('aria-label',on?'Retirer des favoris':'Ajouter aux favoris');toast(on?'Ajouté aux favoris':'Retiré des favoris');return;}
  if(d.var){const i=d.var.indexOf(':');const id=d.var.slice(0,i),v=d.var.slice(i+1);recVar[id]=v;varPref=v;store('ys.variante',v);rerenderKeep(`[data-var="${cssq(d.var)}"]`);return;}
  if(d.ingdone){const i=d.ingdone.indexOf(':'),rid=d.ingdone.slice(0,i),iid=d.ingdone.slice(i+1);const s=ingDone[rid]||(ingDone[rid]=new Set());s.has(iid)?s.delete(iid):s.add(iid);b.setAttribute('aria-pressed',String(s.has(iid)));return;}
  if(d.sym){toggleSym(d.sym,b);return;}
  if(d.ing){toggleIng(d.ing,b);return;}
  if(d.clear==='ing'){have.clear();saveSet('ys.cuisine',have);refresh();return;}
  if(d.clear==='sym'){const old=[...symSel];symSel.clear();saveSet('ys.symptomes',symSel);symMode='choisir';refresh();toast('Symptômes effacés',()=>{old.forEach(s=>symSel.add(s));saveSet('ys.symptomes',symSel);refresh();});return;}
  if(d.fig){figSheet(d.fig);return;}
  if(d.shareapp){shareApp();return;}
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
},true);
document.addEventListener('submit',ev=>{
  const a=ev.target.closest('.acc-form');if(a){ev.preventDefault();accSubmit(a);return;}
  const f=ev.target.closest('.sheet-new');if(!f)return;ev.preventDefault();onSheetSubmit(f);
});
document.addEventListener('change',ev=>{if(ev.target&&ev.target.id==='acc-photo'){handlePhoto(ev.target.files&&ev.target.files[0]);ev.target.value='';}});
window.addEventListener('online',()=>{if(user)syncNow();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user&&Date.now()-(+store('ys.sync.at')||0)>20000)syncNow();});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&sheetOpen)closeSheet();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;if(tab==='infos'&&!route&&DATA)renderInfos();});

/* ---------- Démarrage ---------- */
lastSnap=J(dataOnly());
(function initRoute(){
  const p=parseHash();
  if(p.route)route=p.route;
  else{tab='infos';try{history.replaceState(null,'','#infos');}catch(e){}}
})();
const INTRO_HTML=$('#intro')?$('#intro').outerHTML:'';
function playIntro(){
  if(!INTRO_HTML)return;
  let el=$('#intro');
  if(!el){document.body.insertAdjacentHTML('afterbegin',INTRO_HTML);el=$('#intro');}
  clearTimeout(playIntro.t);
  playIntro.t=setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),600);},reduce?1600:3600);
}
playIntro();
/* Retour dans l'appli après 5 minutes ou plus : on la rouvre comme un nouveau lancement,
   sauf si un minuteur tourne ou si une feuille est ouverte */
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){hiddenAt=Date.now();return;}
  const away=hiddenAt?Date.now()-hiddenAt:0;hiddenAt=0;
  if(away<5*60*1000||act||pendingNext||sheetOpen||lp){checkUpdate(false);return;}
  playIntro();
  if(DATA&&(route||tab!=='infos'))goTab('infos');
  checkUpdate(true);
});
/* Nouvelle version en ligne ? Au retour après 5 min : rechargement pendant l'animation.
   Sinon : bandeau « Mettre à jour » (vérifié au retour dans l'appli et toutes les 10 minutes). */
let lastCheck=0,updOffered=false;
async function checkUpdate(silent){
  if(!silent&&Date.now()-lastCheck<60000)return;lastCheck=Date.now();
  try{
    const cur=document.querySelector('script[src*="app.js?v="]'),cv=cur&&/v=([a-f0-9]+)/.exec(cur.getAttribute('src'));
    if(!cv||!/^https?:$/.test(location.protocol))return;
    const r=await fetch(location.pathname+'?maj='+Date.now(),{cache:'no-store'});if(!r.ok)return;
    const m=/app\.js\?v=([a-f0-9]+)/.exec(await r.text());
    if(!m||m[1]===cv[1])return;
    if(silent||!DATA){location.reload();return;}
    if(act||pendingNext||lp||sheetOpen)return;
    if(!updOffered){updOffered=true;toast('Une nouvelle version de l\'appli est disponible',()=>location.reload(),'Mettre à jour',15000);setTimeout(()=>{updOffered=false;},15000);}
  }catch(e){}
}
setInterval(()=>{if(document.visibilityState==='visible')checkUpdate(false);},10*60*1000);
render();
loadData().then(d=>{
  DATA=d||{};
  PTS=DATA.points&&typeof DATA.points==='object'?DATA.points:{};
  FIGS=DATA.figures&&typeof DATA.figures==='object'?DATA.figures:{};
  SYM={};arr(DATA.symptomes).forEach(s=>{if(s&&s.id)SYM[s.id]=s;});
  SYMCATS=arr(DATA.categories_symptomes);
  ORGS=arr(DATA.organes);ORG={};ORGS.forEach(o=>{ORG[o.id]=o;});
  AXES=arr(DATA.axes);
  INGCATS=arr(DATA.categories_ingredients);
  INGC={};arr(DATA.ingredients).forEach(i=>{if(i&&i.id)INGC[i.id]=i;});
  fiches=arr(DATA.fiches).map(normFiche).filter(Boolean)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(+a.ordre||0)-(+b.ordre||0)||String(a.titre).localeCompare(String(b.titre),'fr'));
  tableaux=arr(DATA.tableaux).map(normTableau).filter(Boolean);
  SYMFREQ={};tableaux.forEach(t=>{t._cle.forEach(x=>{SYMFREQ[x]=(SYMFREQ[x]||0)+2;});t._autres.forEach(x=>{SYMFREQ[x]=(SYMFREQ[x]||0)+1;});});
  tableaux.forEach(t=>arr(t.recettes).forEach(id=>{const e=fiche(id);if(e&&!e._tab.includes(t.id))e._tab.push(t.id);}));
  [...symSel].forEach(s=>{if(!SYM[s])symSel.delete(s);});
  [...have].forEach(s=>{if(!INGC[s])have.delete(s);});
  if(symSel.size&&tab==='symptomes'&&!route)symMode='resultats';
  if(route&&!item(route.kind,route.id))route=null;
  if(FB&&(store('ys.sync.uid')||store('ys.compte.attente')))loadCompte().catch(()=>{});
  const prevV=store('ys.version'),curV=String(DATA.version||'');
  if(curV){store('ys.version',curV);if(prevV&&prevV!==curV)setTimeout(()=>toast('Appli mise à jour : version '+curV),$('#intro')?3900:300);}
  if(route)pushRecent(route.kind,route.id);
  render();
}).catch(()=>{loadError=true;render();});

if('serviceWorker' in navigator&&!window.YS_DATA&&location.protocol==='https:'){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}
})();

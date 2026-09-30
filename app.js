/* Carnet Yang Sheng : logique de l'appli */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cssq=s=>String(s).replace(/["\\]/g,'\\$&');
/* Langue : français par défaut, anglais au choix (Paramètres). Le texte de l'interface passe par t('texte français'). */
const LANG=(()=>{try{return localStorage.getItem('ys.langue')==='en'?'en':'fr';}catch(e){return'fr';}})();
const EN=LANG==='en',LOC=EN?'en-US':'fr-FR';
document.documentElement.lang=LANG;
let UI=EN?{'Ouverture du carnet…':'Opening the notebook…',"Le contenu n'a pas pu se charger. Vérifie ta connexion et rouvre l'appli.":'The content could not load. Check your connection and reopen the app.'}:{};
function $t(s,v){let r=EN&&UI[s]!=null?UI[s]:s;if(v)r=String(r).replace(/\{(\w+)\}/g,(m,k)=>v[k]!==undefined?v[k]:m);return r;}
const MOIS=EN?['January','February','March','April','May','June','July','August','September','October','November','December']:['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JOURS=EN?['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']:['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const JOURS_C=EN?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
const TYPES=EN?{protocole:'Protocol',recette:'Recipe'}:{protocole:'Protocole',recette:'Recette'};
const TECH=EN?{d:['↺','Strong pressure, anticlockwise circles'],t:['↻','Gentle pressure, clockwise circles'],w:['♨︎','Moxa 2–3 cm away or a hot-water bottle, until pleasantly warm']}:{d:['↺','Pression forte, rotation anti-horaire'],t:['↻','Pression douce, rotation horaire'],w:['♨︎','Moxa à 2-3 cm ou bouillotte, jusqu\'à chaleur agréable']};
const PHASE=EN?{d:'Disperse',t:'Tonify',w:'Warm (moxa or hot-water bottle)'}:{d:'Disperser',t:'Tonifier',w:'Réchauffer (moxa ou bouillotte)'};
const SIDE=EN?['Left side','Right side']:['Côté gauche','Côté droit'];
const UNIT=EN?{g:'g',kg:'kg',ml:'ml',cl:'cl',l:'l',tsp:'tsp',tbsp:'tbsp',pinch:'pinch',cup:'cup'}:{g:'g',kg:'kg',ml:'ml',cl:'cl',l:'l',tsp:'c. à café',tbsp:'c. à soupe',pinch:'pincée',cup:'tasse'};
/* Codes des points : français (Rt 6) en interne, OMS (SP 6) en anglais */
const WHO={P:'LU',GI:'LI',E:'ST',Rt:'SP',C:'HT',IG:'SI',V:'BL',Rn:'KI',MC:'PC',TR:'TE',VB:'GB',F:'LR',VG:'GV',RM:'CV'};
function pn(k){if(!EN||!k)return k;if(UI[k]!=null)return UI[k];return String(k).replace(/\b(P|GI|E|Rt|C|IG|V|Rn|MC|TR|VB|F|VG|RM) (\d+)\b/g,(m,a,n)=>WHO[a]+' '+n);}
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
/* Réglages (Infos › Paramètres) */
const DEFPREF={theme:'auto',fs:'n',son:true,vib:true,ecran:true,intro:true,portions:0};
const PREF=Object.assign({},DEFPREF,storedJSON('ys.reglages',{})||{});
function setPref(k,v){PREF[k]=v;store('ys.reglages',J(PREF));}
function applyLook(){
  const r=document.documentElement;
  if(PREF.theme==='dark'||PREF.theme==='light')r.dataset.theme=PREF.theme;else delete r.dataset.theme;
  if(PREF.fs==='l'||PREF.fs==='xl')r.dataset.fs=PREF.fs;else delete r.dataset.fs;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>{if(!m.dataset.c)m.dataset.c=m.content;m.content=PREF.theme==='dark'?'#0F1412':PREF.theme==='light'?'#ECF0ED':m.dataset.c;});
}
applyLook();
/* Textes fixes de la page (body.html) en anglais */
(function localizeBody(){
  if(!EN)return;
  const set=(sel,txt,attr)=>{const el=$(sel);if(el){if(attr)el.setAttribute(attr,txt);else el.textContent=txt;}};
  set('.intro-s','Nourishing life, day by day');set('.mini-t span','Timer running');set('#mini-open','See');
  set('.dock-t','Drop the card into a notebook');set('.toast-b','Undo');set('.sheet-cancel','Close');set('.tabs','Sections','aria-label');
  const L={symptomes:'Symptoms',tableaux:'Patterns',cuisine:'Kitchen',carnet:'Notebook',infos:'Info'};
  document.querySelectorAll('.tab').forEach(b=>{const l=b.querySelector('.tab-l');if(l&&L[b.dataset.tab])l.textContent=L[b.dataset.tab];});
})();

/* ---------- État ---------- */
const view=$('#view');
let DATA=null,FIGS={},SYMFREQ={},loadError=false,fiches=[],tableaux=[],SYM={},SYMCATS=[],ORG={},ORGS=[],AXES=[],GENRES=[],INGC={},INGCATS=[],PTS={},NATS={},SAVS={},ORGC={};
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
const FB={"apiKey": "AIzaSyCxFfO_CXvab_EwGaO2nfgr8koZtkYaYL4", "authDomain": "carnet-yang-sheng-fa.firebaseapp.com", "projectId": "carnet-yang-sheng-fa", "storageBucket": "carnet-yang-sheng-fa.firebasestorage.app", "messagingSenderId": "15040819906", "appId": "1:15040819906:web:36abba069eed2b5f0ac15b"},COMPTE_URL='./compte.js?v=0b95afcf';
let user=null,compte=null,compteP=null,syncState='',syncErr='',syncing=false,syncAgain=false,pushT=null,lastSnap='';
let varPref=store('ys.variante')||'cuiseur';
const recVar={},portions={},ingDone={};
let installEvt=null;
const T=new Map();
let act=null,iv=null,last=0,ac=null,wl=null,pendingNext=null;

/* ---------- Données ---------- */
function parseDate(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function longDate(d){return d?(EN?`${JOURS[d.getDay()]}, ${MOIS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`:`${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`):'';}
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
  const gn=GENRES.find(g=>g.id===e.genre);
  e._hay=hayOf([e.titre,e.zh,e.py,gn&&gn.nom,e.contexte,arr(e.tags).join(' '),e._sym.map(s=>SYM[s].nom).join(' '),e.principe&&[e.principe.zh,e.principe.py,e.principe.fr].join(' '),
    e._items.map(it=>[it.ab,pn(it.ab),it.py,it.zh].join(' ')).join(' '),arr(e.ingredients).map(i=>i.nom).join(' '),arr(e.produits).map(x=>x.nom).join(' ')]);
  return e;
}
function normTableau(d){
  if(!d||!d.id||!d.nom)return null;
  const t=Object.assign({},d,{kind:'t'});
  phasesOf(t);
  t._cle=arr(t.cle).filter(s=>SYM[s]);t._autres=arr(t.autres).filter(s=>SYM[s]);t._contre=arr(t.contre).filter(s=>SYM[s]);
  t._lies=Object.keys(SYM).filter(s=>arr(SYM[s].tab).includes(t.id));
  t._org=ORG[t.organe]||{nom:'',zh:''};
  t._label=t.etiquette||t._org.nom;
  t._groups=[t.organe,...arr(t.groupes)];
  t._rep=arr(t.reperes);
  t._hay=hayOf([t.nom,t.zh,t.py,t.resume,t.simple,t._rep.join(' '),t._label,t.principe&&[t.principe.zh,t.principe.py,t.principe.fr].join(' '),
    [...t._cle,...t._autres,...t._lies].map(s=>SYM[s].nom).join(' '),t._items.map(it=>[it.ab,pn(it.ab),it.py].join(' ')).join(' ')]);
  return t;
}
function fiche(id){return fiches.find(e=>e.id===id);}
function tableau(id){return tableaux.find(e=>e.id===id);}
function item(kind,id){return kind==='t'?tableau(id):fiche(id);}
function titleOf(e){return e.kind==='t'?e.nom:e.titre;}
function minutes(e){return Math.round(e._items.reduce((a,p)=>a+(+p.s||0)*(p.b?2:1),0)/60);}
function meta(e){
  if(e.type==='protocole')return `${e._items.length} ${$t(e.unite||'points')} · ${minutes(e)} min`;
  const m=[];if(e.portions)m.push(e.portions+' '+$t('portions'));if(e.duree)m.push(e.duree);return m.join(' · ');
}
async function loadData(){
  if(window.YS_DATA)return window.YS_DATA;
  const r=await fetch(EN?'data-en.json':'data.json',{cache:'no-cache'});
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
function collName(cid){if(cid==='tout')return $t('Toutes les fiches');if(cid==='favoris')return $t('Favoris');if(cid==='recents')return $t('Récents');const c=carnets.find(x=>x.id===cid);return c?c.nom:'';}
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
  const all=[['tout',$t('Tout')],['favoris','★ '+$t('Favoris')],['recents',$t('Récents')],...carnets.map(c=>[c.id,c.nom])];
  const ids=all.map(x=>x[0]),ord=collOrder.filter(id=>ids.includes(id));
  ids.forEach(id=>{if(!ord.includes(id))ord.push(id);});
  return ord.map(id=>all.find(x=>x[0]===id));
}
function newCarnet(nom){const c={id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),nom:nom.trim().slice(0,40),items:[]};carnets.push(c);persist();return c;}

/* ---------- Éléments communs ---------- */
const SEAL='<div class="seal" lang="zh-Hans" aria-hidden="true"><span>养</span><span>生</span></div>';
function plural(n,s,p){return n+' '+(EN?(n===1?$t(s):$t(p)):(n>1?p:s));}
function symName(id){return SYM[id]?SYM[id].nom:id;}
function liveOn(e){const t=act&&T.get(act);return !!(t&&t.eid===e.id&&t.ekind===e.kind);}
function cardF(e,extra){
  return `<button type="button" class="entry ${e.type}" data-open="${esc(e.id)}" data-lp="f:${esc(e.id)}" aria-label="${esc(TYPES[e.type]+', '+e.titre)}">
<span class="txt"><span class="kind">${TYPES[e.type]}${liveOn(e)?`<span class="live">${$t('en cours')}</span>`:''}${isFav('f',e.id)?`<span class="favdot" aria-label="${$t('favori')}">★</span>`:''}</span><span class="etitle">${esc(e.titre)}</span><span class="emeta">${esc(meta(e))}</span>${extra||''}</span>
${e.principe&&e.principe.zh?`<span class="eprin" lang="zh-Hans" aria-hidden="true">${esc(e.principe.zh)}</span>`:''}
</button>`;
}
function cardT(t,extra,noResume){
  return `<button type="button" class="entry tableau" data-opent="${esc(t.id)}" data-lp="t:${esc(t.id)}" aria-label="${esc($t('Tableau')+', '+t.nom)}">
<span class="txt"><span class="kind">${esc(t._label)}${liveOn(t)?`<span class="live">${$t('en cours')}</span>`:''}${isFav('t',t.id)?`<span class="favdot" aria-label="${$t('favori')}">★</span>`:''}</span><span class="etitle">${esc(t.nom)}</span><span class="emeta clamp">${esc(t.simple||(noResume?'':t.resume)||'')}</span>${t._rep.length?`<span class="reperes"><b>${$t('Souvent :')}</b> ${esc(t._rep.slice(0,4).join(' · '))}</span>`:''}${extra||''}</span>
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
  t.querySelector('.toast-m').textContent=$t(msg);
  const b=t.querySelector('.toast-b');b.hidden=!undo;b.textContent=$t(label||'Annuler');
  b.onclick=()=>{t.hidden=true;clearTimeout(toastT);undo&&undo();};
  t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},ms||(undo?5000:2600));
}
let sheetOpen=false,ignorePop=false,sheetReturn=null,ghostUntil=0;
function openSheet(title,sub,bodyHTML,onReady){
  const s=$('#sheet');
  s.querySelector('.sheet-t').textContent=$t(title||'');
  const st=s.querySelector('.sheet-s');st.textContent=$t(sub||'');st.hidden=!sub;
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
function rows(list){return list.map(r=>`<button type="button" class="sheet-row${r.danger?' danger':''}${r.on?' on':''}" data-act="${esc(r.act)}"${r.on!==undefined?` aria-pressed="${r.on}"`:''}><span>${esc($t(r.label))}</span>${r.note?`<small>${esc($t(r.note))}</small>`:''}</button>`).join('');}
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
  if(k==='f'&&isHidden(k,id))list.push({act:'unhideone',label:'Remettre dans « Toutes les fiches »'});
  if(cid==='tout')list.push({act:'hide',label:'Supprimer du carnet',danger:true});
  else if(cid==='recents')list.push({act:'forget',label:'Supprimer des récents',danger:true});
  else if(cid)list.push({act:'remove',label:cid==='favoris'?'Retirer des favoris':'Supprimer de ce carnet',danger:true});
  openSheet(titleOf(e),e.kind==='t'?$t('Tableau')+' · '+e._label:TYPES[e.type],rows(list));
}
function addToMenu(move){
  const {k,id,cid}=sheetCtx;
  const list=carnets.filter(c=>!(move&&c.id===cid)).map(c=>({act:(move?'mv:':'tg:')+c.id,label:c.nom,on:move?undefined:inColl(c.id,k,id),note:plural(c.items.length,'fiche','fiches')}));
  openSheet(move?'Déplacer vers…':'Ajouter à un carnet',titleOf(item(k,id)),
    (list.length?rows(list):`<p class="sheet-empty">${$t('Tu n\'as pas encore de carnet personnel.')}</p>`)+
    `<form class="sheet-new" data-newfor="${move?'move':'add'}"><label for="newc">${$t('Nouveau carnet')}</label><div><input id="newc" type="text" maxlength="40" placeholder="${$t('Ex. : Recettes du moment')}" autocomplete="off"><button type="submit" class="primary">${$t('Créer')}</button></div></form>`);
}
const NEWFORM=(kind,label)=>`<form class="sheet-new" data-newfor="${kind}"><label for="newc">${$t(label||'Nouveau carnet')}</label><div><input id="newc" type="text" maxlength="40" placeholder="${$t('Ex. : Recettes pour l\'hiver')}" autocomplete="off"><button type="submit" class="primary">${$t('Créer')}</button></div></form>`;
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
    h+=`<button type="button" class="sheet-row danger" data-act="mkdel"${manageSel.size?'':' disabled'}><span>${$t('Supprimer la sélection')}${manageSel.size?' ('+manageSel.size+')':''}</span></button>`;
  }else h+=`<p class="sheet-empty">${$t('Tu n\'as pas encore de carnet personnel.')}</p>`;
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
    (list.length?rows(list):`<p class="sheet-empty">${$t('Tu n\'as pas encore d\'autre carnet.')}</p>`)+NEWFORM(move?'multimove':'multi'));
}
function selKeys(){return [...selSet].map(splitKey).filter(([k,id])=>item(k,id));}
function endSel(){selMode=false;selSet.clear();}
function multiInto(target,move){
  const keys=selKeys(),src=carnetSel,tIt=coll(target);if(!tIt||!keys.length)return;
  const tSnap=tIt.slice(),sIt=move?coll(src):null,sSnap=sIt?sIt.slice():null;
  keys.slice().reverse().forEach(([k,id])=>addTo(target,k,id));
  if(move)keys.forEach(([k,id])=>removeFrom(src,k,id));
  endSel();closeSheet();refresh();
  toast($t(move?'{n} vers « {c} »':'{n} à « {c} »',{n:move?plural(keys.length,'fiche déplacée','fiches déplacées'):plural(keys.length,'fiche ajoutée','fiches ajoutées'),c:collName(target)}),
    ()=>{tIt.splice(0,tIt.length,...tSnap);if(sIt)sIt.splice(0,sIt.length,...sSnap);persist();refresh();});
}
function selAction(a){
  const keys=selKeys();if(!keys.length)return;const cid=carnetSel;
  if(a==='fav'){
    const added=keys.filter(([k,id])=>addTo('favoris',k,id));endSel();refresh();
    toast(added.length?$t('{n} aux favoris',{n:plural(added.length,'fiche ajoutée','fiches ajoutées')}):'Déjà dans les favoris',added.length?()=>{added.forEach(([k,id])=>removeFrom('favoris',k,id));refresh();}:null);return;
  }
  if(a==='add'||a==='move'){multiMenu(a==='move');return;}
  if(a==='rm'){
    if(cid==='tout'){
      const add=keys.filter(([k,id])=>!isHidden(k,id)).map(([k,id])=>({k,id}));masques.push(...add);persist();endSel();refresh();
      toast($t('{n} du carnet',{n:plural(add.length,'fiche supprimée','fiches supprimées')}),()=>{masques=masques.filter(m=>!add.some(x=>x.k===m.k&&x.id===m.id));persist();refresh();});return;
    }
    const it=coll(cid);if(!it)return;const snap=it.slice();
    keys.forEach(([k,id])=>removeFrom(cid,k,id));endSel();refresh();
    toast($t('{n} de « {c} »',{n:plural(keys.length,'fiche supprimée','fiches supprimées'),c:collName(cid)}),()=>{it.splice(0,it.length,...snap);persist();refresh();});
  }
}
function visKeys(){return [...document.querySelectorAll('#timeline [data-lp]')].map(c=>c.dataset.lp);}
function selInfo(){
  const bar=$('#selbar');if(!bar)return;const n=selSet.size;
  bar.querySelector('.seln').textContent=n?plural(n,'fiche sélectionnée','fiches sélectionnées'):$t('Touche les fiches à cocher');
  const vis=visKeys(),all=vis.length>0&&vis.every(v=>selSet.has(v));
  const a=bar.querySelector('[data-selall]');a.textContent=$t(all?'Tout décocher':'Tout cocher');
  document.querySelectorAll('[data-selact]').forEach(b=>{b.disabled=!n;});
}
function toggleSel(c){const v=c.dataset.lp;selSet.has(v)?selSet.delete(v):selSet.add(v);c.setAttribute('aria-pressed',String(selSet.has(v)));selInfo();}
function decorateSel(box){
  box.classList.toggle('selecting',selMode);
  if(!selMode)return;
  box.querySelectorAll('[data-lp]').forEach(c=>c.setAttribute('aria-pressed',String(selSet.has(c.dataset.lp))));
  const custom=isCustom(carnetSel);
  const btn=(a,ic,l)=>`<button type="button" data-selact="${a}" disabled><span aria-hidden="true">${ic}</span>${$t(l)}</button>`;
  box.insertAdjacentHTML('afterbegin',`<div class="selbar" id="selbar"><button type="button" class="linkbtn" data-selall="1">${$t('Tout cocher')}</button><span class="seln" aria-live="polite"></span><button type="button" class="primary sm" data-selend="1">${$t('Terminer')}</button></div>`);
  box.insertAdjacentHTML('beforeend',`<div class="selact">${carnetSel!=='favoris'?btn('fav','★','Favoris'):''}${btn('add','+','Ajouter à…')}${custom?btn('move','⇄','Déplacer'):''}${btn('rm','✕','Supprimer')}</div>`);
  selInfo();
}
function renameSheet(cid){
  const c=carnets.find(x=>x.id===cid);if(!c)return;
  sheetCtx={cid};
  openSheet('Renommer le carnet','',`<form class="sheet-new" data-rename="${esc(cid)}"><label for="newc">${$t('Nom')}</label><div><input id="newc" type="text" maxlength="40" value="${esc(c.nom)}" autocomplete="off"><button type="submit" class="primary">${$t('Enregistrer')}</button></div></form>`);
}
function newCarnetSheet(){
  sheetCtx={};
  openSheet('Nouveau carnet','Rassemble les fiches de ton choix : recettes du moment, protocole d\'un patient, cure d\'hiver…',`<form class="sheet-new" data-newfor="plain"><label for="newc">${$t('Nom')}</label><div><input id="newc" type="text" maxlength="40" placeholder="${$t('Ex. : Recettes du moment')}" autocomplete="off"><button type="submit" class="primary">${$t('Créer')}</button></div></form>`);
}
const PT_ALIAS={'EX-LE 2':'He Ding','EX-LE 4':'Nei Xi Yan','EX-HN 3':'Yin Tang','EX-HN 5':'Tai Yang'};
function figKeys(it){
  const raw=it.p?[it.p]:String(it.ab||'').split('+').map(x=>x.trim());
  const ks=raw.map(k=>PT_ALIAS[k]||k).filter(k=>PTS[k]&&PTS[k].vue&&FIGS[PTS[k].vue]);
  return ks.length&&ks.every(k=>PTS[k].vue===PTS[ks[0]].vue)?ks:ks.slice(0,1);
}
/* Planche anatomique : os gris, point rouge, autres points du même méridien en gris, repères légendés, règles en cun */
const CHAN=/^(P|GI|E|Rt|C|IG|V|Rn|MC|TR|VB|F|VG|RM) \d+$/;
function chanOf(k){const m=CHAN.exec(k);return m?m[1]:'';}
function figLines(t,x,y,a,cls,lh){return `<text class="${cls}" text-anchor="${a}">`+String(t).split('|').map((l,i)=>`<tspan x="${x}" y="${y+i*(lh||11)}">${esc(l)}</tspan>`).join('')+'</text>';}
function fracSVG(t,x,y){const m=/^(\d+)\/(\d+)$/.exec(t);if(!m)return `<text class="fr-t" x="${x}" y="${y+3}" text-anchor="middle">${esc(t)}</text>`;
  return `<text class="fr-t" x="${x}" y="${y-2}" text-anchor="middle">${m[1]}</text><path class="fr-b" d="M${x-4},${y+0.5}H${x+4}"/><text class="fr-t" x="${x}" y="${y+9}" text-anchor="middle">${m[2]}</text>`;}
function rulerSVG(R,pts){
  const [ax,ay]=R.a,[bx,by]=R.b,L=Math.hypot(bx-ax,by-ay)||1,ux=(bx-ax)/L,uy=(by-ay)/L,s=R.cote||1,nx=-uy*s,ny=ux*s;
  const at=t=>[ax+ux*t,ay+uy*t];let h=`<path class="rg" d="M${ax},${ay}L${bx},${by}"/>`;
  arr(R.guides).forEach(([gx,gy])=>{const t=(gx-ax)*ux+(gy-ay)*uy,[qx,qy]=at(t);h+=`<path class="rg-c" d="M${gx},${gy}L${qx},${qy}"/>`;});
  if(R.parts){
    const vals=R.parts.map(p=>{const m=/^(\d+)\/(\d+)$/.exec(p);return m?m[1]/m[2]:+p||1;}),tot=vals.reduce((x,y)=>x+y,0);let t=0;
    const tick=t=>{const [x,y]=at(t);return `<path class="rg" d="M${x-nx*5},${y-ny*5}L${x+nx*5},${y+ny*5}"/>`;};
    h+=tick(0);
    R.parts.forEach((p,i)=>{const len=vals[i]/tot*L,[mx,my]=at(t+len/2);
      [[t,1],[t+len,-1]].forEach(([tt,dir])=>{const [x,y]=at(tt+dir*0.5);h+=`<path class="rg-a" d="M${x},${y}L${x+ux*dir*6+nx*2.4},${y+uy*dir*6+ny*2.4}L${x+ux*dir*6-nx*2.4},${y+uy*dir*6-ny*2.4}Z"/>`;});
      t+=len;h+=tick(t)+fracSVG(p,mx+nx*12,my+ny*12);});
  }else{
    const n=+R.n||1,pas=+R.pas||1,lab=arr(R.lab).slice();
    for(let v=0;v<=n+1e-6;v+=pas){const [x,y]=at(v/n*L),big=lab.includes(v)||v===0||Math.abs(v-n)<1e-6,k=big?6:3.5;h+=`<path class="rg" d="M${x},${y}L${x+nx*k},${y+ny*k}"/>`;}
    const shown=new Set(lab.concat(R.zero===false?[n]:[0,n]));
    pts.forEach(([px,py])=>{const t=Math.max(0,Math.min(L,(px-ax)*ux+(py-ay)*uy)),[qx,qy]=at(t);if(R.lien!==false)h+=`<path class="rg-c" d="M${px},${py}L${qx},${qy}"/>`;
      const v=Math.round(t/L*n*2)/2;if(!shown.has(v)){shown.add(v);lab.push(v);}});
    [...shown].forEach(v=>{const [x,y]=at(v/n*L),tx=x+nx*13,ty=y+ny*13;const anc=Math.abs(nx)>0.5?(nx>0?'start':'end'):'middle';
      h+=`<text class="rg-t" x="${tx+(anc==='middle'?0:nx>0?-4:4)}" y="${ty+3.5}" text-anchor="${anc}">${EN?String(v):String(v).replace('.',',')}</text>`;});
  }
  return h;
}
/* Élargit le cadre si un libellé dépasse (les polices varient d'un téléphone à l'autre) */
function fitFig(svg){
  try{const vb=svg.viewBox.baseVal;let x0=vb.x,y0=vb.y,x1=vb.x+vb.width,y1=vb.y+vb.height;
    svg.querySelectorAll('text').forEach(t=>{const b=t.getBBox();if(!b||!b.width)return;x0=Math.min(x0,b.x-4);y0=Math.min(y0,b.y-4);x1=Math.max(x1,b.x+b.width+4);y1=Math.max(y1,b.y+b.height+4);});
    if(x0<vb.x||y0<vb.y||x1>vb.x+vb.width||y1>vb.y+vb.height)svg.setAttribute('viewBox',`${x0} ${y0} ${x1-x0} ${y1-y0}`);
  }catch(e){}
}
function figSheet(keys){
  keys=String(keys).split('|').filter(k=>PTS[k]);if(!keys.length)return;
  const p0=PTS[keys[0]],f=FIGS[p0.vue];if(!f)return;
  const vb=String(f.vb).split(' ').map(Number),x1=vb[0]+vb[2],ax=+f.axe||vb[0]+vb[2]/2;
  const chans=new Set(keys.map(chanOf).filter(Boolean)),seen=new Set(keys);let grey='';
  const dot=(k,x,y)=>{if(seen.has(k))return;seen.add(k);grey+=`<circle class="fc" cx="${+x}" cy="${+y}" r="3.1"></circle>`;};
  Object.keys(PTS).forEach(k=>{if(PTS[k].vue===p0.vue&&chans.has(chanOf(k)))dot(k,PTS[k].x,PTS[k].y);});
  Object.entries(f.canal||{}).forEach(([k,xy])=>{if(chans.has(chanOf(k)))dot(k,xy[0],xy[1]);});
  const rs=[];keys.forEach(k=>arr(PTS[k].regle).forEach(r=>{const R=typeof r==='string'?(f.regles||{})[r]:r;if(R&&!rs.includes(R))rs.push(R);}));
  let marks=rs.map(R=>rulerSVG(R,keys.filter(k=>arr(PTS[k].regle).some(r=>(typeof r==='string'?(f.regles||{})[r]:r)===R)).map(k=>[+PTS[k].x,+PTS[k].y]))).join('');
  const reps=[];keys.forEach(k=>arr(PTS[k].rep).forEach(r=>{if(!reps.includes(r))reps.push(r);}));if(!reps.length)arr(f.defaut).forEach(r=>reps.push(r));
  marks+=reps.map(r=>{const L=(f.reps||{})[r];if(!L)return'';const a=L.a||'start',dx=a==='end'?-3:a==='middle'?0:3;
    return `<path class="ldr" d="M${L.x},${L.y}L${L.tx},${L.ty}"/>`+figLines(L.t,L.tx+dx,L.ty+(a==='middle'?(L.ty>L.y?11:-4-13*(String(L.t).split('|').length-1)):4),a,'lbl',13);}).join('');
  keys.forEach(k=>arr(PTS[k].voisins).forEach(v=>{const q=PTS[v]&&PTS[v].vue===p0.vue?[PTS[v].x,PTS[v].y]:(f.canal||{})[v];if(!q)return;seen.add(v);
    marks+=`<circle class="fv" cx="${+q[0]}" cy="${+q[1]}" r="3.3"></circle><text class="fv-t" x="${+q[0]+6}" y="${+q[1]-5}">${esc(pn(v))}</text>`;}));
  marks+=grey;
  keys.forEach(ab=>{
    const p=PTS[ab],x=+p.x,y=+p.y,xs=[x];if(f.sym&&p.b&&Math.abs(x-ax)>2)xs.push(2*ax-x);
    const side=p.lab||(x<x1-60?'r':'l'),lx=side==='r'?x+8:side==='l'?x-8:x,ly=side==='t'?y-10:side==='b'?y+18:y-6;
    marks+=xs.map((cx,i)=>`<circle class="fig-halo" cx="${cx}" cy="${y}" r="10"></circle><circle class="fig-dot${i?' alt':''}" cx="${cx}" cy="${y}" r="4.2"></circle>`).join('')+
      `<text class="fig-lab" x="${lx}" y="${ly}" text-anchor="${side==='r'?'start':side==='l'?'end':'middle'}">${esc(pn(ab))}</text>`;
  });
  const both=keys.some(ab=>PTS[ab].b),mirrored=f.sym&&both;
  openSheet(keys.length>1?keys.map(pn).join(' '+$t('et')+' '):pn(keys[0])+(p0.py&&p0.py!==keys[0]?' · '+p0.py:''),f.nom,`<div class="fig"><svg class="fig-svg" viewBox="${esc(f.vb)}" role="img" aria-label="${$t('Emplacement :')} ${esc(keys.map(pn).join(', '))}, ${esc(f.nom)}">${f.svg}${marks}</svg></div>
${keys.map(ab=>{const p=PTS[ab];return `${p.zh?`<p class="fig-zh" lang="zh-Hans">${esc(p.zh)} <span>${esc(p.py||'')}</span></p>`:''}<p class="fig-loc"><b>${esc(pn(ab))}${EN?':':' :'}</b> ${esc(p.loc||'')}</p>`;}).join('')}
<p class="fine">${$t(both?(mirrored?'Point présent des deux côtés du corps (les deux sont marqués) : masse-le à gauche puis à droite.':'Point présent des deux côtés du corps : masse-le à gauche puis à droite.'):'Point unique, sur la ligne du milieu du corps.')}</p>
<p class="fine">${$t('En gris, les autres points du même méridien. 1 cun correspond à la largeur de ton pouce ; les règles donnent la distance en cun. Schéma indicatif.')}</p>`,sh=>{const g=sh.querySelector('.fig-svg');if(g)fitFig(g);});
}
/* Guide d'une rubrique (IST, cancer, maladies) : une fiche par diagnostic, avec ses tableaux */
function gsymLabel(id){return symSel.has(id)?'✓ '+$t('Dans mes symptômes'):'+ '+$t('Ajouter à mes symptômes');}
function guideSheet(cid,openId){
  const c=SYMCATS.find(x=>x.id===cid);if(!c)return;
  const items=catList(c).filter(s=>s.info);
  if(!openId&&items.length===1)openId=items[0].id;
  let h=arr(c.intro).map(p=>`<p class="gd-p">${esc(p)}</p>`).join('');
  if(arr(c.precautions).length)h+=`<div class="alert" role="note"><h2>${$t('Précautions')}</h2><ul>${c.precautions.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>`;
  h+=`${items.length>1?`<h3 class="gd-t">${plural(items.length,'fiche','fiches')}</h3>`:'<div class="gd-sp"></div>'}<div class="accwrap gd-acc">`+items.map(s=>{
    const ts=arr(s.tab).map(tableau).filter(Boolean);
    return `<details class="cat" data-cat="gd-${esc(s.id)}"${s.id===openId?' open':''}><summary><span>${esc(s.nom)}</span></summary><div class="gd">
<p class="gd-p">${esc(s.info)}</p>${s.alerte||s.rappel?`<p class="gd-p gd-warn"><b>${$t('Important :')}</b> ${esc([s.alerte,s.rappel].filter(Boolean).join(' '))}</p>`:''}${s.mtc?`<p class="gd-p"><b>${$t('En médecine chinoise :')}</b> ${esc(s.mtc)}</p>`:''}
${ts.length?`<p class="gd-h">${$t('Tableaux pour accompagner')}</p><div class="gd-tabs">${ts.map(t=>`<button type="button" class="tag" data-opent="${esc(t.id)}">${esc(t.nom)}</button>`).join('')}</div>`:''}
<button type="button" class="ghost gd-add" data-gsym="${esc(s.id)}" aria-pressed="${symSel.has(s.id)}">${gsymLabel(s.id)}</button></div></details>`;}).join('')+'</div>';
  h+=`<p class="fine">${$t('Repères d\'accompagnement selon la médecine traditionnelle chinoise : ni diagnostic, ni traitement. Ils ne remplacent jamais l\'avis de ton médecin.')}</p>`;
  openSheet(c.guide||c.nom,'',h,sh=>{const w=sh.querySelector('.gd-acc'),sc=sh.querySelector('.sheet');if(w)accordion(w,()=>{},sc);
    if(openId&&items.length>1){const d=sh.querySelector(`[data-cat="gd-${cssq(openId)}"]`);if(d&&sc)sc.scrollTop+=d.getBoundingClientRect().top-sc.getBoundingClientRect().top-12;}});
}
async function shareApp(){
  const url=location.origin+location.pathname;
  try{if(navigator.share){await navigator.share({title:'Carnet Yang Sheng',text:$t('Carnet Yang Sheng : symptômes, tableaux, points d\'acupression et recettes de médecine chinoise.'),url});return;}}catch(err){if(err&&err.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(url);toast('Lien copié');}catch(err){toast(url);}
}
async function share(k,id){
  const e=item(k,id);if(!e)return;
  const url=location.origin+location.pathname+'#'+k+'-'+id;
  try{if(navigator.share){await navigator.share({title:titleOf(e),text:titleOf(e)+' · Carnet Yang Sheng',url});return;}}catch(err){if(err&&err.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(url);toast('Lien copié');}catch(err){toast(url);}
}
function onSheetAct(a){
  if(a.startsWith('lgdel:')){lgDelete(a.slice(6));return;}
  if(a.startsWith('lgexdel:')){lgExamDelete(a.slice(8));return;}
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
  if(a==='hide'){masques.push({k,id});persist();closeSheet();refresh();toast('Fiche supprimée du carnet',()=>{masques=masques.filter(m=>!(m.k===k&&m.id===id));persist();refresh();});return;}
  if(a==='unhideone'){masques=masques.filter(m=>!(m.k===k&&m.id===id));persist();closeSheet();refresh();toast('Fiche remise dans « Toutes les fiches »');return;}
  if(a==='forget'){const r=removeFrom('recents',k,id);closeSheet();refresh();toast('Supprimée des récents',()=>{restoreAt('recents',r);refresh();});return;}
  if(a==='remove'){const r=removeFrom(cid,k,id);closeSheet();refresh();toast(cid==='favoris'?'Retirée des favoris':$t('Supprimée de « {c} »',{c:collName(cid)}),()=>{restoreAt(cid,r);refresh();});return;}
  if(a.startsWith('tg:')){const c=a.slice(3);const on=!inColl(c,k,id);on?addTo(c,k,id):removeFrom(c,k,id);const b=$(`#sheet [data-act="${cssq(a)}"]`);if(b){b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on);const n=b.querySelector('small');if(n)n.textContent=plural(coll(c).length,'fiche','fiches');}toast($t(on?'Ajouté à « {c} »':'Retiré de « {c} »',{c:collName(c)}));refresh();return;}
  if(a.startsWith('mv:')){const c=a.slice(3);removeFrom(cid,k,id);addTo(c,k,id);closeSheet();refresh();toast($t('Déplacé vers « {c} »',{c:collName(c)}));return;}
  if(a==='rename'){renameSheet(cid);return;}
  if(a==='delcarnet'){const c=carnets.find(x=>x.id===cid);openSheet($t('Supprimer « {c} » ?',{c:c?c.nom:''}),'Les fiches restent dans l\'appli : seul ce carnet disparaît.',rows([{act:'delok',label:'Supprimer le carnet',danger:true},{act:'close',label:'Garder'}]));return;}
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
  if(f.dataset.newfor==='add'){const mv=ctx.cid&&isCustom(ctx.cid)&&ctx.cid!==c.id;const rec=mv?removeFrom(ctx.cid,ctx.k,ctx.id):null;addTo(c.id,ctx.k,ctx.id);closeSheet();refresh();toast($t(mv?'Déplacé vers « {c} »':'Ajouté à « {c} »',{c:c.nom}),()=>{removeFrom(c.id,ctx.k,ctx.id);if(rec)restoreAt(ctx.cid,rec);refresh();});return;}
  if(f.dataset.newfor==='move'){removeFrom(ctx.cid,ctx.k,ctx.id);addTo(c.id,ctx.k,ctx.id);closeSheet();refresh();toast($t('Déplacé vers « {c} »',{c:c.nom}));return;}
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
  if(M[c])return $t(M[c]);
  if(e&&e.message==='off')return $t('La connexion n\'est pas encore disponible.');
  if(navigator.onLine===false)return $t('Pas de connexion internet.');
  return $t('Une erreur est survenue')+(c?' ('+c+')':'')+'. '+$t('Réessaie.');
}
function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return $t('à l\'instant');if(m<60)return $t('il y a {n} min',{n:m});const h=Math.round(m/60);if(h<24)return $t('il y a {n} h',{n:h});return $t('le {d}',{d:new Date(t).toLocaleDateString(LOC)});}
function syncLabel(){
  if(syncState==='encours')return $t('Synchronisation en cours…');
  if(syncState==='horsligne')return $t('Hors ligne : tes changements seront envoyés dès le retour du réseau.');
  if(syncState==='erreur')return $t('La synchronisation a échoué.')+' '+(syncErr||'');
  const at=+store('ys.sync.at')||0;return at?$t('Carnets synchronisés {t}.',{t:ago(at)}):'';
}
function shownName(){return profil.nom||(user&&user.nom)||'';}
function avatarHTML(cls){
  const ph=profil.photo||(user&&user.photo)||'',nm=shownName()||(user&&user.email)||'?';
  return ph?`<img class="avatar ${cls||''}" src="${esc(ph)}" alt="" referrerpolicy="no-referrer">`:`<span class="avatar ${cls||''}" aria-hidden="true">${esc(nm.trim().charAt(0).toUpperCase()||'?')}</span>`;
}
function accBtnInner(){return user?avatarHTML('sm')+`<span class="acc-n">${esc(shownName()||$t('Mon compte'))}</span>`:`<span class="acc-n">${$t('Se connecter')}</span>`;}
function accCardInner(){
  return user?`<h2>${$t('Ton compte')}</h2><div class="acc-id">${avatarHTML()}<div><b>${esc(shownName()||$t('Sans nom'))}</b><span>${esc(user.email||'')}</span></div></div><p class="acc-sync ${syncState}">${esc(syncLabel())}</p><button type="button" class="primary" data-account="1">${$t('Gérer mon compte')}</button>`
    :`<h2>${$t('Ton compte')}</h2><p>${$t('Connecte-toi pour retrouver tes carnets, favoris et récents sur un autre téléphone. C\'est facultatif.')}</p><button type="button" class="primary" data-account="1">${$t('Se connecter ou créer un compte')}</button>`;
}
function accRefresh(){
  if(sheetOpen&&sheetCtx&&sheetCtx.acc&&sheetCtx.mode!=='delete'){
    const f=$('#sheet .acc-form');const typing=f&&!user&&[...f.elements].some(x=>x.value);
    if(!typing)accSheet(sheetCtx.mode);else{const s=$('#sheet .acc-sync');if(s)s.textContent=syncLabel();}
  }
  const hb=$('#accbtn');if(hb){hb.innerHTML=accBtnInner();hb.setAttribute('aria-label',$t(user?'Ton compte':'Se connecter'));}
  const ic=$('#acccard');if(ic)ic.innerHTML=accCardInner();
}
function accSheet(mode){
  sheetCtx={acc:true,mode:mode||'login'};
  if(user){
    openSheet('Ton compte','',`<div class="acc-id">${avatarHTML('big')}<div><b>${esc(shownName()||$t('Sans nom'))}</b><span>${esc(user.email||'')}</span></div></div>
<p class="acc-sync ${syncState}" role="status">${esc(syncLabel())}</p>`+
      rows([{act:'acc:sync',label:'Synchroniser maintenant'}])+
      `<label class="sheet-row" for="acc-photo"><span>${$t(profil.photo?'Changer ma photo':'Ajouter une photo de profil')}</span><input id="acc-photo" type="file" accept="image/*" hidden></label>`+
      (profil.photo?rows([{act:'acc:nophoto',label:'Retirer ma photo'}]):'')+
      `<form class="sheet-new" data-newfor="nom"><label for="newc">${$t('Nom affiché')}</label><div><input id="newc" type="text" maxlength="40" value="${esc(shownName())}" autocomplete="nickname"><button type="submit" class="primary">${$t('Enregistrer')}</button></div></form>`+
      rows([{act:'acc:logout',label:'Se déconnecter'},{act:'acc:delete',label:'Supprimer mon compte',danger:true}]));
    return;
  }
  const su=sheetCtx.mode==='signup';
  openSheet(su?'Créer un compte':'Se connecter','',`<p class="acc-intro">${$t('Retrouve tes carnets, favoris et récents sur un autre téléphone. Le compte est facultatif : sans compte, tout reste sur cet appareil.')}</p>
<button type="button" class="prov" data-act="prov:google">${$t('Continuer avec Google')}</button>${FB&&FB.facebook?`<button type="button" class="prov" data-act="prov:facebook">${$t('Continuer avec Facebook')}</button>`:''}
<p class="or"><span>${$t('ou avec ton e-mail')}</span></p>
<form class="acc-form" data-mode="${su?'signup':'login'}" novalidate>
${su?`<label>${$t('Prénom ou pseudo')}<input name="nom" type="text" maxlength="40" autocomplete="nickname"></label>`:''}
<label>${$t('E-mail')}<input name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false"></label>
<label>${$t('Mot de passe')}${su?' '+$t('(6 caractères minimum)'):''}<span class="pw"><input name="mdp" type="password" autocomplete="${su?'new-password':'current-password'}"><button type="button" data-pwtoggle="1" aria-label="${$t('Afficher le mot de passe')}">${$t('Afficher')}</button></span></label>
<p class="acc-err" role="alert" hidden></p>
<button type="submit" class="primary wide">${$t(su?'Créer mon compte':'Se connecter')}</button>
</form>
<p class="acc-switch">${su?`${$t('Déjà un compte ?')} <button type="button" class="linkbtn inline" data-act="acc:login">${$t('Se connecter')}</button>`:`${$t('Pas encore de compte ?')} <button type="button" class="linkbtn inline" data-act="acc:signup">${$t('Créer un compte')}</button></p><p class="acc-switch"><button type="button" class="linkbtn inline" data-act="acc:reset">${$t('Mot de passe oublié ?')}</button>`}</p>
<p class="fine">${$t('Avec un compte sont enregistrés en ligne : ton e-mail, ton nom, ta photo si tu en mets une, tes carnets, favoris, récents et ton classement. Tes symptômes et tes ingrédients restent sur ce téléphone.')}</p>`);
}
function accErr(msg){const p=$('#sheet .acc-err');if(p){p.textContent=$t(msg||'');p.hidden=!msg;}else if(msg)toast(msg);}
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
    t._lies.forEach(s=>{if(symSel.has(s)){tot+=1;got+=1;m.push(s);}});
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
  if(r.pct>=70)return['forte',$t('compatibilité forte')];
  if(r.pct>=45)return['moyenne',$t('compatibilité moyenne')];
  return['faible',$t('piste possible')];
}
function ringHTML(p,cls,big){return `<span class="ring ${cls}${big?' big':''}" role="img" aria-label="${$t('Compatible à {p} %',{p})}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="15.5"></circle><circle class="ring-fg" cx="18" cy="18" r="15.5" pathLength="100" style="--p:${p}"></circle></svg><b aria-hidden="true">${p}<small>%</small></b></span>`;}
function renderSym(){
  if(symMode==='bilan'&&symSel.size)return renderBilan();
  if(symMode==='resultats'&&symSel.size)return renderSymResults();
  if(symMode==='langue'&&nSymHorsLangue())return renderLangue();
  symMode='choisir';
  view.innerHTML=`${stepsHTML(1)}<h1 class="vh big-q">${$t('Quels sont tes symptômes ?')}</h1><p class="lede">${$t('Coche ce que tu ressens, même un peu. Ensuite, tu regarderas ta langue, puis l\'appli fera ton bilan selon la médecine chinoise.')}</p>
${tipHTML(TIP_FILTRE,'Coche plusieurs symptômes.','Un seul signe se retrouve dans beaucoup de tableaux : plus tu en coches, plus la recherche s\'affine et plus le tableau proposé est précis.')}
<div class="tools ac-wrap">${searchBox('sq',symQuery,$t('Tape les premières lettres : fat, toux, diarr…'),$t('Chercher un symptôme'))}<div class="ac" id="ac" role="listbox" aria-label="${$t('Suggestions')}" hidden></div></div>
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
function catName(id){const c=SYMCATS.find(x=>x.id===id);return c?(c.court||c.nom):'';}
function renderAC(){
  const box=$('#ac');if(!box)return;
  if(!symQuery.trim()){box.hidden=true;box.innerHTML='';return;}
  const list=suggest(symQuery);
  const f=fold(symQuery).trim();
  const tabs=f.length<3?[]:tableaux.filter(t=>t._rep.some(r=>fold(r).split(/[\s,'’()\-]+/).some(w=>w.startsWith(f))||fold(r).startsWith(f))).slice(0,4);
  let h=list.map(s=>`<button type="button" class="ac-item" role="option" data-acsym="${esc(s.id)}" aria-selected="${symSel.has(s.id)}"><span class="ac-n">${hl(s.nom,symQuery)}</span><span class="ac-c">${esc(catName(s.cat))}</span>${symSel.has(s.id)?'<span class="ac-ok" aria-hidden="true">✓</span>':''}</button>`).join('');
  if(tabs.length)h+=`<p class="ac-h">${esc($t('Tableaux liés à « {q} »',{q:symQuery.trim()}))}</p>`+tabs.map(t=>`<button type="button" class="ac-item ac-tab" data-opent="${esc(t.id)}"><span class="ac-n">${esc(t.nom)}</span><span class="ac-c">${esc(t._rep.find(r=>fold(r).includes(f))||t._label)}</span></button>`).join('');
  box.innerHTML=h||`<p class="ac-empty">${$t('Aucun symptôme ne correspond. Essaie un autre mot.')}</p>`;
  box.hidden=false;
}
function pickSuggestion(id){
  const was=symSel.has(id);
  if(!was){symSel.add(id);saveSet('ys.symptomes',symSel);}
  document.querySelectorAll(`[data-sym="${cssq(id)}"]`).forEach(c=>c.setAttribute('aria-pressed','true'));
  symQuery='';const q=$('#sq');if(q){q.value='';q.focus({preventScroll:true});}
  renderAC();updateCatCounts();renderCTA();
  toast($t(was?'Déjà choisi : {s}':'Ajouté : {s}',{s:symName(id)}),was?null:()=>{symSel.delete(id);saveSet('ys.symptomes',symSel);document.querySelectorAll(`[data-sym="${cssq(id)}"]`).forEach(c=>c.setAttribute('aria-pressed','false'));updateCatCounts();renderCTA();});
}
/* Précautions liées aux diagnostics choisis (cancer, thyroïde, VIH, foie…) : rappelées sur les résultats, les tableaux et les fiches */
function rappels(){
  const out=[];
  [...symSel].forEach(id=>{const s=SYM[id];if(!s)return;const c=SYMCATS.find(x=>x.id===s.cat);
    [...(c?arr(c.rappel):[]),...(s.rappel?[String(s.rappel)]:[])].forEach(r=>{if(!out.includes(r))out.push(r);});});
  return out;
}
const TIP_FILTRE='<path d="M3.5 5h17l-6.5 7.5v5.5l-4 2v-7.5z"/>',TIP_COUCHES='<path d="M12 3.5l8.5 4.5-8.5 4.5-8.5-4.5z"/><path d="M3.5 12.5l8.5 4.5 8.5-4.5"/><path d="M3.5 16.5l8.5 4.5 8.5-4.5"/>';
function tipHTML(ic,titre,texte){return `<div class="tipbox" role="note"><svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic}</svg><p><b>${$t(titre)}</b> ${$t(texte)}</p></div>`;}
function rappelHTML(){const r=rappels();return r.length?`<div class="alert rappel" role="note"><h2>${$t('Précautions pour toi')}</h2><ul>${r.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'';}
function catIds(c){return arr(c.sous).length?[].concat(...c.sous.map(g=>arr(g.liste))):arr(c.liste);}
function catList(c){const ids=catIds(c);return ids.length?ids.map(id=>SYM[id]).filter(Boolean):Object.values(SYM).filter(s=>s.cat===c.id);}
function catBody(c){
  const chips=list=>`<div class="chips">${list.map(s=>symChip(s.id)).join('')}</div>`;
  let h=c.note?`<p class="cat-note">${esc(c.note)}</p>`:'';
  if(c.guide)h+=`<button type="button" class="guide-b" data-guide="${esc(c.id)}"><span>${esc(c.guide)}</span><span aria-hidden="true">›</span></button>`;
  if(arr(c.sous).length)h+=c.sous.map(g=>{const l=arr(g.liste).map(id=>SYM[id]).filter(Boolean);return l.length?`<p class="cat-sub">${esc(g.nom||'')}</p>${chips(l)}`:'';}).join('');
  else h+=chips(catList(c));
  return h;
}
function catCount(cat){const c=SYMCATS.find(x=>x.id===cat);return c?catList(c).filter(s=>symSel.has(s.id)).length:0;}
function renderSymList(){
  const box=$('#symlist');if(!box)return;
  box.innerHTML=SYMCATS.map(c=>{
    if(c.id==='langue')return'';
    const list=catList(c);if(!list.length)return'';
    const k=catCount(c.id);
    return `<details class="cat${c.note||c.sous?' rich':''}" data-cat="${esc(c.id)}"${openCat===c.id?' open':''}><summary><span>${esc(c.nom)}</span>${k?`<span class="cat-n">${k}</span>`:''}</summary>${catBody(c)}</details>`;
  }).join('');
  accordion(box,v=>{openCat=v;});
}
function accordion(box,setOpen,scroller){
  let anchorTop=null;
  box.querySelectorAll('details.cat>summary').forEach(s=>s.addEventListener('click',()=>{anchorTop=s.getBoundingClientRect().top;}));
  box.querySelectorAll('details.cat').forEach(d=>d.addEventListener('toggle',()=>{
    if(d.open){
      setOpen(d.dataset.cat);
      box.querySelectorAll('details.cat[open]').forEach(o=>{if(o!==d)o.open=false;});
      if(anchorTop!==null){const s=d.querySelector('summary'),dy=s.getBoundingClientRect().top-anchorTop;if(scroller)scroller.scrollTop+=dy;else window.scrollBy(0,dy);}
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
  const n=nSymHorsLangue();
  if(!n){box.hidden=true;box.innerHTML='';return;}
  const res=matchTableaux(),best=res[0];
  box.innerHTML=`<div class="cta-bar"><div class="cta-t"><b>${plural(n,'symptôme','symptômes')}</b><span>${best?$t('Le plus proche : ')+esc(best.t.nom)+' ('+best.pct+' %)':$t('Ajoute d\'autres signes pour affiner')}</span></div><button type="button" class="cta-x" data-clear="sym" aria-label="${$t('Effacer tous les symptômes')}">${$t('Effacer')}</button><button type="button" class="cta" data-mode="langue">${$t('Valider')} <span aria-hidden="true">→</span></button></div>`;
  box.hidden=false;
}
function renderSymResults(){
  const sel=[...symSel].filter(s=>SYM[s]);
  const res=matchTableaux();
  let h=`<div class="bar"><button class="back" type="button" data-mode="choisir"><span aria-hidden="true">‹</span>${$t('Modifier')}</button><span class="kind">${plural(sel.length,'symptôme','symptômes')}</span></div>
<h1 class="vh" style="margin-top:18px">${$t('Tes résultats')}</h1><button type="button" class="ghost pv-go" data-mode="bilan">${AVATAR}${$t('Voir le bilan du praticien virtuel')}</button><p class="hint">${$t('Touche un symptôme pour le retirer, ou')} <button type="button" class="linkbtn inline" data-clear="sym">${$t('efface tout')}</button>.</p>
<div class="chips small">${sel.map(s=>`<button type="button" class="chip rm" data-sym="${esc(s)}" aria-pressed="true" aria-label="${esc($t('Retirer {s}',{s:symName(s)}))}">${esc(symName(s))} <span aria-hidden="true">×</span></button>`).join('')}</div>`;
  const alerts=sel.filter(s=>SYM[s].alerte);
  if(alerts.length)h+=`<div class="alert" role="note"><h2>${$t('Quand consulter')}</h2><ul>${alerts.map(s=>`<li><b>${esc(SYM[s].nom)}.</b> ${esc(SYM[s].alerte)}</li>`).join('')}</ul></div>`;
  h+=rappelHTML();
  if(!res.length){
    h+=`<p class="msg">${$t('Pas encore de tableau qui correspond. Ajoute d\'autres symptômes, ou regarde les tableaux par organe.')}</p>`;
  }else{
    const shown=showAll?res:res.slice(0,5);
    const diag=sel.length===1&&arr(SYM[sel[0]].tab).length;
    h+=diag?`<h2 class="results-h">${plural(res.length,'tableau souvent rencontré','tableaux souvent rencontrés')} ${$t('avec ce diagnostic')}</h2><p class="hint">${$t('Ajoute tes autres symptômes pour savoir lequel te ressemble le plus. Touche un signe pour l\'ajouter.')}</p>`
      :sel.length===1?`<h2 class="results-h">${plural(res.length,'tableau contient','tableaux contiennent')} ${$t('ce signe')}</h2><p class="hint">${$t('Regarde les autres signes de chaque tableau (en gras, les signes clés) : celui où tu te reconnais le plus est le bon point de départ. Touche un signe pour l\'ajouter.')}</p>`
      :`<h2 class="results-h">${plural(res.length,'tableau possible','tableaux possibles')}</h2>${res.length>1?`<p class="hint">${$t('Un tableau ne vient jamais seul : plusieurs de ces tableaux peuvent te correspondre en même temps.')}</p>`:''}`;
    h+='<div class="entries">';
    shown.forEach(r=>{
      const [cls,lab]=force(r);
      const missK=r.t._cle.filter(s=>!symSel.has(s)),missO=r.t._autres.filter(s=>!symSel.has(s)&&!/^langue|^enduit|^pointe|^bords/.test(s));
      const miss=[...missK.map(s=>[s,1]),...missO.map(s=>[s,0])].slice(0,Math.max(6,missK.length));
      const extra=`<span class="match">${ringHTML(r.pct,cls)}<span class="match-t"><b>${$t('{p} % compatible',{p:r.pct})}</b><span>${$t('avec tes symptômes')} · ${lab}</span></span></span><span class="emiss">${$t('Tu as :')} ${esc(r.m.map(s=>symName(s).toLowerCase()).join(', '))}</span>${r.contra.length?`<span class="emiss">${$t('Mais :')} ${esc(r.contra.map(s=>symName(s).toLowerCase()).join(', '))}</span>`:''}`;
      h+=`<div class="result">${cardT(r.t,extra,true)}${miss.length?`<div class="verify"><span>${$t('As-tu aussi ces signes ?')}</span><div class="chips small">${miss.map(([s,k])=>`<button type="button" class="chip add${k?' key':''}" data-sym="${esc(s)}" aria-pressed="false">+ ${esc(symName(s))}</button>`).join('')}</div></div>`:''}</div>`;
    });
    h+='</div>';
    if(res.length>5&&!showAll)h+=`<button type="button" class="ghost wide" data-more="1">${$t('Voir les {n} autres',{n:res.length-5})}</button>`;
    const recs=[],prots=[];
    res.slice(0,3).forEach(r=>{arr(r.t.recettes).forEach(id=>{const e=fiche(id);if(e&&!recs.includes(e))recs.push(e);});arr(r.t.fiches).forEach(id=>{const e=fiche(id);if(e&&!prots.includes(e))prots.push(e);});});
    fiches.filter(e=>e.type==='protocole'&&e._sym.some(s=>symSel.has(s))).forEach(e=>{if(!prots.includes(e))prots.push(e);});
    if(recs.length)h+=`<h2 class="results-h">${$t('Recettes adaptées')}</h2><div class="entries">${recs.slice(0,6).map(e=>cardF(e)).join('')}</div>`;
    if(prots.length)h+=`<h2 class="results-h">${$t('Protocoles complets')}</h2><div class="entries">${prots.map(e=>cardF(e)).join('')}</div>`;
  }
  h+=`<p class="fine">${$t('Ces correspondances orientent ta pratique de bien-être selon la médecine traditionnelle chinoise. Elles ne sont pas un diagnostic et ne remplacent pas un avis médical.')}</p>`;
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
  if(symMode!=='choisir'&&!symSel.size)symMode='choisir';
  refresh();
}

/* ---------- Examen de la langue ----------
   Étape entre les symptômes et le bilan : une photo de la langue, gardée sur ce téléphone, puis des questions
   illustrées. Les réponses deviennent des signes de la catégorie « langue », que les tableaux et le bilan utilisent.
   L'appli ne lit pas la photo elle-même : la personne décrit ce qu'elle voit en la regardant. */
const LG_Q=[
 {id:'couleur',titre:'De quelle couleur est ta langue ?',aide:'Regarde le corps de la langue, sous le dépôt blanc ou jaune qui la recouvre.',
  o:[['normale','Rose clair, vivante',''],['pale','Pâle, blanchâtre','langue-pale'],['rouge','Rouge','langue-rouge'],['fonce','Rouge foncé, écarlate','langue-rouge langue-cramoisie'],['violacee','Violacée ou bleutée','langue-violacee']]},
 {id:'zones',multi:'aucune',titre:'Vois-tu des zones plus rouges ou des taches ?',
  o:[['aucune','Non, la couleur est égale',''],['pointe','La pointe plus rouge','pointe-rouge'],['bords','Les bords plus rouges','bords-rouges'],['centre','Le centre plus rouge','centre-rouge'],['points','De petits points rouges','points-rouges'],['taches','Des taches violettes ou sombres','taches-violettes']]},
 {id:'forme',multi:'normale',titre:'Et sa forme ?',
  o:[['normale','Normale, souple',''],['mince','Mince, effilée','langue-mince'],['gonflee','Gonflée, large','langue-gonflee'],['dents','Marques des dents sur les bords','marques-dents'],['fissure','Une fissure au milieu','fissure-centrale'],['fissures','Plusieurs fissures','langue-fissuree'],['tremble','Elle tremble quand tu la tires','langue-tremblante']]},
 {id:'enduit',titre:'Et l\'enduit, le dépôt à sa surface ?',aide:'Un enduit fin laisse voir la langue à travers ; un enduit épais la cache.',
  o:[['fin','Fin et blanc',''],['epais','Blanc et épais','enduit-blanc-epais'],['jaune','Jaune','enduit-jaune'],['gris','Gris ou noir',''],['sans','Pas d\'enduit du tout : langue lisse, brillante','sans-enduit'],['absent','Absent par plaques (langue « en carte »)','enduit-pele']]},
 {id:'gras',titre:'Cet enduit est-il gras, collant ou glissant ?',si:r=>r.enduit!=='absent'&&r.enduit!=='sans',
  o:[['non','Non, il est sec ou normal',''],['oui','Oui, gras ou collant','enduit-gras']]},
 {id:'humidite',titre:'Est-elle sèche ou mouillée ?',
  o:[['normale','Juste humide',''],['seche','Sèche','langue-seche'],['humide','Très humide, mouillée','langue-humide']]},
 {id:'veines',titre:'Soulève-la : comment sont les deux veines dessous ?',aide:'Pose la pointe de ta langue contre le palais et regarde dans un miroir.',
  o:[['fines','Fines, peu visibles',''],['gonflees','Gonflées, foncées ou violettes','veines-sublinguales']]},
];
const LG_MAX=30,LG_FRAIS=7*24*3600*1000;
let LGX=storedJSON('ys.langue.exam',{});if(!LGX||typeof LGX!=='object'||Array.isArray(LGX))LGX={};if(!LGX.r||typeof LGX.r!=='object')LGX.r={};
function lgSave(){store('ys.langue.exam',J(LGX));}
function lgPhotos(){return arr(storedJSON('ys.langue.photos',[])).filter(p=>p&&p.id&&typeof p.img==='string'&&p.img.startsWith('data:image/'));}
function lgSavePhotos(L){for(let n=L.length;n>=0;n--){try{localStorage.setItem('ys.langue.photos',J(L.slice(0,n)));return n;}catch(e){}}return 0;}
function lgVal(q,r){const v=(r||LGX.r)[q.id];return q.multi?arr(v):(typeof v==='string'?v:'');}
function lgSigns(r){
  const out=[];
  LG_Q.forEach(q=>{if(q.si&&!q.si(r))return;const v=q.multi?arr(r[q.id]):[r[q.id]];
    q.o.forEach(o=>{if(v.includes(o[0])&&o[2])o[2].split(' ').forEach(s=>{if(!out.includes(s))out.push(s);});});});
  if((r.couleur==='rouge'||r.couleur==='fonce')&&(r.enduit==='absent'||r.enduit==='sans'))out.push('langue-rouge-sans-enduit');
  return out.filter(s=>SYM[s]);
}
function lgFresh(){return !!LGX.fait&&Date.now()-LGX.fait<LG_FRAIS;}
function lgCount(){return LG_Q.filter(q=>!(q.si&&!q.si(LGX.r))&&(q.multi?arr(LGX.r[q.id]).length:LGX.r[q.id])).length;}
function lgApply(){
  Object.keys(SYM).forEach(s=>{if(SYM[s].cat==='langue')symSel.delete(s);});
  lgSigns(LGX.r).forEach(s=>symSel.add(s));saveSet('ys.symptomes',symSel);
}
function nSymHorsLangue(){return [...symSel].filter(s=>SYM[s]&&SYM[s].cat!=='langue').length;}
function stepsHTML(n){
  const L=['Symptômes','Langue','Bilan'];
  return `<ol class="steps3" aria-label="${$t('Étapes')}">${L.map((l,i)=>`<li class="${i+1<n?'ok':''}"${i+1===n?' aria-current="step"':''}><b>${i+1<n?'✓':i+1}</b><span>${$t(l)}</span></li>`).join('')}</ol>`;
}
/* Dessins de langue (SVG) pour illustrer chaque réponse */
let lgN=0;
const LG_COL={normale:'#E8959B',pale:'#F1CDC8',rouge:'#DB4E4C',fonce:'#A1203A',violacee:'#9777A4'};
const LG_PATH={normale:'M18 10H82C90 34 90 72 76 97C66 114 34 114 24 97C10 72 10 34 18 10Z',mince:'M27 10H73C79 36 78 74 67 98C59 114 41 114 33 98C22 74 21 36 27 10Z',gonflee:'M11 10H89C99 36 99 75 83 99C71 116 29 116 17 99C1 75 1 36 11 10Z'};
function lgIll(qid,oid){
  if(qid==='couleur')return{c:oid};
  if(qid==='zones')return{zone:oid};
  if(qid==='forme')return{forme:oid};
  if(qid==='enduit')return{enduit:oid};
  if(qid==='gras')return oid==='oui'?{enduit:'epais',gras:1}:{enduit:'fin'};
  if(qid==='humidite')return{hum:oid};
  if(qid==='veines')return{veines:oid};
  return{};
}
function tongueSVG(o){
  const k='lgc'+(++lgN);
  if(o.veines){
    const g=o.veines==='gonflees',vc=g?'#4E2A63':'#8C7BB4',vw=g?5.5:2;
    const vl=g?'M45 101C36 90 44 78 37 66C31 56 39 46 33 32':'M45 101C41 82 37 60 35 34',vr=g?'M55 101C64 90 56 78 63 66C69 56 61 46 67 32':'M55 101C59 82 63 60 65 34';
    return `<svg viewBox="0 0 100 118" class="lg-svg" aria-hidden="true"><rect x="3" y="3" width="94" height="112" rx="42" fill="#3B2327"/><path d="M13 24C13 6 87 6 87 24C91 62 80 101 50 106C20 101 9 62 13 24Z" fill="#E6A0AB"/><path d="M50 106V62" stroke="#CF8391" stroke-width="3" stroke-linecap="round"/><path d="${vl}" stroke="${vc}" stroke-width="${vw}" fill="none" stroke-linecap="round" opacity="${g?1:.75}"/><path d="${vr}" stroke="${vc}" stroke-width="${vw}" fill="none" stroke-linecap="round" opacity="${g?1:.75}"/></svg>`;
  }
  const P=LG_PATH[o.forme==='mince'?'mince':o.forme==='gonflee'?'gonflee':'normale'],col=LG_COL[o.c]||LG_COL.normale;
  const red=o.c==='fonce'?'#7C0E24':'#C42F38';
  let s=`<svg viewBox="0 0 100 118" class="lg-svg" aria-hidden="true"><defs><clipPath id="${k}"><path d="${P}"/></clipPath></defs><rect x="6" y="3" width="88" height="13" rx="6.5" fill="#3B2327"/><path d="${P}" fill="${col}"/><g clip-path="url(#${k})">`;
  if(o.zone==='pointe')s+=`<ellipse cx="50" cy="106" rx="26" ry="17" fill="${red}" opacity=".8"/>`;
  if(o.zone==='bords')s+=`<path d="${P}" fill="none" stroke="${red}" stroke-width="13" opacity=".75"/>`;
  if(o.zone==='centre')s+=`<ellipse cx="50" cy="54" rx="13" ry="22" fill="${red}" opacity=".65"/>`;
  if(o.zone==='points')s+=[[36,66],[46,74],[58,70],[64,82],[40,86],[52,90],[30,78],[70,64],[56,58],[44,56]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.1" fill="${red}"/>`).join('');
  if(o.zone==='taches')s+=`<ellipse cx="34" cy="64" rx="6" ry="4.5" fill="#5B3470" opacity=".8"/><ellipse cx="64" cy="76" rx="5" ry="4" fill="#5B3470" opacity=".8"/><ellipse cx="50" cy="44" rx="4" ry="3" fill="#5B3470" opacity=".7"/>`;
  const E={fin:['#FFFFFF',.4],epais:['#FAF8F2',.92],jaune:['#DDB842',.9],gris:['#66625E',.9]}[o.enduit];
  const EP=o.enduit==='fin'?'M26 12H74C79 28 77 50 67 64C60 73 40 73 33 64C23 50 21 28 26 12Z':'M20 12H80C86 32 84 62 70 78C61 88 39 88 30 78C16 62 14 32 20 12Z';
  if(E)s+=`<path d="${EP}" fill="${E[0]}" opacity="${E[1]}"/>`;
  if(o.enduit==='sans')s+=`<path d="M30 30c8-6 18-6 24-2M60 56c6-2 10 1 12 5M36 84c8 5 20 5 28 0" stroke="#FFFFFF" stroke-width="3.4" fill="none" opacity=".85" stroke-linecap="round"/><ellipse cx="40" cy="44" rx="6" ry="3" fill="#FFFFFF" opacity=".7"/>`;
  if(o.enduit==='absent')s+=`<path d="M20 12H80C86 32 84 62 70 78C61 88 39 88 30 78C16 62 14 32 20 12Z" fill="#FFFFFF" opacity=".55"/><path d="M34 30c6-5 14 0 12 7s-12 8-14 2 1-7 2-9zM56 48c7-3 13 3 10 9s-11 5-12-1 0-7 2-8zM40 62c5-2 9 2 7 6s-8 4-9 0 1-5 2-6z" fill="${col}"/><path d="M36 84c8 5 20 5 28 0" stroke="#FFFFFF" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>`;
  if(o.gras)s+=`<path d="M32 24c6 10 4 22 10 32M52 20c-2 12 4 22 0 34M66 26c-5 9-2 20-8 28" stroke="#FFFFFF" stroke-width="3.2" fill="none" opacity=".95" stroke-linecap="round"/><ellipse cx="42" cy="34" rx="5" ry="2.5" fill="#FFFFFF"/>`;
  if(o.forme==='dents'){const pts=[[14,28],[13,41],[13,54],[15,67],[19,80]];s+=pts.map(([x,y])=>`<path d="M${x} ${y}q5 4.5 0 9M${100-x} ${y}q-5 4.5 0 9" stroke="#A8545C" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('');}
  if(o.forme==='fissure')s+=`<path d="M50 18C48 40 52 64 50 92" stroke="#8C2A33" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  if(o.forme==='fissures')s+=`<path d="M50 22V78M37 34l7 9M63 34l-7 9M33 54l10 6M67 54l-10 6M39 74l8 6M61 74l-8 6" stroke="#8C2A33" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  if(o.hum==='humide')s+=`<ellipse cx="38" cy="36" rx="8" ry="4" fill="#FFFFFF" opacity=".75"/><ellipse cx="62" cy="58" rx="6" ry="3" fill="#FFFFFF" opacity=".7"/><ellipse cx="44" cy="80" rx="5" ry="2.5" fill="#FFFFFF" opacity=".7"/><path d="M26 100c2 4 2 7 0 9M74 100c-2 4-2 7 0 9" stroke="#FFFFFF" stroke-width="2.5" opacity=".8" fill="none" stroke-linecap="round"/>`;
  if(o.hum==='seche')s+=`<rect x="0" y="0" width="100" height="118" fill="#9C8B7A" opacity=".16"/><path d="M34 40l5 4-3 5M60 36l-4 5 4 4M44 64l6 3-2 6M64 70l-5 3 3 5M36 82l5-2 3 5" stroke="#8C2A33" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".8"/>`;
  s+=`</g><path d="${P}" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="1"/>`;
  if(o.forme==='tremble')s+=`<path d="M6 46q-4 6 0 12M94 46q4 6 0 12M3 62q-3 6 0 12M97 62q3 6 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>`;
  return s+'</svg>';
}
const CAM_ICON='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>';
function lgDate(iso){try{return new Date(iso).toLocaleDateString(LOC,{day:'numeric',month:'long',year:'numeric'});}catch(e){return '';}}
function lgQuestionsHTML(){
  let n=0;
  return LG_Q.map(q=>{
    if(q.si&&!q.si(LGX.r))return'';
    n++;const v=lgVal(q);
    return `<section class="lg-q" id="lgq-${q.id}"><h2 class="lg-t"><span class="lg-n">${n}</span><span>${$t(q.titre)}</span></h2>${q.aide?`<p class="hint">${$t(q.aide)}</p>`:''}${q.multi?`<p class="hint">${$t('Plusieurs réponses possibles.')}</p>`:''}
<div class="lg-os">${q.o.map(o=>{const on=q.multi?v.includes(o[0]):v===o[0];return `<button type="button" class="lg-o" data-lg="${q.id}:${o[0]}" aria-pressed="${on}">${tongueSVG(lgIll(q.id,o[0]))}<span>${$t(o[1])}</span></button>`;}).join('')}</div></section>`;
  }).join('');
}
/* Deux photos par examen (dessus et dessous de la langue) ; chaque examen est gardé avec sa date, ses photos et les
   modèles choisis, pour suivre l'évolution. Tout reste sur ce téléphone. */
let lgTarget='dessus';
function lgHist(){return arr(storedJSON('ys.langue.hist',[])).filter(x=>x&&x.id&&x.r&&typeof x.r==='object');}
function lgSaveHist(H){store('ys.langue.hist',J(H.slice(0,40)));}
function lgPhoto1(id){return id?lgPhotos().find(p=>p.id===id)||null:null;}
function lgGC(){
  const keep=new Set([LGX.photo,LGX.photo2,...lgHist().flatMap(x=>[x.p1,x.p2])].filter(Boolean));
  const L=lgPhotos();if(L.some(p=>!keep.has(p.id)))lgSavePhotos(L.filter(p=>keep.has(p.id)));
}
(function lgMigre(){ // photos de la v0.17 (une seule par examen) → examens
  if(store('ys.langue.hist')!==null)return;
  const H=lgPhotos().map(p=>({id:'ex'+p.id,d:p.d,r:{},s:arr(p.s),p1:p.id,p2:null}));
  if(LGX.photo){const e=H.find(x=>x.p1===LGX.photo);if(e){e.r=JSON.parse(J(LGX.r));LGX.exam=e.id;lgSave();}}
  lgSaveHist(H);
})();
/* Un nouvel examen commence si le précédent date d'un autre jour : photos et réponses repartent de zéro */
function lgNouveau(){
  const t=LGX.fait||LGX.debut;
  if(t&&new Date(t).toDateString()!==new Date().toDateString()){
    LGX={r:{}};lgSave();
    Object.keys(SYM).forEach(s=>{if(SYM[s].cat==='langue')symSel.delete(s);});saveSet('ys.symptomes',symSel);
  }
}
function lgStart(){if(!LGX.debut){LGX.debut=Date.now();lgSave();}}
function lgSaveExam(){
  const H=lgHist(),auj=new Date().toDateString();
  let e=LGX.exam&&H.find(x=>x.id===LGX.exam);
  if(!e||new Date(e.d).toDateString()!==auj){e={id:'ex'+Date.now().toString(36)};H.unshift(e);LGX.exam=e.id;}
  Object.assign(e,{d:new Date().toISOString(),r:JSON.parse(J(LGX.r)),s:lgSigns(LGX.r),p1:LGX.photo||null,p2:LGX.photo2||null});
  lgSaveHist(H);lgGC();
}
function lgModels(r){
  const out=[];
  LG_Q.forEach(q=>{if(q.si&&!q.si(r))return;const v=q.multi?arr(r[q.id]):(r[q.id]?[r[q.id]]:[]);v.forEach(oid=>{const o=q.o.find(x=>x[0]===oid);if(o)out.push([q.id,oid,$t(o[1])]);});});
  return out;
}
function lgSlotHTML(v){
  const p=lgPhoto1(v==='dessous'?LGX.photo2:LGX.photo),t=$t(v==='dessous'?'Dessous de la langue':'Dessus de la langue');
  if(p)return `<figure class="lg-slot on"><button type="button" class="lg-zoom" data-lgph="${esc(p.id)}" aria-label="${esc($t('Agrandir : {t}',{t}))}"><img src="${p.img}" alt="${esc(t)}"></button><figcaption><b>${t}</b><button type="button" class="linkbtn" data-lgcam="${v}">${$t('Reprendre')}</button></figcaption></figure>`;
  return `<div class="lg-slot">${tongueSVG(v==='dessous'?{veines:'fines'}:{})}<b>${t}</b><span class="lg-slot-a">${$t(v==='dessous'?'Pointe de la langue contre le palais : on voit les deux veines.':'Langue bien tirée, détendue.')}</span><button type="button" class="cta" data-lgcam="${v}">${CAM_ICON}<span>${$t('Photo')}</span></button><button type="button" class="linkbtn" data-lgfile="${v}">${$t('Choisir une photo')}</button></div>`;
}
function lgPhotoHTML(){
  const n=(lgPhoto1(LGX.photo)?1:0)+(lgPhoto1(LGX.photo2)?1:0);
  return `${n<2?`<div class="lg-take"><p class="lg-take-t">${$t('Prends deux photos : le dessus et le dessous de ta langue')}</p>
<ul class="lg-tips"><li>${$t('À la lumière du jour, face à une fenêtre, sans lampe colorée.')}</li><li>${$t('Tire la langue sans forcer, bien détendue, 10 secondes au plus. Recommence si besoin.')}</li><li>${$t('Pas juste après un café, du tabac, des bonbons, des épices ou une boisson colorée : ils colorent la langue et l\'enduit.')}</li></ul></div>`:''}
<div class="lg-slots">${lgSlotHTML('dessus')}${lgSlotHTML('dessous')}</div>${n<2?`<p class="fine">${$t('Les photos restent sur ce téléphone : elles ne sont envoyées nulle part, même avec un compte.')}</p>`:''}`;
}
function lgExamCard(e){
  const ph=[lgPhoto1(e.p1),lgPhoto1(e.p2)],mods=lgModels(e.r),cur=e.id===LGX.exam;
  return `<button type="button" class="lg-ex" data-lgex="${esc(e.id)}"><span class="lg-ex-d">${esc(lgDate(e.d))}${cur?` <em>${$t('dernier examen')}</em>`:''}</span>
<span class="lg-ex-ph">${ph.map((p,i)=>p?`<img src="${p.img}" alt="">`:`<span class="lg-ex-no">${$t(i?'dessous':'dessus')}</span>`).join('')}</span>
<span class="lg-ex-m">${mods.length?mods.slice(0,7).map(m=>`<span class="lg-mini" title="${esc(m[2])}">${tongueSVG(lgIll(m[0],m[1]))}</span>`).join(''):`<span class="lg-ex-t">${$t('Aucun modèle choisi')}</span>`}</span>
${mods.length?`<span class="lg-ex-t">${esc(mods.map(m=>m[2]).join(' · '))}</span>`:''}</button>`;
}
function lgHistHTML(){
  const H=lgHist();if(!H.length)return'';
  return `<h2 class="sec">${$t('Mes examens de langue')}</h2><p class="hint">${$t('Compare d\'une fois sur l\'autre : un enduit qui s\'épaissit montre que le déséquilibre s\'installe, un enduit qui s\'affine qu\'il recule.')}</p><div class="lg-exs">${H.map(lgExamCard).join('')}</div>`;
}
function lgHistSheet(){
  const H=lgHist();
  openSheet($t('Mes examens de langue'),plural(H.length,'examen','examens'),H.length?`<div class="lg-exs">${H.map(lgExamCard).join('')}</div>`:`<p class="hint">${$t('Aucun examen pour l\'instant : il se fait à l\'étape « Langue », après tes symptômes.')}</p>`);
}
function lgExamSheet(id){
  const e=lgHist().find(x=>x.id===id);if(!e)return;
  const blocs=LG_Q.map(q=>{
    if(q.si&&!q.si(e.r))return'';
    const v=q.multi?arr(e.r[q.id]):(e.r[q.id]?[e.r[q.id]]:[]),os=q.o.filter(o=>v.includes(o[0]));
    return os.length?`<div class="lg-ex-q"><p>${$t(q.titre)}</p><div class="lg-ex-os">${os.map(o=>`<span class="lg-ex-o">${tongueSVG(lgIll(q.id,o[0]))}<span>${$t(o[1])}</span></span>`).join('')}</div></div>`:'';
  }).join('');
  const sg=arr(e.s).filter(s=>SYM[s]);
  openSheet($t('Examen de la langue'),lgDate(e.d),`<div class="lg-ex-big">${[['p1','Dessus de la langue'],['p2','Dessous de la langue']].map(([k,l])=>{const p=lgPhoto1(e[k]);return `<figure><figcaption>${$t(l)}</figcaption>${p?`<img class="lg-big" src="${p.img}" alt="">`:`<p class="hint">${$t('Pas de photo')}</p>`}</figure>`;}).join('')}</div>
<h3 class="lg-ex-h">${$t('Les modèles choisis')}</h3>${blocs||`<p class="hint">${$t('Aucun modèle choisi')}</p>`}
${sg.length?`<p class="hint" style="margin-top:12px">${$t('Signes retenus pour le bilan :')} ${esc(sg.map(s=>court(s)).join(', '))}</p>`:`<p class="hint" style="margin-top:12px">${$t('Langue plutôt normale ce jour-là.')}</p>`}
<div class="sheet-acts"><button type="button" class="ghost danger" data-act="lgexdel:${esc(e.id)}">${$t('Supprimer cet examen')}</button></div>`);
}
function lgExamDelete(id){
  lgSaveHist(lgHist().filter(x=>x.id!==id));
  if(LGX.exam===id){LGX.exam=null;LGX.photo=null;LGX.photo2=null;lgSave();}
  lgGC();closeSheet(false,()=>{render();toast('Examen supprimé');});
}
function renderLangue(){
  lgNouveau();
  const n2=lgPhoto1(LGX.photo)&&lgPhoto1(LGX.photo2);
  view.innerHTML=`<div class="bar"><button class="back" type="button" data-mode="choisir"><span aria-hidden="true">‹</span>${$t('Symptômes')}</button><span class="kind">${plural(nSymHorsLangue(),'symptôme','symptômes')}</span></div>
${stepsHTML(2)}<h1 class="vh big-q">${$t('Et ta langue ?')}</h1>
<p class="lede">${$t('En médecine chinoise, la langue montre ce que les symptômes ne disent pas : l\'état du Qi et du Sang, la Chaleur ou le Froid, l\'Humidité. C\'est une pièce essentielle de ton bilan.')}</p>
<div class="lg-photo${n2?' pin':''}" id="lgphoto">${lgPhotoHTML()}</div>
<input type="file" id="lg-cam" accept="image/*" capture="user" hidden><input type="file" id="lg-file" accept="image/*" hidden>
<p class="lg-intro">${$t('Regarde tes photos, ou ta langue dans un miroir, et touche le modèle qui lui ressemble le plus. Si tu hésites, passe la question.')}</p>
<div id="lgq">${lgQuestionsHTML()}</div>
<div class="lg-go"><button type="button" class="cta" data-lggo="1">${$t('Voir mon bilan')} <span aria-hidden="true">→</span></button><button type="button" class="linkbtn" data-lgskip="1">${$t('Je ne peux pas regarder ma langue maintenant')}</button></div>
${lgHistHTML()}`;
}
function lgPick(v){
  const i=v.indexOf(':'),qid=v.slice(0,i),oid=v.slice(i+1),q=LG_Q.find(x=>x.id===qid);if(!q)return;
  lgStart();
  if(q.multi){let a=arr(LGX.r[qid]);if(oid===q.multi)a=a.includes(oid)?[]:[oid];else{a=a.filter(x=>x!==q.multi);a=a.includes(oid)?a.filter(x=>x!==oid):[...a,oid];}LGX.r[qid]=a;}
  else LGX.r[qid]=LGX.r[qid]===oid?'':oid;
  lgSave();
  const box=$('#lgq');if(!box)return;
  const sel=`[data-lg="${cssq(v)}"]`,el=$(sel),top=el?el.getBoundingClientRect().top:null;
  box.innerHTML=lgQuestionsHTML();
  const el2=$(sel);if(el2){if(top!==null)window.scrollBy(0,el2.getBoundingClientRect().top-top);el2.focus({preventScroll:true});}
}
function lgPhoto(file,v){
  if(!file)return;
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{
    const M=760,w=img.naturalWidth,h=img.naturalHeight,k=Math.min(1,M/Math.max(w,h)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    const p={id:'lg'+Date.now().toString(36),d:new Date().toISOString(),v,img:c.toDataURL('image/jpeg',0.78)};
    lgStart();
    const old=v==='dessous'?LGX.photo2:LGX.photo;
    if(v==='dessous')LGX.photo2=p.id;else LGX.photo=p.id;
    const L=[p,...lgPhotos().filter(x=>x.id!==old||lgHist().some(e=>e.p1===old||e.p2===old))].slice(0,LG_MAX),n=lgSavePhotos(L);
    if(!n){if(v==='dessous')LGX.photo2=old;else LGX.photo=old;toast('Plus assez de place sur ce téléphone pour garder la photo.');return;}
    lgSave();
    if(symMode==='langue'&&$('#lgphoto')){const box=$('#lgphoto');box.innerHTML=lgPhotoHTML();box.classList.toggle('pin',!!(lgPhoto1(LGX.photo)&&lgPhoto1(LGX.photo2)));}else render();
    toast(n<L.length?'Photo enregistrée. Les plus anciennes ont été retirées pour faire de la place.':'Photo enregistrée');
  };
  img.onerror=()=>{URL.revokeObjectURL(url);toast('Cette image ne peut pas être lue.');};
  img.src=url;
}
function lgPhotoSheet(id){
  const p=lgPhotos().find(x=>x.id===id);if(!p)return;
  const cur=id===LGX.photo||id===LGX.photo2;
  openSheet($t(p.v==='dessous'?'Dessous de la langue':'Dessus de la langue'),$t('Photo du {d}',{d:lgDate(p.d)}),`<img class="lg-big" src="${p.img}" alt="">${cur?`<div class="sheet-acts"><button type="button" class="ghost danger" data-act="lgdel:${esc(p.id)}">${$t('Supprimer cette photo')}</button></div>`:''}`);
}
function lgDelete(id){
  if(LGX.photo===id)LGX.photo=null;if(LGX.photo2===id)LGX.photo2=null;lgSave();
  const H=lgHist();H.forEach(e=>{if(e.p1===id)e.p1=null;if(e.p2===id)e.p2=null;});lgSaveHist(H);
  lgSavePhotos(lgPhotos().filter(p=>p.id!==id));
  closeSheet(false,()=>{render();toast('Photo supprimée');});
}
/* Ce que la langue dit, en mots simples, pour le bilan */
const LG_SENS={
 'langue-pale':'La pâleur montre un manque de Qi, de Sang ou de Yang : le corps manque de ce qui le nourrit et le réchauffe.',
 'langue-rouge':'Le rouge montre de la Chaleur.',
 'langue-cramoisie':'Le rouge foncé montre une Chaleur forte, qui a gagné le Sang.',
 'langue-rouge-sans-enduit':'Rouge et sans enduit : le Yin s\'épuise et laisse monter une Chaleur « par manque ».',
 'langue-violacee':'La teinte violacée montre que le Sang circule mal, souvent figé par le Froid.',
 'taches-violettes':'Les taches sombres montrent que le Sang stagne à certains endroits.',
 'pointe-rouge':'La pointe rouge montre de la Chaleur dans le Cœur : sommeil léger, agitation.',
 'bords-rouges':'Les bords rouges montrent de la Chaleur dans le Foie.',
 'centre-rouge':'Le centre rouge montre de la Chaleur dans l\'Estomac.',
 'points-rouges':'Les petits points rouges montrent de la Chaleur dans le Sang.',
 'langue-mince':'Une langue mince montre un manque de Sang ou de Yin.',
 'langue-gonflee':'Une langue gonflée montre que l\'Humidité s\'accumule : la Rate n\'arrive plus à tout transformer.',
 'marques-dents':'Les marques des dents montrent une Rate qui manque de Qi.',
 'fissure-centrale':'La fissure au milieu montre un Estomac qui manque de liquides (de Yin) ; si elle va jusqu\'à la pointe, elle parle aussi du Cœur.',
 'langue-fissuree':'Les fissures montrent que les liquides du corps, le Yin, s\'épuisent.',
 'langue-tremblante':'Une langue qui tremble montre un manque de Sang ou de Qi.',
 'enduit-blanc-epais':'L\'enduit blanc et épais montre de l\'Humidité ou du Froid qui s\'accumule.',
 'enduit-jaune':'L\'enduit jaune montre de la Chaleur.',
 'enduit-gras':'L\'enduit gras montre de l\'Humidité ou des Mucosités.',
 'sans-enduit':'L\'enduit est la « vapeur » de l\'Estomac : quand il manque, le Qi et le Yin de l\'Estomac s\'épuisent.',
 'enduit-pele':'L\'enduit qui manque par plaques montre que le Yin de l\'Estomac s\'épuise.',
 'langue-seche':'La sécheresse montre que la Chaleur, ou un manque de Yin, assèche les liquides.',
 'langue-humide':'Une langue très humide montre du Froid ou de l\'Humidité, par manque de Yang.',
 'veines-sublinguales':'Les veines gonflées dessous montrent que le Sang stagne.',
};
function lgDesc(r){
  const adj=[],avec=[];
  const C={pale:'pâle',rouge:'rouge',fonce:'rouge foncé',violacee:'violacée'};
  if(C[r.couleur])adj.push($t(C[r.couleur]));
  const f=arr(r.forme);
  if(f.includes('mince'))adj.push($t('mince'));if(f.includes('gonflee'))adj.push($t('gonflée'));if(f.includes('fissures'))adj.push($t('fissurée'));
  if(r.humidite==='seche')adj.push($t('sèche'));if(r.humidite==='humide')adj.push($t('très humide'));
  if(f.includes('tremble'))adj.push($t('qui tremble'));
  const Z={pointe:'la pointe plus rouge',bords:'les bords plus rouges',centre:'le centre plus rouge',points:'de petits points rouges',taches:'des taches sombres'};
  arr(r.zones).forEach(z=>{if(Z[z])avec.push($t(Z[z]));});
  if(f.includes('dents'))avec.push($t('des marques de dents'));
  if(f.includes('fissure'))avec.push($t('une fissure au milieu'));
  const EA={fin:['fin','blanc'],epais:['blanc','épais'],jaune:['jaune'],gris:['gris ou noir']}[r.enduit];
  if(r.enduit==='sans')avec.push($t('peu ou pas d\'enduit'));
  else if(r.enduit==='absent')avec.push($t('un enduit qui manque par plaques'));
  else if(EA||r.gras==='oui'){const q=(EA||[]).map(x=>$t(x));if(r.gras==='oui')q.push($t('gras'));avec.push($t('un enduit {q}',{q:q.length>1?q.slice(0,-1).join(', ')+' '+$t('et')+' '+q[q.length-1]:q[0]}));}
  if(r.veines==='gonflees')avec.push($t('des veines gonflées dessous'));
  const et=' '+$t('et')+' ',join=a=>a.length>1?a.slice(0,-1).join(', ')+et+a[a.length-1]:a[0]||'';
  if(!adj.length&&!avec.length)return '';
  if(!adj.length)return $t('Ta langue a {a}.',{a:join(avec)});
  return avec.length?$t('Ta langue est {x}, avec {a}.',{x:join(adj),a:join(avec)}):$t('Ta langue est {x}.',{x:join(adj)});
}
/* ---------- Bilan du praticien virtuel ----------
   À partir des symptômes cochés : un tableau principal, 0 à 2 tableaux associés qui expliquent les signes restants,
   un texte rédigé comme par un praticien, une séance de points qui réunit les tableaux, des questions pour affiner. */
const BILAN_MIN=3;
/* Nature de chaque tableau selon les huit règles : v = Vide, p = Plénitude, m = les deux ; c = Chaleur, f = Froid, n = ni l'un ni l'autre */
const BILAN_NAT={'c-vide-qi':'vn','c-vide-sang':'vn','c-vide-yin':'vc','c-feu':'pc','coeur-rate':'vn','coeur-rein':'vc','p-secheresse':'pn','e-vide-qi':'vn','e-vide-froid':'vf','vb-vide':'vn','v-vide-froid':'vf','gi-froid':'pf',
  'f-vide-yin':'vc','femme-chaleur-sang':'pc','f-stagnation-qi':'pn','mei-he-qi':'pn','f-vide-sang':'vn','f-yang':'mc','f-feu':'pc','f-humidite-chaleur':'pc','foie-rate':'mn','foie-estomac':'pn','f-froid-meridien':'pf','f-humidite-bas':'pc',
  'rn-peur':'vn','rn-yin-yang':'vn','qi-sang':'vn','foie-rein-yin':'vc','rate-rein-yang':'vf','poumon-rate-qi':'vn','stase-sang':'pn','froid-uterus':'mf','bi-vent':'pn','bi-froid':'pf','bi-humidite':'pn','bi-chaleur':'pc',
  'peau-vent-chaleur':'pc','peau-humidite-chaleur':'pc','peau-vide-sang':'vn','peau-chaleur-sang':'pc','p-vide-qi':'vn','p-vide-yang':'vf','p-vide-yin':'vc','p-stagnation-qi':'pn','p-vent-froid':'pf','p-vent-chaleur':'pc',
  'p-mucosites-humidite':'pn','p-mucosites-chaleur':'pc','rt-vide-qi':'vn','rt-vide-yang':'vf','rt-effondrement':'vn','rt-sang':'vn','rt-froid-humidite':'pf','rt-humidite-chaleur':'pc','e-vide-yin':'vc','e-feu':'pc','e-froid':'pf',
  'e-stagnation-alimentaire':'pn','e-rebellion':'pn','rn-vide-yang':'vf','rn-vide-yin':'vc','rn-qi-non-ferme':'vn','rn-recevoir-qi':'vn','rn-jing':'vn','v-humidite-chaleur':'pc','gi-humidite-chaleur':'pc','gi-secheresse':'vn','gi-constipation-vide':'vn'};
const BILAN_ORG={'coeur-rate':['coeur','rate'],'coeur-rein':['coeur','rein'],'f-humidite-chaleur':['foie','vesicule'],'foie-rate':['foie','rate'],'foie-estomac':['foie','estomac'],
  'foie-rein-yin':['foie','rein'],'rate-rein-yang':['rate','rein'],'poumon-rate-qi':['poumon','rate'],'rt-humidite-chaleur':['rate','estomac'],'mei-he-qi':['foie','poumon'],'qi-sang':['rate','coeur'],'rt-sang':['rate'],'rn-peur':['rein','coeur'],'vb-vide':['vesicule']};
const ORG_ART={coeur:'le Cœur',poumon:'le Poumon',rate:'la Rate',estomac:'l\'Estomac',foie:'le Foie',vesicule:'la Vésicule biliaire',rein:'le Rein',vessie:'la Vessie','gros-intestin':'le Gros Intestin'};
const BILAN_LIENS=[
  [['foie','rate'],'Le Foie et la Rate sont liés : quand le Qi du Foie se bloque, il pèse sur la digestion, et une Rate fatiguée laisse le Foie s\'emballer.'],
  [['foie','estomac'],'Le Foie bloqué remonte sur l\'Estomac : d\'où l\'estomac noué, les renvois ou les nausées quand tu es tendu.'],
  [['estomac','rate'],'La Rate et l\'Estomac forment un couple : l\'un reçoit les aliments, l\'autre les transforme. Quand l\'un faiblit, l\'autre suit.'],
  [['poumon','rate'],'La Rate nourrit le Poumon : quand elle manque de force, le souffle et les défenses faiblissent aussi.'],
  [['rate','rein'],'La Rate et le Rein se soutiennent : le Rein réchauffe la Rate, la Rate nourrit le Rein.'],
  [['coeur','rein'],'Le Cœur (le feu) et le Rein (l\'eau) s\'équilibrent : quand le Rein manque d\'eau, le Cœur s\'agite, surtout la nuit.'],
  [['coeur','rate'],'La Rate fabrique le Sang qui nourrit le Cœur et l\'esprit : quand elle faiblit, le sommeil et la mémoire en pâtissent.'],
  [['foie','rein'],'Le Foie et le Rein partagent la même source : le Yin du Rein nourrit le Foie ; quand il s\'épuise, le Foie s\'échauffe.'],
  [['coeur','foie'],'Le Foie nourrit le Cœur : quand il s\'échauffe ou manque de Sang, l\'esprit s\'agite.'],
  [['foie','poumon'],'Le Poumon fait descendre le Qi et le Foie le fait circuler : quand ils se bloquent, la poitrine et la gorge se serrent.'],
  [['poumon','rein'],'Le Poumon fait descendre le souffle et le Rein le reçoit : quand le Rein faiblit, le souffle devient court.'],
  [['foie','vesicule'],'Le Foie et la Vésicule biliaire travaillent ensemble : ce qui touche l\'un touche l\'autre.'],
  [['coeur','vesicule'],'La Vésicule biliaire donne le courage de décider, le Cœur abrite l\'esprit : quand ils faiblissent ensemble, on sursaute et on doute.'],
  [['gros-intestin','poumon'],'Le Poumon et le Gros Intestin sont couplés : quand le Poumon manque de force ou de liquides, le transit suit.'],
  [['gros-intestin','rate'],'La digestion est une chaîne : quand la Rate faiblit, les intestins le ressentent.'],
  [['estomac','gros-intestin'],'La digestion est une chaîne : ce qui gêne l\'Estomac se retrouve dans les intestins.'],
  [['rein','vessie'],'Le Rein commande la Vessie : quand il faiblit, les urines s\'en ressentent.'],
  [['femme','foie'],'Le Foie stocke le Sang et règle le cycle : ce qui le bloque se ressent sur les règles.'],
  [['femme','rate'],'La Rate fabrique le Sang des règles et le garde dans les vaisseaux : quand elle faiblit, le cycle s\'en ressent.'],
  [['femme','rein'],'Le Rein est la racine du cycle : quand il s\'épuise, les règles et la fertilité s\'en ressentent.'],
  [['peau','poumon'],'Le Poumon gouverne la peau : ce qui touche l\'un se voit sur l\'autre.'],
  [['bi','rein'],'Le Rein nourrit les os et le Foie les tendons : quand ils faiblissent, le Vent, le Froid et l\'Humidité s\'installent plus facilement dans les articulations.'],
  [['bi','foie'],'Le Foie nourrit les tendons : quand il manque de Sang, les articulations se défendent moins bien.'],
  [['bi','rate'],'La Rate nourrit les muscles et gère l\'Humidité : quand elle faiblit, l\'Humidité s\'installe dans les articulations.'],
];
function bilanOrgs(t){return BILAN_ORG[t.id]||[t.organe];}
/* Liens entre deux tableaux : d'abord selon leur nature (la Rate fabrique le Sang, le Qi mène le Sang…), puis selon les organes */
const BILAN_GR={
  rateVide:['rt-vide-qi','rt-vide-yang','rt-effondrement','rt-sang','poumon-rate-qi','coeur-rate','rate-rein-yang','e-vide-qi','e-vide-froid','gi-constipation-vide'],
  sangVide:['f-vide-sang','c-vide-sang','qi-sang','peau-vide-sang','coeur-rate'],
  humid:['rt-froid-humidite','rt-humidite-chaleur','p-mucosites-humidite','p-mucosites-chaleur','bi-humidite','f-humidite-chaleur','f-humidite-bas','peau-humidite-chaleur','gi-humidite-chaleur','v-humidite-chaleur','mei-he-qi'],
  qiStag:['f-stagnation-qi','foie-rate','foie-estomac','mei-he-qi','p-stagnation-qi'],
  stase:['stase-sang'],
  yinVide:['rn-vide-yin','foie-rein-yin','f-vide-yin','c-vide-yin','p-vide-yin','e-vide-yin','coeur-rein','rn-yin-yang','gi-secheresse'],
  yangMonte:['f-yang','f-feu'],
};
function bGr(t,g){
  const n=BILAN_NAT[t.id]||'';
  if(g==='froid')return n[1]==='f';
  if(g==='chaleurP')return n==='pc'||n==='mc';
  return (BILAN_GR[g]||[]).includes(t.id);
}
const BILAN_LIENS_T=[
  ['rateVide','sangVide','La Rate fabrique le Sang à partir de ce que tu manges : quand elle faiblit, le Sang vient à manquer.'],
  ['rateVide','humid','Une Rate qui manque de force transforme mal l\'eau et les aliments : l\'Humidité s\'accumule, et cette Humidité fatigue la Rate à son tour.'],
  ['qiStag','stase','Le Qi mène le Sang : quand le Qi se bloque longtemps, le Sang finit par stagner.'],
  ['froid','stase','Le Froid fige le Sang : c\'est pour cela qu\'il circule mal.'],
  ['yinVide','yangMonte','Quand le Yin manque, il ne retient plus le Yang du Foie, qui monte vers la tête.'],
  ['sangVide','yangMonte','Le Sang du Foie retient son Yang : quand le Sang manque, le Yang monte vers la tête.'],
  ['qiStag','chaleurP','Un Qi bloqué depuis longtemps finit par chauffer : la Stagnation se transforme en Chaleur.'],
  ['sangVide','stase','Un Sang qui manque circule moins bien : le manque et la stagnation vont souvent ensemble.'],
  ['yinVide','yinVide','Le Yin de tous les organes puise à la même source, le Rein : quand il s\'épuise à un endroit, il s\'épuise souvent ailleurs.'],
  ['humid','chaleurP','L\'Humidité qui stagne s\'échauffe avec le temps : elle devient Humidité-Chaleur.'],
];
function lienTexte(a,b,used){
  used=used||new Set();
  const ok=txt=>{const t=$t(txt);if(used.has(t))return'';used.add(t);return t;};
  for(const [g1,g2,txt] of BILAN_LIENS_T){if((bGr(a,g1)&&bGr(b,g2))||(bGr(a,g2)&&bGr(b,g1))){const t=ok(txt);if(t)return t;}}
  const A=bilanOrgs(a),B=bilanOrgs(b);
  for(const [pair,txt] of BILAN_LIENS){if((A.includes(pair[0])&&B.includes(pair[1]))||(A.includes(pair[1])&&B.includes(pair[0]))){const t=ok(txt);if(t)return t;}}
  if(A.includes('qi-sang')||B.includes('qi-sang')){const t=ok('Le Qi et le Sang se nourrissent l\'un l\'autre : quand l\'un manque ou se bloque, l\'autre suit.');if(t)return t;}
  const same=A.find(o=>B.includes(o)&&ORG_ART[o]);
  if(same){const t=$t('Les deux touchent {o} : ils s\'entretiennent, il faut les soigner ensemble.',{o:$t(ORG_ART[same])});if(!used.has(t)){used.add(t);return t;}}
  return ok('Ces deux déséquilibres s\'entretiennent souvent : en soigner un aide l\'autre.');
}
function court(s){return minus(String(symName(s)).split(/,| \(|\s?: /)[0].trim());}
/* « que à » → « qu'à » (le texte du tableau commence parfois par une voyelle) */
function elide(h){return EN?h:String(h).replace(/(^|[^A-Za-zÀ-ÿ])([Qq])ue (?=[aeiouyàâéèêîôœ])/g,"$1$2u'");}
function listeSignes(ids,max){
  const n=ids.map(court);
  const m=max||4,shown=n.slice(0,m),plus=n.length-shown.length;
  const et=' '+$t('et')+' ';
  if(plus>0)return shown.join(', ')+'…';
  return shown.length>1?shown.slice(0,-1).join(', ')+et+shown[shown.length-1]:shown[0]||'';
}
function minus(s){s=String(s||'');return s.charAt(0).toLowerCase()+s.slice(1);}
function majus(s){s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1);}
function computeBilan(){
  const sel=[...symSel].filter(s=>SYM[s]);
  const res=matchTableaux();
  const hors=sel.filter(s=>SYM[s].cat!=='langue');
  const b={sel,res,tabs:[],assoc:[],reste:[],pistes:[],questions:[]};
  b.langue=lgFresh()||sel.some(s=>SYM[s].cat==='langue');
  // principal : le plus compatible, ou un tableau combiné qui explique davantage de signes
  let p=res[0];
  if(p){const c=res.slice(1,6).find(r=>r.t.organe==='combines'&&r.m.length>p.m.length&&r.pct>=p.pct-15&&!r.contra.length);if(c)p=c;}
  b.enough=hors.length>=BILAN_MIN&&!!p&&p.m.length>=2;
  if(b.enough){
    b.principal=p;const covered=new Set(p.m);
    for(let k=0;k<3;k++){
      let best=null;
      res.forEach(r=>{
        if(r===p||b.assoc.includes(r))return;
        // un signe contraire n'écarte pas un tableau s'il est déjà expliqué par un tableau retenu (une langue rouge due à une Chaleur, par exemple)
        if(r.contra.some(s=>!covered.has(s)))return;
        const nouv=r.m.filter(s=>!covered.has(s));if(!nouv.length)return;
        const nKey=nouv.filter(s=>r.t._cle.includes(s)).length,nLg=nouv.filter(s=>SYM[s].cat==='langue').length;
        if(nLg===nouv.length&&nouv.length<2)return;
        if(nouv.length<2&&!nKey)return;
        if(k===2&&nouv.length<2)return;
        const val=2*nouv.length+2*nKey-0.5*nLg+r.pct/25-(r.contra.length?1.5:0);
        if(!best||val>best.val)best={r,val,nouv};
      });
      if(!best)break;
      best.r._nouv=best.nouv;b.assoc.push(best.r);best.nouv.forEach(s=>covered.add(s));
    }
    b.reste=sel.filter(s=>!covered.has(s));
    b.tabs=[p,...b.assoc];
    // Un signe resté seul : on dit à quel tableau il appartient d'habitude (signe clé d'abord), au lieu de le laisser sans explication
    const pist=new Map();
    b.reste.filter(s=>SYM[s].cat!=='langue').forEach(s=>{
      const cands=tableaux.filter(t=>!b.tabs.some(r=>r.t===t)&&(t._cle.includes(s)||t._autres.includes(s)||t._lies.includes(s)));
      if(!cands.length)return;
      const orgs=new Set(b.tabs.flatMap(r=>bilanOrgs(r.t)));
      const sc=t=>(t._cle.includes(s)?10:0)+(((res.find(r=>r.t===t)||{}).pct)||0)/10-(t._contre.some(x=>symSel.has(x))?3:0)+(bilanOrgs(t).some(o=>orgs.has(o))?2:0);
      const t=cands.sort((x,y)=>sc(y)-sc(x))[0];
      if(!pist.has(t))pist.set(t,[]);pist.get(t).push(s);
    });
    b.pistes=[...pist].map(([t,s])=>({t,s,cle:s.some(x=>t._cle.includes(x))})).slice(0,3);
    b.orphelins=b.reste.filter(s=>SYM[s].cat!=='langue'&&!b.pistes.some(x=>x.s.includes(s)));
    b.confiance=p.pct>=65&&b.reste.length<=1?'forte':p.pct>=40?'moyenne':'faible';
    if(!b.langue&&b.confiance==='forte')b.confiance='moyenne';
  }
  // questions pour affiner : signes clés des pistes, des tableaux retenus et du meilleur concurrent (la langue a sa propre étape)
  const q=[],add=s=>{if(SYM[s]&&SYM[s].cat!=='langue'&&!symSel.has(s)&&!q.includes(s))q.push(s);};
  b.pistes.forEach(x=>x.t._cle.forEach(add));
  const cand=b.enough?[...b.tabs,res.find(r=>!b.tabs.includes(r))].filter(Boolean):res.slice(0,3);
  cand.forEach(r=>r.t._cle.forEach(add));
  cand.forEach(r=>r.t._autres.filter(s=>SYM[s]&&SYM[s].cat!=='langue').slice(0,4).forEach(add));
  b.questions=q.slice(0,b.enough?8:10);
  return b;
}
function bilanProto(tabs){
  const seen=new Map(),ph={d:[],t:[],w:[]},caps=[5,3,3,2];
  tabs.forEach((t,i)=>{
    let n=0;
    t._phases.forEach(x=>x.items.forEach(it=>{
      const key=it.p||it.ab||it.py;
      if(seen.has(key)){const o=seen.get(key);if(!o._for.includes(t))o._for.push(t);return;}
      if(n>=caps[i])return;
      const o=Object.assign({},it,{m:x.m,_for:[t]});seen.set(key,o);ph[x.m].push(o);n++;
    }));
  });
  const _phases=['d','t','w'].filter(m=>ph[m].length).map(m=>({m,items:ph[m]}));
  let h=0;const s=tabs.map(t=>t.id).join('+');for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;
  return {kind:'b',id:'bilan-'+(h>>>0).toString(36),unite:'points',_multi:tabs.length>1,_phases,_items:[].concat(..._phases.map(x=>x.items)),
    consigne:$t('Une séance par jour. Commence par disperser, puis tonifie. Sur les points doubles, le minuteur se relance pour le côté opposé.')};
}
function huitRegles(tabs){
  const N=tabs.map(r=>BILAN_NAT[r.t.id]||'mn');
  const v=N.some(n=>n[0]!=='p'),p=N.some(n=>n[0]!=='v');
  const c=N.some(n=>n[1]==='c'),f=N.some(n=>n[1]==='f'),cVide=c&&N.every(n=>n[1]!=='c'||n==='vc');
  let s=v&&p?$t('Ton bilan mêle Vide et Plénitude : un terrain qui manque de force, sur lequel quelque chose s\'est bloqué ou accumulé.')
    :v?$t('Au fond, c\'est un terrain de Vide : il te manque quelque chose (du Qi, du Sang, du Yin ou du Yang), qu\'il faut nourrir sans forcer.')
    :$t('C\'est surtout une Plénitude : quelque chose s\'accumule ou se bloque (le Qi, la Chaleur, l\'Humidité ou le Sang), qu\'il faut faire circuler ou éliminer.');
  if(c&&f)s+=' '+$t('La Chaleur et le Froid se mêlent : c\'est fréquent, par exemple de la Chaleur en haut et du Froid en bas.');
  else if(c)s+=' '+(cVide?$t('La Chaleur y vient d\'un manque de Yin : une Chaleur « par manque », qu\'on apaise en nourrissant plutôt qu\'en refroidissant.'):$t('Il y a de la Chaleur, qu\'il faut rafraîchir.'));
  else if(f)s+=' '+$t('Il y a du Froid, qu\'il faut réchauffer.');
  return s;
}
function organesTexte(tabs){
  const o=[];tabs.forEach(r=>bilanOrgs(r.t).forEach(x=>{if(ORG_ART[x]&&!o.includes(x))o.push(x);}));
  if(!o.length)return'';
  const n=o.map(x=>$t(ORG_ART[x])),et=' '+$t('et')+' ';
  return $t(o.length>1?'Les organes en jeu : {o}.':'L\'organe en jeu : {o}.',{o:n.length>1?n.slice(0,-1).join(', ')+et+n[n.length-1]:n[0]});
}
function poulsTexte(t){
  const p=String(t.pouls||'').split(/\.\s|\.$/)[0].trim();
  return p?$t('Au pouls, un praticien s\'attendrait à le trouver {p}.',{p:minus(p)}):'';
}
function lgBilanHTML(b){
  const K=Object.keys(LG_SENS),L=b.sel.filter(s=>SYM[s].cat==='langue').sort((x,y)=>K.indexOf(x)-K.indexOf(y));
  const ph=[lgPhoto1(LGX.photo),lgPhoto1(LGX.photo2)].filter(Boolean);
  const img=ph.length?`<span class="pv-lgimgs">${ph.map(p=>`<button type="button" class="pv-lgimg" data-lgph="${esc(p.id)}" aria-label="${$t('Agrandir la photo')}"><img src="${p.img}" alt=""></button>`).join('')}</span>`:'';
  if(!b.langue)return pvBulle(`${$t('Il me manque ta langue. En consultation, c\'est l\'une des premières choses que je regarde : elle confirme ou corrige ce que disent les symptômes.')} <button type="button" class="linkbtn inline pv-link" data-mode="langue">${$t('Regarder ma langue')}</button>`);
  let t='';
  const d=lgFresh()?lgDesc(LGX.r):'';
  if(!L.length){
    t=esc($t('Ta langue est plutôt normale : rose, souple, avec un enduit fin et blanc. C\'est rassurant : le déséquilibre est encore léger, ou récent.'));
  }else{
    t=esc(d||$t('Ta langue : {s}.',{s:listeSignes(L,6)}))+' '+L.filter(s=>LG_SENS[s]&&!(s==='langue-rouge'&&(L.includes('langue-cramoisie')||L.includes('langue-rouge-sans-enduit')))&&!(s==='sans-enduit'&&L.includes('langue-rouge-sans-enduit'))).slice(0,4).map(s=>esc($t(LG_SENS[s]))).join(' ');
    const p=b.principal,inP=L.filter(s=>p.t._cle.includes(s)||p.t._autres.includes(s)),contraP=L.filter(s=>p.t._contre.includes(s));
    const inA=b.assoc.filter(r=>L.some(s=>r.t._cle.includes(s)||r.t._autres.includes(s)));
    if(contraP.length)t+=' '+esc($t('Attention : ta langue ({s}) ne colle pas avec le tableau « {nom} ». Il faudra en tenir compte : un praticien trancherait en t\'examinant.',{s:listeSignes(contraP),nom:p.t.nom}));
    else if(inP.length)t+=' '+esc($t('Elle va dans le même sens que ton tableau principal.'));
    else if(inA.length)t+=' '+esc($t('Elle confirme surtout le tableau « {nom} ».',{nom:inA[0].t.nom}));
  }
  if(LGX.r.enduit==='gris'&&lgFresh())t+=' '+esc($t('Un enduit gris ou noir se voit après le café, le tabac, certains aliments ou médicaments. S\'il reste après un rinçage et dure plusieurs jours, montre-le à un praticien ou à ton médecin.'));
  if(LGX.fait&&!lgFresh())t+=' '+esc($t('Ton examen de la langue date de plus d\'une semaine : refais-le, elle change vite.'))+` <button type="button" class="linkbtn inline pv-link" data-mode="langue">${$t('Refaire')}</button>`;
  if(lgHist().length>1)t+=` <button type="button" class="linkbtn inline pv-link" data-lghist="1">${$t('Comparer avec mes examens précédents')}</button>`;
  return `<div class="pv-b pv-lg">${img}<div>${t}</div></div>`;
}
const AVATAR='<span class="pv-av" aria-hidden="true" lang="zh-Hans">医</span>';
function pvBulle(html){return `<div class="pv-b">${html}</div>`;}
function nomT(t){const b=`<button type="button" class="linkbtn inline pv-link" data-opent="${esc(t.id)}">${esc(t.nom)}</button>`;return EN?`“${b}”`:`« ${b} »`;}
function renderBilan(){
  const b=computeBilan(),sel=b.sel,hors=sel.filter(s=>SYM[s].cat!=='langue');
  let h=`<div class="bar"><button class="back" type="button" data-mode="${b.langue||!hors.length?'choisir':'langue'}"><span aria-hidden="true">‹</span>${$t('Modifier')}</button><span class="kind">${plural(hors.length,'symptôme','symptômes')}</span></div>
${stepsHTML(3)}<h1 class="vh" style="margin-top:14px">${$t('Ton bilan')}</h1><p class="hint">${$t('Touche « Modifier » pour ajouter ou retirer des symptômes, ou')} <button type="button" class="linkbtn inline" data-clear="sym">${$t('efface tout')}</button>.</p>`;
  const alerts=sel.filter(s=>SYM[s].alerte);
  if(alerts.length)h+=`<div class="alert" role="note"><h2>${$t('Quand consulter')}</h2><ul>${alerts.map(s=>`<li><b>${esc(SYM[s].nom)}.</b> ${esc(SYM[s].alerte)}</li>`).join('')}</ul></div>`;
  h+=rappelHTML();
  const msgs=[];
  if(!b.enough){
    if(hors.length<BILAN_MIN)msgs.push(esc($t('Pour l\'instant, tu m\'as donné {n}, c\'est trop peu pour faire un bilan : un symptôme ne vient jamais seul.',{n:plural(hors.length,'signe','signes')})));
    else msgs.push(esc($t('Tes signes partent dans plusieurs directions et je n\'arrive pas encore à les relier entre eux.')));
    const diags=sel.filter(s=>arr(SYM[s].tab).length);
    if(diags.length)msgs.push(esc($t('Le diagnostic « {s} » oriente vers quelques tableaux, mais ce sont tes signes à toi qui diront lequel te correspond.',{s:listeSignes(diags,3)})));
    msgs.push(esc($t('Cite-moi d\'autres symptômes, même légers : comment tu dors, comment tu digères, si tu as plutôt chaud ou froid. Par exemple, as-tu aussi l\'un de ces signes ?')));
    if(!b.langue)msgs.push(`${esc($t('Et regarde ta langue : elle m\'aidera à y voir clair.'))} <button type="button" class="linkbtn inline pv-link" data-mode="langue">${$t('Regarder ma langue')}</button>`);
  }else{
    const p=b.principal,a=b.assoc,ord=l=>[...l.filter(s=>SYM[s].cat!=='langue'),...l.filter(s=>SYM[s].cat==='langue')],used=new Set();
    msgs.push(esc($t(b.langue?'J\'ai lu attentivement les {n} que tu m\'as donnés, et regardé ta langue.':'J\'ai lu attentivement les {n} que tu m\'as donnés.',{n:plural(hors.length,'signe','signes')})));
    msgs.push($t('Avec tout ce que tu m\'as dit, ce qui se rapproche le plus, c\'est le tableau {nom}.',{nom:nomT(p.t)})+' '+
      esc($t(p.m.length>1?'Tes signes ({s}) montrent que {d}.':'Ton signe « {s} » montre que {d}.',{s:listeSignes(ord(p.m)),d:p.t.diag||minus(p.t.simple)})));
    a.forEach((r,i)=>{
      const d=r.t.diag||minus(r.t.simple),s=listeSignes(ord(r._nouv)),lgSeul=r._nouv.every(x=>SYM[x].cat==='langue');
      const intro=lgSeul?$t('Ta langue ajoute un fil : le tableau {nom}.',{nom:nomT(r.t)}):i===0?$t('Mais un tableau ne vient jamais seul : je vois aussi le tableau {nom}.',{nom:nomT(r.t)}):i===1?$t('Et un autre fil se dessine : le tableau {nom}.',{nom:nomT(r.t)}):$t('Enfin, je note le tableau {nom}.',{nom:nomT(r.t)});
      const expl=lgSeul?$t('Son aspect ({s}) laisse penser que {d}.',{s,d}):r._nouv.length>1?$t('Ici, {s} laissent penser que {d}.',{s,d}):$t('Ici, ton signe « {s} » laisse penser que {d}.',{s,d});
      let lien='';for(const o of [p,...a.slice(0,i)]){lien=lienTexte(o.t,r.t,used);if(lien)break;}
      msgs.push(intro+' '+esc(expl)+(lien?' '+esc(lien):''));
    });
    if(!a.length)msgs.push(esc($t('Tout ce que tu décris s\'explique par ce tableau : il est bien dessiné.')));
    msgs.push(lgBilanHTML(b));
    const pc=p.contra.filter(s=>SYM[s].cat!=='langue');
    if(pc.length)msgs.push(esc($t(pc.length>1?'Deux choses ne collent pas avec ce tableau : {s}. Garde-les en tête, un praticien trancherait en t\'examinant.':'Un point ne colle pas avec ce tableau : {s}. Garde-le en tête, un praticien trancherait en t\'examinant.',{s:listeSignes(pc)})));
    b.pistes.forEach(x=>{
      const s=listeSignes(x.s);
      msgs.push(x.cle?$t(x.s.length>1?'Il reste {s} : ce sont des signes du tableau {nom}, dont un signe clé. Tu n\'as pas encore assez de ses autres signes pour que je l\'affirme, mais je le garde en tête : regarde plus bas si tu as aussi ceux que je te propose.':'Il reste « {s} » : c\'est un signe clé du tableau {nom}. Tu n\'as pas encore assez de ses autres signes pour que je l\'affirme, mais je le garde en tête : regarde plus bas si tu as aussi ceux que je te propose.',{s:esc(s),nom:nomT(x.t)})
        :$t(x.s.length>1?'Il reste {s} : on les rencontre surtout dans le tableau {nom}. C\'est une piste à vérifier.':'Il reste « {s} » : on le rencontre surtout dans le tableau {nom}. C\'est une piste à vérifier.',{s:esc(s),nom:nomT(x.t)}));
    });
    if(b.orphelins.length)msgs.push(esc($t(b.orphelins.length>1?'Je n\'arrive pas à relier ces signes à ton bilan : {s}. Ils peuvent avoir une autre origine, parles-en à ton médecin.':'Je n\'arrive pas à relier ce signe à ton bilan : {s}. Il peut avoir une autre origine, parles-en à ton médecin.',{s:listeSignes(b.orphelins,6)})));
    // synthèse : huit règles, organes, stratégie, pouls
    const ordre=[...b.tabs].sort((x,y)=>'pmv'.indexOf((BILAN_NAT[x.t.id]||'m')[0])-'pmv'.indexOf((BILAN_NAT[y.t.id]||'m')[0]));
    const pr=ordre.map(r=>r.t.principe&&r.t.principe.fr).filter(Boolean).map(minus);
    const strat=pr.length>1?$t('Ce que je te propose : d\'abord {a}, puis {b}.',{a:pr[0],b:pr.slice(1).join(EN?'; ':' ; ')}):pr.length?$t('Ce que je te propose : {a}.',{a:pr[0]}):'';
    msgs.push(`<b>${$t('En résumé')}</b> — `+esc([huitRegles(b.tabs),organesTexte(b.tabs),strat].filter(Boolean).join(' ')));
    const pl=poulsTexte(p.t);
    msgs.push(esc([pl,$t(b.confiance==='forte'?'Ton bilan est net.':b.confiance==='moyenne'?'Ton bilan tient la route, mais quelques signes de plus le rendraient plus sûr.':'C\'est une première piste : j\'aurais besoin de plus de signes pour être sûr.')].filter(Boolean).join(' ')));
  }
  h+=`<section class="pv" aria-label="${$t('Ton praticien virtuel')}"><div class="pv-h">${AVATAR}<div><b>${$t('Ton praticien virtuel')}</b><small>${$t('Il relie tes signes comme en consultation')}</small></div></div>${msgs.map(m=>elide(m.startsWith('<div class="pv-b')?m:pvBulle(m))).join('')}`;
  if(b.enough){
    const zh=b.tabs.filter(r=>r.t.zh).map(r=>`<span lang="zh-Hans">${esc(r.t.zh)}</span>`).join(' + ');
    if(zh)h+=`<p class="pv-zh">${zh}<small>${esc(b.tabs.filter(r=>r.t.py).map(r=>r.t.py).join(' + '))}</small></p>`;
  }
  h+=`</section>`;
  if(b.questions.length)h+=`<div class="verify pv-q"><span>${$t(b.enough?'Pour affiner mon bilan, as-tu aussi :':'As-tu aussi :')}</span><div class="chips small">${b.questions.map(s=>`<button type="button" class="chip add" data-sym="${esc(s)}" data-keep="1" aria-pressed="false">+ ${esc(symName(s))}</button>`).join('')}</div></div>`;
  if(b.enough){
    h+=`<h2 class="results-h">${$t(b.tabs.length>1?'Tes tableaux':'Ton tableau')}</h2><div class="entries">${b.tabs.map((r,i)=>{const [cls,lab]=force(r);return `<div class="result"><p class="pv-role">${$t(i?'Associé':'Principal')}</p>${cardT(r.t,`<span class="match">${ringHTML(r.pct,cls)}<span class="match-t"><b>${$t('{p} % compatible',{p:r.pct})}</b><span>${$t('avec tes symptômes')} · ${lab}</span></span></span>`,true)}</div>`;}).join('')}</div>`;
    const e=bilanProto(b.tabs.map(r=>r.t));
    if(e._items.length){
      h+=`<h2 class="sec">${$t('Ta séance de points')}</h2><p class="hint">${$t(b.tabs.length>1?'J\'ai réuni en une seule séance les points les plus utiles de tes tableaux, sans doublon.':'Les points les plus utiles pour ton tableau.')}</p><div class="fiche bilan-proto">${protoHTML(e)}</div>`;
    }
    const sc={};b.tabs.forEach((r,i)=>arr(r.t.recettes).forEach((id,k)=>{sc[id]=(sc[id]||0)+(i?1:1.5)+(k<3?0.5:0);}));
    const recs=Object.keys(sc).map(fiche).filter(Boolean).sort((x,y)=>sc[y.id]-sc[x.id]).slice(0,6);
    if(recs.length)h+=`<h2 class="sec">${$t('Dans ton assiette')}</h2><div class="entries">${recs.map(x=>cardF(x)).join('')}</div>`;
    const pt=b.principal.t,cons=[];b.tabs.forEach(r=>arr(r.t.conseils).slice(0,2).forEach(c=>{if(!cons.includes(c))cons.push(c);}));
    if(pt.privilegier||pt.eviter||cons.length)h+=`<h2 class="sec">${$t('Au quotidien')}</h2>${pt.privilegier||pt.eviter?`<div class="dual">${pt.privilegier?`<div class="card good"><h3>${$t('À privilégier')}</h3><p>${esc(pt.privilegier)}</p></div>`:''}${pt.eviter?`<div class="card bad"><h3>${$t('À éviter')}</h3><p>${esc(pt.eviter)}</p></div>`:''}</div>`:''}${cons.length?`<ul class="bullets">${cons.slice(0,6).map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}`;
    h+=`<button type="button" class="ghost wide" data-mode="resultats">${$t('Voir tous les tableaux possibles ({n})',{n:b.res.length})}</button>`;
    h+=`<p class="fine">${$t('Ce bilan est une orientation selon la médecine traditionnelle chinoise, calculée à partir de tes réponses. Ce n\'est pas un diagnostic médical et il ne remplace ni ton médecin ni le bilan d\'un praticien qui t\'examine (langue, pouls).')}</p>`;
    view.innerHTML=h;
    if(e._items.length){T.forEach((t,k)=>{if(t.eid===e.id&&t.ekind==='b')updT(k);});counts('b:'+e.id);}
    bilanShown=e.id;
  }else{
    if(b.res.length)h+=`<button type="button" class="ghost wide" data-mode="resultats">${$t('Voir quand même les tableaux possibles ({n})',{n:b.res.length})}</button>`;
    view.innerHTML=h;bilanShown=null;
  }
}
let bilanShown=null;
function onBilanShown(t){return t&&t.ekind==='b'&&!route&&tab==='symptomes'&&symMode==='bilan'&&bilanShown===t.eid;}

/* ---------- Tableaux ---------- */
function groupsWith(){return ORGS.map(o=>({o,list:tableaux.filter(t=>t._groups.includes(o.id))})).filter(g=>g.list.length);}
function renderTableaux(){
  const gs=groupsWith();
  view.innerHTML=`<h1 class="vh">${$t('Tableaux')}</h1><p class="lede">${$t('Les tableaux de la médecine chinoise, organe par organe, avec leurs signes, leurs points et leurs recettes.')}</p>
${tipHTML(TIP_COUCHES,'Un tableau ne vient jamais seul.','On a souvent plusieurs tableaux en même temps, qui s\'entretiennent l\'un l\'autre : par exemple un Vide de Qi de la Rate avec une Stagnation du Qi du Foie. Il est donc normal de te reconnaître dans plusieurs d\'entre eux.')}
<div class="tools">${searchBox('tq',tabQuery,$t('Chercher un tableau, un organe'),$t('Chercher un tableau'))}</div>
<nav class="jump" aria-label="${$t('Aller à un organe')}">${gs.map(g=>`<button type="button" class="jump-b" data-jump="${esc(g.o.id)}"><span lang="zh-Hans">${esc(g.o.zh||'')}</span>${esc(g.o.nom)}</button>`).join('')}</nav>
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
    h+=`<section class="grp" id="grp-${esc(o.id)}"><h2 class="org"><span class="org-zh" lang="zh-Hans">${esc(o.zh||'')}</span><span>${esc(o.nom)}${o.sous?`<small>${esc(o.sous)}</small>`:''}</span><span class="org-n">${list.length}</span></h2><div class="entries">${list.map(t=>cardT(t)).join('')}</div>${also.length?`<div class="also"><span>${$t('Avec un autre organe')}</span>${also.map(t=>`<button type="button" class="also-b" data-opent="${esc(t.id)}"><b>${esc(t.etiquette)}</b> ${esc(t.nom)}</button>`).join('')}</div>`:''}</section>`;
  });
  box.innerHTML=n?h:`<p class="msg">${esc($t('Aucun tableau ne correspond à « {q} ».',{q:tabQuery.trim()}))}</p>`;
  const nav=view.querySelector('.jump');if(nav)nav.hidden=!!tabQuery.trim();
}
function signChips(list,key){
  return list.map(s=>`<button type="button" class="chip sign${key?' key':''}" data-sym="${esc(s)}" aria-pressed="${symSel.has(s)}">${esc(symName(s))}</button>`).join('');
}
function renderTableauDetail(t){
  const n=[...t._cle,...t._autres,...t._lies].filter(s=>symSel.has(s)).length;
  const me=n?matchTableaux().find(x=>x.t===t):null;let compatH='';
  if(me){const [cls,lab]=force(me);compatH=`<div class="compat">${ringHTML(me.pct,cls,true)}<div><b>${$t('Compatible à {p} % avec tes symptômes',{p:me.pct})}</b><span>${esc(lab.charAt(0).toUpperCase()+lab.slice(1))} · ${symSel.size===1?$t('ton signe s\'y retrouve'):$t(me.m.length>1?'{m} de tes {n} signes s\'y retrouvent':'{m} de tes {n} signes s\'y retrouve',{m:me.m.length,n:symSel.size})}</span></div></div>`;}
  let h=`<div class="fiche tableau">${barHTML('t',t.id,t._label)}
<header class="dhead"><p class="eyebrow">${esc(t._label)}</p><h1 class="dtitle">${esc(t.nom)}</h1>
${t.simple?`<p class="dsimple">${esc(t.simple)}</p>`:''}${t._rep.length?`<p class="dreps"><b>${$t('Souvent :')}</b>${t._rep.map(r=>`<span>${esc(r)}</span>`).join('')}</p><p class="dnote">${$t('Repères pour s\'orienter : un tableau de médecine chinoise n\'est pas un diagnostic médical.')}</p>`:''}
${compatH}<p class="sub"><span lang="zh-Hans">${esc(t.zh||'')}</span>${t.py?` · ${esc(t.py)}`:''}</p>
${t.resume?`<p class="ctx">${esc(t.resume)}</p>`:''}</header>`;
  if(t.consulter)h+=`<div class="alert" role="note"><h2>${$t('Avis médical')}</h2><p>${esc(t.consulter)}</p></div>`;
  h+=rappelHTML();
  if(arr(t.causes).length)h+=`<h2 class="sec">${$t('Causes fréquentes')}</h2><ul class="bullets">${t.causes.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`;
  if(t.mecanisme)h+=`<h2 class="sec">${$t('Ce qui se passe')}</h2><p class="prose">${esc(t.mecanisme)}</p>`;
  h+=`<h2 class="sec">${$t('Signes')}${n?` <span class="sec-n">${$t('{n} chez toi',{n})}</span>`:''}</h2><p class="hint">${$t('Les signes clés sont en gras. Touche un signe pour l\'ajouter à tes symptômes.')}</p><div class="chips">${signChips(t._cle,true)}${signChips(t._autres,false)}</div>`;
  if(t._lies.length)h+=`<p class="hint lies-h">${$t('Tableau souvent rencontré avec ces diagnostics médicaux, en plus de leur traitement :')}</p><div class="chips lies">${signChips(t._lies,false)}</div>`;
  h+=`<dl class="kv tongue">${t.langue?`<dt>${$t('Langue')}</dt><dd>${esc(t.langue)}</dd>`:''}${t.pouls?`<dt>${$t('Pouls')}</dt><dd>${esc(t.pouls)}</dd>`:''}</dl>`;
  h+=prinHTML(t);
  if(t._items.length){
    h+=`<h2 class="sec">${$t('Points d\'auto-massage')}</h2>`;
    if(t.moxa)h+=`<p class="hint">${esc(t.moxa)}</p>`;
    h+=protoHTML(t);
  }
  const recs=arr(t.recettes).map(fiche).filter(Boolean);
  if(recs.length)h+=`<h2 class="sec">${$t('Recettes adaptées')}</h2><div class="entries">${recs.map(e=>cardF(e)).join('')}</div>`;
  const prots=arr(t.fiches).map(fiche).filter(Boolean);
  if(prots.length)h+=`<h2 class="sec">${$t('Protocole complet')}</h2><div class="entries">${prots.map(e=>cardF(e)).join('')}</div>`;
  if(t.privilegier||t.eviter)h+=`<h2 class="sec">${$t('Alimentation et hygiène de vie')}</h2><div class="dual">${t.privilegier?`<div class="card good"><h3>${$t('À privilégier')}</h3><p>${esc(t.privilegier)}</p></div>`:''}${t.eviter?`<div class="card bad"><h3>${$t('À éviter')}</h3><p>${esc(t.eviter)}</p></div>`:''}</div>`;
  if(arr(t.conseils).length)h+=`<h2 class="sec">${$t('Conseils')}</h2><ul class="bullets">${t.conseils.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`;
  h+=`<p class="fine">${$t('Ce tableau décrit un déséquilibre selon la médecine traditionnelle chinoise. Il ne remplace pas un avis médical.')}</p></div>`;
  view.innerHTML=h;
  afterDetail(t);
}

/* ---------- Cuisine ---------- */
let cuisMode=store('ys.cuisine-mode')==='aliments'?'aliments':'recettes',cuisTri=store('ys.cuisine-tri')==='axe'?'axe':'genre',recQuery='',alimQuery='',alimNat='tous';
const NAT_GROUPES={frais:['froide','fraiche-froide','fraiche','neutre-fraiche'],neutre:['neutre'],chaud:['neutre-tiede','tiede','tiede-chaude','chaude']};
function natBadge(n){const x=NATS[n];return x?`<span class="nat n-${esc(n)}">${esc(x.nom)}</span>`:'';}
function savHTML(list){return arr(list).filter(s=>SAVS[s]).map(s=>`<span class="sav s-${esc(s)}">${esc(SAVS[s].nom)}</span>`).join('');}
function orgNames(list){return arr(list).map(o=>ORGC[o]?ORGC[o].nom:o).join(', ');}
function renderCuisine(){
  const recs=fiches.filter(e=>e.type==='recette');
  let h=`<h1 class="vh">${$t('Cuisine')}</h1><p class="lede">${$t(cuisMode==='aliments'?'La nature, les saveurs et les organes de chaque aliment, selon la diététique chinoise.':'Diététique chinoise au quotidien : congees, soupes, plats, salades, desserts et boissons.')}</p>
<div class="seg segc" role="group" aria-label="${$t('Afficher')}"><button type="button" data-cmode="recettes" aria-pressed="${cuisMode==='recettes'}">${$t('Recettes')} <span class="n">${recs.length}</span></button><button type="button" data-cmode="aliments" aria-pressed="${cuisMode==='aliments'}">${$t('Aliments')} <span class="n">${Object.values(INGC).filter(i=>NATS[i.nature]).length}</span></button></div>`;
  if(cuisMode==='aliments'){view.innerHTML=h+alimShellHTML();bindAlim();return;}
  const used=new Set();recs.forEach(e=>e._keys.forEach(k=>used.add(k)));
  h+=`<details class="cat pick" data-cat="_ing"${ingOpen?' open':''}><summary><span>${$t('J\'ai dans ma cuisine…')}</span>${have.size?`<span class="cat-n">${have.size}</span>`:''}</summary>
${INGCATS.map(c=>{const list=Object.values(INGC).filter(i=>i.cat===c.id&&used.has(i.id));return list.length?`<p class="subcat">${esc(c.nom)}</p><div class="chips och">${list.map(i=>`<button type="button" class="chip" data-ing="${esc(i.id)}" aria-pressed="${have.has(i.id)}">${esc(i.nom)}</button>`).join('')}</div>`:'';}).join('')}
${have.size?`<button type="button" class="linkbtn" data-clear="ing">${$t('Tout décocher')}</button>`:''}
<p class="fine">${$t('L\'eau, le sel, l\'huile, la sauce soja et le sucre sont comptés d\'office.')}</p></details>
<div id="cuisres"></div>
<h2 class="results-h">${$t('Toutes les recettes')}</h2>
<div class="tools">${searchBox('rq',recQuery,$t('Chercher une recette, un ingrédient'),$t('Chercher une recette'))}
<div class="trirow"><span id="ctri-l">${$t('Classement')}</span><div class="seg segt" role="group" aria-labelledby="ctri-l"><button type="button" data-ctri="genre" aria-pressed="${cuisTri==='genre'}">${$t('Par type de plat')}</button><button type="button" data-ctri="axe" aria-pressed="${cuisTri==='axe'}">${$t('Par effet')}</button></div></div></div>
<nav class="jump" aria-label="${$t('Aller à une rubrique')}">${recGroups(recs).map(g=>`<button type="button" class="jump-b" data-jump="${esc(g.key)}">${g.zh?`<span lang="zh-Hans">${esc(g.zh)}</span>`:''}${esc(g.nom)}</button>`).join('')}</nav>
<div id="reclist"></div>`;
  view.innerHTML=h;
  const d=view.querySelector('details.pick');
  if(d)d.addEventListener('toggle',()=>{ingOpen=d.open;});
  const q=$('#rq');q.addEventListener('input',()=>{recQuery=q.value;renderRecList();});
  renderCuisRes();renderRecList();
}
function recGroups(recs){
  const src=cuisTri==='axe'?AXES:GENRES,key=cuisTri==='axe'?'axe':'genre';
  const gs=src.map(a=>({key:key[0]+'-'+a.id,zh:a.zh,nom:a.nom,texte:cuisTri==='genre'?a.texte:'',list:recs.filter(e=>e[key]===a.id)})).filter(g=>g.list.length);
  const other=recs.filter(e=>!src.some(a=>a.id===e[key]));
  if(other.length)gs.push({key:key[0]+'-autres',zh:'',nom:$t('Autres'),texte:'',list:other});
  return gs;
}
function renderRecList(){
  const box=$('#reclist');if(!box)return;
  const q=recQuery.trim();let n=0;
  const gs=recGroups(fiches.filter(e=>e.type==='recette'&&matchQ(e._hay,recQuery)));
  box.innerHTML=gs.map(g=>{n+=g.list.length;return `<section class="grp" id="grp-${esc(g.key)}"><h2 class="org">${g.zh?`<span class="org-zh" lang="zh-Hans">${esc(g.zh)}</span>`:''}<span>${esc(g.nom)}${g.texte&&!q?`<small>${esc(g.texte)}</small>`:''}</span><span class="org-n">${g.list.length}</span></h2><div class="entries">${g.list.map(e=>cardF(e)).join('')}</div></section>`;}).join('')
    ||`<p class="msg">${esc($t('Aucune recette ne correspond à « {q} ».',{q}))}</p>`;
  const nav=view.querySelector('.jump');if(nav)nav.hidden=!!q;
}
function renderCuisRes(){
  const box=$('#cuisres');if(!box)return;
  const recs=fiches.filter(e=>e.type==='recette');
  if(!have.size){box.innerHTML='';return;}
  const m=recs.map(e=>({e,got:e._keys.filter(k=>have.has(k))})).filter(r=>r.got.length).sort((a,b)=>(b.got.length/b.e._keys.length)-(a.got.length/a.e._keys.length)||b.got.length-a.got.length);
  let h=`<h2 class="results-h">${$t(m.length?'Avec tes ingrédients':'Aucune recette avec ces ingrédients')}</h2>`;
  if(m.length)h+='<div class="entries">'+m.slice(0,8).map(r=>{
    const miss=r.e._keys.filter(k=>!have.has(k)).map(k=>(INGC[k]?INGC[k].nom:k).toLowerCase());
    return cardF(r.e,`<span class="ematch">${$t(r.got.length>1?'Tu as {a} ingrédients sur {b}':'Tu as {a} ingrédient sur {b}',{a:r.got.length,b:r.e._keys.length})}</span><span class="emiss">${miss.length?$t('Il manque : ')+esc(miss.join(', ')):$t('Tu as tout ce qu\'il faut')}</span>`);
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
/* Guide des aliments : nature, saveurs, tropisme */
function alimShellHTML(){
  const cats=INGCATS.filter(c=>Object.values(INGC).some(i=>i.cat===c.id&&NATS[i.nature]));
  return `<details class="cat howto"><summary><span>${$t('Comment lire ces fiches')}</span></summary><div class="howto-b">
<p><b>${$t('La nature')}</b> ${$t('dit si l\'aliment réchauffe ou rafraîchit le corps, du plus froid au plus chaud :')}</p><p class="natscale">${Object.keys(NATS).map(natBadge).join('')}</p>
<p><b>${$t('Les saveurs')}</b> ${$t('indiquent son action :')}</p><ul class="savlist">${Object.entries(SAVS).map(([k,s])=>`<li><span class="sav s-${esc(k)}">${esc(s.nom)}</span> ${esc(s.texte||'')}</li>`).join('')}</ul>
<p><b>${$t('Le tropisme')}</b> ${$t('désigne les organes vers lesquels l\'aliment agit en priorité.')}</p>
<p class="fine">${$t('Un repas équilibré mélange les natures ; on ajuste selon la saison et selon qu\'on a plutôt chaud ou plutôt froid.')}</p></div></details>
<div class="tools">${searchBox('alq',alimQuery,$t('Chercher un aliment'),$t('Chercher un aliment'))}
<div class="seg segn" role="group" aria-label="${$t('Nature')}">${[['tous','Tous'],['frais','Rafraîchissants'],['neutre','Neutres'],['chaud','Réchauffants']].map(([k,l])=>`<button type="button" data-anat="${k}" aria-pressed="${alimNat===k}">${$t(l)}</button>`).join('')}</div></div>
<nav class="jump" aria-label="${$t('Aller à une rubrique')}">${cats.map(c=>`<button type="button" class="jump-b" data-jump="a-${esc(c.id)}">${c.zh?`<span lang="zh-Hans">${esc(c.zh)}</span>`:''}${esc(c.nom)}</button>`).join('')}</nav>
<div id="alimlist"></div>`;
}
function bindAlim(){const q=$('#alq');if(q)q.addEventListener('input',()=>{alimQuery=q.value;renderAlimList();});renderAlimList();}
function renderAlimList(){
  const box=$('#alimlist');if(!box)return;
  const order=Object.keys(NATS),q=alimQuery.trim(),grp=NAT_GROUPES[alimNat];
  const coll=typeof Intl!=='undefined'&&Intl.Collator?new Intl.Collator(LANG):null;
  let n=0;
  box.innerHTML=INGCATS.map(c=>{
    const list=Object.values(INGC).filter(i=>i.cat===c.id&&NATS[i.nature]&&(!grp||grp.includes(i.nature))&&matchQ(hayOf([i.nom,i.zh||'']),alimQuery))
      .sort((a,b)=>order.indexOf(a.nature)-order.indexOf(b.nature)||(coll?coll.compare(a.nom,b.nom):0));
    if(!list.length)return '';n+=list.length;
    return `<section class="grp" id="grp-a-${esc(c.id)}"><h2 class="org">${c.zh?`<span class="org-zh" lang="zh-Hans">${esc(c.zh)}</span>`:''}<span>${esc(c.nom)}</span><span class="org-n">${list.length}</span></h2><div class="alist">${list.map(i=>`<button type="button" class="al" data-alim="${esc(i.id)}"><span class="al-top"><span class="al-n">${esc(i.nom)}</span>${natBadge(i.nature)}</span><span class="al-sub">${savHTML(i.saveurs)}${arr(i.tropisme).length?`<span class="al-t">${esc(orgNames(i.tropisme))}</span>`:''}</span></button>`).join('')}</div></section>`;
  }).join('')||`<p class="msg">${esc($t('Aucun aliment ne correspond à « {q} ».',{q}))}</p>`;
  view.querySelectorAll('[data-anat]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.anat===alimNat)));
  const nav=view.querySelector('.jump');if(nav)nav.hidden=!!q;
}
function alimSheet(id){
  const i=INGC[id];if(!i)return;
  const recs=fiches.filter(e=>e.type==='recette'&&e._keys.includes(id));
  const nat=NATS[i.nature];
  let b=`<div class="alim">${nat?`<p class="alim-nat">${natBadge(i.nature)}<span>${esc(nat.texte||'')}</span></p>`:''}`;
  if(arr(i.saveurs).length)b+=`<h3 class="sh">${$t('Saveurs')}</h3><ul class="savlist">${i.saveurs.filter(s=>SAVS[s]).map(s=>`<li><span class="sav s-${esc(s)}">${esc(SAVS[s].nom)}</span> ${esc(SAVS[s].texte||'')}</li>`).join('')}</ul>`;
  if(arr(i.tropisme).length)b+=`<h3 class="sh">${$t('Tropisme')}</h3><p>${esc(orgNames(i.tropisme))}</p>`;
  if(i.note)b+=`<p class="alim-note">${esc(i.note)}</p>`;
  if(recs.length){
    b+=`<h3 class="sh">${$t(recs.length>1?'{n} recettes avec cet aliment':'1 recette avec cet aliment',{n:recs.length})}</h3><div class="alim-recs">${recs.map(e=>`<button type="button" class="alim-r" data-open="${esc(e.id)}">${esc(e.titre)}</button>`).join('')}</div>
<button type="button" class="switch" data-ing="${esc(id)}" aria-pressed="${have.has(id)}"><span class="sw" aria-hidden="true"></span><span><b>${$t('J\'en ai dans ma cuisine')}</b><small>${$t('Pour trouver les recettes avec ce que tu as')}</small></span></button>`;
  }
  b+='</div>';
  openSheet(i.nom,i.zh||'',b);
}

/* ---------- Carnet ---------- */
function collCount(cid){
  if(cid==='tout')return fiches.filter(e=>!isHidden('f',e.id)).length;
  const it=coll(cid);return it?it.filter(x=>item(x.k,x.id)).length:0;
}
function renderCarnet(){
  if(carnetSel!=='tout'&&!coll(carnetSel))carnetSel='tout';
  const custom=isCustom(carnetSel);
  let h=`${FB?`<div class="accrow"><button type="button" class="accbtn" id="accbtn" data-account="1" aria-label="${$t(user?'Ton compte':'Se connecter')}">${accBtnInner()}</button></div>`:''}<header class="mast">${SEAL}<div><h1>Carnet Yang Sheng</h1><p class="lede">${$t('Reste appuyé sur une fiche pour la ranger ou la glisser dans un carnet, et sur un onglet pour le déplacer.')}</p></div></header>
<nav class="colls" aria-label="${$t('Carnets')}">${orderedColls().map(([id,n])=>`<button type="button" class="coll${id===carnetSel?' on':''}" data-coll-sel="${esc(id)}" data-lpc="${esc(id)}" aria-pressed="${id===carnetSel}">${esc(n)}<span class="n">${collCount(id)}</span></button>`).join('')}<button type="button" class="coll add" data-newcarnet="1">+ ${$t('Nouveau carnet')}</button>${carnets.length?`<button type="button" class="coll add" data-manage="1">${$t('Gérer')}</button>`:''}</nav>
<div class="tools"><div class="coll-h"><h2>${esc(collName(carnetSel))}</h2><span class="coll-a">${selMode?'':`<button type="button" class="ghost" data-selstart="1">${$t('Sélectionner')}</button>`}${custom?`<button type="button" class="ghost" data-cmenu="${esc(carnetSel)}" aria-label="${$t('Options du carnet')}">${$t('Options')}</button>`:''}</span></div>`;
  if(carnetSel==='tout')h+=`<div class="seg segf" role="group" aria-label="${$t('Afficher')}"><button type="button" data-f="tout">${$t('Tout')} <span class="n"></span></button><button type="button" data-f="protocole">${$t('Protocoles')} <span class="n"></span></button><button type="button" data-f="recette">${$t('Recettes')} <span class="n"></span></button></div>
<div class="trirow"><span id="tri-l">${$t('Classement')}</span><div class="seg segt" role="group" aria-labelledby="tri-l"><button type="button" data-tri="date">${$t('Par date')}</button><button type="button" data-tri="perso">${$t('Mon ordre')}</button></div></div>`;
  h+=`${searchBox('q',query,$t('Chercher un plat, un symptôme'),$t('Chercher dans le carnet'))}</div><div id="timeline" aria-live="polite"></div>`;
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
    if(!rowsList.length)h=`<p class="msg">${query.trim()?esc($t('Aucune fiche ne correspond à « {q} ».',{q:query.trim()})):$t('Aucune fiche ne correspond.')}</p>`;
    else{
      if(rowsList.length>1&&!selMode)h+=`<p class="hint">${$t(toutTri==='perso'?'Dans ton ordre. Reste appuyé puis fais glisser une fiche pour la déplacer.':'Classées par date. Reste appuyé puis fais glisser une fiche pour la placer où tu veux.')}</p>`;
      if(toutTri==='perso')h+=`<div class="entries" data-coll="tout" data-sort="tout">${rowsList.map(e=>cardF(e)).join('')}</div>`;
      else{
        let month='',day=null;const close=()=>{if(day!==null)h+='</div></section>';};
        rowsList.forEach(e=>{
          const d=e._d,mk=d?d.getFullYear()+'-'+d.getMonth():'?',dk=e.date||'?';
          if(mk!==month){close();day=null;month=mk;h+=`<h2 class="month">${d?MOIS[d.getMonth()]+' '+d.getFullYear():$t('Sans date')}</h2>`;}
          if(dk!==day){close();day=dk;h+=`<section class="day" aria-label="${esc(longDate(d))}"><div class="date" aria-hidden="true"><span class="d">${d?d.getDate():'–'}</span><span class="w">${d?JOURS_C[d.getDay()]:''}</span></div><div class="entries" data-coll="tout">`;}
          h+=cardF(e);
        });
        close();
      }
    }
    box.innerHTML=h;
    if(toutTri==='date'&&rowsList.length>1)box.dataset.sort='tout';
    decorateSel(box);return;
  }
  const it=(coll(carnetSel)||[]).map(x=>({x,e:item(x.k,x.id)})).filter(r=>r.e);
  if(!it.length){
    box.innerHTML='<p class="msg">'+$t(carnetSel==='favoris'?'Pas encore de favori. Touche l\'étoile d\'une fiche, ou reste appuyé dessus et choisis « Ajouter aux favoris ».':
      carnetSel==='recents'?'Les fiches et tableaux que tu ouvres apparaîtront ici.':
      'Ce carnet est vide. Reste appuyé sur une fiche ou un tableau, n\'importe où dans l\'appli, et choisis « Ajouter à un carnet ». Depuis tes autres carnets, tu peux aussi la faire glisser vers celui-ci en haut de l\'écran.')+'</p>';
    box.classList.remove('selecting');return;
  }
  const shown=it.filter(r=>matchQ(r.e._hay,query));
  if(!shown.length){box.innerHTML=`<p class="msg">${esc($t('Aucune fiche ne correspond à « {q} ».',{q:query.trim()}))}</p>`;decorateSel(box);return;}
  const sortable=true;
  const hint=selMode||shown.length<2?'':$t(carnetSel==='recents'?'Reste appuyé puis fais glisser une fiche pour changer sa place, ou vers un carnet en haut de l\'écran. Une fiche que tu rouvres remonte en tête.':'Reste appuyé puis fais glisser une fiche pour la placer où tu veux, ou vers un autre carnet en haut de l\'écran.');
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
function segHTML(name,cur,opts,label,cols){
  return `<div class="seg" role="group" aria-label="${esc(label)}" style="grid-template-columns:${cols||`repeat(${opts.length},minmax(0,1fr))`}">${opts.map(([v,l,lang])=>`<button type="button" data-set="${name}:${esc(v)}" aria-pressed="${String(cur)===String(v)}"${lang?` lang="${lang}"`:''}>${esc(l)}</button>`).join('')}</div>`;
}
function swHTML(name,on,title,sub){
  return `<button type="button" class="switch" ${name==='auto'?'data-auto="1"':`data-pref="${name}"`} aria-pressed="${!!on}"><span class="sw" aria-hidden="true"></span><span><b>${esc(title)}</b><small>${esc(sub)}</small></span></button>`;
}
let setOpen=false;
const GEAR='<svg class="set-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
function settingsHTML(){
  return `<details class="cat set-acc" id="reglages"${setOpen?' open':''}><summary><span class="set-sum">${GEAR}<span><b>${$t('Paramètres')}</b><small>${$t('Apparence, langue, taille du texte, minuteurs, cuisine')}</small></span></span></summary><div class="set">
<h3 class="set-h">${$t('Affichage')}</h3>
<p class="set-l">${$t('Apparence')}</p>${segHTML('theme',PREF.theme,[['auto',$t('Automatique')],['light',$t('Clair')],['dark',$t('Sombre')]],$t('Apparence'))}
<p class="set-l">${$t('Langue de l\'appli')}</p>${segHTML('lang',LANG,[['fr','Français','fr'],['en','English','en']],$t('Langue de l\'appli'))}
<p class="set-l">${$t('Taille du texte')}</p>${segHTML('fs',PREF.fs,[['n',$t('Normale')],['l',$t('Grande')],['xl',$t('Très grande')]],$t('Taille du texte'))}
${swHTML('intro',PREF.intro,$t('Animation d\'ouverture'),$t('Le yin-yang qui se dessine au lancement de l\'appli'))}
<h3 class="set-h">${$t('Minuteurs')}</h3>
${swHTML('son',PREF.son,$t('Son'),$t('Une sonnerie à la fin de chaque côté, de chaque point et de chaque étape'))}
${swHTML('vib',PREF.vib,$t('Vibration'),$t('Le téléphone vibre avec la sonnerie et à l\'appui long'))}
${swHTML('ecran',PREF.ecran,$t('Garder l\'écran allumé'),$t('Tant qu\'un minuteur tourne'))}
${swHTML('auto',auto,$t('Enchaîner automatiquement'),$t('Lance le côté ou le point suivant 5 s après la sonnerie'))}
<h3 class="set-h">${$t('Cuisine')}</h3>
<p class="set-l">${$t('Appareil préféré')}</p>${segHTML('var',varPref,[['casserole',$t('Casserole')],['cuiseur',$t('Cuiseur à riz')],['cocotte',$t('Cocotte-minute')]],$t('Appareil préféré'))}
<p class="set-hint">${$t('Les recettes s\'ouvrent sur cet appareil quand elles le proposent.')}</p>
<p class="set-l">${$t('Portions par défaut')}</p>${segHTML('portions',PREF.portions,[[0,$t('Comme la recette')],[1,'1'],[2,'2'],[4,'4']],$t('Portions par défaut'),'minmax(0,2.4fr) repeat(3,minmax(0,1fr))')}
</div></details>`;
}
function setSetting(k,v,b){
  if(k==='lang'){
    if(v===LANG||b.disabled)return;
    const go=()=>{store('ys.langue',v);try{sessionStorage.setItem('ys.apres','reglages');}catch(e){}location.reload();};
    if(window.YS_DATA){go();return;}
    b.disabled=true;
    fetch(v==='en'?'data-en.json':'data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(go)
      .catch(()=>{b.disabled=false;toast('Il faut une connexion internet pour changer de langue.');});
    return;
  }
  if(k==='theme'||k==='fs'){setPref(k,v);applyLook();}
  else if(k==='var'){varPref=v;store('ys.variante',v);}
  else if(k==='portions'){setPref(k,+v||0);}
  b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
}
function renderInfos(){
  const nP=fiches.filter(e=>e.type==='protocole').length,nR=fiches.length-nP,nSup=masques.filter(m=>item(m.k,m.id)).length;
  let inst;
  if(standalone)inst=`<p>${$t('L\'appli est installée sur ce téléphone.')}</p>`;
  else if(installEvt)inst=`<p>${$t('Ajoute Carnet Yang Sheng à tes applis pour l\'ouvrir d\'un appui, même sans connexion.')}</p><button type="button" class="primary" data-install="1">${$t('Installer l\'appli')}</button>`;
  else if(/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))inst=`<p>${$t('Sur iPhone ou iPad, ouvre cette page dans Safari, touche le bouton Partager (le carré avec une flèche vers le haut), puis « Sur l\'écran d\'accueil ». L\'appli s\'ouvre ensuite d\'un appui, même sans connexion.')}</p>`;
  else inst=`<p>${$t('Dans Chrome, ouvre le menu ⋮ en haut à droite, puis choisis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».')}</p><p>${$t('Sur iPhone ou iPad : dans Safari, touche le bouton Partager (le carré avec une flèche vers le haut), puis « Sur l\'écran d\'accueil ».')}</p>`;
  const acc=(list,g)=>`<div class="accwrap" data-acc="${g}">`+list.map(([t,p],i)=>`<details class="cat" data-cat="${g}${i}"><summary><span>${esc($t(t))}</span></summary><p class="prose">${esc($t(p))}</p></details>`).join('')+'</div>';
  const acts=[
    nSup?`<button type="button" class="ghost" data-unhide="1">${$t(nSup>1?'Remettre les {n} fiches supprimées':'Remettre la fiche supprimée',{n:nSup})}</button>`:'',
    lgHist().length?`<button type="button" class="ghost" data-lghist="1">${$t('Mes examens de langue ({n})',{n:lgHist().length})}</button>`:'',
    symSel.size?`<button type="button" class="ghost" data-clear="sym">${$t('Effacer mes symptômes ({n})',{n:symSel.size})}</button>`:'',
    have.size?`<button type="button" class="ghost" data-clear="ing">${$t('Décocher mes ingrédients ({n})',{n:have.size})}</button>`:'',
    `<button type="button" class="ghost" data-prefreset="1">${$t('Rétablir les réglages par défaut')}</button>`].join('');
  view.innerHTML=`<header class="mast">${SEAL}<div><h1>Carnet Yang Sheng</h1><p class="lede">${$t('Version {v}',{v:esc(DATA.version||'')})}</p></div></header>
${FB?`<section class="card acc-card" id="acccard">${accCardInner()}</section>`:''}
${settingsHTML()}
<section class="card"><h2>${$t('À lire avant d\'utiliser')}</h2><p>${$t('Carnet Yang Sheng propose des routines de bien-être inspirées de la médecine traditionnelle chinoise : auto-massage de points, chaleur et recettes.')}</p><p>${$t('Ce n\'est ni un diagnostic ni un traitement. Si un symptôme dure, s\'aggrave ou t\'inquiète, consulte un médecin. En urgence, appelle le 15 ou le 112.')}</p><p><b>${$t('Rien ne remplace un vrai praticien.')}</b> ${$t('L\'appli ne vaut pas le bilan et le diagnostic d\'un praticien de médecine traditionnelle chinoise : en t\'examinant (langue, pouls, questions sur ton histoire et ton mode de vie), lui seul peut dire quels tableaux sont vraiment les tiens et adapter les soins à ta situation.')}</p></section>
<h2 class="sec">${$t('Bien masser')}</h2>${acc(GUIDE,'g')}
<h2 class="sec">${$t('Petit lexique')}</h2>${acc(LEXIQUE,'l')}
${SYMCATS.some(c=>c.guide)?`<h2 class="sec">${$t('Guides santé')}</h2><div class="guides">${SYMCATS.filter(c=>c.guide).map(c=>`<button type="button" class="guide-b" data-guide="${esc(c.id)}"><span><b>${esc(c.court||c.nom)}</b>${esc(c.guide)}</span><span aria-hidden="true">›</span></button>`).join('')}</div>`:''}
<section class="card"><h2>${$t('Astuces')}</h2><p>${$t('Reste appuyé sur une fiche ou un tableau pour l\'ajouter aux favoris ou à un carnet, ou pour le partager.')}</p><p>${$t('Dans le carnet : reste appuyé sur une fiche puis fais-la glisser pour changer sa place, ou vers le haut de l\'écran pour la déposer dans un autre carnet. Reste appuyé sur un onglet pour le déplacer, et touche « Sélectionner » pour cocher plusieurs fiches à la fois (tout cocher, favoris, ajouter, déplacer, supprimer).')}</p><p>${$t('« Partager » envoie un lien direct vers la fiche : pratique pour transmettre une recette ou un protocole.')}</p></section>
<section class="card"><h2>${$t('Installer sur ton téléphone')}</h2>${inst}</section>
<section class="card"><h2>${$t('Faire découvrir l\'appli')}</h2><p>${$t('Envoie le lien à tes proches : ils l\'ouvrent dans Chrome et l\'installent comme toi.')}</p><button type="button" class="primary" data-shareapp="1">${$t('Partager l\'appli')}</button></section>
<section class="card"><h2>${$t('Tes données')}</h2>${FB?`<p>${$t('Sans compte, rien ne quitte ce téléphone. Le compte est facultatif : si tu en crées un, ton e-mail, ton nom, ta photo, tes carnets, favoris, récents et ton classement sont gardés sur un serveur sécurisé (Google Firebase) pour les retrouver sur un autre appareil. Tu peux supprimer ton compte à tout moment depuis « Ton compte ».')}</p><p>${$t('Tes symptômes, tes ingrédients et tes réglages restent toujours sur ce téléphone.')}</p>`:`<p>${$t('L\'appli ne demande aucun compte et ne collecte aucune donnée personnelle. Tes symptômes, tes ingrédients, tes favoris et tes carnets restent sur ce téléphone.')}</p>`}<div class="data-acts">${acts}</div></section>
<section class="card"><h2>${$t('Contenu')}</h2><dl class="kv"><dt>${$t('Symptômes')}</dt><dd>${Object.keys(SYM).length}</dd><dt>${$t('Tableaux')}</dt><dd>${tableaux.length}</dd><dt>${$t('Points')}</dt><dd>${Object.keys(PTS).length}</dd><dt>${$t('Recettes')}</dt><dd>${nR}</dd><dt>${$t('Protocoles')}</dt><dd>${nP}</dd></dl></section>
<p class="fine">${$t('Polices Atkinson Hyperlegible et Noto Serif SC, sous licence SIL Open Font License.')}</p>`;
  view.querySelectorAll('.accwrap').forEach(w=>accordion(w,()=>{}));
  const r=$('#reglages');
  if(r)r.addEventListener('toggle',()=>{
    setOpen=r.open;
    if(r.open)window.scrollTo({top:Math.max(0,window.scrollY+r.getBoundingClientRect().top-12),behavior:reduce?'auto':'smooth'});
  });
}

/* ---------- Fiche ---------- */
function barHTML(k,id,label){
  const favd=isFav(k,id);
  return `<div class="bar"><button class="back" id="back" type="button"><span aria-hidden="true">‹</span>${$t('Retour')}</button><span class="bar-r"><span class="kind">${esc(label)}</span><button type="button" class="star" data-fav="${k}:${esc(id)}" aria-pressed="${favd}" aria-label="${$t(favd?'Retirer des favoris':'Ajouter aux favoris')}">${favd?'★':'☆'}</button><button type="button" class="more" data-menu="${k}:${esc(id)}" aria-label="${$t('Plus d\'options')}"><span aria-hidden="true">⋯</span></button></span></div>`;
}
function prinHTML(e){
  const p=e.principe;if(!p)return'';
  return `<div class="prin">${p.zh?`<span class="pz" lang="zh-Hans">${esc(p.zh)}</span>`:''}<span class="pp">${p.py?`<b>${esc(p.py)}</b>`:''}${p.fr?`<span>${esc(p.fr)}</span>`:''}</span></div>`;
}
function timerBtn(key){return `<button class="timer" type="button" data-tk="${esc(key)}"><span class="lab"><span class="s"></span><span class="h"></span></span><span class="time"></span></button>`;}
function tkey(e,suffix){return e.kind+':'+e.id+'|'+suffix;}
function protoHTML(e){
  const cons=e.consigne||$t('Une séance par jour. Commence par disperser, puis tonifie. Sur les points doubles, le minuteur se relance pour le côté opposé.');
  let h=`<div class="sum"><p>${e._items.length} ${esc($t(e.unite||'points'))}, ${$t('environ {n} minutes.',{n:minutes(e)})} ${esc(cons)}</p>
<button type="button" class="switch" data-auto="1" aria-pressed="${auto}"><span class="sw" aria-hidden="true"></span><span><b>${$t('Enchaîner automatiquement')}</b><small>${$t('Lance le côté ou le point suivant 5 s après la sonnerie')}</small></span></button>
<div class="hrow"><span class="count" data-count="${esc(e.kind+':'+e.id)}"></span><button class="ghost" type="button" data-reset="${esc(e.kind+':'+e.id)}">${$t('Réinitialiser')}</button></div></div>`;
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
<div class="meta"><span class="num">${idx+1}</span>${showAb?`<span class="ab">${esc(pn(it.ab))}</span>`:''}</div>
${it.zh?`<div class="pt-zh" lang="zh-Hans" aria-hidden="true">${esc(it.zh)}</div>`:''}
<h4 class="pt-py">${esc(it.nom||it.py)}</h4>${it.nom&&it.py?`<p class="pt-py2">${esc(it.py)}</p>`:''}
${it.loc?`<p class="loc"><span class="k">${$t('Où')}</span>${esc(it.loc)}</p>`:''}
${figKeys(it).length?`<button type="button" class="voir" data-fig="${esc(figKeys(it).join('|'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>${$t('Voir l\'image pour l\'emplacement du point')}</button>`:''}
${e._multi&&it._for?`<p class="pour">${$t('Pour :')} ${esc(it._for.map(t=>t.nom).join(' + '))}</p>`:''}${it.act?`<p class="act"><span class="k">${$t('Effet')}</span>${esc(it.act)}</p>`:''}
${it.dos?`<p class="flag soft">${$t('Dans le dos : avec une balle contre un mur, ou par un proche.')}</p>`:''}
${it.grossesse?`<p class="flag">${$t('À éviter pendant la grossesse.')}</p>`:''}
<p class="tech"><span class="ic" aria-hidden="true">${esc(tech[0])}</span><span>${esc(tech[1])}</span></p>
${timerBtn(key)}
<div class="foot"><div class="dots">${it.b?`<span class="dot">${$t('Gauche')}</span><span class="dot">${$t('Droite')}</span>`:`<span class="dot">${$t('Centre')}</span>`}</div><button class="redo" type="button" data-redo="${esc(key)}">${$t('Recommencer')}</button></div>
</article>`;
      ensureT(key,{eid:e.id,ekind:e.kind,kind:'pt',total:Math.max(5,+it.s||60),b:!!it.b,labels,title:(showAb?pn(it.ab)+' · ':'')+(it.nom||it.py||'')});
    });
  });
  if(e.note)h+=`<p class="note">${esc(e.note)}</p>`;
  if(arr(e.produits).length)h+=`<h3 class="sec">${$t('Produits')}</h3><ul class="prod">`+e.produits.map(p=>`<li><b>${esc(p.nom)}</b><span>${esc(p.texte)}</span></li>`).join('')+'</ul>';
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
  if(u==='g'||u==='ml'||u==='cl'){v=v>=100?Math.round(v/5)*5:Math.max(1,Math.round(v));return{txt:v.toLocaleString(LOC)+' '+UNIT[u],v};}
  if(u==='kg'||u==='l'){v=Math.round(v*100)/100;return{txt:v.toLocaleString(LOC)+' '+UNIT[u],v};}
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
function startPortions(e){return PREF.portions>0?+PREF.portions:Math.max(1,+e.portions||1);}
function currentVar(e){
  if(!e._var.length)return null;
  const want=recVar[e.id]||varPref;
  return e._var.find(v=>v.id===want)||e._var[0];
}
function recipeHTML(e){
  const base=Math.max(1,+e.portions||1),n=portions[e.id]||startPortions(e),f=n/base;
  const v=currentVar(e);const done=ingDone[e.id]||new Set();
  let h='';
  if(e.precautions)h+=`<div class="alert soft" role="note"><h2>${$t('Précaution')}</h2><p>${esc(e.precautions)}</p></div>`;
  if(e.duree)h+=`<p class="device">${$t('Durée :')} ${esc(e.duree)}</p>`;
  if(e._var.length>1)h+=`<div class="seg varseg" role="group" aria-label="${$t('Mode de cuisson')}" style="grid-template-columns:repeat(${e._var.length},minmax(0,1fr))">${e._var.map(x=>`<button type="button" data-var="${esc(e.id)}:${esc(x.id)}" aria-pressed="${x===v}">${esc(x.nom)}</button>`).join('')}</div>`;
  else if(v&&v.nom)h+=`<p class="device">${esc(v.nom)}</p>`;
  h+=`<div class="serv"><span class="serv-l">${$t('Portions')}</span><div class="stepper"><button type="button" data-serv="-1" aria-label="${$t('Une portion de moins')}"${n<=1?' disabled':''}>−</button><output aria-live="polite">${n}</output><button type="button" data-serv="1" aria-label="${$t('Une portion de plus')}"${n>=12?' disabled':''}>+</button></div></div>`;
  h+=`<h2 class="sec">${$t('Ingrédients')}</h2><p class="hint">${$t('Touche un ingrédient pour le cocher pendant que tu cuisines.')}</p><ul class="ing">`+arr(e.ingredients).map(i=>`<li><button type="button" class="ingrow" data-ingdone="${esc(e.id)}:${esc(i.id)}" aria-pressed="${done.has(i.id)}"><span class="q">${esc(qty(i,f).txt)}</span><span class="nm">${esc(i.nom)}${i.cle&&have.has(i.cle)?`<span class="have">✓ ${$t('tu en as')}</span>`:''}${i.note?`<small>${esc(i.note)}</small>`:''}</span></button></li>`).join('')+'</ul>';
  if(v){
    h+=`<h2 class="sec">${$t('Étapes')}</h2><ol class="steps">`;
    arr(v.etapes).forEach((s,i)=>{
      const key=tkey(e,v.id+'|s'+i),has=+s.s>0;
      h+=`<li class="step" data-card="${esc(key)}"><span class="snum" aria-hidden="true">${i+1}</span><div><h3>${esc(s.titre)}</h3><p>${fill(s.texte,e.ingredients,f)}</p>${has?timerBtn(key)+`<div class="foot"><button class="redo" type="button" data-plus="${esc(key)}">${$t('Ajouter 5 min')}</button><button class="redo" type="button" data-redo="${esc(key)}">${$t('Recommencer')}</button></div>`:''}</div></li>`;
      if(has)ensureT(key,{eid:e.id,ekind:'f',kind:'step',total:+s.s,b:false,labels:SIDE,title:s.titre||$t('Étape {n}',{n:i+1})});
    });
    h+='</ol>';
  }
  if(arr(e.notes).length)h+=`<h2 class="sec">${$t('Notes')}</h2><ul class="bullets">`+e.notes.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
  return h;
}
function renderFicheDetail(e){
  const tabs=e._tab.map(tableau).filter(Boolean);
  view.innerHTML=`<div class="fiche ${e.type}">${barHTML('f',e.id,TYPES[e.type])}
<header class="dhead"><p class="eyebrow">${esc(e.type==='recette'?([(GENRES.find(g=>g.id===e.genre)||{}).nom,(AXES.find(a=>a.id===e.axe)||{}).nom].filter(Boolean).join(' · ')||TYPES.recette):longDate(e._d))}</p><h1 class="dtitle">${esc(e.titre)}</h1>${e.zh?`<p class="sub"><span lang="zh-Hans">${esc(e.zh)}</span>${e.py?` · ${esc(e.py)}`:''}</p>`:''}${e.contexte?`<p class="ctx">${esc(e.contexte)}</p>`:''}
${tabs.length?`<div class="for"><span class="for-l">${$t('Conseillé pour')}</span>${tabs.map(t=>`<button type="button" class="tag" data-opent="${esc(t.id)}">${esc(t.nom)}</button>`).join('')}</div>`:''}
${e._sym.length?`<div class="for">${e._sym.map(s=>`<span class="tag static">${esc(symName(s))}</span>`).join('')}</div>`:''}${prinHTML(e)}</header>
${rappelHTML()}${e.type==='protocole'?protoHTML(e):recipeHTML(e)}</div>`;
  afterDetail(e);
}
function afterDetail(e){
  T.forEach((t,k)=>{if(t.eid===e.id&&t.ekind===e.kind)updT(k);});
  counts(e.kind+':'+e.id);
}

/* ---------- Rendu et navigation ---------- */
function render(){
  bilanShown=null;
  document.querySelectorAll('.tab').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(!DATA){
    view.innerHTML=loadError?`<p class="msg">${$t('Le contenu n\'a pas pu se charger. Vérifie ta connexion et rouvre l\'appli.')}</p>`:`<p class="msg" style="border:0">${$t('Ouverture du carnet…')}</p>`;
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
    let s=t.kind==='pt'?(t.b?t.labels[t.side]:$t('Point central')):$t('Minuteur'),h;
    if(t.done){s=$t('Terminé');h=$t(t.kind==='pt'?(t.b?'Les deux côtés sont faits':'Point fait'):'Étape terminée');}
    else if(pendingNext&&pendingNext.key===key)h=$t('Démarre dans {n} s, touche pour lancer tout de suite',{n:pendingNext.n});
    else if(t.run)h=$t('En cours, touche pour mettre en pause');
    else if(t.rem<t.total)h=$t('En pause, touche pour reprendre');
    else h=$t((t.b&&t.side===1)?'Touche pour lancer la symétrie':'Touche pour lancer');
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
  el.textContent=$t('{d} / {n} faits',{d,n});
}
function audio(){try{if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){}}
function beep(n,f){if(!ac||!PREF.son)return;try{for(let k=0;k<n;k++){const t=ac.currentTime+k*.42,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.35,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.36);}}catch(e){}}
function buzz(p){if(!PREF.vib)return;try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}
async function lock(){if(!PREF.ecran)return;try{if('wakeLock' in navigator&&!wl){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null;});}}catch(e){}}
function unlock(force){try{if(wl&&(force||(!act&&!pendingNext))){wl.release();wl=null;}}catch(e){}}
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
    if(nk&&((route&&route.id===t.eid&&route.kind===t.ekind)||onBilanShown(t))){const el=q('data-tk',nk);if(el)el.closest('[data-card]').scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});}
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
  if(!t||(route&&route.id===t.eid&&route.kind===t.ekind)||onBilanShown(t)){bar.hidden=true;return;}
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
  const targets=[['favoris','★ '+$t('Favoris')],...carnets.map(c=>[c.id,c.nom])].filter(([cid])=>cid!==L.cid);
  d.querySelector('.dock-in').innerHTML=targets.map(([cid,n])=>`<span class="dock-b${inColl(cid,k,id)?' has':''}" data-drop="${esc(cid)}">${esc(n)}</span>`).join('')+`<span class="dock-b new" data-drop="__new">+ ${$t('Nouveau carnet')}</span>`;
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
  lp={el,chip,x:ev.clientX,y:ev.clientY,pid:ev.pointerId,armed:false,drag:false,tx:0,ty:0,max:0,over:null,nodrag:!chip&&(tab!=='carnet'||!!route)};
  lp.t=setTimeout(()=>{if(!lp)return;lp.armed=true;buzz(15);el.classList.add('lifted');},450);
});
window.addEventListener('pointermove',ev=>{
  if(!lp||ev.pointerId!==lp.pid)return;
  const x=ev.clientX,y=ev.clientY,dist=Math.hypot(x-lp.x,y-lp.y);
  if(!lp.armed){if(dist>10){clearTimeout(lp.t);lp=null;}return;}
  lp.max=Math.max(lp.max,dist);
  if(lp.nodrag)return;
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
  if(had&&!move){toast($t('Déjà dans « {c} »',{c:collName(target)}));return;}
  const rec=move?removeFrom(src,k,id):null;
  if(!had)addTo(target,k,id);
  refresh();
  toast($t(move?'Déplacé vers « {c} »':'Ajouté à « {c} »',{c:collName(target)}),()=>{if(!had)removeFrom(target,k,id);if(rec)restoreAt(src,rec);refresh();});
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
    if(d.opent){const id=d.opent;closeSheet(false,()=>openItem('t',id));return;}
    if(d.lgex){lgExamSheet(d.lgex);return;}
    if(d.open){const id=d.open;closeSheet(false,()=>openItem('f',id));return;}
    if(d.ing){have.has(d.ing)?have.delete(d.ing):have.add(d.ing);saveSet('ys.cuisine',have);b.setAttribute('aria-pressed',String(have.has(d.ing)));toast(have.has(d.ing)?'Ajouté à ta cuisine':'Retiré de ta cuisine');return;}
    if(d.gsym){toggleSym(d.gsym,null);const on=symSel.has(d.gsym);b.setAttribute('aria-pressed',String(on));b.textContent=gsymLabel(d.gsym);toast($t(on?'Ajouté : {s}':'Retiré : {s}',{s:symName(d.gsym)}));return;}
    if(d.pwtoggle){const i=b.parentNode.querySelector('input'),show=i.type==='password';i.type=show?'text':'password';b.textContent=$t(show?'Masquer':'Afficher');b.setAttribute('aria-label',$t(show?'Masquer le mot de passe':'Afficher le mot de passe'));return;}
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
  if(d.mode){if(route){route=null;try{history.replaceState(null,'','#'+tab);}catch(e){}}if(tab!=='symptomes'){tab='symptomes';store('ys.onglet',tab);}symMode=d.mode;showAll=false;render();window.scrollTo(0,0);return;}
  if(d.lg){lgPick(d.lg);return;}
  if(d.lggo){LGX.fait=Date.now();lgApply();lgSaveExam();lgSave();symMode='bilan';render();window.scrollTo(0,0);return;}
  if(d.lgskip){symMode='bilan';render();window.scrollTo(0,0);return;}
  if(d.lgcam){lgTarget=d.lgcam==='dessous'?'dessous':'dessus';const i=$('#lg-cam');if(i)i.click();return;}
  if(d.lgfile){lgTarget=d.lgfile==='dessous'?'dessous':'dessus';const i=$('#lg-file');if(i)i.click();return;}
  if(d.lgex){lgExamSheet(d.lgex);return;}
  if(d.lghist){lgHistSheet();return;}
  if(d.lgph){lgPhotoSheet(d.lgph);return;}
  if(d.more){showAll=true;rerenderKeep('[data-more]');return;}
  if(d.f){filter=d.f;store('ys.filtre',filter);renderTimeline();return;}
  if(d.tri){if(toutTri!==d.tri){toutTri=d.tri;persist();renderTimeline();toast(toutTri==='perso'?'Classement dans ton ordre':'Classement par date');}return;}
  if(d.collSel){if(selMode&&d.collSel!==carnetSel)endSel();carnetSel=d.collSel;query='';persist();render();return;}
  if(d.newcarnet){newCarnetSheet();return;}
  if(d.cmenu){collMenu(d.cmenu);return;}
  if(d.set){const i=d.set.indexOf(':');setSetting(d.set.slice(0,i),d.set.slice(i+1),b);return;}
  if(d.pref){const k=d.pref,on=!PREF[k];setPref(k,on);b.setAttribute('aria-pressed',String(on));
    if(k==='son'&&on){audio();beep(1,660);}if(k==='vib'&&on)buzz(40);
    if(k==='ecran'){if(on&&(act||pendingNext))lock();else if(!on)unlock(true);}
    return;}
  if(d.prefreset){Object.keys(PREF).forEach(k=>{delete PREF[k];});Object.assign(PREF,DEFPREF);store('ys.reglages',J(PREF));applyLook();
    auto=false;store('ys.auto','0');cancelPending();varPref='cuiseur';store('ys.variante',varPref);
    rerenderKeep('[data-prefreset]');toast('Réglages par défaut rétablis');return;}
  if(d.unhide){const old=masques;masques=[];persist();refresh();toast('Fiches remises dans le carnet',()=>{masques=old;persist();refresh();});return;}
  if(d.menu){const i=d.menu.indexOf(':');itemMenu(d.menu.slice(0,i),d.menu.slice(i+1),null);return;}
  if(d.cmode){if(cuisMode!==d.cmode){cuisMode=d.cmode;store('ys.cuisine-mode',cuisMode);render();}return;}
  if(d.ctri){if(cuisTri!==d.ctri){cuisTri=d.ctri;store('ys.cuisine-tri',cuisTri);rerenderKeep('.segt');}return;}
  if(d.anat){alimNat=d.anat;renderAlimList();return;}
  if(d.alim){alimSheet(d.alim);return;}
  if(d.jump){const s=$('#grp-'+cssq(d.jump));if(s)s.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});return;}
  if(d.acsym){pickSuggestion(d.acsym);return;}
  if(d.tk){toggle(d.tk);return;}
  if(d.redo){redo(d.redo);return;}
  if(d.plus){plus(d.plus);return;}
  if(d.reset){resetEntry(d.reset);return;}
  if(d.auto){auto=!auto;store('ys.auto',auto?'1':'0');document.querySelectorAll('[data-auto]').forEach(x=>x.setAttribute('aria-pressed',String(auto)));if(!auto)cancelPending();toast(auto?'Enchaînement automatique activé':'Enchaînement automatique désactivé');return;}
  if(d.fav){const i=d.fav.indexOf(':'),k=d.fav.slice(0,i),id=d.fav.slice(i+1);const on=!isFav(k,id);on?addTo('favoris',k,id):removeFrom('favoris',k,id);b.setAttribute('aria-pressed',String(on));b.textContent=on?'★':'☆';b.setAttribute('aria-label',$t(on?'Retirer des favoris':'Ajouter aux favoris'));toast(on?'Ajouté aux favoris':'Retiré des favoris');return;}
  if(d.var){const i=d.var.indexOf(':');const id=d.var.slice(0,i),v=d.var.slice(i+1);recVar[id]=v;varPref=v;store('ys.variante',v);rerenderKeep(`[data-var="${cssq(d.var)}"]`);return;}
  if(d.ingdone){const i=d.ingdone.indexOf(':'),rid=d.ingdone.slice(0,i),iid=d.ingdone.slice(i+1);const s=ingDone[rid]||(ingDone[rid]=new Set());s.has(iid)?s.delete(iid):s.add(iid);b.setAttribute('aria-pressed',String(s.has(iid)));return;}
  if(d.sym){toggleSym(d.sym,b);return;}
  if(d.ing){toggleIng(d.ing,b);return;}
  if(d.clear==='ing'){have.clear();saveSet('ys.cuisine',have);refresh();return;}
  if(d.clear==='sym'){const old=[...symSel];symSel.clear();saveSet('ys.symptomes',symSel);symMode='choisir';LGX.fait=0;lgSave();refresh();toast('Symptômes effacés',()=>{old.forEach(s=>symSel.add(s));saveSet('ys.symptomes',symSel);refresh();});return;}
  if(d.fig){figSheet(d.fig);return;}
  if(d.guide){guideSheet(d.guide);return;}
  if(d.shareapp){shareApp();return;}
  if(d.install&&installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;if(tab==='infos'&&!route)renderInfos();});return;}
  if(d.serv&&route&&route.kind==='f'){
    const e=fiche(route.id);if(!e)return;
    portions[e.id]=Math.min(12,Math.max(1,(portions[e.id]||startPortions(e))+(+d.serv)));
    rerenderKeep(`[data-serv="${d.serv}"]`);
    const s=q('data-serv',d.serv);if(s&&!s.disabled)s.focus({preventScroll:true});
    return;
  }
  if(b.id==='mini-open'&&act){
    const t=T.get(act);if(!t)return;const key=act;
    if(t.ekind==='b'){symMode='bilan';goTab('symptomes');}else openItem(t.ekind,t.eid);
    const el=q('data-tk',key);if(el)el.closest('[data-card]').scrollIntoView({block:'center'});
  }
},true);
document.addEventListener('submit',ev=>{
  const a=ev.target.closest('.acc-form');if(a){ev.preventDefault();accSubmit(a);return;}
  const f=ev.target.closest('.sheet-new');if(!f)return;ev.preventDefault();onSheetSubmit(f);
});
document.addEventListener('change',ev=>{
  if(ev.target&&ev.target.id==='acc-photo'){handlePhoto(ev.target.files&&ev.target.files[0]);ev.target.value='';}
  if(ev.target&&(ev.target.id==='lg-cam'||ev.target.id==='lg-file')){lgPhoto(ev.target.files&&ev.target.files[0],lgTarget);ev.target.value='';}
});
window.addEventListener('online',()=>{if(user)syncNow();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user&&Date.now()-(+store('ys.sync.at')||0)>20000)syncNow();});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&sheetOpen)closeSheet();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;if(tab==='infos'&&!route&&DATA)renderInfos();});

/* ---------- Démarrage ---------- */
lastSnap=J(dataOnly());
(function initRoute(){
  const p=parseHash();
  if(p.route)route=p.route;
  else{let t='symptomes';try{if(sessionStorage.getItem('ys.apres')==='reglages')t='infos';}catch(e){}tab=t;try{history.replaceState(null,'','#'+t);}catch(e){}}
})();
const INTRO_HTML=$('#intro')?$('#intro').outerHTML:'';
function playIntro(){
  if(!PREF.intro){const i=$('#intro');if(i)i.remove();return;}
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
  if(DATA){symMode='choisir';goTab('symptomes');}
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
  if(EN&&DATA.ui&&typeof DATA.ui==='object')Object.assign(UI,DATA.ui);
  PTS=DATA.points&&typeof DATA.points==='object'?DATA.points:{};
  FIGS=DATA.figures&&typeof DATA.figures==='object'?DATA.figures:{};
  SYM={};arr(DATA.symptomes).forEach(s=>{if(s&&s.id)SYM[s.id]=s;});
  SYMCATS=arr(DATA.categories_symptomes);
  ORGS=arr(DATA.organes);ORG={};ORGS.forEach(o=>{ORG[o.id]=o;});
  AXES=arr(DATA.axes);GENRES=arr(DATA.genres);
  NATS={};arr(DATA.natures).forEach(n=>{if(n&&n.id)NATS[n.id]=n;});SAVS={};arr(DATA.saveurs).forEach(n=>{if(n&&n.id)SAVS[n.id]=n;});ORGC={};arr(DATA.organes_courts).forEach(n=>{if(n&&n.id)ORGC[n.id]=n;});
  INGCATS=arr(DATA.categories_ingredients);
  INGC={};arr(DATA.ingredients).forEach(i=>{if(i&&i.id)INGC[i.id]=i;});
  fiches=arr(DATA.fiches).map(normFiche).filter(Boolean)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(+a.ordre||0)-(+b.ordre||0)||String(a.titre).localeCompare(String(b.titre),LANG));
  tableaux=arr(DATA.tableaux).map(normTableau).filter(Boolean);
  SYMFREQ={};tableaux.forEach(t=>{t._cle.forEach(x=>{SYMFREQ[x]=(SYMFREQ[x]||0)+2;});t._autres.forEach(x=>{SYMFREQ[x]=(SYMFREQ[x]||0)+1;});t._lies.forEach(x=>{SYMFREQ[x]=(SYMFREQ[x]||0)+1;});});
  tableaux.forEach(t=>arr(t.recettes).forEach(id=>{const e=fiche(id);if(e&&!e._tab.includes(t.id))e._tab.push(t.id);}));
  [...symSel].forEach(s=>{if(!SYM[s])symSel.delete(s);});
  [...have].forEach(s=>{if(!INGC[s])have.delete(s);});
  if(route&&!item(route.kind,route.id))route=null;
  if(FB&&(store('ys.sync.uid')||store('ys.compte.attente')))loadCompte().catch(()=>{});
  const prevV=store('ys.version'),curV=String(DATA.version||'');
  if(curV){store('ys.version',curV);if(prevV&&prevV!==curV)setTimeout(()=>toast($t('Appli mise à jour : version {v}',{v:curV})),$('#intro')?3900:300);}
  if(route)pushRecent(route.kind,route.id);
  render();
  try{if(sessionStorage.getItem('ys.apres')==='reglages'){sessionStorage.removeItem('ys.apres');setOpen=true;const r=!route&&tab==='infos'&&$('#reglages');if(r){r.open=true;const go=()=>window.scrollTo(0,Math.max(0,window.scrollY+r.getBoundingClientRect().top-12));setTimeout(go,150);setTimeout(go,500);}}}catch(e){}
}).catch(()=>{loadError=true;render();});

if('serviceWorker' in navigator&&!window.YS_DATA&&location.protocol==='https:'){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}
})();

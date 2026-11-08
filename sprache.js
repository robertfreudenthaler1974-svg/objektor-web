/* Sprachen der Webseite (08.11.2026) - Flaggen oben rechts: Deutsch, English, Italiano, Čeština, Magyar, Srpski (08.11.2026: + hu, sr).
   Die Seite selbst bleibt deutsch. Ist eine andere Sprache gewaehlt, laedt dieses Skript sprache-<kk>.js
   und tauscht die Texte aus: genau gleicher Text -> Woerterbuch, Texte mit Zahlen -> Regeln,
   Texte mit " · " -> Stueck fuer Stueck. Was nicht im Woerterbuch steht, bleibt deutsch.
   Texte, die die Seite spaeter selbst schreibt (Vorfuehrungen), werden laufend mit uebersetzt.
   Die Wahl merkt sich der Browser (objektor-sprache); ?lang=en usw. geht auch.
   Neuer oder geaenderter deutscher Text -> in sprache-en.js / -it.js / -cs.js nachtragen. */
(function(){
var D=document,H=D.documentElement,MERK='objektor-sprache';
var SPR=[
 {k:'de',n:'Deutsch',f:'<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#C8102E"/><rect y=".667" width="3" height=".667" fill="#fff"/></svg>'},
 {k:'en',n:'English',f:'<svg viewBox="0 0 60 30"><rect width="60" height="30" fill="#012169"/><path d="M0 0L60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" stroke-width="2.4"/><path d="M30 0V30M0 15H60" stroke="#fff" stroke-width="10"/><path d="M30 0V30M0 15H60" stroke="#C8102E" stroke-width="6"/></svg>'},
 {k:'it',n:'Italiano',f:'<svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#CE2B37"/></svg>'},
 {k:'cs',n:'Čeština',f:'<svg viewBox="0 0 6 4"><rect width="6" height="4" fill="#D7141A"/><rect width="6" height="2" fill="#fff"/><path d="M0 0L3 2L0 4z" fill="#11457E"/></svg>'},
 {k:'hu',n:'Magyar',f:'<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#477050"/><rect width="3" height="1.333" fill="#fff"/><rect width="3" height=".667" fill="#CE2939"/></svg>'},
 {k:'sr',n:'Srpski',f:'<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#fff"/><rect width="3" height="1.333" fill="#0C4076"/><rect width="3" height=".667" fill="#C6363C"/></svg>'}];
var KEYS=SPR.map(function(s){return s.k});
var basis=(function(){var s=D.currentScript&&D.currentScript.src||'';return s.replace(/sprache\.js(\?.*)?$/,'')})();
function gewuenscht(){var k=null;try{var m=/[?&]lang=([a-z]{2})/.exec(location.search);if(m)k=m[1]}catch(e){}
 if(!k){try{k=localStorage.getItem(MERK)}catch(e){}}
 if(!k){var n=(navigator.languages&&navigator.languages[0]||navigator.language||'de').slice(0,2).toLowerCase();k=n}
 return KEYS.indexOf(k)>=0?k:'de'}
var benutzt=false,akt='de',W=null,R=[],ORIG=new WeakMap(),beob=null,laden={};
var ATTR=['aria-label','alt','title','placeholder'];
/* bis die Sprache da ist, Seite kurz verdecken (hoechstens 1,5 s) */
var start=gewuenscht();
if(start!=='de'){H.classList.add('spr-warte');setTimeout(function(){H.classList.remove('spr-warte')},1500)}
var st=D.createElement('style');st.textContent='html.spr-warte body{opacity:0}'+
'.sprachwahl{display:flex;gap:4px;align-items:center}'+
'.sprachwahl button{all:unset;box-sizing:border-box;cursor:pointer;width:30px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid transparent;opacity:.55;transition:opacity .15s,border-color .15s}'+
'.sprachwahl button:hover,.sprachwahl button:focus-visible{opacity:1;border-color:var(--rand2,#C3CCC9)}'+
'.sprachwahl button[aria-pressed="true"]{opacity:1;border-color:var(--marke,#0F5757)}'+
'.sprachwahl svg{width:22px;height:15px;display:block;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.15)}'+
'.spr-akt{display:none!important}.spr-alle{display:flex;gap:4px;align-items:center}.spr-alle .spr-n{display:none}'+
'.sprachwahl .spr-akt i{font-style:normal;font-size:10px;margin-left:3px;opacity:.7}'+
'@media(max-width:1599px){.sprachwahl{position:relative}.spr-akt{display:inline-flex!important;width:auto!important;padding:0 6px;opacity:1!important;border-color:var(--rand2,#C3CCC9)!important}'+
'.spr-alle{display:none;position:absolute;right:0;top:calc(100% + 6px);z-index:300;flex-direction:column;align-items:stretch;gap:2px;background:var(--karte,#fff);border:1px solid var(--rand,#D9DFDD);border-radius:10px;padding:5px;box-shadow:0 12px 28px rgba(0,0,0,.18)}'+
'.sprachwahl.offen .spr-alle{display:flex}.spr-alle button{width:auto!important;height:auto!important;justify-content:flex-start!important;gap:9px;padding:7px 10px!important;opacity:1!important;font:500 14px/1 inherit;font-family:inherit;color:var(--text,#14211F);white-space:nowrap}'+
'.spr-alle button:hover{background:var(--bg2,#EEF2F0)}.spr-alle .spr-n{display:inline}}'+
'@media(max-width:420px){header .kopf{gap:9px}}';
(D.head||H).appendChild(st);

function norm(t){return t.replace(/\s+/g,' ').trim()}
function wort(t){var v=W&&W[t];return v==null?null:v}
function liste(t){return t.split(/(, | · )/).map(function(p,i){if(i%2)return p;var v=uebers(p);return v==null?p:v}).join('')}
function uebers(t){if(!W||!t)return null;var v=wort(t);if(v!=null)return v;
 for(var i=0;i<R.length;i++){var m=R[i][0].exec(t);if(m){return R[i][1].replace(/\{L(\d)\}|\{(\d)\}|\$(\d)/g,function(a,l,b,c){
  if(l)return liste(m[+l]||'');if(b){var x=m[+b]||'';var y=uebers(x);return y==null?x:y}return m[+c]||''})}}
 if(t.indexOf(' · ')>0){var teile=t.split(' · '),neu=0;teile=teile.map(function(p){var y=uebers(p);if(y!=null){neu++;return y}return p});if(neu)return teile.join(' · ')}
 return null}
function text(s){if(akt==='de')return s;var m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s);var k=norm(m[2]);if(!k)return s;var v=uebers(k);return v==null?s:m[1]+v+m[3]}

function weg(el){for(var e=el;e&&e!==D;e=e.parentNode){if(e.nodeType!==1)continue;var t=e.tagName;
 if(t==='SCRIPT'||t==='STYLE'||t==='NOSCRIPT'||t==='TEXTAREA'||t==='CODE')return true;
 if(e.classList&&(e.classList.contains('sprachwahl')||e.classList.contains('buchst')||e.classList.contains('sprachen')))return true;
 if(e.hasAttribute&&e.hasAttribute('data-nicht-uebersetzen'))return true}return false}
function knoten(n){var o=ORIG.get(n),cur=n.nodeValue;if(!o||cur!==o.aus){o={de:cur};ORIG.set(n,o)}
 var ziel=text(o.de);o.aus=ziel;if(ziel!==cur)n.nodeValue=ziel}
function attrs(el){if(el.tagName==='OPTION'&&!el.hasAttribute('value'))el.setAttribute('value',el.textContent);
 var o=ORIG.get(el);for(var i=0;i<ATTR.length;i++){var a=ATTR[i];if(!el.hasAttribute(a))continue;var cur=el.getAttribute(a);
  if(!o){o={};ORIG.set(el,o)}var r=o[a];if(!r||cur!==r.aus){r=o[a]={de:cur}}var ziel=text(r.de);r.aus=ziel;if(ziel!==cur)el.setAttribute(a,ziel)}}
function gehe(root){if(root.nodeType===3){if(!weg(root.parentNode))knoten(root);return}
 if(root.nodeType!==1)return;if(root.tagName==='TEXTAREA'&&!weg(root.parentNode)){attrs(root);return}if(weg(root))return;attrs(root);
 var w=D.createTreeWalker(root,5,{acceptNode:function(n){if(n.nodeType===1){var t=n.tagName;
  if(t==='TEXTAREA'){attrs(n);return 2}if(t==='SCRIPT'||t==='STYLE'||t==='NOSCRIPT'||(n.classList&&(n.classList.contains('sprachwahl')||n.classList.contains('buchst')||n.classList.contains('sprachen')))||n.hasAttribute('data-nicht-uebersetzen'))return 2;return 1}return 1}});
 var n,ts=[],es=[];while(n=w.nextNode()){if(n.nodeType===3)ts.push(n);else es.push(n)}
 ts.forEach(knoten);es.forEach(attrs)}
/* Ueberschrift mit Buchstaben aus der Wand: neu aufbauen und noch einmal einfliegen lassen */
function ueberschrift(){D.querySelectorAll('.buchst').forEach(function(h){var o=ORIG.get(h);if(!o){o={de:h.getAttribute('aria-label')||h.textContent};ORIG.set(h,o)}
 var t=text(o.de);if(h.getAttribute('data-spr')===akt)return;h.setAttribute('data-spr',akt);h.setAttribute('aria-label',t);h.classList.remove('los');h.textContent='';var bs=[];
 t.split(' ').forEach(function(w,i){if(i)h.appendChild(D.createTextNode(' '));var ws=D.createElement('span');ws.className='wort';ws.setAttribute('aria-hidden','true');
  Array.prototype.forEach.call(w,function(c){var b=D.createElement('span');b.className='bu';b.textContent=c;ws.appendChild(b);bs.push(b)});h.appendChild(ws)});
 var wand=h.getBoundingClientRect().right;bs.forEach(function(b,i){var r=b.getBoundingClientRect();b.style.setProperty('--weg',Math.ceil(wand-r.left+2)+'px');b.style.animationDelay=(0.1+i*0.045).toFixed(3)+'s'});
 void h.offsetWidth;h.classList.add('los')})}
function titel(){var o=ORIG.get(D);if(!o||D.title!==o.aus){o={de:D.title};ORIG.set(D,o)}o.aus=text(o.de);D.title=o.aus}
function beobachten(an){if(!beob)beob=new MutationObserver(function(ms){beob.disconnect();
  ms.forEach(function(m){if(m.type==='childList')m.addedNodes.forEach(gehe);else if(m.type==='characterData'){if(!weg(m.target.parentNode))knoten(m.target)}else if(m.type==='attributes'&&!weg(m.target))attrs(m.target)});
  titel();beob.observe(D.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTR})});
 beob.disconnect();if(an)beob.observe(D.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTR})}
function anwenden(){var d=akt==='de'?null:window.objektorSprache&&window.objektorSprache[akt];W=d?d.t:null;
 R=d?d.r.map(function(x){return[new RegExp(x[0]),x[1]]}):[];
 if(akt!=='de'&&!d)return;
 if(akt==='de'&&!benutzt){knoepfe();H.classList.remove('spr-warte');return}benutzt=true;
 beobachten(false);H.setAttribute('lang',akt);gehe(D.body);titel();ueberschrift();knoepfe();beobachten(akt!=='de');H.classList.remove('spr-warte')}
function holen(k,fertig){if(k==='de'||(window.objektorSprache&&window.objektorSprache[k]))return fertig();
 if(laden[k]){laden[k].push(fertig);return}laden[k]=[fertig];var s=D.createElement('script');s.src=basis+'sprache-'+k+'.js';
 s.onload=function(){laden[k].forEach(function(f){f()});delete laden[k]};s.onerror=function(){delete laden[k];H.classList.remove('spr-warte')};(D.head||H).appendChild(s)}
function waehlen(k){try{localStorage.setItem(MERK,k)}catch(e){}akt=k;knoepfe();holen(k,anwenden)}
function knoepfe(){D.querySelectorAll('.spr-alle button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.k===akt?'true':'false')});var a=SPR.filter(function(x){return x.k===akt})[0]||SPR[0];D.querySelectorAll('.spr-akt').forEach(function(t){t.innerHTML=a.f+'<i>▾</i>';t.title=a.n})}
function leiste(){var kopf=D.querySelector('header .kopf');if(!kopf||kopf.querySelector('.sprachwahl'))return;
 var w=D.createElement('div');w.className='sprachwahl';w.setAttribute('role','group');w.setAttribute('aria-label','Sprache · Language');
 var t=D.createElement('button');t.type='button';t.className='spr-akt';t.setAttribute('aria-haspopup','true');t.setAttribute('aria-label','Sprache · Language');w.appendChild(t);
 var alle=D.createElement('div');alle.className='spr-alle';w.appendChild(alle);
 t.addEventListener('click',function(e){e.stopPropagation();w.classList.toggle('offen')});
 D.addEventListener('click',function(e){if(!w.contains(e.target))w.classList.remove('offen')});
 D.addEventListener('keydown',function(e){if(e.key==='Escape')w.classList.remove('offen')});
 SPR.forEach(function(s){var b=D.createElement('button');b.type='button';b.dataset.k=s.k;b.title=s.n;b.setAttribute('aria-label',s.n);b.setAttribute('lang',s.k);b.innerHTML=s.f+'<span class="spr-n">'+s.n+'</span>';
  b.addEventListener('click',function(){w.classList.remove('offen');if(akt!==s.k)waehlen(s.k)});alle.appendChild(b)});
 var vor=kopf.querySelector('.modus-knopf');kopf.insertBefore(w,vor||null)}
akt=start;holen(start,function(){if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',anwenden);else anwenden()});
function los(){leiste();knoepfe()}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',los);else los();
})();

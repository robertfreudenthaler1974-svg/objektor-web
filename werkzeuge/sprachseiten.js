#!/usr/bin/env node
/* Objektor · Sprachseiten bauen (09.11.2026)
   Warum: Google findet nur Seiten mit eigener Adresse. Die Sprachumschaltung per JavaScript
   hat keine eigene Adresse, deshalb baut dieses Skript aus index.html + sprache-<kk>.js eine
   fertige Seite <kk>/index.html (z. B. https://objektor.at/en/) und schreibt sitemap.xml neu.
   Es traegt ausserdem in index.html die hreflang-Verweise ein (de / en / x-default).
   Laeuft automatisch auf GitHub (.github/workflows/sprachseiten.yml), sobald index.html
   oder ein Woerterbuch geaendert online geht. Von Hand: node werkzeuge/sprachseiten.js
   Was im Woerterbuch fehlt, bleibt deutsch -> wird unten als "fehlt" aufgelistet.
   Neue Sprache mit eigener Adresse: unten in SPRACHEN eintragen (Kopftexte uebersetzen). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const WURZEL = path.resolve(__dirname, '..');
const DOMAIN = 'https://objektor.at/';

/* Sprachen mit eigener Adresse. "zusatz": Texte, die nur im Kopf / in den Google-Daten stehen
   (Titel, Beschreibung, JSON-LD) und deshalb nicht im Woerterbuch der Seite sind. */
const SPRACHEN = [
  { k: 'en', locale: 'en_GB', zusatz: {
    'BDS – Facility-Management-Software & IP-Symcon App | Objektor':
      'BDS – Facility Management Software & IP-Symcon App | Objektor',
    'BDS von Objektor: Facility-Management-Software mit Tickets am Plan, Wartung, Kameras und Energie – plus IP-Symcon App für Zuhause. Vor Ort oder Cloud.':
      'BDS by Objektor: facility management software with tickets on the floor plan, maintenance, cameras and energy – plus an IP-Symcon app for your home. On-premises or cloud.',
    'Objektor — BDS, die Software für Ihr Gebäude':
      'Objektor — BDS, the software for your building',
    'Eine App für Gebäude: für Firmen Tickets, Pläne, Wartung, Kameras und Energie — für Zuhause Licht, Alarmanlage, Kameras und Push über IP-Symcon. Vor Ort oder in der Cloud.':
      'One app for buildings: for companies tickets, floor plans, maintenance, cameras and energy — for homes lighting, alarm system, cameras and push notifications via IP-Symcon. On-premises or in the cloud.',
    'BDS — Software für Gebäude: Dokumentation, Meldungen, Pläne, Alarme und Gebäudetechnik über IP-Symcon, für Firmen und Zuhause.':
      'BDS — software for buildings: documentation, reports, floor plans, alarms and building services via IP-Symcon, for companies and homes.',
    'Facility-Management-Software (CAFM)': 'Facility management software (CAFM)',
    'Web-Browser, Smartphone, Tablet': 'Web browser, smartphone, tablet',
    'Software für Gebäude: Tickets am Gebäudeplan, Wartung und Prüfnachweise, Wachdienst, Reinigung, Kameras, Parken und Energie – für Zuhause Licht, Alarmanlage, Kameras und Push über IP-Symcon. Vor Ort oder in der Cloud (Rechenzentrum in Deutschland).':
      'Software for buildings: tickets on the building plan, maintenance and inspection records, security patrols, cleaning, cameras, parking and energy – for homes lighting, alarm system, cameras and push notifications via IP-Symcon. On-premises or in the cloud (data centre in Germany).'
  } }
];

const lies = f => fs.readFileSync(path.join(WURZEL, f), 'utf8');
const schreib = (f, s) => { const p = path.join(WURZEL, f); fs.mkdirSync(path.dirname(p), { recursive: true });
  const alt = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; if (alt === s) return false; fs.writeFileSync(p, s); return true; };

/* ---------- Woerterbuch laden (gleiche Logik wie sprache.js) ---------- */
function woerterbuch(k, zusatz) {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(lies('sprache-' + k + '.js'), ctx, { filename: 'sprache-' + k + '.js' });
  const d = ctx.window.objektorSprache[k];
  const W = Object.assign(Object.create(null), d.t, zusatz || {});
  const R = d.r.map(x => [new RegExp(x[0]), x[1]]);
  function liste(t) { return t.split(/(, | · )/).map((p, i) => { if (i % 2) return p; const v = uebers(p); return v == null ? p : v; }).join(''); }
  function uebers(t) {
    if (!t) return null; const v = W[t]; if (v != null) return v;
    for (const [re, z] of R) { const m = re.exec(t); if (m) return z.replace(/\{L(\d)\}|\{(\d)\}|\$(\d)/g, (a, l, b, c) => {
      if (l) return liste(m[+l] || ''); if (b) { const x = m[+b] || ''; const y = uebers(x); return y == null ? x : y; } return m[+c] || ''; }); }
    if (t.indexOf(' · ') > 0) { let neu = 0; const teile = t.split(' · ').map(p => { const y = uebers(p); if (y != null) { neu++; return y; } return p; }); if (neu) return teile.join(' · '); }
    return null;
  }
  return uebers;
}

/* ---------- HTML-Hilfen ---------- */
const NAMEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '­', ndash: '–', mdash: '—', hellip: '…', middot: '·', euro: '€', copy: '©', reg: '®', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', deg: '°', times: '×', rarr: '→', larr: '←', bull: '•' };
const dekod = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (a, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (NAMEN[e] != null ? NAMEN[e] : a));
const kodText = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
const kodAttr = (s, q) => kodText(s).replace(q === "'" ? /'/g : /"/g, q === "'" ? '&#39;' : '&quot;');
const norm = t => t.replace(/\s+/g, ' ').trim();

const LEER = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const AUTOZU = { li: ['li'], p: ['p'], option: ['option'], tr: ['tr', 'td', 'th'], td: ['td', 'th'], th: ['td', 'th'], dt: ['dt', 'dd'], dd: ['dt', 'dd'] };
const UEB_ATTR = new Set(['aria-label', 'alt', 'title', 'placeholder']);
const META_UEB = new Set(['description', 'og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description']);
const URL_ATTR = new Set(['src', 'href', 'srcset', 'poster', 'action']);
const TOK = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<(script|style|textarea|title)\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/\1\s*>|<\/?([a-zA-Z][^\s\/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
const ATTR = /(\s)([^\s"'=<>\/]+)(?:(\s*=\s*)("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const relativ = v => v && !/^([a-z][a-z0-9+.-]*:|\/|#|\?|\{|\$)/i.test(v.trim());

function attrWert(attrs, name) { ATTR.lastIndex = 0; let m; while ((m = ATTR.exec(attrs))) if (m[2].toLowerCase() === name) return dekod(m[5] ?? m[6] ?? m[7] ?? ''); return null; }

/* ---------- eine Sprachseite bauen ---------- */
function baue(html, sp, praefix) {
  const uebers = woerterbuch(sp.k, sp.zusatz);
  const stat = { ok: 0, fehlt: new Map() };
  function txt(s, wo) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s); const k = norm(m[2]); if (!k) return s;
    if (!/[A-Za-zÄÖÜäöüß]/.test(k)) return s;            /* nur Zahlen/Zeichen */
    const v = uebers(k); if (v == null) { stat.fehlt.set(k, wo); return s; } stat.ok++; return m[1] + v + m[3];
  }
  function attrs(tag, a, skip) {
    const metaName = tag === 'meta' ? (attrWert(a, 'name') || attrWert(a, 'property') || '').toLowerCase() : '';
    return a.replace(ATTR, (all, sp0, name, eq, roh, d, s, u) => {
      if (eq == null) return all; const n = name.toLowerCase(); const q = d != null ? '"' : s != null ? "'" : '"';
      let v = dekod(d ?? s ?? u ?? ''), neu = v;
      if (!skip && (UEB_ATTR.has(n) || (n === 'content' && META_UEB.has(metaName)))) neu = txt(v, '[' + n + ']');
      if (URL_ATTR.has(n) && relativ(v)) neu = n === 'srcset' ? v.split(',').map(x => relativ(x.trim()) ? x.replace(/^(\s*)/, '$1' + praefix) : x).join(',') : praefix + v;
      if (n === 'style') neu = css(v);
      if (neu === v) return all;
      return sp0 + name + eq + q + kodAttr(neu, q) + q;
    });
  }
  const css = s => s.replace(/url\(\s*(['"]?)(?![a-z][a-z0-9+.-]*:|\/|#|['"]?\s*\))/gi, (a, q) => 'url(' + q + praefix);
  const js = s => s.replace(/(['"`])(?=bilder\/|(?:impressum|datenschutz|danke|404)\.html)/g, '$1' + praefix);

  const stapel = []; let aus = '', pos = 0, m;
  const skipJetzt = () => stapel.length ? stapel[stapel.length - 1].skip : false;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(html))) {
    if (m.index > pos) aus += skipJetzt() ? html.slice(pos, m.index) : (t => { const d = dekod(t); const n = txt(d, 'Text'); return n === d ? t : kodText(n); })(html.slice(pos, m.index));
    pos = TOK.lastIndex; const g = m[0];
    if (g.startsWith('<!')) { aus += g; continue; }
    if (m[1]) {                                             /* script / style / textarea / title */
      const tag = m[1].toLowerCase(), a = m[2], inhalt = m[3]; let neu = inhalt;
      if (tag === 'script') {
        const typ = (attrWert(a, 'type') || '').toLowerCase();
        if (typ === 'application/ld+json') neu = jsonld(inhalt, uebers, stat);
        else neu = js(inhalt);
      } else if (tag === 'style') neu = css(inhalt);
      else if (tag === 'title' && !skipJetzt()) { const d = dekod(inhalt); const n = txt(d, '<title>'); neu = n === d ? inhalt : kodText(n); }
      aus += '<' + g.slice(1, 1 + m[1].length) + attrs(tag, a, skipJetzt()) + '>' + neu + g.slice(g.length - (m[1].length + 3 + (g.match(/\s*>$/)[0].length - 1)));
      continue;
    }
    const tag = m[4].toLowerCase(), a = m[5] || '';
    if (g[1] === '/') { const i = stapel.map(x => x.tag).lastIndexOf(tag); if (i >= 0) stapel.length = i; aus += g; continue; }
    const zu = AUTOZU[tag]; if (zu) while (stapel.length && zu.includes(stapel[stapel.length - 1].tag)) stapel.pop();
    const kl = ' ' + (attrWert(a, 'class') || '') + ' ';
    const skip = skipJetzt() || /\s(sprachwahl|buchst|sprachen)\s/.test(kl) || attrWert(a, 'data-nicht-uebersetzen') != null || tag === 'code' || tag === 'noscript';
    let neuTag = '<' + m[4] + attrs(tag, a, skip) + '>';
    if (tag === 'html') neuTag = neuTag.replace(/\slang=("|')[^"']*\1/i, ' lang="' + sp.k + '"');
    aus += neuTag;
    if (!LEER.has(tag) && !/\/\s*$/.test(a)) stapel.push({ tag, skip });
  }
  aus += html.slice(pos);
  return { html: aus, stat };
}

function jsonld(s, uebers, stat) {
  let o; try { o = JSON.parse(s); } catch (e) { return s; }
  const FEST = new Set(['@context', '@type', 'url', 'logo', 'email', 'image', 'streetAddress', 'postalCode', 'addressLocality', 'addressCountry', 'alternateName']);
  (function geh(x) {
    if (Array.isArray(x)) return x.forEach(geh);
    if (x && typeof x === 'object') for (const key of Object.keys(x)) {
      const v = x[key];
      if (typeof v === 'string' && !FEST.has(key) && /\s/.test(v)) { const u = uebers(norm(v)); if (u != null) { x[key] = u; stat.ok++; } else stat.fehlt.set(norm(v), 'JSON-LD ' + key); }
      else geh(v);
    }
  })(o);
  return JSON.stringify(o);
}

/* ---------- Kopf: canonical, hreflang, og ---------- */
function alternates(alle) {
  return alle.map(k => '<link rel="alternate" hreflang="' + k + '" href="' + DOMAIN + (k === 'de' ? '' : k + '/') + '">').join('\n')
    + '\n<link rel="alternate" hreflang="x-default" href="' + DOMAIN + '">';
}
function kopf(html, k, alle, locale) {
  const url = DOMAIN + (k === 'de' ? '' : k + '/');
  html = html.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\r?\n?/g, '');
  html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + url + '">\n' + alternates(alle));
  html = html.replace(/(<meta property="og:url" content=")[^"]*(">)/, '$1' + url + '$2');
  if (locale) html = html.replace(/(<meta property="og:locale" content=")[^"]*(">)/, '$1' + locale + '$2');
  return html;
}

/* ---------- los ---------- */
const alle = ['de'].concat(SPRACHEN.map(s => s.k));
const geaendert = [];
let de = lies('index.html');
const deNeu = kopf(de, 'de', alle, null);
if (deNeu !== de) { schreib('index.html', deNeu); geaendert.push('index.html'); de = deNeu; }

for (const sp of SPRACHEN) {
  const { html, stat } = baue(de, sp, '../');
  let seite = kopf(html, sp.k, alle, sp.locale);
  seite = seite.replace(/<head>/i, '<head>\n<!-- AUTOMATISCH GEBAUT aus index.html + sprache-' + sp.k + '.js (werkzeuge/sprachseiten.js). Nicht von Hand aendern - Aenderungen gehen beim naechsten Bauen verloren. -->');
  if (schreib(sp.k + '/index.html', seite)) geaendert.push(sp.k + '/index.html');
  console.log('[' + sp.k + '] uebersetzt: ' + stat.ok + ' · fehlt im Woerterbuch: ' + stat.fehlt.size);
  [...stat.fehlt].slice(0, 60).forEach(([t, wo]) => console.log('   fehlt (' + wo + '): ' + (t.length > 110 ? t.slice(0, 107) + '…' : t)));
}

const heute = new Date().toISOString().slice(0, 10);
const altSm = fs.existsSync(path.join(WURZEL, 'sitemap.xml')) ? lies('sitemap.xml') : '';
const smOhneDatum = s => s.replace(/<lastmod>[^<]*<\/lastmod>/g, '');
let sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
for (const k of alle) {
  sm += '  <url>\n    <loc>' + DOMAIN + (k === 'de' ? '' : k + '/') + '</loc>\n    <lastmod>' + heute + '</lastmod>\n';
  for (const a of alle) sm += '    <xhtml:link rel="alternate" hreflang="' + a + '" href="' + DOMAIN + (a === 'de' ? '' : a + '/') + '"/>\n';
  sm += '    <xhtml:link rel="alternate" hreflang="x-default" href="' + DOMAIN + '"/>\n  </url>\n';
}
sm += '</urlset>\n';
if (geaendert.length || smOhneDatum(altSm) !== smOhneDatum(sm)) { if (schreib('sitemap.xml', sm)) geaendert.push('sitemap.xml'); }
console.log(geaendert.length ? 'geschrieben: ' + geaendert.join(', ') : 'alles schon aktuell');

#!/usr/bin/env node
/**
 * QA op de build-output (dist/). Draai na `npm run build`.
 * Controleert: één H1, heading-hiërarchie, title/description/canonical/robots, OG,
 * JSON-LD-validiteit, interne links, assets, alt-attributen, sitemap ⇄ noindex,
 * dubbele titles/descriptions, drafts, placeholders.
 * Exitcode 1 bij fouten.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'node-html-parser';

const DIST = process.argv[2] || 'dist';
const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

const urlToFile = (u) => {
  const clean = u.split('#')[0].split('?')[0];
  if (!clean.startsWith('/')) return null;
  const candidates = clean.endsWith('/') ? [join(DIST, clean, 'index.html')] : [join(DIST, clean), join(DIST, clean, 'index.html')];
  return candidates.find((c) => existsSync(c)) ?? null;
};
const fileToPath = (f) => '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');

const pages = new Map();

for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const root = parse(html);
  const rel = relative(DIST, f);
  const is404 = rel === '404.html';

  const h1s = root.querySelectorAll('h1');
  if (h1s.length !== 1) err(rel, `${h1s.length} H1-elementen (verwacht 1)`);
  h1s.forEach((h) => { if (!h.text.trim()) err(rel, 'lege H1'); });

  // heading-hiërarchie: geen sprongen omlaag (h2 → h4)
  let prev = 1;
  for (const h of root.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')) {
    const lvl = Number(h.tagName[1]);
    if (lvl > prev + 1) err(rel, `heading-sprong h${prev} → h${lvl} ("${h.text.trim().slice(0, 40)}")`);
    prev = lvl;
  }

  const title = root.querySelector('title')?.text.trim();
  const desc = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
  if (!title) err(rel, 'geen <title>');
  if (!desc) (is404 ? warn : err)(rel, 'geen meta description');
  if (!canonical) err(rel, 'geen canonical');
  if (!root.querySelector('meta[property="og:title"]')) err(rel, 'geen og:title');
  if (!root.querySelector('html')?.getAttribute('lang')) err(rel, 'geen lang-attribuut');
  if (!is404 && canonical && !canonical.endsWith(fileToPath(f)) && !robots.includes('noindex')) warn(rel, `canonical wijst naar andere URL: ${canonical}`);
  if (is404 && !robots.includes('noindex')) err(rel, '404 moet noindex zijn');

  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const j = JSON.parse(s.text);
      if (j['@context'] !== 'https://schema.org') err(rel, 'JSON-LD zonder schema.org-context');
      for (const n of j['@graph'] ?? [j]) if (!n['@type']) err(rel, 'JSON-LD-node zonder @type');
    } catch (e) { err(rel, `ongeldige JSON-LD: ${e.message}`); }
  }
  // inline uitvoerbare scripts (CSP script-src 'self')
  for (const s of root.querySelectorAll('script')) {
    const type = s.getAttribute('type');
    if (!s.getAttribute('src') && type !== 'application/ld+json') err(rel, 'inline <script> botst met Content-Security-Policy');
  }

  for (const img of root.querySelectorAll('img')) {
    if (img.getAttribute('alt') === undefined) err(rel, `img zonder alt: ${img.getAttribute('src')}`);
    if (!img.getAttribute('width') || !img.getAttribute('height')) warn(rel, `img zonder width/height: ${img.getAttribute('src')}`);
  }

  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (!a.text.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')) err(rel, `link zonder toegankelijke naam: ${href}`);
    if (href.startsWith('/') && !href.startsWith('//')) {
      if (!urlToFile(href)) err(rel, `dode interne link: ${href}`);
      if (!href.split('#')[0].endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(href.split('#')[0])) warn(rel, `interne link zonder trailing slash: ${href}`);
    }
    if (/^(javascript|data):/i.test(href)) err(rel, `onveilige link: ${href}`);
  }
  for (const el of root.querySelectorAll('link[href], script[src]')) {
    const u = el.getAttribute('href') ?? el.getAttribute('src');
    if (u.startsWith('/') && !u.startsWith('//') && !['sitemap'].includes(el.getAttribute('rel')) && !existsSync(join(DIST, u.split('?')[0]))) err(rel, `ontbrekend asset: ${u}`);
  }

  const text = root.querySelector('main')?.text ?? '';
  if (/lorem ipsum|TODO|PLACEHOLDER/i.test(text)) err(rel, 'placeholdertekst gevonden');
  if (/drafts\.|DRAFT mag nooit/i.test(html)) err(rel, 'draft-content in output');

  pages.set(fileToPath(f), { rel, title, desc, robots, canonical, is404 });
}

// Sitemap ⇄ pagina's
const smFile = join(DIST, 'sitemap.xml');
const sitemapPaths = new Set();
if (!existsSync(smFile)) err('sitemap.xml', 'ontbreekt');
else {
  const xml = readFileSync(smFile, 'utf8');
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const p = new URL(m[1]).pathname;
    sitemapPaths.add(p);
    const page = pages.get(p);
    if (!page) err('sitemap.xml', `URL zonder pagina: ${p}`);
    else if (page.robots.includes('noindex')) err('sitemap.xml', `noindex-pagina in sitemap: ${p}`);
  }
}
for (const [p, page] of pages) {
  if (page.is404) continue;
  if (!page.robots.includes('noindex') && !sitemapPaths.has(p)) err(page.rel, 'indexeerbare pagina ontbreekt in sitemap');
}
const robotsTxt = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
if (!robotsTxt) err('robots.txt', 'ontbreekt');

// Dubbele titles/descriptions tussen indexeerbare pagina's
const idx = [...pages.values()].filter((p) => !p.is404 && !p.robots.includes('noindex'));
for (const key of ['title', 'desc']) {
  const seen = new Map();
  for (const p of idx) {
    if (!p[key]) continue;
    if (seen.has(p[key])) err(p.rel, `dubbele ${key} met ${seen.get(p[key])}`);
    else seen.set(p[key], p.rel);
  }
}

// Tekstoverlap tussen fasepagina's onderling en met pijlerhubs (audit 28-10-2026: tot 91%).
// 5-woord-shingles van <main> zonder nav/aside; overlap = gedeeld / kleinste set.
// > 50% = waarschuwing. > 75% = fout zodra QA_LIFESTAGE_OVERLAP_STRICT=1 (aanzetten nadat de fase-content live is).
{
  const shingles = (f) => {
    const main = parse(readFileSync(f, 'utf8')).querySelector('main');
    if (!main) return new Set();
    main.querySelectorAll('nav, aside').forEach((n) => n.remove());
    const w = main.textContent.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    const s = new Set();
    for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(' '));
    return s;
  };
  const kindOf = (f) => {
    const root = parse(readFileSync(f, 'utf8'));
    if (!root.querySelector('.hero--hub')) return null;
    return root.querySelector('#fasen-titel') ? 'fase' : 'hub';
  };
  const cand = [...pages.values()].filter((p) => !p.is404 && !p.robots.includes('noindex'))
    .map((p) => ({ ...p, kind: kindOf(join(DIST, p.rel)) })).filter((p) => p.kind);
  const sets = new Map(cand.map((p) => [p.rel, shingles(join(DIST, p.rel))]));
  const strict = process.env.QA_LIFESTAGE_OVERLAP_STRICT === '1';
  for (let i = 0; i < cand.length; i++) {
    for (let j = i + 1; j < cand.length; j++) {
      const a = cand[i], b = cand[j];
      if (a.kind !== 'fase' && b.kind !== 'fase') continue;
      const A = sets.get(a.rel), B = sets.get(b.rel);
      if (!A.size || !B.size) continue;
      let shared = 0;
      for (const s of A) if (B.has(s)) shared++;
      const pct = Math.round((shared / Math.min(A.size, B.size)) * 100);
      const msg = `tekstoverlap ${pct}% met ${b.rel} (fasepagina's moeten eigen inhoud hebben)`;
      if (pct > 75 && strict) err(a.rel, msg);
      else if (pct > 50) warn(a.rel, msg);
    }
  }
}

console.log(`QA ${DIST}: ${htmlFiles.length} HTML-pagina's, ${sitemapPaths.size} URL's in sitemap, ${idx.length} indexeerbaar.`);
warnings.forEach((w) => console.log('  ⚠ ' + w));
errors.forEach((e) => console.log('  ✗ ' + e));
console.log(errors.length ? `\n${errors.length} fout(en).` : '\nGeen fouten.');
process.exit(errors.length ? 1 : 0);

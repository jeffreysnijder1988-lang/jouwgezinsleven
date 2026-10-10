#!/usr/bin/env node
/**
 * Legacy-migratie: bestaande statische site (uitgepakte ZIP) → Sanity NDJSON.
 *
 * Gebruik:
 *   node scripts/import-legacy-html.mjs ./legacy            # dry-run: inventaris + rapport
 *   node scripts/import-legacy-html.mjs ./legacy --write    # schrijft import-output/legacy-import.ndjson
 *   cd studio && npm run import:ndjson                       # importeert als DRAFTS (review in Studio, dan publiceren)
 *
 * Principes (DATA_INGESTION / EDITORIAL_RULES):
 *  - Niets verzinnen: alleen overnemen wat in de HTML staat (titel, tekst, headings, afbeeldingen, alt,
 *    meta title/description, datums uit JSON-LD of <time datetime>).
 *  - Alles wordt als draft geïmporteerd (bulkimport nooit direct published).
 *  - Iedere oude URL komt in import-output/url-inventory.csv met de nieuwe URL of status "NIET GEMAPT".
 *    Er worden GEEN redirects aangemaakt.
 *  - Interne links worden omgezet naar Sanity-references (internalLink) als het doel gemigreerd wordt.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, extname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { parse } from 'node-html-parser';

const [, , srcArg, ...flags] = process.argv;
if (!srcArg) {
  console.error('Gebruik: node scripts/import-legacy-html.mjs <map-met-uitgepakte-site> [--write] [--publish]');
  process.exit(1);
}
const SRC = resolve(srcArg);
const WRITE = flags.includes('--write');
const PUBLISH = flags.includes('--publish'); // alleen na expliciet akkoord
const OUT = resolve('import-output');

/** Pijlers zoals in Sanity (topic, kind = pillar). Slug → document-ID. */
const PILLARS = {
  zwanger: 'pillar-zwanger',
  'baby-peuter': 'pillar-baby-peuter',
  kinderopvang: 'pillar-kinderopvang',
  eropuit: 'pillar-eropuit',
  feestjes: 'pillar-feestjes',
  gezinsvakantie: 'pillar-vakantie',
};

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  if (n.startsWith('.') || n === 'node_modules') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

/** Bestandspad → publieke URL (zonder index.html, met trailing slash). */
function fileToUrl(file) {
  let rel = '/' + relative(SRC, file).replace(/\\/g, '/');
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -'index.html'.length);
  else if (rel.endsWith('.html')) rel = rel.slice(0, -'.html'.length) + '/';
  return rel;
}
const normUrl = (u) => {
  try {
    const url = new URL(u, 'https://jouwgezinsleven.nl');
    if (!/(^|\.)jouwgezinsleven\.nl$/.test(url.hostname)) return null;
    let p = url.pathname.replace(/index\.html$/, '').replace(/\.html$/, '/');
    if (!p.endsWith('/') && !extname(p)) p += '/';
    return p;
  } catch { return null; }
};

const key = () => randomBytes(6).toString('hex');
const idFor = (url) => 'legacy-' + createHash('sha1').update(url).digest('hex').slice(0, 16);

/* ---------- HTML → Portable Text ---------- */
function inlineToSpans(node, marks = [], markDefs, ctx) {
  const out = [];
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      const text = child.rawText.replace(/\s+/g, ' ');
      if (text) out.push({ _type: 'span', _key: key(), text: decode(text), marks: [...marks] });
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName.toLowerCase();
    if (tag === 'br') { out.push({ _type: 'span', _key: key(), text: '\n', marks: [...marks] }); continue; }
    if (tag === 'strong' || tag === 'b') { out.push(...inlineToSpans(child, [...marks, 'strong'], markDefs, ctx)); continue; }
    if (tag === 'em' || tag === 'i') { out.push(...inlineToSpans(child, [...marks, 'em'], markDefs, ctx)); continue; }
    if (tag === 'a') {
      const href = child.getAttribute('href') || '';
      const k = key();
      const internal = normUrl(href);
      if (internal && !/^(mailto|tel):/.test(href) && (href.startsWith('/') || /jouwgezinsleven\.nl/.test(href))) {
        markDefs.push({ _key: k, _type: 'internalLink', _legacyTarget: internal });
        ctx.internalLinks.push(internal);
      } else if (/^(https?:|mailto:|tel:)/.test(href)) {
        markDefs.push({ _key: k, _type: 'link', href });
      } else {
        out.push(...inlineToSpans(child, marks, markDefs, ctx));
        continue;
      }
      out.push(...inlineToSpans(child, [...marks, k], markDefs, ctx));
      continue;
    }
    out.push(...inlineToSpans(child, marks, markDefs, ctx));
  }
  return out;
}

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

function block(el, style, ctx, listItem) {
  const markDefs = [];
  const children = inlineToSpans(el, [], markDefs, ctx);
  // trim
  if (children.length) {
    children[0].text = children[0].text.replace(/^\s+/, '');
    children[children.length - 1].text = children[children.length - 1].text.replace(/\s+$/, '');
  }
  if (!children.some((c) => c.text.trim())) return null;
  const b = { _type: 'block', _key: key(), style, markDefs, children };
  if (listItem) { b.listItem = listItem; b.level = 1; }
  return b;
}

function imageBlock(img, file, ctx) {
  const src = img.getAttribute('src');
  if (!src || src.startsWith('data:')) return null;
  let asset;
  if (/^https?:/.test(src)) asset = `image@${src}`;
  else {
    const abs = src.startsWith('/') ? join(SRC, src) : resolve(dirname(file), src);
    if (!existsSync(abs)) { ctx.warnings.push(`afbeelding niet gevonden: ${src}`); return null; }
    asset = `image@file://${abs}`;
  }
  const alt = img.getAttribute('alt');
  if (alt === undefined || alt === null) ctx.warnings.push(`afbeelding zonder alt: ${src}`);
  return { _type: 'image', _key: key(), _sanityAsset: asset, alt: alt ?? '' };
}

function htmlToPortableText(container, file, ctx) {
  const blocks = [];
  const visit = (el) => {
    for (const child of el.childNodes) {
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (['script', 'style', 'nav', 'header', 'footer', 'form', 'noscript', 'svg', 'button'].includes(tag)) continue;
      if (tag === 'h1') continue; // H1 = documenttitel
      if (['h2', 'h3', 'h4'].includes(tag)) { const b = block(child, tag, ctx); if (b) blocks.push(b); continue; }
      if (['h5', 'h6'].includes(tag)) { const b = block(child, 'h4', ctx); if (b) blocks.push(b); continue; }
      if (tag === 'p') {
        const imgs = child.querySelectorAll('img');
        imgs.forEach((i) => { const b = imageBlock(i, file, ctx); if (b) blocks.push(b); });
        const b = block(child, 'normal', ctx); if (b) blocks.push(b); continue;
      }
      if (tag === 'blockquote') { const b = block(child, 'blockquote', ctx); if (b) blocks.push(b); continue; }
      if (tag === 'ul' || tag === 'ol') {
        for (const li of child.querySelectorAll(':scope > li')) { const b = block(li, 'normal', ctx, tag === 'ul' ? 'bullet' : 'number'); if (b) blocks.push(b); }
        continue;
      }
      if (tag === 'img') { const b = imageBlock(child, file, ctx); if (b) blocks.push(b); continue; }
      if (tag === 'figure') {
        const img = child.querySelector('img');
        const b = img && imageBlock(img, file, ctx);
        if (b) { const cap = child.querySelector('figcaption')?.text.trim(); if (cap) b.caption = cap; blocks.push(b); }
        continue;
      }
      if (tag === 'table') { ctx.warnings.push('tabel gevonden — handmatig controleren (niet automatisch omgezet)'); continue; }
      visit(child); // div/section/article/…: doorlopen
    }
  };
  visit(container);
  return blocks;
}

/* ---------- Pagina-analyse ---------- */
function analyse(file) {
  const html = readFileSync(file, 'utf8');
  const root = parse(html, { comment: false });
  const url = fileToUrl(file);
  const meta = (sel) => root.querySelector(sel)?.getAttribute('content')?.trim() || null;
  const ctx = { warnings: [], internalLinks: [] };

  let jsonld = [];
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try { const j = JSON.parse(s.text); jsonld.push(...(j['@graph'] ?? [j])); } catch { ctx.warnings.push('ongeldige JSON-LD'); }
  }
  const art = jsonld.find((n) => /Article|BlogPosting/.test(String(n['@type'])));
  const main = root.querySelector('main') || root.querySelector('article') || root.querySelector('body');
  const h1 = root.querySelector('h1')?.text.trim() || null;
  const firstP = main?.querySelector('p')?.text.trim() || null;

  const ogImage = meta('meta[property="og:image"]');
  const heroImg = main?.querySelector('img');

  return {
    file: relative(SRC, file), url,
    title: h1 || root.querySelector('title')?.text.trim() || null,
    seoTitle: root.querySelector('title')?.text.trim() || null,
    description: meta('meta[name="description"]'),
    canonical: root.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
    robots: meta('meta[name="robots"]') || '',
    ogImage,
    datePublished: art?.datePublished || root.querySelector('time[datetime]')?.getAttribute('datetime') || null,
    dateModified: art?.dateModified || null,
    author: typeof art?.author === 'object' && art.author?.['@type'] === 'Person' ? art.author.name : null,
    firstParagraph: firstP,
    heroImage: heroImg ? imageBlock(heroImg, file, ctx) : null,
    body: main ? htmlToPortableText(main, file, ctx) : [],
    ctx,
  };
}

function classify(p) {
  const parts = p.url.split('/').filter(Boolean);
  if (p.url === '/') return { type: 'homePage' };
  if (/^404\/?$/.test(parts.join('/'))) return { type: 'skip', reason: '404-pagina (template in Astro)' };
  if (parts.length === 1 && PILLARS[parts[0]]) return { type: 'pillar', pillar: parts[0] };
  if (parts.length === 2 && PILLARS[parts[0]]) return { type: 'article', pillar: parts[0], slug: parts[1] };
  if (parts.length === 1) return { type: 'page', slug: parts[0] };
  return { type: 'unmapped', reason: 'URL-structuur past niet op /pijler/slug/ of /pagina/' };
}

/* ---------- Main ---------- */
if (!existsSync(SRC)) { console.error(`Map niet gevonden: ${SRC}`); process.exit(1); }
const htmlFiles = walk(SRC).filter((f) => f.endsWith('.html'));
const analysed = htmlFiles.map(analyse).map((p) => ({ ...p, cls: classify(p) }));

// Sitemap uit de ZIP meenemen in de inventaris
const smPath = join(SRC, 'sitemap.xml');
const sitemapUrls = existsSync(smPath)
  ? [...readFileSync(smPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => normUrl(m[1])).filter(Boolean)
  : [];

const urlToId = new Map();
for (const p of analysed) {
  if (['article', 'page'].includes(p.cls.type)) urlToId.set(p.url, idFor(p.url));
  if (p.cls.type === 'pillar') urlToId.set(p.url, PILLARS[p.cls.pillar]);
}

const docs = [];
const inventory = [['oude_url', 'bronbestand', 'type', 'nieuwe_url', 'status', 'opmerkingen']];
const dp = PUBLISH ? '' : 'drafts.';
const now = new Date().toISOString();

const resolveLinks = (blocks, p) => blocks.map((b) => {
  if (!b.markDefs) return b;
  const markDefs = b.markDefs.map((m) => {
    if (m._type !== 'internalLink') return m;
    const target = urlToId.get(m._legacyTarget);
    if (!target) { p.ctx.warnings.push(`interne link naar niet-gemigreerde URL: ${m._legacyTarget}`); return { _key: m._key, _type: 'link', href: m._legacyTarget }; }
    return { _key: m._key, _type: 'internalLink', reference: { _type: 'reference', _ref: target, _weak: true } };
  });
  return { ...b, markDefs };
});

for (const p of analysed) {
  const noIndex = /noindex/i.test(p.robots);
  const seo = { _type: 'seo', title: p.seoTitle && p.seoTitle !== p.title ? p.seoTitle : undefined, description: p.description || undefined, noIndex: noIndex || undefined };
  // Eerste afbeelding wordt heroImage → niet nogmaals in de body.
  const heroAsset = p.heroImage?._sanityAsset;
  const bodyNoHero = heroAsset && p.cls.type === 'article' ? (() => { let done = false; return p.body.filter((b) => (done || b._type !== 'image' || b._sanityAsset !== heroAsset ? true : ((done = true), false))); })() : p.body;
  const body = resolveLinks(bodyNoHero, p);
  const notes = [...new Set(p.ctx.warnings)];
  let newUrl = '';
  let status = 'GEMAPT';

  switch (p.cls.type) {
    case 'article':
      newUrl = `/${p.cls.pillar}/${p.cls.slug}/`;
      docs.push({
        _id: dp + idFor(p.url), _type: 'article',
        title: p.title, slug: { _type: 'slug', current: p.cls.slug },
        excerpt: p.description || undefined,
        pillar: { _type: 'reference', _ref: PILLARS[p.cls.pillar], _weak: true },
        heroImage: p.heroImage ? { _type: 'image', _sanityAsset: p.heroImage._sanityAsset, alt: p.heroImage.alt } : undefined,
        body,
        publishedAt: p.datePublished || undefined,
        updatedAt: p.dateModified || undefined,
        seo, legacyUrl: p.url, origin: 'migrated', reviewStatus: 'needs_review',
      });
      if (p.author) notes.push(`auteur in bron: ${p.author} — handmatig koppelen aan een author-document`);
      break;
    case 'page':
      newUrl = `/${p.cls.slug}/`;
      docs.push({ _id: dp + idFor(p.url), _type: 'page', title: p.title, slug: { _type: 'slug', current: p.cls.slug }, intro: undefined, body, seo, legacyUrl: p.url });
      break;
    case 'pillar':
      newUrl = p.url;
      // Pijler bestaat al; alleen redactionele velden als patch-voorstel (niet overschrijven).
      docs.push({ _id: 'drafts.' + PILLARS[p.cls.pillar], _type: 'topic', _patchOnly: true, description: p.description || undefined, intro: body, seo });
      notes.push('pijlerintro als draft-voorstel; bestaande pijler niet overschreven');
      break;
    case 'homePage':
      newUrl = '/';
      docs.push({ _id: 'drafts.homePage', _type: 'homePage', heroTitle: p.title, heroIntro: p.firstParagraph || undefined, seo });
      notes.push('homepage: secties/kaarten handmatig controleren tegen origineel');
      break;
    default:
      status = p.cls.type === 'skip' ? 'OVERGESLAGEN' : 'NIET GEMAPT';
      notes.push(p.cls.reason);
  }
  if (noIndex) notes.push('bron had noindex');
  if (p.canonical && normUrl(p.canonical) && normUrl(p.canonical) !== p.url) notes.push(`bron-canonical wijst naar ${normUrl(p.canonical)}`);
  inventory.push([p.url, p.file, p.cls.type, newUrl, status, notes.join(' | ')]);
}
for (const u of sitemapUrls) {
  if (!analysed.some((p) => p.url === u)) inventory.push([u, '', 'sitemap-only', '', 'ONTBREEKT IN ZIP', 'staat in sitemap.xml maar geen HTML-bestand gevonden']);
}

const clean = (o) => JSON.parse(JSON.stringify(o));
const importDocs = docs.filter((d) => !d._patchOnly).map(clean);
const patchProposals = docs.filter((d) => d._patchOnly).map(({ _patchOnly, ...d }) => clean(d));

const counts = inventory.slice(1).reduce((a, r) => ((a[r[4]] = (a[r[4]] || 0) + 1), a), {});
console.log(`Bron: ${SRC}\nHTML-bestanden: ${htmlFiles.length} · sitemap-URL's: ${sitemapUrls.length}`);
console.log('Status:', counts);
console.log(`Te importeren documenten: ${importDocs.length} (${PUBLISH ? 'PUBLISHED' : 'drafts'}) · pijler-voorstellen: ${patchProposals.length}`);

mkdirSync(OUT, { recursive: true });
const csv = inventory.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
writeFileSync(join(OUT, 'url-inventory.csv'), csv + '\n');
console.log(`→ ${join(OUT, 'url-inventory.csv')}`);
if (WRITE) {
  writeFileSync(join(OUT, 'legacy-import.ndjson'), importDocs.map((d) => JSON.stringify(d)).join('\n') + '\n');
  writeFileSync(join(OUT, 'pillar-proposals.json'), JSON.stringify(patchProposals, null, 2));
  console.log(`→ ${join(OUT, 'legacy-import.ndjson')}\n→ ${join(OUT, 'pillar-proposals.json')}`);
} else {
  console.log('Dry-run: voeg --write toe om NDJSON te schrijven.');
}

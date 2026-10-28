#!/usr/bin/env node
/**
 * Controleert alle externe links op de live site (via sitemap.xml).
 * Wijzigt niets: schrijft alleen een rapport (markdown) naar stdout of naar $REPORT_FILE.
 *
 *  - Kapot = 404 of 410 bij twee pogingen (met een gewone browser-user-agent).
 *  - 401/403/429, timeouts en netwerkfouten = waarschuwing (vaak botblokkades), geen fout.
 *  - Exit 0 als er geen kapotte links zijn, exit 2 als er wel kapotte links zijn
 *    (de workflow gebruikt dat om een issue te openen).
 *
 * Env: SITE_URL (default https://jouwgezinsleven.nl), REPORT_FILE, CONCURRENCY (default 6)
 */
import { writeFileSync } from 'node:fs';

const SITE = (process.env.SITE_URL || 'https://jouwgezinsleven.nl').replace(/\/$/, '');
const HOST = new URL(SITE).host;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CONCURRENCY = Number(process.env.CONCURRENCY || 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, method = 'GET') {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'text/html,application/pdf,*/*' } });
    return { status: res.status, body: method === 'GET' && res.headers.get('content-type')?.includes('html') ? await res.text() : '' };
  } catch (e) {
    return { status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

const smRes = await fetch(`${SITE}/sitemap.xml`, { headers: { 'User-Agent': UA } });
const pages = [...(await smRes.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!pages.length) { console.error('Geen pagina\'s in sitemap gevonden'); process.exit(1); }

const links = new Map(); // url -> Set(pagina's)
await pool(pages, async (page) => {
  const { body } = await get(page);
  for (const m of (body || '').matchAll(/<a\s[^>]*href="(https?:\/\/[^"#]+)/g)) {
    const href = m[1].replace(/&amp;/g, '&');
    if (new URL(href).host === HOST) continue;
    if (!links.has(href)) links.set(href, new Set());
    links.get(href).add(new URL(page).pathname);
  }
});

const results = await pool([...links.keys()], async (url) => {
  let r = await get(url, 'HEAD');
  if ([0, 400, 403, 405, 429].includes(r.status)) r = await get(url, 'GET');
  if (r.status === 404 || r.status === 410) { await sleep(2000); r = await get(url, 'GET'); }
  return { url, ...r };
});

const broken = results.filter((r) => r.status === 404 || r.status === 410);
const warn = results.filter((r) => r.status === 0 || r.status === 401 || r.status === 403 || r.status === 429 || r.status >= 500);
const row = (r) => `| ${r.status || r.error} | ${r.url} | ${[...links.get(r.url)].join('<br>')} |`;

const report = [
  `# Externe links — ${new Date().toISOString().slice(0, 10)}`,
  '',
  `${pages.length} pagina's, ${links.size} unieke externe links. **${broken.length} kapot**, ${warn.length} waarschuwing(en).`,
  '',
  '## Kapot (404/410, twee keer gecontroleerd)',
  '',
  broken.length ? ['| Status | Link | Op pagina |', '|---|---|---|', ...broken.map(row)].join('\n') : 'Geen.',
  '',
  '## Waarschuwingen (botblokkade, timeout of serverfout — handmatig bekijken)',
  '',
  warn.length ? ['| Status | Link | Op pagina |', '|---|---|---|', ...warn.map(row)].join('\n') : 'Geen.',
  '',
  'Herstellen: vervang de bron in Sanity (veld `sources` en/of de link in de tekst) en controleer of de zin nog klopt met de nieuwe bron.',
].join('\n');

if (process.env.REPORT_FILE) writeFileSync(process.env.REPORT_FILE, report);
console.log(report);
process.exit(broken.length ? 2 : 0);

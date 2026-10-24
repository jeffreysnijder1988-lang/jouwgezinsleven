#!/usr/bin/env node
/**
 * IndexNow — meldt gewijzigde en verwijderde pagina's bij Bing, Yandex, Seznam e.a.
 * (Google doet niet mee; die blijft de sitemap volgen.)
 *
 * Gebruik (na een geslaagde productie-deploy):
 *   node scripts/indexnow.mjs <dist> <changed-list> [deleted-list]
 *
 *  - changed-list / deleted-list: bestandspaden relatief aan de document root, één per regel
 *    (zoals scripts/deploy.sh ze schrijft naar $INDEXNOW_DIR/changed en /deleted).
 *  - Gewijzigde pagina's worden alleen gemeld als ze in de sitemap staan (dus indexeerbaar zijn).
 *  - Verwijderde .html-pagina's worden altijd gemeld, zodat zoekmachines de 404 snel oppikken.
 *
 * De sleutel is per definitie publiek: hij staat als <key>.txt in de document root (public/).
 * Fouten breken de deploy nooit af; het script logt en stopt met exit 0.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [dist = 'dist', changedFile, deletedFile] = process.argv.slice(2);
const SITE = (process.env.DEPLOY_SITE_URL || process.env.PUBLIC_SITE_URL || 'https://jouwgezinsleven.nl').replace(/\/$/, '');
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const MAX = 10000; // limiet per request volgens de IndexNow-specificatie

const log = (m) => console.log(`[indexnow] ${m}`);
const done = (m) => { log(m); process.exit(0); };

const key = readdirSync(dist).map((f) => f.match(/^([a-f0-9]{32})\.txt$/)?.[1]).find(Boolean);
if (!key) done('geen sleutelbestand (<32 hex>.txt) in de build — overgeslagen');
if (readFileSync(join(dist, `${key}.txt`), 'utf8').trim() !== key) done('sleutelbestand bevat niet de sleutel — overgeslagen');

const lines = (f) => (f && existsSync(f) ? readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean) : []);
const toUrl = (p) => {
  if (!/(^|\/)index\.html$/.test(p)) return null; // alleen echte pagina's (mappen met index.html)
  return `${SITE}/${p.replace(/index\.html$/, '')}`;
};

const sitemap = existsSync(join(dist, 'sitemap.xml')) ? readFileSync(join(dist, 'sitemap.xml'), 'utf8') : '';
const inSitemap = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&')));

const changed = lines(changedFile).map(toUrl).filter((u) => u && inSitemap.has(u));
const deleted = lines(deletedFile).map(toUrl).filter(Boolean);
const urls = [...new Set([...changed, ...deleted])].slice(0, MAX);
if (!urls.length) done('geen gewijzigde indexeerbare pagina\'s — niets te melden');

const host = new URL(SITE).host;
const body = { host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls };

if (process.env.DRY_RUN === '1') {
  log(`DRY_RUN: zou ${urls.length} URL('s) melden aan ${ENDPOINT}`);
  urls.forEach((u) => log(`  ${u}`));
  process.exit(0);
}

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  // 200 = ontvangen, 202 = ontvangen (sleutelvalidatie loopt nog). 4xx/429 = melden, niet falen.
  log(`${urls.length} URL('s) gemeld (${changed.length} gewijzigd, ${deleted.length} verwijderd) → HTTP ${res.status}`);
  if (res.status >= 400) log(`antwoord: ${(await res.text()).slice(0, 300)}`);
} catch (e) {
  log(`melden mislukt: ${e.message}`);
}

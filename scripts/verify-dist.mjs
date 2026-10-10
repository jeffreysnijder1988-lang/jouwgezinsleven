#!/usr/bin/env node
/**
 * Deploy-poort: controleert of dist/ een complete, deploybare productieversie is
 * en schrijft dist/_release.txt (release-info, gebruikt voor verificatie en rollback).
 *
 * Faalt (exit 1) als:
 *  - essentiële bestanden ontbreken (homepage, 404, sitemap, robots, .htaccess);
 *  - de sitemap leeg is of de homepage mist;
 *  - robots.txt alles blokkeert terwijl het een productiebuild is;
 *  - het een fixture-/testbuild is (TESTBUILD-balk);
 *  - canonicals naar een ander domein wijzen dan PUBLIC_SITE_URL;
 *  - het aantal pagina's ineens >50% daalt t.o.v. de live versie (content-drop guard),
 *    tenzij ALLOW_CONTENT_DROP=1 (bewuste grote opschoning).
 *
 * Env: PUBLIC_SITE_URL, PUBLIC_NOINDEX_SITE, PREVIOUS_PAGE_COUNT, ALLOW_CONTENT_DROP,
 *      MIN_SITEMAP_URLS (default 1), RELEASE_ID, GIT_SHA, TRIGGER, TRIGGER_DETAIL.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = process.argv[2] || 'dist';
const env = process.env;
const errors = [];
const fail = (m) => errors.push(m);

const siteUrl = new URL(env.PUBLIC_SITE_URL || 'https://jouwgezinsleven.nl');
const noindexSite = env.PUBLIC_NOINDEX_SITE === '1';

for (const f of ['index.html', '404.html', 'sitemap.xml', 'robots.txt', '.htaccess']) {
  if (!existsSync(join(DIST, f))) fail(`essentieel bestand ontbreekt: ${f}`);
}

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = existsSync(DIST) ? walk(DIST) : [];
const html = files.filter((f) => f.endsWith('.html'));
const pages = html.filter((f) => !f.endsWith('404.html'));

// Sitemap
let sitemapUrls = [];
if (existsSync(join(DIST, 'sitemap.xml'))) {
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const min = Number(env.MIN_SITEMAP_URLS || 1);
  if (!noindexSite) {
    if (sitemapUrls.length < min) fail(`sitemap bevat ${sitemapUrls.length} URL's (minimaal ${min})`);
    if (!sitemapUrls.includes(new URL('/', siteUrl).toString())) fail('homepage ontbreekt in sitemap');
    const foreign = sitemapUrls.filter((u) => new URL(u).host !== siteUrl.host);
    if (foreign.length) fail(`sitemap bevat URL's op ander domein: ${foreign.slice(0, 3).join(', ')}`);
  }
}

// Robots
if (existsSync(join(DIST, 'robots.txt'))) {
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  if (!noindexSite && /^Disallow:\s*\/\s*$/m.test(robots)) fail('robots.txt blokkeert de hele site in een productiebuild');
  if (!noindexSite && !/Sitemap:/i.test(robots)) fail('robots.txt verwijst niet naar de sitemap');
}

// Per pagina: geen testbuild, canonical op juist domein
for (const f of html) {
  const s = readFileSync(f, 'utf8');
  const rel = relative(DIST, f);
  if (s.includes('TESTBUILD met fixture-data') && env.ALLOW_FIXTURE !== '1') fail(`${rel}: fixture-/testbuild mag niet gedeployd worden`);
  const canon = s.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canon && new URL(canon).host !== siteUrl.host) fail(`${rel}: canonical op ander domein (${canon})`);
  if (rel !== '404.html' && !canon) fail(`${rel}: geen canonical`);
}

// Content-drop guard
const prev = Number(env.PREVIOUS_PAGE_COUNT || 0);
if (prev > 0 && pages.length < prev * 0.5 && env.ALLOW_CONTENT_DROP !== '1') {
  fail(`aantal pagina's daalt van ${prev} naar ${pages.length} (>50%). Mogelijk verkeerde dataset of massaal unpublish. Zet ALLOW_CONTENT_DROP=1 als dit bewust is.`);
}

const summary = {
  release: env.RELEASE_ID || 'local',
  commit: env.GIT_SHA || 'local',
  trigger: env.TRIGGER || 'manual',
  trigger_detail: (env.TRIGGER_DETAIL || '').replace(/[\r\n]/g, ' ').slice(0, 200),
  built_at: new Date().toISOString(),
  pages: pages.length,
  sitemap_urls: sitemapUrls.length,
  site: siteUrl.origin,
};

if (errors.length) {
  console.error(`✗ dist/ NIET deploybaar (${errors.length} fout(en)):`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

writeFileSync(join(DIST, '_release.txt'), Object.entries(summary).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
console.log(`✓ dist/ deploybaar: ${pages.length} pagina's, ${sitemapUrls.length} URL's in sitemap, release ${summary.release}`);

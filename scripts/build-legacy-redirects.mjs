#!/usr/bin/env node
/**
 * Genereert de legacy-redirectregels in public/.htaccess uit docs/legacy-redirects.csv.
 *
 * De CSV is de bron. Het blok tussen de markers wordt volledig herschreven;
 * de rest van .htaccess blijft ongewijzigd.
 *
 * Regels:
 *  - 301 → absolute doel-URL (https, zonder www), zodat http/www/zonder-slash in één hop eindigt.
 *  - 410 → [G]. Apache toont dan ErrorDocument 410 (de 404-pagina met status 410).
 *  - Elk pad matcht met en zonder trailing slash.
 *
 * Gebruik:  node scripts/build-legacy-redirects.mjs          (schrijft .htaccess)
 *           node scripts/build-legacy-redirects.mjs --check  (faalt als .htaccess niet actueel is)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(root, 'docs/legacy-redirects.csv');
const HTACCESS = join(root, 'public/.htaccess');
const SITE = 'https://jouwgezinsleven.nl';
const BEGIN = '# BEGIN legacy-redirects (gegenereerd uit docs/legacy-redirects.csv — niet handmatig wijzigen)';
const END = '# END legacy-redirects';

export function readLegacyRedirects(path = CSV) {
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const header = lines.shift();
  if (!header.startsWith('oude_url,actie,doel')) throw new Error(`Onverwachte CSV-header: ${header}`);
  const rows = lines.filter(Boolean).map((line, i) => {
    const [from, action, to] = line.split(',');
    const where = `docs/legacy-redirects.csv regel ${i + 2}`;
    if (!/^\/[a-z0-9\-/]+\/$/.test(from)) throw new Error(`${where}: oude_url moet /pad/ zijn: ${from}`);
    if (action !== '301' && action !== '410') throw new Error(`${where}: actie moet 301 of 410 zijn`);
    if (action === '301' && !/^\/([a-z0-9\-/]+\/)?$/.test(to || '')) throw new Error(`${where}: 301 vereist een intern doelpad /pad/`);
    if (action === '410' && to) throw new Error(`${where}: 410 heeft geen doel`);
    return { from, action, to: to || null };
  });
  const dup = rows.map((r) => r.from).filter((f, i, a) => a.indexOf(f) !== i);
  if (dup.length) throw new Error(`Dubbele oude_url: ${dup.join(', ')}`);
  return rows;
}

const esc = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

function buildBlock(rows) {
  const out = [BEGIN, '<IfModule mod_rewrite.c>', 'RewriteEngine On'];
  for (const r of rows) {
    const pattern = `^${esc(r.from.slice(1, -1))}/?$`;
    out.push(r.action === '301'
      ? `RewriteRule ${pattern} ${SITE}${r.to} [R=301,L,NC]`
      : `RewriteRule ${pattern} - [G,L,NC]`);
  }
  out.push('</IfModule>', END);
  return out.join('\n');
}

const rows = readLegacyRedirects();
const block = buildBlock(rows);
const current = readFileSync(HTACCESS, 'utf8');
const start = current.indexOf(BEGIN);
const stop = current.indexOf(END);
if (start === -1 || stop === -1) throw new Error('Markers voor legacy-redirects ontbreken in public/.htaccess');
const next = current.slice(0, start) + block + current.slice(stop + END.length);

if (process.argv.includes('--check')) {
  if (next !== current) {
    console.error('✗ public/.htaccess is niet actueel. Draai: node scripts/build-legacy-redirects.mjs');
    process.exit(1);
  }
  console.log(`✓ legacy-redirects actueel (${rows.length} regels)`);
} else {
  writeFileSync(HTACCESS, next);
  console.log(`✓ ${rows.length} legacy-regels geschreven (${rows.filter((r) => r.action === '301').length}× 301, ${rows.filter((r) => r.action === '410').length}× 410)`);
}

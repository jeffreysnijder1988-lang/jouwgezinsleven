#!/usr/bin/env node
/**
 * Maakt (of toont) de Sanity-webhook die bij publicatie de GitHub-workflow start.
 * Configuratie staat in deploy/sanity-webhook.json (zonder secrets).
 *
 *   node scripts/sanity-webhook.mjs list
 *   GITHUB_REPO=owner/repo GITHUB_DISPATCH_TOKEN=... SANITY_AUTH_TOKEN=... node scripts/sanity-webhook.mjs create
 *
 * SANITY_AUTH_TOKEN: token met recht om webhooks te beheren (sanity.io/manage → API → Tokens, of `npx sanity debug --secrets`).
 * GITHUB_DISPATCH_TOKEN: fine-grained PAT, alleen deze repo, permissie "Contents: Read and write".
 * Tokens worden alleen naar api.sanity.io gestuurd en nooit gelogd.
 */
import { readFileSync } from 'node:fs';

const PROJECT = process.env.SANITY_PROJECT_ID || 'amxuxo0p';
const API = `https://${PROJECT}.api.sanity.io/v2025-02-19/hooks/projects/${PROJECT}`;
const token = process.env.SANITY_AUTH_TOKEN;
const mode = process.argv[2] || 'list';
if (!token) { console.error('SANITY_AUTH_TOKEN ontbreekt'); process.exit(1); }
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const existing = await (await fetch(API, { headers })).json();
if (!Array.isArray(existing)) { console.error('Sanity API-fout:', existing?.message || existing); process.exit(1); }
const cfg = JSON.parse(readFileSync(new URL('../deploy/sanity-webhook.json', import.meta.url)));

if (mode === 'list') {
  for (const h of existing) console.log(`${h.id}  ${h.isDisabledByUser ? '(uit)' : '(aan)'}  ${h.name}  → ${h.url}`);
  if (!existing.length) console.log('Geen webhooks.');
  process.exit(0);
}

if (mode === 'create') {
  const repo = process.env.GITHUB_REPO;
  const gh = process.env.GITHUB_DISPATCH_TOKEN;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '') || !gh) { console.error('GITHUB_REPO (owner/repo) en GITHUB_DISPATCH_TOKEN zijn verplicht'); process.exit(1); }
  if (existing.some((h) => h.name === cfg.name)) { console.error(`Webhook "${cfg.name}" bestaat al — verwijder die eerst in sanity.io/manage.`); process.exit(1); }
  const body = {
    ...cfg,
    url: cfg.url.replace('<OWNER>/<REPO>', repo),
    headers: { ...cfg.headers, Authorization: `Bearer ${gh}` },
  };
  const res = await fetch(API, { method: 'POST', headers, body: JSON.stringify(body) });
  const out = await res.json();
  if (!res.ok) { console.error('Aanmaken mislukt:', out?.message || res.status); process.exit(1); }
  console.log(`✓ webhook aangemaakt: ${out.id} → ${out.url}`);
  process.exit(0);
}
console.error('Gebruik: list | create'); process.exit(1);

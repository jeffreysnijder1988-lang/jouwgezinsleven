/**
 * Opvangkiezer-adapter (NETWORK_MAP §5, BESLUIT_OPVANGKIEZER).
 *
 * Opvangkiezer is source of truth voor opvanglocaties. JouwGezinsleven leest alleen de publieke
 * structuur (provinciepagina's en opvangvormen) uit https://opvangkiezer.nl/sitemap.xml, tijdens de build.
 * Er wordt niets naar Sanity gekopieerd en er gebeurt geen client-side fetch.
 *
 * Bij een storing: alleen de vaste paginatypen (geen provincies) — nooit throwen, niets verzinnen.
 * Woordkeuze: Opvangkiezer is een matchmaker, geen vergelijkingssite ("zoeken via", "koppelt je aan").
 */
export const OPVANGKIEZER_BASE = 'https://opvangkiezer.nl';

export interface OkLink { name: string; url: string }
export interface OpvangkiezerStructure { provinces: OkLink[]; types: OkLink[]; searchUrl: string }

/** Opvangvormen met een eigen pagina op Opvangkiezer (paden uit de sitemap van 28-10-2026). */
const TYPE_PAGES: { path: string; name: string }[] = [
  { path: '/kinderdagverblijf', name: 'Kinderdagverblijf' },
  { path: '/bso', name: 'Bso' },
  { path: '/gastouderopvang', name: 'Gastouderopvang' },
  { path: '/peuteropvang', name: 'Peuteropvang' },
];

/** Gedeelde referentiedata (NETWORK_MAP §12): officiële schrijfwijze van de provincies. */
const PROVINCE_NAMES: Record<string, string> = {
  drenthe: 'Drenthe', flevoland: 'Flevoland', friesland: 'Friesland', gelderland: 'Gelderland',
  groningen: 'Groningen', limburg: 'Limburg', 'noord-brabant': 'Noord-Brabant', 'noord-holland': 'Noord-Holland',
  overijssel: 'Overijssel', utrecht: 'Utrecht', zeeland: 'Zeeland', 'zuid-holland': 'Zuid-Holland',
};

let cache: Promise<OpvangkiezerStructure> | null = null;

async function load(): Promise<OpvangkiezerStructure> {
  const searchUrl = `${OPVANGKIEZER_BASE}/kinderopvang`;
  const fallback: OpvangkiezerStructure = {
    provinces: [],
    types: TYPE_PAGES.map((t) => ({ name: t.name, url: OPVANGKIEZER_BASE + t.path })),
    searchUrl,
  };
  if (process.env.OPVANGKIEZER_OFFLINE === '1' || process.env.CONTENT_SOURCE === 'fixture') return fallback;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${OPVANGKIEZER_BASE}/sitemap.xml`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return fallback;
    const paths = new Set(
      [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((m) => { try { return new URL(m[1]).pathname.replace(/\/$/, ''); } catch { return ''; } })
        .filter(Boolean),
    );
    const provinces = [...paths]
      .map((p) => p.match(/^\/provincie\/([a-z-]+)$/)?.[1])
      .filter((s): s is string => Boolean(s && PROVINCE_NAMES[s]))
      .map((s) => ({ name: PROVINCE_NAMES[s], url: `${OPVANGKIEZER_BASE}/provincie/${s}` }))
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    const types = TYPE_PAGES.filter((t) => paths.has(t.path)).map((t) => ({ name: t.name, url: OPVANGKIEZER_BASE + t.path }));
    return {
      provinces,
      types: types.length ? types : fallback.types,
      searchUrl: paths.has('/kinderopvang') ? searchUrl : OPVANGKIEZER_BASE + '/',
    };
  } catch {
    return fallback;
  }
}

/** Eén keer per build ophalen. */
export function getOpvangkiezerStructure(): Promise<OpvangkiezerStructure> {
  cache ??= load();
  return cache;
}

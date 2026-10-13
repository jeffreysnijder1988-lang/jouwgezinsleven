/**
 * Cijfers en regels op één plek (Sanity-type `factSet`).
 *
 * Artikelen bevatten geen losse bedragen of datums voor gegevens waarvoor een reeks bestaat,
 * maar verwijzen ernaar:
 *  - inline in Portable Text: `factValue` { series | factSet, key, format }
 *  - als blok in Portable Text: `factList` { series | factSet, keys?, onlyUpcoming?, limit?, showNext? }
 *  - in platte tekst (FAQ-antwoorden): {{fact:reeks.sleutel}} of {{fact:reeks._year}}
 *
 * Alles wordt hier, in de datalaag, ingevuld. Componenten, FAQ en JSON-LD krijgen dus
 * dezelfde, al opgeloste tekst. Per reeks geldt de set met validFrom ≤ vandaag ≤ validUntil
 * (Europe/Amsterdam). Ontbreekt een geldige set of sleutel, dan faalt de build:
 * liever geen deploy dan een lege plek of een oud getal in de zin.
 *
 * FACTS_TODAY=JJJJ-MM-DD overschrijft "vandaag" (alleen voor tests, bijv. de jaarwissel).
 */
import { fetchContent } from './source';
import { FACT_SETS_QUERY } from '../sanity/queries';

export type FactUnit = 'eurPerHour' | 'eur' | 'percent' | 'date' | 'number' | 'text';
export interface FactItem { key: string; label: string; value: string; unit: FactUnit }
export interface FactSet {
  _id: string;
  title: string;
  series: string;
  validFrom: string;
  validUntil?: string | null;
  status?: 'definitief' | 'voorlopig' | null;
  items: FactItem[];
  sources?: { sourceName?: string; sourceUrl?: string }[] | null;
  reviewDueAt?: string | null;
}

/** Opgelost lijstblok zoals FactList.astro het rendert. */
export interface ResolvedFactList {
  _type: 'factList';
  _key: string;
  items: { key: string; text: string }[];
  next?: { heading: string; items: { key: string; text: string }[] } | null;
  emptyText?: string | null;
  emptyHref?: string | null;
}

export function factsToday(): string {
  const o = process.env.FACTS_TODAY || import.meta.env?.FACTS_TODAY;
  if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) return o;
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
}

export const getFactSets = () => fetchContent<FactSet[]>(FACT_SETS_QUERY);

const isValidOn = (s: FactSet, day: string) => s.validFrom <= day && (!s.validUntil || s.validUntil >= day);

export function currentSet(sets: FactSet[], series: string, day = factsToday()): FactSet {
  const hits = sets.filter((s) => s.series === series && isValidOn(s, day)).sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  if (!hits.length) throw new Error(`[facts] Geen geldige set voor reeks "${series}" op ${day}. Voer een nieuwe set in onder "Cijfers en regels".`);
  return hits[0];
}

export function nextSet(sets: FactSet[], series: string, day = factsToday()): FactSet | null {
  return sets.filter((s) => s.series === series && s.validFrom > day).sort((a, b) => a.validFrom.localeCompare(b.validFrom))[0] ?? null;
}

const nl = (n: number, decimals: number) =>
  new Intl.NumberFormat('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);

export function formatDate(iso: string, opts: { weekday?: boolean } = {}): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('nl-NL', {
    timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'long', year: 'numeric', ...(opts.weekday === false ? {} : { weekday: 'long' }),
  });
}

/** Waarde zoals die in een zin staat: "€ 9,98", "83,7%", "dinsdag 20 oktober 2026". */
export function formatValue(item: FactItem): string {
  const n = Number(item.value);
  switch (item.unit) {
    case 'eurPerHour': return `€ ${nl(n, 2)}`;
    case 'eur': return `€ ${nl(n, Number.isInteger(n) ? 0 : 2)}`;
    case 'percent': return `${nl(n, Number.isInteger(n) ? 0 : 1)}%`;
    case 'number': return nl(n, Number.isInteger(n) ? 0 : 2);
    case 'date': return formatDate(item.value);
    default: return item.value;
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Regel zoals die in een lijst staat. Datums eerst ("Dinsdag 20 oktober 2026: toeslag voor november"), anders label eerst. */
export function formatListItem(item: FactItem): string {
  if (item.unit === 'date') return `${cap(formatValue(item))}: ${item.label}`;
  return `${item.label}: ${formatValue(item)}${item.unit === 'eurPerHour' ? ' per uur' : ''}`;
}

function pickSet(sets: FactSet[], ref: { series?: string; factSet?: { _ref?: string } | null }, where: string): FactSet {
  if (ref.factSet?._ref) {
    const s = sets.find((x) => x._id === ref.factSet!._ref);
    if (!s) throw new Error(`[facts] ${where}: vaste set ${ref.factSet._ref} bestaat niet (of is niet gepubliceerd).`);
    return s;
  }
  if (!ref.series) throw new Error(`[facts] ${where}: geen reeks of set opgegeven.`);
  return currentSet(sets, ref.series);
}

function itemOf(set: FactSet, key: string | undefined, where: string): FactItem {
  const it = set.items.find((i) => i.key === key);
  if (!it) throw new Error(`[facts] ${where}: sleutel "${key}" ontbreekt in set "${set.title}" (${set._id}).`);
  return it;
}

function resolveInline(sets: FactSet[], node: { series?: string; factSet?: { _ref?: string }; key?: string; format?: string }, where: string): string {
  const set = pickSet(sets, node, where);
  const format = node.format ?? 'value';
  if (format === 'year') return set.validFrom.slice(0, 4);
  const it = itemOf(set, node.key, where);
  return format === 'label' ? it.label : formatValue(it);
}

function resolveList(sets: FactSet[], node: Record<string, unknown> & { _key: string }, where: string): ResolvedFactList {
  const ref = node as { series?: string; factSet?: { _ref?: string }; keys?: string[]; onlyUpcoming?: boolean; limit?: number; showNext?: boolean };
  const today = factsToday();
  const pickKeys = (set: FactSet) => (ref.keys?.length ? ref.keys.map((k) => itemOf(set, k, where)) : set.items);
  let items: FactItem[];
  let emptyText: string | null = null;
  let emptyHref: string | null = null;
  if (ref.onlyUpcoming) {
    if (!ref.series) throw new Error(`[facts] ${where}: "alleen komende datums" werkt alleen met een reeks.`);
    const all = sets.filter((s) => s.series === ref.series);
    if (!all.length) throw new Error(`[facts] ${where}: reeks "${ref.series}" bestaat niet.`);
    items = all.flatMap((s) => s.items).filter((i) => i.unit === 'date' && i.value >= today).sort((a, b) => a.value.localeCompare(b.value));
    const src = all.flatMap((s) => s.sources ?? []).find((x) => x.sourceUrl);
    emptyText = 'De volgende betaaldatums zijn nog niet bekendgemaakt. Kijk op de officiële pagina voor de actuele datums.';
    emptyHref = src?.sourceUrl ?? null;
  } else {
    items = pickKeys(pickSet(sets, ref, where));
  }
  if (ref.limit) items = items.slice(0, ref.limit);
  let next: ResolvedFactList['next'] = null;
  if (ref.showNext && ref.series && !ref.onlyUpcoming) {
    const n = nextSet(sets, ref.series, today);
    if (n) {
      next = {
        heading: `Vanaf ${formatDate(n.validFrom, { weekday: false })}${n.status === 'voorlopig' ? ' (voorlopig)' : ''}:`,
        items: pickKeys(n).map((i) => ({ key: i.key, text: formatListItem(i) })),
      };
    }
  }
  return { _type: 'factList', _key: node._key, items: items.map((i) => ({ key: i.key, text: formatListItem(i) })), next, emptyText, emptyHref };
}

type PtNode = { _type: string; _key?: string; children?: PtNode[]; text?: string; marks?: string[]; [k: string]: unknown };

/** Vervangt factValue (inline) door gewone spans en factList (blok) door een opgelost lijstblok. */
export async function resolveFactsInBlocks<T>(blocks: T[] | null | undefined, where: string): Promise<T[] | null | undefined> {
  if (!blocks?.length) return blocks;
  const uses = JSON.stringify(blocks).includes('"_type":"fact');
  if (!uses) return blocks;
  const sets = await getFactSets();
  return (blocks as unknown as PtNode[]).map((b) => {
    if (b._type === 'factList') return resolveList(sets, b as PtNode & { _key: string }, `${where} (blok ${b._key})`) as unknown as T;
    if (b._type === 'block' && b.children?.some((c) => c._type === 'factValue')) {
      return {
        ...b,
        children: b.children.map((c) => (c._type === 'factValue'
          ? { _type: 'span', _key: c._key, marks: [], text: resolveInline(sets, c as never, `${where} (blok ${b._key})`) }
          : c)),
      } as unknown as T;
    }
    return b as unknown as T;
  });
}

const TOKEN = /\{\{fact:([a-z0-9-]+)\.([a-z0-9_-]+)\}\}/g;

/** {{fact:kot-uurprijzen.bso}} → "€ 9,98"; {{fact:kot-uurprijzen._year}} → "2026". Voor platte tekst (FAQ). */
export async function resolveFactTokens(text: string | null | undefined, where: string): Promise<string | null | undefined> {
  if (!text || !text.includes('{{fact:')) return text;
  const sets = await getFactSets();
  return text.replace(TOKEN, (_m, series: string, key: string) =>
    resolveInline(sets, key === '_year' ? { series, format: 'year' } : { series, key }, where));
}

/** Waarschuwingen voor de build: reeksen die bijna verlopen zonder opvolger, of datumreeksen die bijna leeg zijn. */
export async function factWarnings(): Promise<string[]> {
  const sets = await getFactSets();
  const today = factsToday();
  const soon = new Date(Date.parse(`${today}T12:00:00Z`) + 30 * 864e5).toISOString().slice(0, 10);
  const out: string[] = [];
  for (const series of [...new Set(sets.map((s) => s.series))]) {
    const inSeries = sets.filter((s) => s.series === series);
    const isDates = inSeries.every((s) => s.items.every((i) => i.unit === 'date'));
    if (isDates) {
      const upcoming = inSeries.flatMap((s) => s.items).filter((i) => i.value >= today).length;
      if (upcoming < 2) out.push(`reeks "${series}": nog ${upcoming} komende datum(s) ingevoerd. Voeg de nieuwe datums toe.`);
      continue;
    }
    const cur = inSeries.find((s) => isValidOn(s, today));
    if (!cur) { out.push(`reeks "${series}": geen set geldig op ${today}.`); continue; }
    if (cur.validUntil && cur.validUntil <= soon && !nextSet(sets, series, today)) out.push(`reeks "${series}": huidige set loopt af op ${cur.validUntil} en er is nog geen opvolger.`);
  }
  for (const s of sets) if (s.reviewDueAt && s.reviewDueAt < today) out.push(`set "${s.title}" moest vóór ${s.reviewDueAt} opnieuw gecontroleerd worden.`);
  return out;
}

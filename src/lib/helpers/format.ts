const dateFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' });

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
}

const shortMonths = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
/** "30 aug 2026" — notatie van de bestaande site. */
export function formatDateShort(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Amsterdam' }).formatToParts(d);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return `${get('day')} ${shortMonths[get('month') - 1]} ${get('year')}`;
}

export function isoDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Leeftijdsbereik in maanden → notatie van de bestaande site ("0 – 1 jaar", "12+ jaar", "6–18 maanden"). */
export function formatAgeRange(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return '';
  const years = (m: number) => m % 12 === 0;
  if (min != null && max != null) {
    if (years(min) && years(max)) return `${min / 12} – ${max / 12} jaar`;
    return `${min} – ${max} maanden`;
  }
  if (min != null) return years(min) ? `${min / 12}+ jaar` : `vanaf ${min} maanden`;
  return years(max as number) ? `tot ${(max as number) / 12} jaar` : `tot ${max} maanden`;
}

/** Eerste zin van een tekst (gebruikt op "Ook interessant"-kaarten, zoals op de bestaande site). */
export function firstSentence(text?: string | null): string {
  if (!text) return '';
  const i = text.indexOf('. ');
  return i === -1 ? text : text.slice(0, i + 1);
}

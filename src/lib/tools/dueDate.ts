/**
 * Uitgerekende datum — pure rekenlogica (geen DOM), gedeeld door de calculator en de tests.
 *
 * Rekenregels (zie artikel /zwanger/uitgerekende-datum-berekenen/ voor bronnen):
 *  - Laatste menstruatie (LM): uitgerekende datum = LM + 280 dagen, gecorrigeerd met (cycluslengte − 28).
 *  - Bevruchting: + 266 dagen.
 *  - IVF/ICSI: punctie telt als 2 weken zwanger → terugplaatsing dag 3: + 263, dag 5: + 261.
 *  - Echo: echodatum + (280 − zwangerschapsduur bij de echo in dagen).
 * Zwangerschapsduur wordt altijd geteld vanaf "dag 0" = uitgerekende datum − 280.
 *
 * Alle datums zijn UTC-middernacht om tijdzone- en zomertijdfouten te vermijden.
 */

export type Method = 'lmp' | 'conception' | 'ivf' | 'echo';

export interface DueDateInput {
  method: Method;
  date: string;              // YYYY-MM-DD
  cycleLength?: number;      // lmp
  embryoDay?: 3 | 5;         // ivf
  echoWeeks?: number;        // echo
  echoDays?: number;         // echo
}

export interface Milestone {
  label: string;
  fromDay: number;
  toDay?: number;
  note: string;
  source: string;
  url: string;
}

export const DAY = 86_400_000;
export const TERM_DAYS = 280;

/** Mijlpalen op zwangerschapsdag (dag 0 = eerste dag laatste menstruatie). Gecontroleerd 13-10-2026. */
export const MILESTONES: Milestone[] = [
  { label: 'Eerste afspraak verloskundige', fromDay: 56, note: 'Meestal rond 8 weken. Aanmelden kan direct na een positieve test.', source: 'De Verloskundige (KNOV)', url: 'https://deverloskundige.nl/themas/begeleiding-en-controles/afspraken-bij-de-verloskundige' },
  { label: 'Termijnecho', fromDay: 70, toDay: 84, note: 'Tussen 10 en 12 weken. Hiermee wordt je uitgerekende datum vastgesteld.', source: 'De Verloskundige (KNOV)', url: 'https://deverloskundige.nl/themas/verloop-en-stadia-zwangerschap/uitgerekende-datum-wat-betekent-die-dag-voor-de-zwangerschap' },
  { label: 'NIPT mogelijk', fromDay: 70, note: 'Vanaf 10 weken kun je kiezen voor de NIPT (bloedtest).', source: 'RIVM', url: 'https://www.pns.nl/sites/default/files/2026-08/Folder-De-NIPT%2C-13-wekenecho-en-20-wekenecho.pdf' },
  { label: 'Kraamzorg geregeld', fromDay: 105, note: 'Advies: regel je kraamzorg liefst vóór de 16e week.', source: 'RIVM / KNOV, NVOG, NHG', url: 'https://www.pns.nl/sites/default/files/2026-05/Zwanger%21_1.pdf' },
  { label: '20-wekenecho', fromDay: 126, toDay: 147, note: 'Kan van 18+0 tot en met 21+0 weken.', source: 'RIVM', url: 'https://www.pns.nl/sites/default/files/2026-08/Folder-De-NIPT%2C-13-wekenecho-en-20-wekenecho.pdf' },
  { label: 'Start zwangerschapsverlof', fromDay: 239, toDay: 253, note: 'Tussen 6 en uiterlijk 4 weken vóór de dag na je uitgerekende datum.', source: 'Rijksoverheid', url: 'https://www.rijksoverheid.nl/vraag-en-antwoord/zwangerschapsverlof-en-bevallingsverlof/zwangerschapsverlof-en-bevallingsverlof-berekenen' },
  { label: 'Voldragen (a terme)', fromDay: 259, toDay: 293, note: 'Van 37 tot 42 weken. In deze periode worden de meeste baby\'s geboren.', source: 'De Verloskundige (KNOV)', url: 'https://deverloskundige.nl/themas/verloop-en-stadia-zwangerschap/uitgerekende-periode-37-tot-42-weken-zwanger' },
  { label: 'Uitgerekende datum', fromDay: 280, note: '40 weken. Ongeveer 5 op de 100 baby\'s worden precies op deze dag geboren.', source: 'De Verloskundige (KNOV)', url: 'https://deverloskundige.nl/themas/verloop-en-stadia-zwangerschap/uitgerekende-datum-wat-betekent-die-dag-voor-de-zwangerschap' },
];

export function parseISODate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t : null;
}

export const toISODate = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Vandaag als UTC-middernacht op basis van de lokale kalenderdatum. */
export function todayUTC(now = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Dag 0 van de zwangerschap (UTC) of null bij ongeldige invoer. */
export function pregnancyStart(input: DueDateInput): number | null {
  const d = parseISODate(input.date);
  if (d === null) return null;
  switch (input.method) {
    case 'lmp': {
      const cycle = clamp(Math.round(input.cycleLength ?? 28), 20, 45);
      return d + (cycle - 28) * DAY;
    }
    case 'conception':
      return d - 14 * DAY;
    case 'ivf':
      return d - (14 + (input.embryoDay === 3 ? 3 : 5)) * DAY;
    case 'echo': {
      const ga = clamp(Math.round(input.echoWeeks ?? 0), 0, 42) * 7 + clamp(Math.round(input.echoDays ?? 0), 0, 6);
      return d - ga * DAY;
    }
  }
}

export interface DueDateResult {
  start: number;            // dag 0
  due: number;              // uitgerekende datum
  gestationalDays: number;  // vandaag, kan negatief of > 294 zijn
  weeks: number;
  days: number;
  daysToGo: number;
  trimester: 1 | 2 | 3 | null;
  status: 'not-yet' | 'pregnant' | 'past';
}

export function calculate(input: DueDateInput, today = todayUTC()): DueDateResult | null {
  const start = pregnancyStart(input);
  if (start === null) return null;
  const due = start + TERM_DAYS * DAY;
  const ga = Math.round((today - start) / DAY);
  const status = ga < 0 ? 'not-yet' : ga > 294 ? 'past' : 'pregnant';
  return {
    start, due, gestationalDays: ga,
    weeks: Math.floor(Math.max(ga, 0) / 7),
    days: Math.max(ga, 0) % 7,
    daysToGo: Math.round((due - today) / DAY),
    // Indeling deverloskundige.nl (KNOV), gelijk aan de weekpagina's: t/m week 12 · week 13–26 · vanaf week 27
    trimester: status !== 'pregnant' ? null : ga < 13 * 7 ? 1 : ga < 27 * 7 ? 2 : 3,
    status,
  };
}

/** Eenvoudig .ics-bestand (hele dag) voor de uitgerekende datum. */
export function icsForDueDate(due: number, url: string): string {
  const d = toISODate(due).replace(/-/g, '');
  const next = toISODate(due + DAY).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JouwGezinsleven//Uitgerekende datum//NL', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:uitgerekende-datum-${d}@jouwgezinsleven.nl`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`, 'SUMMARY:Uitgerekende datum',
    `DESCRIPTION:Berekend met de calculator van JouwGezinsleven. ${url}`, 'TRANSP:TRANSPARENT',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

function clamp(n: number, min: number, max: number) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

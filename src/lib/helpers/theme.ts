/**
 * Presentatie-mapping (hoort bij de templates, niet in Sanity):
 * welke kleur en illustratie een pijlerhub krijgt. Overgenomen van de bestaande site.
 * Een nieuwe pijler zonder mapping krijgt de neutrale crème-variant.
 */
export type HubTheme = 'roze' | 'geel' | 'sage' | 'creme';

const PILLAR_THEMES: Record<string, HubTheme> = {
  zwanger: 'roze',
  'baby-peuter': 'geel',
  kinderopvang: 'sage',
  eropuit: 'geel',
  feestjes: 'roze',
  gezinsvakantie: 'sage',
};

export const pillarTheme = (slug: string): HubTheme => PILLAR_THEMES[slug] ?? 'creme';

/** Kleur van levensfasekaarten op volgorde (f1–f3 op de bestaande site). Fasen zonder pagina: crème. */
export const PHASE_TONES = ['pink', 'yellow', 'sage-light'] as const;
export type PhaseTone = (typeof PHASE_TONES)[number] | 'cream';

/** Hero-kleur van levensfasepagina's. Onbekende fase: crème. */
const LIFESTAGE_THEMES: Record<string, HubTheme> = {
  baby: 'geel',
  peuter: 'sage',
  kleuter: 'roze',
  basisschool: 'geel',
  tiener: 'sage',
};
export const lifeStageTheme = (slug: string): HubTheme => LIFESTAGE_THEMES[slug] ?? 'creme';

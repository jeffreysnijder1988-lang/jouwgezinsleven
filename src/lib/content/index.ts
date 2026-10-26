/**
 * Data access layer. Pagina's en componenten halen content uitsluitend via deze functies.
 */
import { fetchContent } from './source';
import { resolveFactsInBlocks, resolveFactTokens, factWarnings } from './facts';
import * as Q from '../sanity/queries';
import type {
  ArticleLink,
  Article, ArticleCardData, HomePage, LifeStage, Page, Pillar, PregnancyHub, PregnancyMilestone,
  PregnancyWeek, PregnancyWeekCard, RouteEntry, SiteSettings, TrimesterInfo,
} from './types';

export * from './types';
export { isFixtureBuild, contentSource } from './source';

const EMPTY_SETTINGS: SiteSettings = {
  siteName: 'JouwGezinsleven',
  mainNav: [],
  footerNetworkLinks: [],
  footerCompanyLinks: [],
  footerLegalLinks: [],
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const s = await fetchContent<Partial<SiteSettings> | null>(Q.SITE_SETTINGS_QUERY);
  return {
    ...EMPTY_SETTINGS,
    ...(s ?? {}),
    siteName: s?.siteName || EMPTY_SETTINGS.siteName,
    mainNav: s?.mainNav ?? [],
    footerNetworkLinks: s?.footerNetworkLinks ?? [],
    footerCompanyLinks: s?.footerCompanyLinks ?? [],
    footerLegalLinks: s?.footerLegalLinks ?? [],
  };
}

export async function getHomePage(): Promise<HomePage> {
  const h = await fetchContent<HomePage | null>(Q.HOME_QUERY);
  return h ?? { seo: {} };
}

export const getPillars = () => fetchContent<Pillar[]>(Q.PILLARS_QUERY);
export const getLifeStages = () => fetchContent<LifeStage[]>(Q.LIFE_STAGES_QUERY);

export const getArticlesByPillar = (pillarId: string) =>
  fetchContent<ArticleCardData[]>(Q.ARTICLES_BY_PILLAR_QUERY, { pillarId });

export const getArticlesByLifeStage = (id: string) =>
  fetchContent<ArticleCardData[]>(Q.ARTICLES_BY_LIFESTAGE_QUERY, { id });
export const getArticleLinks = () => fetchContent<ArticleLink[]>(Q.ARTICLE_LINKS_QUERY);
export const getLatestArticles = (limit = 6) =>
  fetchContent<ArticleCardData[]>(Q.LATEST_ARTICLES_QUERY, { limit });

export async function getArticle(pillar: string, slug: string): Promise<Article | null> {
  const a = await fetchContent<Article | null>(Q.ARTICLE_QUERY, { pillar, slug });
  if (!a) return a;
  const where = `artikel /${pillar}/${slug}/`;
  return {
    ...a,
    body: await resolveFactsInBlocks(a.body, where),
    faq: a.faq ? await Promise.all(a.faq.map(async (f) => ({ ...f, answer: (await resolveFactTokens(f.answer, `${where} FAQ`)) ?? f.answer }))) : a.faq,
  };
}

export const getRelatedFallback = (pillarId: string, id: string) =>
  fetchContent<ArticleCardData[]>(Q.RELATED_FALLBACK_QUERY, { pillarId, id });

export async function getPage(slug: string): Promise<Page | null> {
  const p = await fetchContent<Page | null>(Q.PAGE_QUERY, { slug });
  return p ? { ...p, body: await resolveFactsInBlocks(p.body, `pagina /${slug}/`) } : p;
}

// --- Zwangerschap week voor week ---

type WeekRoute = PregnancyWeekCard & { noIndex: boolean; canonicalOverride?: string; lastmod?: string };

/** Hub-slug onder de zwangerschapspijler. */
export const PREGNANCY_HUB_SLUG = 'week-voor-week';
/** Weekoverzicht is indexeerbaar vanaf dit aantal gepubliceerde weken (dunne content daaronder). */
export const PREGNANCY_HUB_MIN_INDEXABLE = 6;

/** Trimester afgeleid uit de week, indeling deverloskundige.nl (KNOV): 1–12, 13–26, 27+. Niet opgeslagen. */
export const trimesterOf = (week: number): 1 | 2 | 3 => (week <= 12 ? 1 : week <= 26 ? 2 : 3);
export const TRIMESTER_LABELS: Record<1 | 2 | 3, string> = { 1: 'Eerste trimester', 2: 'Tweede trimester', 3: 'Derde trimester' };
/** "Week 12" of "Week 1–3". */
export const weekLabel = (w: { week: number; weekStart?: number | null }) =>
  w.weekStart && w.weekStart < w.week ? `Week ${w.weekStart}–${w.week}` : `Week ${w.week}`;

export const getPregnancyWeeks = () => fetchContent<WeekRoute[]>(Q.PREGNANCY_WEEKS_QUERY);
export const getTrimesters = () => fetchContent<TrimesterInfo[]>(Q.TRIMESTERS_QUERY);

export async function getPregnancyHub(): Promise<PregnancyHub> {
  const h = await fetchContent<PregnancyHub | null>(Q.PREGNANCY_HUB_QUERY);
  const base: PregnancyHub = h ?? { title: '', seo: {} };
  return {
    ...base,
    title: base.title || 'Zwangerschap week voor week',
    body: await resolveFactsInBlocks(base.body, 'weekoverzicht zwangerschap'),
  };
}

/** Alles voor één weekpagina: de week zelf, vorige/volgende, afspraken in deze periode en het trimesterblok. */
export async function getPregnancyWeekPage(slug: string) {
  const [w, weeks, milestones, trimesters] = await Promise.all([
    fetchContent<PregnancyWeek | null>(Q.PREGNANCY_WEEK_QUERY, { slug }),
    getPregnancyWeeks(),
    fetchContent<PregnancyMilestone[]>(Q.PREGNANCY_MILESTONES_QUERY),
    getTrimesters(),
  ]);
  if (!w) return null;
  const where = `zwangerschapsweek ${slug}`;
  const [babyDevelopment, bodyChanges, tips] = await Promise.all([
    resolveFactsInBlocks(w.babyDevelopment, where),
    resolveFactsInBlocks(w.bodyChanges, where),
    resolveFactsInBlocks(w.tips, where),
  ]);
  const faq = w.faq ? await Promise.all(w.faq.map(async (f) => ({ ...f, answer: (await resolveFactTokens(f.answer, `${where} FAQ`)) ?? f.answer }))) : w.faq;
  const from = w.weekStart ?? w.week;
  const i = weeks.findIndex((x) => x._id === w._id);
  const trimester = trimesterOf(w.week);
  return {
    week: { ...w, babyDevelopment, bodyChanges, tips, faq },
    prev: i > 0 ? weeks[i - 1] : null,
    next: i >= 0 && i < weeks.length - 1 ? weeks[i + 1] : null,
    milestones: milestones.filter((m) => m.weekFrom <= w.week && m.weekTo >= from),
    trimester,
    trimesterInfo: trimesters.find((t) => t.trimester === trimester) ?? null,
  };
}

/** Canoniek pad voor een artikel. Eén plek, overal hergebruikt. */
export const articlePath = (a: { pillar: { slug: string }; slug: string }) => `/${a.pillar.slug}/${a.slug}/`;
export const pillarPath = (p: { slug: string }) => `/${p.slug}/`;
export const pagePath = (p: { slug: string }) => `/${p.slug}/`;
export const lifeStagePath = (l: { slug: string }) => `/${l.slug}/`;

/** Levensfasepagina is indexeerbaar vanaf dit aantal artikelen; daaronder noindex (dunne content, SEO_RULES). */
export const LIFESTAGE_MIN_INDEXABLE = 6;

/** Slugs die niet door redactionele pagina's gebruikt mogen worden. */
const RESERVED = new Set(['sitemap.xml', 'robots.txt', '404', 'admin', 'studio', 'api', 'blog', 'category', 'categorie']);

let routesPromise: Promise<RouteEntry[]> | undefined;

/**
 * Centrale route-registry. getStaticPaths én sitemap.xml gebruiken deze lijst,
 * zodat website en sitemap nooit uit elkaar lopen.
 * Botsende URL's laten de build falen.
 */
export function getAllRoutes(): Promise<RouteEntry[]> {
  routesPromise ??= (async () => {
    const [home, pillars, articles, pages] = await Promise.all([
      getHomePage(),
      getPillars(),
      fetchContent<{ _id: string; title?: string; slug: string; pillar: string; noIndex: boolean; canonicalOverride?: string; lastmod?: string }[]>(Q.ARTICLE_ROUTES_QUERY),
      fetchContent<{ _id: string; title?: string; slug: string; noIndex: boolean; canonicalOverride?: string; lastmod?: string }[]>(Q.PAGE_ROUTES_QUERY),
    ]);

    // --- Contentvalidatie: liever een duidelijke buildfout dan half kapotte productie-output ---
    const problems: string[] = [];
    const warnings: string[] = [];
    const slugOk = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
    const settings = await getSiteSettings();
    if (!settings.mainNav.length) problems.push('siteSettings: hoofdmenu (mainNav) is leeg of siteSettings ontbreekt');
    if (!home.heroTitle) warnings.push('homePage: heroTitle ontbreekt (sitenaam wordt als H1 gebruikt)');
    if (!pillars.length) problems.push('geen enkele gepubliceerde pijler (topic, kind = pillar)');
    for (const p of pillars) {
      if (!p.name) problems.push(`pijler ${p._id}: naam ontbreekt`);
      if (!slugOk(p.slug)) problems.push(`pijler ${p._id}: ongeldige slug "${p.slug}"`);
    }
    for (const a of articles) {
      if (!a.title?.trim()) problems.push(`artikel ${a._id} (/${a.pillar}/${a.slug}/): titel ontbreekt`);
      if (!slugOk(a.slug)) problems.push(`artikel ${a._id}: ongeldige slug "${a.slug}"`);
    }
    for (const pg of pages) {
      if (!pg.title?.trim()) problems.push(`pagina ${pg._id} (/${pg.slug}/): titel ontbreekt`);
      if (!slugOk(pg.slug)) problems.push(`pagina ${pg._id}: ongeldige slug "${pg.slug}"`);
    }
    const unroutable = await fetchContent<{ _id: string; title?: string; slug?: string; pillar?: string; pillarKind?: string }[]>(Q.UNROUTABLE_ARTICLES_QUERY);
    for (const u of unroutable) {
      warnings.push(`artikel ${u._id} ("${u.title ?? '?'}") wordt NIET gepubliceerd: ${!u.slug ? 'slug ontbreekt' : !u.pillar ? 'pijler ontbreekt' : 'gekoppelde topic is geen pijler'}`);
    }
    const overdue = await fetchContent<{ _id: string; title?: string; slug?: string; pillar?: string; reviewDueAt: string; reviewNote?: string }[]>(
      Q.REVIEW_OVERDUE_QUERY, { today: new Date().toISOString().slice(0, 10) },
    );
    for (const o of overdue) {
      warnings.push(`artikel /${o.pillar}/${o.slug}/ moest vóór ${o.reviewDueAt} opnieuw gecontroleerd worden${o.reviewNote ? ` (${o.reviewNote.split('\n')[0].slice(0, 120)})` : ''}`);
    }
    for (const u of await fetchContent<{ _id: string; week?: number; slug?: string; reviewStatus?: string; sourceCount?: number }[]>(Q.UNROUTABLE_WEEKS_QUERY)) {
      const why = !u.slug || u.week == null ? 'week of slug ontbreekt' : u.reviewStatus !== 'approved' ? `reviewstatus is "${u.reviewStatus ?? 'leeg'}"` : `${u.sourceCount ?? 0} bron(nen), minimaal 2 nodig`;
      warnings.push(`zwangerschapsweek ${u._id} (week ${u.week ?? '?'}) wordt NIET gepubliceerd: ${why}`);
    }
    for (const w of await factWarnings()) warnings.push(w);
    warnings.forEach((w) => console.warn(`[content] waarschuwing: ${w}`));
    if (problems.length) {
      throw new Error(`[content] ${problems.length} contentfout(en) — build afgebroken, productie blijft ongewijzigd:\n - ${problems.join('\n - ')}`);
    }

    const routes: RouteEntry[] = [
      { path: '/', kind: 'home', noIndex: Boolean(home.seo?.noIndex), lastmod: home._updatedAt ?? null },
    ];

    for (const p of pillars) {
      // Een pijlerhub zonder artikelen, zonder redactionele intro en zonder FAQ is dunne content → noindex (SEO_RULES).
      const thin = p.articleCount === 0 && !(p.intro && p.intro.length) && !(p.faq && p.faq.length);
      routes.push({
        path: pillarPath(p), kind: 'pillar', id: p._id, params: { slug: p.slug },
        noIndex: Boolean(p.seo?.noIndex) || thin, canonical: p.seo?.canonicalOverride, lastmod: p._updatedAt,
      });
    }
    for (const a of articles) {
      routes.push({
        path: `/${a.pillar}/${a.slug}/`, kind: 'article', id: a._id, params: { pillar: a.pillar, slug: a.slug },
        noIndex: a.noIndex, canonical: a.canonicalOverride, lastmod: a.lastmod,
      });
    }
    for (const pg of pages) {
      if (RESERVED.has(pg.slug)) throw new Error(`[routes] Pagina-slug "${pg.slug}" is gereserveerd.`);
      routes.push({
        path: pagePath(pg), kind: 'page', id: pg._id, params: { slug: pg.slug },
        noIndex: pg.noIndex, canonical: pg.canonicalOverride, lastmod: pg.lastmod,
      });
    }

    // Zwangerschap week voor week: /zwanger/12-weken-zwanger/ + overzicht /zwanger/week-voor-week/.
    const weeks = await getPregnancyWeeks();
    if (weeks.length) {
      const preg = pillars.find((p) => p._id === Q.PREGNANCY_PILLAR_ID);
      if (!preg) {
        console.warn(`[content] waarschuwing: ${weeks.length} zwangerschapsweek/weken niet gepubliceerd: pijler ${Q.PREGNANCY_PILLAR_ID} ontbreekt`);
      } else {
        for (const w of weeks) {
          if (!slugOk(w.slug)) { problems.push(`zwangerschapsweek ${w._id}: ongeldige slug "${w.slug}"`); continue; }
          routes.push({
            path: `/${preg.slug}/${w.slug}/`, kind: 'pregnancyWeek', id: w._id, params: { pillar: preg.slug, slug: w.slug },
            noIndex: w.noIndex, canonical: w.canonicalOverride, lastmod: w.lastmod,
          });
        }
        const hub = await getPregnancyHub();
        const indexable = weeks.filter((w) => !w.noIndex).length;
        routes.push({
          path: `/${preg.slug}/${PREGNANCY_HUB_SLUG}/`, kind: 'pregnancyHub', id: 'pregnancyHub', params: { pillar: preg.slug, slug: PREGNANCY_HUB_SLUG },
          noIndex: Boolean(hub.seo?.noIndex) || indexable < PREGNANCY_HUB_MIN_INDEXABLE,
          canonical: hub.seo?.canonicalOverride, lastmod: weeks.map((w) => w.lastmod).filter(Boolean).sort().at(-1) ?? hub._updatedAt ?? null,
        });
        if (problems.length) throw new Error(`[content] ${problems.length} contentfout(en):\n - ${problems.join('\n - ')}`);
      }
    }

    // Levensfasepagina's (/peuter/, /kleuter/, …): alleen met minimaal één artikel, en alleen als de URL
    // nog vrij is. "Zwanger" valt samen met de pijler /zwanger/ en krijgt dus geen eigen pagina.
    const lifeStages = await getLifeStages();
    const taken = new Set(routes.map((r) => r.path));
    for (const ls of lifeStages) {
      const path = lifeStagePath(ls);
      if (!ls.articleCount || taken.has(path) || RESERVED.has(ls.slug) || !slugOk(ls.slug)) continue;
      routes.push({
        path, kind: 'lifeStage', id: ls._id, params: { slug: ls.slug },
        noIndex: Boolean(ls.seo?.noIndex) || ls.articleCount < LIFESTAGE_MIN_INDEXABLE,
        canonical: ls.seo?.canonicalOverride, lastmod: ls._updatedAt ?? null,
      });
    }

    const seen = new Map<string, RouteEntry>();
    for (const r of routes) {
      const prev = seen.get(r.path);
      if (prev) throw new Error(`[routes] URL-conflict op ${r.path}: ${prev.kind}(${prev.id}) en ${r.kind}(${r.id}). Pas een slug aan in Sanity.`);
      seen.set(r.path, r);
    }
    return routes;
  })();
  return routesPromise;
}

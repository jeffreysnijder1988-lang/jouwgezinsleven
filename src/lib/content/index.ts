/**
 * Data access layer. Pagina's en componenten halen content uitsluitend via deze functies.
 */
import { fetchContent } from './source';
import * as Q from '../sanity/queries';
import type {
  Article, ArticleCardData, HomePage, LifeStage, Page, Pillar, RouteEntry, SiteSettings,
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

export const getLatestArticles = (limit = 6) =>
  fetchContent<ArticleCardData[]>(Q.LATEST_ARTICLES_QUERY, { limit });

export const getArticle = (pillar: string, slug: string) =>
  fetchContent<Article | null>(Q.ARTICLE_QUERY, { pillar, slug });

export const getRelatedFallback = (pillarId: string, id: string) =>
  fetchContent<ArticleCardData[]>(Q.RELATED_FALLBACK_QUERY, { pillarId, id });

export const getPage = (slug: string) => fetchContent<Page | null>(Q.PAGE_QUERY, { slug });

/** Canoniek pad voor een artikel. Eén plek, overal hergebruikt. */
export const articlePath = (a: { pillar: { slug: string }; slug: string }) => `/${a.pillar.slug}/${a.slug}/`;
export const pillarPath = (p: { slug: string }) => `/${p.slug}/`;
export const pagePath = (p: { slug: string }) => `/${p.slug}/`;

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

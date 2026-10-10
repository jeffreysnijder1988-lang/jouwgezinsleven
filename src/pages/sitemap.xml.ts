/**
 * XML-sitemap, gegenereerd uit dezelfde route-registry als de pagina's.
 * Alleen indexeerbare, canonieke URL's (SEO_RULES). Drafts bestaan niet in de build.
 */
import type { APIRoute } from 'astro';
import { getAllRoutes } from '@/lib/content';
import { absoluteUrl, siteNoIndex } from '@/lib/seo/meta';
import { isoDate } from '@/lib/helpers/format';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ site }) => {
  const routes = siteNoIndex ? [] : await getAllRoutes();
  const urls = routes
    .filter((r) => !r.noIndex)
    // Pagina met canonical naar een andere URL hoort niet in de sitemap.
    .filter((r) => !r.canonical || absoluteUrl(r.canonical, site) === absoluteUrl(r.path, site))
    .map((r) => {
      const lastmod = isoDate(r.lastmod);
      return `  <url><loc>${esc(absoluteUrl(r.path, site))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

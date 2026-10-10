import type { APIRoute } from 'astro';
import { absoluteUrl, siteNoIndex } from '@/lib/seo/meta';

export const GET: APIRoute = ({ site }) => {
  const body = siteNoIndex
    ? `# Test-/stagingbuild: niet indexeren\nUser-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml', site)}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

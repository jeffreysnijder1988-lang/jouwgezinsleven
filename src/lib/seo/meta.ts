/**
 * Centrale SEO-logica. Pagina's leveren content; deze module bepaalt title,
 * description, canonical, robots en Open Graph.
 */
import type { SanityImage, Seo, SiteSettings } from '../content/types';
import { hasImage, imageUrl } from '../sanity/image';
import { isFixtureBuild } from '../content/source';

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  noIndex: boolean;
  ogType: 'website' | 'article';
  ogImage?: { url: string; width: number; height: number; alt: string };
  publishedTime?: string | null;
  modifiedTime?: string | null;
}

// Fixture-builds zijn altijd noindex, behalve in de QA-run die sitemap/robots-logica test (QA_INDEXABLE=1).
export const siteNoIndex =
  (isFixtureBuild && process.env.QA_INDEXABLE !== '1') || import.meta.env.PUBLIC_NOINDEX_SITE === '1';

export function absoluteUrl(path: string, site: URL | undefined): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path, site ?? 'https://jouwgezinsleven.nl').toString();
}

const clean = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Beperkt een description tot ~160 tekens op een woordgrens. */
export function trimDescription(s?: string | null, max = 160): string {
  const t = clean(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…';
}

interface BuildMetaInput {
  path: string;
  site: URL | undefined;
  settings: SiteSettings;
  title: string;
  seo?: Seo | null;
  fallbackDescription?: string | null;
  image?: SanityImage | null;
  noIndex?: boolean;
  ogType?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  isHome?: boolean;
}

export function buildMeta(i: BuildMetaInput): PageMeta {
  const siteName = i.settings.siteName;
  const baseTitle = clean(i.seo?.title) || clean(i.title);
  const title = i.isHome
    ? baseTitle || siteName
    : baseTitle.toLowerCase().includes(siteName.toLowerCase())
      ? baseTitle
      : `${baseTitle} | ${siteName}`;

  const description = trimDescription(i.seo?.description || i.fallbackDescription || i.settings.tagline);
  const noIndex = siteNoIndex || Boolean(i.noIndex) || Boolean(i.seo?.noIndex);
  const canonical = absoluteUrl(clean(i.seo?.canonicalOverride) || i.path, i.site);

  const img = [i.seo?.image, i.image, i.settings.defaultOgImage].find(hasImage);
  const ogImage = img
    ? { url: imageUrl(img, 1200, 630), width: 1200, height: 630, alt: clean(img.alt) || baseTitle }
    : undefined;

  return {
    title,
    description,
    canonical,
    noIndex,
    robots: noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    ogType: i.ogType ?? 'website',
    ogImage,
    publishedTime: i.publishedTime,
    modifiedTime: i.modifiedTime,
  };
}

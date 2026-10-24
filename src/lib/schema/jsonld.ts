/**
 * Structured data (Schema.org). Alleen feitelijke, zichtbare gegevens.
 * Geen fictieve auteurs, datums, ratings of reviews.
 */
import type { Article, FaqItem, SiteSettings } from '../content/types';
import { absoluteUrl } from '../seo/meta';
import { hasImage, imageUrl } from '../sanity/image';

export interface Crumb { name: string; path: string }

type Json = Record<string, unknown>;

const orgId = (site?: URL) => absoluteUrl('/#organization', site);
const siteId = (site?: URL) => absoluteUrl('/#website', site);

export function organizationSchema(settings: SiteSettings, site?: URL): Json {
  const o = settings.organization ?? {};
  const schema: Json = {
    '@type': 'Organization',
    '@id': orgId(site),
    name: settings.siteName,
    url: absoluteUrl('/', site),
    logo: hasImage(settings.logo)
      ? { '@type': 'ImageObject', url: imageUrl(settings.logo, 512, undefined, 'png') }
      : { '@type': 'ImageObject', url: absoluteUrl('/img/logo.png', site), width: 291, height: 259 },
  };
  if (settings.tagline) schema.description = settings.tagline;
  if (o.email) {
    schema.email = o.email;
    schema.contactPoint = { '@type': 'ContactPoint', contactType: 'customer support', email: o.email, availableLanguage: 'nl' };
  }
  // Studio Cutter is de bouwer, niet de moederorganisatie → geen parentOrganization (besluit 24-10-2026).
  return schema;
}

/** Hubpagina als CollectionPage (zoals op de bestaande site), met ItemList alleen als er artikelen zijn. */
export function collectionPageSchema(name: string, description: string, canonical: string, items: { name: string; url: string }[], site?: URL): Json {
  const schema: Json = {
    '@type': 'CollectionPage',
    '@id': canonical + '#page',
    url: canonical,
    name,
    inLanguage: 'nl-NL',
    isPartOf: { '@id': siteId(site) },
  };
  if (description) schema.description = description;
  if (items.length) {
    schema.mainEntity = {
      '@type': 'ItemList',
      itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(it.url, site), name: it.name })),
    };
  }
  return schema;
}

export function websiteSchema(settings: SiteSettings, site?: URL): Json {
  return {
    '@type': 'WebSite',
    '@id': siteId(site),
    name: settings.siteName,
    url: absoluteUrl('/', site),
    inLanguage: 'nl-NL',
    publisher: { '@id': orgId(site) },
  };
}

export function breadcrumbSchema(crumbs: Crumb[], site?: URL): Json | null {
  if (crumbs.length < 2) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path, site),
    })),
  };
}

/** Article-schema. Ook voor zwangerschapsweken (bewust geen MedicalWebPage: geen medische review). */
export function articleSchema(
  a: Pick<Article, 'title' | 'excerpt' | 'publishedAt' | 'updatedAt' | 'heroImage' | 'author'> & { pillar?: { name?: string } | null },
  canonical: string, site?: URL,
): Json {
  const schema: Json = {
    '@type': 'Article',
    headline: a.title,
    mainEntityOfPage: canonical,
    inLanguage: 'nl-NL',
    publisher: { '@id': orgId(site) },
    isPartOf: { '@id': siteId(site) },
  };
  if (a.excerpt) schema.description = a.excerpt;
  // Datums alleen wanneer redactioneel vastgelegd — nooit afgeleid van systeemtijden.
  if (a.publishedAt) schema.datePublished = a.publishedAt;
  if (a.updatedAt || a.publishedAt) schema.dateModified = a.updatedAt || a.publishedAt;
  if (hasImage(a.heroImage)) schema.image = imageUrl(a.heroImage, 1200, 675);
  // Auteur: alleen een echte auteur uit Sanity; anders de organisatie.
  schema.author = a.author?.name
    ? { '@type': 'Person', name: a.author.name }
    : { '@id': orgId(site) };
  if (a.pillar?.name) schema.articleSection = a.pillar.name;
  return schema;
}

export function faqSchema(items: FaqItem[]): Json | null {
  const valid = items.filter((f) => f.question && f.answer);
  if (!valid.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: valid.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/** Combineert losse blokken tot één @graph. */
export function graph(...nodes: (Json | null | undefined)[]): Json {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}

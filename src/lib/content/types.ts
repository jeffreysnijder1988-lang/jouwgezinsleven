/** Genormaliseerde contenttypes zoals componenten ze ontvangen. */
import type { PortableTextBlock } from '@portabletext/types';

export interface SanityImage {
  asset?: { _id?: string; url?: string; width?: number; height?: number; lqip?: string } | null;
  crop?: unknown;
  hotspot?: unknown;
  alt?: string | null;
  caption?: string | null;
}

export interface Seo {
  title?: string | null;
  description?: string | null;
  noIndex?: boolean;
  canonicalOverride?: string | null;
  image?: SanityImage | null;
}

export interface PillarRef { _id: string; name: string; navLabel?: string | null; slug: string }

export interface NetworkDestination {
  _key: string;
  platform: string;
  externalId?: string | null;
  externalUrl?: string | null;
  relationType?: string | null;
  priority?: number | null;
  title?: string | null;
  description?: string | null;
}

export interface Pillar extends PillarRef {
  heroTitle?: string | null;
  description?: string | null;
  faq?: FaqItem[] | null;
  hubCta?: CtaData | null;
  related?: (PillarRef & { description?: string | null })[] | null;
  intro?: PortableTextBlock[] | null;
  heroImage?: SanityImage | null;
  cardImage?: SanityImage | null;
  networkDestinations?: NetworkDestination[] | null;
  seo: Seo;
  _updatedAt: string;
  articleCount: number;
  subtopics?: { _id: string; name: string; slug: string; description?: string | null }[];
}

export interface LifeStage {
  _id: string;
  name: string;
  slug: string;
  description?: string | null;
  minimumAgeMonths?: number | null;
  maximumAgeMonths?: number | null;
  primaryPillar?: PillarRef | null;
  pageIntro?: string | null;
  seo?: Seo | null;
  _updatedAt?: string;
  articleCount: number;
}

export interface ArticleCardData {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  heroImage?: SanityImage | null;
  pillar: PillarRef;
  publishedAt?: string | null;
  updatedAt?: string | null;
  _updatedAt: string;
}

export interface FaqItem { _key: string; question: string; answer: string }

export interface Article extends ArticleCardData {
  primaryTopic?: { name: string; slug: string } | null;
  secondaryTopics?: { name: string; slug: string }[] | null;
  lifeStages?: { name: string; slug: string }[] | null;
  minimumAgeMonths?: number | null;
  maximumAgeMonths?: number | null;
  searchIntent?: string | null;
  season?: string | null;
  body?: PortableTextBlock[] | null;
  faq?: FaqItem[] | null;
  relatedArticles?: ArticleCardData[] | null;
  networkDestinations?: NetworkDestination[] | null;
  author?: { name: string; slug?: string; role?: string; bio?: string } | null;
  lastReviewedAt?: string | null;
  sources?: { _key: string; sourceName?: string; sourceUrl?: string; lastCheckedAt?: string }[] | null;
  seo: Seo;
}

export interface Page {
  _id: string;
  title: string;
  slug: string;
  intro?: string | null;
  body?: PortableTextBlock[] | null;
  faq?: FaqItem[] | null;
  seo: Seo;
  _updatedAt: string;
}

export interface LinkItem { _id?: string; _key?: string; title: string; slug?: string; url?: string; description?: string | null }

export interface SiteSettings {
  siteName: string;
  shortName?: string | null;
  footerNote?: string | null;
  tagline?: string | null;
  footerTagline?: string | null;
  logo?: SanityImage | null;
  defaultOgImage?: SanityImage | null;
  organization?: {
    legalName?: string | null;
    url?: string | null;
    city?: string | null;
    kvkNumber?: string | null;
    vatNumber?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  mainNav: PillarRef[];
  footerNetworkLinks: LinkItem[];
  footerCompanyLinks: LinkItem[];
  footerLegalLinks: LinkItem[];
}

export interface CtaData { label?: string | null; href?: string | null; title?: string | null; text?: string | null }

export interface SeasonalBlock {
  _key: string;
  title: string;
  intro?: string | null;
  from: string;
  until: string;
  articles?: ArticleCardData[] | null;
}

/** Minimale artikeldata voor tekstlinks (homepage-blokken). */
export interface ArticleLink {
  _id: string;
  title: string;
  slug: string;
  pillar: PillarRef;
  lifeStageIds?: string[] | null;
}

export interface HomePage {
  heroTitle?: string | null;
  heroIntro?: string | null;
  heroImage?: SanityImage | null;
  heroCta?: CtaData | null;
  heroSecondaryCta?: CtaData | null;
  lifeStagesTitle?: string | null;
  lifeStagesIntro?: string | null;
  pillarsTitle?: string | null;
  pillarsIntro?: string | null;
  featuredArticles?: ArticleCardData[] | null;
  featuredTitle?: string | null;
  featuredIntro?: string | null;
  latestTitle?: string | null;
  seasonal?: SeasonalBlock[] | null;
  weekPickerTitle?: string | null;
  weekPickerIntro?: string | null;
  weekPickerCta?: CtaData | null;
  trustTitle?: string | null;
  trustItems?: { _key: string; title: string; text: string }[] | null;
  trustLink?: CtaData | null;
  feature?: CtaData | null;
  closingCta?: CtaData | null;
  seo: Seo;
  _updatedAt?: string;
}

export interface RouteEntry {
  path: string;
  kind: 'home' | 'pillar' | 'article' | 'page' | 'lifeStage' | 'pregnancyWeek' | 'pregnancyHub';
  id?: string;
  params?: Record<string, string>;
  noIndex: boolean;
  canonical?: string | null;
  lastmod?: string | null;
}

// --- Zwangerschap week voor week ---

export interface SourceRef { _key?: string; sourceName?: string; sourceUrl?: string; lastCheckedAt?: string }

export interface PregnancyWeekCard {
  _id: string;
  title: string;
  slug: string;
  week: number;
  weekStart?: number | null;
  excerpt?: string | null;
}

export interface PregnancyWeek extends PregnancyWeekCard {
  heroImage?: SanityImage | null;
  babyDevelopment?: PortableTextBlock[] | null;
  bodyChanges?: PortableTextBlock[] | null;
  tips?: PortableTextBlock[] | null;
  babySize?: { lengthCm?: number | null; lengthNote?: string | null; weightGram?: number | null; sourceName?: string | null; sourceUrl?: string | null } | null;
  faq?: FaqItem[] | null;
  complaintArticles?: ArticleCardData[] | null;
  networkDestinations?: NetworkDestination[] | null;
  sources?: SourceRef[] | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  lastReviewedAt?: string | null;
  seo: Seo;
  _updatedAt: string;
}

export interface PregnancyMilestone {
  _id: string;
  title: string;
  kind: 'controle' | 'vaccinatie' | 'regelzaak' | string;
  weekFrom: number;
  weekTo: number;
  summary?: string | null;
  href?: string | null;
}

export interface TrimesterInfo {
  trimester: 1 | 2 | 3;
  title: string;
  intro?: string | null;
  callIntro?: string | null;
  warningSigns?: string[] | null;
  sources?: SourceRef[] | null;
}

export interface PregnancyHub {
  title: string;
  intro?: string | null;
  body?: PortableTextBlock[] | null;
  faq?: FaqItem[] | null;
  seo: Seo;
  _updatedAt?: string;
}

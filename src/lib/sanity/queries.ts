/**
 * Alle GROQ-queries op één plek.
 * Dezelfde queries draaien tegen Sanity (productie) en tegen de testfixture (groq-js).
 * SEO-fallbacks worden in GROQ opgelost (coalesce), niet in componenten.
 */

const image = /* groq */ `{
  "asset": asset->{ _id, url, "width": metadata.dimensions.width, "height": metadata.dimensions.height, "lqip": metadata.lqip },
  crop, hotspot, alt, caption
}`;

const seo = /* groq */ `"seo": {
  "title": seo.title,
  "description": seo.description,
  "noIndex": seo.noIndex == true,
  "canonicalOverride": seo.canonicalOverride,
  "image": seo.image${image}
}`;

const pillarRef = /* groq */ `{ _id, name, navLabel, "slug": slug.current }`;

/** Interne of externe link (ctaLink) → href. Interne URL's worden centraal opgebouwd. */
const ctaHref = /* groq */ `"href": select(
  defined(internal) && internal->_type == "article" => "/" + internal->pillar->slug.current + "/" + internal->slug.current + "/",
  defined(internal) => "/" + internal->slug.current + "/",
  external
)`;
const cta = /* groq */ `{ title, text, label, ${ctaHref} }`;

/** Pijler waaronder de reeks "zwangerschap week voor week" valt (vaste document-ID in Sanity). */
export const PREGNANCY_PILLAR_ID = 'pillar-zwanger';

/** Portable Text-projectie: afbeeldingen en interne links (href centraal opgebouwd). Gebruik: veld[]${richText}. */
const richText = /* groq */ `{
  ...,
  _type == "image" => ${image},
  markDefs[]{
    ...,
    _type == "internalLink" => {
      ...,
      "href": select(
        reference->_type == "article" => "/" + reference->pillar->slug.current + "/" + reference->slug.current + "/",
        reference->_type == "topic" && reference->kind == "pillar" => "/" + reference->slug.current + "/",
        reference->_type == "page" => "/" + reference->slug.current + "/",
        reference->_type == "pregnancyWeek" => "/" + *[_id == "${PREGNANCY_PILLAR_ID}"][0].slug.current + "/" + reference->slug.current + "/"
      )
    }
  }
}`;

export const articleCard = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  heroImage${image},
  "pillar": pillar->${pillarRef},
  publishedAt,
  updatedAt,
  "_updatedAt": _updatedAt
}`;

/** Filter voor artikelen die publiek gerouteerd mogen worden. */
// Artikelen met een publicatiedatum in de toekomst verschijnen pas bij de eerste build ná die datum
// (dagelijkse geplande build in de workflow) — zo kan de redactie inplannen.
const routableArticle = /* groq */ `_type == "article" && defined(slug.current) && defined(pillar->slug.current) && pillar->kind == "pillar" && (!defined(publishedAt) || dateTime(publishedAt) <= dateTime(now()))`;
/** Zelfde filter, maar voor een array met references (filter vóór dereferentie). */
const routableArticleRef = /* groq */ `@->_type == "article" && defined(@->slug.current) && defined(@->pillar->slug.current) && @->pillar->kind == "pillar" && (!defined(@->publishedAt) || dateTime(@->publishedAt) <= dateTime(now()))`;
const pillarRefFilter = /* groq */ `@->kind == "pillar" && defined(@->slug.current)`;

export const SITE_SETTINGS_QUERY = /* groq */ `*[_type == "siteSettings" && _id == "siteSettings"][0]{
  siteName,
  tagline,
  footerTagline,
  logo${image},
  defaultOgImage${image},
  shortName,
  footerNote,
  organization{ legalName, url, city, kvkNumber, vatNumber, phone, email },
  "mainNav": mainNav[${pillarRefFilter}]->${pillarRef},
  footerNetworkLinks[]{ _key, title, url, description },
  "footerCompanyLinks": footerCompanyLinks[defined(@->slug.current)]->{ _id, title, "slug": slug.current },
  "footerLegalLinks": footerLegalLinks[defined(@->slug.current)]->{ _id, title, "slug": slug.current }
}`;

export const HOME_QUERY = /* groq */ `*[_type == "homePage" && _id == "homePage"][0]{
  heroTitle,
  heroIntro,
  heroImage${image},
  heroCta${cta},
  heroSecondaryCta${cta},
  lifeStagesTitle,
  lifeStagesIntro,
  pillarsTitle,
  pillarsIntro,
  "featuredArticles": featuredArticles[${routableArticleRef}]->${articleCard},
  featuredTitle,
  featuredIntro,
  latestTitle,
  feature${cta},
  closingCta${cta},
  ${seo},
  "_updatedAt": _updatedAt
}`;

export const PILLARS_QUERY = /* groq */ `*[_type == "topic" && kind == "pillar" && defined(slug.current)] | order(coalesce(navOrder, 999) asc, name asc){
  _id,
  name,
  navLabel,
  "slug": slug.current,
  heroTitle,
  description,
  intro,
  heroImage${image},
  faq[]{ _key, question, answer },
  hubCta${cta},
  "related": relatedTopics[${pillarRefFilter}]->{ _id, name, navLabel, "slug": slug.current, description },
  cardImage${image},
  networkDestinations[]{ _key, platform, externalId, externalUrl, relationType, priority, title, description },
  ${seo},
  "_updatedAt": _updatedAt,
  "articleCount": count(*[${routableArticle} && pillar._ref == ^._id && seo.noIndex != true]),
  "subtopics": *[_type == "topic" && parent._ref == ^._id && defined(slug.current)] | order(name asc){ _id, name, "slug": slug.current, description }
}`;

export const LIFE_STAGES_QUERY = /* groq */ `*[_type == "lifeStage" && defined(slug.current)] | order(coalesce(sortOrder, 999) asc){
  _id,
  name,
  "slug": slug.current,
  description,
  minimumAgeMonths,
  maximumAgeMonths,
  "primaryPillar": select(primaryPillar->kind == "pillar" && defined(primaryPillar->slug.current) => primaryPillar->${pillarRef}),
  pageIntro,
  ${seo},
  "_updatedAt": _updatedAt,
  "articleCount": count(*[${routableArticle} && references(^._id)])
}`;

export const ARTICLE_ROUTES_QUERY = /* groq */ `*[${routableArticle}]{
  _id,
  title,
  "slug": slug.current,
  "pillar": pillar->slug.current,
  "noIndex": seo.noIndex == true,
  "canonicalOverride": seo.canonicalOverride,
  "lastmod": coalesce(updatedAt, publishedAt, _updatedAt)
}`;

export const ARTICLES_BY_PILLAR_QUERY = /* groq */ `*[${routableArticle} && pillar._ref == $pillarId] | order(coalesce(publishedAt, _createdAt) desc)${articleCard}`;

export const ARTICLES_BY_LIFESTAGE_QUERY = /* groq */ `*[${routableArticle} && $id in lifeStages[]._ref] | order(coalesce(publishedAt, _createdAt) desc)${articleCard}`;

export const LATEST_ARTICLES_QUERY = /* groq */ `*[${routableArticle} && seo.noIndex != true] | order(coalesce(publishedAt, _createdAt) desc)[0...$limit]${articleCard}`;

export const ARTICLE_QUERY = /* groq */ `*[${routableArticle} && slug.current == $slug && pillar->slug.current == $pillar][0]{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  heroImage${image},
  "pillar": pillar->${pillarRef},
  "primaryTopic": primaryTopic->{ name, "slug": slug.current },
  "secondaryTopics": secondaryTopics[]->{ name, "slug": slug.current },
  "lifeStages": lifeStages[]->{ name, "slug": slug.current },
  minimumAgeMonths,
  maximumAgeMonths,
  searchIntent,
  season,
  body[]${richText},
  faq[]{ _key, question, answer },
  "relatedArticles": relatedArticles[${routableArticleRef}]->${articleCard},
  networkDestinations[]{ _key, platform, externalId, externalUrl, relationType, priority, title, description },
  "author": author->{ name, "slug": slug.current, role, bio },
  publishedAt,
  updatedAt,
  lastReviewedAt,
  sources[]{ _key, sourceName, sourceUrl, lastCheckedAt },
  ${seo},
  "_updatedAt": _updatedAt
}`;

/** Fallback voor gerelateerde artikelen: zelfde pijler, exclusief het huidige artikel. */
export const RELATED_FALLBACK_QUERY = /* groq */ `*[${routableArticle} && pillar._ref == $pillarId && _id != $id && seo.noIndex != true] | order(coalesce(publishedAt, _createdAt) desc)[0...3]${articleCard}`;

export const PAGE_ROUTES_QUERY = /* groq */ `*[_type == "page" && defined(slug.current)]{
  _id,
  title,
  "slug": slug.current,
  "noIndex": seo.noIndex == true,
  "canonicalOverride": seo.canonicalOverride,
  "lastmod": _updatedAt
}`;

export const PAGE_QUERY = /* groq */ `*[_type == "page" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  intro,
  body[]${richText},
  faq[]{ _key, question, answer },
  ${seo},
  "_updatedAt": _updatedAt
}`;

/** Gepubliceerde artikelen die NIET gerouteerd worden door ontbrekende verplichte velden (voor duidelijke buildmeldingen). */
/** Alle gepubliceerde sets "Cijfers en regels" (klein; één keer per build opgehaald). */
export const FACT_SETS_QUERY = /* groq */ `*[_type == "factSet" && !(_id in path("drafts.**"))] | order(series asc, validFrom asc){ _id, title, series, validFrom, validUntil, status, items[]{ key, label, value, unit }, sources[]{ sourceName, sourceUrl }, reviewDueAt }`;

/** Gepubliceerde artikelen waarvan de controledatum (reviewDueAt) is verstreken. Alleen waarschuwen, nooit de build blokkeren. */
export const REVIEW_OVERDUE_QUERY = /* groq */ `*[_type == "article" && !(_id in path("drafts.**")) && defined(reviewDueAt) && reviewDueAt < $today] | order(reviewDueAt asc){ _id, title, "slug": slug.current, "pillar": pillar->slug.current, reviewDueAt, reviewNote }`;

export const UNROUTABLE_ARTICLES_QUERY = /* groq */ `*[_type == "article" && !(${routableArticle}) && !(defined(publishedAt) && dateTime(publishedAt) > dateTime(now()))]{ _id, title, "slug": slug.current, "pillar": pillar->slug.current, "pillarKind": pillar->kind }`;

// --- Zwangerschap week voor week -------------------------------------------------------------

/** Weken die publiek mogen: goedgekeurd, minimaal twee bronnen, publicatiedatum niet in de toekomst. */
const routableWeek = /* groq */ `_type == "pregnancyWeek" && defined(slug.current) && defined(week) && reviewStatus == "approved" && count(sources) >= 2 && (!defined(publishedAt) || dateTime(publishedAt) <= dateTime(now()))`;

export const PREGNANCY_WEEKS_QUERY = /* groq */ `*[${routableWeek}] | order(week asc){
  _id, title, "slug": slug.current, week, weekStart, excerpt,
  "noIndex": seo.noIndex == true,
  "canonicalOverride": seo.canonicalOverride,
  "lastmod": coalesce(updatedAt, publishedAt, _updatedAt)
}`;

export const PREGNANCY_WEEK_QUERY = /* groq */ `*[${routableWeek} && slug.current == $slug][0]{
  _id, title, "slug": slug.current, week, weekStart, excerpt,
  heroImage${image},
  babyDevelopment[]${richText},
  bodyChanges[]${richText},
  tips[]${richText},
  babySize{ lengthCm, lengthNote, weightGram, sourceName, sourceUrl },
  faq[]{ _key, question, answer },
  "complaintArticles": complaintArticles[${routableArticleRef}]->${articleCard},
  networkDestinations[]{ _key, platform, externalId, externalUrl, relationType, priority, title, description },
  sources[]{ _key, sourceName, sourceUrl, lastCheckedAt },
  publishedAt, updatedAt, lastReviewedAt,
  ${seo},
  "_updatedAt": _updatedAt
}`;

export const PREGNANCY_MILESTONES_QUERY = /* groq */ `*[_type == "pregnancyMilestone" && !(_id in path("drafts.**")) && defined(weekFrom) && defined(weekTo)] | order(weekFrom asc, title asc){
  _id, title, kind, weekFrom, weekTo, summary,
  "href": coalesce(*[_id == ^.article._ref && ${routableArticle}][0]{ "h": "/" + pillar->slug.current + "/" + slug.current + "/" }.h, externalUrl)
}`;

export const TRIMESTERS_QUERY = /* groq */ `*[_type == "trimesterInfo" && !(_id in path("drafts.**"))] | order(trimester asc){
  trimester, title, intro, callIntro, warningSigns, sources[]{ _key, sourceName, sourceUrl }
}`;

export const PREGNANCY_HUB_QUERY = /* groq */ `*[_type == "pregnancyHub" && _id == "pregnancyHub"][0]{
  title, intro, body[]${richText}, faq[]{ _key, question, answer }, ${seo}, "_updatedAt": _updatedAt
}`;

/** Gepubliceerde weken die (nog) niet op de site komen, voor duidelijke buildmeldingen. */
export const UNROUTABLE_WEEKS_QUERY = /* groq */ `*[_type == "pregnancyWeek" && !(_id in path("drafts.**")) && !(${routableWeek}) && !(defined(publishedAt) && dateTime(publishedAt) > dateTime(now()))]{
  _id, week, "slug": slug.current, reviewStatus, "sourceCount": count(sources)
}`;

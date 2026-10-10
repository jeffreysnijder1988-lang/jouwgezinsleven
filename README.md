# JouwGezinsleven.nl — Astro + Sanity

Statische Astro-site met Sanity (project `amxuxo0p`, dataset `production`) als redactionele source of truth.
Canonieke specificatie: de project-docs (`ARCHITECTURE.md`, `CONTENT_MODEL.md`, `SEO_RULES.md`, …).
Migratiestatus en openstaande punten: [`docs/MIGRATION_STATUS.md`](docs/MIGRATION_STATUS.md).

## Snel starten

```bash
npm ci
cp .env.example .env          # SANITY_PROJECT_ID=amxuxo0p staat al goed
npm run dev                   # http://localhost:4321
npm run build                 # productie-output in dist/ (faalt hard als Sanity onbereikbaar is)
npm run qa                    # QA op dist/: H1, headings, meta, canonical, JSON-LD, links, sitemap ⇄ noindex
```

Testen zonder netwerk (testdata, altijd noindex + TESTBUILD-balk, nooit deployen):

```bash
npm run build:test
QA_INDEXABLE=1 CONTENT_SOURCE=fixture npm run build && npm run qa   # test ook sitemap/robots-logica
```

## Structuur

```
src/
  components/  global · navigation · seo · content · cards · network · ui
  layouts/     BaseLayout · HubLayout · ArticleLayout
  pages/       index · [slug] (pijlerhub of pagina) · [pillar]/[slug] (artikel) · 404 · sitemap.xml · robots.txt
  lib/
    content/   data access layer + centrale route-registry (getAllRoutes)
    sanity/    client (perspective "published") · GROQ-queries · image-URL's
    seo/       buildMeta (title, description, canonical, robots, OG)
    schema/    JSON-LD (Organization, WebSite, BreadcrumbList, Article, FAQPage)
    network/   Family Media Network-adapterlaag
    helpers/
  styles/      tokens.css (enige bron design tokens) · global · typography · utilities
studio/        Sanity Studio (schemas, structure) — `cd studio && npm i && npm run dev`
scripts/       import-legacy-html.mjs (ZIP → Sanity NDJSON) · qa-dist.mjs
tests/fixtures content.json (testscenario's) · sanity-snapshot.json (stand Sanity na migratie)
public/        .htaccess (canonicalisatie, headers, caching) · scripts/nav.js
```

## Content toevoegen

Nieuw artikel = nieuw `article`-document in Sanity met pijler + slug → publiceren → rebuild.
URL wordt `/{pijler}/{slug}/`. Geen code nodig. Drafts komen nooit in de build.

## Studio

```bash
cd studio && npm i
npx sanity login
npm run schema:deploy   # schema naar Content Lake (voor MCP/agents)
npm run deploy          # hosted Studio: https://jouwgezinsleven.sanity.studio
```

## Publiceren & deployen

Sanity publish → webhook → GitHub Actions `Publish` → build + QA + deploy-poort → SFTP/FTPS naar cPanel → live verificatie.
Zie [`docs/AUTOMATION_AND_PUBLISHING.md`](docs/AUTOMATION_AND_PUBLISHING.md) voor secrets, handmatige deploy en rollback.

```bash
npm run build && npm run qa && npm run verify   # lokaal controleren
npm run deploy:dry                               # toont wat er zou veranderen (DEPLOY_* in je shell)
```

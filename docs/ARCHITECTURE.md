# Architecture

## Doel

JouwGezinsleven moet honderden tot duizenden contentitems kunnen verwerken zonder dat iedere publieke URL als afzonderlijke handgemaakte webpagina onderhouden hoeft te worden.

## Hoofdarchitectuur

Sanity
↓
Astro data layer
↓
Layouts + components
↓
Static generation
↓
HTML / CSS / minimale JS
↓
cPanel

Waar actuele externe data nodig is:

Extern platform/API
↓
source adapter
↓
normalisatie
↓
JouwGezinsleven component
↓
publieke pagina

## Frontend

Gebruik Astro als basis.

Prioriteit:

1. statische HTML;
2. server/build-time data;
3. minimale client-side JavaScript;
4. interactieve islands alleen wanneer nodig.

Gebruik geen volledige client-side SPA voor gewone contentpagina's.

## Content

Sanity is source of truth voor:

- redactionele artikelen;
- onderwerpen;
- levensfasen;
- auteurs;
- redactionele landingspagina's;
- eigen gidsen;
- interne relaties;
- SEO-data;
- curated netwerkverwijzingen.

Sanity is NIET source of truth voor:

- Lomamo voorraad;
- Lomamo prijzen;
- opvangaanbiedersaccounts;
- speeltuinabonnementen;
- boekingen;
- bestellingen;
- externe platformvoorraad;
- transactionele CRM-data.

## Componentstructuur

Richt minimaal in:

src/
  components/
    global/
    content/
    cards/
    navigation/
    seo/
    network/
    ui/

  layouts/
    BaseLayout.astro
    ArticleLayout.astro
    HubLayout.astro
    ListingLayout.astro
    LandingLayout.astro

  pages/

  lib/
    sanity/
    seo/
    schema/
    network/
    helpers/

  styles/
    tokens.css
    global.css
    typography.css
    utilities.css

(Status 2026-09-29: ListingLayout en LandingLayout worden pas toegevoegd wanneer er een paginatype is dat ze nodig heeft. Daarnaast bestaat `lib/content/` als data access layer met de centrale route-registry.)

## BaseLayout

Iedere publieke pagina loopt via BaseLayout.

BaseLayout beheert minimaal:

- html/head
- metadata
- canonical
- Open Graph
- favicon
- globale styles
- Header
- main
- Footer

Pagina's mogen deze onderdelen niet dupliceren.

## Source adapters

Externe Studio Cutter-data wordt benaderd via adapters.

Voorbeeld:

src/lib/network/lomamo.ts
src/lib/network/welkespeeltuin.ts
src/lib/network/opvangkiezer.ts
src/lib/network/vakantiemetjongekinderen.ts

Publieke componenten mogen niet rechtstreeks allerlei externe API-structuren kennen.

Adapter:

externe data
↓
gestandaardiseerd intern object
↓
component

Hierdoor kan een externe backend later veranderen zonder de hele site te herschrijven.

## Deployment

De productiebuild is volledig statisch (`dist/`) en vereist geen Node-runtime op de server.

```
Sanity publish ─webhook→ GitHub repository_dispatch ─→ GitHub Actions "Publish"
   build (npm run build, perspective "published") → QA (qa-dist) → deploy-poort (verify-dist)
   → release-artifact (90 dagen) → scripts/deploy.sh (SFTP/FTPS, gefaseerd, manifest-gebaseerd)
   → cPanel document root → live verificatie
```

- Git is de source of truth voor code; Sanity voor content. De pipeline schrijft niets terug naar Git of Sanity.
- Deploy alleen na een geslaagde build, QA en deploy-poort. Een lopende deploy wordt nooit onderbroken; de nieuwste content wint.
- Alleen bestanden die de pipeline zelf plaatste, worden ooit verwijderd (manifest). De document root wordt nooit geleegd.
- Rollback: een eerdere release-artifact opnieuw deployen (`workflow_dispatch` met `rollback_run_id`), of de pre-deploy-snapshot terugzetten.
- Volledige beschrijving, secrets en procedures: `AUTOMATION_AND_PUBLISHING.md`.

Code-locaties: `.github/workflows/publish.yml`, `scripts/deploy.sh`, `scripts/verify-dist.mjs`, `scripts/qa-dist.mjs`, `scripts/sanity-webhook.mjs`, `deploy/sanity-webhook.json`.

## Environment variables

API keys en secrets:

- nooit hardcoden;
- nooit committen;
- via environment variables (lokaal `.env`, in CI GitHub Secrets/Environments);
- alleen publieke tokens naar clientcode wanneer technisch noodzakelijk en veilig.

## Performance

Voorkom:

- zware clientbundles;
- onnodige libraries;
- duplicated JS;
- layout shifts;
- enorme afbeeldingen;
- third-party scripts zonder duidelijke functie.

## Architectuurwijzigingen

Een fundamentele wijziging aan stack, routing, datamodel of source-of-truth moet eerst worden beschreven voordat deze wordt geïmplementeerd.

## Zwangerschap week voor week (23-10-2026)

- Sanity-typen: `pregnancyWeek` (één per week; week 1–3 samen via `weekStart`), `pregnancyMilestone` (afspraken/regelzaken met weekFrom–weekTo), `trimesterInfo` (3x, alarmsignalen) en singleton `pregnancyHub` (tekst weekoverzicht).
- Routes via de route-registry onder de pijler met ID `pillar-zwanger` (`PREGNANCY_PILLAR_ID` in `lib/sanity/queries.ts`): `/zwanger/<n>-weken-zwanger/` en `/zwanger/week-voor-week/`. Gerenderd door `pages/[pillar]/[slug].astro` met `PregnancyWeekLayout` en `PregnancyHubLayout`.
- Een week komt alleen online met `reviewStatus = approved`, minimaal 2 bronnen en een publicatiedatum die niet in de toekomst ligt; anders een buildwaarschuwing.
- Weekoverzicht is noindex tot er 6 indexeerbare weken zijn (`PREGNANCY_HUB_MIN_INDEXABLE`).
- Geen medische review (besluit 23-10-2026): Article-schema, geen MedicalWebPage, vaste disclaimer in de template. CI controleert dit.

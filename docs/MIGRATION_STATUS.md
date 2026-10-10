# Migratiestatus — JouwGezinsleven naar Astro + Sanity

Stand: 10 oktober 2026 (code op GitHub, CI groen)

## Bron

ZIP met de huidige statische site. Deze bevat 8 HTML-pagina's (home, 6 pijlerhubs, 404), `css/site.css`, logo, hero-foto, `.htaccess`, `robots.txt`, `sitemap.xml` en `tools/build-categorie.py`.

## Belangrijkste bevindingen oude site

- **Artikelen**: het aantal is 0. Alle artikelkaarten ("Uitgelicht", "Nieuw op de site", "Veel gelezen" en 36 kaarten op de hubs) linken naar pagina's die niet bestaan. Ze zijn gegenereerd door `build-categorie.py`, inclusief datums.
- **Dode links**: 245 dode interne links naar 93 unieke niet-bestaande URL's (`/thema/*`, subthema's, `/over/`, `/contact/`, `/privacy/`, `/cookies/`, `/disclaimer/`, `/affiliate-disclosure/`, `/artikelen/`, `/nieuwsbrief/`, levensfase-URL's).
- **Ontbrekende afbeeldingen**: 48 (kaartfoto's en OG-afbeeldingen).
- **Formulieren**: nieuwsbrief (`/nieuwsbrief/aanmelden/`) en zoeken (`/zoeken/`) posten naar endpoints die niet bestaan. Het SearchAction-schema wijst ook naar die niet-bestaande zoekpagina.
- **Sitemap**: noemt 6 URL's die niet in de ZIP zitten: `/thema/`, `/over/`, `/contact/` en 3 artikelen. Controleer of die live bestaan.
- **Vakantiepijler**: de URL is `/gezinsvakantie/`, het menulabel "Vakantie". Dat is behouden.
- **Contrast**: meerdere fouten op de oude site, bijvoorbeeld footertekst op sage (2,8:1) en grijze meta-tekst (4,0:1). In de nieuwe versie opgelost.
- **Te controleren claims**: sommige teksten bevatten feiten zonder bronvermelding. Zie hieronder.

## Wat is gemigreerd (Sanity, gepubliceerd — 1-op-1 van de oude site)

- **Homepage** (`homePage`): H1, intro, hero-foto met alt, knop "Kies de fase", titels van de levensfasen, featureblok WelkeSpeeltuin, SEO-titel en -description.
  - Weggelaten: de knop "Over ons", want `/over/` bestaat niet.
- **6 pijlers** (`topic`): hub-H1, intro, SEO-titel en -description, 3 FAQ's per hub, CTA-blok en "Ook interessant".
- **Levensfasen**: labels en leeftijden volgens de oude site. Baby en Peuter linken naar `/baby-peuter/` in plaats van naar de niet-bestaande sub-URL's.
- **siteSettings**:
  - sitenaam en woordmerk, tagline en affiliate-melding;
  - uitgever Studio Cutter (Arnhem, KvK, BTW, telefoon);
  - logo.
- **Afbeeldingen**: hero-foto en logo staan als assets in Sanity. Het logo staat daarnaast in `/public/img` als merkbestand.

## Bewust niet gemigreerd

- Artikelkaarten, "Veel gelezen", "Nieuw op de site", thema-pillen, uitjes-grid en subthema-chips: ze verwijzen naar niet-bestaande content. De secties staan in de templates en verschijnen automatisch zodra er gepubliceerde artikelen zijn.
- Nieuwsbrief- en zoekformulier: er is geen werkende koppeling.
- `litespeed.conf`: een W3TC-restant, niet nodig.
- `tools/build-categorie.py`: vervangen door de templates.

## Te controleren feitelijke claims (EDITORIAL_RULES)

Overgenomen zonder herschrijven. Bron toevoegen of aanpassen vóór livegang:

- Zwanger-FAQ: zwangerschapsverlof 6–4 weken en minimaal 16 weken; verloskundige 6–8 weken.
- Kinderopvang-FAQ: "overheid vergoedt ruwweg 80 tot 90 procent".
- Baby & Peuter-FAQ: slaapuren en vaste voeding vanaf 4–6 maanden.
- Home en Eropuit: "Meer dan 4.000 speeltuinen" (moet kloppen met WelkeSpeeltuin).
- Kinderopvang-CTA: "vergelijk op beoordelingen" (heeft Opvangkiezer die functie?).
- Gezinsvakantie-CTA: "eerlijke reviews" (heeft Rustmetkids die functie?).

## Vóór productie-deploy

- [ ] Bevestigen of de 6 sitemap-URL's buiten de ZIP live bestaan. Zo ja: aanleveren en migreren; zo nee: uit Google laten vallen of redirecten.
- [ ] Privacyverklaring, contact, over en disclaimer als `page` in Sanity en koppelen in `siteSettings` (footerkolommen verschijnen dan vanzelf).
- [ ] Claims hierboven controleren.
- [ ] `cd studio && npx sanity login && npm run schema:deploy && npm run deploy`.
- [x] GitHub-repo `jeffreysnijder1988-lang/jouwgezinsleven` aangemaakt; `main` gepusht. Publish-runs 1 en 2 (push) groen: typecheck, fixture-tests, productiebuild, QA en deploy-poort. Deploy overgeslagen omdat `AUTO_DEPLOY_TARGET` niet gezet is.
- [x] Actions op Node 24-versies (checkout@v5, setup-node@v5, upload-artifact@v6, download-artifact@v7).
- [ ] Environments `staging` en `production` aanmaken, met per environment de secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` en `DEPLOY_PASSWORD` óf `DEPLOY_SSH_KEY` (+ `DEPLOY_KNOWN_HOSTS` bij sftp).
- [ ] Repo-variabelen: `DEPLOY_PROTOCOL` (`sftp` of `ftps`), optioneel `DEPLOY_PORT`, `STAGING_URL`, `PRODUCTION_URL`. `AUTO_DEPLOY_TARGET` pas zetten na een geslaagde handmatige staging-deploy.
- [ ] Staging-deploy via Actions → Publish → Run workflow, target `staging` (`PUBLIC_NOINDEX_SITE=1` gaat automatisch). Controle op echte Apache (.htaccess, CSP, headers).
- [ ] Na 19 oktober 2026 (`ubuntu-latest` → Ubuntu 26): eerste deploy-run controleren op de `lftp`-installatie.
- [ ] Na livegang: sitemap indienen in Search Console en 404's volgen.

## Daarna: geautomatiseerde publicatie

- Sanity-webhook bij publish → GitHub `repository_dispatch` (`sanity-publish`). De workflow bouwt al; deployt pas als repo-variabele `AUTO_DEPLOY_TARGET` op `staging` of `production` staat (default `none`).
- De AI-pipeline schrijft alleen drafts (`origin: ai-assisted`, `reviewStatus: needs_review`).
- Eerste artikelen: de 36 titels van de oude hubs zijn een bruikbare contentplanning (zoekintentie per pijler), maar vragen nieuwe, echte content.
- `AUTOMATION_AND_PUBLISHING.md` uitwerken.

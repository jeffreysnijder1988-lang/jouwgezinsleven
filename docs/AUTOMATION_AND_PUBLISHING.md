# Automation & Publishing

## Doel

Een redacteur publiceert in Sanity en de wijziging staat binnen enkele minuten live op jouwgezinsleven.nl. Daarvoor is geen HTML-werk, geen lokale Astro en geen FTP nodig. Sitemap, canonicals en structured data worden automatisch opnieuw gegenereerd.

## De keten

```
Sanity: publiceren / wijzigen / depubliceren
  → Sanity-webhook (alleen gepubliceerde, publiek gebruikte content)
  → GitHub API: repository_dispatch "sanity-publish"
  → GitHub Actions workflow "Publish" (.github/workflows/publish.yml)
      plan    : trigger + doel bepalen (AUTO_DEPLOY_TARGET)
      build   : npm ci → astro check → testscenario's → npm run build (perspective "published")
                → npm run qa → verify-dist (deploy-poort) → release als artifact (90 dagen)
      deploy  : snapshot live bestanden → scripts/deploy.sh (gefaseerd, incrementeel)
                → live verificatie (_release.txt, /, /sitemap.xml, /robots.txt, 404)
  → nieuwe versie live
```

Andere triggers voor dezelfde workflow:

- **push naar `main`**: codewijzigingen.
- **Dagelijks om 04:10 UTC**: artikelen met een `publishedAt` in de toekomst gaan dan live.
- **Handmatig**: Actions → Publish → Run workflow.

## Wat de build tegenhoudt (en productie ongewijzigd laat)

| Controle | Waar |
|---|---|
| Sanity onbereikbaar of query-fout | `src/lib/content/source.ts` |
| Ontbrekend hoofdmenu of geen pijlers | `getAllRoutes()` contentvalidatie |
| Gepubliceerd artikel of pagina zonder titel, of met ongeldige slug | idem |
| URL-conflict (twee documenten op één URL) | idem |
| Lege of dubbele H1, ontbrekende meta/canonical, dode interne links, ongeldige JSON-LD, drafts in de output, noindex-pagina in de sitemap | `scripts/qa-dist.mjs` |
| Ontbrekende index.html, 404.html, sitemap.xml, robots.txt of .htaccess | `scripts/verify-dist.mjs` |
| Sitemap leeg of zonder homepage; robots blokkeert productie; canonical op een ander domein; test-/fixturebuild | idem |
| Aantal pagina's daalt meer dan 50% t.o.v. live (verkeerde dataset, massaal depubliceren) | idem; bewust overrulen met de input `allow_content_drop` |

Waarschuwingen die de build niet stoppen, maar wel in de log verschijnen:

- een gepubliceerd artikel zonder pijler of slug (wordt niet gepubliceerd);
- een homepage zonder H1-titel.

Drafts komen nooit in de build: de client gebruikt `perspective: "published"`. Een draft triggert ook geen webhook.

## Sanity-webhook

Configuratie: `deploy/sanity-webhook.json`. Aanmaken met `node scripts/sanity-webhook.mjs create`, of handmatig in sanity.io/manage → API → Webhooks.

| Instelling | Waarde |
|---|---|
| Type | document |
| Dataset | production |
| Trigger | create, update, delete (depubliceren = delete) |
| Drafts / versies | uit |
| Filter | `_type in ["article","topic","lifeStage","page","siteSettings","homePage","author"] && !(delta::operation() == "update" && delta::changedOnly((sourceNotes, reviewStatus, origin, legacyUrl)))` |
| Projection | `{"event_type":"sanity-publish","client_payload":{"id":_id,"type":_type,"operation":delta::operation(),"slug":…}}` |
| URL | `https://api.github.com/repos/<owner>/<repo>/dispatches` (POST) |
| Headers | `Authorization: Bearer <GITHUB_DISPATCH_TOKEN>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28` |

Wijzigingen die alleen interne velden raken (bronnotities, reviewstatus, herkomst, legacy-URL) triggeren geen build. Assets, onbekende types en drafts triggeren ook niets.

**Beveiliging:** de webhook-URL is de GitHub API, niet een eigen endpoint. Zonder geldig token kan niemand een build starten. Het token is een fine-grained PAT voor alleen deze repo, met alleen "Contents: read & write". De payload komt in de workflow alleen via environment variables binnen en wordt gesaneerd; hij wordt nooit uitgevoerd.

## Deployment naar cPanel

Methode, in volgorde van voorkeur: SFTP (sleutel en host-key pinning), daarna expliciete FTPS. Onversleutelde FTP wordt geweigerd tenzij `ALLOW_PLAIN_FTP=1`. SSH/rsync met een atomische symlink-wissel is niet gebouwd, omdat niet vaststaat dat de Superspace-account shell-toegang heeft. Zie "Beperkingen".

`scripts/deploy.sh` voorkomt halve deploys en werkt zo:

1. Het vergelijkt de nieuwe release met `.deploy-manifest` op de server (SHA-256 per bestand) en uploadt alleen wat gewijzigd is.
2. **Fase A**: nieuwe assets. Die hebben nieuwe bestandsnamen, dus de live site werkt gewoon door. Een fout hier laat productie volledig intact.
3. **Fase B**: alle gewijzigde pagina's worden eerst als tijdelijk bestand geüpload en pas daarna per bestand hernoemd. Een bezoeker ziet nooit een half geschreven pagina.
4. **Fase C**: alleen bestanden die deze straat zelf eerder plaatste en die niet meer bestaan, worden verwijderd; lege mappen worden opgeruimd. Oude gehashte assets blijven één release langer staan. Bestanden die niet door de straat zijn geplaatst (oude site, `.well-known`, andere mappen) worden nooit aangeraakt. De document root wordt nooit leeggemaakt.
5. **Fase D**: manifesten en `_release.txt` worden als laatste geschreven.
6. **Verificatie**: live `_release.txt` moet de nieuwe release tonen; `/`, `/sitemap.xml` en `/robots.txt` moeten 200 geven en een onbekende URL 404.

Een lock (`.deploy-lock`) voorkomt dat handmatige en automatische deploys tegelijk schrijven. Een lock die ouder is dan 30 minuten wordt als verlopen beschouwd. Manifesten en lock zijn via `.htaccess` niet publiek opvraagbaar.

## Concurrency en loops

- Eén publicatiebaan (`concurrency: publish`). Een lopende deploy wordt nooit afgebroken; een nieuwere wachtende run vervangt oudere wachtende runs. Daardoor staat altijd de nieuwste content live, ook bij tien snelle publicaties achter elkaar.
- De workflow schrijft niets naar Git of Sanity. Er is dus geen trigger-lus mogelijk.

## Secrets en variabelen (GitHub → Settings)

| Naam | Soort | Waar | Doel |
|---|---|---|---|
| `AUTO_DEPLOY_TARGET` | variable | repository | `none` (standaard), `staging` of `production` bij Sanity-, push- en dagelijkse triggers |
| `PRODUCTION_URL` | variable | repository | bijv. `https://jouwgezinsleven.nl` |
| `STAGING_URL` | variable | repository | publieke URL van de testlocatie |
| `DEPLOY_PROTOCOL` | variable | environment | `sftp` of `ftps` |
| `DEPLOY_PORT` | variable | environment | optioneel |
| `DEPLOY_HOST` | secret | environment | hostnaam van cPanel/Superspace |
| `DEPLOY_USER` | secret | environment | (bij voorkeur apart) FTP/SFTP-account |
| `DEPLOY_PASSWORD` | secret | environment | wachtwoord, óf: |
| `DEPLOY_SSH_KEY` | secret | environment | private key (sftp) |
| `DEPLOY_KNOWN_HOSTS` | secret | environment | uitvoer van `ssh-keyscan -p <poort> <host>` (verplicht bij sftp) |
| `DEPLOY_PATH` | secret | environment | absolute document root |
| `SANITY_READ_TOKEN` | secret | repository | alleen nodig als de dataset private wordt |
| `GITHUB_DISPATCH_TOKEN` | — | alleen in de Sanity-webhookheader | fine-grained PAT |

Environments: `staging` en `production`, elk met eigen `DEPLOY_*`. Optioneel: "required reviewers" op `production` voor een handmatige goedkeuring per deploy.

## Handmatig deployen

Ga naar GitHub → Actions → Publish → Run workflow en kies `staging` of `production`. De workflow doet dan een nieuwe build met de actuele gepubliceerde content, zonder dat er eerst iets gewijzigd hoeft te worden.

Lokaal (noodgeval): `npm run build && npm run qa && npm run verify && npm run deploy`, met de `DEPLOY_*`-variabelen in je shell.

## Rollback

1. **Normale rollback** (verkeerde content, foute build):
   - ga naar Actions → Publish → Run workflow;
   - kies het juiste doel;
   - vul bij `rollback_run_id` de run-ID in van de laatste goede Publish-run.

   Die release (bewaard 90 dagen) wordt incrementeel teruggezet: pagina's die sindsdien zijn bijgekomen worden verwijderd, verwijderde pagina's komen terug. Er wordt niets opnieuw gebouwd.
2. **Content structureel terugzetten**: zet het document in Sanity terug via History → Restore en publiceer. De keten doet de rest.
3. **Eerste deploy terugdraaien** (terug naar de oude statische site): iedere deploy bewaart een artifact `pre-deploy-snapshot-<doel>` met de live versies van alle bestanden die hij overschreef of verwijderde. Download dat artifact en draai `scripts/deploy.sh restore <map>`.
4. **Mislukte deploy halverwege**: draai de workflow opnieuw. De deploy is idempotent en uploadt alleen wat nog afwijkt. Of doe optie 1.

## Verantwoordelijkheden

- **Redactie**: publiceert in Sanity. Publiceren is de menselijke goedkeuring; AI-concepten blijven drafts met `reviewStatus`.
- **Workflow**: bouwt, controleert en deployt alleen geldige output.
- **Beheer (Jeffrey)**: secrets, `AUTO_DEPLOY_TARGET`, rollback bij problemen, webhook-attempts in sanity.io/manage.

## Foutafhandeling en logging

- Iedere run toont in de Job Summary: trigger (documenttype, id, operatie), doel, buildstatus met `_release.txt`, deploystatus en tijd.
- Bij een mislukte run stuurt GitHub standaard een e-mail naar de eigenaar van het token of de workflow.
- De mislukte stap zie je in de Actions-log; secrets worden daar gemaskeerd.
- De webhookkant (afleveringen, HTTP-codes) is terug te vinden in sanity.io/manage → API → Webhooks → attempts.

## Beperkingen

- Geen atomische wissel van de hele site, want er is geen SSH/symlink-garantie op Superspace. Het venster waarin pagina's van twee releases naast elkaar staan, beperkt zich tot fase B (seconden). Assets blijven voor beide releases beschikbaar.
- Bestanden van de oude statische site (`css/`, `tools/`, `litespeed.conf` …) blijven staan tot ze na de eerste geslaagde productie-deploy handmatig worden opgeruimd.
- Artifacts verlopen na 90 dagen; oudere rollbacks gaan via Git (een oude commit opnieuw bouwen) plus content-history in Sanity.

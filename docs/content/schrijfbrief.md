# Schrijfbrief JouwGezinsleven.nl — batch 3 (13 oktober 2026)

JouwGezinsleven.nl is een Nederlandse informatiesite voor gezinnen (zwangerschap t/m tiener), gebouwd door StudioCutter (Arnhem). Doel: concrete vragen van ouders beantwoorden, organisch zoekverkeer, en waar het inhoudelijk past doorverwijzen naar eigen platforms (vooral Lomamo.nl).

## Schrijfregels (verplicht)
- Nederlands, natuurlijk, praktisch, rustig, warm, concreet. Spreek de lezer aan met "je".
- Begin direct met het antwoord. Eerste alinea (na de excerpt) geeft de kern in 2–4 zinnen. Geen "In dit artikel…", geen "uitgebreide gids", geen clichés, geen opgeblazen AI-zinnen, geen herhaling, geen em-dash-overdaad.
- Lengte: 900–1.500 woorden body. Korte alinea's (max ~4 zinnen). H2 per echte deelvraag (gebruik de vragen uit de briefing), H3 waar nuttig. Lijsten waar ze helpen scannen. Een tabel kan niet; gebruik dan een lijst.
- **Verzin niets.** Geen bedragen, percentages, data, regels, onderzoeken, quotes, ervaringsverhalen ("wij hebben getest"), merknamen-eigenschappen of locaties die je niet hebt geverifieerd. Feiten die veranderen (regels, toeslagen, bedragen, termijnen, airline-regels) MOET je verifiëren met WebSearch/WebFetch bij officiële bronnen (rijksoverheid.nl, uwv.nl, belastingdienst.nl / toeslagen, thuisarts.nl, veiligheid.nl, voedingscentrum.nl, ncj.nl, kinderopvang-organisaties, de airline zelf). Kun je iets niet verifiëren: laat het weg of formuleer algemeen ("check bij je zorgverzekeraar").
- Voor medische/gezondheidsonderwerpen: algemene informatie, verwijs bij twijfel naar huisarts/consultatiebureau/verloskundige. Geen doseringen van medicijnen tenzij letterlijk van thuisarts.nl en dan met bron.
- Externe links in de tekst naar de officiële bron zijn prima (markdown-link met volledige https-URL).
- Interne links: alleen naar URL's in de lijst "Batch" hieronder of naar pijlerpagina's (/zwanger/, /baby-peuter/, /kinderopvang/, /eropuit/, /feestjes/, /gezinsvakantie/). Gebruik markdown-links met het pad, bv. [kosten van kinderopvang](/kinderopvang/kosten-kinderopvang/). 1–3 interne links per artikel, alleen waar logisch.
- Netwerklinks: alleen waar het echt past bij de zoekintentie. Lomamo-links ALLEEN naar de collectie-URL's hieronder (geen productnamen, prijzen of eigenschappen verzinnen). Formuleer redactioneel en eerlijk (bv. "Bij Lomamo vind je …"), max 1–2 Lomamo-links in de tekst, en vermeld dezelfde in `network`.
- NIET doorlinken naar welkespeeltuin.nl (nog niet live). Geen concrete uitjes/locaties noemen die je niet hebt geverifieerd; generieke typen uitjes is prima.
- Netwerkrichtlijn: JouwGezinsleven richt zich niet op de commerciële productintentie van Lomamo ("speelgoed 2 jaar kopen"); wij beantwoorden de informatieve vraag en verwijzen contextueel.

## Cijfers uit reeksen (verplicht waar een reeks bestaat)
Officiële, jaarlijks wisselende gegevens staan op één plek in Sanity ("Cijfers en regels"). Typ die NOOIT als los getal in de tekst, maar gebruik de notatie; de build vult de waarde in die vandaag geldt.
- Inline in tekst én in FAQ-antwoorden: `{{fact:reeks.sleutel}}` → bijv. `{{fact:kot-uurprijzen.bso}}` wordt "€ 9,98". Het jaartal van de geldende set: `{{fact:kot-uurprijzen._year}}`. Schrijf dus "In {{fact:kot-uurprijzen._year}} krijg je toeslag over maximaal {{fact:kot-uurprijzen.bso}} per uur."
- Als lijst, op een eigen regel: `[[FACTS:kot-uurprijzen]]` (alle waarden), `[[FACTS:kot-uurprijzen|next]]` (ook de volgende set als die al bekend is), `[[FACTS:kot-betaaldata|upcoming|limit=3]]` (eerstvolgende betaaldatums).
- Beschikbare reeksen:
  - `kot-uurprijzen`: maximum uurprijzen kinderopvangtoeslag. Sleutels `dagopvang`, `bso`, `gastouder`.
  - `kot-betaaldata`: betaaldatums toeslagen (alleen als lijst met `upcoming`).
- Rekenvoorbeelden die een bedrag combineren met een percentage of een eigen uurprijs blijven gewone tekst en noemen expliciet het jaar ("met de bedragen van 2026").
- Ontbreekt een reeks die je nodig hebt: schrijf het getal met jaartal en meld in `notes` dat er een reeks voor zou moeten komen.

## Lomamo-collecties (enige toegestane Lomamo-URL's)
- Speelmatten — https://lomamo.nl/collections/speelmatten
- Soft Play — https://lomamo.nl/collections/soft-play
- Pikler klimdriehoeken — https://lomamo.nl/collections/pikler-klimdriehoeken
- Houten klimrekken — https://lomamo.nl/collections/houten-klimrekken
- Ballenbakken — https://lomamo.nl/collections/ballenbakken
- Springkussens — https://lomamo.nl/collections/springkussens
- Speelhuisjes — https://lomamo.nl/collections/speelhuisjes
- Montessori speelgoed — https://lomamo.nl/collections/montessori-speelgoed
- Leertorens — https://lomamo.nl/collections/leertorens
- Houten speelgoed — https://lomamo.nl/collections/houten-speelgoed
- Loopwagens — https://lomamo.nl/collections/loopwagens
- Loopfietsen & loopauto's — https://lomamo.nl/collections/loopfietsen-loopautos
- Babykamer compleet — https://lomamo.nl/collections/babykamer
- Ledikanten — https://lomamo.nl/collections/ledikanten
- Commodes — https://lomamo.nl/collections/commodes
- Kledingkasten — https://lomamo.nl/collections/kasten
- Peuterbedden — https://lomamo.nl/collections/peuterbed
- Vloerbedden — https://lomamo.nl/collections/vloerbed
- Huisbedden — https://lomamo.nl/collections/huisbedden
- Meegroeibedden — https://lomamo.nl/collections/meegroeibed
- Bedomranders — https://lomamo.nl/collections/bedomranders
- Matrassen — https://lomamo.nl/collections/matrassen
- Speelgoed 1 jaar … 6 jaar — https://lomamo.nl/collections/speelgoed-1-jaar (t/m speelgoed-6-jaar)
- Kinderkamer inrichting — https://lomamo.nl/collections/slaapkamer-inrichting

Andere netwerksites (alleen homepage, alleen waar logisch): https://www.opvangkiezer.nl/ (kinderopvang vergelijken), https://vakantiemetjongekinderen.nl/ (rustige vakantieparken en huisjes voor gezinnen met jonge kinderen). NIET meer naar rustmetkids.nl linken (vervangen).

## Al live — hier mag je naar linken (alleen deze URL's)
- Zwanger: /zwanger/zwangerschapsverlof/ · /zwanger/kraampakket/ · /zwanger/babykamer-inrichten/ · /zwanger/geboorteverlof-partner/ · /zwanger/eerste-symptomen-zwangerschap/ · /zwanger/uitgerekende-datum-berekenen/
- Baby & peuter: /baby-peuter/wanneer-gaat-baby-kruipen/ · /baby-peuter/tandjes-baby/ · /baby-peuter/van-ledikant-naar-peuterbed/ · /baby-peuter/slaapregressie/ · /baby-peuter/sprongetjes-baby/ · /baby-peuter/wakkertijden-baby/ · /baby-peuter/loopwagen-loopstoel/ · /baby-peuter/zindelijk-worden/
- Kinderopvang: /kinderopvang/kinderopvangtoeslag/ · /kinderopvang/kosten-kinderopvang/ · /kinderopvang/bso/ · /kinderopvang/gastouder/
- Eropuit: /eropuit/uitjes-bij-regen/ · /eropuit/uitjes-met-peuter/ · /eropuit/dagje-uit-met-kinderen/ · /eropuit/gratis-uitjes-met-kinderen/
- Feestjes: /feestjes/traktatie-school/ · /feestjes/traktatie-peuter/ · /feestjes/kinderfeestje-thuis/ · /feestjes/kinderfeestje-ideeen/ · /feestjes/speurtocht-kinderfeestje/ · /feestjes/uitnodiging-kinderfeestje/
- Gezinsvakantie: /gezinsvakantie/vliegen-met-baby/ · /gezinsvakantie/vakantie-met-peuter/ · /gezinsvakantie/autorit-met-kinderen/ · /gezinsvakantie/vakantie-met-baby/
- Pijlers: /zwanger/ · /baby-peuter/ · /kinderopvang/ · /eropuit/ · /feestjes/ · /gezinsvakantie/
- Fasepagina's (/baby/, /peuter/ enz.) NIET linken: die worden nog als platte tekst weergegeven.

## Batch 3 (gaat tegelijk online, onderling linken mag)
- /feestjes/gezonde-traktaties/ · /feestjes/afscheid-kinderdagverblijf/ · /feestjes/escape-room-kinderfeestje/
- /kinderopvang/kinderopvangtoeslag-aanvragen/ · /kinderopvang/betaaldata-kinderopvangtoeslag/ · /kinderopvang/recht-op-kinderopvangtoeslag/ · /kinderopvang/kinderopvang-2027/ · /kinderopvang/gastouder-of-kinderdagverblijf/
- /baby-peuter/regeldagen-baby/ · /baby-peuter/gehoorbescherming-baby/

Interne links: 2–4 per artikel, alleen waar het de lezer echt verder helpt.

## Kannibalisatie: hub-and-spoke (verplicht)
Bestaande hubs bevatten al een korte sectie over sommige batch-3-onderwerpen. Een batch-3-artikel gaat dieper op precies zijn eigen vraag, herhaalt de hub niet en linkt 1x terug naar de hub. Behandel andere deelonderwerpen hooguit in één zin met een link.
- /kinderopvang/kinderopvangtoeslag/ (hub) heeft H2's: wie heeft recht, hoeveel in 2026, aanvragen, wanneer betaald, wijzigingen doorgeven, wat verandert in 2027.
  - aanvragen = het stappenplan (Mijn toeslagen, DigiD, gegevens, termijnen, terugwerkende kracht, daarna wijzigen). Niet de hoogte uitrekenen.
  - betaaldata = wanneer en hoe er betaald wordt (betaaldata 2026 en, als gepubliceerd, 2027; voorschot vs. definitieve berekening; te laat/niet gestort). Exacte datums ALLEEN van belastingdienst.nl/rijksoverheid.nl; kun je ze niet verifiëren: niet noemen.
  - recht-op = de voorwaarden in detail (werk/studie/traject, geregistreerde opvang LRK, contract, partner, situaties zonder recht, stoppen met werken).
  - kinderopvang-2027 = wat er per 2027 verandert/vastligt volgens het kabinet. Alleen besloten of officieel aangekondigd beleid; onderscheid duidelijk "besloten" vs "plan". Check de actuele stand (oktober 2026).
- /kinderopvang/gastouder/ heeft al een H2 "Gastouder of kinderdagverblijf: wat is het verschil?". gastouder-of-kinderdagverblijf = keuzehulp: welke opvang past bij jouw kind en situatie (leeftijd, temperament, werktijden, flexibiliteit, ziek kind, kosten in grote lijnen met link naar /kinderopvang/kosten-kinderopvang/). Hoofd-CTA Opvangkiezer.
- /feestjes/traktatie-school/ en /feestjes/traktatie-peuter/ bevatten ideeënlijsten. gezonde-traktaties = invalshoek gezond: wat telt als gezond (Voedingscentrum), principes, ideeën gezond per type (fruit, groente, hartig, niet-eetbaar), en wat je vermijdt. Andere ideeën dan in de bestaande artikelen waar mogelijk.
- /baby-peuter/sprongetjes-baby/ is er al. regeldagen-baby = wat een regeldag is (term gebruikt in Nederland), verschil met sprongetje, clusteren en groeispurt, wat je kunt doen, wanneer naar consultatiebureau/huisarts. Neutraal en eerlijk over het wetenschappelijk bewijs.

## Netwerk per artikel
- Kinderopvang-artikelen: Opvangkiezer (homepage, relationType platform) als network-item, in de tekst max 1 vermelding waar logisch.
- afscheid-kinderdagverblijf: geen Lomamo tenzij een collectie echt aansluit bij een afscheidscadeau (bv. houten speelgoed of montessori speelgoed voor de groep) — redactioneel en zonder productclaims, anders network leeg.
- gehoorbescherming-baby: er is GEEN Lomamo-collectie voor gehoorbescherming; geen Lomamo-link. Geen merken of producteigenschappen noemen. Bronnen: hoorstichting.nl, rivm.nl/geluid, ncj.nl, thuisarts.nl, gezondheidsfondsen. Decibelwaarden alleen met bron.
- escape-room-kinderfeestje: zelf maken thuis voor 8–12 jaar (opbouw, raadsels-typen, tijd, materialen). Geen bedrijven noemen.
- regeldagen-baby: geen netwerk.

## Uitvoerformaat — één bestand per artikel
Pad: `<scratchpad>/articles/<pillar-slug>/<slug>.md`. YAML-frontmatter, daarna de body in Markdown.

```
---
pillar: zwanger            # zwanger | baby-peuter | kinderopvang | eropuit | feestjes | gezinsvakantie
slug: zwangerschapsverlof
title: "Zwangerschapsverlof: hoe lang duurt het en wanneer begint het?"   # H1, max 110 tekens
excerpt: "…"               # 1–2 zinnen, max 260 tekens, geeft al het kernantwoord
seoTitle: "…"              # max 60 tekens, hoofdzoekwoord vooraan
seoDescription: "…"        # 130–155 tekens
searchIntent: informational   # informational | problem-solving | comparison | inspiration | commercial-editorial
lifeStages: [zwanger]      # uit: zwanger, baby, peuter, kleuter, basisschool, tiener — ALLE fasen waarvoor het artikel echt relevant is (dit bepaalt de fasepagina's)
minimumAgeMonths: null     # alleen indien zinvol
maximumAgeMonths: null
volatile: true             # true als er regels/bedragen/termijnen/veiligheidsadvies in staan
reviewDueAt: 2026-12-15    # VERPLICHT bij volatile: eerste datum waarop iets in de tekst verouderd kan zijn (nieuw toeslagjaar 1 jan, laatste betaaldatum, aangekondigde wetswijziging, nieuwe richtlijn). Kies een datum ruim vóór de wijziging ingaat. Niet-volatile: weglaten (wordt 12 maanden).
reviewNote: "…"            # bij volatile: welke cijfers/datums/regels dan opnieuw nagekeken moeten worden en bij welke bron (1–3 zinnen)
sources:                   # alle geraadpleegde bronnen die feiten onderbouwen (verplicht bij volatile/medisch)
  - name: "UWV – Zwangerschapsverlof"
    url: "https://…"
network:                   # mag leeg []
  - platform: lomamo       # lomamo | opvangkiezer | vakantiemetjongekinderen
    url: "https://lomamo.nl/collections/speelmatten"
    relationType: collection   # collection | platform
    title: "Speelmatten bij Lomamo"
    description: "Zachte, grote speelmatten waarop je baby veilig kan oefenen met rollen en kruipen."   # redactioneel, niets verzinnen over specifieke producten
faq:                       # 3–5 echte vragen die niet al letterlijk als H2 beantwoord zijn; antwoorden 1–3 zinnen, platte tekst
  - q: "…"
    a: "…"
notes: "Interne notitie: wat geverifieerd is en waar twijfel zit."
imagePrompt: "Engelse prompt voor een fotorealistische redactionele hero-foto (16:9) die precies dit artikel illustreert. Stijl altijd: natural soft daylight, warm muted palette of sage green, cream, soft coral and mustard accents, shallow depth of field, gentle film grain, candid and authentic, not posed. No text, no logos, no brand names. Toon niets wat in strijd is met het veiligheidsadvies in het artikel (bijv. geen losse dekens/kussens bij slapende baby, baby altijd op de rug slapend, kinderen in autostoel correct)."
imageAlt: "Nederlandse alt-tekst, 1 zin, beschrijft wat er op de foto te zien is."
---
Eerste alinea met het kernantwoord…

## Eerste deelvraag
…
### Subvraag
- lijstitem met **vet** en [link](https://…)
1. genummerd item
```
Markdown die je mag gebruiken: `## `, `### `, alinea's, `- ` lijsten, `1. ` lijsten, `**vet**`, `*cursief*`, `[tekst](url)`, `> ` citaat (spaarzaam). Niets anders (geen tabellen, geen afbeeldingen, geen HTML, geen H1 in de body).

import {defineArrayMember, defineField, defineType} from 'sanity'
import {ClipboardIcon} from '@sanity/icons/Clipboard'
import {NETWORK_PLATFORMS} from '../objects/networkDestination'

/**
 * Contentplan: één document per onderwerp dat (misschien) een artikel of reeks wordt.
 * Dit is de enige wachtrij voor de contentautomatisering (vervangt de project-CSV en de Google Sheet).
 *
 * Statusroute: idee → akkoord → in productie → concept → live, of afgewezen / besluit nodig.
 * - De artikeltaak pakt alleen briefs met status "akkoord" en type "artikel".
 * - De contentcheck zet nieuwe kansen neer als "idee"; Jeffrey zet ze op "akkoord".
 * - Briefs worden nooit gepubliceerd naar de site: dit type staat niet in het webhookfilter
 *   en wordt niet door de Astro-build gelezen.
 */
export const BRIEF_STATUSES = [
  {title: 'Idee', value: 'idee'},
  {title: 'Akkoord (in de wachtrij)', value: 'akkoord'},
  {title: 'In productie', value: 'in-productie'},
  {title: 'Concept (ter review)', value: 'concept'},
  {title: 'Live', value: 'live'},
  {title: 'Besluit nodig', value: 'besluit-nodig'},
  {title: 'Afgewezen', value: 'afgewezen'},
]

export const BRIEF_RISKS = [
  {title: 'Groen: automatisch live', value: 'groen'},
  {title: 'Oranje: automatisch live, min. 2 officiële bronnen', value: 'oranje'},
  {title: 'Rood: altijd concept, review door Jeffrey', value: 'rood'},
]

const PATH_RE = /^\/[a-z0-9-]+\/[a-z0-9-]+\/$/

export const contentBrief = defineType({
  name: 'contentBrief',
  title: 'Contentplan',
  type: 'document',
  icon: ClipboardIcon,
  groups: [
    {name: 'plan', title: 'Plan', default: true},
    {name: 'keywords', title: 'Zoekwoorden'},
    {name: 'result', title: 'Resultaat'},
  ],
  fields: [
    defineField({name: 'title', title: 'Werktitel', type: 'string', group: 'plan', validation: (r) => r.required()}),
    defineField({
      name: 'status', title: 'Status', type: 'string', group: 'plan', initialValue: 'idee',
      options: {list: BRIEF_STATUSES},
      description: 'Zet een idee op "Akkoord" om het in de wachtrij van de artikeltaak te zetten.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'priority', title: 'Prioriteit', type: 'number', group: 'plan', initialValue: 2,
      description: '1 = eerst. Binnen dezelfde prioriteit gaat een rij met een nabije deadline voor.',
      validation: (r) => r.required().integer().min(1).max(9),
    }),
    defineField({
      name: 'briefType', title: 'Soort', type: 'string', group: 'plan', initialValue: 'artikel',
      options: {list: [{title: 'Artikel', value: 'artikel'}, {title: 'Reeks (eigen contenttype, niet door de artikeltaak)', value: 'reeks'}], layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'risk', title: 'Risico', type: 'string', group: 'plan',
      options: {list: BRIEF_RISKS, layout: 'radio'},
      description: 'Hint. De artikeltaak classificeert opnieuw; twijfel = rood.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'pillar', title: 'Pijler', type: 'reference', group: 'plan', to: [{type: 'topic'}],
      options: {filter: 'kind == "pillar"'}, validation: (r) => r.required(),
    }),
    defineField({
      name: 'primaryTopic', title: 'Hoofdonderwerp', type: 'reference', group: 'plan', to: [{type: 'topic'}],
      options: {filter: 'kind == "subtopic"'},
      description: 'Wordt het primaryTopic van het artikel (bijv. Gezondheid, Slapen, Toeslagen).',
    }),
    defineField({
      name: 'targetPath', title: 'Doel-URL', type: 'string', group: 'plan',
      description: 'Bijv. /baby-peuter/waterpokken/. Leeg laten bij een idee zonder vaste URL.',
      validation: (r) => r.custom((v) => (!v || PATH_RE.test(v) ? true : 'Vorm: /pijler/slug/ (kleine letters, cijfers, streepjes).')),
    }),
    defineField({
      name: 'lifeStages', title: 'Levensfasen', type: 'array', group: 'plan',
      of: [defineArrayMember({type: 'reference', to: [{type: 'lifeStage'}]})],
    }),
    defineField({name: 'notBefore', title: 'Niet publiceren vóór', type: 'date', group: 'plan', description: 'Voor seizoensonderwerpen die pas later mogen (bijv. Moederdag in april).'}),
    defineField({name: 'publishBefore', title: 'Live vóór', type: 'date', group: 'plan', description: 'Seizoensdeadline. Verlopen = overslaan.'}),
    defineField({
      name: 'networkPlatforms', title: 'Netwerkbestemming', type: 'array', group: 'plan',
      of: [defineArrayMember({type: 'string'})], options: {list: NETWORK_PLATFORMS},
      description: 'Alleen als het inhoudelijk past (EDITORIAL_RULES).',
    }),
    defineField({name: 'notes', title: 'Opmerkingen voor de schrijver', type: 'text', rows: 5, group: 'plan', description: 'Afbakening, bronnen, wat niet herhalen, interne links.'}),

    defineField({name: 'mainKeyword', title: 'Hoofdzoekwoord', type: 'string', group: 'keywords'}),
    defineField({name: 'keywords', title: 'Zoekwoorden', type: 'array', group: 'keywords', of: [defineArrayMember({type: 'string'})], options: {layout: 'tags'}}),
    defineField({name: 'questions', title: 'Vragen', type: 'array', group: 'keywords', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'topRanking', title: 'Top 3 nu', type: 'array', group: 'keywords', of: [defineArrayMember({type: 'string'})], options: {layout: 'tags'}}),
    defineField({
      name: 'metrics', title: 'Cijfers', type: 'object', group: 'keywords',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({name: 'parentTopic', title: 'Parent topic', type: 'string'}),
        defineField({name: 'searchVolume', title: 'Zoekvolume (cluster)', type: 'number'}),
        defineField({name: 'kd', title: 'KD', type: 'number'}),
        defineField({name: 'trafficPotential', title: 'Verkeerspotentieel', type: 'number'}),
        defineField({name: 'weakSitesTop10', title: 'Zwakke sites in top 10', type: 'number'}),
        defineField({name: 'source', title: 'Bron', type: 'string', initialValue: 'Ahrefs Keywords Explorer, NL'}),
        defineField({name: 'fetchedAt', title: 'Opgehaald op', type: 'date'}),
      ],
    }),

    defineField({
      name: 'article', title: 'Artikel', type: 'reference', group: 'result', to: [{type: 'article'}], weak: true,
      description: 'Wordt gezet zodra er een concept of live artikel is.',
    }),
    defineField({name: 'statusNote', title: 'Toelichting status', type: 'text', rows: 3, group: 'result', description: 'Waarom afgewezen, welk besluit nodig is, of wat er in productie misging.'}),
    defineField({name: 'statusChangedAt', title: 'Status gewijzigd op', type: 'datetime', group: 'result'}),
  ],
  orderings: [
    {title: 'Wachtrij (prioriteit, dan deadline)', name: 'queue', by: [{field: 'priority', direction: 'asc'}, {field: 'publishBefore', direction: 'asc'}]},
    {title: 'Verkeerspotentieel (hoog → laag)', name: 'tpDesc', by: [{field: 'metrics.trafficPotential', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', status: 'status', risk: 'risk', priority: 'priority', pillar: 'pillar.name', tp: 'metrics.trafficPotential', due: 'publishBefore'},
    prepare: ({title, status, risk, priority, pillar, tp, due}) => ({
      title,
      subtitle: [`P${priority ?? '?'}`, status, risk, pillar, tp != null ? `TP ${tp}` : null, due ? `vóór ${due}` : null].filter(Boolean).join(' · '),
    }),
  },
})

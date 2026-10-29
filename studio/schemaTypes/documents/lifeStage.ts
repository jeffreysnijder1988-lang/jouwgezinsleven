import {defineField, defineType} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'

/** Levensfase. Leeftijdsgrenzen worden hier centraal beheerd, niet per artikel. */
export const lifeStage = defineType({
  name: 'lifeStage',
  title: 'Levensfase',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({name: 'name', title: 'Naam', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({name: 'description', title: 'Omschrijving', type: 'text', rows: 2, description: 'Getoond op de kaart als er geen leeftijdsgrenzen zijn (bijv. "Van test tot bevalling").'}),
    defineField({name: 'minimumAgeMonths', title: 'Minimumleeftijd (maanden)', type: 'number', validation: (r) => r.min(0).integer()}),
    defineField({name: 'maximumAgeMonths', title: 'Maximumleeftijd (maanden)', type: 'number', validation: (r) => r.min(0).integer()}),
    defineField({name: 'sortOrder', title: 'Volgorde', type: 'number'}),
    defineField({
      name: 'primaryPillar', title: 'Hoofdpijler (navigatie)', type: 'reference', to: [{type: 'topic'}],
      options: {filter: 'kind == "pillar"'},
      description: 'Alleen gebruikt zolang de fase nog geen eigen pagina heeft. Zodra er een artikel aan de fase hangt, linkt de kaart naar de fasepagina (/kleuter/ enz.). Zwanger blijft naar de pijler /zwanger/ gaan.',
    }),
    defineField({name: 'pageIntro', title: 'Intro fasepagina', type: 'text', rows: 3, description: 'Korte intro bovenaan de fasepagina en fallback meta description.'}),
    defineField({name: 'editorialBody', title: 'Redactionele uitleg fasepagina', type: 'blockContent', description: '200–400 woorden: wat speelt er in deze fase. Feitelijke uitspraken met bron (zie Bronnen).'}),
    defineField({
      name: 'focusItems', title: 'Wat speelt er nu', type: 'array',
      description: '4–6 korte items, bij voorkeur met een link naar een artikel dat alleen bij deze fase hoort.',
      validation: (r) => r.max(6),
      of: [{
        type: 'object', name: 'focusItem',
        fields: [
          defineField({name: 'title', title: 'Titel', type: 'string', validation: (r) => r.required().max(60)}),
          defineField({name: 'text', title: 'Tekst', type: 'text', rows: 2, validation: (r) => r.required().max(240)}),
          defineField({name: 'internal', title: 'Interne pagina', type: 'reference', to: [{type: 'article'}, {type: 'topic'}, {type: 'page'}, {type: 'pregnancyWeek'}]}),
          defineField({name: 'external', title: 'Externe URL (bron)', type: 'url', hidden: ({parent}) => Boolean(parent?.internal), validation: (r) => r.uri({scheme: ['https']})}),
        ],
        preview: {select: {title: 'title', subtitle: 'text'}},
      }],
    }),
    defineField({name: 'faq', title: 'FAQ (fase-specifiek)', type: 'array', of: [{type: 'faqItem'}], description: 'Alleen echte vragen die ouders in deze fase stellen. Antwoorden met bron.'}),
    defineField({name: 'networkDestinations', title: 'Netwerkbestemmingen', type: 'array', of: [{type: 'networkDestination'}], description: 'Alleen live platforms. Maximaal twee.'}),
    defineField({name: 'sources', title: 'Bronnen', type: 'array', of: [{type: 'sourceRef'}]}),
    defineField({name: 'sourceNotes', title: 'Interne bronnotities', type: 'text', rows: 4, description: 'Niet publiek zichtbaar.'}),
    defineField({name: 'lastReviewedAt', title: 'Laatst gecontroleerd op bronnen', type: 'date'}),
    defineField({name: 'seo', title: 'SEO', type: 'seo', description: 'Fasepagina is automatisch noindex zolang er minder dan 6 artikelen aan hangen.'}),
  ],
  orderings: [{title: 'Volgorde', name: 'sortOrder', by: [{field: 'sortOrder', direction: 'asc'}]}],
})

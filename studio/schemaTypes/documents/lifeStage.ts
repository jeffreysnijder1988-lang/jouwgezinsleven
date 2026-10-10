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
      description: 'Waar de levensfasekaart op de homepage naartoe linkt. Leeg = "Binnenkort meer".',
    }),
  ],
  orderings: [{title: 'Volgorde', name: 'sortOrder', by: [{field: 'sortOrder', direction: 'asc'}]}],
})

import {defineField, defineType} from 'sanity'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'

export const NETWORK_PLATFORMS = [
  {title: 'Lomamo', value: 'lomamo'},
  {title: 'Opvangkiezer', value: 'opvangkiezer'},
  {title: 'WelkeSpeeltuin (NL)', value: 'welkespeeltuin'},
  {title: 'WelkeSpeeltuin (BE)', value: 'welkespeeltuin-be'},
  {title: 'Vakantiemetjongekinderen.nl', value: 'vakantiemetjongekinderen'},
  {title: 'Rustmetkids (vervallen)', value: 'rustmetkids'},
  {title: 'RustigZwanger', value: 'rustigzwanger'},
  {title: 'Bevallingschecklist', value: 'bevallingschecklist'},
  {title: 'Aanstaandevader', value: 'aanstaandevader'},
  {title: 'JouwKraamtijd', value: 'jouwkraamtijd'},
  {title: 'Streaq', value: 'streaq'},
]

/**
 * Relatie naar een Family Media Network-platform (NETWORK_INTEGRATIONS: tijdelijke handmatige reference).
 * Geen prijs/voorraad of andere veranderlijke data opslaan.
 */
export const networkDestination = defineType({
  name: 'networkDestination',
  title: 'Netwerkbestemming',
  type: 'object',
  icon: EarthGlobeIcon,
  fields: [
    defineField({name: 'platform', title: 'Platform', type: 'string', options: {list: NETWORK_PLATFORMS}, validation: (r) => r.required()}),
    defineField({name: 'externalUrl', title: 'Canonieke externe URL', type: 'url', validation: (r) => r.uri({scheme: ['https']})}),
    defineField({name: 'externalId', title: 'Externe ID', type: 'string', description: 'Bijv. Shopify product-ID of locatie-ID. Voor toekomstige adapters.'}),
    defineField({
      name: 'relationType',
      title: 'Soort relatie',
      type: 'string',
      options: {list: [
        {title: 'Platform (algemeen)', value: 'platform'},
        {title: 'Product', value: 'product'},
        {title: 'Locatie', value: 'location'},
        {title: 'Collectie / zoekresultaat', value: 'collection'},
        {title: 'Tool / app', value: 'tool'},
      ]},
      initialValue: 'platform',
    }),
    defineField({name: 'title', title: 'Titel op de kaart', type: 'string', description: 'Leeg = platformnaam.'}),
    defineField({name: 'description', title: 'Korte redactionele toelichting', type: 'text', rows: 2}),
    defineField({name: 'priority', title: 'Prioriteit', type: 'number', initialValue: 0, description: 'Hoger = eerder getoond.'}),
  ],
  preview: {select: {title: 'title', subtitle: 'platform'}},
})

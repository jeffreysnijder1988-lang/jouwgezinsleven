import {defineField, defineType} from 'sanity'
import {LinkIcon} from '@sanity/icons/Link'

/** Externe bron (EDITORIAL_RULES: betrouwbare bronnen bij medisch/juridisch/financieel/veiligheid). */
export const sourceRef = defineType({
  name: 'sourceRef',
  title: 'Bron',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({name: 'sourceName', title: 'Naam bron', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'sourceUrl', title: 'URL', type: 'url', validation: (r) => r.uri({scheme: ['https', 'http']})}),
    defineField({name: 'lastCheckedAt', title: 'Laatst gecontroleerd', type: 'date'}),
  ],
  preview: {select: {title: 'sourceName', subtitle: 'sourceUrl'}},
})

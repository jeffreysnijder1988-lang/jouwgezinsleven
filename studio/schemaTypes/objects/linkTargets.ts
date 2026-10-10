import {defineField, defineType} from 'sanity'

/** Interne/externe link voor CTA's. Interne links via reference → URL nooit dood na slugwijziging. */
export const ctaLink = defineType({
  name: 'ctaLink',
  title: 'Call-to-action',
  type: 'object',
  fields: [
    defineField({name: 'title', title: 'Kop (optioneel)', type: 'string'}),
    defineField({name: 'text', title: 'Tekst (optioneel)', type: 'text', rows: 2}),
    defineField({name: 'label', title: 'Knoptekst', type: 'string'}),
    defineField({name: 'internal', title: 'Interne pagina', type: 'reference', to: [{type: 'page'}, {type: 'article'}, {type: 'topic'}]}),
    defineField({
      name: 'external', title: 'Externe URL of anker', type: 'string',
      description: 'https://… voor een externe site, of #anker voor een sectie op dezelfde pagina.',
      hidden: ({parent}) => Boolean(parent?.internal),
      validation: (r) => r.custom((v) => (!v || /^(https:\/\/|#[a-z0-9-]+$)/i.test(v as string) ? true : 'Gebruik https://… of #anker')),
    }),
  ],
})

export const footerLink = defineType({
  name: 'footerLink',
  title: 'Externe link',
  type: 'object',
  fields: [
    defineField({name: 'title', title: 'Label', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'url', title: 'URL', type: 'url', validation: (r) => r.required().uri({scheme: ['https']})}),
    defineField({name: 'description', title: 'Omschrijving', type: 'string'}),
  ],
})

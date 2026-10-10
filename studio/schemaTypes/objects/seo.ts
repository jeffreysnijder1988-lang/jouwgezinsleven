import {defineField, defineType} from 'sanity'

/** Paginagebonden SEO-overrides. Alles optioneel: templates gebruiken titel/excerpt als fallback. */
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({
      name: 'title',
      title: 'SEO-titel',
      type: 'string',
      description: 'Overschrijft de paginatitel in <title>. Leeg = titel van het document.',
      validation: (r) => r.max(65).warning('Houd de SEO-titel onder ±60 tekens.'),
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      description: 'Leeg = samenvatting/intro wordt gebruikt.',
      validation: (r) => r.max(170).warning('Houd de description onder ±160 tekens.'),
    }),
    defineField({
      name: 'image',
      title: 'Social-afbeelding (Open Graph)',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Alt-tekst', type: 'string'})],
    }),
    defineField({
      name: 'canonicalOverride',
      title: 'Canonical override',
      type: 'url',
      description: 'Alleen invullen als deze pagina bewust naar een andere URL canonicaliseert. Normaal leeg laten.',
      validation: (r) => r.uri({scheme: ['https']}),
    }),
    defineField({
      name: 'noIndex',
      title: 'Niet indexeren (noindex)',
      type: 'boolean',
      initialValue: false,
      description: 'Pagina blijft bereikbaar, maar krijgt noindex en verdwijnt uit de sitemap.',
    }),
  ],
})

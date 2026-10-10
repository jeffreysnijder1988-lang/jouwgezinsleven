import {defineArrayMember, defineField, defineType} from 'sanity'
import {LinkIcon} from '@sanity/icons/Link'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

/**
 * Rich text voor artikelen en pagina's. Bewust beperkt: H2–H4, lijsten, citaat,
 * interne links (reference) en externe links, afbeeldingen met verplichte alt.
 * Geen designopties in content.
 */
export const blockContent = defineType({
  name: 'blockContent',
  title: 'Tekst',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normaal', value: 'normal'},
        {title: 'Kop 2', value: 'h2'},
        {title: 'Kop 3', value: 'h3'},
        {title: 'Kop 4', value: 'h4'},
        {title: 'Citaat', value: 'blockquote'},
      ],
      lists: [
        {title: 'Opsomming', value: 'bullet'},
        {title: 'Genummerd', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Vet', value: 'strong'},
          {title: 'Cursief', value: 'em'},
        ],
        annotations: [
          defineArrayMember({
            name: 'internalLink',
            title: 'Interne link',
            type: 'object',
            icon: DocumentTextIcon,
            fields: [
              defineField({
                name: 'reference',
                title: 'Verwijst naar',
                type: 'reference',
                to: [{type: 'article'}, {type: 'page'}, {type: 'topic'}],
                validation: (r) => r.required(),
              }),
            ],
          }),
          defineArrayMember({
            name: 'link',
            title: 'Externe link',
            type: 'object',
            icon: LinkIcon,
            fields: [
              defineField({
                name: 'href',
                title: 'URL',
                type: 'url',
                validation: (r) => r.required().uri({scheme: ['http', 'https', 'mailto', 'tel']}),
              }),
              defineField({name: 'openInNewTab', title: 'Open in nieuw venster', type: 'boolean', initialValue: false}),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({name: 'alt', title: 'Alt-tekst', type: 'string', description: 'Beschrijf wat er te zien is. Leeg alleen bij puur decoratieve afbeeldingen.'}),
        defineField({name: 'caption', title: 'Onderschrift', type: 'string'}),
      ],
    }),
  ],
})

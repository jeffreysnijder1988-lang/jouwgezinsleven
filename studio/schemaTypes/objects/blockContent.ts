import {defineArrayMember, defineField, defineType} from 'sanity'
import {LinkIcon} from '@sanity/icons/Link'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {ControlsIcon} from '@sanity/icons/Controls'
import {NumberIcon} from '@sanity/icons/Number'
import {ThListIcon} from '@sanity/icons/ThList'

/** Interactieve tools die in een artikel kunnen worden geplaatst. Rendering gebeurt in Astro. */
export const TOOL_OPTIONS = [
  {title: 'Uitgerekende datum berekenen', value: 'uitgerekende-datum'},
]

/**
 * Rich text voor artikelen en pagina's. Bewust beperkt: H2–H4, lijsten, citaat,
 * interne links (reference) en externe links, afbeeldingen met verplichte alt,
 * en een tool-blok om een interactieve tool (bijv. calculator) op een vaste plek te tonen.
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
      // Inline waarde uit "Cijfers en regels" (factSet): bedrag, datum of jaartal dat de build invult.
      of: [
        defineArrayMember({
          name: 'factValue',
          title: 'Cijfer uit reeks',
          type: 'object',
          icon: NumberIcon,
          fields: [
            defineField({name: 'series', title: 'Reeks', type: 'string', description: 'Bijv. kot-uurprijzen. De set die vandaag geldt wordt gebruikt.'}),
            defineField({name: 'factSet', title: 'Of: vaste set', type: 'reference', to: [{type: 'factSet'}], weak: true, description: 'Alleen als de tekst over een specifiek jaar gaat (bijv. "in 2027 naar …"). Gaat vóór de reeks.'}),
            defineField({name: 'key', title: 'Sleutel', type: 'string', description: 'Bijv. bso. Leeg bij weergave "jaar".'}),
            defineField({
              name: 'format', title: 'Weergave', type: 'string', initialValue: 'value',
              options: {list: [{title: 'Waarde (€ 9,98)', value: 'value'}, {title: 'Jaar van de set (2026)', value: 'year'}, {title: 'Omschrijving', value: 'label'}], layout: 'radio'},
            }),
          ],
          validation: (r) => r.custom((v) => {
            const f = v as {series?: string; factSet?: unknown; key?: string; format?: string} | undefined
            if (!f) return true
            if (!f.series && !f.factSet) return 'Kies een reeks of een vaste set.'
            if ((f.format ?? 'value') !== 'year' && !f.key) return 'Sleutel is verplicht (behalve bij weergave "jaar").'
            return true
          }),
          preview: {
            select: {series: 'series', set: 'factSet.title', key: 'key', format: 'format'},
            prepare: ({series, set, key, format}) => ({title: `${set ?? series ?? '?'}${format === 'year' ? ' · jaar' : `.${key ?? '?'}`}`, media: NumberIcon}),
          },
        }),
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
    defineArrayMember({
      name: 'factList',
      title: 'Lijst uit reeks',
      type: 'object',
      icon: ThListIcon,
      description: 'Toont de waarden van een reeks uit "Cijfers en regels" als lijst, bijv. maximum uurprijzen of betaaldata.',
      fields: [
        defineField({name: 'series', title: 'Reeks', type: 'string', description: 'Bijv. kot-uurprijzen of kot-betaaldata.'}),
        defineField({name: 'factSet', title: 'Of: vaste set', type: 'reference', to: [{type: 'factSet'}], weak: true}),
        defineField({name: 'keys', title: 'Alleen deze sleutels', type: 'array', of: [{type: 'string'}], description: 'Leeg = alle waarden van de set.'}),
        defineField({name: 'onlyUpcoming', title: 'Alleen komende datums', type: 'boolean', initialValue: false, description: 'Voor datumreeksen (betaaldata): toont uit alle sets van de reeks alleen datums vanaf vandaag.'}),
        defineField({name: 'limit', title: 'Maximaal aantal', type: 'number', validation: (r) => r.min(1).integer()}),
        defineField({name: 'showNext', title: 'Ook volgende set tonen', type: 'boolean', initialValue: false, description: 'Toont de waarden die vanaf de volgende geldigheidsdatum gelden, als die al zijn ingevoerd (met "voorlopig" waar van toepassing).'}),
      ],
      validation: (r) => r.custom((v) => {
        const f = v as {series?: string; factSet?: unknown} | undefined
        return !f || f.series || f.factSet ? true : 'Kies een reeks of een vaste set.'
      }),
      preview: {
        select: {series: 'series', set: 'factSet.title', up: 'onlyUpcoming'},
        prepare: ({series, set, up}) => ({title: `Lijst: ${set ?? series ?? '?'}`, subtitle: up ? 'alleen komende datums' : 'Cijfers uit reeks', media: ThListIcon}),
      },
    }),
    defineArrayMember({
      name: 'toolEmbed',
      title: 'Tool',
      type: 'object',
      icon: ControlsIcon,
      fields: [
        defineField({
          name: 'tool',
          title: 'Welke tool',
          type: 'string',
          options: {list: TOOL_OPTIONS, layout: 'radio'},
          validation: (r) => r.required(),
        }),
      ],
      preview: {
        select: {tool: 'tool'},
        prepare: ({tool}) => ({
          title: TOOL_OPTIONS.find((t) => t.value === tool)?.title ?? 'Tool',
          subtitle: 'Interactieve tool',
          media: ControlsIcon,
        }),
      },
    }),
  ],
})

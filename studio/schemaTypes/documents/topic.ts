import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons/Tag'

/**
 * Onderwerp. Pijlers (hoofdmenu, eerste URL-niveau) zijn topics met kind = "pillar".
 * Subonderwerpen hangen via parent onder een pijler. Geen losse categorie-type ernaast.
 */
export const topic = defineType({
  name: 'topic',
  title: 'Onderwerp / pijler',
  type: 'document',
  icon: TagIcon,
  groups: [
    {name: 'content', title: 'Inhoud', default: true},
    {name: 'network', title: 'Netwerk'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({name: 'name', title: 'Naam', type: 'string', group: 'content', validation: (r) => r.required()}),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug', group: 'content',
      options: {source: 'name', maxLength: 60},
      description: 'Voor pijlers is dit het eerste URL-deel (/baby-peuter/). Niet wijzigen na livegang zonder redirect.',
      validation: (r) => r.required().custom((v) => (!v?.current || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.current) ? true : 'Alleen kleine letters, cijfers en koppeltekens')),
    }),
    defineField({
      name: 'kind', title: 'Soort', type: 'string', group: 'content',
      options: {list: [{title: 'Pijler (hoofdonderwerp, eigen hubpagina)', value: 'pillar'}, {title: 'Subonderwerp', value: 'subtopic'}], layout: 'radio'},
      initialValue: 'subtopic',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'parent', title: 'Valt onder pijler', type: 'reference', to: [{type: 'topic'}], group: 'content',
      options: {filter: 'kind == "pillar"'},
      hidden: ({document}) => document?.kind === 'pillar',
    }),
    defineField({name: 'navLabel', title: 'Menulabel', type: 'string', group: 'content', description: 'Korter label in menu/footer (bijv. "Vakantie" voor Gezinsvakantie). Leeg = naam.', hidden: ({document}) => document?.kind !== 'pillar'}),
    defineField({name: 'heroTitle', title: 'Hubtitel (H1)', type: 'string', group: 'content', description: 'Leeg = naam.', hidden: ({document}) => document?.kind !== 'pillar'}),
    defineField({name: 'navOrder', title: 'Volgorde in menu', type: 'number', group: 'content', hidden: ({document}) => document?.kind !== 'pillar'}),
    defineField({name: 'description', title: 'Korte omschrijving', type: 'text', rows: 3, group: 'content', description: 'Gebruikt op kaarten, in de hub-hero en als fallback meta description.'}),
    defineField({name: 'intro', title: 'Redactionele intro (hub)', type: 'blockContent', group: 'content', hidden: ({document}) => document?.kind !== 'pillar'}),
    defineField({name: 'heroImage', title: 'Hero-afbeelding', type: 'image', options: {hotspot: true}, group: 'content', fields: [defineField({name: 'alt', title: 'Alt-tekst', type: 'string'})], hidden: ({document}) => document?.kind !== 'pillar'}),
    defineField({name: 'cardImage', title: 'Kaartafbeelding (homepage)', type: 'image', options: {hotspot: true}, group: 'content', fields: [defineField({name: 'alt', title: 'Alt-tekst', type: 'string'})], hidden: ({document}) => document?.kind !== 'pillar'}),
    defineField({name: 'faq', title: 'FAQ (hub)', type: 'array', of: [{type: 'faqItem'}], group: 'content', hidden: ({document}) => document?.kind !== 'pillar', description: 'Alleen echte, nuttige vragen. Feitelijke antwoorden (regels, bedragen, gezondheid) met bron controleren.'}),
    defineField({name: 'relatedTopics', title: 'Ook interessant (gerelateerde onderwerpen)', type: 'array', of: [{type: 'reference', to: [{type: 'topic'}]}], group: 'content'}),
    defineField({name: 'hubCta', title: 'CTA-blok (hub)', type: 'ctaLink', group: 'network', description: 'Het koraalkleurige blok onderaan de hub, meestal naar het bijbehorende netwerkplatform.', hidden: ({document}) => document?.kind !== 'pillar'}),
    defineField({name: 'networkDestinations', title: 'Netwerkbestemmingen', type: 'array', of: [{type: 'networkDestination'}], group: 'network'}),
    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  orderings: [{title: 'Menuvolgorde', name: 'navOrder', by: [{field: 'navOrder', direction: 'asc'}]}],
  preview: {select: {title: 'name', kind: 'kind', parent: 'parent.name'}, prepare: ({title, kind, parent}) => ({title, subtitle: kind === 'pillar' ? 'Pijler' : parent ? `Onder ${parent}` : 'Subonderwerp'})},
})

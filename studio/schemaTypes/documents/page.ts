import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons/Document'

/** Algemene pagina (over, contact, privacy, …) op /[slug]/. */
export const page = defineType({
  name: 'page',
  title: 'Pagina',
  type: 'document',
  icon: DocumentIcon,
  groups: [{name: 'content', title: 'Inhoud', default: true}, {name: 'seo', title: 'SEO'}, {name: 'migration', title: 'Migratie'}],
  fields: [
    defineField({name: 'title', title: 'Titel (H1)', type: 'string', group: 'content', validation: (r) => r.required()}),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug', group: 'content', options: {source: 'title', maxLength: 60},
      validation: (r) => r.required().custom(async (v, ctx) => {
        if (!v?.current) return true
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.current)) return 'Alleen kleine letters, cijfers en koppeltekens'
        const client = ctx.getClient({apiVersion: '2025-02-19'})
        const n = await client.fetch('count(*[_type == "topic" && kind == "pillar" && slug.current == $s])', {s: v.current})
        return n === 0 || 'Deze slug is al in gebruik door een pijler.'
      }),
    }),
    defineField({name: 'intro', title: 'Intro', type: 'text', rows: 3, group: 'content'}),
    defineField({name: 'body', title: 'Inhoud', type: 'blockContent', group: 'content'}),
    defineField({name: 'faq', title: 'FAQ', type: 'array', of: [{type: 'faqItem'}], group: 'content'}),
    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
    defineField({name: 'legacyUrl', title: 'Oorspronkelijke URL (migratie)', type: 'string', group: 'migration', readOnly: true}),
  ],
})

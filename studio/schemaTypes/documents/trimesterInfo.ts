import {defineArrayMember, defineField, defineType} from 'sanity'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'

/**
 * Per trimester (3 documenten): korte intro voor het weekoverzicht en "Wanneer bel je de verloskundige?".
 * Wordt in elke week van dat trimester getoond. Alarmsignalen alleen overnemen uit de bron
 * (Thuisarts, deverloskundige.nl), zonder eigen toevoegingen.
 */
export const trimesterInfo = defineType({
  name: 'trimesterInfo',
  title: 'Zwangerschap: trimester',
  type: 'document',
  icon: WarningOutlineIcon,
  fields: [
    defineField({
      name: 'trimester', title: 'Trimester', type: 'number',
      options: {list: [{title: 'Eerste (week 1–12)', value: 1}, {title: 'Tweede (week 13–26)', value: 2}, {title: 'Derde (vanaf week 27)', value: 3}], layout: 'radio'},
      validation: (r) => r.required().custom(async (v, ctx) => {
        if (!v) return true
        const id = (ctx.document?._id ?? '').replace(/^drafts\./, '')
        const n = await ctx.getClient({apiVersion: '2025-02-19'}).fetch(
          'count(*[_type == "trimesterInfo" && trimester == $t && !(_id in [$id, "drafts." + $id])])', {t: v, id},
        )
        return n === 0 || 'Dit trimester bestaat al.'
      }),
    }),
    defineField({name: 'title', title: 'Titel', type: 'string', validation: (r) => r.required(), description: 'Bijv. "Eerste trimester".'}),
    defineField({name: 'intro', title: 'Korte intro (weekoverzicht)', type: 'text', rows: 3, validation: (r) => r.max(400)}),
    defineField({name: 'callIntro', title: 'Inleiding "Wanneer bel je de verloskundige?"', type: 'text', rows: 2}),
    defineField({
      name: 'warningSigns', title: 'Bel direct bij', type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'Eén signaal per regel, overgenomen uit de bron.',
      validation: (r) => r.required().min(1),
    }),
    defineField({name: 'sources', title: 'Bronnen', type: 'array', of: [{type: 'sourceRef'}], validation: (r) => r.required().min(1)}),
    defineField({name: 'lastReviewedAt', title: 'Gecontroleerd op', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'reviewDueAt', title: 'Opnieuw controleren vóór', type: 'date'}),
  ],
  orderings: [{title: 'Trimester', name: 'trimesterAsc', by: [{field: 'trimester', direction: 'asc'}]}],
  preview: {select: {title: 'title', t: 'trimester'}, prepare: ({title, t}) => ({title, subtitle: `trimester ${t ?? '?'}`})},
})

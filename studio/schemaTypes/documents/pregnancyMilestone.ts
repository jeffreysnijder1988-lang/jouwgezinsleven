import {defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons/Pin'

/**
 * Gedeelde controle of regelzaak met een periode in weken (termijnecho, prenatale screening,
 * 20-wekenecho, kinkhoestprik, zwangerschapsverlof, kraamzorg…). Eén keer vastleggen;
 * elke zwangerschapsweek binnen weekFrom–weekTo toont hem automatisch.
 */
export const pregnancyMilestone = defineType({
  name: 'pregnancyMilestone',
  title: 'Zwangerschap: afspraak of regelzaak',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({name: 'title', title: 'Titel', type: 'string', validation: (r) => r.required().max(80), description: 'Bijv. "20-wekenecho".'}),
    defineField({
      name: 'kind', title: 'Soort', type: 'string', initialValue: 'controle', validation: (r) => r.required(),
      options: {list: [{title: 'Controle of onderzoek', value: 'controle'}, {title: 'Vaccinatie', value: 'vaccinatie'}, {title: 'Regelzaak', value: 'regelzaak'}], layout: 'radio'},
    }),
    defineField({name: 'weekFrom', title: 'Vanaf week', type: 'number', validation: (r) => r.required().integer().min(1).max(42)}),
    defineField({
      name: 'weekTo', title: 'Tot en met week', type: 'number',
      validation: (r) => r.required().integer().min(1).max(42).custom((v, ctx) => {
        const from = (ctx.document as {weekFrom?: number} | undefined)?.weekFrom
        return !v || !from || v >= from ? true : 'Moet gelijk aan of later dan "Vanaf week" zijn.'
      }),
    }),
    defineField({name: 'summary', title: 'Korte uitleg', type: 'text', rows: 3, validation: (r) => r.required().max(320), description: 'Feitelijk, uit de bron. Geen eigen medisch advies.'}),
    defineField({name: 'article', title: 'Lees meer: artikel', type: 'reference', to: [{type: 'article'}], weak: true}),
    defineField({name: 'externalUrl', title: 'Of: officiële pagina', type: 'url', description: 'Alleen als er geen eigen artikel is.'}),
    defineField({name: 'sources', title: 'Bronnen', type: 'array', of: [{type: 'sourceRef'}], validation: (r) => r.required().min(1)}),
    defineField({name: 'lastReviewedAt', title: 'Gecontroleerd op', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'reviewDueAt', title: 'Opnieuw controleren vóór', type: 'date'}),
    defineField({name: 'reviewNote', title: 'Wat verloopt er?', type: 'text', rows: 2}),
  ],
  orderings: [{title: 'Week', name: 'weekAsc', by: [{field: 'weekFrom', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', from: 'weekFrom', to: 'weekTo', kind: 'kind'},
    prepare: ({title, from, to, kind}) => ({title, subtitle: `${kind ?? ''} · week ${from ?? '?'}${to && to !== from ? `–${to}` : ''}`}),
  },
})

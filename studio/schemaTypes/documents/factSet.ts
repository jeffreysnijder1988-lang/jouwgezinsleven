import {defineArrayMember, defineField, defineType} from 'sanity'
import {NumberIcon} from '@sanity/icons/Number'

/**
 * Officiële, tijdgebonden gegevens (maximum uurprijzen, betaaldata, dagloon, …) op één plek.
 * Artikelen verwijzen hiernaar via `factValue` (inline) en `factList` (blok) in blockContent,
 * of via {{fact:serie.sleutel}} in platte tekst (FAQ). De build kiest per serie de set die
 * vandaag geldig is. Eén nieuwe set invoeren = alle artikelen bijgewerkt.
 */
export const FACT_UNITS = [
  {title: 'Euro per uur (€ 11,23)', value: 'eurPerHour'},
  {title: 'Euro (€ 1.035 / € 9,50)', value: 'eur'},
  {title: 'Percentage (83,7%)', value: 'percent'},
  {title: 'Datum (dinsdag 20 oktober 2026)', value: 'date'},
  {title: 'Getal (230)', value: 'number'},
  {title: 'Tekst', value: 'text'},
]

const SERIES_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const factSet = defineType({
  name: 'factSet',
  title: 'Cijfers en regels',
  type: 'document',
  icon: NumberIcon,
  fields: [
    defineField({name: 'title', title: 'Titel', type: 'string', validation: (r) => r.required(), description: 'Bijv. "Maximum uurprijzen kinderopvang 2026".'}),
    defineField({
      name: 'series', title: 'Reeks', type: 'string',
      description: 'Vaste sleutel over de jaren heen, bijv. kot-uurprijzen of kot-betaaldata. Artikelen verwijzen naar de reeks; de build kiest de set die vandaag geldt.',
      validation: (r) => r.required().custom((v) => (!v || SERIES_RE.test(v) ? true : 'Alleen kleine letters, cijfers en streepjes.')),
    }),
    defineField({name: 'validFrom', title: 'Geldig vanaf', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'validUntil', title: 'Geldig tot en met', type: 'date', description: 'Leeg = tot er een nieuwere set is.'}),
    defineField({
      name: 'status', title: 'Status', type: 'string', initialValue: 'definitief',
      options: {list: [{title: 'Definitief', value: 'definitief'}, {title: 'Voorlopig', value: 'voorlopig'}], layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'items', title: 'Waarden', type: 'array',
      of: [defineArrayMember({
        name: 'factItem', title: 'Waarde', type: 'object',
        fields: [
          defineField({name: 'key', title: 'Sleutel', type: 'string', description: 'Bijv. dagopvang, bso, gastouder of 2026-11.', validation: (r) => r.required().custom((v) => (!v || KEY_RE.test(v) ? true : 'Alleen kleine letters, cijfers en streepjes.'))}),
          defineField({name: 'label', title: 'Omschrijving', type: 'string', validation: (r) => r.required(), description: 'Zoals het in een lijst moet staan, bijv. "Buitenschoolse opvang (bso)" of "toeslag voor november".'}),
          defineField({name: 'value', title: 'Waarde', type: 'string', validation: (r) => r.required(), description: 'Bedragen met punt als decimaalteken (11.23), datums als JJJJ-MM-DD.'}),
          defineField({name: 'unit', title: 'Eenheid', type: 'string', options: {list: FACT_UNITS}, validation: (r) => r.required()}),
        ],
        validation: (r) => r.custom((item) => {
          const it = item as {value?: string; unit?: string} | undefined
          if (!it?.value || !it.unit) return true
          if (['eurPerHour', 'eur', 'percent', 'number'].includes(it.unit) && !/^-?\d+(\.\d+)?$/.test(it.value)) return 'Getal met punt als decimaalteken, bijv. 11.23'
          if (it.unit === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(it.value)) return 'Datum als JJJJ-MM-DD'
          return true
        }),
        preview: {select: {title: 'label', value: 'value', key: 'key'}, prepare: ({title, value, key}) => ({title: `${title}: ${value}`, subtitle: key})},
      })],
      validation: (r) => r.required().min(1).custom((items) => {
        const keys = ((items ?? []) as {key?: string}[]).map((i) => i.key).filter(Boolean)
        return new Set(keys).size === keys.length ? true : 'Elke sleutel mag maar één keer voorkomen.'
      }),
    }),
    defineField({name: 'sources', title: 'Bronnen', type: 'array', of: [{type: 'sourceRef'}], validation: (r) => r.required().min(1)}),
    defineField({name: 'lastReviewedAt', title: 'Laatst gecontroleerd op', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'reviewDueAt', title: 'Opnieuw controleren vóór', type: 'date', description: 'Bijv. vlak voordat de volgende waarden officieel bekend worden.'}),
    defineField({name: 'reviewNote', title: 'Wat verloopt er?', type: 'text', rows: 3}),
  ],
  orderings: [{title: 'Reeks, dan nieuwste eerst', name: 'seriesDesc', by: [{field: 'series', direction: 'asc'}, {field: 'validFrom', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', series: 'series', from: 'validFrom', until: 'validUntil', status: 'status'},
    prepare: ({title, series, from, until, status}) => ({title, subtitle: [series, `${from ?? '?'} t/m ${until ?? '…'}`, status === 'voorlopig' ? 'voorlopig' : null].filter(Boolean).join(' · ')}),
  },
})

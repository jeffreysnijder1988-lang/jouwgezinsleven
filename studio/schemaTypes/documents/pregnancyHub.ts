import {defineField, defineType} from 'sanity'
import {CalendarIcon} from '@sanity/icons/Calendar'

/**
 * Singleton: redactionele tekst van het weekoverzicht /zwanger/week-voor-week/.
 * De lijst met weken komt automatisch uit de gepubliceerde zwangerschapsweken.
 */
export const pregnancyHub = defineType({
  name: 'pregnancyHub',
  title: 'Zwangerschap: weekoverzicht',
  type: 'document',
  icon: CalendarIcon,
  fields: [
    defineField({name: 'title', title: 'Titel (H1)', type: 'string', initialValue: 'Zwangerschap week voor week', validation: (r) => r.required()}),
    defineField({name: 'intro', title: 'Intro', type: 'text', rows: 3, validation: (r) => r.max(300)}),
    defineField({name: 'body', title: 'Uitleg', type: 'blockContent', description: 'Bijv. hoe de weken worden geteld.'}),
    defineField({name: 'faq', title: 'FAQ', type: 'array', of: [{type: 'faqItem'}]}),
    defineField({name: 'seo', title: 'SEO', type: 'seo'}),
  ],
  preview: {prepare: () => ({title: 'Weekoverzicht zwangerschap'})},
})

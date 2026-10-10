import {defineField, defineType} from 'sanity'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'

/** Alleen gebruiken voor vragen die werkelijk nuttig zijn (PAGE_TEMPLATES → FAQ). */
export const faqItem = defineType({
  name: 'faqItem',
  title: 'Vraag & antwoord',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({name: 'question', title: 'Vraag', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'answer', title: 'Antwoord', type: 'text', rows: 4, validation: (r) => r.required()}),
  ],
  preview: {select: {title: 'question', subtitle: 'answer'}},
})

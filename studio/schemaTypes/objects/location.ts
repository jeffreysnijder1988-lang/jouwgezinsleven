import {defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons/Pin'

/** Gedeelde locatievelden (CONTENT_MODEL). Alleen invullen als locatie inhoudelijk relevant is. */
export const location = defineType({
  name: 'location',
  title: 'Locatie',
  type: 'object',
  icon: PinIcon,
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({name: 'country', title: 'Land', type: 'string', options: {list: [{title: 'Nederland', value: 'NL'}, {title: 'België', value: 'BE'}]}}),
    defineField({name: 'province', title: 'Provincie', type: 'string'}),
    defineField({name: 'municipality', title: 'Gemeente', type: 'string'}),
    defineField({name: 'city', title: 'Plaats', type: 'string'}),
    defineField({name: 'postalCode', title: 'Postcode', type: 'string'}),
    defineField({name: 'latitude', title: 'Breedtegraad', type: 'number'}),
    defineField({name: 'longitude', title: 'Lengtegraad', type: 'number'}),
  ],
})

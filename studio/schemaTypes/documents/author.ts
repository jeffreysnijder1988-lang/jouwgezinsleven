import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

/** Alleen echte personen. Geen fictieve auteurs (EDITORIAL/SEO-regels). */
export const author = defineType({
  name: 'author',
  title: 'Auteur',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', title: 'Naam', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'name'}}),
    defineField({name: 'role', title: 'Rol', type: 'string'}),
    defineField({name: 'bio', title: 'Korte bio', type: 'text', rows: 3}),
    defineField({name: 'image', title: 'Foto', type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Alt-tekst', type: 'string'})]}),
  ],
})

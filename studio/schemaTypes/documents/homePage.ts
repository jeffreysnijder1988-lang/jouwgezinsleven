import {defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'

/** Singleton (_id "homePage"): redactionele inhoud van de homepage. Opbouw ligt vast in het template. */
export const homePage = defineType({
  name: 'homePage',
  title: 'Homepage',
  type: 'document',
  icon: HomeIcon,
  groups: [{name: 'hero', title: 'Hero', default: true}, {name: 'sections', title: 'Secties'}, {name: 'seo', title: 'SEO'}],
  fields: [
    defineField({name: 'heroTitle', title: 'Hero-titel (H1)', type: 'string', group: 'hero', validation: (r) => r.required()}),
    defineField({name: 'heroIntro', title: 'Hero-intro', type: 'text', rows: 3, group: 'hero'}),
    defineField({name: 'heroImage', title: 'Hero-afbeelding', type: 'image', options: {hotspot: true}, group: 'hero', fields: [defineField({name: 'alt', title: 'Alt-tekst', type: 'string'})]}),
    defineField({name: 'heroCta', title: 'Hero-knop', type: 'ctaLink', group: 'hero'}),
    defineField({name: 'heroSecondaryCta', title: 'Hero-knop 2 (licht)', type: 'ctaLink', group: 'hero'}),
    defineField({name: 'lifeStagesTitle', title: 'Titel levensfasen', type: 'string', group: 'sections'}),
    defineField({name: 'lifeStagesIntro', title: 'Intro levensfasen', type: 'text', rows: 2, group: 'sections'}),
    defineField({name: 'pillarsTitle', title: 'Titel onderwerpen', type: 'string', group: 'sections', description: 'Sectie met de pijlers (Zwanger, Baby & Peuter, …).'}),
    defineField({name: 'pillarsIntro', title: 'Intro onderwerpen', type: 'text', rows: 2, group: 'sections'}),
    defineField({name: 'featuredTitle', title: 'Titel uitgelicht', type: 'string', group: 'sections'}),
    defineField({name: 'featuredIntro', title: 'Intro uitgelicht', type: 'text', rows: 2, group: 'sections'}),
    defineField({name: 'featuredArticles', title: 'Uitgelichte artikelen', type: 'array', of: [{type: 'reference', to: [{type: 'article'}]}], group: 'sections', description: 'Handmatig gekozen. Leeg = sectie verborgen.', validation: (r) => r.max(9).unique()}),
    defineField({name: 'latestTitle', title: 'Titel "Nieuw op de site"', type: 'string', group: 'sections'}),
    defineField({name: 'feature', title: 'Featureblok (bijv. WelkeSpeeltuin)', description: 'Leeg = blok verborgen. Alleen vullen met een site die live is.', type: 'ctaLink', group: 'sections'}),
    defineField({name: 'closingCta', title: 'Afsluitende CTA', type: 'ctaLink', group: 'sections'}),
    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  preview: {prepare: () => ({title: 'Homepage'})},
})

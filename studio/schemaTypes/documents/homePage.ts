import {defineArrayMember, defineField, defineType} from 'sanity'
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
    defineField({
      name: 'seasonal', title: 'Nu actueel (seizoensblokken)', type: 'array', group: 'sections',
      description: 'Verschijnt alleen binnen het datumvenster. De site wordt elke nacht opnieuw gebouwd, dus het blok gaat vanzelf aan en uit. Bij overlap toont de homepage het blok dat het eerst afloopt.',
      of: [defineArrayMember({
        name: 'seasonalBlock', title: 'Seizoensblok', type: 'object',
        fields: [
          defineField({name: 'title', title: 'Titel', type: 'string', validation: (r) => r.required()}),
          defineField({name: 'intro', title: 'Intro', type: 'text', rows: 2}),
          defineField({name: 'from', title: 'Zichtbaar vanaf', type: 'date', validation: (r) => r.required()}),
          defineField({name: 'until', title: 'Zichtbaar tot en met', type: 'date', validation: (r) => r.required().custom((v, ctx) => {
            const from = (ctx.parent as {from?: string})?.from
            return !v || !from || v >= from ? true : 'Moet op of na "Zichtbaar vanaf" liggen.'
          })}),
          defineField({name: 'topic', title: 'Onderwerp', type: 'reference', to: [{type: 'topic'}], options: {filter: 'kind == "subtopic"'}, description: 'Toont de nieuwste artikelen met dit hoofdonderwerp. Groeit vanzelf mee met nieuwe artikelen.'}),
          defineField({name: 'articles', title: 'Of: vaste artikelen', type: 'array', of: [{type: 'reference', to: [{type: 'article'}]}], description: 'Gaat vóór het onderwerp. Leeg laten om het onderwerp te gebruiken.', validation: (r) => r.max(6).unique()}),
        ],
        validation: (r) => r.custom((v) => {
          const b = v as {topic?: unknown; articles?: unknown[]} | undefined
          return b?.topic || b?.articles?.length ? true : 'Kies een onderwerp of vaste artikelen.'
        }),
        preview: {select: {title: 'title', from: 'from', until: 'until'}, prepare: ({title, from, until}) => ({title, subtitle: `${from ?? '?'} t/m ${until ?? '?'}`})},
      })],
    }),
    defineField({name: 'weekPickerTitle', title: 'Titel weekkiezer zwangerschap', type: 'string', group: 'sections', description: 'Sectie met alle weekpagina\'s. Verschijnt zodra het weekoverzicht indexeerbaar is.'}),
    defineField({name: 'weekPickerIntro', title: 'Intro weekkiezer', type: 'text', rows: 2, group: 'sections'}),
    defineField({name: 'weekPickerCta', title: 'Link onder de weekkiezer', type: 'ctaLink', group: 'sections', description: 'Bijv. naar de rekenhulp uitgerekende datum.'}),
    defineField({name: 'trustTitle', title: 'Titel "Zo werken we"', type: 'string', group: 'sections'}),
    defineField({
      name: 'trustItems', title: 'Zo werken we: punten', type: 'array', group: 'sections',
      description: 'Leeg = blok verborgen. Alleen beloven wat de werkwijze echt doet.',
      of: [defineArrayMember({name: 'trustItem', title: 'Punt', type: 'object', fields: [
        defineField({name: 'title', title: 'Titel', type: 'string', validation: (r) => r.required()}),
        defineField({name: 'text', title: 'Tekst', type: 'text', rows: 3, validation: (r) => r.required()}),
      ]})],
      validation: (r) => r.max(4),
    }),
    defineField({name: 'trustLink', title: 'Link "Zo werken we"', type: 'ctaLink', group: 'sections'}),
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

import {defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

/**
 * Artikel — conform CONTENT_MODEL.md. URL: /[pillar.slug]/[slug]/.
 * Nieuw artikel = nieuw document publiceren; geen codewijziging nodig.
 */
export const article = defineType({
  name: 'article',
  title: 'Artikel',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Inhoud', default: true},
    {name: 'taxonomy', title: 'Structuur'},
    {name: 'network', title: 'Netwerk'},
    {name: 'editorial', title: 'Redactie & kwaliteit'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    // Inhoud
    defineField({name: 'title', title: 'Titel (H1)', type: 'string', group: 'content', validation: (r) => r.required().max(110)}),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug', group: 'content',
      options: {source: 'title', maxLength: 70},
      description: 'Kort en beschrijvend, zonder stopwoorden. Niet wijzigen na publicatie zonder redirect.',
      validation: (r) => r.required().custom(async (v, ctx) => {
        if (!v?.current) return true
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.current)) return 'Alleen kleine letters, cijfers en koppeltekens'
        const pillarRef = (ctx.document?.pillar as {_ref?: string} | undefined)?._ref
        if (!pillarRef) return true
        const id = (ctx.document?._id ?? '').replace(/^drafts\./, '')
        const client = ctx.getClient({apiVersion: '2025-02-19'})
        const n = await client.fetch(
          'count(*[_type == "article" && slug.current == $s && pillar._ref == $p && !(_id in [$id, "drafts." + $id])])',
          {s: v.current, p: pillarRef, id},
        )
        return n === 0 || 'Er bestaat al een artikel met deze slug binnen deze pijler.'
      }),
    }),
    defineField({name: 'excerpt', title: 'Samenvatting', type: 'text', rows: 3, group: 'content', description: 'Intro onder de H1, op kaarten en als fallback meta description.', validation: (r) => r.max(300)}),
    defineField({
      name: 'heroImage', title: 'Hoofdafbeelding', type: 'image', group: 'content', options: {hotspot: true},
      fields: [
        defineField({name: 'alt', title: 'Alt-tekst', type: 'string', validation: (r) => r.custom((alt, ctx) => ((ctx.parent as {asset?: unknown})?.asset && !alt ? 'Alt-tekst is verplicht bij een afbeelding' : true))}),
        defineField({name: 'caption', title: 'Onderschrift', type: 'string'}),
      ],
    }),
    defineField({name: 'body', title: 'Artikeltekst', type: 'blockContent', group: 'content'}),
    defineField({name: 'faq', title: 'FAQ', type: 'array', of: [{type: 'faqItem'}], group: 'content', description: 'Alleen echte, nuttige vragen. Niet voor extra zoekwoorden.'}),

    // Structuur
    defineField({
      name: 'pillar', title: 'Pijler (URL-sectie)', type: 'reference', to: [{type: 'topic'}], group: 'taxonomy',
      options: {filter: 'kind == "pillar"'}, validation: (r) => r.required(),
    }),
    defineField({name: 'primaryTopic', title: 'Hoofdonderwerp', type: 'reference', to: [{type: 'topic'}], group: 'taxonomy'}),
    defineField({name: 'secondaryTopics', title: 'Overige onderwerpen', type: 'array', of: [{type: 'reference', to: [{type: 'topic'}]}], group: 'taxonomy'}),
    defineField({name: 'lifeStages', title: 'Levensfasen', type: 'array', of: [{type: 'reference', to: [{type: 'lifeStage'}]}], group: 'taxonomy'}),
    defineField({name: 'minimumAgeMonths', title: 'Minimumleeftijd (maanden)', type: 'number', group: 'taxonomy', description: 'Alleen als het artikel specifieker is dan de levensfase.'}),
    defineField({name: 'maximumAgeMonths', title: 'Maximumleeftijd (maanden)', type: 'number', group: 'taxonomy'}),
    defineField({
      name: 'searchIntent', title: 'Zoekintentie', type: 'string', group: 'taxonomy',
      options: {list: [
        {title: 'Informatief', value: 'informational'},
        {title: 'Probleem oplossen', value: 'problem-solving'},
        {title: 'Vergelijking', value: 'comparison'},
        {title: 'Inspiratie', value: 'inspiration'},
        {title: 'Lokale gids', value: 'local-guide'},
        {title: 'Commercieel-redactioneel', value: 'commercial-editorial'},
      ]},
    }),
    defineField({name: 'location', title: 'Locatie', type: 'location', group: 'taxonomy'}),
    defineField({
      name: 'season', title: 'Seizoen', type: 'string', group: 'taxonomy',
      options: {list: [{title: 'Lente', value: 'spring'}, {title: 'Zomer', value: 'summer'}, {title: 'Herfst', value: 'autumn'}, {title: 'Winter', value: 'winter'}, {title: 'Feestdagen', value: 'holidays'}]},
    }),
    defineField({name: 'relatedArticles', title: 'Gerelateerde artikelen', type: 'array', of: [{type: 'reference', to: [{type: 'article'}]}], group: 'taxonomy', validation: (r) => r.max(6).unique(), description: 'Leeg = automatisch recente artikelen uit dezelfde pijler.'}),

    // Netwerk
    defineField({name: 'networkDestinations', title: 'Netwerkbestemmingen', type: 'array', of: [{type: 'networkDestination'}], group: 'network', description: 'Alleen als het inhoudelijk past bij de zoekintentie.'}),

    // Redactie
    defineField({name: 'author', title: 'Auteur', type: 'reference', to: [{type: 'author'}], group: 'editorial', description: 'Alleen een echte persoon. Leeg = de organisatie.'}),
    defineField({name: 'publishedAt', title: 'Publicatiedatum', type: 'datetime', group: 'editorial'}),
    defineField({name: 'updatedAt', title: 'Inhoudelijk bijgewerkt op', type: 'datetime', group: 'editorial', description: 'Alleen bij een echte inhoudelijke update.'}),
    defineField({name: 'lastReviewedAt', title: 'Laatst gecontroleerd op', type: 'date', group: 'editorial', description: 'Verplicht bij veranderlijke info (regels, toeslagen, prijzen, veiligheid).'}),
    defineField({
      name: 'reviewDueAt', title: 'Opnieuw controleren vóór', type: 'date', group: 'editorial',
      description: 'Datum waarop de inhoud verouderd kan zijn: nieuw toeslagjaar, nieuwe betaaldata, wetswijziging, jaarlijkse check. Stuurt de lijst "Te controleren" en de onderhoudstaak.',
      validation: (r) => r.custom((value, ctx) => {
        const doc = ctx.document as {lastReviewedAt?: string} | undefined
        if (!value) return doc?.lastReviewedAt ? {message: 'Veranderlijke info zonder controledatum: vul in wanneer dit opnieuw gecontroleerd moet worden.', level: 'warning'} as never : true
        if (String(value) < new Date().toISOString().slice(0, 10)) return {message: 'Controledatum is verstreken: controleer de inhoud en zet een nieuwe datum.', level: 'warning'} as never
        return true
      }),
    }),
    defineField({name: 'reviewNote', title: 'Wat verloopt er?', type: 'text', rows: 3, group: 'editorial', description: 'Intern. Welke cijfers, datums of regels moeten bij de controle opnieuw nagekeken worden, en bij welke bron.'}),
    defineField({name: 'sources', title: 'Bronnen', type: 'array', of: [{type: 'sourceRef'}], group: 'editorial'}),
    defineField({name: 'sourceNotes', title: 'Interne bronnotities', type: 'text', rows: 4, group: 'editorial', description: 'Niet publiek zichtbaar.'}),
    defineField({
      name: 'reviewStatus', title: 'Reviewstatus', type: 'string', group: 'editorial',
      options: {list: [
        {title: 'Concept', value: 'concept'},
        {title: 'Klaar voor review', value: 'needs_review'},
        {title: 'Goedgekeurd', value: 'approved'},
      ], layout: 'radio'},
      initialValue: 'concept',
      description: 'Workflowveld voor (AI-ondersteunde) productie. Publiceren blijft een handmatige Sanity-actie.',
    }),
    defineField({
      name: 'origin', title: 'Herkomst', type: 'string', group: 'editorial',
      options: {list: [{title: 'Redactie', value: 'editorial'}, {title: 'AI-ondersteund concept', value: 'ai-assisted'}, {title: 'Gemigreerd van oude site', value: 'migrated'}]},
      initialValue: 'editorial',
    }),
    defineField({name: 'legacyUrl', title: 'Oorspronkelijke URL (migratie)', type: 'string', group: 'editorial', readOnly: true}),

    // SEO
    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  validation: (r) => r.custom((doc) => {
    const d = doc as {reviewStatus?: string; origin?: string} | undefined
    if (d?.origin === 'ai-assisted' && d.reviewStatus !== 'approved') {
      return {message: 'AI-ondersteund artikel: zet reviewstatus op "Goedgekeurd" vóór publicatie.', level: 'warning'} as never
    }
    return true
  }),
  orderings: [{title: 'Publicatiedatum (nieuw → oud)', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', pillar: 'pillar.name', media: 'heroImage', status: 'reviewStatus', due: 'reviewDueAt'},
    prepare: ({title, pillar, media, status, due}) => {
      const overdue = due && String(due) < new Date().toISOString().slice(0, 10)
      return {title, subtitle: [pillar, status, overdue ? `controle verlopen (${due})` : due ? `controle ${due}` : null].filter(Boolean).join(' · '), media}
    },
  },
})

import {defineField, defineType} from 'sanity'
import {CalendarIcon} from '@sanity/icons/Calendar'

/**
 * Zwangerschap week voor week — één document per week (4–42), plus één voor week 1–3 samen
 * (week = 3, weekStart = 1). URL: /zwanger/<slug>/, bijv. /zwanger/12-weken-zwanger/.
 *
 * Geen medisch reviewer (besluit 23-10-2026): elke feitelijke uitspraak moet herleidbaar zijn
 * naar een Nederlandse, gezaghebbende bron. De build publiceert een week alleen met
 * reviewStatus "Goedgekeurd" en minimaal twee bronnen.
 *
 * Trimester wordt afgeleid uit `week` (1–12, 13–26, 27+; indeling deverloskundige.nl/KNOV) en niet opgeslagen.
 * Controles/regelzaken komen uit pregnancyMilestone, alarmsignalen uit trimesterInfo.
 */
export const expectedWeekSlug = (week?: number, weekStart?: number) => {
  if (!week) return undefined
  if (weekStart && weekStart < week) {
    return `${Array.from({length: week - weekStart + 1}, (_, i) => weekStart + i).join('-')}-weken-zwanger`
  }
  return `${week}-weken-zwanger`
}

export const pregnancyWeek = defineType({
  name: 'pregnancyWeek',
  title: 'Zwangerschapsweek',
  type: 'document',
  icon: CalendarIcon,
  groups: [
    {name: 'content', title: 'Inhoud', default: true},
    {name: 'links', title: 'Links & netwerk'},
    {name: 'editorial', title: 'Redactie & bronnen'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'week', title: 'Week', type: 'number', group: 'content',
      description: 'Zwangerschapsweek (4–42). Voor de pagina "1, 2 en 3 weken zwanger": 3, met "Vanaf week" 1.',
      validation: (r) => r.required().integer().min(1).max(42).custom(async (v, ctx) => {
        if (!v) return true
        const id = (ctx.document?._id ?? '').replace(/^drafts\./, '')
        const n = await ctx.getClient({apiVersion: '2025-02-19'}).fetch(
          'count(*[_type == "pregnancyWeek" && week == $w && !(_id in [$id, "drafts." + $id])])', {w: v, id},
        )
        return n === 0 || `Week ${v} bestaat al.`
      }),
    }),
    defineField({
      name: 'weekStart', title: 'Vanaf week (alleen bij een samengevoegde pagina)', type: 'number', group: 'content',
      description: 'Leeg laten, behalve voor week 1–3 (vul 1 in).',
      validation: (r) => r.integer().min(1).custom((v, ctx) => {
        const w = (ctx.document as {week?: number} | undefined)?.week
        return !v || !w || v < w ? true : '"Vanaf week" moet kleiner zijn dan "Week".'
      }),
    }),
    defineField({name: 'title', title: 'Titel (H1)', type: 'string', group: 'content', validation: (r) => r.required().max(110), description: 'Bijv. "12 weken zwanger: dit gebeurt er nu".'}),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug', group: 'content',
      options: {source: (doc) => expectedWeekSlug((doc as {week?: number}).week, (doc as {weekStart?: number}).weekStart) ?? '', maxLength: 40},
      description: 'Wordt automatisch "<week>-weken-zwanger" (week 1–3: "1-2-3-weken-zwanger"). Niet wijzigen na publicatie.',
      validation: (r) => r.required().custom((v, ctx) => {
        const d = ctx.document as {week?: number; weekStart?: number} | undefined
        const want = expectedWeekSlug(d?.week, d?.weekStart)
        return !v?.current || !want || v.current === want ? true : `Slug moet "${want}" zijn.`
      }),
    }),
    defineField({
      name: 'excerpt', title: 'Kort antwoord', type: 'text', rows: 3, group: 'content',
      description: 'Twee à drie zinnen bovenaan: wat is er deze week belangrijk. Ook fallback voor de meta description.',
      validation: (r) => r.required().max(300),
    }),
    defineField({
      name: 'heroImage', title: 'Hoofdafbeelding', type: 'image', group: 'content', options: {hotspot: true},
      fields: [
        defineField({name: 'alt', title: 'Alt-tekst', type: 'string', validation: (r) => r.custom((alt, ctx) => ((ctx.parent as {asset?: unknown})?.asset && !alt ? 'Alt-tekst is verplicht bij een afbeelding' : true))}),
        defineField({name: 'caption', title: 'Onderschrift', type: 'string'}),
      ],
    }),
    defineField({name: 'babyDevelopment', title: 'Je baby deze week', type: 'blockContent', group: 'content', validation: (r) => r.required()}),
    defineField({
      name: 'babySize', title: 'Lengte en gewicht', type: 'object', group: 'content',
      description: 'Alleen invullen met een bron. Geen bron = leeg laten.',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'lengthCm', title: 'Lengte (cm)', type: 'number', validation: (r) => r.min(0).max(60)}),
        defineField({name: 'lengthNote', title: 'Gemeten als', type: 'string', options: {list: [{title: 'Kruin-stuitlengte', value: 'kruin-stuit'}, {title: 'Kruin-hiellengte', value: 'kruin-hiel'}]}}),
        defineField({name: 'weightGram', title: 'Gewicht (gram)', type: 'number', validation: (r) => r.min(0).max(6000)}),
        defineField({name: 'sourceName', title: 'Bron', type: 'string'}),
        defineField({name: 'sourceUrl', title: 'URL bron', type: 'url'}),
      ],
      validation: (r) => r.custom((v) => {
        const s = v as {lengthCm?: number; weightGram?: number; sourceName?: string} | undefined
        if (!s || (s.lengthCm == null && s.weightGram == null)) return true
        return s.sourceName ? true : 'Lengte/gewicht alleen met bron.'
      }),
    }),
    defineField({name: 'bodyChanges', title: 'Je lichaam deze week', type: 'blockContent', group: 'content', validation: (r) => r.required()}),
    defineField({name: 'tips', title: 'Tips voor deze week', type: 'blockContent', group: 'content'}),
    defineField({name: 'faq', title: 'FAQ', type: 'array', of: [{type: 'faqItem'}], group: 'content', description: 'Alleen echte vragen voor deze week.'}),

    // Links & netwerk
    defineField({
      name: 'complaintArticles', title: 'Klachten die nu vaak voorkomen', type: 'array', group: 'links',
      of: [{type: 'reference', to: [{type: 'article'}], weak: true}],
      validation: (r) => r.max(6).unique(),
      description: 'Links naar bestaande klachtartikelen (misselijkheid, blaasontsteking…). Herhaal die inhoud niet op de weekpagina.',
    }),
    defineField({name: 'networkDestinations', title: 'Netwerkbestemmingen', type: 'array', of: [{type: 'networkDestination'}], group: 'links', validation: (r) => r.max(2)}),

    // Redactie & bronnen
    defineField({
      name: 'sources', title: 'Bronnen', type: 'array', of: [{type: 'sourceRef'}], group: 'editorial',
      description: 'Minimaal twee. Alleen Nederlandse, gezaghebbende bronnen (Thuisarts, deverloskundige.nl, pns.nl, RIVM, Voedingscentrum, Lareb, NVOG).',
      validation: (r) => r.required().min(2),
    }),
    defineField({name: 'publishedAt', title: 'Publicatiedatum', type: 'datetime', group: 'editorial'}),
    defineField({name: 'updatedAt', title: 'Inhoudelijk bijgewerkt op', type: 'datetime', group: 'editorial'}),
    defineField({name: 'lastReviewedAt', title: 'Bronnen gecontroleerd op', type: 'date', group: 'editorial', validation: (r) => r.required()}),
    defineField({name: 'reviewDueAt', title: 'Opnieuw controleren vóór', type: 'date', group: 'editorial'}),
    defineField({name: 'reviewNote', title: 'Wat verloopt er?', type: 'text', rows: 3, group: 'editorial'}),
    defineField({name: 'sourceNotes', title: 'Interne bronnotities / TWIJFEL-lijst', type: 'text', rows: 5, group: 'editorial', description: 'Niet publiek zichtbaar.'}),
    defineField({
      name: 'reviewStatus', title: 'Reviewstatus', type: 'string', group: 'editorial',
      options: {list: [{title: 'Concept', value: 'concept'}, {title: 'Klaar voor review', value: 'needs_review'}, {title: 'Goedgekeurd', value: 'approved'}], layout: 'radio'},
      initialValue: 'concept',
      description: 'Alleen "Goedgekeurd" wordt op de site getoond.',
    }),
    defineField({
      name: 'origin', title: 'Herkomst', type: 'string', group: 'editorial',
      options: {list: [{title: 'Redactie', value: 'editorial'}, {title: 'AI-ondersteund concept', value: 'ai-assisted'}]},
      initialValue: 'ai-assisted',
    }),

    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  orderings: [{title: 'Week', name: 'weekAsc', by: [{field: 'week', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', week: 'week', start: 'weekStart', status: 'reviewStatus', media: 'heroImage'},
    prepare: ({title, week, start, status, media}) => ({
      title: title ?? `Week ${week ?? '?'}`,
      subtitle: [start ? `week ${start}–${week}` : `week ${week ?? '?'}`, status].filter(Boolean).join(' · '),
      media,
    }),
  },
})

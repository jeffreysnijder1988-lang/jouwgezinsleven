import {defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'

/** Singleton (_id "siteSettings"): globale merk-, navigatie- en footergegevens. */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site-instellingen',
  type: 'document',
  icon: CogIcon,
  groups: [{name: 'brand', title: 'Merk', default: true}, {name: 'nav', title: 'Navigatie'}, {name: 'org', title: 'Organisatie'}],
  fields: [
    defineField({name: 'siteName', title: 'Sitenaam', type: 'string', group: 'brand', validation: (r) => r.required()}),
    defineField({name: 'shortName', title: 'Woordmerk naast logo', type: 'string', group: 'brand', description: 'Bijv. "JouwGezinsleven". Leeg = sitenaam.'}),
    defineField({name: 'tagline', title: 'Tagline', type: 'string', group: 'brand'}),
    defineField({name: 'footerTagline', title: 'Footer-tagline', type: 'string', group: 'brand'}),
    defineField({name: 'footerNote', title: 'Footer-onderbalk (tekst)', type: 'string', group: 'brand', description: 'Bijv. de affiliate-melding.'}),
    defineField({name: 'logo', title: 'Logo', type: 'image', group: 'brand', fields: [defineField({name: 'alt', title: 'Alt-tekst', type: 'string'})]}),
    defineField({name: 'defaultOgImage', title: 'Standaard social-afbeelding', type: 'image', group: 'brand', fields: [defineField({name: 'alt', title: 'Alt-tekst', type: 'string'})]}),
    defineField({
      name: 'mainNav', title: 'Hoofdmenu (pijlers)', type: 'array', group: 'nav',
      of: [{type: 'reference', to: [{type: 'topic'}], options: {filter: 'kind == "pillar"'}}],
      description: 'Zwanger · Baby & Peuter · Kinderopvang · Eropuit · Feestjes · Vakantie. Alleen wijzigen na besluit over navigatiestructuur.',
      validation: (r) => r.unique(),
    }),
    defineField({name: 'footerCompanyLinks', title: 'Footer: over JouwGezinsleven', type: 'array', group: 'nav', of: [{type: 'reference', to: [{type: 'page'}]}]}),
    defineField({name: 'footerNetworkLinks', title: 'Footer: Family Media Network', type: 'array', group: 'nav', of: [{type: 'footerLink'}]}),
    defineField({name: 'footerLegalLinks', title: 'Footer: juridisch', type: 'array', group: 'nav', of: [{type: 'reference', to: [{type: 'page'}]}]}),
    defineField({
      name: 'organization', title: 'Organisatiegegevens', type: 'object', group: 'org',
      fields: [
        defineField({name: 'legalName', title: 'Uitgever (juridische naam)', type: 'string'}),
        defineField({name: 'url', title: 'Website uitgever', type: 'url'}),
        defineField({name: 'city', title: 'Vestigingsplaats', type: 'string'}),
        defineField({name: 'kvkNumber', title: 'KvK-nummer', type: 'string'}),
        defineField({name: 'vatNumber', title: 'BTW-nummer', type: 'string'}),
        defineField({name: 'phone', title: 'Telefoon', type: 'string'}),
        defineField({name: 'email', title: 'E-mail', type: 'string', validation: (r) => r.email()}),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Site-instellingen'})},
})

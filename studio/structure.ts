import type {StructureResolver} from 'sanity/structure'
import {CogIcon} from '@sanity/icons/Cog'
import {HomeIcon} from '@sanity/icons/Home'
import {NumberIcon} from '@sanity/icons/Number'
import {CalendarIcon} from '@sanity/icons/Calendar'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('JouwGezinsleven')
    .items([
      S.listItem().title('Homepage').icon(HomeIcon).child(S.document().schemaType('homePage').documentId('homePage')),
      S.listItem().title('Site-instellingen').icon(CogIcon).child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.documentTypeListItem('article').title('Artikelen'),
      S.listItem().title('Artikelen ter review').child(
        S.documentList().title('Ter review').filter('_type == "article" && reviewStatus == "needs_review"'),
      ),
      S.listItem().title('Te controleren (verlopen of < 30 dagen)').child(() => {
        const soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
        return S.documentList()
          .title('Te controleren')
          .filter('_type in ["article", "factSet", "pregnancyWeek", "pregnancyMilestone", "trimesterInfo"] && defined(reviewDueAt) && reviewDueAt <= $soon')
          .params({soon})
          .defaultOrdering([{field: 'reviewDueAt', direction: 'asc'}])
      }),
      S.documentTypeListItem('factSet').title('Cijfers en regels').icon(NumberIcon),
      S.divider(),
      S.listItem().title('Zwangerschap week voor week').icon(CalendarIcon).child(
        S.list().title('Week voor week').items([
          S.listItem().title('Weekoverzicht (tekst)').child(S.document().schemaType('pregnancyHub').documentId('pregnancyHub')),
          S.documentTypeListItem('pregnancyWeek').title('Weken').child(
            S.documentList().title('Weken').filter('_type == "pregnancyWeek"').defaultOrdering([{field: 'week', direction: 'asc'}]),
          ),
          S.listItem().title('Weken ter review').child(
            S.documentList().title('Ter review').filter('_type == "pregnancyWeek" && reviewStatus != "approved"').defaultOrdering([{field: 'week', direction: 'asc'}]),
          ),
          S.documentTypeListItem('pregnancyMilestone').title('Afspraken en regelzaken'),
          S.documentTypeListItem('trimesterInfo').title('Trimesters (alarmsignalen)'),
        ]),
      ),
      S.divider(),
      S.listItem().title('Pijlers').child(S.documentList().title('Pijlers').filter('_type == "topic" && kind == "pillar"').defaultOrdering([{field: 'navOrder', direction: 'asc'}])),
      S.documentTypeListItem('topic').title('Alle onderwerpen'),
      S.documentTypeListItem('lifeStage').title('Levensfasen'),
      S.documentTypeListItem('page').title('Pagina’s'),
      S.documentTypeListItem('author').title('Auteurs'),
    ])

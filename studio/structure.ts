import type {StructureResolver} from 'sanity/structure'
import {CogIcon} from '@sanity/icons/Cog'
import {HomeIcon} from '@sanity/icons/Home'

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
      S.divider(),
      S.listItem().title('Pijlers').child(S.documentList().title('Pijlers').filter('_type == "topic" && kind == "pillar"').defaultOrdering([{field: 'navOrder', direction: 'asc'}])),
      S.documentTypeListItem('topic').title('Alle onderwerpen'),
      S.documentTypeListItem('lifeStage').title('Levensfasen'),
      S.documentTypeListItem('page').title('Pagina’s'),
      S.documentTypeListItem('author').title('Auteurs'),
    ])

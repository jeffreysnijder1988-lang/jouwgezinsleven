import {seo} from './objects/seo'
import {networkDestination} from './objects/networkDestination'
import {faqItem} from './objects/faqItem'
import {sourceRef} from './objects/sourceRef'
import {location} from './objects/location'
import {ctaLink, footerLink} from './objects/linkTargets'
import {blockContent} from './objects/blockContent'
import {article} from './documents/article'
import {topic} from './documents/topic'
import {lifeStage} from './documents/lifeStage'
import {author} from './documents/author'
import {page} from './documents/page'
import {siteSettings} from './documents/siteSettings'
import {homePage} from './documents/homePage'
import {factSet} from './documents/factSet'
import {pregnancyWeek} from './documents/pregnancyWeek'
import {pregnancyMilestone} from './documents/pregnancyMilestone'
import {trimesterInfo} from './documents/trimesterInfo'
import {pregnancyHub} from './documents/pregnancyHub'
import {contentBrief} from './documents/contentBrief'

export const schemaTypes = [
  // documents
  article, topic, lifeStage, author, page, siteSettings, homePage, factSet,
  pregnancyWeek, pregnancyMilestone, trimesterInfo, pregnancyHub,
  contentBrief,
  // objects
  seo, networkDestination, faqItem, sourceRef, location, ctaLink, footerLink, blockContent,
]

export const SINGLETONS = ['siteSettings', 'homePage', 'pregnancyHub']

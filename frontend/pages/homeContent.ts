import {
  homeAnniversaryBannerSchema,
  homeCareersHeaderSchema,
  homeCareersOpenPositionsSchema,
  homeCareersResumeIntroSchema,
  homeContactSchema,
  homeCoreValuesHeaderSchema,
  homeCoreValuesItemsSchema,
  homeDivisionsHeaderSchema,
  homeDivisionsItemsSchema,
  homeFooterSchema,
  homeHeaderBrandSchema,
  homeHeroSchema,
  homeJourneyHeaderSchema,
  homeJourneyTimelineSchema,
  homeLeadershipHeaderSchema,
  homeLeadershipMembersSchema,
  homeNewsHeaderSchema,
  homeNewsItemsSchema,
  homeV2SeedData,
  type HomeAnniversaryBanner,
  type HomeCareerPosition,
  type HomeCareersHeader,
  type HomeCareersResumeIntro,
  type HomeContact,
  type HomeCoreValueItem,
  type HomeCoreValuesHeader,
  type HomeDivisionItem,
  type HomeDivisionsHeader,
  type HomeFooter,
  type HomeHeaderBrand,
  type HomeHero,
  type HomeJourneyHeader,
  type HomeLeadershipHeader,
  type HomeLeadershipMember,
  type HomeNewsHeader,
  type HomeNewsItem,
  type HomeTimelineItem,
  type PageContent,
} from '@app/schemas';

interface Parser<Output> {
  parse(value: unknown): Output;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isLegacyHomeValue(entityId: keyof typeof homeV2SeedData, value: unknown): boolean {
  if (isRecord(value) && 'content' in value && 'media' in value && 'externalUrls' in value)
    return true;
  if (!Array.isArray(value)) return false;
  const first = value[0];
  if (!isRecord(first)) return false;
  if (entityId === 'home.divisions.items') return 'href' in first || 'color' in first;
  if (entityId === 'home.leadership.members') return !('photoAltText' in first);
  if (entityId === 'home.news.items')
    return typeof first['date'] === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(first['date']);
  if (entityId === 'home.careers.open-positions') return 'type' in first;
  return false;
}

const parseOrSeed = <Output>(
  document: PageContent,
  entityId: keyof typeof homeV2SeedData,
  parser: Parser<Output>,
): Output => {
  const candidate = document[entityId];
  return parser.parse(
    candidate === undefined || isLegacyHomeValue(entityId, candidate)
      ? homeV2SeedData[entityId]
      : candidate,
  );
};

export interface HomePageDocument {
  readonly anniversaryBanner: HomeAnniversaryBanner;
  readonly headerBrand: HomeHeaderBrand;
  readonly hero: HomeHero;
  readonly divisionsHeader: HomeDivisionsHeader;
  readonly divisions: readonly HomeDivisionItem[];
  readonly coreValuesHeader: HomeCoreValuesHeader;
  readonly coreValues: readonly HomeCoreValueItem[];
  readonly journeyHeader: HomeJourneyHeader;
  readonly timeline: readonly HomeTimelineItem[];
  readonly leadershipHeader: HomeLeadershipHeader;
  readonly leaders: readonly HomeLeadershipMember[];
  readonly newsHeader: HomeNewsHeader;
  readonly news: readonly HomeNewsItem[];
  readonly careersHeader: HomeCareersHeader;
  readonly positions: readonly HomeCareerPosition[];
  readonly resumeIntro: HomeCareersResumeIntro;
  readonly contact: HomeContact;
  readonly footer: HomeFooter;
}

export function parseHomePageDocument(document: PageContent): HomePageDocument {
  return {
    anniversaryBanner: parseOrSeed(
      document,
      'home.anniversary-banner',
      homeAnniversaryBannerSchema,
    ),
    headerBrand: parseOrSeed(document, 'home.header.brand', homeHeaderBrandSchema),
    hero: parseOrSeed(document, 'home.hero', homeHeroSchema),
    divisionsHeader: parseOrSeed(document, 'home.divisions.header', homeDivisionsHeaderSchema),
    divisions: parseOrSeed(document, 'home.divisions.items', homeDivisionsItemsSchema),
    coreValuesHeader: parseOrSeed(document, 'home.core-values.header', homeCoreValuesHeaderSchema),
    coreValues: parseOrSeed(document, 'home.core-values.items', homeCoreValuesItemsSchema),
    journeyHeader: parseOrSeed(document, 'home.journey.header', homeJourneyHeaderSchema),
    timeline: parseOrSeed(document, 'home.journey.timeline', homeJourneyTimelineSchema),
    leadershipHeader: parseOrSeed(document, 'home.leadership.header', homeLeadershipHeaderSchema),
    leaders: parseOrSeed(document, 'home.leadership.members', homeLeadershipMembersSchema),
    newsHeader: parseOrSeed(document, 'home.news.header', homeNewsHeaderSchema),
    news: parseOrSeed(document, 'home.news.items', homeNewsItemsSchema),
    careersHeader: parseOrSeed(document, 'home.careers.header', homeCareersHeaderSchema),
    positions: parseOrSeed(document, 'home.careers.open-positions', homeCareersOpenPositionsSchema),
    resumeIntro: parseOrSeed(document, 'home.careers.resume-intro', homeCareersResumeIntroSchema),
    contact: parseOrSeed(document, 'home.contact', homeContactSchema),
    footer: parseOrSeed(document, 'home.footer', homeFooterSchema),
  };
}

export const defaultHomePageDocument = parseHomePageDocument({});

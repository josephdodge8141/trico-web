import { z } from 'zod';

import {
  defineEntityModule,
  defineSemanticEntity,
  type EditorControl,
  type EditorField,
  type EntityEditorDefinition,
  type EntityViewCatalogEntry,
  type LeafEditorControl,
  type LeafEditorField,
  type SemanticEntityDefinition,
} from './editor-contracts.js';
import type { EditableValue } from './content.js';
import { lucideIconChoices, lucideIconNameSchema } from './lucide-icons.js';

export const HOME_CONTENT_SCHEMA_VERSION = 2 as const;

const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum);
const uuid = z.uuid();
const managedImageSchema = z.strictObject({
  kind: z.literal('managed'),
  key: requiredText(1_024),
});
const pageDestinationSchema = z.strictObject({
  kind: z.literal('page'),
  pageId: z.enum([
    'home',
    'property-management',
    'real-estate',
    'construction',
    'storage',
    'development',
  ]),
});

export const homeAnniversaryBannerSchema = z.strictObject({
  message: requiredText(120),
});
export const homeHeaderBrandSchema = z.strictObject({
  logo: managedImageSchema,
  altText: requiredText(160),
});
export const homeHeroSchema = z.strictObject({
  heading: requiredText(160),
  description: requiredText(1_000),
});
export const homeDivisionsHeaderSchema = z.strictObject({
  heading: requiredText(160),
  description: requiredText(1_000),
});
export const homeDivisionItemSchema = z.strictObject({
  id: uuid,
  title: requiredText(120),
  description: requiredText(1_000),
  icon: lucideIconNameSchema,
  destination: pageDestinationSchema,
});
export const homeDivisionsItemsSchema = z.array(homeDivisionItemSchema);
export const homeCoreValuesHeaderSchema = z.strictObject({
  heading: requiredText(160),
  description: requiredText(1_000),
});
export const homeCoreValueItemSchema = z.strictObject({
  id: uuid,
  title: requiredText(120),
  description: requiredText(1_000),
  icon: lucideIconNameSchema,
});
export const homeCoreValuesItemsSchema = z.array(homeCoreValueItemSchema);
export const homeJourneyHeaderSchema = z.strictObject({
  eyebrow: requiredText(120),
  heading: requiredText(160),
  description: requiredText(1_000),
  history: requiredText(4_000),
});
export const homeTimelineItemSchema = z.strictObject({
  id: uuid,
  year: requiredText(20),
  event: requiredText(1_000),
});
export const homeJourneyTimelineSchema = z.array(homeTimelineItemSchema);
export const homeLeadershipHeaderSchema = z.strictObject({
  heading: requiredText(160),
  description: requiredText(1_000),
  note: requiredText(500),
});
export const homeLeadershipMemberSchema = z.strictObject({
  id: uuid,
  name: requiredText(160),
  role: requiredText(160),
  photo: managedImageSchema,
  photoAltText: requiredText(200),
});
export const homeLeadershipMembersSchema = z.array(homeLeadershipMemberSchema);
export const homeNewsHeaderSchema = z.strictObject({
  heading: requiredText(160),
  description: requiredText(1_000),
});
export const homeNewsItemSchema = z.strictObject({
  id: uuid,
  date: z.iso.date(),
  title: requiredText(200),
  description: requiredText(2_000),
});
export const homeNewsItemsSchema = z.array(homeNewsItemSchema);
export const homeCareersHeaderSchema = z.strictObject({
  heading: requiredText(160),
  description: requiredText(1_500),
});
export const homeCareerPositionSchema = z.strictObject({
  id: uuid,
  title: requiredText(160),
  division: z.enum([
    'Corporate',
    'Property Management',
    'Real Estate',
    'Construction',
    'Storage Management',
    'Development',
  ]),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Seasonal']),
});
export const homeCareersOpenPositionsSchema = z.array(homeCareerPositionSchema);
export const homeCareersResumeIntroSchema = z.strictObject({
  heading: requiredText(160),
  description: requiredText(1_000),
});
const licenseSchema = z.strictObject({
  id: uuid,
  label: requiredText(120),
});
export const homeContactSchema = z.strictObject({
  heading: requiredText(160),
  description: requiredText(1_000),
  address: requiredText(300),
  email: z.email(),
  phone: requiredText(40),
  fax: requiredText(40),
  licenses: z.array(licenseSchema),
});
export const homeFooterSchema = z.strictObject({
  logo: managedImageSchema,
  altText: requiredText(160),
  organizationName: requiredText(160),
  rightsNotice: requiredText(200),
});

export type HomeAnniversaryBanner = z.infer<typeof homeAnniversaryBannerSchema>;
export type HomeHeaderBrand = z.infer<typeof homeHeaderBrandSchema>;
export type HomeHero = z.infer<typeof homeHeroSchema>;
export type HomeDivisionsHeader = z.infer<typeof homeDivisionsHeaderSchema>;
export type HomeDivisionItem = z.infer<typeof homeDivisionItemSchema>;
export type HomeCoreValuesHeader = z.infer<typeof homeCoreValuesHeaderSchema>;
export type HomeCoreValueItem = z.infer<typeof homeCoreValueItemSchema>;
export type HomeJourneyHeader = z.infer<typeof homeJourneyHeaderSchema>;
export type HomeTimelineItem = z.infer<typeof homeTimelineItemSchema>;
export type HomeLeadershipHeader = z.infer<typeof homeLeadershipHeaderSchema>;
export type HomeLeadershipMember = z.infer<typeof homeLeadershipMemberSchema>;
export type HomeNewsHeader = z.infer<typeof homeNewsHeaderSchema>;
export type HomeNewsItem = z.infer<typeof homeNewsItemSchema>;
export type HomeCareersHeader = z.infer<typeof homeCareersHeaderSchema>;
export type HomeCareerPosition = z.infer<typeof homeCareerPositionSchema>;
export type HomeCareersResumeIntro = z.infer<typeof homeCareersResumeIntroSchema>;
export type HomeContact = z.infer<typeof homeContactSchema>;
export type HomeFooter = z.infer<typeof homeFooterSchema>;

const invalid = 'Check this field and try again.';
const required = (label: string) => `Enter ${label.toLowerCase()}.`;

function field(
  path: readonly string[],
  label: string,
  order: number,
  control: EditorControl,
  options: { readonly helpText?: string; readonly required?: boolean } = {},
): EditorField {
  const isRequired = options.required ?? control.type !== 'system';
  return {
    path: [...path],
    label,
    ...(options.helpText === undefined ? {} : { helpText: options.helpText }),
    required: isRequired,
    order,
    validationMessages: {
      ...(isRequired && control.type !== 'system' ? { required: required(label) } : {}),
      invalid,
    },
    control,
  };
}

function leafField(
  path: readonly string[],
  label: string,
  order: number,
  control: LeafEditorControl,
): LeafEditorField {
  return field(path, label, order, control) as LeafEditorField;
}

const short = (maxLength: number): LeafEditorControl => ({ type: 'short-text', maxLength });
const long = (rows: number, maxLength: number): LeafEditorControl => ({
  type: 'multiline-text',
  rows,
  maxLength,
});
const identity = (): LeafEditorControl => ({ type: 'system', immutable: true });
const image = (altTextPath: readonly string[]): LeafEditorControl => ({
  type: 'media-picker',
  mediaKind: 'image',
  supportsFocalPoint: false,
  altTextPath: [...altTextPath],
});
const icon = (): LeafEditorControl => ({
  type: 'icon-picker',
  choices: lucideIconChoices,
});
const choice = (values: readonly string[]): LeafEditorControl => ({
  type: 'enum',
  display: 'select',
  choices: values.map((value) => ({ value, label: value })),
});

function objectEditor(
  label: string,
  helpText: string,
  fields: readonly EditorField[],
): Extract<EntityEditorDefinition, { kind: 'object' }> {
  return {
    version: HOME_CONTENT_SCHEMA_VERSION,
    kind: 'object',
    label,
    helpText,
    groups: [{ id: 'content', label: 'Content', order: 0, fields: [...fields] }],
  };
}

function listEditor(
  label: string,
  helpText: string,
  itemLabel: string,
  blankItem: EditableValue,
  fields: readonly EditorField[],
): Extract<EntityEditorDefinition, { kind: 'list' }> {
  return {
    version: HOME_CONTENT_SCHEMA_VERSION,
    kind: 'list',
    label,
    helpText,
    itemLabel,
    itemLabelPath: ['title'],
    addLabel: `Add ${itemLabel.toLowerCase()}`,
    blankItem,
    reorderable: true,
    groups: [{ id: 'details', label: `${itemLabel} details`, order: 0, fields: [...fields] }],
  };
}

const blankIds = {
  division: '00000000-0000-4000-8000-000000000001',
  value: '00000000-0000-4000-8000-000000000002',
  milestone: '00000000-0000-4000-8000-000000000003',
  leader: '00000000-0000-4000-8000-000000000004',
  news: '00000000-0000-4000-8000-000000000005',
  position: '00000000-0000-4000-8000-000000000006',
} as const;

function entity(
  definition: Omit<SemanticEntityDefinition, 'pageId' | 'publicPath'>,
): SemanticEntityDefinition {
  return defineSemanticEntity({
    ...definition,
    pageId: 'home',
    publicPath: definition.id.split('.'),
  });
}

export const homeEntityDefinitions = [
  entity({
    id: 'home.anniversary-banner',
    kind: 'object',
    label: 'Anniversary Banner',
    schema: homeAnniversaryBannerSchema,
    editor: objectEditor('Anniversary banner', 'Update the short celebration message.', [
      field(['message'], 'Banner message', 0, short(120)),
    ]),
  }),
  entity({
    id: 'home.header.brand',
    kind: 'object',
    label: 'Header Brand',
    schema: homeHeaderBrandSchema,
    editor: objectEditor('Header logo', 'Choose the logo shown at the top of the page.', [
      field(['logo'], 'Logo', 0, image(['altText'])),
      field(['altText'], 'Logo description', 1, short(160)),
    ]),
  }),
  entity({
    id: 'home.hero',
    kind: 'object',
    label: 'Hero',
    schema: homeHeroSchema,
    editor: objectEditor('Opening message', 'Update the main heading and introduction.', [
      field(['heading'], 'Main heading', 0, long(2, 160)),
      field(['description'], 'Introduction', 1, long(5, 1_000)),
    ]),
  }),
  entity({
    id: 'home.divisions.header',
    kind: 'object',
    label: 'Divisions Header',
    schema: homeDivisionsHeaderSchema,
    editor: objectEditor('Divisions heading', 'Introduce the family of companies.', [
      field(['heading'], 'Heading', 0, short(160)),
      field(['description'], 'Description', 1, long(4, 1_000)),
    ]),
  }),
  entity({
    id: 'home.divisions.items',
    kind: 'list',
    label: 'Divisions Items',
    schema: homeDivisionsItemsSchema,
    listItemSchema: homeDivisionItemSchema,
    editor: listEditor(
      'Divisions',
      'Add, remove, or reorder company divisions.',
      'Division',
      {
        id: blankIds.division,
        title: 'New division',
        description: 'Add a description.',
        icon: 'Building2',
        destination: { kind: 'page', pageId: 'home' },
      },
      [
        field(['id'], 'Item identity', 0, identity()),
        field(['title'], 'Division name', 1, short(120)),
        field(['description'], 'Description', 2, long(5, 1_000)),
        field(['icon'], 'Icon', 3, icon()),
        field(['destination'], 'Destination', 4, {
          type: 'link-builder',
          allowedDestinations: ['page'],
        }),
      ],
    ),
  }),
  entity({
    id: 'home.core-values.header',
    kind: 'object',
    label: 'Core Values Header',
    schema: homeCoreValuesHeaderSchema,
    editor: objectEditor('Core values heading', 'Introduce the principles that guide Trico.', [
      field(['heading'], 'Heading', 0, short(160)),
      field(['description'], 'Description', 1, long(4, 1_000)),
    ]),
  }),
  entity({
    id: 'home.core-values.items',
    kind: 'list',
    label: 'Core Values Items',
    schema: homeCoreValuesItemsSchema,
    listItemSchema: homeCoreValueItemSchema,
    editor: listEditor(
      'Core values',
      'Add, remove, or reorder core values.',
      'Core value',
      { id: blankIds.value, title: 'New value', description: 'Add a description.', icon: 'Heart' },
      [
        field(['id'], 'Item identity', 0, identity()),
        field(['title'], 'Value name', 1, short(120)),
        field(['description'], 'Description', 2, long(5, 1_000)),
        field(['icon'], 'Icon', 3, icon()),
      ],
    ),
  }),
  entity({
    id: 'home.journey.header',
    kind: 'object',
    label: 'Journey Header',
    schema: homeJourneyHeaderSchema,
    editor: objectEditor('Company journey', 'Introduce Trico’s history and timeline.', [
      field(['eyebrow'], 'Introductory label', 0, short(120)),
      field(['heading'], 'Heading', 1, short(160)),
      field(['description'], 'Summary', 2, long(4, 1_000)),
      field(['history'], 'Company history', 3, long(8, 4_000)),
    ]),
  }),
  entity({
    id: 'home.journey.timeline',
    kind: 'list',
    label: 'Journey Timeline',
    schema: homeJourneyTimelineSchema,
    listItemSchema: homeTimelineItemSchema,
    editor: {
      ...listEditor(
        'Timeline',
        'Add, remove, or reorder company milestones.',
        'Milestone',
        { id: blankIds.milestone, year: 'Year', event: 'Describe the milestone.' },
        [
          field(['id'], 'Item identity', 0, identity()),
          field(['year'], 'Year or label', 1, short(20)),
          field(['event'], 'Milestone', 2, long(4, 1_000)),
        ],
      ),
      itemLabelPath: ['year'],
    },
  }),
  entity({
    id: 'home.leadership.header',
    kind: 'object',
    label: 'Leadership Header',
    schema: homeLeadershipHeaderSchema,
    editor: objectEditor('Leadership heading', 'Introduce the leadership team.', [
      field(['heading'], 'Heading', 0, short(160)),
      field(['description'], 'Description', 1, long(4, 1_000)),
      field(['note'], 'Closing note', 2, long(3, 500)),
    ]),
  }),
  entity({
    id: 'home.leadership.members',
    kind: 'list',
    label: 'Leadership Members',
    schema: homeLeadershipMembersSchema,
    listItemSchema: homeLeadershipMemberSchema,
    editor: {
      ...listEditor(
        'Leadership team',
        'Add, remove, or reorder leadership profiles.',
        'Team member',
        {
          id: blankIds.leader,
          name: 'New team member',
          role: 'Role',
          photo: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
          photoAltText: 'Portrait of the team member',
        },
        [
          field(['id'], 'Item identity', 0, identity()),
          field(['name'], 'Name', 1, short(160)),
          field(['role'], 'Role', 2, short(160)),
          field(['photo'], 'Photo', 3, image(['photoAltText'])),
          field(['photoAltText'], 'Photo description', 4, short(200)),
        ],
      ),
      itemLabelPath: ['name'],
    },
  }),
  entity({
    id: 'home.news.header',
    kind: 'object',
    label: 'News Header',
    schema: homeNewsHeaderSchema,
    editor: objectEditor('News heading', 'Introduce recent news and updates.', [
      field(['heading'], 'Heading', 0, short(160)),
      field(['description'], 'Description', 1, long(4, 1_000)),
    ]),
  }),
  entity({
    id: 'home.news.items',
    kind: 'list',
    label: 'News Items',
    schema: homeNewsItemsSchema,
    listItemSchema: homeNewsItemSchema,
    editor: listEditor(
      'News items',
      'Add, remove, or reorder news items.',
      'News item',
      {
        id: blankIds.news,
        date: '2026-01-01',
        title: 'News title',
        description: 'Add a short update.',
      },
      [
        field(['id'], 'Item identity', 0, identity()),
        field(['date'], 'Date', 1, { type: 'date' }),
        field(['title'], 'Title', 2, short(200)),
        field(['description'], 'Description', 3, long(6, 2_000)),
      ],
    ),
  }),
  entity({
    id: 'home.careers.header',
    kind: 'object',
    label: 'Careers Header',
    schema: homeCareersHeaderSchema,
    editor: objectEditor('Careers heading', 'Introduce employment opportunities.', [
      field(['heading'], 'Heading', 0, short(160)),
      field(['description'], 'Description', 1, long(5, 1_500)),
    ]),
  }),
  entity({
    id: 'home.careers.open-positions',
    kind: 'list',
    label: 'Careers Open Positions',
    schema: homeCareersOpenPositionsSchema,
    listItemSchema: homeCareerPositionSchema,
    editor: listEditor(
      'Open positions',
      'Add, remove, or reorder job openings.',
      'Position',
      {
        id: blankIds.position,
        title: 'New position',
        division: 'Corporate',
        employmentType: 'Full-time',
      },
      [
        field(['id'], 'Item identity', 0, identity()),
        field(['title'], 'Position title', 1, short(160)),
        field(
          ['division'],
          'Division',
          2,
          choice([
            'Corporate',
            'Property Management',
            'Real Estate',
            'Construction',
            'Storage Management',
            'Development',
          ]),
        ),
        field(
          ['employmentType'],
          'Employment type',
          3,
          choice(['Full-time', 'Part-time', 'Contract', 'Seasonal']),
        ),
      ],
    ),
  }),
  entity({
    id: 'home.careers.resume-intro',
    kind: 'object',
    label: 'Careers Resume Intro',
    schema: homeCareersResumeIntroSchema,
    editor: objectEditor(
      'Resume form introduction',
      'Update the words above the client-only resume form.',
      [
        field(['heading'], 'Heading', 0, short(160)),
        field(['description'], 'Description', 1, long(4, 1_000)),
      ],
    ),
  }),
  entity({
    id: 'home.contact',
    kind: 'object',
    label: 'Contact',
    schema: homeContactSchema,
    editor: objectEditor('Corporate contact', 'Update the public corporate contact details.', [
      field(['heading'], 'Heading', 0, short(160)),
      field(['description'], 'Description', 1, long(4, 1_000)),
      field(['address'], 'Street address', 2, long(3, 300)),
      field(['email'], 'Email address', 3, { type: 'email' }),
      field(['phone'], 'Telephone', 4, { type: 'phone', country: 'US' }),
      field(['fax'], 'Fax', 5, { type: 'phone', country: 'US' }),
      field(['licenses'], 'Licenses', 6, {
        type: 'nested-collection',
        itemLabel: 'License',
        addLabel: 'Add license',
        itemLabelPath: ['label'],
        reorderable: true,
        blankItem: { id: '00000000-0000-4000-8000-000000000007', label: 'License number' },
        itemFields: [
          leafField(['id'], 'Item identity', 0, identity()),
          leafField(['label'], 'License', 1, short(120)),
        ],
      }),
    ]),
  }),
  entity({
    id: 'home.footer',
    kind: 'object',
    label: 'Footer',
    schema: homeFooterSchema,
    editor: objectEditor('Footer', 'Update the footer logo and copyright wording.', [
      field(['logo'], 'Logo', 0, image(['altText'])),
      field(['altText'], 'Logo description', 1, short(160)),
      field(['organizationName'], 'Organization name', 2, short(160)),
      field(['rightsNotice'], 'Rights notice', 3, short(200)),
    ]),
  }),
] as const satisfies readonly SemanticEntityDefinition[];

const objectEntry = (
  entityId: string,
  slotId: string,
  legacyComponent: string,
): EntityViewCatalogEntry => ({
  entityId,
  pageId: 'home',
  legacyComponent,
  primary: { slotId, routes: ['/'] },
  secondary: [],
  emptyState: { kind: 'not-applicable' },
});
const listEntry = (
  entityId: string,
  slotId: string,
  legacyComponent: string,
  itemLabel: string,
): EntityViewCatalogEntry => ({
  entityId,
  pageId: 'home',
  legacyComponent,
  primary: { slotId, routes: ['/'] },
  secondary: [],
  emptyState: {
    kind: 'editable-empty-state',
    heading: `No ${itemLabel.toLowerCase()} yet`,
    description: `Add the first ${itemLabel.toLowerCase()} when you are ready.`,
    addLabel: `Add ${itemLabel.toLowerCase()}`,
  },
});

export const homeEntityViewCatalog = [
  objectEntry(
    'home.anniversary-banner',
    'home.anniversary-banner.primary',
    'TricoLanding anniversary banner',
  ),
  objectEntry('home.header.brand', 'home.header.brand.primary', 'TricoLanding header'),
  objectEntry('home.hero', 'home.hero.primary', 'TricoLanding hero'),
  objectEntry(
    'home.divisions.header',
    'home.divisions.header.primary',
    'TricoLanding divisions heading',
  ),
  listEntry(
    'home.divisions.items',
    'home.divisions.items.primary',
    'TricoLanding divisions grid',
    'Division',
  ),
  objectEntry(
    'home.core-values.header',
    'home.core-values.header.primary',
    'TricoLanding core values heading',
  ),
  listEntry(
    'home.core-values.items',
    'home.core-values.items.primary',
    'TricoLanding core values grid',
    'Core value',
  ),
  objectEntry(
    'home.journey.header',
    'home.journey.header.primary',
    'TricoLanding company timeline heading',
  ),
  listEntry(
    'home.journey.timeline',
    'home.journey.timeline.primary',
    'TricoLanding company timeline',
    'Milestone',
  ),
  objectEntry(
    'home.leadership.header',
    'home.leadership.header.primary',
    'TricoLanding leadership heading',
  ),
  listEntry(
    'home.leadership.members',
    'home.leadership.members.primary',
    'TricoLanding leadership grid',
    'Team member',
  ),
  objectEntry('home.news.header', 'home.news.header.primary', 'TricoLanding news heading'),
  listEntry('home.news.items', 'home.news.items.primary', 'TricoLanding news grid', 'News item'),
  objectEntry('home.careers.header', 'home.careers.header.primary', 'TricoLanding careers heading'),
  listEntry(
    'home.careers.open-positions',
    'home.careers.open-positions.primary',
    'TricoLanding open positions',
    'Position',
  ),
  objectEntry(
    'home.careers.resume-intro',
    'home.careers.resume-intro.primary',
    'TricoLanding resume introduction',
  ),
  objectEntry('home.contact', 'home.contact.primary', 'TricoLanding contact section'),
  objectEntry('home.footer', 'home.footer.primary', 'TricoLanding footer'),
] as const satisfies readonly EntityViewCatalogEntry[];

export const homeEntityModule = defineEntityModule({
  pageId: 'home',
  entities: homeEntityDefinitions,
  viewCatalog: homeEntityViewCatalog,
});

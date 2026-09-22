import { z } from 'zod';

import type { EditableValue } from './content.js';
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
import { lucideIconChoices, lucideIconNameSchema } from './lucide-icons.js';

export const CONSTRUCTION_CONTENT_SCHEMA_VERSION = 2 as const;
export const constructionCategoryIds = [
  'multi-family',
  'retail',
  'office-ti',
  'medical-dental',
  'industrial',
  'storage',
  'subdivisions',
  'underground',
] as const;
export const constructionProjectStatuses = ['current', 'completed'] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const phone = z
  .string()
  .trim()
  .regex(/^\+?[()\-\s\d]{7,40}$/);
const optionalPhone = z.union([z.literal(''), phone]);
const optionalEmail = z.union([z.literal(''), z.email()]);
const optionalExternalUrl = z.union([z.literal(''), z.url()]);
const id = z.uuid();
const managedImage = z.strictObject({ kind: z.literal('managed'), key: text(1_024) });
const icon = lucideIconNameSchema;
const destination = z.enum([
  'services',
  'projects',
  'plan-room',
  'pros',
  'team',
  'bid',
  'careers',
  'reviews',
  'about',
  'contact',
]);
const sectionHeading = z.strictObject({
  eyebrow: text(120),
  heading: text(220),
  description: text(2_000),
});

export const constructionAnniversaryBannerSchema = z.strictObject({ message: text(120) });
export const constructionHeaderSchema = z.strictObject({
  logo: managedImage,
  logoAltText: text(160),
  divisionLabel: text(80),
  phone,
  actionLabel: text(80),
  navLinks: z.array(z.strictObject({ id, label: text(80), destination })),
});
export const constructionHeroSchema = z.strictObject({
  primaryBadge: text(120),
  serviceAreaBadge: text(120),
  heading: text(180),
  locationHeading: text(180),
  promise: text(300),
  description: text(1_500),
  primaryActionLabel: text(80),
  secondaryActionLabel: text(80),
  image: managedImage,
  imageAltText: text(200),
});
export const constructionHeroStatSchema = z.strictObject({
  id,
  icon,
  value: text(40),
  label: text(100),
});
export const constructionHeroStatsSchema = z.array(constructionHeroStatSchema);
export const constructionServicesHeaderSchema = sectionHeading;
export const constructionServiceSchema = z.strictObject({
  id,
  icon,
  title: text(180),
  description: text(2_000),
});
export const constructionServicesItemsSchema = z.array(constructionServiceSchema);
export const constructionProjectsHeaderSchema = sectionHeading.extend({
  cardActionLabel: text(80),
});
export const constructionProjectCategorySchema = z.strictObject({
  label: text(120),
  blurb: text(800),
});
export const constructionProjectSchema = z.strictObject({
  id,
  name: text(200),
  description: text(2_000),
  address: optionalText(300),
  owner: optionalText(200),
  architect: optionalText(200),
  engineer: optionalText(200),
  squareFeet: optionalText(80),
  dateLabel: optionalText(100),
  photo: managedImage,
  photoAltText: text(200),
});
export const constructionProjectsSchema = z.array(constructionProjectSchema);
export const constructionPlanRoomHeaderSchema = sectionHeading.extend({
  planListHeading: text(120),
  viewPlansLabel: text(80),
  specificationsLabel: text(80),
});
export const constructionPlanRoomAccessSchema = z.strictObject({
  icon,
  heading: text(160),
  description: text(1_000),
});
export const constructionPlanSetSchema = z.strictObject({
  id,
  name: text(200),
  projectNumber: text(80),
  lastUpdated: text(100),
  sheetCount: z.number().int().nonnegative().max(100_000),
  latestRevision: text(40),
});
export const constructionPlanSetsSchema = z.array(constructionPlanSetSchema);
export const constructionPlanRoomRequestSchema = z.strictObject({
  heading: text(160),
  description: text(1_000),
  actionLabel: text(80),
  email: z.email(),
});
export const constructionProsHeaderSchema = sectionHeading;
export const constructionProSchema = z.strictObject({
  id,
  icon,
  title: text(160),
  description: text(2_000),
});
export const constructionProsItemsSchema = z.array(constructionProSchema);
export const constructionProStatSchema = z.strictObject({ id, value: text(40), label: text(100) });
export const constructionProStatsSchema = z.array(constructionProStatSchema);
export const constructionTeamHeaderSchema = sectionHeading;
export const constructionTeamMemberSchema = z.strictObject({
  id,
  name: text(160),
  title: text(160),
  email: optionalEmail,
  phone: optionalPhone,
  photo: managedImage,
  photoAltText: text(200),
});
export const constructionTeamMembersSchema = z.array(constructionTeamMemberSchema);
export const constructionWorkersSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(180),
  description: text(1_000),
  image: managedImage,
  imageAltText: text(200),
});
export const constructionAboutSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(220),
  introduction: text(2_000),
  detail: text(2_000),
  brandLabel: text(100),
  brandDescription: text(160),
  statValue: text(40),
  statLabel: text(100),
  actionLabel: text(80),
});
export const constructionAboutFeatureSchema = z.strictObject({ id, label: text(200) });
export const constructionAboutFeaturesSchema = z.array(constructionAboutFeatureSchema);
export const constructionBidHeaderSchema = sectionHeading;
export const constructionCareersHeaderSchema = sectionHeading.extend({
  actionLabel: text(80),
  email: z.email(),
  positionsHeading: text(120),
});
export const constructionCareerBenefitSchema = z.strictObject({
  id,
  icon,
  title: text(160),
  description: text(800),
});
export const constructionCareerBenefitsSchema = z.array(constructionCareerBenefitSchema);
export const constructionPositionSchema = z.strictObject({
  id,
  title: text(160),
  location: text(160),
});
export const constructionPositionsSchema = z.array(constructionPositionSchema);
export const constructionReviewsHeaderSchema = sectionHeading;
export const constructionReviewPlatformSchema = z.strictObject({
  id,
  name: text(80),
  description: text(600),
  externalUrl: optionalExternalUrl,
});
export const constructionReviewPlatformsSchema = z.array(constructionReviewPlatformSchema);
export const constructionReviewsFooterSchema = z.strictObject({
  message: text(300),
  email: z.email(),
});
export const constructionContactHeaderSchema = sectionHeading;
export const constructionContactDetailsSchema = z.strictObject({
  addressLabel: text(80),
  address: text(300),
  phoneLabel: text(80),
  phone,
  faxLabel: text(80),
  fax: phone,
  emailLabel: text(80),
  email: z.email(),
  officeHoursLabel: text(80),
  officeHours: text(160),
});
export const constructionFooterBrandSchema = z.strictObject({
  logo: managedImage,
  logoAltText: text(160),
  description: text(1_000),
  address: text(300),
  phone,
  email: z.email(),
});
export const constructionFooterLinkSchema = z.strictObject({ id, label: text(100), destination });
export const constructionFooterLinksSchema = z.array(constructionFooterLinkSchema);
export const constructionFooterLicensesSchema = z.strictObject({
  heading: text(100),
  licenses: z.array(z.strictObject({ id, label: text(200) })).min(1),
});
export const constructionFooterLegalSchema = z.strictObject({
  organizationName: text(160),
  rightsNotice: text(200),
});

export type ConstructionProject = z.infer<typeof constructionProjectSchema>;

const invalid = 'Check this field and try again.';
function field(
  path: readonly string[],
  label: string,
  order: number,
  control: LeafEditorControl,
  required = true,
): LeafEditorField {
  return {
    path: [...path],
    label,
    required,
    order,
    validationMessages: {
      ...(required && control.type !== 'system'
        ? { required: `Enter ${label.toLowerCase()}.` }
        : {}),
      invalid,
    },
    control,
  };
}
function nestedField(
  path: readonly string[],
  label: string,
  order: number,
  control: Extract<EditorControl, { type: 'nested-collection' }>,
  required = true,
): EditorField {
  return {
    path: [...path],
    label,
    required,
    order,
    validationMessages: {
      ...(required ? { required: `Enter ${label.toLowerCase()}.` } : {}),
      invalid,
    },
    control,
  };
}
const short = (maxLength: number): LeafEditorControl => ({ type: 'short-text', maxLength });
const long = (rows: number, maxLength: number): LeafEditorControl => ({
  type: 'multiline-text',
  rows,
  maxLength,
});
const system = (): LeafEditorControl => ({ type: 'system', immutable: true });
const media = (altTextPath: string): LeafEditorControl => ({
  type: 'media-picker',
  mediaKind: 'image',
  supportsFocalPoint: false,
  altTextPath: [altTextPath],
});
const iconPicker = (): LeafEditorControl => ({
  type: 'icon-picker',
  choices: lucideIconChoices,
});
const destinationPicker = (): LeafEditorControl => ({
  type: 'enum',
  display: 'select',
  choices: destination.options.map((value) => ({ value, label: value.replace('-', ' ') })),
});
const blank = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const sectionFields = [
  field(['eyebrow'], 'Introductory label', 0, short(120)),
  field(['heading'], 'Heading', 1, short(220)),
  field(['description'], 'Description', 2, long(5, 2_000)),
];
function objectEditor(
  label: string,
  fields: readonly EditorField[],
): Extract<EntityEditorDefinition, { kind: 'object' }> {
  return {
    version: 2,
    kind: 'object',
    label,
    helpText: `Update ${label.toLowerCase()}.`,
    groups: [{ id: 'content', label: 'Content', order: 0, fields: [...fields] }],
  };
}
function listEditor(
  label: string,
  itemLabel: string,
  itemLabelPath: readonly string[],
  blankItem: EditableValue,
  fields: readonly EditorField[],
): Extract<EntityEditorDefinition, { kind: 'list' }> {
  return {
    version: 2,
    kind: 'list',
    label,
    helpText: `Add, remove, or reorder ${label.toLowerCase()}.`,
    itemLabel,
    itemLabelPath: [...itemLabelPath],
    addLabel: `Add ${itemLabel.toLowerCase()}`,
    blankItem,
    reorderable: true,
    groups: [{ id: 'details', label: `${itemLabel} details`, order: 0, fields: [...fields] }],
  };
}
function entity(
  definition: Omit<SemanticEntityDefinition, 'publicPath'>,
): SemanticEntityDefinition {
  return defineSemanticEntity({
    ...definition,
    pageId: 'construction',
    publicPath: definition.id.split('.'),
  });
}
const definition = (
  idValue: string,
  label: string,
  kind: 'object' | 'list',
  schema: SemanticEntityDefinition['schema'],
  editor: EntityEditorDefinition,
  listItemSchema?: SemanticEntityDefinition['listItemSchema'],
): SemanticEntityDefinition =>
  entity({
    id: idValue,
    pageId: 'construction',
    kind,
    label,
    schema,
    editor,
    ...(listItemSchema === undefined ? {} : { listItemSchema }),
  });

const baseDefinitions: readonly SemanticEntityDefinition[] = [
  definition(
    'construction.anniversary-banner',
    'Anniversary Banner',
    'object',
    constructionAnniversaryBannerSchema,
    objectEditor('Anniversary banner', [field(['message'], 'Message', 0, short(120))]),
  ),
  definition(
    'construction.header',
    'Header',
    'object',
    constructionHeaderSchema,
    objectEditor('Header', [
      field(['logo'], 'Logo', 0, media('logoAltText')),
      field(['logoAltText'], 'Logo description', 1, short(160)),
      field(['divisionLabel'], 'Division name', 2, short(80)),
      field(['phone'], 'Phone', 3, { type: 'phone', country: 'US' }),
      field(['actionLabel'], 'Button label', 4, short(80)),
      nestedField(['navLinks'], 'Navigation links', 5, {
        type: 'nested-collection',
        itemLabel: 'Link',
        addLabel: 'Add link',
        itemLabelPath: ['label'],
        reorderable: true,
        blankItem: { id: blank(1), label: 'New link', destination: 'services' },
        itemFields: [
          field(['id'], 'Item identity', 0, system()),
          field(['label'], 'Label', 1, short(80)),
          field(['destination'], 'Page section', 2, destinationPicker()),
        ],
      }),
    ]),
  ),
  definition(
    'construction.hero',
    'Hero',
    'object',
    constructionHeroSchema,
    objectEditor('Hero', [
      field(['primaryBadge'], 'Service label', 0, short(120)),
      field(['serviceAreaBadge'], 'Service area', 1, short(120)),
      field(['heading'], 'Heading', 2, short(180)),
      field(['locationHeading'], 'Location heading', 3, short(180)),
      field(['promise'], 'Promise', 4, long(3, 300)),
      field(['description'], 'Description', 5, long(5, 1_500)),
      field(['primaryActionLabel'], 'Primary button', 6, short(80)),
      field(['secondaryActionLabel'], 'Secondary button', 7, short(80)),
      field(['image'], 'Photo', 8, media('imageAltText')),
      field(['imageAltText'], 'Photo description', 9, short(200)),
    ]),
  ),
  definition(
    'construction.hero.stats',
    'Hero Stats',
    'list',
    constructionHeroStatsSchema,
    listEditor(
      'Hero statistics',
      'Statistic',
      ['label'],
      { id: blank(2), icon: 'Building', value: '0+', label: 'New statistic' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['icon'], 'Icon', 1, iconPicker()),
        field(['value'], 'Value', 2, short(40)),
        field(['label'], 'Label', 3, short(100)),
      ],
    ),
    constructionHeroStatSchema,
  ),
  definition(
    'construction.services.header',
    'Services Header',
    'object',
    constructionServicesHeaderSchema,
    objectEditor('Services heading', sectionFields),
  ),
  definition(
    'construction.services.items',
    'Services Items',
    'list',
    constructionServicesItemsSchema,
    listEditor(
      'Services',
      'Service',
      ['title'],
      {
        id: blank(3),
        icon: 'Building2',
        title: 'New service',
        description: 'Describe this service.',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['icon'], 'Icon', 1, iconPicker()),
        field(['title'], 'Title', 2, short(180)),
        field(['description'], 'Description', 3, long(6, 2_000)),
      ],
    ),
    constructionServiceSchema,
  ),
  definition(
    'construction.current-projects.header',
    'Current Projects Header',
    'object',
    constructionProjectsHeaderSchema,
    objectEditor('Current projects heading', [
      ...sectionFields,
      field(['cardActionLabel'], 'Project card link', 3, short(80)),
    ]),
  ),
  definition(
    'construction.completed-projects.header',
    'Completed Projects Header',
    'object',
    constructionProjectsHeaderSchema,
    objectEditor('Completed projects heading', [
      ...sectionFields,
      field(['cardActionLabel'], 'Project card link', 3, short(80)),
    ]),
  ),
  definition(
    'construction.plan-room.header',
    'Plan Room Header',
    'object',
    constructionPlanRoomHeaderSchema,
    objectEditor('Plan Room heading', [
      ...sectionFields,
      field(['planListHeading'], 'Plan list heading', 3, short(120)),
      field(['viewPlansLabel'], 'View plans button', 4, short(80)),
      field(['specificationsLabel'], 'Specifications button', 5, short(80)),
    ]),
  ),
  definition(
    'construction.plan-room.access-notice',
    'Plan Room Access Notice',
    'object',
    constructionPlanRoomAccessSchema,
    objectEditor('Plan Room access notice', [
      field(['icon'], 'Icon', 0, iconPicker()),
      field(['heading'], 'Heading', 1, short(160)),
      field(['description'], 'Description', 2, long(4, 1_000)),
    ]),
  ),
  definition(
    'construction.plan-room.plan-sets',
    'Plan Room Plan Sets',
    'list',
    constructionPlanSetsSchema,
    listEditor(
      'Project plans',
      'Plan set',
      ['name'],
      {
        id: blank(4),
        name: 'New plan set',
        projectNumber: 'TCC-0000-000',
        lastUpdated: 'Update date',
        sheetCount: 0,
        latestRevision: 'Rev A',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['name'], 'Project name', 1, short(200)),
        field(['projectNumber'], 'Project number', 2, short(80)),
        field(['lastUpdated'], 'Last updated', 3, short(100)),
        field(['sheetCount'], 'Number of sheets', 4, {
          type: 'number',
          display: 'integer',
          minimum: 0,
          maximum: 100_000,
          step: 1,
        }),
        field(['latestRevision'], 'Latest revision', 5, short(40)),
      ],
    ),
    constructionPlanSetSchema,
  ),
  definition(
    'construction.plan-room.request-access',
    'Plan Room Request Access',
    'object',
    constructionPlanRoomRequestSchema,
    objectEditor('Plan Room request', [
      field(['heading'], 'Heading', 0, short(160)),
      field(['description'], 'Description', 1, long(4, 1_000)),
      field(['actionLabel'], 'Button label', 2, short(80)),
      field(['email'], 'Email', 3, { type: 'email' }),
    ]),
  ),
  definition(
    'construction.pros.header',
    'Pros Header',
    'object',
    constructionProsHeaderSchema,
    objectEditor("Our Pro's heading", sectionFields),
  ),
  definition(
    'construction.pros.items',
    'Pros Items',
    'list',
    constructionProsItemsSchema,
    listEditor(
      'Reasons to choose TriCo',
      'Reason',
      ['title'],
      { id: blank(5), icon: 'Award', title: 'New reason', description: 'Describe this advantage.' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['icon'], 'Icon', 1, iconPicker()),
        field(['title'], 'Title', 2, short(160)),
        field(['description'], 'Description', 3, long(5, 2_000)),
      ],
    ),
    constructionProSchema,
  ),
  definition(
    'construction.pros.stats',
    'Pros Stats',
    'list',
    constructionProStatsSchema,
    listEditor(
      'Company statistics',
      'Statistic',
      ['label'],
      { id: blank(6), value: '0+', label: 'New statistic' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['value'], 'Value', 1, short(40)),
        field(['label'], 'Label', 2, short(100)),
      ],
    ),
    constructionProStatSchema,
  ),
  definition(
    'construction.team.header',
    'Team Header',
    'object',
    constructionTeamHeaderSchema,
    objectEditor('Team heading', sectionFields),
  ),
  definition(
    'construction.team.members',
    'Team Members',
    'list',
    constructionTeamMembersSchema,
    listEditor(
      'Team members',
      'Team member',
      ['name'],
      {
        id: blank(7),
        name: 'New team member',
        title: 'Role',
        email: '',
        phone: '',
        photo: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        photoAltText: 'Team member portrait',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['name'], 'Name', 1, short(160)),
        field(['title'], 'Role', 2, short(160)),
        field(['email'], 'Email', 3, { type: 'email' }, false),
        field(['phone'], 'Phone', 4, { type: 'phone', country: 'US' }, false),
        field(['photo'], 'Photo', 5, media('photoAltText')),
        field(['photoAltText'], 'Photo description', 6, short(200)),
      ],
    ),
    constructionTeamMemberSchema,
  ),
  definition(
    'construction.workers',
    'Workers',
    'object',
    constructionWorkersSchema,
    objectEditor('Construction crew', [
      field(['eyebrow'], 'Introductory label', 0, short(120)),
      field(['heading'], 'Heading', 1, short(180)),
      field(['description'], 'Description', 2, long(4, 1_000)),
      field(['image'], 'Photo', 3, media('imageAltText')),
      field(['imageAltText'], 'Photo description', 4, short(200)),
    ]),
  ),
  definition(
    'construction.about',
    'About',
    'object',
    constructionAboutSchema,
    objectEditor('About TriCo Construction', [
      field(['eyebrow'], 'Introductory label', 0, short(120)),
      field(['heading'], 'Heading', 1, short(220)),
      field(['introduction'], 'Introduction', 2, long(6, 2_000)),
      field(['detail'], 'Details', 3, long(6, 2_000)),
      field(['brandLabel'], 'Brand label', 4, short(100)),
      field(['brandDescription'], 'Brand description', 5, short(160)),
      field(['statValue'], 'Statistic', 6, short(40)),
      field(['statLabel'], 'Statistic label', 7, short(100)),
      field(['actionLabel'], 'Button label', 8, short(80)),
    ]),
  ),
  definition(
    'construction.about.features',
    'About Features',
    'list',
    constructionAboutFeaturesSchema,
    listEditor(
      'About highlights',
      'Highlight',
      ['label'],
      { id: blank(8), label: 'New highlight' },
      [field(['id'], 'Item identity', 0, system()), field(['label'], 'Highlight', 1, short(200))],
    ),
    constructionAboutFeatureSchema,
  ),
  definition(
    'construction.bid.header',
    'Bid Header',
    'object',
    constructionBidHeaderSchema,
    objectEditor('Bid form heading', sectionFields),
  ),
  definition(
    'construction.careers.header',
    'Careers Header',
    'object',
    constructionCareersHeaderSchema,
    objectEditor('Careers heading', [
      ...sectionFields,
      field(['actionLabel'], 'Button label', 3, short(80)),
      field(['email'], 'Applications email', 4, { type: 'email' }),
      field(['positionsHeading'], 'Positions heading', 5, short(120)),
    ]),
  ),
  definition(
    'construction.careers.benefits',
    'Careers Benefits',
    'list',
    constructionCareerBenefitsSchema,
    listEditor(
      'Career benefits',
      'Benefit',
      ['title'],
      {
        id: blank(9),
        icon: 'TrendingUp',
        title: 'New benefit',
        description: 'Describe this benefit.',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['icon'], 'Icon', 1, iconPicker()),
        field(['title'], 'Title', 2, short(160)),
        field(['description'], 'Description', 3, long(4, 800)),
      ],
    ),
    constructionCareerBenefitSchema,
  ),
  definition(
    'construction.careers.open-positions',
    'Careers Open Positions',
    'list',
    constructionPositionsSchema,
    listEditor(
      'Open positions',
      'Position',
      ['title'],
      { id: blank(10), title: 'New position', location: 'Multiple Locations' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['title'], 'Position title', 1, short(160)),
        field(['location'], 'Location', 2, short(160)),
      ],
    ),
    constructionPositionSchema,
  ),
  definition(
    'construction.reviews.header',
    'Reviews Header',
    'object',
    constructionReviewsHeaderSchema,
    objectEditor('Reviews heading', sectionFields),
  ),
  definition(
    'construction.reviews.platforms',
    'Reviews Platforms',
    'list',
    constructionReviewPlatformsSchema,
    listEditor(
      'Review sites',
      'Review site',
      ['name'],
      {
        id: blank(11),
        name: 'Review site',
        description: 'Invite customers to leave a review.',
        externalUrl: '',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['name'], 'Site name', 1, short(80)),
        field(['description'], 'Description', 2, long(4, 600)),
        field(['externalUrl'], 'Review destination', 3, system(), false),
      ],
    ),
    constructionReviewPlatformSchema,
  ),
  definition(
    'construction.reviews.footer',
    'Reviews Footer',
    'object',
    constructionReviewsFooterSchema,
    objectEditor('Private feedback', [
      field(['message'], 'Message', 0, short(300)),
      field(['email'], 'Email', 1, { type: 'email' }),
    ]),
  ),
  definition(
    'construction.contact.header',
    'Contact Header',
    'object',
    constructionContactHeaderSchema,
    objectEditor('Contact heading', sectionFields),
  ),
  definition(
    'construction.contact.details',
    'Contact Details',
    'object',
    constructionContactDetailsSchema,
    objectEditor('Contact details', [
      field(['addressLabel'], 'Office location label', 0, short(80)),
      field(['address'], 'Office location', 1, long(3, 300)),
      field(['phoneLabel'], 'Phone label', 2, short(80)),
      field(['phone'], 'Phone', 3, { type: 'phone', country: 'US' }),
      field(['faxLabel'], 'Fax label', 4, short(80)),
      field(['fax'], 'Fax', 5, { type: 'phone', country: 'US' }),
      field(['emailLabel'], 'Email label', 6, short(80)),
      field(['email'], 'Email', 7, { type: 'email' }),
      field(['officeHoursLabel'], 'Office hours label', 8, short(80)),
      field(['officeHours'], 'Office hours', 9, short(160)),
    ]),
  ),
  definition(
    'construction.footer.brand',
    'Footer Brand',
    'object',
    constructionFooterBrandSchema,
    objectEditor('Footer contact', [
      field(['logo'], 'Logo', 0, media('logoAltText')),
      field(['logoAltText'], 'Logo description', 1, short(160)),
      field(['description'], 'Description', 2, long(4, 1_000)),
      field(['address'], 'Address', 3, long(3, 300)),
      field(['phone'], 'Phone', 4, { type: 'phone', country: 'US' }),
      field(['email'], 'Email', 5, { type: 'email' }),
    ]),
  ),
  definition(
    'construction.footer.links',
    'Footer Links',
    'list',
    constructionFooterLinksSchema,
    listEditor(
      'Footer links',
      'Footer link',
      ['label'],
      { id: blank(12), label: 'New link', destination: 'services' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['label'], 'Label', 1, short(100)),
        field(['destination'], 'Page section', 2, destinationPicker()),
      ],
    ),
    constructionFooterLinkSchema,
  ),
  definition(
    'construction.footer.licenses',
    'Footer Licenses',
    'object',
    constructionFooterLicensesSchema,
    objectEditor('Licenses', [
      field(['heading'], 'Heading', 0, short(100)),
      nestedField(['licenses'], 'Licenses', 1, {
        type: 'nested-collection',
        itemLabel: 'License',
        addLabel: 'Add license',
        itemLabelPath: ['label'],
        reorderable: true,
        blankItem: { id: blank(13), label: 'New license' },
        itemFields: [
          field(['id'], 'Item identity', 0, system()),
          field(['label'], 'License', 1, short(200)),
        ],
      }),
    ]),
  ),
  definition(
    'construction.footer.legal',
    'Footer Legal',
    'object',
    constructionFooterLegalSchema,
    objectEditor('Footer legal text', [
      field(['organizationName'], 'Organization name', 0, short(160)),
      field(['rightsNotice'], 'Rights notice', 1, short(200)),
    ]),
  ),
];

const categoryDefinitions = constructionProjectStatuses.flatMap((status) =>
  constructionCategoryIds.flatMap((category, index) => {
    const group = status === 'current' ? 'current-projects' : 'completed-projects';
    const categoryLabel = category.replaceAll('-', ' ');
    const projectBlank = {
      id: blank(100 + index + (status === 'current' ? 0 : 10)),
      name: 'New project',
      description: 'Describe this project.',
      address: '',
      owner: '',
      architect: '',
      engineer: '',
      squareFeet: '',
      dateLabel: '',
      photo: { kind: 'managed' as const, key: 'media/seed/placeholder-neutral.svg' },
      photoAltText: 'Project photo',
    };
    return [
      definition(
        `construction.${group}.category.${category}`,
        `${status} ${categoryLabel} category`,
        'object',
        constructionProjectCategorySchema,
        objectEditor(`${status} ${categoryLabel} category`, [
          field(['label'], 'Category name', 0, short(120)),
          field(['blurb'], 'Description', 1, long(4, 800)),
        ]),
      ),
      definition(
        `construction.${group}.projects.${category}`,
        `${status} ${categoryLabel} projects`,
        'list',
        constructionProjectsSchema,
        listEditor(`${status} ${categoryLabel} projects`, 'Project', ['name'], projectBlank, [
          field(['id'], 'Item identity', 0, system()),
          field(['name'], 'Project name', 1, short(200)),
          field(['description'], 'Description', 2, long(6, 2_000)),
          field(['address'], 'Address', 3, long(3, 300), false),
          field(['owner'], 'Owner', 4, short(200), false),
          field(['architect'], 'Architect', 5, short(200), false),
          field(['engineer'], 'Engineer', 6, short(200), false),
          field(['squareFeet'], 'Size', 7, short(80), false),
          field(
            ['dateLabel'],
            status === 'current' ? 'Started' : 'Completed',
            8,
            short(100),
            false,
          ),
          field(['photo'], 'Photo', 9, media('photoAltText')),
          field(['photoAltText'], 'Photo description', 10, short(200)),
        ]),
        constructionProjectSchema,
      ),
    ];
  }),
);

export const constructionEntityDefinitions = [
  ...baseDefinitions,
  ...categoryDefinitions,
] as const satisfies readonly SemanticEntityDefinition[];

const mainRouteIds = new Set(baseDefinitions.map((item) => item.id));
for (const definitionItem of categoryDefinitions)
  if (definitionItem.id.includes('.category.')) mainRouteIds.add(definitionItem.id);
const categoryRoutes = constructionProjectStatuses.flatMap((status) =>
  constructionCategoryIds.map((category) => `/construction/${status}/${category}`),
);
const sharedCategoryEntityIds = new Set([
  'construction.anniversary-banner',
  'construction.header',
  'construction.footer.brand',
  'construction.footer.links',
  'construction.footer.licenses',
  'construction.footer.legal',
]);
const entry = (definitionItem: SemanticEntityDefinition): EntityViewCatalogEntry => {
  const projectList = definitionItem.id.includes('.projects.');
  const categoryMetadata = definitionItem.id.includes('.category.');
  const currentGroup = definitionItem.id.includes('.current-projects.');
  const routes = projectList
    ? [
        `/construction/${definitionItem.id.includes('.current-projects.') ? 'current' : 'completed'}/${definitionItem.id.split('.').at(-1) ?? 'multi-family'}`,
      ]
    : ['/construction'];
  const secondaryRoutes = sharedCategoryEntityIds.has(definitionItem.id)
    ? categoryRoutes
    : categoryMetadata || definitionItem.id.endsWith('-projects.header')
      ? constructionCategoryIds.map(
          (category) => `/construction/${currentGroup ? 'current' : 'completed'}/${category}`,
        )
      : [];
  return {
    entityId: definitionItem.id,
    pageId: 'construction',
    legacyComponent: projectList
      ? 'ConstructionProjectCategory project list'
      : 'Construction main composition',
    primary: { slotId: `${definitionItem.id}.primary`, routes },
    secondary:
      secondaryRoutes.length === 0
        ? []
        : [
            {
              slotId: `${definitionItem.id}.category-routes`,
              routes: secondaryRoutes,
              regionLabel: 'Construction category page',
            },
          ],
    emptyState:
      definitionItem.kind === 'list'
        ? {
            kind: 'editable-empty-state',
            heading: projectList ? 'No projects are published in this category.' : 'No items yet',
            description: projectList
              ? 'Add the first verified project when it is ready.'
              : 'Add the first item when you are ready.',
            addLabel: projectList ? 'Add project' : 'Add item',
          }
        : { kind: 'not-applicable' },
  };
};
export const constructionEntityViewCatalog = constructionEntityDefinitions.map(
  entry,
) as readonly EntityViewCatalogEntry[];
export const constructionMainRouteEntityIds = [...mainRouteIds];
export const constructionEntityModule = defineEntityModule({
  pageId: 'construction',
  entities: constructionEntityDefinitions,
  viewCatalog: constructionEntityViewCatalog,
});

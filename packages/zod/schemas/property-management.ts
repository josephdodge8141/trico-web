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

export const PROPERTY_MANAGEMENT_CONTENT_SCHEMA_VERSION = 2 as const;

const text = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum: number) => z.string().trim().max(maximum);
const uuid = z.uuid();
export const propertyManagementManagedImageSchema = z.strictObject({
  kind: z.literal('managed'),
  key: text(1_024),
});
const externalImageSchema = z.strictObject({ kind: z.literal('external'), url: z.url() });
const imageSchema = z.discriminatedUnion('kind', [
  propertyManagementManagedImageSchema,
  externalImageSchema,
]);
const sectionDestinationSchema = z.enum([
  'services',
  'process',
  'managed-properties',
  'tenant-portal',
  'about',
  'faq',
  'reviews',
  'contact',
]);
const iconSchema = z.enum([
  'BarChart3',
  'Building',
  'Building2',
  'Calculator',
  'ClipboardCheck',
  'CreditCard',
  'FileText',
  'Heart',
  'Home',
  'HomeIcon',
  'LineChart',
  'PenLine',
  'Settings',
  'Users',
  'Users2',
  'Wallet',
  'Wrench',
]);

const headerCopySchema = z.strictObject({
  eyebrow: text(120),
  heading: text(180),
  description: text(1_500),
});
const idTitleDescriptionSchema = z.strictObject({
  id: uuid,
  title: text(160),
  description: text(2_000),
});
const iconItemSchema = idTitleDescriptionSchema.extend({ icon: iconSchema }).strict();
const statItemSchema = z.strictObject({
  id: uuid,
  value: text(40),
  label: text(120),
  icon: iconSchema,
});
const propertyItemSchema = z.strictObject({
  id: uuid,
  name: text(160),
  description: text(500),
  photo: propertyManagementManagedImageSchema,
  photoAltText: text(200),
});
const linkItemSchema = z.strictObject({
  id: uuid,
  group: z.enum(['Services', 'Company', 'Resources']),
  label: text(120),
  destination: sectionDestinationSchema,
});

export const propertyManagementAnniversaryBannerSchema = z.strictObject({ message: text(120) });
export const propertyManagementHeaderSchema = z.strictObject({
  logo: propertyManagementManagedImageSchema,
  logoAltText: text(160),
  divisionLabel: text(120),
  phone: text(40),
  actionLabel: text(80),
  navLinks: z.array(
    z.strictObject({ id: uuid, label: text(80), destination: sectionDestinationSchema }),
  ),
});
export const propertyManagementHeroSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(180),
  description: text(1_500),
  primaryActionLabel: text(80),
  secondaryActionLabel: text(80),
  image: propertyManagementManagedImageSchema,
  imageAltText: text(240),
});
export const propertyManagementHeroStatsSchema = z.array(statItemSchema);
export const propertyManagementServicesHeaderSchema = headerCopySchema;
export const propertyManagementServicesItemsSchema = z.array(iconItemSchema);
export const propertyManagementProcessHeaderSchema = headerCopySchema;
export const propertyManagementProcessStepSchema = iconItemSchema
  .extend({ number: text(10) })
  .strict();
export const propertyManagementProcessStepsSchema = z.array(propertyManagementProcessStepSchema);
export const propertyManagementPortfolioHeaderSchema = headerCopySchema;
export const propertyManagementPortfolioItemSchema = propertyItemSchema;
export const propertyManagementPortfolioItemsSchema = z.array(propertyItemSchema);
export const propertyManagementTenantPortalSchema = headerCopySchema
  .extend({
    actionLabel: text(100),
    externalUrl: z.url(),
    note: text(500),
  })
  .strict();
export const propertyManagementTenantPortalFeaturesSchema = z.array(iconItemSchema);
export const propertyManagementTeamHeaderSchema = headerCopySchema;
export const propertyManagementTeamMemberSchema = z.strictObject({
  id: uuid,
  name: text(160),
  title: text(160),
  description: text(1_500),
  email: z.email(),
  phone: text(40),
  photo: propertyManagementManagedImageSchema,
  photoAltText: text(200),
});
export const propertyManagementTeamMembersSchema = z.array(propertyManagementTeamMemberSchema);
export const propertyManagementAboutSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(180),
  introduction: text(1_500),
  detail: text(1_500),
  image: propertyManagementManagedImageSchema,
  imageAltText: text(220),
  statValue: text(40),
  statLabel: text(100),
  actionLabel: text(100),
});
export const propertyManagementAboutFeaturesSchema = z.array(
  z.strictObject({ id: uuid, title: text(160) }),
);
export const propertyManagementTestimonialsHeaderSchema = headerCopySchema;
export const propertyManagementTestimonialSchema = z.strictObject({
  id: uuid,
  name: text(160),
  role: text(160),
  image: imageSchema,
  imageAltText: text(200),
  rating: z.number().int().min(1).max(5),
  quote: text(2_000),
});
export const propertyManagementTestimonialsItemsSchema = z.array(
  propertyManagementTestimonialSchema,
);
export const propertyManagementTestimonialsStatsSchema = z.array(statItemSchema);
export const propertyManagementFaqHeaderSchema = headerCopySchema;
export const propertyManagementFaqItemSchema = z.strictObject({
  id: uuid,
  question: text(300),
  answer: text(2_500),
});
export const propertyManagementFaqItemsSchema = z.array(propertyManagementFaqItemSchema);
export const propertyManagementCareersSchema = z.strictObject({
  heading: text(160),
  description: text(1_500),
  cardHeading: text(120),
  cardDescription: text(500),
  email: z.email(),
});
export const propertyManagementReviewsHeaderSchema = headerCopySchema;
export const propertyManagementReviewPlatformSchema = z.strictObject({
  id: uuid,
  name: text(80),
  description: text(500),
  externalUrl: optionalText(1_000),
});
export const propertyManagementReviewsPlatformsSchema = z.array(
  propertyManagementReviewPlatformSchema,
);
export const propertyManagementReviewsFooterSchema = z.strictObject({
  privateFeedbackLabel: text(200),
  email: z.email(),
});
export const propertyManagementContactHeaderSchema = headerCopySchema;
export const propertyManagementContactDetailsSchema = z.strictObject({
  address: text(300),
  phone: text(40),
  fax: text(40),
  email: z.email(),
  officeHours: text(160),
  reviewLabel: text(120),
  reviewUrl: z.url(),
  licenses: z.array(z.strictObject({ id: uuid, label: text(120) })),
});
export const propertyManagementFooterBrandSchema = z.strictObject({
  logo: propertyManagementManagedImageSchema,
  logoAltText: text(160),
  description: text(800),
});
export const propertyManagementFooterLinksSchema = z.array(linkItemSchema);
export const propertyManagementFooterSocialSchema = z.array(
  z.strictObject({
    id: uuid,
    label: z.enum(['Facebook', 'Twitter', 'LinkedIn', 'Instagram']),
    externalUrl: optionalText(1_000),
  }),
);
export const propertyManagementFooterLegalSchema = z.strictObject({
  organizationName: text(160),
  rightsNotice: text(200),
  privacyLabel: text(80),
  termsLabel: text(80),
});

export type PropertyManagementHeroStat = z.infer<typeof statItemSchema>;
export type PropertyManagementIconItem = z.infer<typeof iconItemSchema>;
export type PropertyManagementProcessStep = z.infer<typeof propertyManagementProcessStepSchema>;
export type PropertyManagementPortfolioItem = z.infer<typeof propertyItemSchema>;
export type PropertyManagementTeamMember = z.infer<typeof propertyManagementTeamMemberSchema>;
export type PropertyManagementTestimonial = z.infer<typeof propertyManagementTestimonialSchema>;
export type PropertyManagementFaqItem = z.infer<typeof propertyManagementFaqItemSchema>;
export type PropertyManagementReviewPlatform = z.infer<
  typeof propertyManagementReviewPlatformSchema
>;

const invalid = 'Check this field and try again.';
function field(
  path: readonly string[],
  label: string,
  order: number,
  control: EditorControl,
  required = control.type !== 'system',
): EditorField {
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
function leafField(
  path: readonly string[],
  label: string,
  order: number,
  control: LeafEditorControl,
  required = control.type !== 'system',
): LeafEditorField {
  return field(path, label, order, control, required) as LeafEditorField;
}
const short = (maxLength: number): LeafEditorControl => ({ type: 'short-text', maxLength });
const long = (rows: number, maxLength: number): LeafEditorControl => ({
  type: 'multiline-text',
  rows,
  maxLength,
});
const system = (): LeafEditorControl => ({ type: 'system', immutable: true });
const media = (altTextPath: readonly string[], aspectRatio?: string): LeafEditorControl => ({
  type: 'media-picker',
  mediaKind: 'image',
  supportsFocalPoint: false,
  altTextPath: [...altTextPath],
  ...(aspectRatio === undefined ? {} : { aspectRatio }),
});
const icons = (values: readonly string[]): LeafEditorControl => ({
  type: 'icon-picker',
  choices: values.map((value) => ({ value, label: value.replace(/([a-z])([A-Z0-9])/g, '$1 $2') })),
});
const sectionChoice = (): LeafEditorControl => ({
  type: 'enum',
  display: 'select',
  choices: sectionDestinationSchema.options.map((value) => ({
    value,
    label: value.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase()),
  })),
});
function objectEditor(
  label: string,
  fields: readonly EditorField[],
): Extract<EntityEditorDefinition, { kind: 'object' }> {
  return {
    version: 2,
    kind: 'object',
    label,
    helpText: `Update the ${label.toLowerCase()} shown on this page.`,
    groups: [{ id: 'content', label: 'Content', order: 0, fields: [...fields] }],
  };
}
function listEditor(
  label: string,
  itemLabel: string,
  blankItem: EditableValue,
  fields: readonly EditorField[],
  itemLabelPath: readonly string[] = ['title'],
): Extract<EntityEditorDefinition, { kind: 'list' }> {
  return {
    version: 2,
    kind: 'list',
    label,
    helpText: `Add, remove, edit, or reorder ${label.toLowerCase()}.`,
    itemLabel,
    itemLabelPath: [...itemLabelPath],
    addLabel: `Add ${itemLabel.toLowerCase()}`,
    blankItem,
    reorderable: true,
    groups: [{ id: 'details', label: `${itemLabel} details`, order: 0, fields: [...fields] }],
  };
}

const blank = (suffix: number): string =>
  `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const headerFields = [
  field(['eyebrow'], 'Introductory label', 0, short(120)),
  field(['heading'], 'Heading', 1, short(180)),
  field(['description'], 'Description', 2, long(5, 1_500)),
] as const;
const iconItemFields = [
  field(['id'], 'Item identity', 0, system()),
  field(['title'], 'Title', 1, short(160)),
  field(['description'], 'Description', 2, long(5, 2_000)),
  field(['icon'], 'Icon', 3, icons(iconSchema.options)),
] as const;
const statFields = [
  field(['id'], 'Item identity', 0, system()),
  field(['value'], 'Value', 1, short(40)),
  field(['label'], 'Label', 2, short(120)),
  field(['icon'], 'Icon', 3, icons(iconSchema.options)),
] as const;
const propertyFields = [
  field(['id'], 'Item identity', 0, system()),
  field(['name'], 'Property name', 1, short(160)),
  field(['description'], 'Address or description', 2, long(3, 500)),
  field(['photo'], 'Photo', 3, media(['photoAltText'], '4:3')),
  field(['photoAltText'], 'Photo description', 4, short(200)),
] as const;

function entity(
  definition: Omit<SemanticEntityDefinition, 'pageId' | 'publicPath'>,
): SemanticEntityDefinition {
  return defineSemanticEntity({
    ...definition,
    pageId: 'property-management',
    publicPath: definition.id.split('.'),
  });
}

export const propertyManagementEntityDefinitions = [
  entity({
    id: 'property-management.anniversary-banner',
    kind: 'object',
    label: 'Anniversary Banner',
    schema: propertyManagementAnniversaryBannerSchema,
    editor: objectEditor('Anniversary banner', [
      field(['message'], 'Banner message', 0, short(120)),
    ]),
  }),
  entity({
    id: 'property-management.header',
    kind: 'object',
    label: 'Header',
    schema: propertyManagementHeaderSchema,
    editor: objectEditor('Page header', [
      field(['logo'], 'Logo', 0, media(['logoAltText'])),
      field(['logoAltText'], 'Logo description', 1, short(160)),
      field(['divisionLabel'], 'Division label', 2, short(120)),
      field(['phone'], 'Phone', 3, { type: 'phone', country: 'US' }),
      field(['actionLabel'], 'Action label', 4, short(80)),
      field(['navLinks'], 'Navigation links', 5, {
        type: 'nested-collection',
        itemLabel: 'Navigation link',
        addLabel: 'Add navigation link',
        itemLabelPath: ['label'],
        reorderable: true,
        blankItem: { id: blank(1), label: 'New link', destination: 'services' },
        itemFields: [
          leafField(['id'], 'Item identity', 0, system()),
          leafField(['label'], 'Label', 1, short(80)),
          leafField(['destination'], 'Page section', 2, sectionChoice()),
        ],
      }),
    ]),
  }),
  entity({
    id: 'property-management.hero',
    kind: 'object',
    label: 'Hero',
    schema: propertyManagementHeroSchema,
    editor: objectEditor('Opening section', [
      field(['eyebrow'], 'Introductory label', 0, short(120)),
      field(['heading'], 'Main heading', 1, long(3, 180)),
      field(['description'], 'Introduction', 2, long(6, 1_500)),
      field(['primaryActionLabel'], 'Primary button label', 3, short(80)),
      field(['secondaryActionLabel'], 'Secondary button label', 4, short(80)),
      field(['image'], 'Hero photo', 5, media(['imageAltText'], '4:3')),
      field(['imageAltText'], 'Photo description', 6, short(240)),
    ]),
  }),
  entity({
    id: 'property-management.hero.stats',
    kind: 'list',
    label: 'Hero Stats',
    schema: propertyManagementHeroStatsSchema,
    listItemSchema: statItemSchema,
    editor: listEditor(
      'Hero statistics',
      'Statistic',
      { id: blank(2), value: '0', label: 'New statistic', icon: 'BarChart3' },
      statFields,
      ['label'],
    ),
  }),
  entity({
    id: 'property-management.services.header',
    kind: 'object',
    label: 'Services Header',
    schema: propertyManagementServicesHeaderSchema,
    editor: objectEditor('Services heading', headerFields),
  }),
  entity({
    id: 'property-management.services.items',
    kind: 'list',
    label: 'Services Items',
    schema: propertyManagementServicesItemsSchema,
    listItemSchema: iconItemSchema,
    editor: listEditor(
      'Services',
      'Service',
      { id: blank(3), title: 'New service', description: 'Add a description.', icon: 'Building2' },
      iconItemFields,
    ),
  }),
  entity({
    id: 'property-management.process.header',
    kind: 'object',
    label: 'Process Header',
    schema: propertyManagementProcessHeaderSchema,
    editor: objectEditor('Process heading', headerFields),
  }),
  entity({
    id: 'property-management.process.steps',
    kind: 'list',
    label: 'Process Steps',
    schema: propertyManagementProcessStepsSchema,
    listItemSchema: propertyManagementProcessStepSchema,
    editor: listEditor(
      'Process steps',
      'Step',
      {
        id: blank(4),
        number: '01',
        title: 'New step',
        description: 'Add a description.',
        icon: 'ClipboardCheck',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['number'], 'Step number', 1, short(10)),
        field(['title'], 'Title', 2, short(160)),
        field(['description'], 'Description', 3, long(5, 2_000)),
        field(['icon'], 'Icon', 4, icons(iconSchema.options)),
      ],
    ),
  }),
  entity({
    id: 'property-management.portfolio.managed.header',
    kind: 'object',
    label: 'Portfolio Managed Header',
    schema: propertyManagementPortfolioHeaderSchema,
    editor: objectEditor('Managed properties heading', headerFields),
  }),
  entity({
    id: 'property-management.portfolio.managed.items',
    kind: 'list',
    label: 'Portfolio Managed Items',
    schema: propertyManagementPortfolioItemsSchema,
    listItemSchema: propertyItemSchema,
    editor: listEditor(
      'Managed properties',
      'Property',
      {
        id: blank(5),
        name: 'New property',
        description: 'Add an address.',
        photo: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        photoAltText: 'Property photo',
      },
      propertyFields,
      ['name'],
    ),
  }),
  entity({
    id: 'property-management.portfolio.coas.header',
    kind: 'object',
    label: 'Portfolio Coas Header',
    schema: propertyManagementPortfolioHeaderSchema,
    editor: objectEditor('Commercial associations heading', headerFields),
  }),
  entity({
    id: 'property-management.portfolio.coas.items',
    kind: 'list',
    label: 'Portfolio Coas Items',
    schema: propertyManagementPortfolioItemsSchema,
    listItemSchema: propertyItemSchema,
    editor: listEditor(
      'Commercial associations',
      'Association',
      {
        id: blank(6),
        name: 'New association',
        description: 'Add an address.',
        photo: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        photoAltText: 'Association photo',
      },
      propertyFields,
      ['name'],
    ),
  }),
  entity({
    id: 'property-management.portfolio.hoas.header',
    kind: 'object',
    label: 'Portfolio Hoas Header',
    schema: propertyManagementPortfolioHeaderSchema,
    editor: objectEditor('Homeowner associations heading', headerFields),
  }),
  entity({
    id: 'property-management.portfolio.hoas.items',
    kind: 'list',
    label: 'Portfolio Hoas Items',
    schema: propertyManagementPortfolioItemsSchema,
    listItemSchema: propertyItemSchema,
    editor: listEditor(
      'Homeowner associations',
      'Association',
      {
        id: blank(7),
        name: 'New association',
        description: 'Add an address.',
        photo: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        photoAltText: 'Association photo',
      },
      propertyFields,
      ['name'],
    ),
  }),
  entity({
    id: 'property-management.tenant-portal',
    kind: 'object',
    label: 'Tenant Portal',
    schema: propertyManagementTenantPortalSchema,
    editor: objectEditor('Tenant portal', [
      ...headerFields,
      field(['actionLabel'], 'Button label', 3, short(100)),
      field(['externalUrl'], 'Portal destination', 4, system()),
      field(['note'], 'Security note', 5, long(3, 500)),
    ]),
  }),
  entity({
    id: 'property-management.tenant-portal.features',
    kind: 'list',
    label: 'Tenant Portal Features',
    schema: propertyManagementTenantPortalFeaturesSchema,
    listItemSchema: iconItemSchema,
    editor: listEditor(
      'Portal features',
      'Feature',
      { id: blank(8), title: 'New feature', description: 'Add a description.', icon: 'FileText' },
      iconItemFields,
    ),
  }),
  entity({
    id: 'property-management.team.header',
    kind: 'object',
    label: 'Team Header',
    schema: propertyManagementTeamHeaderSchema,
    editor: objectEditor('Team heading', headerFields),
  }),
  entity({
    id: 'property-management.team.members',
    kind: 'list',
    label: 'Team Members',
    schema: propertyManagementTeamMembersSchema,
    listItemSchema: propertyManagementTeamMemberSchema,
    editor: listEditor(
      'Team members',
      'Team member',
      {
        id: blank(9),
        name: 'New team member',
        title: 'Role',
        description: 'Add a biography.',
        email: 'careers@tricoinc.com',
        phone: '(801) 571-8833',
        photo: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        photoAltText: 'Portrait of the team member',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['name'], 'Name', 1, short(160)),
        field(['title'], 'Role', 2, short(160)),
        field(['description'], 'Biography', 3, long(6, 1_500)),
        field(['email'], 'Email', 4, { type: 'email' }),
        field(['phone'], 'Phone', 5, { type: 'phone', country: 'US' }),
        field(['photo'], 'Photo', 6, media(['photoAltText'], '1:1')),
        field(['photoAltText'], 'Photo description', 7, short(200)),
      ],
      ['name'],
    ),
  }),
  entity({
    id: 'property-management.about',
    kind: 'object',
    label: 'About',
    schema: propertyManagementAboutSchema,
    editor: objectEditor('About section', [
      field(['eyebrow'], 'Introductory label', 0, short(120)),
      field(['heading'], 'Heading', 1, short(180)),
      field(['introduction'], 'Introduction', 2, long(5, 1_500)),
      field(['detail'], 'More detail', 3, long(5, 1_500)),
      field(['image'], 'Photo', 4, media(['imageAltText'], '4:3')),
      field(['imageAltText'], 'Photo description', 5, short(220)),
      field(['statValue'], 'Statistic value', 6, short(40)),
      field(['statLabel'], 'Statistic label', 7, short(100)),
      field(['actionLabel'], 'Button label', 8, short(100)),
    ]),
  }),
  entity({
    id: 'property-management.about.features',
    kind: 'list',
    label: 'About Features',
    schema: propertyManagementAboutFeaturesSchema,
    listItemSchema: z.strictObject({ id: uuid, title: text(160) }),
    editor: listEditor('About highlights', 'Highlight', { id: blank(10), title: 'New highlight' }, [
      field(['id'], 'Item identity', 0, system()),
      field(['title'], 'Highlight', 1, short(160)),
    ]),
  }),
  entity({
    id: 'property-management.testimonials.header',
    kind: 'object',
    label: 'Testimonials Header',
    schema: propertyManagementTestimonialsHeaderSchema,
    editor: objectEditor('Testimonials heading', headerFields),
  }),
  entity({
    id: 'property-management.testimonials.items',
    kind: 'list',
    label: 'Testimonials Items',
    schema: propertyManagementTestimonialsItemsSchema,
    listItemSchema: propertyManagementTestimonialSchema,
    editor: listEditor(
      'Testimonials',
      'Testimonial',
      {
        id: blank(11),
        name: 'New client',
        role: 'Property owner',
        image: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        imageAltText: 'Client portrait',
        rating: 5,
        quote: 'Add the client feedback.',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['name'], 'Name', 1, short(160)),
        field(['role'], 'Role', 2, short(160)),
        field(['image'], 'Photo', 3, media(['imageAltText'], '1:1')),
        field(['imageAltText'], 'Photo description', 4, short(200)),
        field(['rating'], 'Rating', 5, {
          type: 'number',
          display: 'integer',
          minimum: 1,
          maximum: 5,
          step: 1,
        }),
        field(['quote'], 'Feedback', 6, long(7, 2_000)),
      ],
      ['name'],
    ),
  }),
  entity({
    id: 'property-management.testimonials.stats',
    kind: 'list',
    label: 'Testimonials Stats',
    schema: propertyManagementTestimonialsStatsSchema,
    listItemSchema: statItemSchema,
    editor: listEditor(
      'Trust statistics',
      'Statistic',
      { id: blank(12), value: '0', label: 'New statistic', icon: 'BarChart3' },
      statFields,
      ['label'],
    ),
  }),
  entity({
    id: 'property-management.faq.header',
    kind: 'object',
    label: 'Faq Header',
    schema: propertyManagementFaqHeaderSchema,
    editor: objectEditor('Frequently asked questions heading', headerFields),
  }),
  entity({
    id: 'property-management.faq.items',
    kind: 'list',
    label: 'Faq Items',
    schema: propertyManagementFaqItemsSchema,
    listItemSchema: propertyManagementFaqItemSchema,
    editor: listEditor(
      'Frequently asked questions',
      'Question',
      { id: blank(13), question: 'New question', answer: 'Add the answer.' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['question'], 'Question', 1, long(3, 300)),
        field(['answer'], 'Answer', 2, long(8, 2_500)),
      ],
      ['question'],
    ),
  }),
  entity({
    id: 'property-management.careers',
    kind: 'object',
    label: 'Careers',
    schema: propertyManagementCareersSchema,
    editor: objectEditor('Careers section', [
      field(['heading'], 'Heading', 0, short(160)),
      field(['description'], 'Description', 1, long(5, 1_500)),
      field(['cardHeading'], 'Card heading', 2, short(120)),
      field(['cardDescription'], 'Card description', 3, long(3, 500)),
      field(['email'], 'Application email', 4, { type: 'email' }),
    ]),
  }),
  entity({
    id: 'property-management.reviews.header',
    kind: 'object',
    label: 'Reviews Header',
    schema: propertyManagementReviewsHeaderSchema,
    editor: objectEditor('Reviews heading', headerFields),
  }),
  entity({
    id: 'property-management.reviews.platforms',
    kind: 'list',
    label: 'Reviews Platforms',
    schema: propertyManagementReviewsPlatformsSchema,
    listItemSchema: propertyManagementReviewPlatformSchema,
    editor: listEditor(
      'Review sites',
      'Review site',
      {
        id: blank(14),
        name: 'New review site',
        description: 'Add a description.',
        externalUrl: '',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['name'], 'Site name', 1, short(80)),
        field(['description'], 'Description', 2, long(4, 500)),
        field(['externalUrl'], 'Review destination', 3, system(), false),
      ],
      ['name'],
    ),
  }),
  entity({
    id: 'property-management.reviews.footer',
    kind: 'object',
    label: 'Reviews Footer',
    schema: propertyManagementReviewsFooterSchema,
    editor: objectEditor('Private feedback', [
      field(['privateFeedbackLabel'], 'Message', 0, short(200)),
      field(['email'], 'Email', 1, { type: 'email' }),
    ]),
  }),
  entity({
    id: 'property-management.contact.header',
    kind: 'object',
    label: 'Contact Header',
    schema: propertyManagementContactHeaderSchema,
    editor: objectEditor('Contact heading', headerFields),
  }),
  entity({
    id: 'property-management.contact.details',
    kind: 'object',
    label: 'Contact Details',
    schema: propertyManagementContactDetailsSchema,
    editor: objectEditor('Contact details', [
      field(['address'], 'Office address', 0, long(3, 300)),
      field(['phone'], 'Phone', 1, { type: 'phone', country: 'US' }),
      field(['fax'], 'Fax', 2, { type: 'phone', country: 'US' }),
      field(['email'], 'Email', 3, { type: 'email' }),
      field(['officeHours'], 'Office hours', 4, short(160)),
      field(['reviewLabel'], 'Review button label', 5, short(120)),
      field(['reviewUrl'], 'Review destination', 6, system()),
      field(['licenses'], 'Licenses', 7, {
        type: 'nested-collection',
        itemLabel: 'License',
        addLabel: 'Add license',
        itemLabelPath: ['label'],
        reorderable: true,
        blankItem: { id: blank(15), label: 'License number' },
        itemFields: [
          leafField(['id'], 'Item identity', 0, system()),
          leafField(['label'], 'License', 1, short(120)),
        ],
      }),
    ]),
  }),
  entity({
    id: 'property-management.footer.brand',
    kind: 'object',
    label: 'Footer Brand',
    schema: propertyManagementFooterBrandSchema,
    editor: objectEditor('Footer brand', [
      field(['logo'], 'Logo', 0, media(['logoAltText'])),
      field(['logoAltText'], 'Logo description', 1, short(160)),
      field(['description'], 'Description', 2, long(4, 800)),
    ]),
  }),
  entity({
    id: 'property-management.footer.links',
    kind: 'list',
    label: 'Footer Links',
    schema: propertyManagementFooterLinksSchema,
    listItemSchema: linkItemSchema,
    editor: listEditor(
      'Footer links',
      'Footer link',
      { id: blank(16), group: 'Company', label: 'New link', destination: 'about' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['group'], 'Column', 1, {
          type: 'enum',
          display: 'select',
          choices: ['Services', 'Company', 'Resources'].map((value) => ({ value, label: value })),
        }),
        field(['label'], 'Label', 2, short(120)),
        field(['destination'], 'Page section', 3, sectionChoice()),
      ],
      ['label'],
    ),
  }),
  entity({
    id: 'property-management.footer.social',
    kind: 'list',
    label: 'Footer Social',
    schema: propertyManagementFooterSocialSchema,
    listItemSchema: z.strictObject({
      id: uuid,
      label: z.enum(['Facebook', 'Twitter', 'LinkedIn', 'Instagram']),
      externalUrl: optionalText(1_000),
    }),
    editor: listEditor(
      'Social links',
      'Social link',
      { id: blank(17), label: 'Facebook', externalUrl: '' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['label'], 'Network', 1, {
          type: 'enum',
          display: 'select',
          choices: ['Facebook', 'Twitter', 'LinkedIn', 'Instagram'].map((value) => ({
            value,
            label: value,
          })),
        }),
        field(['externalUrl'], 'Profile destination', 2, system(), false),
      ],
      ['label'],
    ),
  }),
  entity({
    id: 'property-management.footer.legal',
    kind: 'object',
    label: 'Footer Legal',
    schema: propertyManagementFooterLegalSchema,
    editor: objectEditor('Footer legal text', [
      field(['organizationName'], 'Organization name', 0, short(160)),
      field(['rightsNotice'], 'Rights notice', 1, short(200)),
      field(['privacyLabel'], 'Privacy label', 2, short(80)),
      field(['termsLabel'], 'Terms label', 3, short(80)),
    ]),
  }),
] as const satisfies readonly SemanticEntityDefinition[];

const objectEntry = (entityId: string, component: string): EntityViewCatalogEntry => ({
  entityId,
  pageId: 'property-management',
  legacyComponent: component,
  primary: { slotId: `${entityId}.primary`, routes: ['/property-management'] },
  secondary: [],
  emptyState: { kind: 'not-applicable' },
});
const listEntry = (
  entityId: string,
  component: string,
  itemLabel: string,
): EntityViewCatalogEntry => ({
  entityId,
  pageId: 'property-management',
  legacyComponent: component,
  primary: { slotId: `${entityId}.primary`, routes: ['/property-management'] },
  secondary: [],
  emptyState: {
    kind: 'editable-empty-state',
    heading: `No ${itemLabel.toLowerCase()} yet`,
    description: `Add the first ${itemLabel.toLowerCase()} when you are ready.`,
    addLabel: `Add ${itemLabel.toLowerCase()}`,
  },
});

export const propertyManagementEntityViewCatalog = [
  objectEntry('property-management.anniversary-banner', 'Header anniversary banner'),
  objectEntry('property-management.header', 'Header'),
  objectEntry('property-management.hero', 'Hero'),
  listEntry('property-management.hero.stats', 'Hero statistics', 'Statistic'),
  objectEntry('property-management.services.header', 'Services heading'),
  listEntry('property-management.services.items', 'Services cards', 'Service'),
  objectEntry('property-management.process.header', 'Process heading'),
  listEntry('property-management.process.steps', 'Process timeline', 'Step'),
  objectEntry('property-management.portfolio.managed.header', 'ManagedProperties heading'),
  listEntry('property-management.portfolio.managed.items', 'ManagedProperties cards', 'Property'),
  objectEntry('property-management.portfolio.coas.header', 'ManagedProperties COA heading'),
  listEntry(
    'property-management.portfolio.coas.items',
    'ManagedProperties COA cards',
    'Association',
  ),
  objectEntry('property-management.portfolio.hoas.header', 'ManagedProperties HOA heading'),
  listEntry(
    'property-management.portfolio.hoas.items',
    'ManagedProperties HOA cards',
    'Association',
  ),
  objectEntry('property-management.tenant-portal', 'TenantPortal'),
  listEntry('property-management.tenant-portal.features', 'TenantPortal feature cards', 'Feature'),
  objectEntry('property-management.team.header', 'Team heading'),
  listEntry('property-management.team.members', 'Team profiles', 'Team member'),
  objectEntry('property-management.about', 'About'),
  listEntry('property-management.about.features', 'About feature list', 'Highlight'),
  objectEntry('property-management.testimonials.header', 'Testimonials heading'),
  listEntry('property-management.testimonials.items', 'Testimonials cards', 'Testimonial'),
  listEntry('property-management.testimonials.stats', 'Testimonials trust indicators', 'Statistic'),
  objectEntry('property-management.faq.header', 'FAQ heading'),
  listEntry('property-management.faq.items', 'FAQ accordion', 'Question'),
  objectEntry('property-management.careers', 'Careers'),
  objectEntry('property-management.reviews.header', 'LeaveUsAReview heading'),
  listEntry(
    'property-management.reviews.platforms',
    'LeaveUsAReview platform cards',
    'Review site',
  ),
  objectEntry('property-management.reviews.footer', 'LeaveUsAReview footer'),
  objectEntry('property-management.contact.header', 'Contact heading'),
  objectEntry('property-management.contact.details', 'Contact details'),
  objectEntry('property-management.footer.brand', 'Footer brand'),
  listEntry('property-management.footer.links', 'Footer navigation columns', 'Footer link'),
  listEntry('property-management.footer.social', 'Footer social links', 'Social link'),
  objectEntry('property-management.footer.legal', 'Footer legal bar'),
] as const satisfies readonly EntityViewCatalogEntry[];

export const propertyManagementEntityModule = defineEntityModule({
  pageId: 'property-management',
  entities: propertyManagementEntityDefinitions,
  viewCatalog: propertyManagementEntityViewCatalog,
});

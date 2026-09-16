import { z } from 'zod';
import type { EditableValue } from './content.js';
import {
  defineEntityModule,
  defineSemanticEntity,
  type EditorControl,
  type EditorField,
  type LeafEditorField,
  type EntityEditorDefinition,
  type EntityViewCatalogEntry,
  type SemanticEntityDefinition,
} from './editor-contracts.js';
import { lucideIconChoices, lucideIconNameSchema } from './lucide-icons.js';

export const REAL_ESTATE_CONTENT_SCHEMA_VERSION = 2 as const;
const text = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) => z.string().trim().max(max);
const id = z.uuid();
const image = z.strictObject({ kind: z.literal('managed'), key: text(1024) });
const optionalExternalUrl = z.union([z.literal(''), z.url().max(1000)]);
const destination = z.enum(['services', 'process', 'team', 'about', 'faq', 'reviews', 'contact']);
const icon = lucideIconNameSchema;
const heading = z.strictObject({ eyebrow: text(120), heading: text(200), description: text(2000) });
export const realEstateAnniversaryBannerSchema = z.strictObject({ message: text(120) });
export const realEstateHeaderSchema = z.strictObject({
  logo: image,
  logoAltText: text(160),
  divisionLabel: text(80),
  phone: text(40),
  actionLabel: text(80),
  navLinks: z.array(z.strictObject({ id, label: text(80), destination })),
});
export const realEstateHeroSchema = z.strictObject({
  badge: text(120),
  heading: text(200),
  description: text(2000),
  primaryActionLabel: text(80),
  secondaryActionLabel: text(80),
});
export const realEstateHeroStatSchema = z.strictObject({
  id,
  value: text(40),
  label: text(100),
  icon,
});
export const realEstateHeroStatsSchema = z.array(realEstateHeroStatSchema);
export const realEstateListingsHeaderSchema = heading;
export const realEstateListingGalleryImageSchema = z.strictObject({
  id,
  image,
  imageAltText: text(200),
});
export const realEstateListingSchema = z.strictObject({
  id,
  address: text(200),
  city: text(120),
  price: text(80),
  detail: text(120),
  type: text(100),
  status: z.enum(['active', 'sold']),
  image,
  imageAltText: text(200),
  gallery: z.array(realEstateListingGalleryImageSchema),
  actionLabel: optional(80),
  externalUrl: optionalExternalUrl,
});
export const realEstateListingsItemsSchema = z.array(realEstateListingSchema);
export const realEstateListingDirectoryLinkSchema = z.strictObject({
  id,
  label: text(80),
  externalUrl: z.url().max(1000),
});
export const realEstateListingsActionsSchema = z.strictObject({
  activeLabel: text(80),
  soldLabel: text(80),
  directoryLinks: z.array(realEstateListingDirectoryLinkSchema).min(1).max(6),
  contactActionLabel: text(120),
});
export const realEstateServicesHeaderSchema = heading;
export const realEstateServiceSchema = z.strictObject({
  id,
  title: text(160),
  description: text(2000),
  icon,
});
export const realEstateServicesItemsSchema = z.array(realEstateServiceSchema);
export const realEstateProcessHeaderSchema = heading;
export const realEstateProcessStepSchema = z.strictObject({
  id,
  number: text(8),
  title: text(160),
  description: text(1000),
});
export const realEstateProcessStepsSchema = z.array(realEstateProcessStepSchema);
export const realEstateAboutSchema = z.strictObject({
  brandLabel: text(100),
  eyebrow: text(120),
  heading: text(200),
  introduction: text(2000),
  detail: text(2000),
  statValue: text(40),
  statLabel: text(100),
  actionLabel: text(80),
});
export const realEstateAboutFeatureSchema = z.strictObject({ id, label: text(200) });
export const realEstateAboutFeaturesSchema = z.array(realEstateAboutFeatureSchema);
export const realEstateTeamHeaderSchema = z.strictObject({
  ...heading.shape,
  leadershipLabel: text(100),
  staffLabel: text(100),
  agentsLabel: text(100),
});
export const realEstateTeamMemberSchema = z.strictObject({
  id,
  name: text(160),
  role: text(160),
  bio: text(3000),
  email: z.email(),
  phone: text(40),
  image,
  imageAltText: text(200),
});
export const realEstateTeamMembersSchema = z.array(realEstateTeamMemberSchema);
export const realEstateCareersSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(200),
  description: text(2000),
  benefits: z.array(z.strictObject({ id, label: text(200) })).min(1),
  actionLabel: text(80),
  email: z.email(),
  cardHeading: text(160),
  cardDescription: text(1000),
});
export const realEstateTestimonialsHeaderSchema = heading;
export const realEstateTestimonialSchema = z.strictObject({
  id,
  name: text(160),
  role: text(160),
  quote: text(2000),
  rating: z.number().int().min(1).max(5),
});
export const realEstateTestimonialsItemsSchema = z.array(realEstateTestimonialSchema);
export const realEstateFaqHeaderSchema = heading;
export const realEstateFaqItemSchema = z.strictObject({
  id,
  question: text(300),
  answer: text(3000),
});
export const realEstateFaqItemsSchema = z.array(realEstateFaqItemSchema);
export const realEstateReviewsHeaderSchema = heading;
export const realEstateReviewPlatformSchema = z.strictObject({
  id,
  name: text(80),
  description: text(600),
  externalUrl: optionalExternalUrl,
});
export const realEstateReviewsPlatformsSchema = z.array(realEstateReviewPlatformSchema);
export const realEstateReviewsFooterSchema = z.strictObject({
  message: text(300),
  email: z.email(),
});
export const realEstateContactHeaderSchema = heading;
export const realEstateContactDetailsSchema = z.strictObject({
  addressLabel: text(100),
  address: text(300),
  phoneLabel: text(100),
  phone: text(40),
  faxLabel: text(100),
  fax: text(40),
  emailLabel: text(100),
  email: z.email(),
  officeHoursLabel: text(100),
  officeHours: text(160),
});
export const realEstateFooterBrandSchema = z.strictObject({
  logo: image,
  logoAltText: text(160),
  description: text(1000),
  address: text(300),
  phone: text(40),
  email: z.email(),
});
export const realEstateFooterLinkSchema = z.strictObject({ id, label: text(100), destination });
export const realEstateFooterLinksSchema = z.array(realEstateFooterLinkSchema);
export const realEstateFooterLicenseSchema = z.strictObject({
  heading: text(100),
  license: text(200),
});
export const realEstateFooterLegalSchema = z.strictObject({
  organizationName: text(160),
  rightsNotice: text(200),
});

const invalid = 'Check this field and try again.';
const field = (
  path: readonly string[],
  label: string,
  order: number,
  control: EditorControl,
  required = true,
): EditorField => ({
  path: [...path],
  label,
  required,
  order,
  validationMessages: {
    ...(required && control.type !== 'system' ? { required: `Enter ${label.toLowerCase()}.` } : {}),
    invalid,
  },
  control,
});
const leafField = (
  path: readonly string[],
  label: string,
  order: number,
  control: Exclude<EditorControl, { type: 'nested-collection' }>,
  required = true,
): LeafEditorField => field(path, label, order, control, required) as LeafEditorField;
const short = (maxLength: number): Extract<EditorControl, { type: 'short-text' }> => ({
  type: 'short-text',
  maxLength,
});
const long = (
  rows: number,
  maxLength: number,
): Extract<EditorControl, { type: 'multiline-text' }> => ({
  type: 'multiline-text',
  rows,
  maxLength,
});
const system = (): Extract<EditorControl, { type: 'system' }> => ({
  type: 'system',
  immutable: true,
});
const media = (alt: string): Extract<EditorControl, { type: 'media-picker' }> => ({
  type: 'media-picker',
  mediaKind: 'image',
  supportsFocalPoint: false,
  altTextPath: [alt],
});
const externalLink = (): Extract<EditorControl, { type: 'link-builder' }> => ({
  type: 'link-builder',
  allowedDestinations: ['external-site'],
});
const iconPicker = (): EditorControl => ({
  type: 'icon-picker',
  choices: lucideIconChoices,
});
const destinationPicker = (): EditorControl => ({
  type: 'enum',
  display: 'select',
  choices: destination.options.map((value) => ({
    value,
    label: value[0]?.toUpperCase() + value.slice(1),
  })),
});
const destinationChoices = destination.options.map((value) => ({
  value,
  label: value[0]?.toUpperCase() + value.slice(1),
}));
const objectEditor = (
  label: string,
  fields: readonly EditorField[],
): Extract<EntityEditorDefinition, { kind: 'object' }> => ({
  version: 2,
  kind: 'object',
  label,
  helpText: `Update ${label.toLowerCase()}.`,
  groups: [{ id: 'content', label: 'Content', order: 0, fields: [...fields] }],
});
const listEditor = (
  label: string,
  itemLabel: string,
  itemLabelPath: readonly string[],
  blankItem: EditableValue,
  fields: readonly EditorField[],
): Extract<EntityEditorDefinition, { kind: 'list' }> => ({
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
});
const blank = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sectionFields = [
  field(['eyebrow'], 'Introductory label', 0, short(120)),
  field(['heading'], 'Heading', 1, short(200)),
  field(['description'], 'Description', 2, long(5, 2000)),
];
const entity = (definition: Omit<SemanticEntityDefinition, 'publicPath'>) =>
  defineSemanticEntity({
    ...definition,
    pageId: 'real-estate',
    publicPath: definition.id.split('.'),
  });
const object = (
  idValue: string,
  label: string,
  schema: z.ZodType<EditableValue>,
  fields: readonly EditorField[],
) =>
  entity({
    id: idValue,
    pageId: 'real-estate',
    kind: 'object',
    label,
    schema,
    editor: objectEditor(label, fields),
  });
const list = (
  idValue: string,
  label: string,
  itemLabel: string,
  schema: z.ZodType<EditableValue>,
  itemSchema: z.ZodType<EditableValue>,
  blankItem: EditableValue,
  fields: readonly EditorField[],
) =>
  entity({
    id: idValue,
    pageId: 'real-estate',
    kind: 'list',
    label,
    schema,
    listItemSchema: itemSchema,
    editor: listEditor(
      label,
      itemLabel,
      [fields.find((f) => f.path[0] !== 'id')?.path[0] ?? 'id'],
      blankItem,
      fields,
    ),
  });
const memberFields = [
  field(['id'], 'Item identity', 0, system()),
  field(['name'], 'Name', 1, short(160)),
  field(['role'], 'Role', 2, short(160)),
  field(['bio'], 'Biography', 3, long(7, 3000)),
  field(['email'], 'Email', 4, { type: 'email' }),
  field(['phone'], 'Phone', 5, { type: 'phone', country: 'US' }),
  field(['image'], 'Photo', 6, media('imageAltText')),
  field(['imageAltText'], 'Photo description', 7, short(200)),
];
const headerFields = [
  field(['logo'], 'Logo', 0, media('logoAltText')),
  field(['logoAltText'], 'Logo description', 1, short(160)),
  field(['divisionLabel'], 'Division name', 2, short(80)),
  field(['phone'], 'Phone', 3, { type: 'phone', country: 'US' }),
  field(['actionLabel'], 'Button label', 4, short(80)),
  field(['navLinks'], 'Navigation links', 5, {
    type: 'nested-collection',
    itemLabel: 'Link',
    addLabel: 'Add link',
    itemLabelPath: ['label'],
    reorderable: true,
    blankItem: { id: blank(1), label: 'New link', destination: 'services' },
    itemFields: [
      {
        ...field(['id'], 'Item identity', 0, system()),
        control: { type: 'system', immutable: true },
      },
      {
        ...field(['label'], 'Label', 1, short(80)),
        control: { type: 'short-text', maxLength: 80 },
      },
      {
        ...field(['destination'], 'Page section', 2, destinationPicker()),
        control: { type: 'enum', display: 'select', choices: destinationChoices },
      },
    ],
  }),
];
export const realEstateEntityDefinitions = [
  object(
    'real-estate.anniversary-banner',
    'Anniversary banner',
    realEstateAnniversaryBannerSchema,
    [field(['message'], 'Message', 0, short(120))],
  ),
  object('real-estate.header', 'Header', realEstateHeaderSchema, headerFields),
  object('real-estate.hero', 'Hero', realEstateHeroSchema, [
    field(['badge'], 'Introductory label', 0, short(120)),
    field(['heading'], 'Heading', 1, short(200)),
    field(['description'], 'Description', 2, long(6, 2000)),
    field(['primaryActionLabel'], 'Primary button', 3, short(80)),
    field(['secondaryActionLabel'], 'Secondary button', 4, short(80)),
  ]),
  list(
    'real-estate.hero.stats',
    'Hero statistics',
    'Statistic',
    realEstateHeroStatsSchema,
    realEstateHeroStatSchema,
    { id: blank(2), value: '0+', label: 'New statistic', icon: 'TrendingUp' },
    [
      field(['id'], 'Item identity', 0, system()),
      field(['value'], 'Value', 1, short(40)),
      field(['label'], 'Label', 2, short(100)),
      field(['icon'], 'Icon', 3, iconPicker()),
    ],
  ),
  object(
    'real-estate.listings.header',
    'Listings heading',
    realEstateListingsHeaderSchema,
    sectionFields,
  ),
  list(
    'real-estate.listings.items',
    'Listings',
    'Listing',
    realEstateListingsItemsSchema,
    realEstateListingSchema,
    {
      id: blank(3),
      address: 'New listing',
      city: 'Draper, UT',
      price: 'Contact for details',
      detail: 'Property details',
      type: 'Property',
      status: 'active',
      image: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
      imageAltText: 'Property photo',
      gallery: [],
      actionLabel: 'View listing',
      externalUrl: '',
    },
    [
      field(['id'], 'Item identity', 0, system()),
      field(['address'], 'Address', 1, short(200)),
      field(['city'], 'City', 2, short(120)),
      field(['price'], 'Price', 3, short(80)),
      field(['detail'], 'Property detail', 4, short(120)),
      field(['type'], 'Property type', 5, short(100)),
      field(['status'], 'Status', 6, {
        type: 'enum',
        display: 'radio',
        choices: [
          { value: 'active', label: 'Active' },
          { value: 'sold', label: 'Sold' },
        ],
      }),
      field(['image'], 'Photo', 7, media('imageAltText')),
      field(['imageAltText'], 'Photo description', 8, short(200)),
      field(['gallery'], 'Photo gallery', 9, {
        type: 'nested-collection',
        itemLabel: 'Gallery photo',
        addLabel: 'Add gallery photo',
        itemLabelPath: ['imageAltText'],
        reorderable: true,
        blankItem: {
          id: blank(15),
          image: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
          imageAltText: 'Property gallery photo',
        },
        itemFields: [
          leafField(['id'], 'Item identity', 0, system()),
          leafField(['image'], 'Photo', 1, media('imageAltText')),
          leafField(['imageAltText'], 'Photo description', 2, short(200)),
        ],
      }),
      field(['actionLabel'], 'Button label', 10, short(80), false),
      field(['externalUrl'], 'Listing website', 11, externalLink(), false),
    ],
  ),
  object('real-estate.listings.actions', 'Listing actions', realEstateListingsActionsSchema, [
    field(['activeLabel'], 'Active tab', 0, short(80)),
    field(['soldLabel'], 'Sold tab', 1, short(80)),
    field(['directoryLinks'], 'Listing directories', 2, {
      type: 'nested-collection',
      itemLabel: 'Directory',
      addLabel: 'Add directory',
      itemLabelPath: ['label'],
      reorderable: true,
      blankItem: {
        id: blank(16),
        label: 'New directory',
        externalUrl: 'https://example.com/',
      },
      itemFields: [
        leafField(['id'], 'Item identity', 0, system()),
        leafField(['label'], 'Label', 1, short(80)),
        leafField(['externalUrl'], 'Directory website', 2, externalLink()),
      ],
    }),
    field(['contactActionLabel'], 'Contact link label', 3, short(120)),
  ]),
  object(
    'real-estate.services.header',
    'Services heading',
    realEstateServicesHeaderSchema,
    sectionFields,
  ),
  list(
    'real-estate.services.items',
    'Services',
    'Service',
    realEstateServicesItemsSchema,
    realEstateServiceSchema,
    { id: blank(4), title: 'New service', description: 'Describe the service.', icon: 'Building2' },
    [
      field(['id'], 'Item identity', 0, system()),
      field(['icon'], 'Icon', 1, iconPicker()),
      field(['title'], 'Title', 2, short(160)),
      field(['description'], 'Description', 3, long(6, 2000)),
    ],
  ),
  object(
    'real-estate.process.header',
    'Process heading',
    realEstateProcessHeaderSchema,
    sectionFields,
  ),
  list(
    'real-estate.process.steps',
    'Process steps',
    'Step',
    realEstateProcessStepsSchema,
    realEstateProcessStepSchema,
    { id: blank(5), number: '01', title: 'New step', description: 'Describe this step.' },
    [
      field(['id'], 'Item identity', 0, system()),
      field(['number'], 'Step number', 1, short(8)),
      field(['title'], 'Title', 2, short(160)),
      field(['description'], 'Description', 3, long(5, 1000)),
    ],
  ),
  object('real-estate.about', 'About section', realEstateAboutSchema, [
    field(['brandLabel'], 'Brand label', 0, short(100)),
    field(['eyebrow'], 'Introductory label', 1, short(120)),
    field(['heading'], 'Heading', 2, short(200)),
    field(['introduction'], 'Introduction', 3, long(6, 2000)),
    field(['detail'], 'Details', 4, long(6, 2000)),
    field(['statValue'], 'Statistic', 5, short(40)),
    field(['statLabel'], 'Statistic label', 6, short(100)),
    field(['actionLabel'], 'Button label', 7, short(80)),
  ]),
  list(
    'real-estate.about.features',
    'About features',
    'Feature',
    realEstateAboutFeaturesSchema,
    realEstateAboutFeatureSchema,
    { id: blank(6), label: 'New feature' },
    [field(['id'], 'Item identity', 0, system()), field(['label'], 'Feature', 1, short(200))],
  ),
  object('real-estate.team.header', 'Team heading', realEstateTeamHeaderSchema, [
    ...sectionFields,
    field(['leadershipLabel'], 'Leadership group heading', 3, short(100)),
    field(['staffLabel'], 'Staff group heading', 4, short(100)),
    field(['agentsLabel'], 'Agent group heading', 5, short(100)),
  ]),
  list(
    'real-estate.team.leadership',
    'Leadership',
    'Leader',
    realEstateTeamMembersSchema,
    realEstateTeamMemberSchema,
    {
      id: blank(7),
      name: 'New leader',
      role: 'Role',
      bio: 'Add a biography.',
      email: 'realestate@tricoinc.com',
      phone: '(801) 571-8833',
      image: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
      imageAltText: 'Team member portrait',
    },
    memberFields,
  ),
  list(
    'real-estate.team.staff',
    'Staff',
    'Staff member',
    realEstateTeamMembersSchema,
    realEstateTeamMemberSchema,
    {
      id: blank(8),
      name: 'New staff member',
      role: 'Role',
      bio: 'Add a biography.',
      email: 'realestate@tricoinc.com',
      phone: '(801) 571-8833',
      image: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
      imageAltText: 'Team member portrait',
    },
    memberFields,
  ),
  list(
    'real-estate.team.agents',
    'Agents',
    'Agent',
    realEstateTeamMembersSchema,
    realEstateTeamMemberSchema,
    {
      id: blank(9),
      name: 'New agent',
      role: 'Licensed Real Estate Agent',
      bio: 'Add a biography.',
      email: 'realestate@tricoinc.com',
      phone: '(801) 571-8833',
      image: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
      imageAltText: 'Agent portrait',
    },
    memberFields,
  ),
  object('real-estate.careers', 'Careers', realEstateCareersSchema, [
    field(['eyebrow'], 'Introductory label', 0, short(120)),
    field(['heading'], 'Heading', 1, short(200)),
    field(['description'], 'Description', 2, long(6, 2000)),
    field(['benefits'], 'Benefits', 3, {
      type: 'nested-collection',
      itemLabel: 'Benefit',
      addLabel: 'Add benefit',
      itemLabelPath: ['label'],
      reorderable: true,
      blankItem: { id: blank(14), label: 'New benefit' },
      itemFields: [
        {
          ...field(['id'], 'Item identity', 0, system()),
          control: { type: 'system', immutable: true },
        },
        {
          ...field(['label'], 'Benefit', 1, short(200)),
          control: { type: 'short-text', maxLength: 200 },
        },
      ],
    }),
    field(['actionLabel'], 'Button label', 4, short(80)),
    field(['email'], 'Application email', 5, { type: 'email' }),
    field(['cardHeading'], 'Card heading', 6, short(160)),
    field(['cardDescription'], 'Card description', 7, long(4, 1000)),
  ]),
  object(
    'real-estate.testimonials.header',
    'Testimonials heading',
    realEstateTestimonialsHeaderSchema,
    sectionFields,
  ),
  list(
    'real-estate.testimonials.items',
    'Testimonials',
    'Testimonial',
    realEstateTestimonialsItemsSchema,
    realEstateTestimonialSchema,
    { id: blank(10), name: 'New client', role: 'Client', quote: 'Add their feedback.', rating: 5 },
    [
      field(['id'], 'Item identity', 0, system()),
      field(['name'], 'Name', 1, short(160)),
      field(['role'], 'Role', 2, short(160)),
      field(['quote'], 'Testimonial', 3, long(6, 2000)),
      field(['rating'], 'Rating', 4, {
        type: 'number',
        display: 'integer',
        minimum: 1,
        maximum: 5,
        step: 1,
      }),
    ],
  ),
  object('real-estate.faq.header', 'FAQ heading', realEstateFaqHeaderSchema, sectionFields),
  list(
    'real-estate.faq.items',
    'Questions',
    'Question',
    realEstateFaqItemsSchema,
    realEstateFaqItemSchema,
    { id: blank(11), question: 'New question', answer: 'Add the answer.' },
    [
      field(['id'], 'Item identity', 0, system()),
      field(['question'], 'Question', 1, short(300)),
      field(['answer'], 'Answer', 2, long(7, 3000)),
    ],
  ),
  object(
    'real-estate.reviews.header',
    'Reviews heading',
    realEstateReviewsHeaderSchema,
    sectionFields,
  ),
  list(
    'real-estate.reviews.platforms',
    'Review sites',
    'Review site',
    realEstateReviewsPlatformsSchema,
    realEstateReviewPlatformSchema,
    {
      id: blank(12),
      name: 'Review site',
      description: 'Invite clients to leave a review.',
      externalUrl: '',
    },
    [
      field(['id'], 'Item identity', 0, system()),
      field(['name'], 'Site name', 1, short(80)),
      field(['description'], 'Description', 2, long(4, 600)),
      field(['externalUrl'], 'Review destination', 3, externalLink(), false),
    ],
  ),
  object('real-estate.reviews.footer', 'Private feedback', realEstateReviewsFooterSchema, [
    field(['message'], 'Message', 0, short(300)),
    field(['email'], 'Email', 1, { type: 'email' }),
  ]),
  object(
    'real-estate.contact.header',
    'Contact heading',
    realEstateContactHeaderSchema,
    sectionFields,
  ),
  object('real-estate.contact.details', 'Contact details', realEstateContactDetailsSchema, [
    field(['addressLabel'], 'Office location label', 0, short(100)),
    field(['address'], 'Office location', 1, long(3, 300)),
    field(['phoneLabel'], 'Phone label', 2, short(100)),
    field(['phone'], 'Phone', 3, { type: 'phone', country: 'US' }),
    field(['faxLabel'], 'Fax label', 4, short(100)),
    field(['fax'], 'Fax', 5, { type: 'phone', country: 'US' }),
    field(['emailLabel'], 'Email label', 6, short(100)),
    field(['email'], 'Email', 7, { type: 'email' }),
    field(['officeHoursLabel'], 'Office hours label', 8, short(100)),
    field(['officeHours'], 'Office hours', 9, short(160)),
  ]),
  object('real-estate.footer.brand', 'Footer contact', realEstateFooterBrandSchema, [
    field(['logo'], 'Logo', 0, media('logoAltText')),
    field(['logoAltText'], 'Logo description', 1, short(160)),
    field(['description'], 'Description', 2, long(4, 1000)),
    field(['address'], 'Address', 3, long(3, 300)),
    field(['phone'], 'Phone', 4, { type: 'phone', country: 'US' }),
    field(['email'], 'Email', 5, { type: 'email' }),
  ]),
  list(
    'real-estate.footer.links',
    'Footer links',
    'Footer link',
    realEstateFooterLinksSchema,
    realEstateFooterLinkSchema,
    { id: blank(13), label: 'New link', destination: 'services' },
    [
      field(['id'], 'Item identity', 0, system()),
      field(['label'], 'Label', 1, short(100)),
      field(['destination'], 'Page section', 2, destinationPicker()),
    ],
  ),
  object('real-estate.footer.license', 'Brokerage license', realEstateFooterLicenseSchema, [
    field(['heading'], 'Heading', 0, short(100)),
    field(['license'], 'License', 1, short(200)),
  ]),
  object('real-estate.footer.legal', 'Footer legal text', realEstateFooterLegalSchema, [
    field(['organizationName'], 'Organization name', 0, short(160)),
    field(['rightsNotice'], 'Rights notice', 1, short(200)),
  ]),
] as const satisfies readonly SemanticEntityDefinition[];
const realEstateLegacyComponentById: Readonly<Record<string, string>> = {
  'real-estate.anniversary-banner': 'Legacy Real Estate page / Anniversary banner',
  'real-estate.header': 'Legacy Real Estate page / Desktop and mobile navigation',
  'real-estate.hero': 'Legacy Real Estate page / Hero',
  'real-estate.hero.stats': 'Legacy Real Estate page / Hero statistics',
  'real-estate.listings.header': 'Legacy Real Estate page / Listings introduction',
  'real-estate.listings.items': 'Legacy Real Estate page / Active and sold listing cards',
  'real-estate.listings.actions': 'Legacy Real Estate page / Listing tabs and directory actions',
  'real-estate.services.header': 'Legacy Real Estate page / Services introduction',
  'real-estate.services.items': 'Legacy Real Estate page / Service cards',
  'real-estate.process.header': 'Legacy Real Estate page / Process introduction',
  'real-estate.process.steps': 'Legacy Real Estate page / Process timeline',
  'real-estate.about': 'Legacy Real Estate page / About copy and transaction statistic',
  'real-estate.about.features': 'Legacy Real Estate page / About feature list',
  'real-estate.team.header': 'Legacy Real Estate page / Team introduction and group headings',
  'real-estate.team.leadership': 'Legacy Real Estate page / Leadership cards',
  'real-estate.team.staff': 'Legacy Real Estate page / Staff cards',
  'real-estate.team.agents': 'Legacy Real Estate page / Agent cards',
  'real-estate.careers': 'Legacy Real Estate page / Careers callout',
  'real-estate.testimonials.header': 'Legacy Real Estate page / Testimonials introduction',
  'real-estate.testimonials.items': 'Legacy Real Estate page / Testimonial cards',
  'real-estate.faq.header': 'Legacy Real Estate page / FAQ introduction',
  'real-estate.faq.items': 'Legacy Real Estate page / FAQ accordion',
  'real-estate.reviews.header': 'Legacy Real Estate page / Reviews introduction',
  'real-estate.reviews.platforms': 'Legacy Real Estate page / Review platform cards',
  'real-estate.reviews.footer': 'Legacy Real Estate page / Private feedback callout',
  'real-estate.contact.header': 'Legacy Real Estate page / Contact introduction',
  'real-estate.contact.details': 'Legacy Real Estate page / Contact detail rows',
  'real-estate.footer.brand': 'Legacy Real Estate page / Footer brand and contact',
  'real-estate.footer.links': 'Legacy Real Estate page / Footer navigation',
  'real-estate.footer.license': 'Legacy Real Estate page / Brokerage license',
  'real-estate.footer.legal': 'Legacy Real Estate page / Copyright line',
};
const secondarySlots: Readonly<Record<string, EntityViewCatalogEntry['secondary']>> = {
  'real-estate.header': [
    {
      slotId: 'real-estate.header.mobile',
      routes: ['/real-estate'],
      regionLabel: 'Mobile navigation',
    },
  ],
  'real-estate.listings.items': [
    {
      slotId: 'real-estate.listings.items.sold',
      routes: ['/real-estate'],
      regionLabel: 'Sold listing tab',
    },
  ],
  'real-estate.listings.actions': [
    {
      slotId: 'real-estate.listings.actions.directory-actions',
      routes: ['/real-estate'],
      regionLabel: 'Listing directory and contact actions',
    },
  ],
};
const entry = (definition: SemanticEntityDefinition): EntityViewCatalogEntry => {
  const legacyComponent = realEstateLegacyComponentById[definition.id];
  if (legacyComponent === undefined)
    throw new Error(`Real Estate legacy component reference missing for ${definition.id}`);
  return {
    entityId: definition.id,
    pageId: 'real-estate',
    legacyComponent,
    primary: {
      slotId: `${definition.id}.primary`,
      routes: ['/real-estate'],
      regionLabel: definition.label,
    },
    secondary: [...(secondarySlots[definition.id] ?? [])],
    emptyState:
      definition.kind === 'list'
        ? {
            kind: 'editable-empty-state',
            heading: `No ${definition.label.toLowerCase()} yet`,
            description: `Add the first ${definition.editor.kind === 'list' ? definition.editor.itemLabel.toLowerCase() : 'item'} when you are ready.`,
            addLabel: definition.editor.kind === 'list' ? definition.editor.addLabel : 'Add item',
          }
        : { kind: 'not-applicable' },
  };
};
export const realEstateEntityViewCatalog = realEstateEntityDefinitions.map((definition) =>
  entry(definition),
) satisfies readonly EntityViewCatalogEntry[];
export const realEstateEntityModule = defineEntityModule({
  pageId: 'real-estate',
  entities: realEstateEntityDefinitions,
  viewCatalog: realEstateEntityViewCatalog,
});

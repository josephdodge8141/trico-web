import { z } from 'zod';

import type { EditableValue } from './content.js';
import {
  defineEntityModule,
  defineSemanticEntity,
  type EditorControl,
  type EditorField,
  type EntityEditorDefinition,
  type EntityViewCatalogEntry,
  type SemanticEntityDefinition,
} from './editor-contracts.js';

export const STORAGE_CONTENT_SCHEMA_VERSION = 2 as const;
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const image = z.strictObject({ kind: z.literal('managed'), key: text(1_024) });
const destination = z.enum(['services', 'team', 'features', 'about', 'reviews', 'contact']);
const icon = z.enum([
  'TrendingUp',
  'Warehouse',
  'BarChart3',
  'Settings',
  'Shield',
  'Target',
  'Users',
  'DollarSign',
  'Building',
  'Handshake',
  'ClipboardCheck',
  'MessageSquare',
  'Monitor',
  'FileText',
]);
const heading = z.strictObject({
  eyebrow: text(120),
  heading: text(200),
  description: text(2_000),
});
const id = z.uuid();

export const storageAnniversaryBannerSchema = z.strictObject({ message: text(120) });
export const storageHeaderSchema = z.strictObject({
  logo: image,
  logoAltText: text(160),
  navLinks: z.array(z.strictObject({ id, label: text(80), destination })),
});
export const storageHeroSchema = z.strictObject({
  primaryBadge: text(120),
  serviceAreaBadge: text(120),
  heading: text(200),
  subheading: text(1_000),
  description: text(1_000),
  primaryActionLabel: text(80),
  secondaryActionLabel: text(80),
  image,
  imageAltText: text(200),
  imageCaption: text(160),
});
export const storageHeroStatSchema = z.strictObject({
  id,
  value: text(40),
  label: text(100),
  icon,
});
export const storageHeroStatsSchema = z.array(storageHeroStatSchema);
export const storageServicesHeaderSchema = heading;
export const storageServiceSchema = z.strictObject({
  id,
  icon,
  title: text(200),
  description: text(2_500),
});
export const storageServicesItemsSchema = z.array(storageServiceSchema);
export const storageTeamHeaderSchema = heading;
export const storageTeamMemberSchema = z.strictObject({
  id,
  name: text(160),
  role: text(160),
  bio: text(4_000),
  image,
  imageAltText: text(200),
});
export const storageTeamMembersSchema = z.array(storageTeamMemberSchema);
export const storageAboutSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(160),
  introduction: text(2_000),
  bridge: text(500),
  detail: text(2_000),
  conclusion: text(1_000),
  statValue: text(40),
  statLabel: text(100),
  actionLabel: text(80),
});
export const storageReviewsHeaderSchema = heading;
export const storageReviewPlatformSchema = z.strictObject({
  id,
  name: text(80),
  description: text(600),
  externalUrl: optionalText(1_000),
});
export const storageReviewsPlatformsSchema = z.array(storageReviewPlatformSchema);
export const storageReviewsFooterSchema = z.strictObject({ message: text(300), email: z.email() });
export const storageContactHeaderSchema = heading;
export const storageContactDetailsSchema = z.strictObject({
  address: text(300),
  phone: text(40),
  fax: text(40),
  email: z.email(),
  officeHours: text(160),
});
export const storageFooterBrandSchema = z.strictObject({
  logo: image,
  logoAltText: text(160),
  description: text(1_000),
  address: text(300),
  phone: text(40),
  email: z.email(),
});
export const storageFooterLinkSchema = z.strictObject({ id, label: text(100), destination });
export const storageFooterLinksSchema = z.array(storageFooterLinkSchema);
export const storageBrandingOptionSchema = z.strictObject({ id, label: text(100) });
export const storageFooterBrandingOptionsSchema = z.array(storageBrandingOptionSchema);
export const storageFooterLegalSchema = z.strictObject({
  organizationName: text(160),
  rightsNotice: text(200),
});

export type StorageHero = z.infer<typeof storageHeroSchema>;
export type StorageHeroStat = z.infer<typeof storageHeroStatSchema>;
export type StorageService = z.infer<typeof storageServiceSchema>;
export type StorageTeamMember = z.infer<typeof storageTeamMemberSchema>;
export type StorageReviewPlatform = z.infer<typeof storageReviewPlatformSchema>;
export type StorageFooterLink = z.infer<typeof storageFooterLinkSchema>;
export type StorageBrandingOption = z.infer<typeof storageBrandingOptionSchema>;

const invalid = 'Check this field and try again.';
function field(
  path: readonly string[],
  label: string,
  order: number,
  control: EditorControl,
  required = true,
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
const short = (maxLength: number): EditorControl => ({ type: 'short-text', maxLength });
const long = (rows: number, maxLength: number): EditorControl => ({
  type: 'multiline-text',
  rows,
  maxLength,
});
const system = (): EditorControl => ({ type: 'system', immutable: true });
const iconPicker = (): EditorControl => ({
  type: 'icon-picker',
  choices: icon.options.map((value) => ({
    value,
    label: value.replace(/([a-z])([A-Z])/g, '$1 $2'),
  })),
});
const media = (alt: string): EditorControl => ({
  type: 'media-picker',
  mediaKind: 'image',
  supportsFocalPoint: false,
  altTextPath: [alt],
});
const selectDestination = (): EditorControl => ({
  type: 'enum',
  display: 'select',
  choices: destination.options.map((value) => ({
    value,
    label: value[0]?.toUpperCase() + value.slice(1),
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
    pageId: 'storage',
    publicPath: definition.id.split('.'),
  });
}
const blank = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sectionFields = [
  field(['eyebrow'], 'Introductory label', 0, short(120)),
  field(['heading'], 'Heading', 1, short(200)),
  field(['description'], 'Description', 2, long(5, 2_000)),
];

export const storageEntityDefinitions = [
  entity({
    id: 'storage.anniversary-banner',
    pageId: 'storage',
    kind: 'object',
    label: 'Anniversary Banner',
    schema: storageAnniversaryBannerSchema,
    editor: objectEditor('Anniversary banner', [field(['message'], 'Message', 0, short(120))]),
  }),
  entity({
    id: 'storage.header',
    pageId: 'storage',
    kind: 'object',
    label: 'Header',
    schema: storageHeaderSchema,
    editor: objectEditor('Header', [
      field(['logo'], 'Logo', 0, media('logoAltText')),
      field(['logoAltText'], 'Logo description', 1, short(160)),
      field(['navLinks'], 'Navigation links', 2, {
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
            ...field(['destination'], 'Page section', 2, selectDestination()),
            control: {
              type: 'enum',
              display: 'select',
              choices: destination.options.map((value) => ({ value, label: value })),
            },
          },
        ],
      }),
    ]),
  }),
  entity({
    id: 'storage.hero',
    pageId: 'storage',
    kind: 'object',
    label: 'Hero',
    schema: storageHeroSchema,
    editor: objectEditor('Hero', [
      field(['primaryBadge'], 'Service label', 0, short(120)),
      field(['serviceAreaBadge'], 'Service area', 1, short(120)),
      field(['heading'], 'Heading', 2, long(3, 200)),
      field(['subheading'], 'Promise', 3, long(4, 1_000)),
      field(['description'], 'Description', 4, long(4, 1_000)),
      field(['primaryActionLabel'], 'Primary button', 5, short(80)),
      field(['secondaryActionLabel'], 'Secondary button', 6, short(80)),
      field(['image'], 'Photo', 7, media('imageAltText')),
      field(['imageAltText'], 'Photo description', 8, short(200)),
      field(['imageCaption'], 'Photo caption', 9, short(160)),
    ]),
  }),
  entity({
    id: 'storage.hero.stats',
    pageId: 'storage',
    kind: 'list',
    label: 'Hero Stats',
    schema: storageHeroStatsSchema,
    listItemSchema: storageHeroStatSchema,
    editor: listEditor(
      'Hero statistics',
      'Statistic',
      ['label'],
      { id: blank(2), value: '0+', label: 'New statistic', icon: 'TrendingUp' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['value'], 'Value', 1, short(40)),
        field(['label'], 'Label', 2, short(100)),
        field(['icon'], 'Icon', 3, iconPicker()),
      ],
    ),
  }),
  entity({
    id: 'storage.services.header',
    pageId: 'storage',
    kind: 'object',
    label: 'Services Header',
    schema: storageServicesHeaderSchema,
    editor: objectEditor('Services heading', sectionFields),
  }),
  entity({
    id: 'storage.services.items',
    pageId: 'storage',
    kind: 'list',
    label: 'Services Items',
    schema: storageServicesItemsSchema,
    listItemSchema: storageServiceSchema,
    editor: listEditor(
      'Services',
      'Service',
      ['title'],
      {
        id: blank(3),
        icon: 'Building',
        title: 'New service',
        description: 'Describe the service.',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['icon'], 'Icon', 1, iconPicker()),
        field(['title'], 'Title', 2, short(200)),
        field(['description'], 'Description', 3, long(6, 2_500)),
      ],
    ),
  }),
  entity({
    id: 'storage.team.header',
    pageId: 'storage',
    kind: 'object',
    label: 'Team Header',
    schema: storageTeamHeaderSchema,
    editor: objectEditor('Team heading', sectionFields),
  }),
  entity({
    id: 'storage.team.members',
    pageId: 'storage',
    kind: 'list',
    label: 'Team Members',
    schema: storageTeamMembersSchema,
    listItemSchema: storageTeamMemberSchema,
    editor: listEditor(
      'Team members',
      'Team member',
      ['name'],
      {
        id: blank(4),
        name: 'New team member',
        role: 'Role',
        bio: 'Add a short biography.',
        image: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        imageAltText: 'Team member portrait',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['name'], 'Name', 1, short(160)),
        field(['role'], 'Role', 2, short(160)),
        field(['bio'], 'Biography', 3, long(8, 4_000)),
        field(['image'], 'Photo', 4, media('imageAltText')),
        field(['imageAltText'], 'Photo description', 5, short(200)),
      ],
    ),
  }),
  entity({
    id: 'storage.about',
    pageId: 'storage',
    kind: 'object',
    label: 'About',
    schema: storageAboutSchema,
    editor: objectEditor('Our Why', [
      field(['eyebrow'], 'Introductory label', 0, short(120)),
      field(['heading'], 'Heading', 1, short(160)),
      field(['introduction'], 'Introduction', 2, long(6, 2_000)),
      field(['bridge'], 'Highlighted statement', 3, long(3, 500)),
      field(['detail'], 'Details', 4, long(6, 2_000)),
      field(['conclusion'], 'Conclusion', 5, long(4, 1_000)),
      field(['statValue'], 'Statistic', 6, short(40)),
      field(['statLabel'], 'Statistic label', 7, short(100)),
      field(['actionLabel'], 'Button label', 8, short(80)),
    ]),
  }),
  entity({
    id: 'storage.reviews.header',
    pageId: 'storage',
    kind: 'object',
    label: 'Reviews Header',
    schema: storageReviewsHeaderSchema,
    editor: objectEditor('Reviews heading', sectionFields),
  }),
  entity({
    id: 'storage.reviews.platforms',
    pageId: 'storage',
    kind: 'list',
    label: 'Reviews Platforms',
    schema: storageReviewsPlatformsSchema,
    listItemSchema: storageReviewPlatformSchema,
    editor: listEditor(
      'Review sites',
      'Review site',
      ['name'],
      {
        id: blank(5),
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
  }),
  entity({
    id: 'storage.reviews.footer',
    pageId: 'storage',
    kind: 'object',
    label: 'Reviews Footer',
    schema: storageReviewsFooterSchema,
    editor: objectEditor('Private feedback', [
      field(['message'], 'Message', 0, short(300)),
      field(['email'], 'Email', 1, { type: 'email' }),
    ]),
  }),
  entity({
    id: 'storage.contact.header',
    pageId: 'storage',
    kind: 'object',
    label: 'Contact Header',
    schema: storageContactHeaderSchema,
    editor: objectEditor('Contact heading', sectionFields),
  }),
  entity({
    id: 'storage.contact.details',
    pageId: 'storage',
    kind: 'object',
    label: 'Contact Details',
    schema: storageContactDetailsSchema,
    editor: objectEditor('Contact details', [
      field(['address'], 'Office location', 0, long(3, 300)),
      field(['phone'], 'Phone', 1, { type: 'phone', country: 'US' }),
      field(['fax'], 'Fax', 2, { type: 'phone', country: 'US' }),
      field(['email'], 'Email', 3, { type: 'email' }),
      field(['officeHours'], 'Office hours', 4, short(160)),
    ]),
  }),
  entity({
    id: 'storage.footer.brand',
    pageId: 'storage',
    kind: 'object',
    label: 'Footer Brand',
    schema: storageFooterBrandSchema,
    editor: objectEditor('Footer contact', [
      field(['logo'], 'Logo', 0, media('logoAltText')),
      field(['logoAltText'], 'Logo description', 1, short(160)),
      field(['description'], 'Description', 2, long(4, 1_000)),
      field(['address'], 'Address', 3, long(3, 300)),
      field(['phone'], 'Phone', 4, { type: 'phone', country: 'US' }),
      field(['email'], 'Email', 5, { type: 'email' }),
    ]),
  }),
  entity({
    id: 'storage.footer.links',
    pageId: 'storage',
    kind: 'list',
    label: 'Footer Links',
    schema: storageFooterLinksSchema,
    listItemSchema: storageFooterLinkSchema,
    editor: listEditor(
      'Footer links',
      'Footer link',
      ['label'],
      { id: blank(6), label: 'New link', destination: 'services' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['label'], 'Label', 1, short(100)),
        field(['destination'], 'Page section', 2, selectDestination()),
      ],
    ),
  }),
  entity({
    id: 'storage.footer.branding-options',
    pageId: 'storage',
    kind: 'list',
    label: 'Footer Branding Options',
    schema: storageFooterBrandingOptionsSchema,
    listItemSchema: storageBrandingOptionSchema,
    editor: listEditor(
      'Branding options',
      'Branding option',
      ['label'],
      { id: blank(7), label: 'New option' },
      [field(['id'], 'Item identity', 0, system()), field(['label'], 'Option', 1, short(100))],
    ),
  }),
  entity({
    id: 'storage.footer.legal',
    pageId: 'storage',
    kind: 'object',
    label: 'Footer Legal',
    schema: storageFooterLegalSchema,
    editor: objectEditor('Footer legal text', [
      field(['organizationName'], 'Organization name', 0, short(160)),
      field(['rightsNotice'], 'Rights notice', 1, short(200)),
    ]),
  }),
] as const satisfies readonly SemanticEntityDefinition[];

const entry = (entityId: string, component: string, list = false): EntityViewCatalogEntry => ({
  entityId,
  pageId: 'storage',
  legacyComponent: component,
  primary: { slotId: `${entityId}.primary`, routes: ['/storage'] },
  secondary: [],
  emptyState: list
    ? {
        kind: 'editable-empty-state',
        heading: 'No items yet',
        description: 'Add the first item when you are ready.',
        addLabel: 'Add item',
      }
    : { kind: 'not-applicable' },
});
export const storageEntityViewCatalog = [
  entry('storage.anniversary-banner', 'StorageHeader banner'),
  entry('storage.header', 'StorageHeader'),
  entry('storage.hero', 'StorageHero'),
  entry('storage.hero.stats', 'StorageHero statistics', true),
  entry('storage.services.header', 'StorageServices heading'),
  entry('storage.services.items', 'StorageServices cards', true),
  entry('storage.team.header', 'StorageTeam heading'),
  entry('storage.team.members', 'StorageTeam profiles', true),
  entry('storage.about', 'StorageAbout'),
  entry('storage.reviews.header', 'LeaveUsAReview heading'),
  entry('storage.reviews.platforms', 'LeaveUsAReview cards', true),
  entry('storage.reviews.footer', 'LeaveUsAReview footer'),
  entry('storage.contact.header', 'StorageContact heading'),
  entry('storage.contact.details', 'StorageContact details'),
  entry('storage.footer.brand', 'StorageFooter brand'),
  entry('storage.footer.links', 'StorageFooter quick links', true),
  entry('storage.footer.branding-options', 'StorageFooter branding options', true),
  entry('storage.footer.legal', 'StorageFooter legal'),
] as const satisfies readonly EntityViewCatalogEntry[];
export const storageEntityModule = defineEntityModule({
  pageId: 'storage',
  entities: storageEntityDefinitions,
  viewCatalog: storageEntityViewCatalog,
});

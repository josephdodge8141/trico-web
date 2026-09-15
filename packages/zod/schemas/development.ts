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

export const DEVELOPMENT_CONTENT_SCHEMA_VERSION = 2 as const;
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const id = z.uuid();
const image = z.strictObject({ kind: z.literal('managed'), key: text(1_024) });
const destination = z.enum(['services', 'projects', 'team', 'about', 'reviews', 'contact']);
const icon = lucideIconNameSchema;
const sectionHeading = z.strictObject({
  eyebrow: text(120),
  heading: text(200),
  description: text(2_000),
});

export const developmentAnniversaryBannerSchema = z.strictObject({
  message: text(120),
  years: text(40),
});
export const developmentHeaderSchema = z.strictObject({
  logo: image,
  logoAltText: text(160),
  divisionLabel: text(80),
  phone: text(40),
  actionLabel: text(80),
  navLinks: z.array(z.strictObject({ id, label: text(80), destination })),
});
export const developmentHeroSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(180),
  highlightedWord: text(80),
  description: text(1_500),
  primaryActionLabel: text(80),
  secondaryActionLabel: text(80),
});
export const developmentHeroStatSchema = z.strictObject({
  id,
  icon,
  value: text(40),
  label: text(100),
});
export const developmentHeroStatsSchema = z.array(developmentHeroStatSchema);
export const developmentLandExpertsHeaderSchema = sectionHeading;
export const developmentLandServiceSchema = z.strictObject({
  id,
  icon,
  title: text(160),
  description: text(1_500),
});
export const developmentLandExpertsServicesSchema = z.array(developmentLandServiceSchema);
export const developmentTrustStatSchema = z.strictObject({
  id,
  icon,
  value: text(40),
  label: text(100),
});
export const developmentLandExpertsStatsSchema = z.array(developmentTrustStatSchema);
export const developmentServicesHeaderSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(200),
  description: text(2_000),
  projectsHeading: text(160),
  featuredHeading: text(160),
});
export const developmentServiceSchema = z.strictObject({
  id,
  icon,
  title: text(160),
  description: text(1_500),
});
export const developmentServicesItemsSchema = z.array(developmentServiceSchema);
export const developmentProjectCategorySchema = z.strictObject({
  id,
  icon,
  title: text(120),
  count: text(80),
  description: text(1_000),
  buttonLabel: text(80),
});
export const developmentProjectsCategoriesSchema = z.array(developmentProjectCategorySchema);
export const developmentFeaturedProjectSchema = z.strictObject({
  id,
  image,
  imageAltText: text(200),
  type: text(120),
  title: text(160),
  location: text(120),
});
export const developmentProjectsFeaturedSchema = z.array(developmentFeaturedProjectSchema);
export const developmentPartnersHeaderSchema = sectionHeading;
export const developmentPartnerSchema = z.strictObject({ id, name: text(160) });
export const developmentPartnersItemsSchema = z.array(developmentPartnerSchema);
export const developmentPartnersFooterSchema = z.strictObject({
  message: text(300),
  actionLabel: text(80),
});
export const developmentTeamHeaderSchema = sectionHeading;
export const developmentTeamMemberSchema = z.strictObject({
  id,
  name: text(160),
  role: text(160),
  bio: text(4_000),
  image,
  imageAltText: text(200),
});
export const developmentTeamMembersSchema = z.array(developmentTeamMemberSchema);
export const developmentAboutSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(200),
  introduction: text(2_000),
  detail: text(2_000),
});
export const developmentAboutHighlightSchema = z.strictObject({ id, value: text(300) });
export const developmentAboutHighlightsSchema = z.array(developmentAboutHighlightSchema);
export const developmentAboutValueSchema = z.strictObject({
  id,
  icon,
  title: text(120),
  description: text(1_000),
});
export const developmentAboutValuesSchema = z.array(developmentAboutValueSchema);
export const developmentReviewsHeaderSchema = z.strictObject({
  eyebrow: text(120),
  heading: text(200),
  description: text(2_000),
  unavailableLinkLabel: text(160),
  actionLabel: text(80),
});
export const developmentReviewPlatformSchema = z.strictObject({
  id,
  name: text(80),
  description: text(600),
  externalUrl: optionalText(1_000),
});
export const developmentReviewsPlatformsSchema = z.array(developmentReviewPlatformSchema);
export const developmentReviewsFooterSchema = z.strictObject({
  message: text(300),
  email: z.email(),
});
export const developmentContactHeaderSchema = sectionHeading;
export const developmentContactDetailsSchema = z.strictObject({
  locationLabel: text(80),
  address: text(300),
  phoneLabel: text(80),
  phone: text(40),
  faxLabel: text(80),
  fax: text(40),
  emailLabel: text(80),
  email: z.email(),
  officeHoursLabel: text(80),
  officeHours: text(200),
});
export const developmentFooterBrandSchema = z.strictObject({
  logo: image,
  logoAltText: text(160),
  divisionLabel: text(80),
  description: text(1_000),
  address: text(300),
  phone: text(40),
  email: z.email(),
  linksHeading: text(100),
  serviceAreasHeading: text(100),
});
export const developmentFooterLinkSchema = z.strictObject({ id, label: text(100), destination });
export const developmentFooterLinksSchema = z.array(developmentFooterLinkSchema);
export const developmentServiceAreaSchema = z.strictObject({ id, label: text(100) });
export const developmentFooterServiceAreasSchema = z.array(developmentServiceAreaSchema);
export const developmentFooterLegalSchema = z.strictObject({
  organizationName: text(160),
  rightsNotice: text(200),
});

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
function leafField(
  path: readonly string[],
  label: string,
  order: number,
  control: LeafEditorControl,
  required = true,
): LeafEditorField {
  return field(path, label, order, control, required) as LeafEditorField;
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
  choices: lucideIconChoices,
});
const media = (altTextPath: string): EditorControl => ({
  type: 'media-picker',
  mediaKind: 'image',
  supportsFocalPoint: false,
  altTextPath: [altTextPath],
});
const destinationPicker = (): EditorControl => ({
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
    pageId: 'development',
    publicPath: definition.id.split('.'),
  });
}
const blank = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const headingFields = [
  field(['eyebrow'], 'Introductory label', 0, short(120)),
  field(['heading'], 'Heading', 1, short(200)),
  field(['description'], 'Description', 2, long(5, 2_000)),
];
const simpleItemFields = [
  field(['id'], 'Item identity', 0, system()),
  field(['icon'], 'Icon', 1, iconPicker()),
  field(['title'], 'Title', 2, short(160)),
  field(['description'], 'Description', 3, long(5, 1_500)),
];

export const developmentEntityDefinitions = [
  entity({
    id: 'development.anniversary-banner',
    pageId: 'development',
    kind: 'object',
    label: 'Anniversary Banner',
    schema: developmentAnniversaryBannerSchema,
    editor: objectEditor('Anniversary banner', [
      field(['message'], 'Message', 0, short(120)),
      field(['years'], 'Years', 1, short(40)),
    ]),
  }),
  entity({
    id: 'development.header',
    pageId: 'development',
    kind: 'object',
    label: 'Header',
    schema: developmentHeaderSchema,
    editor: objectEditor('Header', [
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
          leafField(['id'], 'Item identity', 0, system() as LeafEditorControl),
          leafField(['label'], 'Label', 1, short(80) as LeafEditorControl),
          leafField(['destination'], 'Page section', 2, destinationPicker() as LeafEditorControl),
        ],
      }),
    ]),
  }),
  entity({
    id: 'development.hero',
    pageId: 'development',
    kind: 'object',
    label: 'Hero',
    schema: developmentHeroSchema,
    editor: objectEditor('Hero', [
      field(['eyebrow'], 'Introductory label', 0, short(120)),
      field(['heading'], 'Heading', 1, short(180)),
      field(['highlightedWord'], 'Highlighted word', 2, short(80)),
      field(['description'], 'Description', 3, long(5, 1_500)),
      field(['primaryActionLabel'], 'Primary button', 4, short(80)),
      field(['secondaryActionLabel'], 'Secondary button', 5, short(80)),
    ]),
  }),
  entity({
    id: 'development.hero.stats',
    pageId: 'development',
    kind: 'list',
    label: 'Hero Stats',
    schema: developmentHeroStatsSchema,
    listItemSchema: developmentHeroStatSchema,
    editor: listEditor(
      'Hero statistics',
      'Statistic',
      ['label'],
      { id: blank(2), icon: 'Map', value: '0+', label: 'New statistic' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['icon'], 'Icon', 1, iconPicker()),
        field(['value'], 'Value', 2, short(40)),
        field(['label'], 'Label', 3, short(100)),
      ],
    ),
  }),
  entity({
    id: 'development.land-experts.header',
    pageId: 'development',
    kind: 'object',
    label: 'Land Experts Header',
    schema: developmentLandExpertsHeaderSchema,
    editor: objectEditor('Land experts heading', headingFields),
  }),
  entity({
    id: 'development.land-experts.services',
    pageId: 'development',
    kind: 'list',
    label: 'Land Experts Services',
    schema: developmentLandExpertsServicesSchema,
    listItemSchema: developmentLandServiceSchema,
    editor: listEditor(
      'Land services',
      'Service',
      ['title'],
      {
        id: blank(3),
        icon: 'MapPin',
        title: 'New land service',
        description: 'Describe the service.',
      },
      simpleItemFields,
    ),
  }),
  entity({
    id: 'development.land-experts.stats',
    pageId: 'development',
    kind: 'list',
    label: 'Land Experts Stats',
    schema: developmentLandExpertsStatsSchema,
    listItemSchema: developmentTrustStatSchema,
    editor: listEditor(
      'Trust statistics',
      'Statistic',
      ['label'],
      { id: blank(4), icon: 'TrendingUp', value: '0+', label: 'New statistic' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['icon'], 'Icon', 1, iconPicker()),
        field(['value'], 'Value', 2, short(40)),
        field(['label'], 'Label', 3, short(100)),
      ],
    ),
  }),
  entity({
    id: 'development.services.header',
    pageId: 'development',
    kind: 'object',
    label: 'Services Header',
    schema: developmentServicesHeaderSchema,
    editor: objectEditor('Development services heading', [
      ...headingFields,
      field(['projectsHeading'], 'Projects heading', 3, short(160)),
      field(['featuredHeading'], 'Featured projects heading', 4, short(160)),
    ]),
  }),
  entity({
    id: 'development.services.items',
    pageId: 'development',
    kind: 'list',
    label: 'Services Items',
    schema: developmentServicesItemsSchema,
    listItemSchema: developmentServiceSchema,
    editor: listEditor(
      'Development services',
      'Service',
      ['title'],
      {
        id: blank(5),
        icon: 'Building2',
        title: 'New development service',
        description: 'Describe the service.',
      },
      simpleItemFields,
    ),
  }),
  entity({
    id: 'development.projects.categories',
    pageId: 'development',
    kind: 'list',
    label: 'Project Categories',
    schema: developmentProjectsCategoriesSchema,
    listItemSchema: developmentProjectCategorySchema,
    editor: listEditor(
      'Project categories',
      'Category',
      ['title'],
      {
        id: blank(6),
        icon: 'Building2',
        title: 'New category',
        count: '0 projects',
        description: 'Describe these projects.',
        buttonLabel: 'View projects',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['icon'], 'Icon', 1, iconPicker()),
        field(['title'], 'Title', 2, short(120)),
        field(['count'], 'Project count', 3, short(80)),
        field(['description'], 'Description', 4, long(4, 1_000)),
        field(['buttonLabel'], 'Button label', 5, short(80)),
      ],
    ),
  }),
  entity({
    id: 'development.projects.featured',
    pageId: 'development',
    kind: 'list',
    label: 'Featured Projects',
    schema: developmentProjectsFeaturedSchema,
    listItemSchema: developmentFeaturedProjectSchema,
    editor: listEditor(
      'Featured projects',
      'Project',
      ['title'],
      {
        id: blank(7),
        image: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        imageAltText: 'Development project',
        type: 'Development',
        title: 'New project',
        location: 'Utah',
      },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['image'], 'Photo', 1, media('imageAltText')),
        field(['imageAltText'], 'Photo description', 2, short(200)),
        field(['type'], 'Project type', 3, short(120)),
        field(['title'], 'Project name', 4, short(160)),
        field(['location'], 'Location', 5, short(120)),
      ],
    ),
  }),
  entity({
    id: 'development.partners.header',
    pageId: 'development',
    kind: 'object',
    label: 'Partners Header',
    schema: developmentPartnersHeaderSchema,
    editor: objectEditor('Partners heading', headingFields),
  }),
  entity({
    id: 'development.partners.items',
    pageId: 'development',
    kind: 'list',
    label: 'Partners Items',
    schema: developmentPartnersItemsSchema,
    listItemSchema: developmentPartnerSchema,
    editor: listEditor('Partners', 'Partner', ['name'], { id: blank(8), name: 'New partner' }, [
      field(['id'], 'Item identity', 0, system()),
      field(['name'], 'Partner name', 1, short(160)),
    ]),
  }),
  entity({
    id: 'development.partners.footer',
    pageId: 'development',
    kind: 'object',
    label: 'Partners Footer',
    schema: developmentPartnersFooterSchema,
    editor: objectEditor('Partner invitation', [
      field(['message'], 'Message', 0, short(300)),
      field(['actionLabel'], 'Link label', 1, short(80)),
    ]),
  }),
  entity({
    id: 'development.team.header',
    pageId: 'development',
    kind: 'object',
    label: 'Team Header',
    schema: developmentTeamHeaderSchema,
    editor: objectEditor('Team heading', headingFields),
  }),
  entity({
    id: 'development.team.members',
    pageId: 'development',
    kind: 'list',
    label: 'Team Members',
    schema: developmentTeamMembersSchema,
    listItemSchema: developmentTeamMemberSchema,
    editor: listEditor(
      'Team members',
      'Team member',
      ['name'],
      {
        id: blank(9),
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
    id: 'development.about',
    pageId: 'development',
    kind: 'object',
    label: 'About',
    schema: developmentAboutSchema,
    editor: objectEditor('About Development', [
      field(['eyebrow'], 'Introductory label', 0, short(120)),
      field(['heading'], 'Heading', 1, short(200)),
      field(['introduction'], 'Introduction', 2, long(6, 2_000)),
      field(['detail'], 'Details', 3, long(6, 2_000)),
    ]),
  }),
  entity({
    id: 'development.about.highlights',
    pageId: 'development',
    kind: 'list',
    label: 'About Highlights',
    schema: developmentAboutHighlightsSchema,
    listItemSchema: developmentAboutHighlightSchema,
    editor: listEditor(
      'About highlights',
      'Highlight',
      ['value'],
      { id: blank(10), value: 'New highlight' },
      [field(['id'], 'Item identity', 0, system()), field(['value'], 'Highlight', 1, short(300))],
    ),
  }),
  entity({
    id: 'development.about.values',
    pageId: 'development',
    kind: 'list',
    label: 'About Values',
    schema: developmentAboutValuesSchema,
    listItemSchema: developmentAboutValueSchema,
    editor: listEditor(
      'Company values',
      'Value',
      ['title'],
      { id: blank(11), icon: 'Target', title: 'New value', description: 'Describe this value.' },
      simpleItemFields,
    ),
  }),
  entity({
    id: 'development.reviews.header',
    pageId: 'development',
    kind: 'object',
    label: 'Reviews Header',
    schema: developmentReviewsHeaderSchema,
    editor: objectEditor('Reviews heading', [
      ...headingFields,
      field(['unavailableLinkLabel'], 'Unavailable link message', 3, short(160)),
      field(['actionLabel'], 'Review link label', 4, short(80)),
    ]),
  }),
  entity({
    id: 'development.reviews.platforms',
    pageId: 'development',
    kind: 'list',
    label: 'Review Platforms',
    schema: developmentReviewsPlatformsSchema,
    listItemSchema: developmentReviewPlatformSchema,
    editor: listEditor(
      'Review sites',
      'Review site',
      ['name'],
      {
        id: blank(12),
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
    id: 'development.reviews.footer',
    pageId: 'development',
    kind: 'object',
    label: 'Reviews Footer',
    schema: developmentReviewsFooterSchema,
    editor: objectEditor('Private feedback', [
      field(['message'], 'Message', 0, short(300)),
      field(['email'], 'Email', 1, { type: 'email' }),
    ]),
  }),
  entity({
    id: 'development.contact.header',
    pageId: 'development',
    kind: 'object',
    label: 'Contact Header',
    schema: developmentContactHeaderSchema,
    editor: objectEditor('Contact heading', headingFields),
  }),
  entity({
    id: 'development.contact.details',
    pageId: 'development',
    kind: 'object',
    label: 'Contact Details',
    schema: developmentContactDetailsSchema,
    editor: objectEditor('Contact details', [
      field(['locationLabel'], 'Location label', 0, short(80)),
      field(['address'], 'Office location', 1, long(3, 300)),
      field(['phoneLabel'], 'Phone label', 2, short(80)),
      field(['phone'], 'Phone', 3, { type: 'phone', country: 'US' }),
      field(['faxLabel'], 'Fax label', 4, short(80)),
      field(['fax'], 'Fax', 5, { type: 'phone', country: 'US' }),
      field(['emailLabel'], 'Email label', 6, short(80)),
      field(['email'], 'Email', 7, { type: 'email' }),
      field(['officeHoursLabel'], 'Office hours label', 8, short(80)),
      field(['officeHours'], 'Office hours', 9, long(3, 200)),
    ]),
  }),
  entity({
    id: 'development.footer.brand',
    pageId: 'development',
    kind: 'object',
    label: 'Footer Brand',
    schema: developmentFooterBrandSchema,
    editor: objectEditor('Footer contact', [
      field(['logo'], 'Logo', 0, media('logoAltText')),
      field(['logoAltText'], 'Logo description', 1, short(160)),
      field(['divisionLabel'], 'Division name', 2, short(80)),
      field(['description'], 'Description', 3, long(4, 1_000)),
      field(['address'], 'Address', 4, long(3, 300)),
      field(['phone'], 'Phone', 5, { type: 'phone', country: 'US' }),
      field(['email'], 'Email', 6, { type: 'email' }),
      field(['linksHeading'], 'Links heading', 7, short(100)),
      field(['serviceAreasHeading'], 'Service areas heading', 8, short(100)),
    ]),
  }),
  entity({
    id: 'development.footer.links',
    pageId: 'development',
    kind: 'list',
    label: 'Footer Links',
    schema: developmentFooterLinksSchema,
    listItemSchema: developmentFooterLinkSchema,
    editor: listEditor(
      'Footer links',
      'Footer link',
      ['label'],
      { id: blank(13), label: 'New link', destination: 'services' },
      [
        field(['id'], 'Item identity', 0, system()),
        field(['label'], 'Label', 1, short(100)),
        field(['destination'], 'Page section', 2, destinationPicker()),
      ],
    ),
  }),
  entity({
    id: 'development.footer.service-areas',
    pageId: 'development',
    kind: 'list',
    label: 'Footer Service Areas',
    schema: developmentFooterServiceAreasSchema,
    listItemSchema: developmentServiceAreaSchema,
    editor: listEditor(
      'Service areas',
      'Service area',
      ['label'],
      { id: blank(14), label: 'New service area' },
      [field(['id'], 'Item identity', 0, system()), field(['label'], 'Area', 1, short(100))],
    ),
  }),
  entity({
    id: 'development.footer.legal',
    pageId: 'development',
    kind: 'object',
    label: 'Footer Legal',
    schema: developmentFooterLegalSchema,
    editor: objectEditor('Footer legal text', [
      field(['organizationName'], 'Organization name', 0, short(160)),
      field(['rightsNotice'], 'Rights notice', 1, short(200)),
    ]),
  }),
] as const satisfies readonly SemanticEntityDefinition[];

const view = (entityId: string, component: string, list = false): EntityViewCatalogEntry => ({
  entityId,
  pageId: 'development',
  legacyComponent: component,
  primary: { slotId: `${entityId}.primary`, routes: ['/development'] },
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
export const developmentEntityViewCatalog = [
  view('development.anniversary-banner', 'DevelopmentHeader banner'),
  view('development.header', 'DevelopmentHeader'),
  view('development.hero', 'DevelopmentHero'),
  view('development.hero.stats', 'DevelopmentHero statistics', true),
  view('development.land-experts.header', 'LandExperts heading'),
  view('development.land-experts.services', 'LandExperts services', true),
  view('development.land-experts.stats', 'LandExperts trust bar', true),
  view('development.services.header', 'DevelopmentServices heading'),
  view('development.services.items', 'DevelopmentServices cards', true),
  view('development.projects.categories', 'DevelopmentProjects categories', true),
  view('development.projects.featured', 'DevelopmentProjects featured', true),
  view('development.partners.header', 'DevelopmentPartners heading'),
  view('development.partners.items', 'DevelopmentPartners items', true),
  view('development.partners.footer', 'DevelopmentPartners footer'),
  view('development.team.header', 'DevelopmentTeam heading'),
  view('development.team.members', 'DevelopmentTeam members', true),
  view('development.about', 'DevelopmentAbout'),
  view('development.about.highlights', 'DevelopmentAbout highlights', true),
  view('development.about.values', 'DevelopmentAbout values', true),
  view('development.reviews.header', 'LeaveUsAReview heading'),
  view('development.reviews.platforms', 'LeaveUsAReview platforms', true),
  view('development.reviews.footer', 'LeaveUsAReview footer'),
  view('development.contact.header', 'DevelopmentContact heading'),
  view('development.contact.details', 'DevelopmentContact details'),
  view('development.footer.brand', 'DevelopmentFooter brand'),
  view('development.footer.links', 'DevelopmentFooter links', true),
  view('development.footer.service-areas', 'DevelopmentFooter service areas', true),
  view('development.footer.legal', 'DevelopmentFooter legal'),
] as const satisfies readonly EntityViewCatalogEntry[];

export const developmentEntityModule = defineEntityModule({
  pageId: 'development',
  entities: developmentEntityDefinitions,
  viewCatalog: developmentEntityViewCatalog,
});

import { createContext, useContext, useEffect, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Handshake,
  Home,
  ImageIcon,
  Mail,
  MapPin,
  Menu,
  Phone,
  Quote,
  Ruler,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as S from '@app/schemas';
import {
  editableValueSchema,
  realEstateEntityDefinitions,
  realEstateV2SeedData,
  type PageContent,
  type SemanticEntityDefinition,
} from '@app/schemas';

import benPhoto from '../assets/images/ben-beesley.jpg';
import boxwood109Entry from '../assets/images/boxwood-109-entry.jpg';
import boxwood109ExteriorOne from '../assets/images/boxwood-109-exterior-1.jpg';
import boxwood109ExteriorTwo from '../assets/images/boxwood-109-exterior-2.jpg';
import boxwood109KitchenOne from '../assets/images/boxwood-109-kitchen-1.jpg';
import boxwood109KitchenTwo from '../assets/images/boxwood-109-kitchen-2.jpg';
import boxwood109KitchenThree from '../assets/images/boxwood-109-kitchen-3.jpg';
import boxwood109LivingOne from '../assets/images/boxwood-109-living-1.jpg';
import boxwood109LivingTwo from '../assets/images/boxwood-109-living-2.jpg';
import boxwood109LivingThree from '../assets/images/boxwood-109-living-3.jpg';
import boxwood109LivingFour from '../assets/images/boxwood-109-living-4.jpg';
import boxwoodBasement from '../assets/images/boxwood-dr-basement.jpg';
import boxwoodBathroom from '../assets/images/boxwood-dr-bathroom.jpg';
import boxwoodPhoto from '../assets/images/boxwood-dr-exterior.jpg';
import boxwoodKitchen from '../assets/images/boxwood-dr-kitchen.jpg';
import boxwoodLiving from '../assets/images/boxwood-dr-living.jpg';
import boxwoodTheater from '../assets/images/boxwood-dr-theater.jpg';
import brookePhoto from '../assets/images/brooke-moore.jpeg';
import miaPhoto from '../assets/images/mia-barlow-re.png';
import michaelPhoto from '../assets/images/michael-thornton.jpg';
import placeholderPhoto from '../assets/images/placeholder-neutral.svg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import commercialOnePhoto from '../assets/images/real-estate-property-1.jpeg';
import commercialTwoPhoto from '../assets/images/real-estate-property-2.jpeg';
import realEstateLogo from '../assets/images/trico-real-estate-logo.png';
import stevePhoto from '../assets/images/steve-tripp.png';
import tricoLogo from '../assets/images/trico-logo.png';
import whisper105Photo from '../assets/images/whisper-hollow-lot-105.jpg';
import whisper119Photo from '../assets/images/whisper-hollow-lot-119.jpg';
import whisperBoxwoodPhoto from '../assets/images/whisper-hollow-lot-boxwood.jpg';
import { EditableBoundary, type EditorOwnership } from '../components/EditableBoundary.js';
import { EditableCollection } from '../components/EditableCollection.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { ProfileCard } from '../components/ProfileCard.js';
import { ReviewPlatformCard, ReviewRating } from '../components/ReviewPlatformCard.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { RealEstateContactForm, RealEstateNewClientForm } from './RealEstateForms.js';
import { mergeFilteredRealEstateCollection, parseRealEstateValue } from './realEstateContent.js';

const iconByName: Readonly<Record<string, LucideIcon>> = {
  ...contentIconComponents,
  TrendingUp,
  MapPin,
  Handshake,
  FileText,
  ShoppingBag,
  Home,
  Building2,
};
const imageByKey: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/steve-tripp.png': stevePhoto,
  'media/seed/randy-rimmer.png': randyPhoto,
  'media/seed/brooke-moore.jpeg': brookePhoto,
  'media/seed/mia-barlow-re.png': miaPhoto,
  'media/seed/michael-thornton.jpg': michaelPhoto,
  'media/seed/ben-beesley.jpg': benPhoto,
  'media/seed/placeholder-neutral.svg': placeholderPhoto,
  'media/seed/whisper-hollow-lot-119.jpg': whisper119Photo,
  'media/seed/whisper-hollow-lot-boxwood.jpg': whisperBoxwoodPhoto,
  'media/seed/whisper-hollow-lot-105.jpg': whisper105Photo,
  'media/seed/boxwood-dr-exterior.jpg': boxwoodPhoto,
  'media/seed/boxwood-dr-kitchen.jpg': boxwoodKitchen,
  'media/seed/boxwood-dr-living.jpg': boxwoodLiving,
  'media/seed/boxwood-dr-bathroom.jpg': boxwoodBathroom,
  'media/seed/boxwood-dr-theater.jpg': boxwoodTheater,
  'media/seed/boxwood-dr-basement.jpg': boxwoodBasement,
  'media/seed/boxwood-109-exterior-1.jpg': boxwood109ExteriorOne,
  'media/seed/boxwood-109-exterior-2.jpg': boxwood109ExteriorTwo,
  'media/seed/boxwood-109-kitchen-1.jpg': boxwood109KitchenOne,
  'media/seed/boxwood-109-kitchen-2.jpg': boxwood109KitchenTwo,
  'media/seed/boxwood-109-kitchen-3.jpg': boxwood109KitchenThree,
  'media/seed/boxwood-109-living-1.jpg': boxwood109LivingOne,
  'media/seed/boxwood-109-living-2.jpg': boxwood109LivingTwo,
  'media/seed/boxwood-109-living-3.jpg': boxwood109LivingThree,
  'media/seed/boxwood-109-living-4.jpg': boxwood109LivingFour,
  'media/seed/boxwood-109-entry.jpg': boxwood109Entry,
  'media/seed/real-estate-property-1.jpeg': commercialOnePhoto,
  'media/seed/real-estate-property-2.jpeg': commercialTwoPhoto,
};

const imageSource = (key: string, fallback: string): string =>
  imageByKey[key] ??
  (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback);
const profileImageSource = (key: string): string | undefined =>
  key === 'media/seed/placeholder-neutral.svg'
    ? undefined
    : (imageByKey[key] ??
      (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : undefined));
// Generic interaction/navigation words are code-owned; business names and page copy stay in content.
const interfaceCopy = {
  activeStatus: 'Active',
  soldStatus: 'Sold',
  emailAction: 'Email',
  reviewAction: 'Review on',
  footerNavigation: 'Quick Links',
} as const;

/* Visible collection content is supplied by the validated page document. */
/*
const services: readonly { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: FileText,
    title: 'Commercial Real Estate',
    description:
      'Full-service commercial brokerage for office, retail, industrial, and investment properties.',
  },
  {
    icon: ShoppingBag,
    title: 'Land Sales & Acquisitions',
    description:
      'Expert guidance buying and selling land for residential, commercial, and investment opportunities.',
  },
  {
    icon: Handshake,
    title: 'Leasing & Tenant Placement',
    description: 'Market analysis, property showings, tenant screening, and lease negotiation.',
  },
  {
    icon: Home,
    title: 'New Construction Homes',
    description: 'Build in one of our developed subdivisions or custom build on your own lot.',
  },
  {
    icon: Building2,
    title: 'Residential Services',
    description: 'Trusted representation for residential buyers and sellers at every stage.',
  },
];

const processSteps = [
  [
    '01',
    'Discovery & Consultation',
    'We begin by understanding your goals, timeline, and budget to create a customized strategy.',
  ],
  [
    '02',
    'Market Analysis',
    'Our team conducts thorough market research and property evaluations to identify opportunities.',
  ],
  [
    '03',
    'Negotiation & Transaction',
    'We negotiate the best terms and guide you through every step of the transaction process.',
  ],
  [
    '04',
    'Closing & Transfer',
    'We coordinate all closing details, ensuring a smooth transfer of ownership.',
  ],
  [
    '05',
    'Ongoing Support',
    'Our relationship continues with market updates and guidance for your future real estate needs.',
  ],
] as const;

const listings = [
  {
    address: '1457 N Whisper Hollow Cir',
    city: 'Lehi, UT',
    price: '$512,000',
    detail: '0.56 Acres',
    type: 'Land',
    status: 'Active',
    image: whisper119Photo,
    action: 'View on MLS',
  },
  {
    address: '1604 W Box Wood Dr',
    city: 'Lehi, UT',
    price: '$521,000',
    detail: '0.46 Acres',
    type: 'Land',
    status: 'Active',
    image: whisperBoxwoodPhoto,
    action: 'View on MLS',
  },
  {
    address: '1405 N Whisper Hollow Cir',
    city: 'Lehi, UT',
    price: '$559,000',
    detail: '0.83 Acres',
    type: 'Land',
    status: 'Active',
    image: whisper105Photo,
    action: 'View on MLS',
  },
  {
    address: '9853 S 700 E',
    city: 'Sandy, UT',
    price: 'Contact for details',
    detail: 'Commercial property',
    type: 'Commercial',
    status: 'Active',
    image: commercialOnePhoto,
    action: 'View on LoopNet',
  },
  {
    address: '2560 E 3300 S',
    city: 'Salt Lake City, UT',
    price: 'Contact for details',
    detail: 'Commercial property',
    type: 'Commercial',
    status: 'Active',
    image: commercialTwoPhoto,
    action: 'View on LoopNet',
  },
  {
    address: 'LOT 110 — Boxwood Dr',
    city: 'Lehi, UT',
    price: 'Whisper Hollow Estates',
    detail: 'New Construction',
    type: 'Residential',
    status: 'Sold',
    image: boxwoodPhoto,
  },
  {
    address: '2200 State St',
    city: 'South Jordan, UT',
    price: '$3,250,000',
    detail: '22,000 sqft',
    type: 'Commercial Office',
    status: 'Sold',
    image: commercialOnePhoto,
  },
  {
    address: 'Lot 5–8, Cedar Hills',
    city: 'Cedar Hills, UT',
    price: '$1,650,000',
    detail: '12 Acres',
    type: 'Land',
    status: 'Sold',
    image: whisper105Photo,
  },
  {
    address: 'LOT 109 — Boxwood Dr',
    city: 'Lehi, UT',
    price: 'Whisper Hollow Estates',
    detail: 'New Construction',
    type: 'Residential',
    status: 'Sold',
    image: whisperBoxwoodPhoto,
  },
  {
    address: '750 Technology Way',
    city: 'Orem, UT',
    price: '$4,350,000',
    detail: '30,000 sqft',
    type: 'Industrial',
    status: 'Sold',
    image: commercialTwoPhoto,
  },
] as const;

const leaders = [
  { name: 'Stephen Tripp', role: 'Managing Broker', image: stevePhoto },
  { name: 'Randy Rimmer', role: 'Vice President', image: randyPhoto },
  { name: 'Brooke Moore', role: 'Director of Real Estate', image: brookePhoto },
] as const;
const staff = [{ name: 'Mia Barlow', role: 'Transaction Coordinator', image: miaPhoto }] as const;
const agents = [
  { name: 'Michael Thornton', role: 'Licensed Real Estate Agent', image: michaelPhoto },
  { name: 'Ben Beesley', role: 'Licensed Real Estate Agent', image: benPhoto },
  { name: 'Shauna Ayers', role: 'Licensed Real Estate Agent', image: placeholderPhoto },
  { name: 'Robert Ayers', role: 'Licensed Real Estate Agent', image: placeholderPhoto },
  { name: 'Stacie Papanikolas', role: 'Licensed Real Estate Agent', image: placeholderPhoto },
] as const;
*/

type RealEstateEntityId = keyof typeof realEstateV2SeedData;
const DocumentContext = createContext<PageContent>({});
function definition(id: RealEstateEntityId): SemanticEntityDefinition {
  const found = realEstateEntityDefinitions.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Real Estate editor definition missing for ${id}`);
  return found;
}
function ownership(
  id: RealEstateEntityId,
  editing: ReturnType<typeof useEditMode>,
): EditorOwnership {
  const pending = editing.pending.find((change) => change.entityId === id);
  return pending === undefined
    ? 'available'
    : pending.authorId === editing.currentUserId
      ? 'mine'
      : 'other';
}
function Boundary({
  id,
  children,
}: {
  readonly id: RealEstateEntityId;
  readonly children: React.ReactNode | ((value: S.EditableValue) => React.ReactNode);
}): React.JSX.Element {
  const editing = useEditMode();
  const document = useContext(DocumentContext);
  const currentDefinition = definition(id);
  const value = parseRealEstateValue(document, id, currentDefinition.schema);
  return (
    <div
      className={`re-entity-slot ui-entity-slot${id === 'real-estate.hero' ? ' re-hero-entity-slot ui-hero-entity-slot' : ''}`}
      data-real-estate-entity-boundary="true"
    >
      <EditableBoundary
        active={editing.active}
        definition={currentDefinition}
        value={editableValueSchema.parse(value)}
        ownership={ownership(id, editing)}
        busy={editing.busy}
        onSave={(next) => editing.save(id, next)}
        onReloadLatest={() => editing.reload(id)}
      >
        {typeof children === 'function' ? children(editableValueSchema.parse(value)) : children}
      </EditableBoundary>
    </div>
  );
}

function CollectionBoundary({
  id,
  className,
  renderItem,
  filterItem,
  blankItemPatch,
  semanticList = false,
}: {
  readonly id: RealEstateEntityId;
  readonly className: string;
  readonly renderItem: (item: S.EditableValue, index: number) => React.ReactNode;
  readonly filterItem?: (item: S.EditableValue) => boolean;
  readonly blankItemPatch?: Readonly<Record<string, S.EditableValue>>;
  readonly semanticList?: boolean;
}): React.JSX.Element {
  const editing = useEditMode();
  const document = useContext(DocumentContext);
  const currentDefinition = definition(id);
  const parsed = parseRealEstateValue(document, id, currentDefinition.schema);
  const value = S.editableListSchema.parse(parsed);
  if (currentDefinition.editor.kind !== 'list')
    throw new Error(`Real Estate collection definition is not a list: ${id}`);
  const displayedValue = filterItem === undefined ? value : value.filter(filterItem);
  const effectiveDefinition =
    blankItemPatch === undefined
      ? currentDefinition
      : {
          ...currentDefinition,
          editor: {
            ...currentDefinition.editor,
            blankItem: {
              ...(currentDefinition.editor.blankItem as Readonly<Record<string, S.EditableValue>>),
              ...blankItemPatch,
            },
          },
        };
  const mergeDisplayedItems = (next: readonly S.EditableValue[]): readonly S.EditableValue[] => {
    if (filterItem === undefined) return next;
    return mergeFilteredRealEstateCollection(value, next, filterItem);
  };
  return (
    <div
      className={`re-collection-slot ui-collection-slot ${className}`}
      data-real-estate-entity-boundary="true"
      role={semanticList ? 'list' : undefined}
    >
      {displayedValue.length === 0 ? (
        <div className="re-empty-state ui-empty-state">
          <h3 className="type-card-title">No {currentDefinition.label.toLowerCase()} yet</h3>
          <p>
            Add the first {currentDefinition.editor.itemLabel.toLowerCase()} when you are ready.
          </p>
        </div>
      ) : null}
      <EditableCollection
        active={editing.active}
        layout="fill"
        definition={effectiveDefinition}
        value={displayedValue}
        renderItem={renderItem}
        ownership={ownership(id, editing)}
        busy={editing.busy}
        onSave={(next) => editing.save(id, mergeDisplayedItems(next))}
        onReloadLatest={async () => {
          const latest = S.editableListSchema.parse(await editing.reload(id));
          return filterItem === undefined ? latest : latest.filter(filterItem);
        }}
      />
    </div>
  );
}

function PersonCard({ item }: { readonly item: S.EditableValue }): React.JSX.Element {
  const person = S.realEstateTeamMemberSchema.parse(item);
  return (
    <ProfileCard
      description={person.bio}
      email={person.email}
      emailLabel={interfaceCopy.emailAction}
      imageAltText={person.imageAltText}
      imageSource={profileImageSource(person.image.key)}
      name={person.name}
      phone={person.phone}
      role={person.role}
    />
  );
}
function SemanticHeading({
  item,
  titleClassName = '',
}: {
  readonly item: S.EditableValue;
  readonly titleClassName?: string;
}): React.JSX.Element {
  const heading = S.realEstateServicesHeaderSchema.parse(item);
  return (
    <header className="re-section-heading ui-section-heading ui-heading-measure-standard">
      <span className="re-pill ui-pill ui-section-eyebrow">{heading.eyebrow}</span>
      <h2 className={`type-section-title ${titleClassName}`}>{heading.heading}</h2>
      <p>{heading.description}</p>
    </header>
  );
}

function RealEstateBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<PageContent>({});
  const [fallback, setFallback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [listingTab, setListingTab] = useState<'active' | 'sold'>('active');
  const listingItems = parseRealEstateValue(
    document,
    'real-estate.listings.items',
    S.realEstateListingsItemsSchema,
  );
  const listingActions = parseRealEstateValue(
    document,
    'real-estate.listings.actions',
    S.realEstateListingsActionsSchema,
  );
  const activeListingCount = listingItems.filter(({ status }) => status === 'active').length;
  const soldListingCount = listingItems.filter(({ status }) => status === 'sold').length;
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('real-estate', { signal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted) {
          setDocument(next);
          setFallback(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDocument({});
          setFallback(true);
        }
      });
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending]);
  return (
    <DocumentContext.Provider value={document}>
      <div className="re-page ui-page">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Boundary id="real-estate.anniversary-banner">
          {(item) => {
            const banner = S.realEstateAnniversaryBannerSchema.parse(item);
            return (
              <div className="re-anniversary ui-anniversary">
                <Sparkles aria-hidden="true" /> {banner.message} <Sparkles aria-hidden="true" />
              </div>
            );
          }}
        </Boundary>
        <Boundary id="real-estate.header">
          {(item) => {
            const header = S.realEstateHeaderSchema.parse(item);
            return (
              <header className="re-header ui-header">
                <div className="re-container ui-container re-header-inner ui-header-inner">
                  <Link to="/" className="re-brand ui-brand">
                    <img src={imageSource(header.logo.key, tricoLogo)} alt={header.logoAltText} />
                    <strong>{header.divisionLabel}</strong>
                  </Link>
                  <nav>
                    {header.navLinks.map((link) => (
                      <a href={`#${link.destination}`} key={link.id}>
                        {link.label}
                      </a>
                    ))}
                  </nav>
                  <div className="re-header-actions ui-header-actions">
                    <a href={`tel:${header.phone.replace(/[^\d+]/g, '')}`}>
                      <Phone aria-hidden="true" /> {header.phone}
                    </a>
                    <a
                      href="#contact"
                      className="re-button ui-button re-button-primary ui-button-primary"
                    >
                      {header.actionLabel}
                    </a>
                  </div>
                  <button
                    className="re-menu-button ui-menu-button"
                    aria-expanded={menuOpen}
                    aria-label="Toggle menu"
                    onClick={() => setMenuOpen((value) => !value)}
                  >
                    {menuOpen ? <X /> : <Menu />}
                  </button>
                </div>
                {menuOpen ? (
                  <nav className="re-mobile-menu ui-mobile-menu">
                    {header.navLinks.map((link) => (
                      <a
                        href={`#${link.destination}`}
                        onClick={() => setMenuOpen(false)}
                        key={link.id}
                      >
                        {link.label}
                      </a>
                    ))}
                  </nav>
                ) : null}
              </header>
            );
          }}
        </Boundary>
        {fallback ? (
          <div className="content-notice" role="status">
            Showing the checked-in site content while published content is unavailable.
          </div>
        ) : null}
        <main id="main-content">
          <Boundary id="real-estate.hero">
            {(item) => {
              const hero = S.realEstateHeroSchema.parse(item);
              return (
                <section className="re-hero ui-hero ui-split-hero">
                  <div className="re-container ui-container re-hero-grid ui-hero-grid">
                    <div className="re-hero-copy ui-hero-copy">
                      <span className="re-pill ui-pill re-pill-gold ui-pill-gold">
                        <MapPin aria-hidden="true" /> {hero.badge}
                      </span>
                      <h1 className="type-display">{hero.heading}</h1>
                      <p>{hero.description}</p>
                      <div className="re-actions ui-actions">
                        <a
                          className="re-button ui-button re-button-light ui-button-light"
                          href="#contact"
                        >
                          {hero.primaryActionLabel} <ArrowRight />
                        </a>
                        <a
                          className="re-button ui-button re-button-outline ui-button-outline"
                          href="#services"
                        >
                          {hero.secondaryActionLabel}
                        </a>
                      </div>
                      <CollectionBoundary
                        className="re-hero-stats ui-hero-stats"
                        id="real-estate.hero.stats"
                        renderItem={(item) => {
                          const stat = S.realEstateHeroStatSchema.parse(item);
                          const Icon = iconByName[stat.icon] ?? TrendingUp;
                          return (
                            <div>
                              <Icon />
                              <strong>{stat.value}</strong>
                              <span>{stat.label}</span>
                            </div>
                          );
                        }}
                      />
                    </div>
                    <div
                      className="re-hero-visual ui-hero-visual division-hero-media"
                      data-division-hero-media="true"
                      data-media-state="unavailable"
                    >
                      <div
                        className="division-hero-media-placeholder"
                        role="img"
                        aria-label={hero.heading}
                      >
                        <ImageIcon aria-hidden="true" />
                        <span>Photo coming soon</span>
                      </div>
                    </div>
                  </div>
                </section>
              );
            }}
          </Boundary>

          <section id="listings" className="re-section ui-section">
            <div className="re-container ui-container">
              <Boundary id="real-estate.listings.header">
                {(item) => (
                  <SemanticHeading item={item} titleClassName="type-section-title-large" />
                )}
              </Boundary>
              <div className="re-listings-gallery ui-listings-gallery">
                <Boundary id="real-estate.listings.actions">
                  {(item) => {
                    const actions = S.realEstateListingsActionsSchema.parse(item);
                    return (
                      <div
                        className="re-tabs ui-tabs"
                        role="tablist"
                        aria-label="Property listing status"
                      >
                        <button
                          role="tab"
                          aria-selected={listingTab === 'active'}
                          onClick={() => setListingTab('active')}
                        >
                          {actions.activeLabel} <span>({activeListingCount})</span>
                        </button>
                        <button
                          role="tab"
                          aria-selected={listingTab === 'sold'}
                          onClick={() => setListingTab('sold')}
                        >
                          {actions.soldLabel} <span>({soldListingCount})</span>
                        </button>
                      </div>
                    );
                  }}
                </Boundary>
                <CollectionBoundary
                  className="re-listing-grid ui-listing-grid"
                  id="real-estate.listings.items"
                  filterItem={(item) => S.realEstateListingSchema.parse(item).status === listingTab}
                  blankItemPatch={{ status: listingTab }}
                  renderItem={(item) => {
                    const listing = S.realEstateListingSchema.parse(item);
                    return (
                      <article className="re-listing ui-listing" key={listing.address}>
                        <div className="re-listing-photo ui-listing-photo">
                          <img
                            src={imageSource(listing.image.key, placeholderPhoto)}
                            alt={listing.imageAltText}
                          />
                          <span
                            className={`re-badge ui-badge ${listing.status === 'sold' ? 'sold' : ''}`}
                          >
                            {listing.status === 'sold'
                              ? interfaceCopy.soldStatus
                              : interfaceCopy.activeStatus}
                          </span>
                          <span className="re-badge ui-badge re-type ui-type">{listing.type}</span>
                        </div>
                        <div className="re-listing-body ui-listing-body">
                          <strong className="re-price ui-price">{listing.price}</strong>
                          <p>
                            <MapPin /> {listing.address}, {listing.city}
                          </p>
                          <span>
                            <Ruler /> {listing.detail}
                          </span>
                          <div className="re-listing-foot ui-listing-foot">
                            <img src={realEstateLogo} alt="TriCo Real Estate" />
                            {listing.actionLabel && listing.externalUrl ? (
                              <a
                                className="re-listing-action"
                                href={listing.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {listing.actionLabel} <ExternalLink />
                              </a>
                            ) : null}
                          </div>
                          {listing.gallery.length > 0 ? (
                            <div
                              className="re-listing-gallery ui-listing-gallery"
                              aria-label={`${listing.address} gallery`}
                            >
                              {listing.gallery.map((photo) => (
                                <img
                                  key={photo.id}
                                  src={imageSource(photo.image.key, placeholderPhoto)}
                                  alt={photo.imageAltText}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  }}
                />
                <div
                  className="re-listing-directories ui-listing-directories"
                  role="group"
                  aria-label="Listing directories"
                >
                  {listingActions.directoryLinks.map((link) => (
                    <a
                      className="ui-button ui-button-outline-dark ui-directory-action"
                      href={link.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      key={link.id}
                    >
                      {link.label} <ExternalLink aria-hidden="true" />
                    </a>
                  ))}
                </div>
                <div className="re-listing-contact ui-listing-contact text-center">
                  <a className="ui-listing-contact-action" href="#contact">
                    {listingActions.contactActionLabel}
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section id="services" className="re-section ui-section re-tint ui-tint">
            <div className="re-container ui-container">
              <Boundary id="real-estate.services.header">
                {(item) => (
                  <SemanticHeading item={item} titleClassName="type-section-title-large" />
                )}
              </Boundary>
              <CollectionBoundary
                className="re-service-grid ui-service-grid ui-content-frame-standard"
                id="real-estate.services.items"
                renderItem={(item) => {
                  const service = S.realEstateServiceSchema.parse(item);
                  const Icon = iconByName[service.icon] ?? Building2;
                  return (
                    <article className="re-card ui-card" key={service.title}>
                      <Icon />
                      <h3 className="type-card-title">{service.title}</h3>
                      <p>{service.description}</p>
                    </article>
                  );
                }}
              />
            </div>
          </section>

          <section id="process" className="re-section ui-section">
            <div className="re-container ui-container re-process-container ui-process-container">
              <Boundary id="real-estate.process.header">
                {(item) => <SemanticHeading item={item} />}
              </Boundary>
              <CollectionBoundary
                className="re-process ui-process"
                id="real-estate.process.steps"
                renderItem={(item, index) => {
                  const step = S.realEstateProcessStepSchema.parse(item);
                  return (
                    <article className={index % 2 === 0 ? '' : 'reverse'} key={step.number}>
                      <div>
                        <span>{step.number}</span>
                        <h3 className="type-card-title">{step.title}</h3>
                        <p>{step.description}</p>
                      </div>
                    </article>
                  );
                }}
              />
            </div>
          </section>

          <Boundary id="real-estate.about">
            {(item) => {
              const about = S.realEstateAboutSchema.parse(item);
              return (
                <section id="about" className="re-section ui-section re-dark ui-dark">
                  <div className="re-container ui-container re-about-grid ui-about-grid ui-content-frame-standard">
                    <div className="re-about-visual ui-about-visual">
                      <strong>{about.brandLabel}</strong>
                      <span>{about.eyebrow}</span>
                      <b>
                        {about.statValue}
                        <small>{about.statLabel}</small>
                      </b>
                    </div>
                    <div>
                      <>
                        <span className="re-pill ui-pill re-pill-gold ui-pill-gold">
                          {about.eyebrow}
                        </span>
                        <h2 className="type-section-title">{about.heading}</h2>
                        <p>{about.introduction}</p>
                        <p>{about.detail}</p>
                        <a
                          className="re-button ui-button re-button-light ui-button-light"
                          href="#contact"
                        >
                          {about.actionLabel}
                        </a>
                      </>
                      <CollectionBoundary
                        className="re-check-grid ui-check-grid"
                        id="real-estate.about.features"
                        semanticList
                        renderItem={(featureItem) => {
                          const feature = S.realEstateAboutFeatureSchema.parse(featureItem);
                          return (
                            <div role="listitem">
                              <CheckCircle2 /> {feature.label}
                            </div>
                          );
                        }}
                      />
                    </div>
                  </div>
                </section>
              );
            }}
          </Boundary>

          <Boundary id="real-estate.team.header">
            {(item) => {
              const heading = S.realEstateTeamHeaderSchema.parse(item);
              return (
                <section id="team" className="re-section ui-section re-tint ui-tint">
                  <div className="re-container ui-container">
                    <header className="re-section-heading ui-section-heading ui-heading-measure-standard">
                      <span className="re-pill ui-pill ui-section-eyebrow">{heading.eyebrow}</span>
                      <h2 className="type-section-title type-section-title-large">
                        {heading.heading}
                      </h2>
                      <p>{heading.description}</p>
                    </header>
                    <h3 className="re-group-title ui-group-title">{heading.leadershipLabel}</h3>
                    <CollectionBoundary
                      className="re-person-grid ui-person-grid ui-profile-grid-expanded"
                      id="real-estate.team.leadership"
                      renderItem={(personItem) => <PersonCard item={personItem} />}
                    />
                    <h3 className="re-group-title ui-group-title">{heading.staffLabel}</h3>
                    <CollectionBoundary
                      className="re-person-grid ui-person-grid ui-profile-grid-expanded"
                      id="real-estate.team.staff"
                      renderItem={(personItem) => <PersonCard item={personItem} />}
                    />
                    <h3 className="re-group-title ui-group-title">{heading.agentsLabel}</h3>
                    <CollectionBoundary
                      className="re-person-grid re-agent-grid ui-person-grid ui-profile-grid-expanded"
                      id="real-estate.team.agents"
                      renderItem={(personItem) => <PersonCard item={personItem} />}
                    />
                  </div>
                </section>
              );
            }}
          </Boundary>

          <Boundary id="real-estate.careers">
            {(item) => {
              const careers = S.realEstateCareersSchema.parse(item);
              return (
                <section className="re-section ui-section re-careers ui-careers ui-align-start">
                  <div className="re-container ui-container re-careers-grid ui-careers-grid">
                    <div>
                      <span className="re-pill ui-pill re-pill-gold ui-pill-gold">
                        {careers.eyebrow}
                      </span>
                      <h2 className="type-section-title type-section-title-compact">
                        {careers.heading}
                      </h2>
                      <p>{careers.description}</p>
                      <ul>
                        {careers.benefits.map((benefit) => (
                          <li key={benefit.id}>
                            <BriefcaseBusiness /> {benefit.label}
                          </li>
                        ))}
                      </ul>
                      <a
                        className="re-button ui-button re-button-gold ui-button-gold"
                        href={`mailto:${careers.email}`}
                      >
                        {careers.actionLabel} <ArrowRight />
                      </a>
                    </div>
                    <aside>
                      <BriefcaseBusiness />
                      <h3 className="type-card-title">{careers.cardHeading}</h3>
                      <p>{careers.cardDescription}</p>
                      <a href={`mailto:${careers.email}`}>{careers.email}</a>
                    </aside>
                  </div>
                </section>
              );
            }}
          </Boundary>

          <section className="re-section ui-section re-testimonials ui-testimonials">
            <div className="re-container ui-container">
              <Boundary id="real-estate.testimonials.header">
                {(item) => <SemanticHeading item={item} />}
              </Boundary>
              <CollectionBoundary
                className="re-testimonial-grid ui-testimonial-grid ui-content-frame-standard"
                id="real-estate.testimonials.items"
                renderItem={(item) => {
                  const testimonial = S.realEstateTestimonialSchema.parse(item);
                  return (
                    <article className="re-card ui-card">
                      <Quote className="re-quote ui-quote" />{' '}
                      <div className="re-stars ui-stars">
                        {Array.from({ length: testimonial.rating }).map((_, index) => (
                          <Star key={index} />
                        ))}
                      </div>
                      <p>“{testimonial.quote}”</p>
                      <strong>{testimonial.name}</strong>
                      <span>{testimonial.role}</span>
                    </article>
                  );
                }}
              />
            </div>
          </section>

          <section id="faq" className="re-section ui-section">
            <div className="re-container ui-container re-faq-container ui-faq-container">
              <Boundary id="real-estate.faq.header">
                {(item) => <SemanticHeading item={item} />}
              </Boundary>
              <CollectionBoundary
                className="re-faqs ui-faqs"
                id="real-estate.faq.items"
                renderItem={(item) => {
                  const faq = S.realEstateFaqItemSchema.parse(item);
                  return (
                    <details>
                      <summary>
                        {faq.question}
                        <ChevronDown />
                      </summary>
                      <p>{faq.answer}</p>
                    </details>
                  );
                }}
              />
            </div>
          </section>

          <RealEstateNewClientForm />

          <section id="reviews" className="re-section ui-section re-reviews ui-reviews">
            <div className="re-container ui-container">
              <Boundary id="real-estate.reviews.header">
                {(item) => {
                  const heading = S.realEstateReviewsHeaderSchema.parse(item);
                  return (
                    <header className="re-section-heading ui-section-heading ui-heading-measure-standard">
                      <span className="re-pill ui-pill ui-section-eyebrow">{heading.eyebrow}</span>
                      <h2 className="type-section-title">{heading.heading}</h2>
                      <p>{heading.description}</p>
                      <ReviewRating />
                    </header>
                  );
                }}
              </Boundary>
              <CollectionBoundary
                className="re-review-grid ui-review-grid"
                id="real-estate.reviews.platforms"
                renderItem={(item) => {
                  const platform = S.realEstateReviewPlatformSchema.parse(item);
                  return (
                    <ReviewPlatformCard
                      actionLabel={interfaceCopy.reviewAction}
                      description={platform.description}
                      externalUrl={platform.externalUrl}
                      name={platform.name}
                      unavailableLabel="Review link coming soon"
                    />
                  );
                }}
              />
              <Boundary id="real-estate.reviews.footer">
                {(item) => {
                  const footer = S.realEstateReviewsFooterSchema.parse(item);
                  return (
                    <p className="re-review-footer ui-review-footer">
                      {footer.message} Email <a href={`mailto:${footer.email}`}>{footer.email}</a>.
                    </p>
                  );
                }}
              </Boundary>
            </div>
          </section>

          <section
            id="contact"
            className="re-section ui-section re-contact ui-contact ui-align-start"
          >
            <div className="re-container ui-container re-contact-grid ui-contact-grid ui-contact-grid-standard">
              <div>
                <Boundary id="real-estate.contact.header">
                  {(item) => {
                    const heading = S.realEstateContactHeaderSchema.parse(item);
                    return (
                      <>
                        <span className="re-pill ui-pill ui-section-eyebrow">
                          {heading.eyebrow}
                        </span>
                        <h2 className="type-section-title">{heading.heading}</h2>
                        <p>{heading.description}</p>
                      </>
                    );
                  }}
                </Boundary>
                <Boundary id="real-estate.contact.details">
                  {(item) => {
                    const contact = S.realEstateContactDetailsSchema.parse(item);
                    return (
                      <div className="re-contact-list ui-contact-list">
                        <div>
                          <MapPin />
                          <p>
                            <strong>{contact.addressLabel}</strong>
                            {contact.address}
                          </p>
                        </div>
                        <div>
                          <Phone />
                          <p>
                            <strong>{contact.phoneLabel}</strong>
                            {contact.phone}
                            <br />
                            <small>
                              {contact.faxLabel}: {contact.fax}
                            </small>
                          </p>
                        </div>
                        <div>
                          <Mail />
                          <p>
                            <strong>{contact.emailLabel}</strong>
                            {contact.email}
                          </p>
                        </div>
                        <div>
                          <Clock />
                          <p>
                            <strong>{contact.officeHoursLabel}</strong>
                            {contact.officeHours}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                </Boundary>
              </div>
              <RealEstateContactForm />
            </div>
          </section>
        </main>
        <footer className="re-footer ui-footer ui-align-start ui-footer-rhythm">
          <div className="re-container ui-container re-footer-grid ui-footer-grid ui-footer-grid--standard">
            <Boundary id="real-estate.footer.brand">
              {(item) => {
                const brand = S.realEstateFooterBrandSchema.parse(item);
                return (
                  <div>
                    <img src={imageSource(brand.logo.key, tricoLogo)} alt={brand.logoAltText} />
                    <p>{brand.description}</p>
                    <span>
                      <MapPin /> {brand.address}
                    </span>
                    <span>
                      <Phone /> {brand.phone}
                    </span>
                    <span>
                      <Mail /> {brand.email}
                    </span>
                  </div>
                );
              }}
            </Boundary>
            <CollectionBoundary
              className="re-footer-links ui-footer-links"
              id="real-estate.footer.links"
              renderItem={(item, index) => {
                const link = S.realEstateFooterLinkSchema.parse(item);
                return (
                  <>
                    {index === 0 ? (
                      <h3 className="type-footer-title">{interfaceCopy.footerNavigation}</h3>
                    ) : null}
                    <a href={`#${link.destination}`}>{link.label}</a>
                  </>
                );
              }}
            />
            <Boundary id="real-estate.footer.license">
              {(item) => {
                const license = S.realEstateFooterLicenseSchema.parse(item);
                return (
                  <div>
                    <h3 className="type-footer-title">{license.heading}</h3>
                    <p>{license.license}</p>
                  </div>
                );
              }}
            </Boundary>
          </div>
          <Boundary id="real-estate.footer.legal">
            {(item) => {
              const legal = S.realEstateFooterLegalSchema.parse(item);
              return (
                <p className="re-copyright ui-copyright ui-footer-legal-rhythm">
                  © {new Date().getFullYear()} {legal.organizationName}. {legal.rightsNotice}
                </p>
              );
            }}
          </Boundary>
        </footer>
        <EditorToolbar />
      </div>
    </DocumentContext.Provider>
  );
}

export function RealEstateSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="real-estate">
      <RealEstateBody />
    </EditModeProvider>
  );
}

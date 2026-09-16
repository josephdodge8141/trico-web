import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  Building,
  Building2,
  Calculator,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  CreditCard,
  Facebook,
  FileText,
  Heart,
  Home,
  ImageIcon,
  Instagram,
  LineChart,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  PenLine,
  Phone,
  Quote,
  Settings,
  Star,
  Twitter,
  Users,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  editableValueSchema,
  propertyManagementAboutFeaturesSchema,
  propertyManagementAboutSchema,
  propertyManagementAnniversaryBannerSchema,
  propertyManagementCareersSchema,
  propertyManagementContactDetailsSchema,
  propertyManagementContactHeaderSchema,
  propertyManagementEntityDefinitions,
  propertyManagementFaqHeaderSchema,
  propertyManagementFaqItemsSchema,
  propertyManagementFooterBrandSchema,
  propertyManagementFooterLegalSchema,
  propertyManagementFooterLinksSchema,
  propertyManagementFooterSocialSchema,
  propertyManagementHeaderSchema,
  propertyManagementHeroSchema,
  propertyManagementHeroStatsSchema,
  propertyManagementPortfolioHeaderSchema,
  propertyManagementPortfolioItemsSchema,
  propertyManagementProcessHeaderSchema,
  propertyManagementProcessStepsSchema,
  propertyManagementReviewsFooterSchema,
  propertyManagementReviewsHeaderSchema,
  propertyManagementReviewsPlatformsSchema,
  propertyManagementServicesHeaderSchema,
  propertyManagementServicesItemsSchema,
  propertyManagementTeamHeaderSchema,
  propertyManagementTeamMembersSchema,
  propertyManagementTenantPortalFeaturesSchema,
  propertyManagementTenantPortalSchema,
  propertyManagementTestimonialsHeaderSchema,
  propertyManagementTestimonialsItemsSchema,
  propertyManagementTestimonialsStatsSchema,
  propertyManagementV2SeedData,
  type EditableValue,
  type PageContent,
  type SemanticEntityDefinition,
} from '@app/schemas';

import brookePhoto from '../assets/images/brooke-moore-pm.jpeg';
import miaPhoto from '../assets/images/mia-barlow.png';
import altaMedicalPhoto from '../assets/images/alta-medical.jpg';
import americanForkIndustrialPhoto from '../assets/images/american-fork-industrial.jpg';
import arborPlazaPhoto from '../assets/images/arbor-plaza.png';
import aboutPhoto from '../assets/images/pm-commercial-property.jpeg';
import bluffdaleIndustrialPhoto from '../assets/images/bluffdale-industrial.jpg';
import californiaCrossingPhoto from '../assets/images/california-crossing.jpg';
import countrySquarePhoto from '../assets/images/country-square.jpg';
import draperOffice194Photo from '../assets/images/draper-office-194.jpg';
import draperOffice218Photo from '../assets/images/draper-office-218.jpg';
import laurelSquarePhoto from '../assets/images/laurel-square.jpg';
import propertyLogo from '../assets/images/trico-property-management-logo.png';
import townSquarePhoto from '../assets/images/town-square.jpg';
import tricoLogo from '../assets/images/trico-logo.png';
import { EditableBoundary, type EditorOwnership } from '../components/EditableBoundary.js';
import { EditableCollection } from '../components/EditableCollection.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { ProfileCard } from '../components/ProfileCard.js';
import { ReviewPlatformCard, ReviewRating } from '../components/ReviewPlatformCard.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import {
  PropertyManagementAnalysisForm,
  PropertyManagementNewClientForm,
} from './PropertyManagementForms.js';
import { parsePropertyManagementValue } from './propertyManagementContent.js';

type PmEntityId = (typeof propertyManagementEntityDefinitions)[number]['id'];

const icons: Readonly<Record<string, LucideIcon>> = {
  ...contentIconComponents,
  BarChart3,
  Building,
  Building2,
  Calculator,
  ClipboardCheck,
  CreditCard,
  FileText,
  Heart,
  Home,
  LineChart,
  PenLine,
  Settings,
  Users,
  Wallet,
  Wrench,
};
const socialIcons: Readonly<Record<string, LucideIcon>> = {
  Facebook,
  Twitter,
  LinkedIn: Linkedin,
  Instagram,
};
const imageByKey: Readonly<Record<string, string>> = {
  'media/seed/trico-property-management-logo.png': propertyLogo,
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/pm-commercial-property.jpeg': aboutPhoto,
  'media/seed/brooke-moore-pm.jpeg': brookePhoto,
  'media/seed/mia-barlow.png': miaPhoto,
  'media/seed/town-square.jpg': townSquarePhoto,
  'media/seed/country-square.jpg': countrySquarePhoto,
  'media/seed/alta-medical.jpg': altaMedicalPhoto,
  'media/seed/american-fork-industrial.jpg': americanForkIndustrialPhoto,
  'media/seed/bluffdale-industrial.jpg': bluffdaleIndustrialPhoto,
  'media/seed/draper-office-218.jpg': draperOffice218Photo,
  'media/seed/draper-office-194.jpg': draperOffice194Photo,
  'media/seed/laurel-square.jpg': laurelSquarePhoto,
  'media/seed/california-crossing.jpg': californiaCrossingPhoto,
  'media/seed/arbor-plaza.png': arborPlazaPhoto,
};

function definition(id: PmEntityId): SemanticEntityDefinition {
  const match = propertyManagementEntityDefinitions.find((candidate) => candidate.id === id);
  if (match === undefined)
    throw new Error(`Property Management editor definition missing for ${id}`);
  return match;
}
function asset(key: string): string | undefined {
  return (
    imageByKey[key] ??
    (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : undefined)
  );
}
function headerAsset(key: string): string {
  return key === 'media/seed/trico-property-management-logo.png'
    ? tricoLogo
    : (asset(key) ?? tricoLogo);
}
function icon(name: string): LucideIcon {
  return icons[name] ?? Building2;
}
function ownership(
  id: PmEntityId,
  currentUserId: string | null | undefined,
  pending: ReturnType<typeof useEditMode>['pending'],
): EditorOwnership {
  const change = pending.find((candidate) => candidate.entityId === id);
  return change === undefined ? 'available' : change.authorId === currentUserId ? 'mine' : 'other';
}

function ObjectBoundary({
  id,
  value,
  children,
}: {
  readonly id: PmEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  const placementClass =
    id === 'property-management.header'
      ? ' pm-fixed-header-entity-slot'
      : id === 'property-management.hero'
        ? ' pm-hero-entity-slot'
        : '';
  return (
    <div
      className={`pm-entity-slot ui-entity-slot${placementClass}`}
      data-property-management-entity-boundary="true"
    >
      <EditableBoundary
        active={editing.active}
        definition={definition(id)}
        value={editableValueSchema.parse(value)}
        ownership={ownership(id, editing.currentUserId, editing.pending)}
        busy={editing.busy}
        onSave={(next) => editing.save(id, next)}
        onReloadLatest={() => editing.reload(id)}
      >
        {children}
      </EditableBoundary>
    </div>
  );
}
function CollectionBoundary({
  id,
  value,
  renderItem,
}: {
  readonly id: PmEntityId;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <div className="pm-entity-slot ui-entity-slot" data-property-management-entity-boundary="true">
      <EditableCollection
        active={editing.active}
        definition={definition(id)}
        value={value}
        renderItem={renderItem}
        ownership={ownership(id, editing.currentUserId, editing.pending)}
        busy={editing.busy}
        onSave={(next) => editing.save(id, next)}
        onReloadLatest={() => editing.reload(id)}
      />
    </div>
  );
}
function Heading({
  value,
  titleClassName = '',
  eyebrowClassName = 'ui-eyebrow-brand',
}: {
  readonly value: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly description: string;
  };
  readonly titleClassName?: string;
  readonly eyebrowClassName?: string;
}): React.JSX.Element {
  return (
    <header className="pm-section-heading ui-section-heading">
      <span className={eyebrowClassName}>{value.eyebrow}</span>
      <h2 className={`type-section-title ${titleClassName}`}>{value.heading}</h2>
      <p>{value.description}</p>
    </header>
  );
}

function PropertyManagementBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<PageContent>({});
  const [fallback, setFallback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('property-management', { signal: controller.signal })
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

  const value = <Output,>(
    id: keyof typeof propertyManagementV2SeedData,
    parser: { parse(value: unknown): Output },
  ): Output => parsePropertyManagementValue(document, id, parser);
  const banner = value(
    'property-management.anniversary-banner',
    propertyManagementAnniversaryBannerSchema,
  );
  const header = value('property-management.header', propertyManagementHeaderSchema);
  const hero = value('property-management.hero', propertyManagementHeroSchema);
  const heroStats = value('property-management.hero.stats', propertyManagementHeroStatsSchema);
  const servicesHeader = value(
    'property-management.services.header',
    propertyManagementServicesHeaderSchema,
  );
  const services = value(
    'property-management.services.items',
    propertyManagementServicesItemsSchema,
  );
  const processHeader = value(
    'property-management.process.header',
    propertyManagementProcessHeaderSchema,
  );
  const processSteps = value(
    'property-management.process.steps',
    propertyManagementProcessStepsSchema,
  );
  const managedHeader = value(
    'property-management.portfolio.managed.header',
    propertyManagementPortfolioHeaderSchema,
  );
  const managed = value(
    'property-management.portfolio.managed.items',
    propertyManagementPortfolioItemsSchema,
  );
  const coasHeader = value(
    'property-management.portfolio.coas.header',
    propertyManagementPortfolioHeaderSchema,
  );
  const coas = value(
    'property-management.portfolio.coas.items',
    propertyManagementPortfolioItemsSchema,
  );
  const hoasHeader = value(
    'property-management.portfolio.hoas.header',
    propertyManagementPortfolioHeaderSchema,
  );
  const hoas = value(
    'property-management.portfolio.hoas.items',
    propertyManagementPortfolioItemsSchema,
  );
  const portal = value('property-management.tenant-portal', propertyManagementTenantPortalSchema);
  const portalFeatures = value(
    'property-management.tenant-portal.features',
    propertyManagementTenantPortalFeaturesSchema,
  );
  const teamHeader = value('property-management.team.header', propertyManagementTeamHeaderSchema);
  const team = value('property-management.team.members', propertyManagementTeamMembersSchema);
  const about = value('property-management.about', propertyManagementAboutSchema);
  const aboutFeatures = value(
    'property-management.about.features',
    propertyManagementAboutFeaturesSchema,
  );
  const testimonialsHeader = value(
    'property-management.testimonials.header',
    propertyManagementTestimonialsHeaderSchema,
  );
  const testimonials = value(
    'property-management.testimonials.items',
    propertyManagementTestimonialsItemsSchema,
  );
  const testimonialStats = value(
    'property-management.testimonials.stats',
    propertyManagementTestimonialsStatsSchema,
  );
  const faqHeader = value('property-management.faq.header', propertyManagementFaqHeaderSchema);
  const faqs = value('property-management.faq.items', propertyManagementFaqItemsSchema);
  const careers = value('property-management.careers', propertyManagementCareersSchema);
  const reviewsHeader = value(
    'property-management.reviews.header',
    propertyManagementReviewsHeaderSchema,
  );
  const reviewPlatforms = value(
    'property-management.reviews.platforms',
    propertyManagementReviewsPlatformsSchema,
  );
  const reviewsFooter = value(
    'property-management.reviews.footer',
    propertyManagementReviewsFooterSchema,
  );
  const contactHeader = value(
    'property-management.contact.header',
    propertyManagementContactHeaderSchema,
  );
  const contact = value(
    'property-management.contact.details',
    propertyManagementContactDetailsSchema,
  );
  const footerBrand = value(
    'property-management.footer.brand',
    propertyManagementFooterBrandSchema,
  );
  const footerLinks = value(
    'property-management.footer.links',
    propertyManagementFooterLinksSchema,
  );
  const footerSocial = value(
    'property-management.footer.social',
    propertyManagementFooterSocialSchema,
  );
  const footerLegal = value(
    'property-management.footer.legal',
    propertyManagementFooterLegalSchema,
  );
  const renderIconItem = (value: EditableValue): React.ReactNode => {
    const item = propertyManagementServicesItemsSchema.element.parse(value);
    const Icon = icon(item.icon);
    return (
      <article className="pm-card ui-card ui-card-padding-compact ui-card-padding-trailing-compact">
        <span className="pm-icon ui-icon">
          <Icon aria-hidden="true" />
        </span>
        <h3 className="type-card-title">{item.title}</h3>
        <p>{item.description}</p>
      </article>
    );
  };
  const renderProperty = (value: EditableValue): React.ReactNode => {
    const item = propertyManagementPortfolioItemsSchema.element.parse(value);
    const source = asset(item.photo.key);
    return (
      <article className="pm-property-card ui-property-card">
        <div className="pm-property-image ui-property-image">
          {source === undefined ? (
            <div
              className="pm-neutral-placeholder ui-neutral-placeholder"
              data-neutral-placeholder="true"
            >
              <ImageIcon aria-hidden="true" />
              <span>Photo coming soon</span>
            </div>
          ) : (
            <img src={source} alt={item.photoAltText} />
          )}
        </div>
        <div>
          <h3 className="type-card-title">{item.name}</h3>
          <p>{item.description}</p>
        </div>
      </article>
    );
  };

  return (
    <div className="pm-page ui-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <ObjectBoundary id="property-management.anniversary-banner" value={banner}>
        <div className="pm-anniversary ui-anniversary">
          ✦ <strong>{banner.message}</strong> ✦
        </div>
      </ObjectBoundary>
      <ObjectBoundary id="property-management.header" value={header}>
        <header className="pm-header ui-header">
          <div className="pm-container ui-container pm-header-inner ui-header-inner">
            <Link className="pm-brand ui-brand" to="/">
              <img src={headerAsset(header.logo.key)} alt={header.logoAltText} />
              <strong>{header.divisionLabel}</strong>
            </Link>
            <nav aria-label="Primary navigation">
              {header.navLinks.map((link) => (
                <a key={link.id} href={`#${link.destination}`}>
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="pm-header-actions ui-header-actions">
              <a href={`tel:${header.phone.replace(/\D/g, '')}`}>
                <Phone aria-hidden="true" />
                {header.phone}
              </a>
              <a
                className="pm-button ui-button pm-button-primary ui-button-primary"
                href="#contact"
              >
                {header.actionLabel}
              </a>
            </div>
            <button
              className="pm-menu-button ui-menu-button"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="pm-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X /> : <Menu />}
              <span className="sr-only">Toggle menu</span>
            </button>
          </div>
          {menuOpen ? (
            <nav
              id="pm-mobile-menu"
              className="pm-mobile-menu ui-mobile-menu"
              aria-label="Mobile navigation"
            >
              {header.navLinks.map((link) => (
                <a key={link.id} href={`#${link.destination}`} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
              <a href={`tel:${header.phone.replace(/\D/g, '')}`}>{header.phone}</a>
              <a
                className="pm-button ui-button pm-button-primary ui-button-primary"
                href="#contact"
              >
                Free Property Analysis
              </a>
            </nav>
          ) : null}
        </header>
      </ObjectBoundary>
      {fallback ? (
        <p className="content-notice" role="status">
          Showing the checked-in site content while published content is unavailable.
        </p>
      ) : null}
      <main id="main-content">
        <ObjectBoundary id="property-management.hero" value={hero}>
          <section className="pm-hero ui-hero ui-split-hero">
            <div className="pm-container ui-container pm-hero-grid ui-hero-grid">
              <div className="ui-hero-copy">
                <span className="pm-pill ui-pill pm-pill-gold ui-pill-gold">
                  <Building2 />
                  {hero.eyebrow}
                </span>
                <h1 className="type-display">{hero.heading}</h1>
                <p>{hero.description}</p>
                <div className="pm-actions ui-actions">
                  <a
                    className="pm-button ui-button pm-button-gold ui-button-accent"
                    href="#contact"
                  >
                    {hero.primaryActionLabel}
                    <ArrowRight aria-hidden="true" />
                  </a>
                  <a
                    className="pm-button ui-button pm-button-outline ui-button-outline"
                    href="#services"
                  >
                    {hero.secondaryActionLabel}
                  </a>
                </div>
                <CollectionBoundary
                  id="property-management.hero.stats"
                  value={heroStats}
                  renderItem={(value) => {
                    const stat = propertyManagementHeroStatsSchema.element.parse(value);
                    const Icon = icon(stat.icon);
                    return (
                      <div className="pm-stat ui-stat">
                        <Icon />
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    );
                  }}
                />
              </div>
              <div
                className="pm-hero-image ui-hero-image division-hero-media"
                data-division-hero-media="true"
                data-media-state={asset(hero.image.key) === undefined ? 'unavailable' : 'available'}
              >
                {asset(hero.image.key) === undefined ? (
                  <div
                    className="pm-neutral-placeholder ui-neutral-placeholder division-hero-media-placeholder"
                    data-neutral-placeholder="true"
                    role="img"
                    aria-label={hero.imageAltText}
                  >
                    <ImageIcon aria-hidden="true" />
                    <span>Photo coming soon</span>
                  </div>
                ) : (
                  <img src={asset(hero.image.key)} alt={hero.imageAltText} />
                )}
              </div>
            </div>
          </section>
        </ObjectBoundary>
        <section className="pm-section ui-section pm-tint ui-tint ui-services" id="services">
          <div className="pm-container ui-container">
            <ObjectBoundary id="property-management.services.header" value={servicesHeader}>
              <Heading value={servicesHeader} />
            </ObjectBoundary>
            <CollectionBoundary
              id="property-management.services.items"
              value={services}
              renderItem={renderIconItem}
            />
          </div>
        </section>
        <section className="pm-section ui-section pm-process ui-process" id="process">
          <div className="pm-container ui-container">
            <ObjectBoundary id="property-management.process.header" value={processHeader}>
              <Heading value={processHeader} />
            </ObjectBoundary>
            <CollectionBoundary
              id="property-management.process.steps"
              value={processSteps}
              renderItem={(value, index) => {
                const step = propertyManagementProcessStepsSchema.element.parse(value);
                const Icon = icon(step.icon);
                return (
                  <article
                    className={`pm-process-step ui-process-step ${index % 2 === 0 ? 'pm-process-left' : 'pm-process-right'}`}
                  >
                    <div>
                      <span className="pm-step-number ui-step-number">{step.number}</span>
                      <span className="pm-icon ui-icon">
                        <Icon />
                      </span>
                      <h3 className="type-card-title">{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </article>
                );
              }}
            />
          </div>
        </section>
        <section className="pm-section ui-section pm-tint ui-tint" id="managed-properties">
          <div className="pm-container ui-container">
            <ObjectBoundary id="property-management.portfolio.managed.header" value={managedHeader}>
              <Heading value={managedHeader} />
            </ObjectBoundary>
            <CollectionBoundary
              id="property-management.portfolio.managed.items"
              value={managed}
              renderItem={renderProperty}
            />
            <ObjectBoundary id="property-management.portfolio.coas.header" value={coasHeader}>
              <Heading value={coasHeader} titleClassName="type-section-title-compact" />
            </ObjectBoundary>
            <CollectionBoundary
              id="property-management.portfolio.coas.items"
              value={coas}
              renderItem={renderProperty}
            />
            <ObjectBoundary id="property-management.portfolio.hoas.header" value={hoasHeader}>
              <Heading value={hoasHeader} titleClassName="type-section-title-compact" />
            </ObjectBoundary>
            <CollectionBoundary
              id="property-management.portfolio.hoas.items"
              value={hoas}
              renderItem={renderProperty}
            />
          </div>
        </section>
        <section className="pm-section ui-section pm-portal ui-portal" id="tenant-portal">
          <div className="pm-container ui-container pm-narrow ui-narrow">
            <ObjectBoundary id="property-management.tenant-portal" value={portal}>
              <>
                <Heading value={portal} />
                <CollectionBoundary
                  id="property-management.tenant-portal.features"
                  value={portalFeatures}
                  renderItem={renderIconItem}
                />
                <div className="pm-portal-action ui-portal-action">
                  <a
                    className="pm-button ui-button pm-button-primary ui-button-primary"
                    href={portal.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {portal.actionLabel}
                  </a>
                  <p>{portal.note}</p>
                </div>
              </>
            </ObjectBoundary>
          </div>
        </section>
        <section
          className="pm-section ui-section pm-team ui-team ui-profile-contacts-stacked"
          id="team"
        >
          <div className="pm-container ui-container">
            <ObjectBoundary id="property-management.team.header" value={teamHeader}>
              <Heading value={teamHeader} titleClassName="type-section-title-large" />
            </ObjectBoundary>
            <CollectionBoundary
              id="property-management.team.members"
              value={team}
              renderItem={(value) => {
                const member = propertyManagementTeamMembersSchema.element.parse(value);
                const source = asset(member.photo.key);
                return (
                  <ProfileCard
                    description={member.description}
                    email={member.email}
                    emailLabel={member.email}
                    imageAltText={member.photoAltText}
                    imageSource={source}
                    name={member.name}
                    phone={member.phone}
                    role={member.title}
                  />
                );
              }}
            />
          </div>
        </section>
        <ObjectBoundary id="property-management.about" value={about}>
          <section className="pm-section ui-section pm-about ui-about" id="about">
            <div className="pm-container ui-container pm-about-grid ui-about-grid">
              <div className="pm-about-image ui-about-image">
                <img src={asset(about.image.key) ?? aboutPhoto} alt={about.imageAltText} />
                <aside>
                  <strong>{about.statValue}</strong>
                  <span>{about.statLabel}</span>
                </aside>
              </div>
              <div>
                <span className="pm-pill ui-pill ui-eyebrow-inverse">{about.eyebrow}</span>
                <h2 className="type-section-title">{about.heading}</h2>
                <p>{about.introduction}</p>
                <p>{about.detail}</p>
                <CollectionBoundary
                  id="property-management.about.features"
                  value={aboutFeatures}
                  renderItem={(value) => {
                    const item = propertyManagementAboutFeaturesSchema.element.parse(value);
                    return (
                      <span className="pm-check ui-check">
                        <CheckCircle2 />
                        {item.title}
                      </span>
                    );
                  }}
                />
                <a className="pm-button ui-button pm-button-light ui-button-light" href="#contact">
                  {about.actionLabel}
                </a>
              </div>
            </div>
          </section>
        </ObjectBoundary>
        <section className="pm-section ui-section pm-tint ui-tint pm-testimonials ui-testimonials">
          <div className="pm-container ui-container">
            <ObjectBoundary id="property-management.testimonials.header" value={testimonialsHeader}>
              <Heading value={testimonialsHeader} eyebrowClassName="ui-eyebrow-accent" />
            </ObjectBoundary>
            <CollectionBoundary
              id="property-management.testimonials.items"
              value={testimonials}
              renderItem={(value) => {
                const item = propertyManagementTestimonialsItemsSchema.element.parse(value);
                const source =
                  item.image.kind === 'external' ? item.image.url : asset(item.image.key);
                return (
                  <article className="pm-quote-card ui-quote-card">
                    <Quote />
                    <header>
                      {source === undefined ? null : <img src={source} alt={item.imageAltText} />}
                      <div>
                        <h3 className="type-card-title">{item.name}</h3>
                        <span>{item.role}</span>
                      </div>
                    </header>
                    <div className="pm-stars ui-stars" aria-label={`${item.rating} out of 5 stars`}>
                      {Array.from({ length: item.rating }, (_, index) => (
                        <Star key={index} />
                      ))}
                    </div>
                    <p>“{item.quote}”</p>
                  </article>
                );
              }}
            />
            <CollectionBoundary
              id="property-management.testimonials.stats"
              value={testimonialStats}
              renderItem={(value) => {
                const stat = propertyManagementTestimonialsStatsSchema.element.parse(value);
                return (
                  <div className="pm-trust-stat ui-trust-stat">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                );
              }}
            />
          </div>
        </section>
        <section className="pm-section ui-section pm-faq ui-faq" id="faq">
          <div className="pm-container ui-container pm-narrow ui-narrow">
            <ObjectBoundary id="property-management.faq.header" value={faqHeader}>
              <Heading value={faqHeader} />
            </ObjectBoundary>
            <CollectionBoundary
              id="property-management.faq.items"
              value={faqs}
              renderItem={(value) => {
                const item = propertyManagementFaqItemsSchema.element.parse(value);
                return (
                  <details className="pm-faq-item ui-faq-item">
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                );
              }}
            />
          </div>
        </section>
        <ObjectBoundary id="property-management.careers" value={careers}>
          <section
            className="pm-section ui-section pm-tint ui-tint pm-careers ui-careers ui-careers-banner-accent"
            id="careers"
          >
            <div className="pm-container ui-container pm-narrow ui-narrow">
              <span className="pm-career-icon ui-career-icon">◆</span>
              <h2 className="type-section-title type-section-title-compact">{careers.heading}</h2>
              <p>{careers.description}</p>
              <div className="pm-career-card ui-career-card ui-career-card-compact">
                <h3 className="type-card-title">{careers.cardHeading}</h3>
                <p>{careers.cardDescription}</p>
                <a
                  className="pm-button ui-button pm-button-primary ui-button-primary ui-career-apply-action"
                  href={`mailto:${careers.email}`}
                >
                  {careers.email}
                </a>
              </div>
            </div>
          </section>
        </ObjectBoundary>
        <PropertyManagementNewClientForm />
        <section className="pm-section ui-section pm-reviews ui-reviews" id="reviews">
          <div className="pm-container ui-container">
            <ObjectBoundary id="property-management.reviews.header" value={reviewsHeader}>
              <Heading value={reviewsHeader} />
            </ObjectBoundary>
            <ReviewRating />
            <CollectionBoundary
              id="property-management.reviews.platforms"
              value={reviewPlatforms}
              renderItem={(value) => {
                const item = propertyManagementReviewsPlatformsSchema.element.parse(value);
                return (
                  <ReviewPlatformCard
                    actionLabel="Review on"
                    description={item.description}
                    externalUrl={item.externalUrl}
                    name={item.name}
                    unavailableLabel="Review link coming soon"
                  />
                );
              }}
            />
            <ObjectBoundary id="property-management.reviews.footer" value={reviewsFooter}>
              <p className="pm-reviews-footer ui-reviews-footer">
                {reviewsFooter.privateFeedbackLabel}{' '}
                <a href={`mailto:${reviewsFooter.email}`}>{reviewsFooter.email}</a> — we read every
                message.
              </p>
            </ObjectBoundary>
          </div>
        </section>
        <section
          className="pm-section ui-section pm-contact ui-contact ui-align-start"
          id="contact"
        >
          <div className="pm-container ui-container pm-contact-grid ui-contact-grid ui-contact-grid-standard">
            <div>
              <ObjectBoundary id="property-management.contact.header" value={contactHeader}>
                <Heading value={contactHeader} />
              </ObjectBoundary>
              <ObjectBoundary id="property-management.contact.details" value={contact}>
                <div className="pm-contact-details ui-contact-details">
                  <a className="pm-google ui-google" href={contact.reviewUrl}>
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.22-1.83 4.23-1.48 1.48-3.78 2.93-6.01 2.93-4.97 0-9-4.03-9-9s4.03-9 9-9c4.17 0 7.38 2.91 8.35 6.65h-2.35c-.8-2.4-2.62-4.05-6-4.05a6.4 6.4 0 1 0 0 12.8c2.54 0 4.22-1.06 5.36-2.36.9-.9 1.5-2.18 1.72-3.73h-7.08Z" />
                    </svg>
                    {contact.reviewLabel}
                  </a>
                  <div className="pm-contact-detail ui-contact-detail">
                    <span className="pm-contact-icon ui-contact-icon" aria-hidden="true">
                      <MapPin />
                    </span>
                    <div>
                      <h3 className="type-card-title">Office Location</h3>
                      <address>{contact.address}</address>
                    </div>
                  </div>
                  <div className="pm-contact-detail ui-contact-detail">
                    <span className="pm-contact-icon ui-contact-icon" aria-hidden="true">
                      <Phone />
                    </span>
                    <div>
                      <h3 className="type-card-title">Phone</h3>
                      <a href={`tel:${contact.phone.replace(/\D/g, '')}`}>{contact.phone}</a>
                      <p>Fax: {contact.fax}</p>
                    </div>
                  </div>
                  <div className="pm-contact-detail ui-contact-detail">
                    <span className="pm-contact-icon ui-contact-icon" aria-hidden="true">
                      <Mail />
                    </span>
                    <div>
                      <h3 className="type-card-title">Email</h3>
                      <a href={`mailto:${contact.email}`}>{contact.email}</a>
                    </div>
                  </div>
                  <div className="pm-contact-detail ui-contact-detail">
                    <span
                      className="pm-contact-icon ui-contact-icon pm-contact-license-icon"
                      aria-hidden="true"
                    >
                      <Award />
                    </span>
                    <div>
                      <h3 className="type-card-title">Licenses</h3>
                      {contact.licenses.map((license) => (
                        <p key={license.id}>{license.label}</p>
                      ))}
                    </div>
                  </div>
                  <div className="pm-contact-detail ui-contact-detail">
                    <span className="pm-contact-icon ui-contact-icon" aria-hidden="true">
                      <Clock />
                    </span>
                    <div>
                      <h3 className="type-card-title">Office Hours</h3>
                      <p>{contact.officeHours}</p>
                    </div>
                  </div>
                </div>
              </ObjectBoundary>
            </div>
            <PropertyManagementAnalysisForm />
          </div>
        </section>
      </main>
      <footer className="pm-footer ui-footer ui-align-start ui-footer-rhythm">
        <div className="pm-container ui-container pm-footer-grid ui-footer-grid ui-footer-grid--compact">
          <ObjectBoundary id="property-management.footer.brand" value={footerBrand}>
            <div className="pm-footer-brand ui-footer-brand">
              <img
                src={asset(footerBrand.logo.key) ?? propertyLogo}
                alt={footerBrand.logoAltText}
              />
              <p>{footerBrand.description}</p>
              <CollectionBoundary
                id="property-management.footer.social"
                value={footerSocial}
                renderItem={(value) => {
                  const item = propertyManagementFooterSocialSchema.element.parse(value);
                  const Icon = socialIcons[item.label] ?? PenLine;
                  return (
                    <a href={item.externalUrl || '#'} aria-label={item.label}>
                      <Icon />
                    </a>
                  );
                }}
              />
            </div>
          </ObjectBoundary>
          <CollectionBoundary
            id="property-management.footer.links"
            value={footerLinks}
            renderItem={(value, index) => {
              const item = propertyManagementFooterLinksSchema.element.parse(value);
              const previous = footerLinks[index - 1];
              return (
                <div className="pm-footer-link ui-footer-link">
                  {previous === undefined || previous.group !== item.group ? (
                    <strong>{item.group}</strong>
                  ) : null}
                  <a href={`#${item.destination}`}>{item.label}</a>
                </div>
              );
            }}
          />
        </div>
        <ObjectBoundary id="property-management.footer.legal" value={footerLegal}>
          <div className="pm-container ui-container pm-footer-legal ui-footer-legal ui-footer-legal-rhythm">
            <span>
              © {new Date().getFullYear()} {footerLegal.organizationName}.{' '}
              {footerLegal.rightsNotice}
            </span>
            <span>
              <a href="#">{footerLegal.privacyLabel}</a>
              <a href="#">{footerLegal.termsLabel}</a>
            </span>
          </div>
        </ObjectBoundary>
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function PropertyManagementSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="property-management">
      <PropertyManagementBody />
    </EditModeProvider>
  );
}

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building,
  ClipboardCheck,
  Clock,
  DollarSign,
  FileText,
  Handshake,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Monitor,
  Phone,
  Settings,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  editableValueSchema,
  storageAboutSchema,
  storageAnniversaryBannerSchema,
  storageContactDetailsSchema,
  storageContactHeaderSchema,
  storageEntityDefinitions,
  storageFooterBrandingOptionsSchema,
  storageFooterBrandSchema,
  storageFooterLegalSchema,
  storageFooterLinkSchema,
  storageFooterLinksSchema,
  storageHeaderSchema,
  storageHeroSchema,
  storageHeroStatSchema,
  storageHeroStatsSchema,
  storageReviewPlatformSchema,
  storageReviewsFooterSchema,
  storageReviewsHeaderSchema,
  storageReviewsPlatformsSchema,
  storageServiceSchema,
  storageServicesHeaderSchema,
  storageServicesItemsSchema,
  storageTeamHeaderSchema,
  storageTeamMemberSchema,
  storageTeamMembersSchema,
  storageV2SeedData,
  type EditableValue,
  type PageContent,
  type SemanticEntityDefinition,
} from '@app/schemas';

import amberPhoto from '../assets/images/amber-lamborn.jpeg';
import deborahPhoto from '../assets/images/deborah-peterson.jpeg';
import lynettePhoto from '../assets/images/lynette-staker.jpg';
import stevePhoto from '../assets/images/steve-tripp.png';
import storageHeroImage from '../assets/images/storage-hero.png';
import storageLogo from '../assets/images/trico-storage-logo.png';
import { EditableBoundary, type EditorOwnership } from '../components/EditableBoundary.js';
import { EditableCollection } from '../components/EditableCollection.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { ReviewPlatformCard, ReviewRating } from '../components/ReviewPlatformCard.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { StorageContactForm } from './StorageContactForm.js';
import { parseStorageValue } from './storageContent.js';

type StorageEntityId = (typeof storageEntityDefinitions)[number]['id'];
const icons: Readonly<Record<string, LucideIcon>> = {
  ...contentIconComponents,
  TrendingUp,
  Warehouse,
  BarChart3,
  Settings,
  Shield,
  Target,
  Users,
  DollarSign,
  Building,
  Handshake,
  ClipboardCheck,
  MessageSquare,
  Monitor,
  FileText,
};
const images: Readonly<Record<string, string>> = {
  'media/seed/trico-storage-logo.png': storageLogo,
  'media/seed/storage-hero.png': storageHeroImage,
  'media/seed/steve-tripp.png': stevePhoto,
  'media/seed/amber-lamborn.jpeg': amberPhoto,
  'media/seed/lynette-staker.jpg': lynettePhoto,
  'media/seed/deborah-peterson.jpeg': deborahPhoto,
};
const managedImage = (key: string, fallback: string): string =>
  images[key] ??
  (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback);
const anchor = (destination: string) => `#${destination}`;

function definition(id: StorageEntityId): SemanticEntityDefinition {
  const found = storageEntityDefinitions.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Storage editor definition missing for ${id}`);
  return found;
}
function ownership(id: StorageEntityId, editing: ReturnType<typeof useEditMode>): EditorOwnership {
  const pending = editing.pending.find((change) => change.entityId === id);
  return pending === undefined
    ? 'available'
    : pending.authorId === editing.currentUserId
      ? 'mine'
      : 'other';
}
function ObjectBoundary({
  id,
  value,
  children,
}: {
  readonly id: StorageEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <div
      className={`storage-entity-slot ui-entity-slot${id === 'storage.hero' ? ' storage-hero-entity-slot ui-hero-entity-slot' : ''}`}
      data-storage-entity-boundary="true"
    >
      <EditableBoundary
        active={editing.active}
        definition={definition(id)}
        value={editableValueSchema.parse(value)}
        ownership={ownership(id, editing)}
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
  readonly id: StorageEntityId;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <div className="storage-entity-slot ui-entity-slot" data-storage-entity-boundary="true">
      <EditableCollection
        active={editing.active}
        layout="fill"
        definition={definition(id)}
        value={value}
        renderItem={renderItem}
        ownership={ownership(id, editing)}
        busy={editing.busy}
        onSave={(next) => editing.save(id, next)}
        onReloadLatest={() => editing.reload(id)}
      />
    </div>
  );
}
function SectionHeading({
  value,
  className = '',
  titleClassName = '',
}: {
  readonly value: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly description: string;
  };
  readonly className?: string;
  readonly titleClassName?: string;
}): React.JSX.Element {
  return (
    <header className={`storage-section-heading ui-section-heading ${className}`}>
      <span>{value.eyebrow}</span>
      <h2 className={`type-section-title ${titleClassName}`}>{value.heading}</h2>
      <p>{value.description}</p>
    </header>
  );
}

function StorageBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<PageContent>({});
  const [fallback, setFallback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('storage', { signal: controller.signal })
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
    id: keyof typeof storageV2SeedData,
    parser: { parse(value: unknown): Output },
  ): Output => parseStorageValue(document, id, parser);
  const banner = value('storage.anniversary-banner', storageAnniversaryBannerSchema);
  const header = value('storage.header', storageHeaderSchema);
  const hero = value('storage.hero', storageHeroSchema);
  const stats = value('storage.hero.stats', storageHeroStatsSchema);
  const servicesHeader = value('storage.services.header', storageServicesHeaderSchema);
  const services = value('storage.services.items', storageServicesItemsSchema);
  const teamHeader = value('storage.team.header', storageTeamHeaderSchema);
  const team = value('storage.team.members', storageTeamMembersSchema);
  const about = value('storage.about', storageAboutSchema);
  const reviewsHeader = value('storage.reviews.header', storageReviewsHeaderSchema);
  const reviews = value('storage.reviews.platforms', storageReviewsPlatformsSchema);
  const reviewsFooter = value('storage.reviews.footer', storageReviewsFooterSchema);
  const contactHeader = value('storage.contact.header', storageContactHeaderSchema);
  const contact = value('storage.contact.details', storageContactDetailsSchema);
  const footerBrand = value('storage.footer.brand', storageFooterBrandSchema);
  const footerLinks = value('storage.footer.links', storageFooterLinksSchema);
  const branding = value('storage.footer.branding-options', storageFooterBrandingOptionsSchema);
  const legal = value('storage.footer.legal', storageFooterLegalSchema);
  return (
    <div className="storage-page ui-page">
      <a className="skip-link" href="#storage-main">
        Skip to main content
      </a>
      <ObjectBoundary id="storage.anniversary-banner" value={banner}>
        <div className="storage-banner ui-banner">
          <Sparkles aria-hidden="true" />
          <strong>{banner.message}</strong>
          <Sparkles aria-hidden="true" />
        </div>
      </ObjectBoundary>
      <ObjectBoundary id="storage.header" value={header}>
        <header className="storage-header ui-header">
          <Link to="/" aria-label="TriCo home">
            <img src={managedImage(header.logo.key, storageLogo)} alt={header.logoAltText} />
          </Link>
          <nav aria-label="Storage navigation">
            {header.navLinks.map((item) => (
              <a key={item.id} href={anchor(item.destination)}>
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label="Open navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </header>
        {menuOpen ? (
          <nav className="storage-mobile-nav ui-mobile-nav" aria-label="Mobile storage navigation">
            {header.navLinks.map((item) => (
              <a key={item.id} href={anchor(item.destination)} onClick={() => setMenuOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </ObjectBoundary>
      {fallback ? (
        <p className="storage-notice ui-notice" role="status">
          Showing the checked-in site content while published Storage content is unavailable.
        </p>
      ) : null}
      <main id="storage-main">
        <ObjectBoundary id="storage.hero" value={hero}>
          <section className="storage-hero ui-hero ui-split-hero ui-viewport-hero">
            <div className="storage-hero-copy ui-hero-copy">
              <div className="storage-badges ui-badges">
                <span>
                  <Warehouse />
                  {hero.primaryBadge}
                </span>
                <span>{hero.serviceAreaBadge}</span>
              </div>
              <h1 className="type-display">{hero.heading}</h1>
              <p className="storage-promise ui-promise">{hero.subheading}</p>
              <p>{hero.description}</p>
              <div className="storage-actions ui-actions">
                <a className="ui-button" href="#contact">
                  {hero.primaryActionLabel}
                  <ArrowRight />
                </a>
                <a className="ui-button" href="#services">
                  {hero.secondaryActionLabel}
                </a>
              </div>
              <CollectionBoundary
                id="storage.hero.stats"
                value={stats}
                renderItem={(item) => {
                  const stat = storageHeroStatSchema.parse(item);
                  const Icon = icons[stat.icon] ?? TrendingUp;
                  return (
                    <article className="storage-stat ui-stat">
                      <Icon />
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </article>
                  );
                }}
              />
            </div>
            <figure
              className="division-hero-media ui-split-hero-media-success"
              data-division-hero-media="true"
              data-media-state="available"
            >
              <img src={managedImage(hero.image.key, storageHeroImage)} alt={hero.imageAltText} />
              <figcaption>{hero.imageCaption}</figcaption>
            </figure>
          </section>
        </ObjectBoundary>
        <section
          id="services"
          className="storage-section ui-section ui-contained-section storage-services ui-services"
        >
          <ObjectBoundary id="storage.services.header" value={servicesHeader}>
            <SectionHeading
              value={servicesHeader}
              className="ui-heading-measure-standard"
              titleClassName="type-section-title-large"
            />
          </ObjectBoundary>
          <CollectionBoundary
            id="storage.services.items"
            value={services}
            renderItem={(item) => {
              const service = storageServiceSchema.parse(item);
              const Icon = icons[service.icon] ?? Building;
              return (
                <article className="storage-service-card ui-service-card ui-card-padding-compact">
                  <span>
                    <Icon />
                  </span>
                  <h3 className="type-card-title">{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              );
            }}
          />
        </section>
        <section id="team" className="storage-section ui-section storage-team ui-team">
          <ObjectBoundary id="storage.team.header" value={teamHeader}>
            <SectionHeading value={teamHeader} titleClassName="type-section-title-large" />
          </ObjectBoundary>
          <CollectionBoundary
            id="storage.team.members"
            value={team}
            renderItem={(item) => {
              const member = storageTeamMemberSchema.parse(item);
              return (
                <article className="storage-team-card ui-team-card">
                  <img
                    src={managedImage(member.image.key, storageLogo)}
                    alt={member.imageAltText}
                  />
                  <div>
                    <h3 className="type-card-title">{member.name}</h3>
                    <strong>{member.role}</strong>
                    <p>{member.bio}</p>
                  </div>
                </article>
              );
            }}
          />
        </section>
        <ObjectBoundary id="storage.about" value={about}>
          <section id="about" className="storage-about ui-about">
            <div className="storage-about-mark ui-about-mark">
              <strong>TriCo</strong>
              <span>Storage Management</span>
              <aside>
                <b>{about.statValue}</b>
                {about.statLabel}
              </aside>
            </div>
            <div>
              <span className="storage-pill ui-pill">{about.eyebrow}</span>
              <h2 className="type-section-title">{about.heading}</h2>
              <p>{about.introduction}</p>
              <p className="storage-bridge ui-bridge">{about.bridge}</p>
              <p>{about.detail}</p>
              <p>{about.conclusion}</p>
              <a href="#contact">{about.actionLabel}</a>
            </div>
          </section>
        </ObjectBoundary>
        <section id="reviews" className="storage-section ui-section storage-reviews ui-reviews">
          <ObjectBoundary id="storage.reviews.header" value={reviewsHeader}>
            <SectionHeading value={reviewsHeader} />
            <ReviewRating />
          </ObjectBoundary>
          <CollectionBoundary
            id="storage.reviews.platforms"
            value={reviews}
            renderItem={(item) => {
              const review = storageReviewPlatformSchema.parse(item);
              return (
                <ReviewPlatformCard
                  actionLabel="Review on"
                  description={review.description}
                  externalUrl={review.externalUrl}
                  name={review.name}
                  unavailableLabel="Review link coming soon"
                />
              );
            }}
          />
          <ObjectBoundary id="storage.reviews.footer" value={reviewsFooter}>
            <p className="storage-review-footer ui-review-footer">
              {reviewsFooter.message}{' '}
              <a href={`mailto:${reviewsFooter.email}`}>{reviewsFooter.email}</a> — we read every
              message.
            </p>
          </ObjectBoundary>
        </section>
        <section
          id="contact"
          className="storage-section ui-section storage-contact ui-contact ui-align-start"
        >
          <div>
            <ObjectBoundary id="storage.contact.header" value={contactHeader}>
              <SectionHeading value={contactHeader} />
            </ObjectBoundary>
            <ObjectBoundary id="storage.contact.details" value={contact}>
              <div className="storage-contact-details ui-contact-details">
                <div>
                  <MapPin />
                  <p>
                    <strong>Office Location</strong>
                    {contact.address}
                  </p>
                </div>
                <div>
                  <Phone />
                  <p>
                    <strong>Phone</strong>
                    <a href={`tel:${contact.phone.replace(/\D/g, '')}`}>{contact.phone}</a>
                    <small>Fax: {contact.fax}</small>
                  </p>
                </div>
                <div>
                  <Mail />
                  <p>
                    <strong>Email</strong>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </p>
                </div>
                <div>
                  <Clock />
                  <p>
                    <strong>Office Hours</strong>
                    {contact.officeHours}
                  </p>
                </div>
              </div>
            </ObjectBoundary>
          </div>
          <StorageContactForm />
        </section>
      </main>
      <footer className="storage-footer ui-footer ui-align-start">
        <div className="storage-footer-grid ui-footer-grid">
          <ObjectBoundary id="storage.footer.brand" value={footerBrand}>
            <div>
              <img
                src={managedImage(footerBrand.logo.key, storageLogo)}
                alt={footerBrand.logoAltText}
              />
              <p>{footerBrand.description}</p>
              <address>
                {footerBrand.address}
                <a href={`tel:${footerBrand.phone.replace(/\D/g, '')}`}>{footerBrand.phone}</a>
                <a href={`mailto:${footerBrand.email}`}>{footerBrand.email}</a>
              </address>
            </div>
          </ObjectBoundary>
          <div>
            <h3 className="type-footer-title">Quick Links</h3>
            <CollectionBoundary
              id="storage.footer.links"
              value={footerLinks}
              renderItem={(item) => {
                const link = storageFooterLinkSchema.parse(item);
                return (
                  <a className="storage-footer-link ui-footer-link" href={anchor(link.destination)}>
                    {link.label}
                  </a>
                );
              }}
            />
          </div>
          <div id="features">
            <h3 className="type-footer-title">Branding Options</h3>
            <CollectionBoundary
              id="storage.footer.branding-options"
              value={branding}
              renderItem={(item) => (
                <span className="storage-branding-option ui-branding-option">
                  {storageFooterBrandingOptionsSchema.element.parse(item).label}
                </span>
              )}
            />
          </div>
        </div>
        <ObjectBoundary id="storage.footer.legal" value={legal}>
          <small>
            © {new Date().getFullYear()} {legal.organizationName}. {legal.rightsNotice}
          </small>
        </ObjectBoundary>
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function StorageSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="storage">
      <StorageBody />
    </EditModeProvider>
  );
}

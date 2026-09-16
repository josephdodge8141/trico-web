import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Handshake,
  Home,
  Landmark,
  Mail,
  Map,
  MapPin,
  Menu,
  Mountain,
  Phone,
  Shield,
  Target,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  developmentAboutHighlightSchema,
  developmentAboutHighlightsSchema,
  developmentAboutSchema,
  developmentAboutValueSchema,
  developmentAboutValuesSchema,
  developmentAnniversaryBannerSchema,
  developmentContactDetailsSchema,
  developmentContactHeaderSchema,
  developmentEntityDefinitions,
  developmentFeaturedProjectSchema,
  developmentFooterBrandSchema,
  developmentFooterLegalSchema,
  developmentFooterLinkSchema,
  developmentFooterLinksSchema,
  developmentFooterServiceAreasSchema,
  developmentHeaderSchema,
  developmentHeroSchema,
  developmentHeroStatSchema,
  developmentHeroStatsSchema,
  developmentLandExpertsHeaderSchema,
  developmentLandExpertsServicesSchema,
  developmentLandExpertsStatsSchema,
  developmentLandServiceSchema,
  developmentPartnerSchema,
  developmentPartnersFooterSchema,
  developmentPartnersHeaderSchema,
  developmentPartnersItemsSchema,
  developmentProjectCategorySchema,
  developmentProjectsCategoriesSchema,
  developmentProjectsFeaturedSchema,
  developmentReviewPlatformSchema,
  developmentReviewsFooterSchema,
  developmentReviewsHeaderSchema,
  developmentReviewsPlatformsSchema,
  developmentServiceSchema,
  developmentServicesHeaderSchema,
  developmentServicesItemsSchema,
  developmentTeamHeaderSchema,
  developmentTeamMemberSchema,
  developmentTeamMembersSchema,
  developmentTrustStatSchema,
  developmentV2SeedData,
  editableValueSchema,
  type EditableValue,
  type PageContent,
  type SemanticEntityDefinition,
} from '@app/schemas';

import brookePhoto from '../assets/images/brooke-moore.jpeg';
import featuredOne from '../assets/images/real-estate-property-1.jpeg';
import featuredTwo from '../assets/images/real-estate-property-2.jpeg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import stevePhoto from '../assets/images/steve-tripp.png';
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
import { DevelopmentContactForm } from './DevelopmentContactForm.js';
import { parseDevelopmentValue } from './developmentContent.js';

type DevelopmentEntityId = (typeof developmentEntityDefinitions)[number]['id'];
const icons: Readonly<Record<string, LucideIcon>> = {
  ...contentIconComponents,
  Map,
  MapPin,
  FileText,
  Building2,
  Home,
  Landmark,
  Mountain,
  TrendingUp,
  Compass,
  Target,
  Shield,
};
const images: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/steve-tripp.png': stevePhoto,
  'media/seed/randy-rimmer.png': randyPhoto,
  'media/seed/brooke-moore.jpeg': brookePhoto,
  'media/seed/real-estate-property-1.jpeg': featuredOne,
  'media/seed/real-estate-property-2.jpeg': featuredTwo,
};
const managedImage = (key: string, fallback: string): string =>
  images[key] ??
  (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback);
const profileImageSource = (key: string): string | undefined =>
  images[key] ??
  (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : undefined);
const anchor = (destination: string) => `#${destination}`;
function definition(id: DevelopmentEntityId): SemanticEntityDefinition {
  const found = developmentEntityDefinitions.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Development editor definition missing for ${id}`);
  return found;
}
function ownership(
  id: DevelopmentEntityId,
  editing: ReturnType<typeof useEditMode>,
): EditorOwnership {
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
  readonly id: DevelopmentEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <div
      className={`dev-entity-slot ui-entity-slot${id === 'development.hero' ? ' dev-hero-entity-slot ui-hero-entity-slot' : ''}`}
      data-development-entity-boundary="true"
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
  readonly id: DevelopmentEntityId;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <div
      className="dev-entity-slot ui-entity-slot dev-collection-slot ui-collection-slot"
      data-development-entity-boundary="true"
    >
      <EditableCollection
        active={editing.active}
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

function DevelopmentBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<PageContent>({});
  const [fallback, setFallback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('development', { signal: controller.signal })
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
    id: keyof typeof developmentV2SeedData,
    parser: { parse(value: unknown): Output },
  ): Output => parseDevelopmentValue(document, id, parser);
  const banner = value('development.anniversary-banner', developmentAnniversaryBannerSchema);
  const header = value('development.header', developmentHeaderSchema);
  const hero = value('development.hero', developmentHeroSchema);
  const heroStats = value('development.hero.stats', developmentHeroStatsSchema);
  const landHeader = value('development.land-experts.header', developmentLandExpertsHeaderSchema);
  const landServices = value(
    'development.land-experts.services',
    developmentLandExpertsServicesSchema,
  );
  const landStats = value('development.land-experts.stats', developmentLandExpertsStatsSchema);
  const servicesHeader = value('development.services.header', developmentServicesHeaderSchema);
  const services = value('development.services.items', developmentServicesItemsSchema);
  const categories = value('development.projects.categories', developmentProjectsCategoriesSchema);
  const featured = value('development.projects.featured', developmentProjectsFeaturedSchema);
  const partnersHeader = value('development.partners.header', developmentPartnersHeaderSchema);
  const partners = value('development.partners.items', developmentPartnersItemsSchema);
  const partnersFooter = value('development.partners.footer', developmentPartnersFooterSchema);
  const teamHeader = value('development.team.header', developmentTeamHeaderSchema);
  const team = value('development.team.members', developmentTeamMembersSchema);
  const about = value('development.about', developmentAboutSchema);
  const highlights = value('development.about.highlights', developmentAboutHighlightsSchema);
  const values = value('development.about.values', developmentAboutValuesSchema);
  const reviewsHeader = value('development.reviews.header', developmentReviewsHeaderSchema);
  const reviews = value('development.reviews.platforms', developmentReviewsPlatformsSchema);
  const reviewsFooter = value('development.reviews.footer', developmentReviewsFooterSchema);
  const contactHeader = value('development.contact.header', developmentContactHeaderSchema);
  const contact = value('development.contact.details', developmentContactDetailsSchema);
  const footerBrand = value('development.footer.brand', developmentFooterBrandSchema);
  const footerLinks = value('development.footer.links', developmentFooterLinksSchema);
  const serviceAreas = value(
    'development.footer.service-areas',
    developmentFooterServiceAreasSchema,
  );
  const footerLegal = value('development.footer.legal', developmentFooterLegalSchema);
  return (
    <div className="dev-page ui-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <ObjectBoundary id="development.anniversary-banner" value={banner}>
        <div className="dev-anniversary ui-anniversary">
          <i />
          <strong>{banner.message}</strong>
          <span>•</span>
          <small>{banner.years}</small>
          <i />
        </div>
      </ObjectBoundary>
      <ObjectBoundary id="development.header" value={header}>
        <header className="dev-header ui-header">
          <div className="dev-container ui-container dev-header-inner ui-header-inner">
            <Link className="dev-brand ui-brand" to="/">
              <img src={managedImage(header.logo.key, tricoLogo)} alt={header.logoAltText} />
              <strong>{header.divisionLabel}</strong>
            </Link>
            <nav>
              {header.navLinks.map((link) => (
                <a href={anchor(link.destination)} key={link.id}>
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="dev-header-actions ui-header-actions">
              <a href={`tel:${header.phone.replace(/\D/g, '')}`}>
                <Phone /> {header.phone}
              </a>
              <a className="dev-button ui-button dev-primary ui-primary" href="#contact">
                {header.actionLabel}
              </a>
            </div>
            <button
              className="dev-menu-button ui-menu-button"
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
          {menuOpen ? (
            <nav className="dev-mobile-menu ui-mobile-menu">
              {header.navLinks.map((link) => (
                <a href={anchor(link.destination)} key={link.id} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
        </header>
      </ObjectBoundary>
      {fallback ? (
        <div className="content-notice" role="status">
          Showing the checked-in site content while published content is unavailable.
        </div>
      ) : null}
      <main id="main-content">
        <ObjectBoundary id="development.hero" value={hero}>
          <section className="dev-hero ui-hero">
            <div className="dev-container ui-container dev-hero-inner ui-hero-inner">
              <span className="dev-pill ui-pill">
                <Mountain /> {hero.eyebrow}
              </span>
              <h1 className="type-display">
                {hero.heading} <em>{hero.highlightedWord}</em>
              </h1>
              <p>{hero.description}</p>
              <div className="dev-actions ui-actions">
                <a className="dev-button ui-button dev-primary ui-primary" href="#projects">
                  {hero.primaryActionLabel} <ArrowRight />
                </a>
                <a className="dev-button ui-button dev-outline ui-outline" href="#contact">
                  {hero.secondaryActionLabel}
                </a>
              </div>
              <div className="dev-stats ui-stats">
                <CollectionBoundary
                  id="development.hero.stats"
                  value={heroStats}
                  renderItem={(item) => {
                    const stat = developmentHeroStatSchema.parse(item);
                    const Icon = icons[stat.icon] ?? Map;
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
            </div>
          </section>
        </ObjectBoundary>

        <section id="services" className="dev-section ui-section dev-tint ui-tint">
          <div className="dev-container ui-container">
            <ObjectBoundary id="development.land-experts.header" value={landHeader}>
              <header className="dev-heading ui-heading">
                <span className="dev-pill ui-pill">
                  <Mountain /> {landHeader.eyebrow}
                </span>
                <h2 className="type-section-title">{landHeader.heading}</h2>
                <p>{landHeader.description}</p>
              </header>
            </ObjectBoundary>
            <div className="dev-land-grid ui-land-grid">
              <CollectionBoundary
                id="development.land-experts.services"
                value={landServices}
                renderItem={(item) => {
                  const service = developmentLandServiceSchema.parse(item);
                  const Icon = icons[service.icon] ?? MapPin;
                  return (
                    <article className="dev-land-card ui-land-card">
                      <Icon />
                      <h3 className="type-card-title">{service.title}</h3>
                      <p>{service.description}</p>
                    </article>
                  );
                }}
              />
            </div>
            <div className="dev-trust ui-trust">
              <CollectionBoundary
                id="development.land-experts.stats"
                value={landStats}
                renderItem={(item) => {
                  const stat = developmentTrustStatSchema.parse(item);
                  const Icon = icons[stat.icon] ?? TrendingUp;
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
          </div>
        </section>

        <section id="projects" className="dev-section ui-section">
          <div className="dev-container ui-container">
            <ObjectBoundary id="development.services.header" value={servicesHeader}>
              <header className="dev-heading ui-heading">
                <span className="dev-pill ui-pill ui-section-eyebrow">
                  {servicesHeader.eyebrow}
                </span>
                <h2 className="type-section-title type-section-title-large">
                  {servicesHeader.heading}
                </h2>
                <p>{servicesHeader.description}</p>
              </header>
            </ObjectBoundary>
            <div className="dev-service-grid ui-service-grid">
              <CollectionBoundary
                id="development.services.items"
                value={services}
                renderItem={(item) => {
                  const service = developmentServiceSchema.parse(item);
                  const Icon = icons[service.icon] ?? Building2;
                  return (
                    <article className="dev-card ui-card">
                      <Icon />
                      <h3 className="type-card-title">{service.title}</h3>
                      <p>{service.description}</p>
                    </article>
                  );
                }}
              />
            </div>
            <h3 className="dev-subheading ui-subheading">{servicesHeader.projectsHeading}</h3>
            <div className="dev-category-grid ui-category-grid">
              <CollectionBoundary
                id="development.projects.categories"
                value={categories}
                renderItem={(item) => {
                  const category = developmentProjectCategorySchema.parse(item);
                  const Icon = icons[category.icon] ?? Building2;
                  return (
                    <article className="dev-category ui-category">
                      <Icon />
                      <strong>{category.count}</strong>
                      <h3 className="type-card-title type-card-title-lg">{category.title}</h3>
                      <p>{category.description}</p>
                      <button className="dev-button ui-button dev-outline-gold ui-outline-gold">
                        {category.buttonLabel}
                      </button>
                    </article>
                  );
                }}
              />
            </div>
            <h3 className="dev-subheading ui-subheading">{servicesHeader.featuredHeading}</h3>
            <div className="dev-featured-grid ui-featured-grid">
              <CollectionBoundary
                id="development.projects.featured"
                value={featured}
                renderItem={(item) => {
                  const project = developmentFeaturedProjectSchema.parse(item);
                  return (
                    <article>
                      <img
                        src={managedImage(project.image.key, featuredOne)}
                        alt={project.imageAltText}
                      />
                      <div>
                        <span>{project.type}</span>
                        <h3 className="type-card-title">{project.title}</h3>
                        <p>{project.location}</p>
                      </div>
                    </article>
                  );
                }}
              />
            </div>
          </div>
        </section>

        <section className="dev-section ui-section dev-partners ui-partners">
          <div className="dev-container ui-container">
            <ObjectBoundary id="development.partners.header" value={partnersHeader}>
              <header className="dev-heading ui-heading">
                <span className="dev-pill ui-pill dev-pill-blue ui-pill-blue">
                  <Handshake /> {partnersHeader.eyebrow}
                </span>
                <h2 className="type-section-title type-section-title-compact">
                  {partnersHeader.heading}
                </h2>
                <p>{partnersHeader.description}</p>
              </header>
            </ObjectBoundary>
            <div className="dev-partner-grid ui-partner-grid">
              <CollectionBoundary
                id="development.partners.items"
                value={partners}
                renderItem={(item) => <div>{developmentPartnerSchema.parse(item).name}</div>}
              />
            </div>
            <ObjectBoundary id="development.partners.footer" value={partnersFooter}>
              <p className="dev-partner-footer ui-partner-footer">
                {partnersFooter.message} <a href="#contact">{partnersFooter.actionLabel}</a>.
              </p>
            </ObjectBoundary>
          </div>
        </section>

        <section id="team" className="dev-section ui-section dev-tint ui-tint">
          <div className="dev-container ui-container">
            <ObjectBoundary id="development.team.header" value={teamHeader}>
              <header className="dev-heading ui-heading">
                <span className="dev-pill ui-pill ui-section-eyebrow">{teamHeader.eyebrow}</span>
                <h2 className="type-section-title">{teamHeader.heading}</h2>
                <p>{teamHeader.description}</p>
              </header>
            </ObjectBoundary>
            <div className="dev-team-grid ui-team-grid">
              <CollectionBoundary
                id="development.team.members"
                value={team}
                renderItem={(item) => {
                  const member = developmentTeamMemberSchema.parse(item);
                  return (
                    <ProfileCard
                      description={member.bio}
                      imageAltText={member.imageAltText}
                      imageSource={profileImageSource(member.image.key)}
                      name={member.name}
                      role={member.role}
                    />
                  );
                }}
              />
            </div>
          </div>
        </section>

        <section id="about" className="dev-section ui-section">
          <div className="dev-container ui-container dev-about-grid ui-about-grid">
            <div>
              <ObjectBoundary id="development.about" value={about}>
                <span className="dev-pill ui-pill ui-section-eyebrow">{about.eyebrow}</span>
                <h2 className="type-section-title">{about.heading}</h2>
                <p>{about.introduction}</p>
                <p>{about.detail}</p>
              </ObjectBoundary>
              <div
                className="dev-highlights ui-highlights"
                role="list"
                aria-label="Development highlights"
              >
                <CollectionBoundary
                  id="development.about.highlights"
                  value={highlights}
                  renderItem={(item) => {
                    const highlight = developmentAboutHighlightSchema.parse(item);
                    return (
                      <div role="listitem">
                        <CheckCircle2 /> {highlight.value}
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="dev-values ui-values">
              <CollectionBoundary
                id="development.about.values"
                value={values}
                renderItem={(item) => {
                  const companyValue = developmentAboutValueSchema.parse(item);
                  const Icon = icons[companyValue.icon] ?? Target;
                  return (
                    <article>
                      <Icon />
                      <div>
                        <h3 className="type-card-title type-card-title-sm">{companyValue.title}</h3>
                        <p>{companyValue.description}</p>
                      </div>
                    </article>
                  );
                }}
              />
            </div>
          </div>
        </section>

        <section id="reviews" className="dev-section ui-section dev-reviews ui-reviews">
          <div className="dev-container ui-container">
            <ObjectBoundary id="development.reviews.header" value={reviewsHeader}>
              <header className="dev-heading ui-heading">
                <span className="dev-pill ui-pill">{reviewsHeader.eyebrow}</span>
                <h2 className="type-section-title">{reviewsHeader.heading}</h2>
                <p>{reviewsHeader.description}</p>
                <ReviewRating />
              </header>
            </ObjectBoundary>
            <div className="dev-review-grid ui-review-grid">
              <CollectionBoundary
                id="development.reviews.platforms"
                value={reviews}
                renderItem={(item) => {
                  const review = developmentReviewPlatformSchema.parse(item);
                  return (
                    <ReviewPlatformCard
                      actionLabel={reviewsHeader.actionLabel}
                      description={review.description}
                      externalUrl={review.externalUrl}
                      name={review.name}
                      unavailableLabel={reviewsHeader.unavailableLinkLabel}
                    />
                  );
                }}
              />
            </div>
            <ObjectBoundary id="development.reviews.footer" value={reviewsFooter}>
              <p className="dev-review-footer ui-review-footer">
                {reviewsFooter.message}{' '}
                <a href={`mailto:${reviewsFooter.email}`}>{reviewsFooter.email}</a>.
              </p>
            </ObjectBoundary>
          </div>
        </section>

        <section
          id="contact"
          className="dev-section ui-section dev-contact ui-contact ui-align-start"
        >
          <div className="dev-container ui-container dev-contact-grid ui-contact-grid">
            <div>
              <ObjectBoundary id="development.contact.header" value={contactHeader}>
                <span className="dev-pill ui-pill ui-section-eyebrow">{contactHeader.eyebrow}</span>
                <h2 className="type-section-title">{contactHeader.heading}</h2>
                <p>{contactHeader.description}</p>
              </ObjectBoundary>
              <ObjectBoundary id="development.contact.details" value={contact}>
                <div className="dev-contact-list ui-contact-list">
                  <div>
                    <MapPin />
                    <p>
                      <strong>{contact.locationLabel}</strong>
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
              </ObjectBoundary>
            </div>
            <DevelopmentContactForm />
          </div>
        </section>
      </main>
      <footer className="dev-footer ui-footer ui-align-start">
        <div className="dev-container ui-container dev-footer-grid ui-footer-grid">
          <ObjectBoundary id="development.footer.brand" value={footerBrand}>
            <div>
              <img
                src={managedImage(footerBrand.logo.key, tricoLogo)}
                alt={footerBrand.logoAltText}
              />
              <b>{footerBrand.divisionLabel}</b>
              <p>{footerBrand.description}</p>
              <span>
                <MapPin /> {footerBrand.address}
              </span>
              <span>
                <Phone /> {footerBrand.phone}
              </span>
              <span>
                <Mail /> {footerBrand.email}
              </span>
            </div>
          </ObjectBoundary>
          <div>
            <h3 className="type-footer-title">{footerBrand.linksHeading}</h3>
            <CollectionBoundary
              id="development.footer.links"
              value={footerLinks}
              renderItem={(item) => {
                const link = developmentFooterLinkSchema.parse(item);
                return <a href={anchor(link.destination)}>{link.label}</a>;
              }}
            />
          </div>
          <div>
            <h3 className="type-footer-title">{footerBrand.serviceAreasHeading}</h3>
            <CollectionBoundary
              id="development.footer.service-areas"
              value={serviceAreas}
              renderItem={(item) => (
                <p>{developmentFooterServiceAreasSchema.element.parse(item).label}</p>
              )}
            />
          </div>
        </div>
        <ObjectBoundary id="development.footer.legal" value={footerLegal}>
          <p className="dev-copyright ui-copyright">
            © {new Date().getFullYear()} {footerLegal.organizationName}. {footerLegal.rightsNotice}
          </p>
        </ObjectBoundary>
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function DevelopmentSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="development">
      <DevelopmentBody />
    </EditModeProvider>
  );
}

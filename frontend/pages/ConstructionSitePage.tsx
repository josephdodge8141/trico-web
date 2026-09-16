import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Boxes,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  HardHat,
  Home,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  Shield,
  Shovel,
  TrendingUp,
  Users,
  Warehouse,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  constructionAboutFeaturesSchema,
  constructionAboutSchema,
  constructionAnniversaryBannerSchema,
  constructionBidHeaderSchema,
  constructionCareerBenefitsSchema,
  constructionCareersHeaderSchema,
  constructionContactDetailsSchema,
  constructionContactHeaderSchema,
  constructionEntityDefinitions,
  constructionFooterBrandSchema,
  constructionFooterLegalSchema,
  constructionFooterLicensesSchema,
  constructionFooterLinksSchema,
  constructionHeaderSchema,
  constructionHeroSchema,
  constructionHeroStatsSchema,
  constructionPlanRoomAccessSchema,
  constructionPlanRoomHeaderSchema,
  constructionPlanRoomRequestSchema,
  constructionPlanSetsSchema,
  constructionPositionsSchema,
  constructionProjectCategorySchema,
  constructionProjectsHeaderSchema,
  constructionProsHeaderSchema,
  constructionProsItemsSchema,
  constructionProStatsSchema,
  constructionReviewPlatformsSchema,
  constructionReviewsFooterSchema,
  constructionReviewsHeaderSchema,
  constructionServicesHeaderSchema,
  constructionServicesItemsSchema,
  constructionTeamHeaderSchema,
  constructionTeamMembersSchema,
  constructionV2SeedData,
  constructionWorkersSchema,
  editableValueSchema,
  type EditableValue,
  type PageContent,
  type SemanticEntityDefinition,
} from '@app/schemas';

import cayliePhoto from '../assets/images/caylie-disney.jpg';
import crewOne from '../assets/images/construction-crew-1.jpg';
import crewTwo from '../assets/images/construction-crew-2.jpg';
import katiePhoto from '../assets/images/katie-thompson.jpg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import tricoLogo from '../assets/images/trico-logo.png';
import { EditableBoundary, type EditorOwnership } from '../components/EditableBoundary.js';
import { EditableCollection } from '../components/EditableCollection.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { ReviewPlatformCard, ReviewRating } from '../components/ReviewPlatformCard.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { parseConstructionValue } from './constructionContent.js';

type ConstructionEntityId = (typeof constructionEntityDefinitions)[number]['id'];
const categorySlugs = [
  'multi-family',
  'retail',
  'office-ti',
  'medical-dental',
  'industrial',
  'storage',
  'subdivisions',
  'underground',
] as const;
const icons: Readonly<Record<string, LucideIcon>> = {
  ...contentIconComponents,
  ArrowRight,
  Award,
  Boxes,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  HardHat,
  Home,
  Lock,
  Shield,
  Shovel,
  TrendingUp,
  Users,
  Warehouse,
  Wrench,
};
const images: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/construction-crew-1.jpg': crewOne,
  'media/seed/construction-crew-2.jpg': crewTwo,
  'media/seed/randy-rimmer.png': randyPhoto,
  'media/seed/katie-thompson.jpg': katiePhoto,
  'media/seed/caylie-disney.jpg': cayliePhoto,
};
const constructionImage = (key: string, fallback: string): string =>
  images[key] ??
  (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback);

function definition(id: ConstructionEntityId): SemanticEntityDefinition {
  const found = constructionEntityDefinitions.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Construction editor definition missing for ${id}`);
  return found;
}
function ownership(
  id: ConstructionEntityId,
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
  readonly id: ConstructionEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <div
      className={`co-entity-slot ui-entity-slot${id === 'construction.hero' ? ' co-hero-entity-slot ui-hero-entity-slot' : ''}`}
      data-construction-entity-boundary="true"
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
  readonly id: ConstructionEntityId;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <div
      className="co-entity-slot ui-entity-slot"
      data-construction-entity-boundary="true"
      data-entity-boundary="true"
    >
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

function Heading({
  eyebrow,
  title,
  copy,
  titleClassName = '',
  headingClassName = '',
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly copy: string;
  readonly titleClassName?: string;
  readonly headingClassName?: string;
}): React.JSX.Element {
  return (
    <header className={`co-heading ui-heading ${headingClassName}`}>
      <span>{eyebrow}</span>
      <h2 className={`type-section-title ${titleClassName}`}>{title}</h2>
      <p>{copy}</p>
    </header>
  );
}

function ClientForm({ variant }: { readonly variant: 'bid' | 'contact' }): React.JSX.Element {
  const [sent, setSent] = useState(false);
  const isBid = variant === 'bid';
  return (
    <form
      className={`co-form ui-form ui-client-form ${isBid ? 'ui-form-layout--wide' : 'ui-form-layout--standard'}`}
      onSubmit={(event) => {
        event.preventDefault();
        event.currentTarget.reset();
        setSent(true);
      }}
    >
      <div className="co-form-row ui-form-row">
        <label>
          {isBid ? 'Your Name' : 'First Name'} *
          <input required name="firstName" placeholder={isBid ? 'John Smith' : 'John'} />
        </label>
        <label>
          {isBid ? 'Company Name' : 'Last Name'}
          {isBid ? '' : ' *'}
          <input
            required={!isBid}
            name="lastName"
            placeholder={isBid ? 'ABC Development LLC' : 'Doe'}
          />
        </label>
      </div>
      <div className="co-form-row ui-form-row">
        <label>
          Email *<input required type="email" name="email" placeholder="john@example.com" />
        </label>
        <label>
          Phone *<input required type="tel" name="phone" placeholder="(801) 555-1234" />
        </label>
      </div>
      {isBid ? (
        <>
          <label>
            Project Location *<input required name="location" placeholder="City, State" />
          </label>
          <label>
            Project Type *
            <select required name="projectType" defaultValue="">
              <option value="" disabled>
                Select project type...
              </option>
              <option>Concrete Work</option>
              <option>Multi-Housing Development</option>
              <option>Underground Utilities</option>
              <option>Excavation</option>
              <option>Office Construction/Remodel</option>
              <option>Storage Facility</option>
              <option>Other</option>
            </select>
          </label>
        </>
      ) : (
        <label>
          Project Type
          <input name="projectType" placeholder="Concrete, Multi-Housing, Commercial" />
        </label>
      )}
      <label>
        {isBid ? 'Project Description *' : 'Project Details'}
        <textarea
          required={isBid}
          name="message"
          rows={isBid ? 5 : 4}
          placeholder="Tell us about your construction project..."
        />
      </label>
      <button
        className={`co-button ui-button co-button-gold ui-button-gold ui-submit-action ${isBid ? 'ui-submit-action--intrinsic' : 'ui-submit-action--full'}`}
        type="submit"
      >
        {isBid ? 'Request Your Bid' : 'Get Quote'} <ArrowRight aria-hidden="true" />
      </button>
      {sent ? (
        <p className="co-form-success ui-form-success" role="status">
          Thank you. A construction specialist will contact you soon.
        </p>
      ) : null}
    </form>
  );
}

function ConstructionBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<PageContent>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('construction', { signal: controller.signal })
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
    id: keyof typeof constructionV2SeedData,
    parser: { parse(value: unknown): Output },
  ): Output => parseConstructionValue(document, id, parser);
  const banner = value('construction.anniversary-banner', constructionAnniversaryBannerSchema);
  const header = value('construction.header', constructionHeaderSchema);
  const hero = value('construction.hero', constructionHeroSchema);
  const heroStats = value('construction.hero.stats', constructionHeroStatsSchema);
  const servicesHeader = value('construction.services.header', constructionServicesHeaderSchema);
  const services = value('construction.services.items', constructionServicesItemsSchema);
  const currentHeader = value(
    'construction.current-projects.header',
    constructionProjectsHeaderSchema,
  );
  const completedHeader = value(
    'construction.completed-projects.header',
    constructionProjectsHeaderSchema,
  );
  const planHeader = value('construction.plan-room.header', constructionPlanRoomHeaderSchema);
  const planAccess = value(
    'construction.plan-room.access-notice',
    constructionPlanRoomAccessSchema,
  );
  const plans = value('construction.plan-room.plan-sets', constructionPlanSetsSchema);
  const planRequest = value(
    'construction.plan-room.request-access',
    constructionPlanRoomRequestSchema,
  );
  const prosHeader = value('construction.pros.header', constructionProsHeaderSchema);
  const pros = value('construction.pros.items', constructionProsItemsSchema);
  const proStats = value('construction.pros.stats', constructionProStatsSchema);
  const teamHeader = value('construction.team.header', constructionTeamHeaderSchema);
  const team = value('construction.team.members', constructionTeamMembersSchema);
  const workers = value('construction.workers', constructionWorkersSchema);
  const about = value('construction.about', constructionAboutSchema);
  const aboutFeatures = value('construction.about.features', constructionAboutFeaturesSchema);
  const bidHeader = value('construction.bid.header', constructionBidHeaderSchema);
  const careersHeader = value('construction.careers.header', constructionCareersHeaderSchema);
  const benefits = value('construction.careers.benefits', constructionCareerBenefitsSchema);
  const positions = value('construction.careers.open-positions', constructionPositionsSchema);
  const reviewsHeader = value('construction.reviews.header', constructionReviewsHeaderSchema);
  const reviews = value('construction.reviews.platforms', constructionReviewPlatformsSchema);
  const reviewsFooter = value('construction.reviews.footer', constructionReviewsFooterSchema);
  const contactHeader = value('construction.contact.header', constructionContactHeaderSchema);
  const contact = value('construction.contact.details', constructionContactDetailsSchema);
  const footerBrand = value('construction.footer.brand', constructionFooterBrandSchema);
  const footerLinks = value('construction.footer.links', constructionFooterLinksSchema);
  const footerLicenses = value('construction.footer.licenses', constructionFooterLicensesSchema);
  const footerLegal = value('construction.footer.legal', constructionFooterLegalSchema);
  return (
    <div className="co-page ui-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <ObjectBoundary id="construction.anniversary-banner" value={banner}>
        <div className="co-anniversary ui-anniversary">
          ✦ <strong>{banner.message}</strong> ✦
        </div>
      </ObjectBoundary>
      <ObjectBoundary id="construction.header" value={header}>
        <header className="co-header ui-header">
          <div className="co-container ui-container co-header-inner ui-header-inner">
            <Link className="co-brand ui-brand" to="/">
              <img src={constructionImage(header.logo.key, tricoLogo)} alt={header.logoAltText} />
              <strong>{header.divisionLabel}</strong>
            </Link>
            <nav aria-label="Primary navigation">
              {header.navLinks.map((item) => (
                <a key={item.id} href={`#${item.destination}`}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="co-header-actions ui-header-actions">
              <a href={`tel:${header.phone.replace(/[^\d+]/g, '')}`}>
                <Phone /> {header.phone}
              </a>
              <a className="co-button ui-button co-button-blue ui-button-blue" href="#contact">
                {header.actionLabel}
              </a>
            </div>
            <button
              className="co-menu ui-menu"
              type="button"
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
          {menuOpen ? (
            <nav className="co-mobile-nav ui-mobile-nav" aria-label="Mobile navigation">
              {header.navLinks.map((item) => (
                <a key={item.id} href={`#${item.destination}`} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>
              ))}
              <a href={`tel:${header.phone.replace(/[^\d+]/g, '')}`}>{header.phone}</a>
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
        <ObjectBoundary id="construction.hero" value={hero}>
          <section className="co-hero ui-hero ui-split-hero">
            <div className="co-container ui-container co-hero-grid ui-hero-grid">
              <div className="ui-hero-copy">
                <div className="co-pills ui-pills">
                  <span>
                    <HardHat /> {hero.primaryBadge}
                  </span>
                  <span>{hero.serviceAreaBadge}</span>
                </div>
                <h1 className="type-display">{hero.heading}</h1>
                <h2 className="type-hero-location">{hero.locationHeading}</h2>
                <h3 className="type-card-title">{hero.promise}</h3>
                <p>{hero.description}</p>
                <div className="co-actions ui-actions">
                  <a className="co-button ui-button co-button-gold ui-button-gold" href="#contact">
                    {hero.primaryActionLabel} <ArrowRight />
                  </a>
                  <a
                    className="co-button ui-button co-button-outline ui-button-outline"
                    href="#services"
                  >
                    {hero.secondaryActionLabel}
                  </a>
                </div>
                <div className="co-hero-stats ui-hero-stats">
                  <CollectionBoundary
                    id="construction.hero.stats"
                    value={heroStats}
                    renderItem={(item) => {
                      const stat = constructionHeroStatsSchema.element.parse(item);
                      const StatIcon = icons[stat.icon] ?? Building;
                      return (
                        <div>
                          <strong>
                            <StatIcon />
                            {stat.value}
                          </strong>
                          <span>{stat.label}</span>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
              <div
                className="division-hero-media ui-split-hero-media-gold"
                data-division-hero-media="true"
                data-media-state="available"
              >
                <img src={constructionImage(hero.image.key, crewOne)} alt={hero.imageAltText} />
              </div>
            </div>
          </section>
        </ObjectBoundary>

        <section className="co-section ui-section co-tint ui-tint ui-services" id="services">
          <div className="co-container ui-container">
            <ObjectBoundary id="construction.services.header" value={servicesHeader}>
              <Heading
                eyebrow={servicesHeader.eyebrow}
                title={servicesHeader.heading}
                copy={servicesHeader.description}
                titleClassName="type-section-title-large"
              />
            </ObjectBoundary>
            <div className="co-card-grid ui-card-grid ui-card-grid-fixed-rows">
              <CollectionBoundary
                id="construction.services.items"
                value={services}
                renderItem={(item) => {
                  const service = constructionServicesItemsSchema.element.parse(item);
                  const Icon = icons[service.icon] ?? Building2;
                  return (
                    <article className="co-card ui-card">
                      <i>
                        <Icon />
                      </i>
                      <h3 className="type-card-title">{service.title}</h3>
                      <p>{service.description}</p>
                    </article>
                  );
                }}
              />
            </div>
          </div>
        </section>

        {(['current', 'completed'] as const).map((status) => {
          const group = status === 'current' ? 'current-projects' : 'completed-projects';
          const prefix = `construction.${group}` as const;
          const sectionHeader = status === 'current' ? currentHeader : completedHeader;
          return (
            <section
              className={`co-section ui-section ${status === 'completed' ? 'co-soft ui-soft' : ''}`}
              id={status === 'current' ? 'projects' : 'completed-projects'}
              key={status}
            >
              <div className="co-container ui-container">
                <ObjectBoundary id={`${prefix}.header`} value={sectionHeader}>
                  <Heading
                    eyebrow={sectionHeader.eyebrow}
                    title={sectionHeader.heading}
                    copy={sectionHeader.description}
                  />
                </ObjectBoundary>
                <div className="co-sector-grid ui-sector-grid ui-sector-grid-compact">
                  {categorySlugs.map((slug) => {
                    const entityId = `${prefix}.category.${slug}` as ConstructionEntityId;
                    const category = value(entityId, constructionProjectCategorySchema);
                    return (
                      <ObjectBoundary key={slug} id={entityId} value={category}>
                        <Link
                          className="co-sector ui-sector"
                          to={`/construction/${status}/${slug}`}
                        >
                          <h3 className="type-card-title type-card-title-sm">{category.label}</h3>
                          <p>{category.blurb}</p>
                          <span>
                            {sectionHeader.cardActionLabel} <ArrowRight />
                          </span>
                        </Link>
                      </ObjectBoundary>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        <section className="co-section ui-section co-tint ui-tint" id="plan-room">
          <div className="co-container ui-container">
            <ObjectBoundary id="construction.plan-room.header" value={planHeader}>
              <Heading
                eyebrow={planHeader.eyebrow}
                title={planHeader.heading}
                copy={planHeader.description}
                titleClassName="type-section-title-large"
              />
            </ObjectBoundary>
            <ObjectBoundary id="construction.plan-room.access-notice" value={planAccess}>
              <div className="co-notice ui-notice">
                {(() => {
                  const Icon = icons[planAccess.icon] ?? Lock;
                  return <Icon />;
                })()}
                <div>
                  <h3 className="type-card-title">{planAccess.heading}</h3>
                  <p>{planAccess.description}</p>
                </div>
              </div>
            </ObjectBoundary>
            <h3 className="co-subheading ui-subheading">
              <FolderOpen /> {planHeader.planListHeading}
            </h3>
            <div className="co-plan-grid ui-plan-grid">
              <CollectionBoundary
                id="construction.plan-room.plan-sets"
                value={plans}
                renderItem={(item) => {
                  const plan = constructionPlanSetsSchema.element.parse(item);
                  return (
                    <article className="co-plan ui-plan">
                      <header>
                        <i>
                          <FileText />
                        </i>
                        <div>
                          <h3 className="type-card-title">{plan.name}</h3>
                          <small>{plan.projectNumber}</small>
                        </div>
                        <b>{plan.latestRevision}</b>
                      </header>
                      <p>
                        <Calendar /> {plan.lastUpdated} <FileText /> {plan.sheetCount} sheets
                      </p>
                      <div>
                        <button type="button">{planHeader.viewPlansLabel}</button>
                        <button type="button">
                          {planHeader.specificationsLabel} <ExternalLink />
                        </button>
                      </div>
                    </article>
                  );
                }}
              />
            </div>
            <ObjectBoundary id="construction.plan-room.request-access" value={planRequest}>
              <div className="co-plan-access ui-plan-access">
                <h3 className="type-card-title">{planRequest.heading}</h3>
                <p>{planRequest.description}</p>
                <a
                  className="co-button ui-button co-button-blue ui-button-blue"
                  href={`mailto:${planRequest.email}?subject=Plan%20Room%20Access%20Request`}
                >
                  {planRequest.actionLabel} <ArrowRight />
                </a>
              </div>
            </ObjectBoundary>
          </div>
        </section>

        <section className="co-section ui-section" id="pros">
          <div className="co-container ui-container">
            <ObjectBoundary id="construction.pros.header" value={prosHeader}>
              <Heading
                eyebrow={prosHeader.eyebrow}
                title={prosHeader.heading}
                copy={prosHeader.description}
                titleClassName="type-section-title-compact"
              />
            </ObjectBoundary>
            <div className="co-card-grid ui-card-grid ui-card-grid-fixed-rows ui-card-grid-roomy-start">
              <CollectionBoundary
                id="construction.pros.items"
                value={pros}
                renderItem={(item) => {
                  const pro = constructionProsItemsSchema.element.parse(item);
                  const Icon = icons[pro.icon] ?? Award;
                  return (
                    <article className="co-card ui-card">
                      <i className="co-blue-icon ui-blue-icon">
                        <Icon />
                      </i>
                      <h3 className="type-card-title">{pro.title}</h3>
                      <p>{pro.description}</p>
                    </article>
                  );
                }}
              />
            </div>
            <div className="co-pro-stats ui-pro-stats">
              <CollectionBoundary
                id="construction.pros.stats"
                value={proStats}
                renderItem={(item) => {
                  const stat = constructionProStatsSchema.element.parse(item);
                  return (
                    <div>
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </section>

        <section
          className="co-section ui-section ui-section-rhythm-compact co-soft ui-soft"
          id="team"
        >
          <div className="co-container ui-container">
            <ObjectBoundary id="construction.team.header" value={teamHeader}>
              <Heading
                eyebrow={teamHeader.eyebrow}
                title={teamHeader.heading}
                copy={teamHeader.description}
                headingClassName="ui-heading-plain"
              />
            </ObjectBoundary>
            <div className="co-team-grid ui-team-grid ui-profile-row-balanced">
              <CollectionBoundary
                id="construction.team.members"
                value={team}
                renderItem={(item) => {
                  const member = constructionTeamMembersSchema.element.parse(item);
                  return (
                    <article className="co-team-card ui-team-card">
                      <img
                        src={constructionImage(member.photo.key, tricoLogo)}
                        alt={member.photoAltText}
                      />
                      <h3 className="type-card-title">{member.name}</h3>
                      <strong>{member.title}</strong>
                      {member.email === '' ? null : (
                        <a href={`mailto:${member.email}`}>
                          <Mail />
                          {member.email}
                        </a>
                      )}
                      {member.phone === '' ? null : (
                        <a href={`tel:${member.phone.replace(/[^\d+]/g, '')}`}>
                          <Phone />
                          {member.phone}
                        </a>
                      )}
                    </article>
                  );
                }}
              />
            </div>
          </div>
        </section>

        <ObjectBoundary id="construction.workers" value={workers}>
          <section className="co-section ui-section ui-section-rhythm-compact co-workers ui-workers">
            <div className="co-container ui-container">
              <Heading
                eyebrow={workers.eyebrow}
                title={workers.heading}
                copy={workers.description}
                headingClassName="ui-heading-plain"
              />
              <img
                className="ui-media-frame-landscape"
                src={constructionImage(workers.image.key, crewTwo)}
                alt={workers.imageAltText}
              />
            </div>
          </section>
        </ObjectBoundary>

        <ObjectBoundary id="construction.about" value={about}>
          <section
            className="co-section ui-section co-about ui-about surface-brand-gradient-vivid"
            id="about"
          >
            <div className="co-container ui-container co-about-grid ui-about-grid">
              <div className="co-about-art ui-about-art ui-media-frame-feature-tall">
                <span>{about.brandLabel}</span>
                <small>{about.brandDescription}</small>
                <aside>
                  <strong>{about.statValue}</strong>
                  {about.statLabel}
                </aside>
              </div>
              <div>
                <span className="co-about-pill ui-about-pill weight-medium">{about.eyebrow}</span>
                <h2 className="type-section-title text-on-dark">{about.heading}</h2>
                <p>{about.introduction}</p>
                <p>{about.detail}</p>
                <div className="co-checks ui-checks">
                  <CollectionBoundary
                    id="construction.about.features"
                    value={aboutFeatures}
                    renderItem={(item) => {
                      const feature = constructionAboutFeaturesSchema.element.parse(item);
                      return (
                        <span>
                          <CheckCircle2 />
                          {feature.label}
                        </span>
                      );
                    }}
                  />
                </div>
                <a className="co-button ui-button co-button-gold ui-button-accent" href="#contact">
                  {about.actionLabel}
                </a>
              </div>
            </div>
          </section>
        </ObjectBoundary>

        <section className="co-section ui-section co-bid ui-bid" id="bid">
          <div className="co-container ui-container co-narrow ui-narrow">
            <ObjectBoundary id="construction.bid.header" value={bidHeader}>
              <Heading
                eyebrow={bidHeader.eyebrow}
                title={bidHeader.heading}
                copy={bidHeader.description}
                titleClassName="type-section-title-compact"
              />
            </ObjectBoundary>
            <div className="ui-form-surface ui-form-surface--wide ui-form-surface--on-dark">
              <ClientForm variant="bid" />
            </div>
          </div>
        </section>

        <section
          className="co-section ui-section co-careers ui-careers ui-align-start"
          id="careers"
        >
          <div className="co-container ui-container co-career-grid ui-career-grid">
            <div>
              <ObjectBoundary id="construction.careers.header" value={careersHeader}>
                <Heading
                  eyebrow={careersHeader.eyebrow}
                  title={careersHeader.heading}
                  copy={careersHeader.description}
                  titleClassName="type-section-title-compact"
                />
              </ObjectBoundary>
              <div className="co-benefits ui-benefits">
                <CollectionBoundary
                  id="construction.careers.benefits"
                  value={benefits}
                  renderItem={(item) => {
                    const benefit = constructionCareerBenefitsSchema.element.parse(item);
                    const Icon = icons[benefit.icon] ?? TrendingUp;
                    return (
                      <div>
                        <i>
                          <Icon />
                        </i>
                        <span>
                          <strong>{benefit.title}</strong>
                          <small>{benefit.description}</small>
                        </span>
                      </div>
                    );
                  }}
                />
              </div>
              <a
                className="co-button ui-button co-button-blue ui-button-blue"
                href={`mailto:${careersHeader.email}`}
              >
                {careersHeader.actionLabel} <ArrowRight />
              </a>
            </div>
            <aside className="co-positions ui-positions">
              <h3 className="type-card-title type-card-title-lg">
                {careersHeader.positionsHeading}
              </h3>
              <CollectionBoundary
                id="construction.careers.open-positions"
                value={positions}
                renderItem={(item) => {
                  const position = constructionPositionsSchema.element.parse(item);
                  return (
                    <div>
                      <strong>{position.title}</strong>
                      <span>{position.location}</span>
                    </div>
                  );
                }}
              />
            </aside>
          </div>
        </section>

        <section className="co-section ui-section co-reviews" id="reviews">
          <div className="co-container ui-container">
            <ObjectBoundary id="construction.reviews.header" value={reviewsHeader}>
              <Heading
                eyebrow={reviewsHeader.eyebrow}
                title={reviewsHeader.heading}
                copy={reviewsHeader.description}
              />
            </ObjectBoundary>
            <ReviewRating />
            <div className="co-review-grid ui-review-grid">
              <CollectionBoundary
                id="construction.reviews.platforms"
                value={reviews}
                renderItem={(item) => {
                  const review = constructionReviewPlatformsSchema.element.parse(item);
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
            </div>
            <ObjectBoundary id="construction.reviews.footer" value={reviewsFooter}>
              <p className="co-review-footer ui-review-footer">
                {reviewsFooter.message}{' '}
                <a href={`mailto:${reviewsFooter.email}`}>{reviewsFooter.email}</a>.
              </p>
            </ObjectBoundary>
          </div>
        </section>

        <section
          className="co-section ui-section co-contact ui-contact ui-align-start"
          id="contact"
        >
          <div className="co-container ui-container co-contact-grid ui-contact-grid ui-contact-grid-standard">
            <div>
              <ObjectBoundary id="construction.contact.header" value={contactHeader}>
                <Heading
                  eyebrow={contactHeader.eyebrow}
                  title={contactHeader.heading}
                  copy={contactHeader.description}
                />
              </ObjectBoundary>
              <ObjectBoundary id="construction.contact.details" value={contact}>
                <div className="co-contact-list ui-contact-list">
                  <p>
                    <i>
                      <MapPin />
                    </i>
                    <span>
                      <strong>{contact.addressLabel}</strong>
                      {contact.address.split('\n').map((line) => (
                        <span key={line}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </span>
                  </p>
                  <p>
                    <i>
                      <Phone />
                    </i>
                    <span>
                      <strong>{contact.phoneLabel}</strong>
                      <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}>{contact.phone}</a>
                      <small>
                        {contact.faxLabel}: {contact.fax}
                      </small>
                    </span>
                  </p>
                  <p>
                    <i>
                      <Mail />
                    </i>
                    <span>
                      <strong>{contact.emailLabel}</strong>
                      <a href={`mailto:${contact.email}`}>{contact.email}</a>
                    </span>
                  </p>
                  <p>
                    <i>
                      <Clock />
                    </i>
                    <span>
                      <strong>{contact.officeHoursLabel}</strong>
                      {contact.officeHours}
                    </span>
                  </p>
                </div>
              </ObjectBoundary>
            </div>
            <div className="co-contact-form ui-contact-form ui-form-surface ui-form-surface--standard">
              <h3 className="type-form-title">Request a Quote</h3>
              <ClientForm variant="contact" />
            </div>
          </div>
        </section>
      </main>
      <footer className="co-footer ui-footer ui-align-start ui-footer-rhythm">
        <div className="co-container ui-container co-footer-grid ui-footer-grid ui-footer-grid--standard">
          <ObjectBoundary id="construction.footer.brand" value={footerBrand}>
            <div>
              <img
                src={constructionImage(footerBrand.logo.key, tricoLogo)}
                alt={footerBrand.logoAltText}
              />
              <p>{footerBrand.description}</p>
              <address>
                {footerBrand.address}
                <br />
                <a href={`tel:${footerBrand.phone.replace(/[^\d+]/g, '')}`}>{footerBrand.phone}</a>
                <br />
                <a href={`mailto:${footerBrand.email}`}>{footerBrand.email}</a>
              </address>
            </div>
          </ObjectBoundary>
          <nav aria-label="Quick links">
            <h3 className="type-footer-title">Quick Links</h3>
            <CollectionBoundary
              id="construction.footer.links"
              value={footerLinks}
              renderItem={(item) => {
                const link = constructionFooterLinksSchema.element.parse(item);
                return <a href={`#${link.destination}`}>{link.label}</a>;
              }}
            />
          </nav>
          <ObjectBoundary id="construction.footer.licenses" value={footerLicenses}>
            <div>
              <h3 className="type-footer-title">{footerLicenses.heading}</h3>
              {footerLicenses.licenses.map((license) => (
                <p key={license.id}>{license.label}</p>
              ))}
            </div>
          </ObjectBoundary>
        </div>
        <ObjectBoundary id="construction.footer.legal" value={footerLegal}>
          <p className="co-legal ui-legal ui-footer-legal-rhythm">
            © {new Date().getFullYear()} {footerLegal.organizationName}. {footerLegal.rightsNotice}
          </p>
        </ObjectBoundary>
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function ConstructionSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="construction">
      <ConstructionBody />
    </EditModeProvider>
  );
}

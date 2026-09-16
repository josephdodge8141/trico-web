import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  HardHat,
  Heart,
  Home,
  MapPin,
  Mountain,
  Shield,
  Target,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  editableValueSchema,
  homeCareersOpenPositionsSchema,
  homeCoreValueItemSchema,
  homeDivisionItemSchema,
  homeEntityDefinitions,
  homeLeadershipMemberSchema,
  homeNewsItemSchema,
  homeTimelineItemSchema,
  type EditableValue,
  type HomeCareerPosition,
  type HomeCoreValueItem,
  type HomeDivisionItem,
  type HomeLeadershipMember,
  type HomeNewsItem,
  type HomeTimelineItem,
  type SemanticEntityDefinition,
} from '@app/schemas';

import amberLambornPhoto from '../assets/images/amber-lamborn.jpeg';
import brookeMoorePhoto from '../assets/images/brooke-moore-landing.jpeg';
import randyRimmerPhoto from '../assets/images/randy-rimmer.png';
import steveTrippPhoto from '../assets/images/steve-tripp.png';
import tricoLogo from '../assets/images/trico-logo.png';
import { EditableBoundary, type EditorOwnership } from '../components/EditableBoundary.js';
import { EditableCollection } from '../components/EditableCollection.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { HomeResumeForm } from './HomeResumeForm.js';
import {
  defaultHomePageDocument,
  parseHomePageDocument,
  type HomePageDocument,
} from './homeContent.js';

const iconByName: Readonly<Record<string, LucideIcon>> = {
  ...contentIconComponents,
  Home,
  Building2,
  HardHat,
  Warehouse,
  Mountain,
  Shield,
  Target,
  Heart,
  Users,
};

const imageByKey: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/steve-tripp.png': steveTrippPhoto,
  'media/seed/randy-rimmer.png': randyRimmerPhoto,
  'media/seed/amber-lamborn.jpeg': amberLambornPhoto,
  'media/seed/brooke-moore-landing.jpeg': brookeMoorePhoto,
};

const routeByPage = {
  home: '/',
  'property-management': '/property-management',
  'real-estate': '/real-estate',
  construction: '/construction',
  storage: '/storage',
  development: '/development',
} as const;

type HomeEntityId = (typeof homeEntityDefinitions)[number]['id'];

function requireHomeDefinition(entityId: HomeEntityId): SemanticEntityDefinition {
  const definition = homeEntityDefinitions.find((candidate) => candidate.id === entityId);
  if (definition === undefined) throw new Error(`Home editor definition missing for ${entityId}`);
  return definition;
}

function managedImage(key: string, fallback: string): string {
  return (
    imageByKey[key] ??
    (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback)
  );
}

function formatNewsDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function iconFor(name: string): LucideIcon {
  return iconByName[name] ?? Building2;
}

function parseCareerPosition(value: EditableValue): HomeCareerPosition {
  const position = homeCareersOpenPositionsSchema.parse([value])[0];
  if (position === undefined) throw new Error('A Home career position could not be rendered');
  return position;
}

function ObjectBoundary({
  entityId,
  value,
  children,
}: {
  readonly entityId: HomeEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  const pending = editing.pending.find((change) => change.entityId === entityId);
  const ownership: EditorOwnership =
    pending === undefined
      ? 'available'
      : pending.authorId === editing.currentUserId
        ? 'mine'
        : 'other';
  return (
    <div className="home-entity-slot ui-entity-slot" data-home-entity-boundary="true">
      <EditableBoundary
        active={editing.active}
        definition={requireHomeDefinition(entityId)}
        value={editableValueSchema.parse(value)}
        ownership={ownership}
        busy={editing.busy}
        onSave={(next) => editing.save(entityId, next)}
        onReloadLatest={() => editing.reload(entityId)}
      >
        {children}
      </EditableBoundary>
    </div>
  );
}

function CollectionBoundary({
  entityId,
  value,
  renderItem,
}: {
  readonly entityId: HomeEntityId;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  const pending = editing.pending.find((change) => change.entityId === entityId);
  return (
    <div className="home-entity-slot ui-entity-slot" data-home-entity-boundary="true">
      <EditableCollection
        active={editing.active}
        definition={requireHomeDefinition(entityId)}
        value={value}
        renderItem={renderItem}
        ownership={
          pending === undefined
            ? 'available'
            : pending.authorId === editing.currentUserId
              ? 'mine'
              : 'other'
        }
        busy={editing.busy}
        onSave={(next) => editing.save(entityId, next)}
        onReloadLatest={() => editing.reload(entityId)}
      />
    </div>
  );
}

function DivisionCard({ item }: { readonly item: HomeDivisionItem }): React.JSX.Element {
  const Icon = iconFor(item.icon);
  return (
    <Link className="home-division-link ui-division-link" to={routeByPage[item.destination.pageId]}>
      <article
        className={`home-division-card ui-division-card home-division-${item.destination.pageId}`}
      >
        <span className="home-card-icon ui-card-icon">
          <Icon aria-hidden="true" />
        </span>
        <h3 className="type-card-title type-card-title-lg">{item.title}</h3>
        <p>{item.description}</p>
        <span className="home-card-link ui-card-link">
          Learn More <ArrowRight aria-hidden="true" />
        </span>
      </article>
    </Link>
  );
}

function CoreValue({ item }: { readonly item: HomeCoreValueItem }): React.JSX.Element {
  const Icon = iconFor(item.icon);
  return (
    <article className="home-value ui-value">
      <span className="home-value-icon ui-value-icon">
        <Icon aria-hidden="true" />
      </span>
      <h3 className="type-card-title">{item.title}</h3>
      <p>{item.description}</p>
    </article>
  );
}

function TimelineCard({ item }: { readonly item: HomeTimelineItem }): React.JSX.Element {
  return (
    <article className="home-timeline-card ui-timeline-card">
      <span className="home-timeline-dot ui-timeline-dot" aria-hidden="true" />
      <strong>{item.year}</strong>
      <p>{item.event}</p>
    </article>
  );
}

function LeaderCard({ item }: { readonly item: HomeLeadershipMember }): React.JSX.Element {
  return (
    <article className="home-leader-card ui-leader-card">
      <div className="home-leader-photo ui-leader-photo">
        <img
          src={managedImage(item.photo.key, tricoLogo)}
          alt={item.photoAltText}
          width="480"
          height="480"
        />
      </div>
      <div>
        <h3 className="type-card-title type-card-title-sm">{item.name}</h3>
        <p>{item.role}</p>
      </div>
    </article>
  );
}

function NewsCard({ item }: { readonly item: HomeNewsItem }): React.JSX.Element {
  return (
    <article className="home-news-card ui-news-card">
      <p className="home-news-date ui-news-date">
        <CalendarDays aria-hidden="true" /> {formatNewsDate(item.date)}
      </p>
      <h3 className="type-card-title">{item.title}</h3>
      <p>{item.description}</p>
    </article>
  );
}

function CareerCard({ item }: { readonly item: HomeCareerPosition }): React.JSX.Element {
  return (
    <article className="home-career-card ui-career-card">
      <div>
        <h3 className="type-card-title type-card-title-xs">
          <Briefcase aria-hidden="true" /> {item.title}
        </h3>
        <p>
          <span>
            <MapPin aria-hidden="true" /> {item.division}
          </span>
          <span>
            <Clock3 aria-hidden="true" /> {item.employmentType}
          </span>
        </p>
      </div>
      <a href="#resume-form">Apply Now</a>
    </article>
  );
}

function HomePageBody(): React.JSX.Element {
  const editing = useEditMode();
  const [content, setContent] = useState<HomePageDocument>(defaultHomePageDocument);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    setLoadState('loading');
    void loader('home', { signal: controller.signal })
      .then((document) => {
        if (!controller.signal.aborted) {
          setContent(parseHomePageDocument(document));
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setContent(defaultHomePageDocument);
          setLoadState('fallback');
        }
      });
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending]);

  const logo = managedImage(content.headerBrand.logo.key, tricoLogo);
  return (
    <div className="home-page ui-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="home-anniversary-shell ui-anniversary-shell">
        <ObjectBoundary entityId="home.anniversary-banner" value={content.anniversaryBanner}>
          <div className="home-anniversary ui-anniversary">
            <span aria-hidden="true" />
            <strong>{content.anniversaryBanner.message}</strong>
            <span aria-hidden="true" />
          </div>
        </ObjectBoundary>
      </div>
      <div className="home-header-shell ui-header-shell">
        <ObjectBoundary entityId="home.header.brand" value={content.headerBrand}>
          <header className="home-header ui-header">
            <Link to="/" aria-label="TriCo home">
              <img src={logo} alt={content.headerBrand.altText} width="282" height="82" />
            </Link>
          </header>
        </ObjectBoundary>
      </div>

      {loadState === 'fallback' ? (
        <div className="content-notice" role="status">
          Showing the checked-in site content while published content is unavailable.
        </div>
      ) : null}

      <main id="main-content">
        <ObjectBoundary entityId="home.hero" value={content.hero}>
          <section className="home-hero ui-hero ui-hero-plain" aria-labelledby="home-heading">
            <div className="home-container ui-container">
              <h1 id="home-heading" className="type-display type-display-large">
                {content.hero.heading}
              </h1>
              <p>{content.hero.description}</p>
              <span className="home-accent-rule ui-accent-rule" aria-hidden="true" />
            </div>
          </section>
        </ObjectBoundary>

        <section className="home-section ui-section home-divisions ui-divisions" id="divisions">
          <div className="home-container ui-container">
            <ObjectBoundary entityId="home.divisions.header" value={content.divisionsHeader}>
              <header className="home-section-heading ui-section-heading">
                <h2 className="type-section-title type-section-title-compact">
                  {content.divisionsHeader.heading}
                </h2>
                <p>{content.divisionsHeader.description}</p>
              </header>
            </ObjectBoundary>
            <CollectionBoundary
              entityId="home.divisions.items"
              value={content.divisions}
              renderItem={(value) => <DivisionCard item={homeDivisionItemSchema.parse(value)} />}
            />
          </div>
        </section>

        <section
          className="home-section ui-section home-tint ui-tint home-values ui-values"
          id="values"
        >
          <div className="home-container ui-container">
            <ObjectBoundary entityId="home.core-values.header" value={content.coreValuesHeader}>
              <header className="home-section-heading ui-section-heading">
                <h2 className="type-section-title type-section-title-compact">
                  {content.coreValuesHeader.heading}
                </h2>
                <p>{content.coreValuesHeader.description}</p>
              </header>
            </ObjectBoundary>
            <CollectionBoundary
              entityId="home.core-values.items"
              value={content.coreValues}
              renderItem={(value) => <CoreValue item={homeCoreValueItemSchema.parse(value)} />}
            />
          </div>
        </section>

        <section className="home-section ui-section home-journey ui-journey" id="journey">
          <div className="home-container ui-container">
            <ObjectBoundary entityId="home.journey.header" value={content.journeyHeader}>
              <header className="home-section-heading ui-section-heading">
                <span className="home-eyebrow ui-eyebrow">{content.journeyHeader.eyebrow}</span>
                <h2 className="type-section-title type-section-title-compact">
                  {content.journeyHeader.heading}
                </h2>
                <p>{content.journeyHeader.description}</p>
                <p className="home-history ui-history">{content.journeyHeader.history}</p>
              </header>
            </ObjectBoundary>
            <CollectionBoundary
              entityId="home.journey.timeline"
              value={content.timeline}
              renderItem={(value) => <TimelineCard item={homeTimelineItemSchema.parse(value)} />}
            />
          </div>
        </section>

        <section
          className="home-section ui-section home-tint ui-tint home-leadership ui-leadership"
          id="leadership"
        >
          <div className="home-container ui-container">
            <ObjectBoundary entityId="home.leadership.header" value={content.leadershipHeader}>
              <header className="home-section-heading ui-section-heading">
                <h2 className="type-section-title type-section-title-compact">
                  {content.leadershipHeader.heading}
                </h2>
                <p>{content.leadershipHeader.description}</p>
              </header>
            </ObjectBoundary>
            <CollectionBoundary
              entityId="home.leadership.members"
              value={content.leaders}
              renderItem={(value) => <LeaderCard item={homeLeadershipMemberSchema.parse(value)} />}
            />
            <p className="home-section-note ui-section-note">{content.leadershipHeader.note}</p>
          </div>
        </section>

        <section className="home-section ui-section home-news ui-news" id="news">
          <div className="home-container ui-container">
            <ObjectBoundary entityId="home.news.header" value={content.newsHeader}>
              <header className="home-section-heading ui-section-heading">
                <h2 className="type-section-title type-section-title-compact">
                  {content.newsHeader.heading}
                </h2>
                <p>{content.newsHeader.description}</p>
              </header>
            </ObjectBoundary>
            <CollectionBoundary
              entityId="home.news.items"
              value={content.news}
              renderItem={(value) => <NewsCard item={homeNewsItemSchema.parse(value)} />}
            />
          </div>
        </section>

        <section
          className="home-section ui-section home-tint ui-tint home-careers ui-careers ui-align-start"
          id="careers"
        >
          <div className="home-container ui-container home-careers-container ui-careers-container">
            <ObjectBoundary entityId="home.careers.header" value={content.careersHeader}>
              <header className="home-section-heading ui-section-heading">
                <h2 className="type-section-title type-section-title-compact">
                  {content.careersHeader.heading}
                </h2>
                <p>{content.careersHeader.description}</p>
              </header>
            </ObjectBoundary>
            <CollectionBoundary
              entityId="home.careers.open-positions"
              value={content.positions}
              renderItem={(value) => <CareerCard item={parseCareerPosition(value)} />}
            />
            <ObjectBoundary entityId="home.careers.resume-intro" value={content.resumeIntro}>
              <header className="home-resume-heading ui-resume-heading" id="resume-form">
                <h3 className="type-card-title type-card-title-lg">
                  {content.resumeIntro.heading}
                </h3>
                <p>{content.resumeIntro.description}</p>
              </header>
            </ObjectBoundary>
            <div className="ui-form-surface ui-form-surface--inquiry">
              <HomeResumeForm />
            </div>
          </div>
        </section>

        <ObjectBoundary entityId="home.contact" value={content.contact}>
          <section className="home-section ui-section home-contact ui-contact" id="contact">
            <div className="home-container ui-container">
              <h2 className="type-section-title type-section-title-compact">
                {content.contact.heading}
              </h2>
              <p>{content.contact.description}</p>
              <address>
                <span>{content.contact.address}</span>
                <span className="home-contact-row ui-contact-row">
                  <a href={`mailto:${content.contact.email}`}>{content.contact.email}</a>
                  <i aria-hidden="true">|</i>
                  <a href={`tel:${content.contact.phone.replace(/[^\d+]/g, '')}`}>
                    Tel: {content.contact.phone}
                  </a>
                  <i aria-hidden="true">|</i>
                  <span>Fax: {content.contact.fax}</span>
                </span>
                <span className="home-license-row ui-license-row">
                  {content.contact.licenses.map((license) => (
                    <span key={license.id}>{license.label}</span>
                  ))}
                </span>
              </address>
            </div>
          </section>
        </ObjectBoundary>
      </main>

      <ObjectBoundary entityId="home.footer" value={content.footer}>
        <footer className="home-footer ui-footer ui-footer-light">
          <img
            src={managedImage(content.footer.logo.key, tricoLogo)}
            alt={content.footer.altText}
            width="282"
            height="82"
          />
          <p>
            © {new Date().getFullYear()} {content.footer.organizationName}{' '}
            {content.footer.rightsNotice}
          </p>
        </footer>
      </ObjectBoundary>
      <EditorToolbar />
    </div>
  );
}

export function HomeSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="home">
      <HomePageBody />
    </EditModeProvider>
  );
}

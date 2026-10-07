import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  homeCoreValueItemSchema,
  homeDivisionItemSchema,
  homeEntityDefinitions,
  homeLeadershipMemberSchema,
  homeNewsItemSchema,
  homeTimelineItemSchema,
  homeV2SeedData,
  isPubliclyVisible,
  type EditableValue,
  type HomeCoreValueItem,
  type HomeDivisionItem,
  type HomeLeadershipMember,
  type HomeNewsItem,
  type HomeTimelineItem,
  type SemanticEntityDefinition,
} from '@app/schemas';

import amberPhoto from '../assets/images/amber-lamborn.jpeg';
import brookePhoto from '../assets/images/brooke-moore-landing.jpeg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import stevePhoto from '../assets/images/steve-tripp.png';
import tricoLogo from '../assets/images/trico-logo.png';
import { AnniversaryBanner } from '../components/AnniversaryBanner.js';
import { CareersSection } from '../components/CareersSection.js';
import { ContentCollection, ContentEntity } from '../components/ContentEntity.js';
import { AuthenticatedEditorToolbar } from '../components/AuthenticatedEditorToolbar.js';
import { PublicHeader } from '../components/PublicHeader.js';
import { ProfileCard } from '../components/ProfileCard.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/card.js';
import { Separator } from '../components/ui/separator.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { Container, timelineClassName } from '../design-system/layout.js';
import { MarketingLayout } from '../design-system/page-patterns.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import {
  defaultHomePageDocument,
  parseHomePageDocument,
  type HomePageDocument,
} from './homeContent.js';

type HomeEntityId = (typeof homeEntityDefinitions)[number]['id'];

const routes = {
  home: '/',
  'property-management': '/property-management',
  'real-estate': '/real-estate',
  construction: '/construction',
  storage: '/storage',
  development: '/development',
} as const;

const images: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/steve-tripp.png': stevePhoto,
  'media/seed/randy-rimmer.png': randyPhoto,
  'media/seed/amber-lamborn.jpeg': amberPhoto,
  'media/seed/brooke-moore-landing.jpeg': brookePhoto,
};

function imageFor(key: string, fallback: string): string {
  return (
    images[key] ??
    (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback)
  );
}

function definitionFor(id: HomeEntityId): SemanticEntityDefinition {
  const definition = homeEntityDefinitions.find((candidate) => candidate.id === id);
  if (definition === undefined) throw new Error(`Missing Home editor definition: ${id}`);
  return definition;
}

function Entity({
  id,
  value,
  children,
}: {
  readonly id: HomeEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="contents" data-home-entity-boundary="true">
      <ContentEntity definition={definitionFor(id)} value={value}>
        {children}
      </ContentEntity>
    </div>
  );
}

function Collection({
  id,
  value,
  renderItem,
  className,
  itemsElement,
  itemsClassName,
}: {
  readonly id: HomeEntityId;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
  readonly className?: string;
  readonly itemsElement?: 'ol' | 'ul';
  readonly itemsClassName?: string;
}): React.JSX.Element {
  return (
    <div className={className} data-home-entity-boundary="true">
      <ContentCollection
        definition={definitionFor(id)}
        value={value}
        renderItem={renderItem}
        {...(itemsElement === undefined ? {} : { itemsElement })}
        {...(itemsClassName === undefined ? {} : { itemsClassName })}
      />
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  copy,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly copy: string;
}): React.JSX.Element {
  return (
    <div className="mb-10 max-w-3xl space-y-4">
      <Badge variant="secondary" className="uppercase tracking-[0.16em]">
        {eyebrow}
      </Badge>
      <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{copy}</p>
    </div>
  );
}

function DivisionTile({ item }: { readonly item: HomeDivisionItem }): React.JSX.Element {
  const Icon: LucideIcon =
    item.icon === undefined ? Building2 : (contentIconComponents[item.icon] ?? Building2);
  return (
    <Link
      to={routes[item.destination.pageId]}
      className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full border border-border/70 bg-card shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg">
        <CardHeader className="space-y-5">
          <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <h3 className="font-heading text-xl font-semibold text-card-foreground">{item.title}</h3>
        </CardHeader>
        <CardContent className="flex-1 text-muted-foreground">{item.description}</CardContent>
        <CardFooter className="border-0 bg-transparent text-sm font-semibold text-primary">
          Explore division{' '}
          <ArrowRight
            className="ms-2 size-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </CardFooter>
      </Card>
    </Link>
  );
}

function ValueTile({ item }: { readonly item: HomeCoreValueItem }): React.JSX.Element {
  const Icon: LucideIcon =
    item.icon === undefined ? Building2 : (contentIconComponents[item.icon] ?? Building2);
  return (
    <Card className="h-full border border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="font-heading text-lg font-semibold">{item.title}</h3>
      </CardHeader>
      <CardContent className="leading-relaxed text-muted-foreground">
        {item.description}
      </CardContent>
    </Card>
  );
}

function Milestone({ item }: { readonly item: HomeTimelineItem }): React.JSX.Element {
  return (
    <div>
      <strong className="font-heading text-lg text-primary">{item.year}</strong>
      <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{item.event}</p>
    </div>
  );
}

function PersonTile({ item }: { readonly item: HomeLeadershipMember }): React.JSX.Element {
  return (
    <ProfileCard
      name={item.name}
      role={item.role}
      imageSource={imageFor(item.photo.key, tricoLogo)}
      imageAltText={item.photoAltText}
    />
  );
}

function UpdateTile({ item }: { readonly item: HomeNewsItem }): React.JSX.Element {
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${item.date}T00:00:00Z`));
  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <CalendarDays className="size-4" aria-hidden="true" />
          {date}
        </p>
        <h3 className="font-heading text-lg font-semibold">{item.title}</h3>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-muted-foreground">
        {item.description}
      </CardContent>
    </Card>
  );
}

function HomeBody(): React.JSX.Element {
  const editing = useEditMode();
  const [content, setContent] = useState<HomePageDocument>(defaultHomePageDocument);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const publicNews = editing.active
    ? content.news
    : content.news.filter((item) =>
        isPubliclyVisible(
          item.publicVisibility,
          !homeV2SeedData['home.news.items'].some(
            (seed) =>
              item.date === seed.date &&
              item.title === seed.title &&
              item.description === seed.description,
          ),
        ),
      );

  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    setLoadState('loading');
    void loader('home', { signal: controller.signal })
      .then((document) => {
        if (controller.signal.aborted) return;
        setContent(parseHomePageDocument(document));
        setLoadState('ready');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setContent(defaultHomePageDocument);
        setLoadState('fallback');
      });
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending]);

  const header = (
    <>
      <Entity id="home.anniversary-banner" value={content.anniversaryBanner}>
        <AnniversaryBanner message={content.anniversaryBanner.message} />
      </Entity>
      <Entity id="home.header.brand" value={content.headerBrand}>
        <PublicHeader
          logoSrc={imageFor(content.headerBrand.logo.key, tricoLogo)}
          logoAltText={content.headerBrand.altText}
          links={[
            { id: 'home-divisions', label: 'Divisions', destination: 'divisions' },
            { id: 'home-values', label: 'Values', destination: 'values' },
            { id: 'home-journey', label: 'Our story', destination: 'journey' },
            { id: 'home-careers', label: 'Careers', destination: 'careers' },
            { id: 'home-contact', label: 'Contact', destination: 'contact' },
          ]}
          actionLabel="Get in touch"
        />
      </Entity>
    </>
  );

  return (
    <div className="min-w-80 bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-3"
      >
        Skip to main content
      </a>
      <MarketingLayout header={header} className="bg-background">
        <div id="main-content">
          {loadState === 'fallback' ? (
            <div
              role="status"
              className="border-b border-warning/30 bg-warning/10 px-4 py-3 text-center text-sm"
            >
              Showing checked-in content while published content is unavailable.
            </div>
          ) : null}
          <Entity id="home.hero" value={content.hero}>
            <section
              aria-labelledby="home-heading"
              className="relative overflow-hidden bg-sidebar py-24 text-sidebar-foreground sm:py-32"
            >
              <div
                className="pointer-events-none absolute -right-20 -top-36 size-[38rem] rounded-full border border-sidebar-foreground/10 bg-sidebar-primary/10 blur-3xl"
                aria-hidden="true"
              />
              <Container
                width="wide"
                className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]"
              >
                <div className="max-w-3xl space-y-7">
                  <Badge className="border border-sidebar-foreground/30 bg-sidebar-accent text-sidebar-foreground">
                    A Utah family of companies
                  </Badge>
                  <h1
                    id="home-heading"
                    className="font-heading !text-sidebar-foreground text-5xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
                  >
                    {content.hero.heading}
                  </h1>
                  <p className="max-w-2xl text-lg leading-relaxed text-sidebar-foreground/75 sm:text-xl">
                    {content.hero.description}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button render={<a href="#divisions" />} variant="secondary" size="lg">
                      Explore our divisions <ArrowRight aria-hidden="true" />
                    </Button>
                    <Button
                      render={<a href="#journey" />}
                      variant="outline"
                      size="lg"
                      className="!border-sidebar-foreground/50 !bg-transparent !text-sidebar-foreground"
                    >
                      Our story
                    </Button>
                  </div>
                </div>
                <div className="relative hidden aspect-square items-center justify-center rounded-[2rem] border border-sidebar-foreground/15 bg-sidebar-accent/30 p-8 shadow-2xl lg:flex">
                  <div className="grid size-full place-items-center rounded-[1.5rem] border border-sidebar-foreground/15 bg-sidebar/60">
                    <img
                      src={tricoLogo}
                      alt=""
                      className="w-3/4 max-w-sm rounded-xl bg-background p-8 shadow-lg"
                    />
                  </div>
                </div>
              </Container>
            </section>
          </Entity>

          <section id="divisions" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="home.divisions.header" value={content.divisionsHeader}>
                <SectionIntro
                  eyebrow="Our companies"
                  title={content.divisionsHeader.heading}
                  copy={content.divisionsHeader.description}
                />
              </Entity>
              <Collection
                id="home.divisions.items"
                value={content.divisions}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 md:[&_[data-slot=editable-collection-items]]:grid-cols-2 xl:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(value) => <DivisionTile item={homeDivisionItemSchema.parse(value)} />}
              />
            </Container>
          </section>

          <section id="values" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="home.core-values.header" value={content.coreValuesHeader}>
                <SectionIntro
                  eyebrow="How we work"
                  title={content.coreValuesHeader.heading}
                  copy={content.coreValuesHeader.description}
                />
              </Entity>
              <Collection
                id="home.core-values.items"
                value={content.coreValues}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 md:[&_[data-slot=editable-collection-items]]:grid-cols-2 xl:[&_[data-slot=editable-collection-items]]:grid-cols-4"
                renderItem={(value) => <ValueTile item={homeCoreValueItemSchema.parse(value)} />}
              />
            </Container>
          </section>

          <section id="journey" className="py-20 sm:py-24">
            <Container width="wide" className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <Entity id="home.journey.header" value={content.journeyHeader}>
                <div className="lg:sticky lg:top-8 lg:self-start">
                  <SectionIntro
                    eyebrow={content.journeyHeader.eyebrow}
                    title={content.journeyHeader.heading}
                    copy={content.journeyHeader.description}
                  />
                  <p className="max-w-prose leading-relaxed text-muted-foreground">
                    {content.journeyHeader.history}
                  </p>
                </div>
              </Entity>
              <Collection
                id="home.journey.timeline"
                value={content.timeline}
                itemsElement="ol"
                itemsClassName={`${timelineClassName} ms-4`}
                renderItem={(value) => <Milestone item={homeTimelineItemSchema.parse(value)} />}
              />
            </Container>
          </section>

          <section id="leadership" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="home.leadership.header" value={content.leadershipHeader}>
                <SectionIntro
                  eyebrow="The people"
                  title={content.leadershipHeader.heading}
                  copy={content.leadershipHeader.description}
                />
              </Entity>
              <Collection
                id="home.leadership.members"
                value={content.leaders}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-4"
                renderItem={(value) => (
                  <PersonTile item={homeLeadershipMemberSchema.parse(value)} />
                )}
              />
              <p className="mt-8 text-sm text-muted-foreground">{content.leadershipHeader.note}</p>
            </Container>
          </section>

          {publicNews.length > 0 || editing.active ? (
            <section id="news" className="py-20 sm:py-24">
              <Container width="wide">
                <Entity id="home.news.header" value={content.newsHeader}>
                  <SectionIntro
                    eyebrow="Latest from TriCo"
                    title={content.newsHeader.heading}
                    copy={content.newsHeader.description}
                  />
                </Entity>
                <Collection
                  id="home.news.items"
                  value={publicNews}
                  className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 md:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                  renderItem={(value) => <UpdateTile item={homeNewsItemSchema.parse(value)} />}
                />
              </Container>
            </section>
          ) : null}

          <CareersSection pageId="home" />

          <Entity id="home.contact" value={content.contact}>
            <section id="contact" className="bg-sidebar py-20 text-sidebar-foreground sm:py-24">
              <Container width="wide" className="grid gap-10 lg:grid-cols-2">
                <div className="space-y-5">
                  <Badge className="bg-accent text-accent-foreground">Let's connect</Badge>
                  <h2 className="font-heading text-4xl font-semibold">{content.contact.heading}</h2>
                  <p className="max-w-prose text-sidebar-foreground/75">
                    {content.contact.description}
                  </p>
                </div>
                <Card className="bg-background text-foreground">
                  <CardContent className="space-y-5 text-sm">
                    <p className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                      {content.contact.address}
                    </p>
                    <a
                      className="flex items-center gap-3 text-primary hover:underline"
                      href={`mailto:${content.contact.email}`}
                    >
                      <Mail className="size-5" aria-hidden="true" />
                      {content.contact.email}
                    </a>
                    <a
                      className="flex items-center gap-3 text-primary hover:underline"
                      href={`tel:${content.contact.phone.replace(/[^\d+]/g, '')}`}
                    >
                      <Phone className="size-5" aria-hidden="true" />
                      {content.contact.phone}
                    </a>
                    <Separator />
                    <p className="text-muted-foreground">Fax: {content.contact.fax}</p>
                    <div className="flex flex-wrap gap-2">
                      {content.contact.licenses.map((license) => (
                        <Badge key={license.id} variant="outline">
                          {license.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Container>
            </section>
          </Entity>
        </div>
      </MarketingLayout>
      <Entity id="home.footer" value={content.footer}>
        <footer className="border-t border-border bg-background py-10">
          <Container
            width="wide"
            className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"
          >
            <img
              src={imageFor(content.footer.logo.key, tricoLogo)}
              alt={content.footer.altText}
              loading="lazy"
              className="h-10 w-auto object-contain"
            />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {content.footer.organizationName}{' '}
              {content.footer.rightsNotice}
            </p>
          </Container>
        </footer>
      </Entity>
      <AuthenticatedEditorToolbar />
    </div>
  );
}

export function HomeExperience(): React.JSX.Element {
  return (
    <EditModeProvider pageId="home">
      <HomeBody />
    </EditModeProvider>
  );
}

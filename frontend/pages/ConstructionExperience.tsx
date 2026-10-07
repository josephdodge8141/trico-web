import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  HardHat,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as S from '@app/schemas';

import cayliePhoto from '../assets/images/caylie-disney.jpg';
import crewOne from '../assets/images/construction-crew-1.jpg';
import crewTwo from '../assets/images/construction-crew-2.jpg';
import katiePhoto from '../assets/images/katie-thompson.jpg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import tricoLogo from '../assets/images/trico-logo.png';
import { AnniversaryBanner } from '../components/AnniversaryBanner.js';
import { CareersSection } from '../components/CareersSection.js';
import { PublicHeader } from '../components/PublicHeader.js';
import { ContentCollection, ContentEntity } from '../components/ContentEntity.js';
import { DivisionSectionIntro as Intro } from '../components/DivisionSectionIntro.js';
import { FooterQuickLink } from '../components/FooterQuickLink.js';
import { ReviewPlatformCard } from '../components/ReviewPlatformCard.js';
import { ProfileCard } from '../components/ProfileCard.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { AuthenticatedEditorToolbar } from '../components/AuthenticatedEditorToolbar.js';
import { Alert } from '../components/ui/alert.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { Container } from '../design-system/layout.js';
import { MarketingLayout } from '../design-system/page-patterns.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { ConstructionClientForm } from './ConstructionClientForm.js';
import { parseConstructionValue } from './constructionContent.js';

type ConstructionEntityId = (typeof S.constructionEntityDefinitions)[number]['id'];
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
const images: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/construction-crew-1.jpg': crewOne,
  'media/seed/construction-crew-2.jpg': crewTwo,
  'media/seed/randy-rimmer.png': randyPhoto,
  'media/seed/katie-thompson.jpg': katiePhoto,
  'media/seed/caylie-disney.jpg': cayliePhoto,
};
function imageFor(key: string, fallback: string): string {
  return (
    images[key] ??
    (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback)
  );
}
function isVisibleStatistic(stat: {
  readonly value: string;
  readonly label: string;
  readonly publicVisibility: S.PublicVisibility;
}): boolean {
  return S.isPubliclyVisible(
    stat.publicVisibility,
    stat.value !== '500+' || stat.label !== 'Projects Completed',
  );
}
function hasPublicProject(projects: readonly S.ConstructionProject[]): boolean {
  return projects.some(
    (project) =>
      S.hasRealConstructionProjectDetails(project) &&
      S.isPubliclyVisible(project.publicVisibility, true),
  );
}
function definitionFor(id: ConstructionEntityId): S.SemanticEntityDefinition {
  const result = S.constructionEntityDefinitions.find((entry) => entry.id === id);
  if (result === undefined) throw new Error(`Missing Construction editor definition: ${id}`);
  return result;
}
function Entity({
  id,
  value,
  children,
}: {
  readonly id: ConstructionEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="contents" data-construction-entity-boundary="true">
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
  className = '',
}: {
  readonly id: ConstructionEntityId;
  readonly value: readonly S.EditableValue[];
  readonly renderItem: (item: S.EditableValue, index: number) => React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div className={className} data-construction-entity-boundary="true">
      <ContentCollection definition={definitionFor(id)} value={value} renderItem={renderItem} />
    </div>
  );
}
function ConstructionBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<S.PageContent>({});
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('construction', { signal: controller.signal })
      .then((next) => {
        if (controller.signal.aborted) return;
        setDocument(next);
        setFallback(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDocument({});
        setFallback(true);
      });
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending]);
  const value = <Output,>(
    id: keyof typeof S.constructionV2SeedData,
    parser: { parse(input: unknown): Output },
  ): Output => parseConstructionValue(document, id, parser);
  const banner = value('construction.anniversary-banner', S.constructionAnniversaryBannerSchema);
  const header = value('construction.header', S.constructionHeaderSchema);
  const hero = value('construction.hero', S.constructionHeroSchema);
  const heroStats = value('construction.hero.stats', S.constructionHeroStatsSchema);
  const servicesHeader = value('construction.services.header', S.constructionServicesHeaderSchema);
  const services = value('construction.services.items', S.constructionServicesItemsSchema);
  const currentHeader = value(
    'construction.current-projects.header',
    S.constructionProjectsHeaderSchema,
  );
  const completedHeader = value(
    'construction.completed-projects.header',
    S.constructionProjectsHeaderSchema,
  );
  const planHeader = value('construction.plan-room.header', S.constructionPlanRoomHeaderSchema);
  const planAccess = value(
    'construction.plan-room.access-notice',
    S.constructionPlanRoomAccessSchema,
  );
  const plans = value('construction.plan-room.plan-sets', S.constructionPlanSetsSchema);
  const planRequest = value(
    'construction.plan-room.request-access',
    S.constructionPlanRoomRequestSchema,
  );
  const publicPlanText = (current: string, former: string, replacement: string): string =>
    editing.active || current !== former ? current : replacement;
  const prosHeader = value('construction.pros.header', S.constructionProsHeaderSchema);
  const pros = value('construction.pros.items', S.constructionProsItemsSchema);
  const proStats = value('construction.pros.stats', S.constructionProStatsSchema);
  const teamHeader = value('construction.team.header', S.constructionTeamHeaderSchema);
  const team = value('construction.team.members', S.constructionTeamMembersSchema);
  const workers = value('construction.workers', S.constructionWorkersSchema);
  const about = value('construction.about', S.constructionAboutSchema);
  const showAboutStatistic =
    editing.active ||
    isVisibleStatistic({
      value: about.statValue,
      label: about.statLabel,
      publicVisibility: about.statPublicVisibility,
    });
  const aboutFeatures = value('construction.about.features', S.constructionAboutFeaturesSchema);
  const bidHeader = value('construction.bid.header', S.constructionBidHeaderSchema);
  const reviewsHeader = value('construction.reviews.header', S.constructionReviewsHeaderSchema);
  const reviews = value('construction.reviews.platforms', S.constructionReviewPlatformsSchema);
  const visibleReviews = editing.active
    ? reviews
    : reviews.filter((review) => review.externalUrl.trim() !== '');
  const reviewsFooter = value('construction.reviews.footer', S.constructionReviewsFooterSchema);
  const contactHeader = value('construction.contact.header', S.constructionContactHeaderSchema);
  const contact = value('construction.contact.details', S.constructionContactDetailsSchema);
  const footerBrand = value('construction.footer.brand', S.constructionFooterBrandSchema);
  const footerLinks = value('construction.footer.links', S.constructionFooterLinksSchema);
  const footerLicenses = value('construction.footer.licenses', S.constructionFooterLicensesSchema);
  const footerLegal = value('construction.footer.legal', S.constructionFooterLegalSchema);
  const pageHeader = (
    <>
      <Entity id="construction.anniversary-banner" value={banner}>
        <AnniversaryBanner message={banner.message} />
      </Entity>
      <Entity id="construction.header" value={header}>
        <PublicHeader
          logoSrc={imageFor(header.logo.key, tricoLogo)}
          logoAltText={header.logoAltText}
          divisionLabel={header.divisionLabel}
          links={header.navLinks}
          phone={header.phone}
          actionLabel={header.actionLabel}
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
      <MarketingLayout header={pageHeader}>
        <div id="main-content">
          {fallback ? (
            <p role="status" className="bg-warning/10 px-4 py-3 text-center text-sm">
              Showing the checked-in site content while published content is unavailable.
            </p>
          ) : null}
          <Entity id="construction.hero" value={hero}>
            <section
              aria-labelledby="construction-hero-heading"
              className="bg-sidebar py-20 text-sidebar-foreground sm:py-28"
            >
              <Container width="wide" className="grid items-center gap-12 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border border-sidebar-foreground/30 bg-sidebar-accent text-sidebar-foreground">
                      <HardHat className="mr-1 size-4" aria-hidden="true" />
                      {hero.primaryBadge}
                    </Badge>
                    <Badge className="border border-sidebar-foreground/30 bg-transparent text-sidebar-foreground">
                      {hero.serviceAreaBadge}
                    </Badge>
                  </div>
                  <h1
                    id="construction-hero-heading"
                    className="font-heading !text-sidebar-foreground text-5xl font-semibold tracking-tight sm:text-6xl"
                  >
                    {hero.heading}
                  </h1>
                  <p className="max-w-xl text-lg leading-relaxed text-sidebar-foreground/80">
                    {hero.description}
                  </p>
                  <div className="space-y-1">
                    <h2 className="font-heading !text-sidebar-foreground text-xl font-semibold">
                      {hero.locationHeading}
                    </h2>
                    <h3 className="text-sm font-medium text-sidebar-foreground/75">
                      {hero.promise}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button render={<a href="#contact" />} variant="secondary" size="lg">
                      {hero.primaryActionLabel}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                    <Button
                      render={<a href="#services" />}
                      variant="outline"
                      size="lg"
                      className="!border-sidebar-foreground/50 !bg-transparent !text-sidebar-foreground"
                    >
                      {hero.secondaryActionLabel}
                    </Button>
                  </div>
                  <Collection
                    id="construction.hero.stats"
                    value={editing.active ? heroStats : heroStats.filter(isVisibleStatistic)}
                    className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                    renderItem={(item) => {
                      const stat = S.constructionHeroStatsSchema.element.parse(item);
                      const Icon = contentIconComponents[stat.icon] ?? Building2;
                      return (
                        <div className="rounded-lg border border-sidebar-foreground/20 bg-sidebar-accent/40 p-3">
                          <Icon className="mb-2 size-5" aria-hidden="true" />
                          <strong className="block text-lg">{stat.value}</strong>
                          <span className="text-xs text-sidebar-foreground/70">{stat.label}</span>
                        </div>
                      );
                    }}
                  />
                </div>
                <img
                  className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
                  src={imageFor(hero.image.key, crewOne)}
                  alt={hero.imageAltText}
                />
              </Container>
            </section>
          </Entity>
          <section id="services" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="construction.services.header" value={servicesHeader}>
                <Intro {...servicesHeader} />
              </Entity>
              <Collection
                id="construction.services.items"
                value={services}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const service = S.constructionServicesItemsSchema.element.parse(item);
                  const Icon = contentIconComponents[service.icon] ?? Building2;
                  return (
                    <Card className="h-full border border-border/70 shadow-sm">
                      <CardHeader>
                        <Icon className="size-7 text-primary" aria-hidden="true" />
                        <h3 className="font-heading text-lg font-semibold">{service.title}</h3>
                      </CardHeader>
                      <CardContent className="text-muted-foreground">
                        {service.description}
                      </CardContent>
                    </Card>
                  );
                }}
              />
            </Container>
          </section>
          {(['current', 'completed'] as const).map((status) => {
            const group = status === 'current' ? 'current-projects' : 'completed-projects';
            const prefix = `construction.${group}` as const;
            const sectionHeader = status === 'current' ? currentHeader : completedHeader;
            const categories = categorySlugs.map((slug) => {
              const entityId = `${prefix}.category.${slug}` as ConstructionEntityId;
              const projectId = `${prefix}.projects.${slug}` as ConstructionEntityId;
              return {
                slug,
                entityId,
                category: value(entityId, S.constructionProjectCategorySchema),
                hasProjects: hasPublicProject(value(projectId, S.constructionProjectsSchema)),
              };
            });
            const hasPublishedProjects = categories.some((category) => category.hasProjects);
            const hasAnyPublishedProjects = categorySlugs.some(
              (slug) =>
                hasPublicProject(
                  value(
                    `construction.current-projects.projects.${slug}` as ConstructionEntityId,
                    S.constructionProjectsSchema,
                  ),
                ) ||
                hasPublicProject(
                  value(
                    `construction.completed-projects.projects.${slug}` as ConstructionEntityId,
                    S.constructionProjectsSchema,
                  ),
                ),
            );
            if (!editing.active && !hasAnyPublishedProjects && status === 'completed') return null;
            return (
              <section
                id={status === 'current' ? 'projects' : 'completed-projects'}
                key={status}
                className={status === 'current' ? 'py-20 sm:py-24' : 'bg-muted/40 py-20 sm:py-24'}
              >
                <Container width="wide">
                  <Entity id={`${prefix}.header`} value={sectionHeader}>
                    <Intro
                      {...sectionHeader}
                      heading={
                        editing.active
                          ? sectionHeader.heading
                          : !hasAnyPublishedProjects
                            ? 'Construction projects'
                            : status === 'current'
                              ? 'Current Projects'
                              : 'Completed Projects'
                      }
                      description={
                        editing.active || hasPublishedProjects
                          ? sectionHeader.description
                          : 'Project details are available by request.'
                      }
                    />
                  </Entity>
                  {hasPublishedProjects || editing.active ? null : (
                    <Button render={<a href="#contact" />} variant="outline" className="mb-6">
                      Ask about projects
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.map(({ slug, entityId, category, hasProjects }) => {
                      return (
                        <Entity key={slug} id={entityId} value={category}>
                          <Link
                            to={`/construction/${status}/${slug}`}
                            className={`${editing.active || hasProjects ? 'group block' : 'hidden'} h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
                          >
                            <Card className="h-full border border-border/70 shadow-sm transition-all group-hover:border-primary/50 group-hover:shadow-lg">
                              <CardHeader>
                                <h3 className="font-heading text-lg font-semibold">
                                  {category.label}
                                </h3>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <p className="text-muted-foreground">{category.blurb}</p>
                                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                                  {sectionHeader.cardActionLabel}
                                  <ArrowRight className="size-4" aria-hidden="true" />
                                </span>
                              </CardContent>
                            </Card>
                          </Link>
                        </Entity>
                      );
                    })}
                  </div>
                </Container>
              </section>
            );
          })}
          <section id="plan-room" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="construction.plan-room.header" value={planHeader}>
                <Intro
                  {...planHeader}
                  description={publicPlanText(
                    planHeader.description,
                    'Current subcontractors can access the latest project plans, drawings, and specifications. Always confirm you are working from the latest set.',
                    'Project plans, drawings, and specifications are shared with approved subcontractors by request. Always confirm you are working from the latest set.',
                  )}
                />
              </Entity>
              <Entity id="construction.plan-room.access-notice" value={planAccess}>
                <Alert className="mb-8 flex items-start gap-3 p-5">
                  <LockKeyhole className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="font-heading font-semibold">
                      {publicPlanText(planAccess.heading, 'Login Required', 'Restricted plans')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {publicPlanText(
                        planAccess.description,
                        'Plan access is restricted to approved subcontractors and vendors. Request credentials below.',
                        'Plans and specifications are shared directly with approved subcontractors and vendors.',
                      )}
                    </p>
                  </div>
                </Alert>
              </Entity>
              <h3 className="mb-5 flex items-center gap-2 font-heading text-xl font-semibold">
                <FolderOpen className="size-5 text-primary" aria-hidden="true" />
                {editing.active ? planHeader.planListHeading : 'Restricted project plans'}
              </h3>
              <Collection
                id="construction.plan-room.plan-sets"
                value={editing.active ? plans : []}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2"
                renderItem={(item) => {
                  const plan = S.constructionPlanSetsSchema.element.parse(item);
                  return (
                    <Card className="h-full border border-border/70">
                      <CardHeader>
                        <FileText className="size-7 text-primary" aria-hidden="true" />
                        <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {plan.projectNumber} · {plan.latestRevision}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {plan.lastUpdated} · {plan.sheetCount} sheets
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Plans and specifications are available by request below.
                        </p>
                      </CardContent>
                    </Card>
                  );
                }}
              />
              <Entity id="construction.plan-room.request-access" value={planRequest}>
                <Card className="mt-8 border border-border/70 bg-secondary/40 p-6">
                  <h3 className="font-heading text-xl font-semibold">
                    {publicPlanText(
                      planRequest.heading,
                      'Need Plan Room Access?',
                      'Request project plans',
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {publicPlanText(
                      planRequest.description,
                      'Subcontractors and vendors can request login credentials to view the latest drawings.',
                      'Subcontractors and vendors can request drawings and specifications for a project.',
                    )}
                  </p>
                  <Button
                    render={
                      <a href={`mailto:${planRequest.email}?subject=Project%20Plans%20Request`} />
                    }
                    className="w-fit"
                  >
                    {publicPlanText(planRequest.actionLabel, 'Request Access', 'Request Plans')}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </Card>
              </Entity>
            </Container>
          </section>
          <section id="pros" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="construction.pros.header" value={prosHeader}>
                <Intro {...prosHeader} />
              </Entity>
              <Collection
                id="construction.pros.items"
                value={pros}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const pro = S.constructionProsItemsSchema.element.parse(item);
                  const Icon = contentIconComponents[pro.icon] ?? Building2;
                  return (
                    <Card className="h-full border border-border/70">
                      <CardHeader>
                        <Icon className="size-7 text-primary" aria-hidden="true" />
                        <h3 className="font-heading text-lg font-semibold">{pro.title}</h3>
                      </CardHeader>
                      <CardContent className="text-muted-foreground">{pro.description}</CardContent>
                    </Card>
                  );
                }}
              />
              <Collection
                id="construction.pros.stats"
                value={editing.active ? proStats : proStats.filter(isVisibleStatistic)}
                className="mt-8 [&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const stat = S.constructionProStatsSchema.element.parse(item);
                  return (
                    <div className="rounded-lg border bg-background p-4 text-center">
                      <strong className="block font-heading text-2xl text-primary">
                        {stat.value}
                      </strong>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                  );
                }}
              />
            </Container>
          </section>
          <section id="team" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="construction.team.header" value={teamHeader}>
                <Intro {...teamHeader} />
              </Entity>
              <Collection
                id="construction.team.members"
                value={team}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const person = S.constructionTeamMembersSchema.element.parse(item);
                  return (
                    <ProfileCard
                      name={person.name}
                      role={person.title}
                      imageSource={imageFor(person.photo.key, tricoLogo)}
                      imageAltText={person.photoAltText}
                    >
                      {person.email ? (
                        <a
                          className="block text-primary hover:underline"
                          href={'mailto:' + person.email}
                        >
                          {person.email}
                        </a>
                      ) : null}
                      {person.phone ? (
                        <a
                          className="block text-primary hover:underline"
                          href={'tel:' + person.phone.replace(/[^\d+]/g, '')}
                        >
                          {person.phone}
                        </a>
                      ) : null}
                    </ProfileCard>
                  );
                }}
              />
            </Container>
          </section>
          <Entity id="construction.workers" value={workers}>
            <section className="bg-muted/40 py-20 sm:py-24">
              <Container width="wide">
                <Intro {...workers} />
                <img
                  className="aspect-[16/7] w-full rounded-xl object-cover shadow-md"
                  src={imageFor(workers.image.key, crewTwo)}
                  alt={workers.imageAltText}
                  loading="lazy"
                  decoding="async"
                />
              </Container>
            </section>
          </Entity>
          <Entity id="construction.about" value={about}>
            <section id="about" className="bg-sidebar py-20 text-sidebar-foreground sm:py-24">
              <Container
                width="wide"
                className={
                  showAboutStatistic ? 'grid items-center gap-12 lg:grid-cols-2' : 'max-w-4xl'
                }
              >
                {showAboutStatistic ? (
                  <Card className="min-h-80 border border-sidebar-foreground/20 bg-sidebar-accent p-8 text-sidebar-foreground">
                    <strong className="font-heading text-3xl">{about.brandLabel}</strong>
                    <p>{about.brandDescription}</p>
                    <strong className="mt-16 block font-heading text-5xl">{about.statValue}</strong>
                    <span>{about.statLabel}</span>
                  </Card>
                ) : null}
                <div className="space-y-5">
                  <Badge className="border border-sidebar-foreground/30 bg-sidebar-accent text-sidebar-foreground">
                    {about.eyebrow}
                  </Badge>
                  <h2 className="font-heading !text-sidebar-foreground text-3xl font-semibold sm:text-4xl">
                    {about.heading}
                  </h2>
                  <p className="text-lg leading-relaxed">{about.introduction}</p>
                  <p className="text-sidebar-foreground/70">{about.detail}</p>
                  <Collection
                    id="construction.about.features"
                    value={aboutFeatures}
                    className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2"
                    renderItem={(item) => (
                      <span className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        {S.constructionAboutFeaturesSchema.element.parse(item).label}
                      </span>
                    )}
                  />
                  <Button render={<a href="#contact" />} variant="secondary">
                    {about.actionLabel}
                  </Button>
                </div>
              </Container>
            </section>
          </Entity>
          <section id="bid" className="bg-primary py-20 text-primary-foreground sm:py-24">
            <span id="contact" className="block h-px scroll-mt-20" aria-hidden="true" />
            <Container width="medium">
              <Entity id="construction.bid.header" value={bidHeader}>
                <div className="mb-10 space-y-4">
                  <Badge variant="secondary">{bidHeader.eyebrow}</Badge>
                  <h2 className="font-heading !text-primary-foreground text-3xl font-semibold sm:text-4xl">
                    {bidHeader.heading}
                  </h2>
                  <p className="text-primary-foreground/75">{bidHeader.description}</p>
                </div>
              </Entity>
              <Card className="border border-border/70 bg-card p-6 text-foreground">
                <ConstructionClientForm phone={contact.phone} email={contact.email} />
              </Card>
            </Container>
          </section>
          <CareersSection pageId="construction" />
          <section id="reviews" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="construction.reviews.header" value={reviewsHeader}>
                {editing.active || visibleReviews.length > 0 ? (
                  <Intro {...reviewsHeader} />
                ) : (
                  <h2 className="font-heading text-2xl font-semibold">Share feedback privately</h2>
                )}
              </Entity>
              <Collection
                id="construction.reviews.platforms"
                value={visibleReviews}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const review = S.constructionReviewPlatformsSchema.element.parse(item);
                  return (
                    <ReviewPlatformCard
                      name={review.name}
                      description={review.description}
                      externalUrl={review.externalUrl}
                    />
                  );
                }}
              />
              <Entity id="construction.reviews.footer" value={reviewsFooter}>
                <p className="mt-8 text-sm text-muted-foreground">
                  {reviewsFooter.message}{' '}
                  <a
                    className="text-primary underline underline-offset-4"
                    href={`mailto:${reviewsFooter.email}`}
                  >
                    {reviewsFooter.email}
                  </a>
                  .
                </p>
              </Entity>
            </Container>
          </section>
          <section id="contact-details" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <div>
                <Entity id="construction.contact.header" value={contactHeader}>
                  <Intro {...contactHeader} />
                </Entity>
                <Entity id="construction.contact.details" value={contact}>
                  <div className="grid gap-4">
                    {[
                      { icon: MapPin, label: contact.addressLabel, text: contact.address },
                      {
                        icon: Phone,
                        label: contact.phoneLabel,
                        text: contact.phone,
                        href: `tel:${contact.phone.replace(/[^\d+]/g, '')}`,
                      },
                      {
                        icon: Mail,
                        label: contact.emailLabel,
                        text: contact.email,
                        href: `mailto:${contact.email}`,
                      },
                      { icon: Clock, label: contact.officeHoursLabel, text: contact.officeHours },
                    ].map(({ icon: Icon, label, text, href }) => (
                      <div className="flex items-start gap-3" key={label}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                          <strong className="block text-sm">{label}</strong>
                          {href ? (
                            <a className="text-sm text-primary hover:underline" href={href}>
                              {text}
                            </a>
                          ) : (
                            <p className="whitespace-pre-line text-sm text-muted-foreground">
                              {text}
                            </p>
                          )}
                          {label === contact.phoneLabel ? (
                            <small className="block text-muted-foreground">
                              {contact.faxLabel}: {contact.fax}
                            </small>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Entity>
              </div>
              <Button render={<a href="#bid" />} className="mt-8">
                Request a quote <ArrowRight aria-hidden="true" />
              </Button>
            </Container>
          </section>
        </div>
        <footer className="bg-sidebar py-14 text-sidebar-foreground">
          <Container width="wide" className="grid gap-10 md:grid-cols-3">
            <Entity id="construction.footer.brand" value={footerBrand}>
              <div className="space-y-4">
                <img
                  className="h-12 w-auto rounded bg-background p-1"
                  src={imageFor(footerBrand.logo.key, tricoLogo)}
                  alt={footerBrand.logoAltText}
                  loading="lazy"
                />
                <p className="text-sm leading-relaxed text-sidebar-foreground/70">
                  {footerBrand.description}
                </p>
                <address className="grid gap-1 text-sm not-italic text-sidebar-foreground/70">
                  <span>{footerBrand.address}</span>
                  <a href={`tel:${footerBrand.phone.replace(/[^\d+]/g, '')}`}>
                    {footerBrand.phone}
                  </a>
                  <a href={`mailto:${footerBrand.email}`}>{footerBrand.email}</a>
                </address>
              </div>
            </Entity>
            <nav aria-label="Quick links">
              <h3 className="mb-4 font-heading font-semibold">Quick Links</h3>
              <Collection
                id="construction.footer.links"
                value={footerLinks}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2"
                renderItem={(item) => {
                  const link = S.constructionFooterLinksSchema.element.parse(item);
                  return (
                    <FooterQuickLink href={`#${link.destination}`}>{link.label}</FooterQuickLink>
                  );
                }}
              />
            </nav>
            <Entity id="construction.footer.licenses" value={footerLicenses}>
              <div>
                <h3 className="mb-4 font-heading font-semibold">{footerLicenses.heading}</h3>
                {footerLicenses.licenses.map((license) => (
                  <p className="text-sm text-sidebar-foreground/70" key={license.id}>
                    {license.label}
                  </p>
                ))}
              </div>
            </Entity>
          </Container>
          <Container width="wide" className="mt-10 border-t border-sidebar-foreground/20 pt-5">
            <Entity id="construction.footer.legal" value={footerLegal}>
              <small className="text-sidebar-foreground/60">
                © {new Date().getFullYear()} {footerLegal.organizationName.trim()}.{' '}
                {footerLegal.rightsNotice}
              </small>
            </Entity>
          </Container>
        </footer>
      </MarketingLayout>
      <AuthenticatedEditorToolbar />
    </div>
  );
}

export function ConstructionExperience(): React.JSX.Element {
  return (
    <EditModeProvider pageId="construction">
      <ConstructionBody />
    </EditModeProvider>
  );
}

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Mountain,
  Phone,
} from 'lucide-react';
import * as S from '@app/schemas';

import brookePhoto from '../assets/images/brooke-moore.jpeg';
import developmentHero from '../assets/images/development-hero.jpg';
import featuredOne from '../assets/images/real-estate-property-1.jpeg';
import featuredTwo from '../assets/images/real-estate-property-2.jpeg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import stevePhoto from '../assets/images/steve-tripp.png';
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
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { Container } from '../design-system/layout.js';
import { MarketingLayout } from '../design-system/page-patterns.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { DevelopmentContactForm } from './DevelopmentContactForm.js';
import { parseDevelopmentValue } from './developmentContent.js';

type DevelopmentEntityId = (typeof S.developmentEntityDefinitions)[number]['id'];
const images: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/steve-tripp.png': stevePhoto,
  'media/seed/randy-rimmer.png': randyPhoto,
  'media/seed/brooke-moore.jpeg': brookePhoto,
  'media/seed/real-estate-property-1.jpeg': featuredOne,
  'media/seed/real-estate-property-2.jpeg': featuredTwo,
};

function imageFor(key: string, fallback: string): string {
  return (
    images[key] ??
    (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback)
  );
}

function definitionFor(id: DevelopmentEntityId): S.SemanticEntityDefinition {
  const result = S.developmentEntityDefinitions.find((entry) => entry.id === id);
  if (result === undefined) throw new Error(`Missing Development editor definition: ${id}`);
  return result;
}

function Entity({
  id,
  value,
  children,
}: {
  readonly id: DevelopmentEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="contents" data-development-entity-boundary="true">
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
  itemsElement,
}: {
  readonly id: DevelopmentEntityId;
  readonly value: readonly S.EditableValue[];
  readonly renderItem: (item: S.EditableValue, index: number) => React.ReactNode;
  readonly className?: string;
  readonly itemsElement?: 'ol' | 'ul';
}): React.JSX.Element {
  return (
    <div className={className} data-development-entity-boundary="true">
      <ContentCollection
        definition={definitionFor(id)}
        value={value}
        renderItem={renderItem}
        {...(itemsElement === undefined ? {} : { itemsElement })}
      />
    </div>
  );
}

function DevelopmentBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<S.PageContent>({});
  const [fallback, setFallback] = useState(false);
  const [projectTab, setProjectTab] = useState('featured');
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('development', { signal: controller.signal })
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
    id: keyof typeof S.developmentV2SeedData,
    parser: { parse(input: unknown): Output },
  ): Output => parseDevelopmentValue(document, id, parser);
  const banner = value('development.anniversary-banner', S.developmentAnniversaryBannerSchema);
  const header = value('development.header', S.developmentHeaderSchema);
  const hero = value('development.hero', S.developmentHeroSchema);
  const heroStats = value('development.hero.stats', S.developmentHeroStatsSchema);
  const landHeader = value('development.land-experts.header', S.developmentLandExpertsHeaderSchema);
  const landServices = value(
    'development.land-experts.services',
    S.developmentLandExpertsServicesSchema,
  );
  const landStats = value('development.land-experts.stats', S.developmentLandExpertsStatsSchema);
  const servicesHeader = value('development.services.header', S.developmentServicesHeaderSchema);
  const services = value('development.services.items', S.developmentServicesItemsSchema);
  const categories = value(
    'development.projects.categories',
    S.developmentProjectsCategoriesSchema,
  );
  const featured = value('development.projects.featured', S.developmentProjectsFeaturedSchema);
  const partnersHeader = value('development.partners.header', S.developmentPartnersHeaderSchema);
  const partners = value('development.partners.items', S.developmentPartnersItemsSchema);
  const visiblePartners = editing.active
    ? partners
    : partners.filter((partner) => !/^(builder|investor) partner \d+$/i.test(partner.name));
  const partnersFooter = value('development.partners.footer', S.developmentPartnersFooterSchema);
  const teamHeader = value('development.team.header', S.developmentTeamHeaderSchema);
  const team = value('development.team.members', S.developmentTeamMembersSchema);
  const about = value('development.about', S.developmentAboutSchema);
  const highlights = value('development.about.highlights', S.developmentAboutHighlightsSchema);
  const values = value('development.about.values', S.developmentAboutValuesSchema);
  const reviewsHeader = value('development.reviews.header', S.developmentReviewsHeaderSchema);
  const reviews = value('development.reviews.platforms', S.developmentReviewsPlatformsSchema);
  const visibleReviews = editing.active
    ? reviews
    : reviews.filter((review) => review.externalUrl.trim() !== '');
  const reviewsFooter = value('development.reviews.footer', S.developmentReviewsFooterSchema);
  const contactHeader = value('development.contact.header', S.developmentContactHeaderSchema);
  const contact = value('development.contact.details', S.developmentContactDetailsSchema);
  const footerBrand = value('development.footer.brand', S.developmentFooterBrandSchema);
  const footerLinks = value('development.footer.links', S.developmentFooterLinksSchema);
  const serviceAreas = value(
    'development.footer.service-areas',
    S.developmentFooterServiceAreasSchema,
  );
  const footerLegal = value('development.footer.legal', S.developmentFooterLegalSchema);
  const categoryContent = (
    <div>
      <h3 className="mb-5 mt-12 font-heading text-2xl font-semibold">
        {servicesHeader.projectsHeading}
      </h3>
      <Collection
        id="development.projects.categories"
        value={categories}
        className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 md:[&_[data-slot=editable-collection-items]]:grid-cols-3"
        renderItem={(item) => {
          const category = S.developmentProjectCategorySchema.parse(item);
          const Icon = contentIconComponents[category.icon] ?? Building2;
          return (
            <Card className="h-full border border-border/70 shadow-sm">
              <CardHeader>
                <Icon className="size-7 text-primary" aria-hidden="true" />
                <Badge variant="secondary" className="w-fit">
                  {category.count}
                </Badge>
                <h3 className="font-heading text-xl font-semibold">{category.title}</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{category.description}</p>
                <p className="text-sm text-muted-foreground">
                  Contact us to discuss {category.title.toLocaleLowerCase()} projects.
                </p>
              </CardContent>
            </Card>
          );
        }}
      />
    </div>
  );
  const featuredContent = (
    <div>
      <h3 className="mb-5 mt-12 font-heading text-2xl font-semibold">
        {servicesHeader.featuredHeading}
      </h3>
      <Collection
        id="development.projects.featured"
        value={featured}
        className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2"
        renderItem={(item) => {
          const project = S.developmentFeaturedProjectSchema.parse(item);
          return (
            <Card className="h-full overflow-hidden border border-border/70 shadow-sm">
              <img
                className="aspect-video w-full object-cover"
                src={imageFor(project.image.key, featuredOne)}
                alt={project.imageAltText}
                loading="lazy"
                decoding="async"
              />
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  {project.type}
                </Badge>
                <h3 className="font-heading text-xl font-semibold">{project.title}</h3>
                <p className="text-sm text-muted-foreground">{project.location}</p>
              </CardHeader>
            </Card>
          );
        }}
      />
    </div>
  );
  const pageHeader = (
    <>
      <Entity id="development.anniversary-banner" value={banner}>
        <AnniversaryBanner message={`${banner.message} · ${banner.years}`} />
      </Entity>
      <Entity id="development.header" value={header}>
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
          <Entity id="development.hero" value={hero}>
            <section
              aria-labelledby="development-hero-heading"
              className="bg-sidebar py-20 text-sidebar-foreground sm:py-28"
            >
              <Container
                width="wide"
                className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]"
              >
                <div className="space-y-6">
                  <Badge className="border border-sidebar-foreground/30 bg-sidebar-accent text-sidebar-foreground">
                    <Mountain className="mr-1 size-4" aria-hidden="true" />
                    {hero.eyebrow}
                  </Badge>
                  <h1
                    id="development-hero-heading"
                    className="font-heading !text-sidebar-foreground text-5xl font-semibold tracking-tight sm:text-6xl"
                  >
                    {hero.heading}{' '}
                    <span className="text-sidebar-primary">{hero.highlightedWord}</span>
                  </h1>
                  <p className="max-w-2xl text-lg leading-relaxed text-sidebar-foreground/80">
                    {hero.description}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button render={<a href="#project-gallery" />} variant="secondary" size="lg">
                      {hero.primaryActionLabel}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                    <Button
                      render={<a href="#contact" />}
                      variant="outline"
                      size="lg"
                      className="!border-sidebar-foreground/50 !bg-transparent !text-sidebar-foreground"
                    >
                      {hero.secondaryActionLabel}
                    </Button>
                  </div>
                  <Collection
                    id="development.hero.stats"
                    value={heroStats}
                    className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                    renderItem={(item) => {
                      const stat = S.developmentHeroStatSchema.parse(item);
                      const Icon = contentIconComponents[stat.icon] ?? Mountain;
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
                <figure className="relative min-h-80 overflow-hidden rounded-2xl border border-sidebar-foreground/20 bg-sidebar-accent/30 shadow-xl">
                  <img
                    className="absolute inset-0 size-full object-cover"
                    src={
                      featured[0] === undefined
                        ? developmentHero
                        : imageFor(featured[0].image.key, developmentHero)
                    }
                    alt={
                      featured[0] === undefined ? 'Land development plan' : featured[0].imageAltText
                    }
                  />
                  {featured[0] === undefined ? null : (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-sidebar/85 px-4 py-3 text-sm text-sidebar-foreground">
                      Featured project: {featured[0].title}
                    </figcaption>
                  )}
                </figure>
              </Container>
            </section>
          </Entity>
          <section id="services" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="development.land-experts.header" value={landHeader}>
                <Intro {...landHeader} />
              </Entity>
              <Collection
                id="development.land-experts.services"
                value={landServices}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 md:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const service = S.developmentLandServiceSchema.parse(item);
                  const Icon = contentIconComponents[service.icon] ?? MapPin;
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
              <Collection
                id="development.land-experts.stats"
                value={landStats}
                className="mt-8 [&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const stat = S.developmentTrustStatSchema.parse(item);
                  const Icon = contentIconComponents[stat.icon] ?? Building2;
                  return (
                    <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                      <div>
                        <strong className="block font-heading text-xl">{stat.value}</strong>
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                      </div>
                    </div>
                  );
                }}
              />
            </Container>
          </section>
          <section id="projects" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="development.services.header" value={servicesHeader}>
                <Intro {...servicesHeader} />
              </Entity>
              <Collection
                id="development.services.items"
                value={services}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const service = S.developmentServiceSchema.parse(item);
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
              <div id="project-gallery" className="scroll-mt-8">
                {editing.active ? (
                  <>
                    {categoryContent}
                    {featuredContent}
                  </>
                ) : (
                  <Tabs value={projectTab} onValueChange={setProjectTab} className="mt-10">
                    <TabsList aria-label="Development project view" className="h-11">
                      <TabsTrigger value="featured" className="min-h-10 px-4">
                        Featured work
                      </TabsTrigger>
                      <TabsTrigger value="types" className="min-h-10 px-4">
                        Project types
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="featured">
                      {projectTab === 'featured' ? featuredContent : null}
                    </TabsContent>
                    <TabsContent value="types">
                      {projectTab === 'types' ? categoryContent : null}
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </Container>
          </section>
          <section className="bg-secondary/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="development.partners.header" value={partnersHeader}>
                {editing.active || visiblePartners.length > 0 ? (
                  <Intro {...partnersHeader} />
                ) : (
                  <h2 className="font-heading text-2xl font-semibold">Partnership opportunities</h2>
                )}
              </Entity>
              <Collection
                id="development.partners.items"
                value={visiblePartners}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-4 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-4"
                renderItem={(item) => (
                  <Card className="grid min-h-24 place-items-center border border-border/70 p-4 text-center font-heading font-semibold">
                    {S.developmentPartnerSchema.parse(item).name}
                  </Card>
                )}
              />
              <Entity id="development.partners.footer" value={partnersFooter}>
                <p className="mt-8 text-sm text-muted-foreground">
                  {partnersFooter.message}{' '}
                  <a className="font-medium text-primary hover:underline" href="#contact">
                    {partnersFooter.actionLabel}
                  </a>
                  .
                </p>
              </Entity>
            </Container>
          </section>
          <section id="team" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="development.team.header" value={teamHeader}>
                <Intro {...teamHeader} />
              </Entity>
              <Collection
                id="development.team.members"
                value={team}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const person = S.developmentTeamMemberSchema.parse(item);
                  return (
                    <ProfileCard
                      name={person.name}
                      role={person.role}
                      imageSource={imageFor(person.image.key, tricoLogo)}
                      imageAltText={person.imageAltText}
                    >
                      <p>{person.bio}</p>
                    </ProfileCard>
                  );
                }}
              />
            </Container>
          </section>
          <section id="about" className="py-20 sm:py-24">
            <Container width="wide" className="grid gap-10 lg:grid-cols-2">
              <div>
                <Entity id="development.about" value={about}>
                  <div className="space-y-5">
                    <Badge variant="secondary">{about.eyebrow}</Badge>
                    <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
                      {about.heading}
                    </h2>
                    <p className="text-lg leading-relaxed">{about.introduction}</p>
                    <p className="text-muted-foreground">{about.detail}</p>
                  </div>
                </Entity>
                <Collection
                  id="development.about.highlights"
                  value={highlights}
                  itemsElement="ul"
                  className="mt-6 [&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2"
                  renderItem={(item) => (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                      {S.developmentAboutHighlightSchema.parse(item).value}
                    </div>
                  )}
                />
              </div>
              <Collection
                id="development.about.values"
                value={values}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-4"
                renderItem={(item) => {
                  const companyValue = S.developmentAboutValueSchema.parse(item);
                  const Icon = contentIconComponents[companyValue.icon] ?? Building2;
                  return (
                    <Card className="border border-border/70">
                      <CardHeader className="flex flex-row items-center gap-3">
                        <Icon className="size-6 text-primary" aria-hidden="true" />
                        <h3 className="font-heading text-lg font-semibold">{companyValue.title}</h3>
                      </CardHeader>
                      <CardContent className="text-muted-foreground">
                        {companyValue.description}
                      </CardContent>
                    </Card>
                  );
                }}
              />
            </Container>
          </section>
          <section id="reviews" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="development.reviews.header" value={reviewsHeader}>
                {editing.active || visibleReviews.length > 0 ? (
                  <Intro {...reviewsHeader} />
                ) : (
                  <h2 className="font-heading text-2xl font-semibold">Share feedback privately</h2>
                )}
              </Entity>
              <Collection
                id="development.reviews.platforms"
                value={visibleReviews}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const review = S.developmentReviewPlatformSchema.parse(item);
                  return (
                    <ReviewPlatformCard
                      name={review.name}
                      description={review.description}
                      externalUrl={review.externalUrl}
                      actionLabel={reviewsHeader.actionLabel}
                      unavailableLabel={reviewsHeader.unavailableLinkLabel}
                    />
                  );
                }}
              />
              <Entity id="development.reviews.footer" value={reviewsFooter}>
                <p className="mt-8 text-sm text-muted-foreground">
                  {reviewsFooter.message}{' '}
                  <a
                    className="text-primary underline underline-offset-4"
                    href={`mailto:${reviewsFooter.email}`}
                  >
                    {reviewsFooter.email}
                  </a>{' '}
                  {reviewsFooter.closingMessage}
                </p>
              </Entity>
            </Container>
          </section>
          <CareersSection pageId="development" />
          <section id="contact" className="py-20 sm:py-24">
            <Container width="wide" className="grid gap-10 lg:grid-cols-2">
              <div>
                <Entity id="development.contact.header" value={contactHeader}>
                  <Intro {...contactHeader} />
                </Entity>
                <Entity id="development.contact.details" value={contact}>
                  <div className="grid gap-4">
                    {[
                      { icon: MapPin, label: contact.locationLabel, text: contact.address },
                      {
                        icon: Phone,
                        label: contact.phoneLabel,
                        text: contact.phone,
                        href: `tel:${contact.phone.replace(/\D/g, '')}`,
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
                            <p className="text-sm text-muted-foreground">{text}</p>
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
              <Card className="h-fit border border-border/70 p-4 shadow-sm">
                <DevelopmentContactForm />
              </Card>
            </Container>
          </section>
        </div>
        <footer className="bg-sidebar py-14 text-sidebar-foreground">
          <Container width="wide" className="grid gap-10 md:grid-cols-3">
            <Entity id="development.footer.brand" value={footerBrand}>
              <div className="space-y-4">
                <img
                  className="h-12 w-auto rounded bg-background p-1"
                  src={imageFor(footerBrand.logo.key, tricoLogo)}
                  alt={footerBrand.logoAltText}
                  loading="lazy"
                />
                <strong className="block font-heading">{footerBrand.divisionLabel}</strong>
                <p className="text-sm leading-relaxed text-sidebar-foreground/70">
                  {footerBrand.description}
                </p>
                <div className="grid gap-1 text-sm text-sidebar-foreground/70">
                  <span>{footerBrand.address}</span>
                  <a href={`tel:${footerBrand.phone.replace(/\D/g, '')}`}>{footerBrand.phone}</a>
                  <a href={`mailto:${footerBrand.email}`}>{footerBrand.email}</a>
                </div>
              </div>
            </Entity>
            <div>
              <h3 className="mb-4 font-heading font-semibold">{footerBrand.linksHeading}</h3>
              <Collection
                id="development.footer.links"
                value={footerLinks}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2"
                renderItem={(item) => {
                  const link = S.developmentFooterLinkSchema.parse(item);
                  return (
                    <FooterQuickLink href={`#${link.destination}`}>{link.label}</FooterQuickLink>
                  );
                }}
              />
            </div>
            <div>
              <h3 className="mb-4 font-heading font-semibold">{footerBrand.serviceAreasHeading}</h3>
              <Collection
                id="development.footer.service-areas"
                value={serviceAreas}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2"
                renderItem={(item) => (
                  <p className="text-sm text-sidebar-foreground/70">
                    {S.developmentFooterServiceAreasSchema.element.parse(item).label}
                  </p>
                )}
              />
            </div>
          </Container>
          <Container width="wide" className="mt-10 border-t border-sidebar-foreground/20 pt-5">
            <Entity id="development.footer.legal" value={footerLegal}>
              <small className="text-sidebar-foreground/60">
                © {new Date().getFullYear()} {footerLegal.organizationName}.{' '}
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

export function DevelopmentExperience(): React.JSX.Element {
  return (
    <EditModeProvider pageId="development">
      <DevelopmentBody />
    </EditModeProvider>
  );
}

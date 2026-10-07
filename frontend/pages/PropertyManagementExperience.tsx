import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  Quote,
  Star,
} from 'lucide-react';
import * as S from '@app/schemas';

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
import { PropertyManagementAnalysisForm } from './PropertyManagementForms.js';
import { parsePropertyManagementValue } from './propertyManagementContent.js';

type PropertyEntityId = (typeof S.propertyManagementEntityDefinitions)[number]['id'];
const images: Readonly<Record<string, string>> = {
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
function imageFor(key: string): string | undefined {
  return (
    images[key] ??
    (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : undefined)
  );
}
function definitionFor(id: PropertyEntityId): S.SemanticEntityDefinition {
  const result = S.propertyManagementEntityDefinitions.find((entry) => entry.id === id);
  if (result === undefined) throw new Error(`Missing Property Management editor definition: ${id}`);
  return result;
}
function Entity({
  id,
  value,
  children,
}: {
  readonly id: PropertyEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="contents" data-property-management-entity-boundary="true">
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
  readonly id: PropertyEntityId;
  readonly value: readonly S.EditableValue[];
  readonly renderItem: (item: S.EditableValue, index: number) => React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div className={className} data-property-management-entity-boundary="true">
      <ContentCollection definition={definitionFor(id)} value={value} renderItem={renderItem} />
    </div>
  );
}
function PropertyManagementBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<S.PageContent>({});
  const [fallback, setFallback] = useState(false);
  const [portfolioTab, setPortfolioTab] = useState('managed');
  const [showAllManaged, setShowAllManaged] = useState(false);
  const [showAllTestimonials, setShowAllTestimonials] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('property-management', { signal: controller.signal })
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
    id: keyof typeof S.propertyManagementV2SeedData,
    parser: { parse(input: unknown): Output },
  ): Output => parsePropertyManagementValue(document, id, parser);
  const banner = value(
    'property-management.anniversary-banner',
    S.propertyManagementAnniversaryBannerSchema,
  );
  const header = value('property-management.header', S.propertyManagementHeaderSchema);
  const hero = value('property-management.hero', S.propertyManagementHeroSchema);
  const heroStats = value('property-management.hero.stats', S.propertyManagementHeroStatsSchema);
  const servicesHeader = value(
    'property-management.services.header',
    S.propertyManagementServicesHeaderSchema,
  );
  const services = value(
    'property-management.services.items',
    S.propertyManagementServicesItemsSchema,
  );
  const processHeader = value(
    'property-management.process.header',
    S.propertyManagementProcessHeaderSchema,
  );
  const processSteps = value(
    'property-management.process.steps',
    S.propertyManagementProcessStepsSchema,
  );
  const managedHeader = value(
    'property-management.portfolio.managed.header',
    S.propertyManagementPortfolioHeaderSchema,
  );
  const managed = value(
    'property-management.portfolio.managed.items',
    S.propertyManagementPortfolioItemsSchema,
  );
  const coasHeader = value(
    'property-management.portfolio.coas.header',
    S.propertyManagementPortfolioHeaderSchema,
  );
  const coas = value(
    'property-management.portfolio.coas.items',
    S.propertyManagementPortfolioItemsSchema,
  );
  const hoasHeader = value(
    'property-management.portfolio.hoas.header',
    S.propertyManagementPortfolioHeaderSchema,
  );
  const hoas = value(
    'property-management.portfolio.hoas.items',
    S.propertyManagementPortfolioItemsSchema,
  );
  const portal = value('property-management.tenant-portal', S.propertyManagementTenantPortalSchema);
  const portalFeatures = value(
    'property-management.tenant-portal.features',
    S.propertyManagementTenantPortalFeaturesSchema,
  );
  const teamHeader = value('property-management.team.header', S.propertyManagementTeamHeaderSchema);
  const team = value('property-management.team.members', S.propertyManagementTeamMembersSchema);
  const about = value('property-management.about', S.propertyManagementAboutSchema);
  const aboutFeatures = value(
    'property-management.about.features',
    S.propertyManagementAboutFeaturesSchema,
  );
  const testimonialsHeader = value(
    'property-management.testimonials.header',
    S.propertyManagementTestimonialsHeaderSchema,
  );
  const testimonials = value(
    'property-management.testimonials.items',
    S.propertyManagementTestimonialsItemsSchema,
  );
  const visibleTestimonials = editing.active
    ? testimonials
    : testimonials.filter((testimonial) =>
        S.isPubliclyVisible(
          testimonial.publicVisibility,
          !S.propertyManagementV2SeedData['property-management.testimonials.items'].some(
            (seed) =>
              seed.quote === testimonial.quote ||
              (testimonial.image.kind === 'external' && seed.image.url === testimonial.image.url),
          ),
        ),
      );
  const testimonialStats = value(
    'property-management.testimonials.stats',
    S.propertyManagementTestimonialsStatsSchema,
  );
  const faqHeader = value('property-management.faq.header', S.propertyManagementFaqHeaderSchema);
  const faqs = value('property-management.faq.items', S.propertyManagementFaqItemsSchema);
  const reviewsHeader = value(
    'property-management.reviews.header',
    S.propertyManagementReviewsHeaderSchema,
  );
  const reviewPlatforms = value(
    'property-management.reviews.platforms',
    S.propertyManagementReviewsPlatformsSchema,
  );
  const reviewsFooter = value(
    'property-management.reviews.footer',
    S.propertyManagementReviewsFooterSchema,
  );
  const contactHeader = value(
    'property-management.contact.header',
    S.propertyManagementContactHeaderSchema,
  );
  const contact = value(
    'property-management.contact.details',
    S.propertyManagementContactDetailsSchema,
  );
  const footerBrand = value(
    'property-management.footer.brand',
    S.propertyManagementFooterBrandSchema,
  );
  const footerLinks = value(
    'property-management.footer.links',
    S.propertyManagementFooterLinksSchema,
  );
  const footerSocial = value(
    'property-management.footer.social',
    S.propertyManagementFooterSocialSchema,
  );
  const footerLegal = value(
    'property-management.footer.legal',
    S.propertyManagementFooterLegalSchema,
  );
  const publicPortfolio = (items: typeof managed): typeof managed =>
    editing.active ? items : items.filter((item) => imageFor(item.photo.key) !== undefined);
  const portfolioGroups = [
    {
      key: 'managed',
      label: 'Managed properties',
      headerId: 'property-management.portfolio.managed.header',
      itemsId: 'property-management.portfolio.managed.items',
      header: managedHeader,
      items: managed,
    },
    {
      key: 'coas',
      label: 'Commercial associations',
      headerId: 'property-management.portfolio.coas.header',
      itemsId: 'property-management.portfolio.coas.items',
      header: coasHeader,
      items: coas,
    },
    {
      key: 'hoas',
      label: 'HOA communities',
      headerId: 'property-management.portfolio.hoas.header',
      itemsId: 'property-management.portfolio.hoas.items',
      header: hoasHeader,
      items: hoas,
    },
  ] as const;
  const renderPortfolioGroup = (group: (typeof portfolioGroups)[number]): React.JSX.Element => {
    const readyItems = publicPortfolio(group.items);
    const canExpand = !editing.active && group.key === 'managed' && readyItems.length > 3;
    return (
      <div key={group.key} className="space-y-6">
        <Entity id={group.headerId} value={group.header}>
          <Intro {...group.header} />
        </Entity>
        <div id={group.key === 'managed' ? 'managed-property-cards' : undefined}>
          <Collection
            id={group.itemsId}
            value={canExpand && !showAllManaged ? readyItems.slice(0, 3) : readyItems}
            className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
            renderItem={propertyCard}
          />
        </div>
        {canExpand ? (
          <Button
            variant="outline"
            className="min-h-11"
            aria-controls="managed-property-cards"
            aria-expanded={showAllManaged}
            onClick={() => setShowAllManaged((current) => !current)}
          >
            {showAllManaged
              ? 'Show fewer managed properties'
              : `Show all ${readyItems.length} managed properties`}
          </Button>
        ) : null}
      </div>
    );
  };
  const visibleTeam = editing.active
    ? team
    : team.filter((person) => !/coming soon/i.test(person.name));
  const visibleReviews = editing.active
    ? reviewPlatforms
    : reviewPlatforms.filter((review) => review.externalUrl.trim() !== '');
  const propertyCard = (item: S.EditableValue): React.ReactNode => {
    const property = S.propertyManagementPortfolioItemsSchema.element.parse(item);
    const source = imageFor(property.photo.key);
    return (
      <Card className="h-full overflow-hidden border border-border/70 shadow-sm">
        {source === undefined ? (
          <div
            className="grid aspect-video place-items-center bg-muted text-muted-foreground"
            data-neutral-placeholder="true"
          >
            <ImageIcon className="size-8" aria-hidden="true" />
            <span>Photo coming soon</span>
          </div>
        ) : (
          <img
            className="aspect-video w-full object-cover"
            src={source}
            alt={property.photoAltText}
            loading="lazy"
            decoding="async"
          />
        )}
        <CardHeader>
          <h3 className="font-heading text-lg font-semibold">{property.name}</h3>
        </CardHeader>
        <CardContent className="text-muted-foreground">{property.description}</CardContent>
      </Card>
    );
  };
  const serviceCard = (item: S.EditableValue): React.ReactNode => {
    const service = S.propertyManagementServicesItemsSchema.element.parse(item);
    const Icon = contentIconComponents[service.icon] ?? Building2;
    return (
      <Card className="h-full border border-border/70 shadow-sm">
        <CardHeader>
          <Icon className="size-7 text-primary" aria-hidden="true" />
          <h3 className="font-heading text-lg font-semibold">{service.title}</h3>
        </CardHeader>
        <CardContent className="text-muted-foreground">{service.description}</CardContent>
      </Card>
    );
  };
  const pageHeader = (
    <>
      <Entity id="property-management.anniversary-banner" value={banner}>
        <AnniversaryBanner message={banner.message} />
      </Entity>
      <Entity id="property-management.header" value={header}>
        <PublicHeader
          logoSrc={imageFor(header.logo.key) ?? tricoLogo}
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
          <Entity id="property-management.hero" value={hero}>
            <section
              aria-labelledby="property-management-hero-heading"
              className="bg-sidebar py-20 text-sidebar-foreground sm:py-28"
            >
              <Container width="wide" className="grid items-center gap-12 lg:grid-cols-2">
                <div className="space-y-6">
                  <Badge className="border border-sidebar-foreground/30 bg-sidebar-accent text-sidebar-foreground">
                    <Building2 className="mr-1 size-4" aria-hidden="true" />
                    {hero.eyebrow}
                  </Badge>
                  <h1
                    id="property-management-hero-heading"
                    className="font-heading !text-sidebar-foreground text-5xl font-semibold tracking-tight sm:text-6xl"
                  >
                    {hero.heading}
                  </h1>
                  <p className="max-w-xl text-lg leading-relaxed text-sidebar-foreground/80">
                    {hero.description}
                  </p>
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
                    id="property-management.hero.stats"
                    value={heroStats}
                    className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                    renderItem={(item) => {
                      const stat = S.propertyManagementHeroStatsSchema.element.parse(item);
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
                  src={imageFor(hero.image.key) ?? aboutPhoto}
                  alt={
                    hero.image.key === 'media/seed/placeholder-neutral.svg'
                      ? 'Commercial property building managed by TriCo'
                      : hero.imageAltText
                  }
                />
              </Container>
            </section>
          </Entity>
          <section id="services" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="property-management.services.header" value={servicesHeader}>
                <Intro {...servicesHeader} />
              </Entity>
              <Collection
                id="property-management.services.items"
                value={services}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={serviceCard}
              />
            </Container>
          </section>
          <section id="process" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="property-management.process.header" value={processHeader}>
                <Intro {...processHeader} />
              </Entity>
              <Collection
                id="property-management.process.steps"
                value={processSteps}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-4"
                renderItem={(item) => {
                  const step = S.propertyManagementProcessStepsSchema.element.parse(item);
                  const Icon = contentIconComponents[step.icon] ?? Building2;
                  return (
                    <Card className="h-full border border-border/70">
                      <CardHeader>
                        <Badge variant="secondary" className="w-fit">
                          {step.number}
                        </Badge>
                        <Icon className="size-6 text-primary" aria-hidden="true" />
                        <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
                      </CardHeader>
                      <CardContent className="text-muted-foreground">
                        {step.description}
                      </CardContent>
                    </Card>
                  );
                }}
              />
            </Container>
          </section>
          <section id="managed-properties" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              {editing.active ? (
                <div className="space-y-14">{portfolioGroups.map(renderPortfolioGroup)}</div>
              ) : (
                <Tabs value={portfolioTab} onValueChange={setPortfolioTab}>
                  <div className="mb-8">
                    <TabsList
                      aria-label="Property portfolio category"
                      className="grid h-auto w-full grid-cols-3"
                    >
                      {portfolioGroups.map((group) => (
                        <TabsTrigger
                          key={group.key}
                          value={group.key}
                          aria-label={group.label}
                          className="min-h-11 min-w-0 px-1 text-xs whitespace-normal sm:text-sm"
                        >
                          {group.key === 'managed'
                            ? 'Managed'
                            : group.key === 'coas'
                              ? 'Commercial'
                              : 'HOA'}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  {portfolioGroups.map((group) => (
                    <TabsContent key={group.key} value={group.key}>
                      {portfolioTab === group.key ? renderPortfolioGroup(group) : null}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </Container>
          </section>
          <section id="tenant-portal" className="py-20 sm:py-24">
            <Container width="medium">
              <Entity id="property-management.tenant-portal" value={portal}>
                <Intro {...portal} />
              </Entity>
              <Collection
                id="property-management.tenant-portal.features"
                value={portalFeatures}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2"
                renderItem={serviceCard}
              />
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button render={<a href={portal.externalUrl} target="_blank" rel="noreferrer" />}>
                  {portal.actionLabel}
                  <ExternalLink aria-hidden="true" />
                </Button>
                <p className="text-sm text-muted-foreground">{portal.note}</p>
              </div>
            </Container>
          </section>
          <section id="team" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="property-management.team.header" value={teamHeader}>
                <Intro {...teamHeader} />
              </Entity>
              <Collection
                id="property-management.team.members"
                value={visibleTeam}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const person = S.propertyManagementTeamMembersSchema.element.parse(item);
                  return (
                    <ProfileCard
                      name={person.name}
                      role={person.title}
                      imageSource={imageFor(person.photo.key)}
                      imageAltText={person.photoAltText}
                    >
                      <p>{person.description}</p>
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
                          href={'tel:' + person.phone.replace(/\D/g, '')}
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
          <Entity id="property-management.about" value={about}>
            <section id="about" className="bg-sidebar py-20 text-sidebar-foreground sm:py-24">
              <Container width="wide" className="grid items-center gap-12 lg:grid-cols-2">
                <div className="relative">
                  <img
                    className="aspect-[4/3] w-full rounded-2xl object-cover"
                    src={imageFor(about.image.key) ?? aboutPhoto}
                    alt={about.imageAltText}
                    loading="lazy"
                    decoding="async"
                  />
                  <Badge className="absolute bottom-4 left-4 bg-background text-foreground">
                    {about.statValue} {about.statLabel}
                  </Badge>
                </div>
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
                    id="property-management.about.features"
                    value={aboutFeatures}
                    className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2"
                    renderItem={(item) => (
                      <span className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        {S.propertyManagementAboutFeaturesSchema.element.parse(item).title}
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
          {editing.active || visibleTestimonials.length > 0 ? (
            <section id="client-stories" className="bg-muted/40 py-20 sm:py-24">
              <Container width="wide">
                <Entity id="property-management.testimonials.header" value={testimonialsHeader}>
                  <Intro {...testimonialsHeader} />
                </Entity>
                <Collection
                  id="property-management.testimonials.items"
                  value={
                    editing.active || showAllTestimonials
                      ? visibleTestimonials
                      : visibleTestimonials.slice(0, 1)
                  }
                  className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                  renderItem={(item) => {
                    const testimonial =
                      S.propertyManagementTestimonialsItemsSchema.element.parse(item);
                    const source =
                      testimonial.image.kind === 'external'
                        ? testimonial.image.url
                        : imageFor(testimonial.image.key);
                    return (
                      <Card className="h-full border border-border/70">
                        <CardHeader>
                          <Quote className="size-6 text-primary" aria-hidden="true" />
                          <div className="flex items-center gap-3">
                            {source === undefined ? null : (
                              <img
                                className="size-12 rounded-full object-cover"
                                src={source}
                                alt={testimonial.imageAltText}
                                loading="lazy"
                              />
                            )}
                            <div>
                              <h3 className="font-heading font-semibold">{testimonial.name}</h3>
                              <span className="text-xs text-muted-foreground">
                                {testimonial.role}
                              </span>
                            </div>
                          </div>
                          <div
                            className="flex text-warning"
                            aria-label={`${testimonial.rating} out of 5 stars`}
                          >
                            {Array.from({ length: testimonial.rating }, (_, index) => (
                              <Star
                                className="size-4 fill-current"
                                key={index}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        </CardHeader>
                        <CardContent className="text-muted-foreground">
                          “{testimonial.quote}”
                        </CardContent>
                      </Card>
                    );
                  }}
                />
                {!editing.active && visibleTestimonials.length > 1 ? (
                  <Button
                    variant="outline"
                    className="mt-6 min-h-11"
                    aria-expanded={showAllTestimonials}
                    onClick={() => setShowAllTestimonials((current) => !current)}
                  >
                    {showAllTestimonials
                      ? 'Show fewer client stories'
                      : `Show all ${visibleTestimonials.length} client stories`}
                  </Button>
                ) : null}
                <Collection
                  id="property-management.testimonials.stats"
                  value={editing.active ? testimonialStats : []}
                  className={
                    editing.active
                      ? 'mt-8 [&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3'
                      : ''
                  }
                  renderItem={(item) => {
                    const stat = S.propertyManagementTestimonialsStatsSchema.element.parse(item);
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
          ) : null}
          <section id="faq" className="py-20 sm:py-24">
            <Container width="medium">
              <Entity id="property-management.faq.header" value={faqHeader}>
                <Intro {...faqHeader} />
              </Entity>
              <Collection
                id="property-management.faq.items"
                value={faqs}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3"
                renderItem={(item) => {
                  const faq = S.propertyManagementFaqItemsSchema.element.parse(item);
                  return (
                    <details className="group rounded-lg border bg-card p-4">
                      <summary className="cursor-pointer font-medium">{faq.question}</summary>
                      <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                    </details>
                  );
                }}
              />
            </Container>
          </section>
          <CareersSection pageId="property-management" />
          <section id="reviews" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="property-management.reviews.header" value={reviewsHeader}>
                {editing.active || visibleReviews.length > 0 ? (
                  <Intro {...reviewsHeader} />
                ) : (
                  <h2 className="font-heading text-2xl font-semibold">Share feedback privately</h2>
                )}
              </Entity>
              <Collection
                id="property-management.reviews.platforms"
                value={visibleReviews}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const review = S.propertyManagementReviewsPlatformsSchema.element.parse(item);
                  return (
                    <ReviewPlatformCard
                      name={review.name}
                      description={review.description}
                      externalUrl={review.externalUrl}
                    />
                  );
                }}
              />
              <Entity id="property-management.reviews.footer" value={reviewsFooter}>
                <p className="mt-8 text-sm text-muted-foreground">
                  {reviewsFooter.privateFeedbackLabel}{' '}
                  <a
                    className="text-primary underline underline-offset-4"
                    href={`mailto:${reviewsFooter.email}`}
                  >
                    {reviewsFooter.email}
                  </a>{' '}
                  — we read every message.
                </p>
              </Entity>
            </Container>
          </section>
          <span id="new-client" className="block scroll-mt-20" aria-hidden="true" />
          <section id="contact" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide" className="grid gap-10 lg:grid-cols-2">
              <div>
                <Entity id="property-management.contact.header" value={contactHeader}>
                  <Intro {...contactHeader} />
                </Entity>
                <Entity id="property-management.contact.details" value={contact}>
                  <div className="grid gap-4">
                    <Button
                      render={<a href={contact.reviewUrl} target="_blank" rel="noreferrer" />}
                      variant="outline"
                      className="w-fit"
                    >
                      {contact.reviewLabel}
                    </Button>
                    {[
                      { icon: MapPin, label: 'Office Location', text: contact.address },
                      {
                        icon: Phone,
                        label: 'Phone',
                        text: contact.phone,
                        href: `tel:${contact.phone.replace(/\D/g, '')}`,
                      },
                      {
                        icon: Mail,
                        label: 'Email',
                        text: contact.email,
                        href: `mailto:${contact.email}`,
                      },
                      { icon: Clock, label: 'Office Hours', text: contact.officeHours },
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
                          {label === 'Phone' ? (
                            <small className="block text-muted-foreground">
                              Fax: {contact.fax}
                            </small>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-start gap-3">
                      <Award className="size-5 text-primary" aria-hidden="true" />
                      <div>
                        <strong className="block text-sm">Licenses</strong>
                        {contact.licenses.map((license) => (
                          <p className="text-xs text-muted-foreground" key={license.id}>
                            {license.label}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </Entity>
              </div>
              <Card className="h-fit border border-border/70 p-6 shadow-sm">
                <PropertyManagementAnalysisForm />
              </Card>
            </Container>
          </section>
        </div>
        <footer className="bg-sidebar py-14 text-sidebar-foreground">
          <Container width="wide" className="grid gap-10 md:grid-cols-3">
            <Entity id="property-management.footer.brand" value={footerBrand}>
              <div className="space-y-4">
                <img
                  className="h-12 w-auto rounded bg-background p-1"
                  src={imageFor(footerBrand.logo.key) ?? propertyLogo}
                  alt={footerBrand.logoAltText}
                  loading="lazy"
                />
                <p className="text-sm leading-relaxed text-sidebar-foreground/70">
                  {footerBrand.description}
                </p>
                <Collection
                  id="property-management.footer.social"
                  value={
                    editing.active
                      ? footerSocial
                      : footerSocial.filter((social) => social.externalUrl.trim() !== '')
                  }
                  className="[&_[data-slot=editable-collection-items]]:flex [&_[data-slot=editable-collection-items]]:gap-2"
                  renderItem={(item) => {
                    const social = S.propertyManagementFooterSocialSchema.element.parse(item);
                    return (
                      <a
                        className="rounded-lg border border-sidebar-foreground/20 px-3 py-1 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        href={social.externalUrl}
                        aria-label={social.label}
                      >
                        {social.label}
                      </a>
                    );
                  }}
                />
              </div>
            </Entity>
            <div className="md:col-span-2">
              <Collection
                id="property-management.footer.links"
                value={footerLinks}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2"
                renderItem={(item, index) => {
                  const link = S.propertyManagementFooterLinksSchema.element.parse(item);
                  const previous = footerLinks[index - 1];
                  return (
                    <div className="text-sm">
                      {previous === undefined || previous.group !== link.group ? (
                        <strong className="block font-heading text-sidebar-foreground">
                          {link.group}
                        </strong>
                      ) : null}
                      <FooterQuickLink href={`#${link.destination}`}>{link.label}</FooterQuickLink>
                    </div>
                  );
                }}
              />
            </div>
          </Container>
          <Container width="wide" className="mt-10 border-t border-sidebar-foreground/20 pt-5">
            <Entity id="property-management.footer.legal" value={footerLegal}>
              <div className="flex flex-wrap justify-between gap-3 text-xs text-sidebar-foreground/60">
                <span>
                  © {new Date().getFullYear()} {footerLegal.organizationName}.{' '}
                  {footerLegal.rightsNotice}
                </span>
                {editing.active ? (
                  <span>
                    {footerLegal.privacyLabel} and {footerLegal.termsLabel} need approved URLs
                    before publication.
                  </span>
                ) : null}
              </div>
            </Entity>
          </Container>
        </footer>
      </MarketingLayout>
      <AuthenticatedEditorToolbar />
    </div>
  );
}
export function PropertyManagementExperience(): React.JSX.Element {
  return (
    <EditModeProvider pageId="property-management">
      <PropertyManagementBody />
    </EditModeProvider>
  );
}

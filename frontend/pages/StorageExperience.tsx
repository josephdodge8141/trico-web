import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Clock, Mail, MapPin, Phone, Warehouse } from 'lucide-react';
import {
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
import heroPhoto from '../assets/images/storage-hero.png';
import storageLogo from '../assets/images/trico-storage-logo.png';
import { AnniversaryBanner } from '../components/AnniversaryBanner.js';
import { CareersSection } from '../components/CareersSection.js';
import { PublicHeader } from '../components/PublicHeader.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { ContentCollection, ContentEntity } from '../components/ContentEntity.js';
import { DivisionSectionIntro as Intro } from '../components/DivisionSectionIntro.js';
import { FooterQuickLink } from '../components/FooterQuickLink.js';
import { ReviewPlatformCard } from '../components/ReviewPlatformCard.js';
import { ProfileCard } from '../components/ProfileCard.js';
import { AuthenticatedEditorToolbar } from '../components/AuthenticatedEditorToolbar.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Separator } from '../components/ui/separator.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { Container } from '../design-system/layout.js';
import { MarketingLayout } from '../design-system/page-patterns.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { StorageContactForm } from './StorageContactForm.js';
import { parseStorageValue } from './storageContent.js';

type StorageEntityId = (typeof storageEntityDefinitions)[number]['id'];

const images: Readonly<Record<string, string>> = {
  'media/seed/trico-storage-logo.png': storageLogo,
  'media/seed/storage-hero.png': heroPhoto,
  'media/seed/steve-tripp.png': stevePhoto,
  'media/seed/amber-lamborn.jpeg': amberPhoto,
  'media/seed/lynette-staker.jpg': lynettePhoto,
  'media/seed/deborah-peterson.jpeg': deborahPhoto,
};

function imageFor(key: string, fallback: string): string {
  return (
    images[key] ??
    (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback)
  );
}

function definitionFor(id: StorageEntityId): SemanticEntityDefinition {
  const result = storageEntityDefinitions.find((entry) => entry.id === id);
  if (result === undefined) throw new Error(`Missing Storage editor definition: ${id}`);
  return result;
}

function Entity({
  id,
  value,
  children,
}: {
  readonly id: StorageEntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="contents" data-storage-entity-boundary="true">
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
  readonly id: StorageEntityId;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div className={className} data-storage-entity-boundary="true">
      <ContentCollection definition={definitionFor(id)} value={value} renderItem={renderItem} />
    </div>
  );
}

function StorageBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<PageContent>({});
  const [fallback, setFallback] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('storage', { signal: controller.signal })
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
    id: keyof typeof storageV2SeedData,
    parser: { parse(input: unknown): Output },
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
  const visibleReviews = editing.active
    ? reviews
    : reviews.filter((review) => review.externalUrl.trim() !== '');
  const contactHeader = value('storage.contact.header', storageContactHeaderSchema);
  const contact = value('storage.contact.details', storageContactDetailsSchema);
  const footerBrand = value('storage.footer.brand', storageFooterBrandSchema);
  const footerLinks = value('storage.footer.links', storageFooterLinksSchema);
  const branding = value('storage.footer.branding-options', storageFooterBrandingOptionsSchema);
  const legal = value('storage.footer.legal', storageFooterLegalSchema);

  const pageHeader = (
    <>
      <Entity id="storage.anniversary-banner" value={banner}>
        <AnniversaryBanner message={banner.message} />
      </Entity>
      <Entity id="storage.header" value={header}>
        <PublicHeader
          logoSrc={imageFor(header.logo.key, storageLogo)}
          logoAltText={header.logoAltText}
          links={header.navLinks}
          actionLabel={hero.primaryActionLabel}
        />
      </Entity>
    </>
  );

  return (
    <div className="min-w-80 bg-background text-foreground">
      <a
        href="#storage-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-3"
      >
        Skip to main content
      </a>
      <MarketingLayout header={pageHeader}>
        <div id="storage-main">
          {fallback ? (
            <p role="status" className="bg-warning/10 px-4 py-3 text-center text-sm">
              Showing the checked-in site content while published Storage content is unavailable.
            </p>
          ) : null}
          <Entity id="storage.hero" value={hero}>
            <section
              aria-labelledby="storage-hero-heading"
              className="bg-sidebar py-20 text-sidebar-foreground sm:py-28"
            >
              <Container width="wide" className="grid items-center gap-12 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border border-sidebar-foreground/30 bg-sidebar-accent text-sidebar-foreground">
                      {hero.primaryBadge}
                    </Badge>
                    <Badge className="border border-sidebar-foreground/30 bg-transparent text-sidebar-foreground">
                      {hero.serviceAreaBadge}
                    </Badge>
                  </div>
                  <h1
                    id="storage-hero-heading"
                    className="font-heading !text-sidebar-foreground text-5xl font-semibold tracking-tight sm:text-6xl"
                  >
                    {hero.heading}
                  </h1>
                  <p className="max-w-xl text-lg leading-relaxed text-sidebar-foreground/80">
                    {hero.description}
                  </p>
                  <p className="max-w-xl text-sm font-medium text-sidebar-foreground/70">
                    {hero.subheading}
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
                    id="storage.hero.stats"
                    value={stats}
                    className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                    renderItem={(item) => {
                      const stat = storageHeroStatSchema.parse(item);
                      const Icon = contentIconComponents[stat.icon] ?? Warehouse;
                      return (
                        <div className="rounded-lg border border-sidebar-foreground/20 bg-sidebar-accent/40 p-3">
                          <Icon
                            className="mb-2 size-5 text-sidebar-foreground/70"
                            aria-hidden="true"
                          />
                          <strong className="block text-lg">{stat.value}</strong>
                          <span className="text-xs text-sidebar-foreground/70">{stat.label}</span>
                        </div>
                      );
                    }}
                  />
                </div>
                <figure className="overflow-hidden rounded-2xl border border-sidebar-foreground/20 bg-sidebar-accent shadow-xl">
                  <img
                    className="aspect-[4/3] w-full object-cover"
                    src={imageFor(hero.image.key, heroPhoto)}
                    alt={hero.imageAltText}
                  />
                  <figcaption className="p-3 text-xs text-sidebar-foreground/70">
                    {hero.imageCaption}
                  </figcaption>
                </figure>
              </Container>
            </section>
          </Entity>
          <section id="services" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="storage.services.header" value={servicesHeader}>
                <Intro {...servicesHeader} />
              </Entity>
              <Collection
                id="storage.services.items"
                value={services}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item, index) => {
                  const service = storageServiceSchema.parse(item);
                  const Icon = contentIconComponents[service.icon] ?? Building2;
                  return (
                    <Card
                      className={`h-full border border-border/70 shadow-sm ${index >= 6 && !showAllServices && !editing.active ? 'hidden lg:block' : ''}`}
                    >
                      <CardHeader>
                        <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <h3 className="font-heading text-lg font-semibold">{service.title}</h3>
                      </CardHeader>
                      <CardContent className="leading-relaxed text-muted-foreground">
                        {service.description}
                      </CardContent>
                    </Card>
                  );
                }}
              />
              {services.length <= 6 || editing.active ? null : (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 lg:hidden"
                  aria-expanded={showAllServices}
                  onClick={() => setShowAllServices((shown) => !shown)}
                >
                  {showAllServices ? 'Show fewer services' : `Show all ${services.length} services`}
                </Button>
              )}
            </Container>
          </section>
          <section id="team" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="storage.team.header" value={teamHeader}>
                <Intro {...teamHeader} />
              </Entity>
              <Collection
                id="storage.team.members"
                value={team}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-4"
                renderItem={(item) => {
                  const person = storageTeamMemberSchema.parse(item);
                  return (
                    <ProfileCard
                      name={person.name}
                      role={person.role}
                      imageSource={imageFor(person.image.key, storageLogo)}
                      imageAltText={person.imageAltText}
                    >
                      {person.bio.trim() !== '' &&
                      (editing.active || !/coming soon/i.test(person.bio)) ? (
                        editing.active ? (
                          <p>{person.bio}</p>
                        ) : (
                          <details className="group text-sm text-muted-foreground">
                            <summary className="cursor-pointer font-medium text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary">
                              Read full bio
                            </summary>
                            <p className="mt-3 leading-relaxed">{person.bio}</p>
                          </details>
                        )
                      ) : null}
                    </ProfileCard>
                  );
                }}
              />
            </Container>
          </section>
          <Entity id="storage.about" value={about}>
            <section id="about" className="bg-sidebar py-20 text-sidebar-foreground sm:py-24">
              <Container
                width="wide"
                className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]"
              >
                <Card className="border border-sidebar-foreground/20 bg-sidebar-accent p-6 text-sidebar-foreground shadow-xl">
                  <strong className="font-heading text-3xl">TriCo</strong>
                  <span className="text-sm">Storage Management</span>
                  <Separator className="my-5 bg-sidebar-foreground/20" />
                  <strong className="font-heading text-5xl">{about.statValue}</strong>
                  <span className="text-sm text-sidebar-foreground/70">{about.statLabel}</span>
                </Card>
                <div className="space-y-5">
                  <Badge className="border border-sidebar-foreground/30 bg-sidebar-accent text-sidebar-foreground">
                    {about.eyebrow}
                  </Badge>
                  <h2 className="font-heading !text-sidebar-foreground text-3xl font-semibold sm:text-4xl">
                    {about.heading}
                  </h2>
                  <p className="text-lg leading-relaxed">{about.introduction}</p>
                  <p className="font-medium text-sidebar-foreground/85">{about.bridge}</p>
                  <p className="leading-relaxed text-sidebar-foreground/70">{about.detail}</p>
                  <p className="leading-relaxed text-sidebar-foreground/70">{about.conclusion}</p>
                  <Button render={<a href="#contact" />} variant="secondary">
                    {about.actionLabel}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </div>
              </Container>
            </section>
          </Entity>
          <section id="reviews" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="storage.reviews.header" value={reviewsHeader}>
                {editing.active || visibleReviews.length > 0 ? (
                  <Intro {...reviewsHeader} />
                ) : (
                  <h2 className="font-heading text-2xl font-semibold">Share feedback privately</h2>
                )}
              </Entity>
              <Collection
                id="storage.reviews.platforms"
                value={visibleReviews}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const review = storageReviewPlatformSchema.parse(item);
                  return (
                    <ReviewPlatformCard
                      name={review.name}
                      description={review.description}
                      externalUrl={review.externalUrl}
                    />
                  );
                }}
              />
              <Entity id="storage.reviews.footer" value={reviewsFooter}>
                <p className="mt-8 text-sm text-muted-foreground">
                  {reviewsFooter.message}{' '}
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
          <CareersSection pageId="storage" />
          <section id="contact" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide" className="grid gap-10 lg:grid-cols-2">
              <div>
                <Entity id="storage.contact.header" value={contactHeader}>
                  <Intro {...contactHeader} />
                </Entity>
                <Entity id="storage.contact.details" value={contact}>
                  <div className="grid gap-4">
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
                  </div>
                </Entity>
              </div>
              <Card className="h-fit border border-border/70 p-4 shadow-sm">
                <StorageContactForm />
              </Card>
            </Container>
          </section>
        </div>
        <footer className="bg-sidebar py-14 text-sidebar-foreground">
          <Container width="wide" className="grid gap-10 md:grid-cols-3">
            <Entity id="storage.footer.brand" value={footerBrand}>
              <div className="space-y-4">
                <img
                  className="h-12 w-auto rounded bg-background p-1"
                  src={imageFor(footerBrand.logo.key, storageLogo)}
                  alt={footerBrand.logoAltText}
                  loading="lazy"
                />
                <p className="text-sm leading-relaxed text-sidebar-foreground/70">
                  {footerBrand.description}
                </p>
                <address className="grid gap-1 text-sm not-italic text-sidebar-foreground/70">
                  <span>{footerBrand.address}</span>
                  <a href={`tel:${footerBrand.phone.replace(/\D/g, '')}`}>{footerBrand.phone}</a>
                  <a href={`mailto:${footerBrand.email}`}>{footerBrand.email}</a>
                </address>
              </div>
            </Entity>
            <div>
              <h3 className="mb-4 font-heading font-semibold">Quick Links</h3>
              <Collection
                id="storage.footer.links"
                value={footerLinks}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2"
                renderItem={(item) => {
                  const link = storageFooterLinkSchema.parse(item);
                  return (
                    <FooterQuickLink href={`#${link.destination}`}>{link.label}</FooterQuickLink>
                  );
                }}
              />
            </div>
            <div id="features">
              <h3 className="mb-4 font-heading font-semibold">Branding Options</h3>
              <Collection
                id="storage.footer.branding-options"
                value={branding}
                className="[&_[data-slot=editable-collection-items]]:flex [&_[data-slot=editable-collection-items]]:flex-wrap [&_[data-slot=editable-collection-items]]:gap-2"
                renderItem={(item) => (
                  <Badge variant="secondary">
                    {storageFooterBrandingOptionsSchema.element.parse(item).label}
                  </Badge>
                )}
              />
            </div>
          </Container>
          <Container width="wide" className="mt-10 border-t border-sidebar-foreground/20 pt-5">
            <Entity id="storage.footer.legal" value={legal}>
              <small className="text-sidebar-foreground/60">
                © {new Date().getFullYear()} {legal.organizationName}. {legal.rightsNotice}
              </small>
            </Entity>
          </Container>
        </footer>
      </MarketingLayout>
      <AuthenticatedEditorToolbar />
    </div>
  );
}

export function StorageExperience(): React.JSX.Element {
  return (
    <EditModeProvider pageId="storage">
      <StorageBody />
    </EditModeProvider>
  );
}

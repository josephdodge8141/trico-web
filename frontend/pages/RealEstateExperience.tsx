import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Quote,
  Ruler,
  Star,
  TrendingUp,
} from 'lucide-react';
import * as S from '@app/schemas';

import benPhoto from '../assets/images/ben-beesley.jpg';
import boxwood109Entry from '../assets/images/boxwood-109-entry.jpg';
import boxwood109ExteriorOne from '../assets/images/boxwood-109-exterior-1.jpg';
import boxwood109ExteriorTwo from '../assets/images/boxwood-109-exterior-2.jpg';
import boxwood109KitchenOne from '../assets/images/boxwood-109-kitchen-1.jpg';
import boxwood109KitchenTwo from '../assets/images/boxwood-109-kitchen-2.jpg';
import boxwood109KitchenThree from '../assets/images/boxwood-109-kitchen-3.jpg';
import boxwood109LivingOne from '../assets/images/boxwood-109-living-1.jpg';
import boxwood109LivingTwo from '../assets/images/boxwood-109-living-2.jpg';
import boxwood109LivingThree from '../assets/images/boxwood-109-living-3.jpg';
import boxwood109LivingFour from '../assets/images/boxwood-109-living-4.jpg';
import boxwoodBasement from '../assets/images/boxwood-dr-basement.jpg';
import boxwoodBathroom from '../assets/images/boxwood-dr-bathroom.jpg';
import boxwoodPhoto from '../assets/images/boxwood-dr-exterior.jpg';
import boxwoodKitchen from '../assets/images/boxwood-dr-kitchen.jpg';
import boxwoodLiving from '../assets/images/boxwood-dr-living.jpg';
import boxwoodTheater from '../assets/images/boxwood-dr-theater.jpg';
import brookePhoto from '../assets/images/brooke-moore.jpeg';
import miaPhoto from '../assets/images/mia-barlow-re.png';
import michaelPhoto from '../assets/images/michael-thornton.jpg';
import placeholderPhoto from '../assets/images/placeholder-neutral.svg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import commercialOnePhoto from '../assets/images/real-estate-property-1.jpeg';
import commercialTwoPhoto from '../assets/images/real-estate-property-2.jpeg';
import robertPhoto from '../assets/images/robert-ayers.png';
import shaunaPhoto from '../assets/images/shauna-thomas.png';
import staciePhoto from '../assets/images/stacie-papanikolas.jpg';
import stevePhoto from '../assets/images/steve-tripp.png';
import tricoLogo from '../assets/images/trico-logo.png';
import whisper105Photo from '../assets/images/whisper-hollow-lot-105.jpg';
import whisper119Photo from '../assets/images/whisper-hollow-lot-119.jpg';
import whisperBoxwoodPhoto from '../assets/images/whisper-hollow-lot-boxwood.jpg';
import { AnniversaryBanner } from '../components/AnniversaryBanner.js';
import { CareersSection } from '../components/CareersSection.js';
import { PublicHeader } from '../components/PublicHeader.js';
import { ContentCollection, ContentEntity } from '../components/ContentEntity.js';
import { DivisionSectionIntro as Intro } from '../components/DivisionSectionIntro.js';
import { FooterQuickLink } from '../components/FooterQuickLink.js';
import { ReviewPlatformCard } from '../components/ReviewPlatformCard.js';
import { ProfileCard } from '../components/ProfileCard.js';
import { contentIconComponents } from '../components/contentIcons.js';
import { EditableCollection } from '../components/EditableCollection.js';
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
import { RealEstateContactForm } from './RealEstateForms.js';
import { mergeFilteredRealEstateCollection, parseRealEstateValue } from './realEstateContent.js';

type EntityId = keyof typeof S.realEstateV2SeedData;
const images: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/steve-tripp.png': stevePhoto,
  'media/seed/randy-rimmer.png': randyPhoto,
  'media/seed/brooke-moore.jpeg': brookePhoto,
  'media/seed/mia-barlow-re.png': miaPhoto,
  'media/seed/michael-thornton.jpg': michaelPhoto,
  'media/seed/ben-beesley.jpg': benPhoto,
  'media/seed/shauna-thomas.png': shaunaPhoto,
  'media/seed/robert-ayers.png': robertPhoto,
  'media/seed/stacie-papanikolas.jpg': staciePhoto,
  'media/seed/placeholder-neutral.svg': placeholderPhoto,
  'media/seed/whisper-hollow-lot-119.jpg': whisper119Photo,
  'media/seed/whisper-hollow-lot-boxwood.jpg': whisperBoxwoodPhoto,
  'media/seed/whisper-hollow-lot-105.jpg': whisper105Photo,
  'media/seed/boxwood-dr-exterior.jpg': boxwoodPhoto,
  'media/seed/boxwood-dr-kitchen.jpg': boxwoodKitchen,
  'media/seed/boxwood-dr-living.jpg': boxwoodLiving,
  'media/seed/boxwood-dr-bathroom.jpg': boxwoodBathroom,
  'media/seed/boxwood-dr-theater.jpg': boxwoodTheater,
  'media/seed/boxwood-dr-basement.jpg': boxwoodBasement,
  'media/seed/boxwood-109-exterior-1.jpg': boxwood109ExteriorOne,
  'media/seed/boxwood-109-exterior-2.jpg': boxwood109ExteriorTwo,
  'media/seed/boxwood-109-kitchen-1.jpg': boxwood109KitchenOne,
  'media/seed/boxwood-109-kitchen-2.jpg': boxwood109KitchenTwo,
  'media/seed/boxwood-109-kitchen-3.jpg': boxwood109KitchenThree,
  'media/seed/boxwood-109-living-1.jpg': boxwood109LivingOne,
  'media/seed/boxwood-109-living-2.jpg': boxwood109LivingTwo,
  'media/seed/boxwood-109-living-3.jpg': boxwood109LivingThree,
  'media/seed/boxwood-109/living-4.jpg': boxwood109LivingFour,
  'media/seed/boxwood-109-living-4.jpg': boxwood109LivingFour,
  'media/seed/boxwood-109-entry.jpg': boxwood109Entry,
  'media/seed/real-estate-property-1.jpeg': commercialOnePhoto,
  'media/seed/real-estate-property-2.jpeg': commercialTwoPhoto,
};
function imageFor(image: S.RealEstateListingImage, fallback = placeholderPhoto): string {
  if (image.kind === 'external') return image.url;
  return (
    images[image.key] ??
    (image.key.startsWith('media/') && !image.key.startsWith('media/seed/')
      ? '/' + image.key
      : fallback)
  );
}
function definitionFor(id: EntityId): S.SemanticEntityDefinition {
  const result = S.realEstateEntityDefinitions.find((entry) => entry.id === id);
  if (result === undefined) throw new Error('Real Estate editor definition missing for ' + id);
  return result;
}
function Entity({
  id,
  value,
  children,
}: {
  readonly id: EntityId;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="contents" data-real-estate-entity-boundary="true">
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
  readonly id: EntityId;
  readonly value: readonly S.EditableValue[];
  readonly renderItem: (item: S.EditableValue, index: number) => React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div className={className} data-real-estate-entity-boundary="true">
      <ContentCollection definition={definitionFor(id)} value={value} renderItem={renderItem} />
    </div>
  );
}
function ListingCollection({
  value,
  status,
}: {
  readonly value: ReturnType<typeof S.realEstateListingsItemsSchema.parse>;
  readonly status: 'active' | 'sold';
}): React.JSX.Element {
  const editing = useEditMode();
  const definition = definitionFor('real-estate.listings.items');
  if (definition.editor.kind !== 'list') throw new Error('Listing editor must be a list');
  const included = (item: S.EditableValue): boolean =>
    S.realEstateListingSchema.parse(item).status === status;
  const filtered = value.filter((item) => item.status === status);
  const effectiveDefinition = {
    ...definition,
    editor: {
      ...definition.editor,
      blankItem: {
        ...(definition.editor.blankItem as Readonly<Record<string, S.EditableValue>>),
        status,
      },
    },
  };
  const pending = editing.pending.find((change) => change.entityId === definition.id);
  const ownership =
    pending === undefined
      ? 'available'
      : pending.authorId === editing.currentUserId
        ? 'mine'
        : 'other';
  return (
    <div
      data-real-estate-entity-boundary="true"
      className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-6 md:[&_[data-slot=editable-collection-items]]:grid-cols-2 xl:[&_[data-slot=editable-collection-items]]:grid-cols-3"
    >
      {filtered.length === 0 ? (
        <Card className="p-6">
          <h3 className="font-heading font-semibold">No {status} listings yet</h3>
          <p className="text-sm text-muted-foreground">Add the first listing when you are ready.</p>
        </Card>
      ) : null}
      <EditableCollection
        active={editing.active}
        layout="fill"
        definition={effectiveDefinition}
        value={filtered}
        renderItem={(item) => <ListingCard item={item} />}
        ownership={ownership}
        busy={editing.busy}
        onSave={(next) =>
          editing.save(definition.id, mergeFilteredRealEstateCollection(value, next, included))
        }
        onReloadLatest={async () =>
          S.editableListSchema.parse(await editing.reload(definition.id)).filter(included)
        }
      />
    </div>
  );
}
function ListingCard({ item }: { readonly item: S.EditableValue }): React.JSX.Element {
  const listing = S.realEstateListingSchema.parse(item);
  return (
    <Card className="h-full overflow-hidden border border-border/70">
      <div className="relative">
        <img
          className="aspect-[4/3] w-full object-cover"
          src={imageFor(listing.image)}
          alt={listing.imageAltText}
          loading="lazy"
          decoding="async"
        />
        <Badge className="absolute left-3 top-3">
          {listing.status === 'sold' ? 'Sold' : 'Active'}
        </Badge>
        <Badge variant="secondary" className="absolute right-3 top-3">
          {listing.type}
        </Badge>
      </div>
      <CardHeader className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-heading text-lg font-semibold">{listing.address}</h3>
          <strong className="text-primary">{listing.price}</strong>
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" />
          {listing.city}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {listing.mlsNumber ? <span>MLS# {listing.mlsNumber}</span> : null}
          <span className="flex items-center gap-1">
            <Ruler className="size-3" aria-hidden="true" />
            {listing.detail}
          </span>
        </div>
        {listing.actionLabel && listing.externalUrl ? (
          <Button
            variant="outline"
            size="sm"
            render={<a href={listing.externalUrl} target="_blank" rel="noreferrer" />}
          >
            {listing.actionLabel}
            <ExternalLink aria-hidden="true" />
          </Button>
        ) : null}
        {listing.gallery.length > 0 ? (
          <div className="grid grid-cols-3 gap-2" aria-label={listing.address + ' gallery'}>
            {listing.gallery.map((photo) => (
              <img
                key={photo.id}
                className="aspect-square w-full rounded-md object-cover"
                src={imageFor(photo.image)}
                alt={photo.imageAltText}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
function PersonCard({
  item,
  editing,
}: {
  readonly item: S.EditableValue;
  readonly editing: boolean;
}): React.JSX.Element {
  const person = S.realEstateTeamMemberSchema.parse(item);
  const portrait =
    person.image.key === 'media/seed/placeholder-neutral.svg' ? undefined : imageFor(person.image);
  return (
    <ProfileCard
      name={person.name}
      role={person.role}
      imageSource={portrait}
      imageAltText={person.imageAltText}
    >
      {editing ? (
        <p>{person.bio}</p>
      ) : (
        <details>
          <summary className="cursor-pointer font-medium text-primary">Read full bio</summary>
          <p className="mt-3">{person.bio}</p>
        </details>
      )}
      <div className="flex flex-wrap gap-3">
        <a className="text-primary hover:underline" href={'mailto:' + person.email}>
          Email
        </a>
        <a className="text-primary hover:underline" href={'tel:' + person.phone.replace(/\D/g, '')}>
          {person.phone}
        </a>
      </div>
    </ProfileCard>
  );
}
function RealEstateBody(): React.JSX.Element {
  const editing = useEditMode();
  const [document, setDocument] = useState<S.PageContent>({});
  const [fallback, setFallback] = useState(false);
  const [listingTab, setListingTab] = useState<'active' | 'sold'>('active');
  const [teamTab, setTeamTab] = useState('agents');
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('real-estate', { signal: controller.signal })
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
  const value = <Output,>(id: EntityId, parser: { parse(input: unknown): Output }): Output =>
    parseRealEstateValue(document, id, parser);
  const banner = value('real-estate.anniversary-banner', S.realEstateAnniversaryBannerSchema);
  const header = value('real-estate.header', S.realEstateHeaderSchema);
  const hero = value('real-estate.hero', S.realEstateHeroSchema);
  const heroStats = value('real-estate.hero.stats', S.realEstateHeroStatsSchema);
  const listingsHeader = value('real-estate.listings.header', S.realEstateListingsHeaderSchema);
  const listingActions = value('real-estate.listings.actions', S.realEstateListingsActionsSchema);
  const listings = value('real-estate.listings.items', S.realEstateListingsItemsSchema);
  const heroListing = listings.find((listing) => listing.status === 'active');
  const servicesHeader = value('real-estate.services.header', S.realEstateServicesHeaderSchema);
  const services = value('real-estate.services.items', S.realEstateServicesItemsSchema);
  const processHeader = value('real-estate.process.header', S.realEstateProcessHeaderSchema);
  const process = value('real-estate.process.steps', S.realEstateProcessStepsSchema);
  const about = value('real-estate.about', S.realEstateAboutSchema);
  const aboutFeatures = value('real-estate.about.features', S.realEstateAboutFeaturesSchema);
  const teamHeader = value('real-estate.team.header', S.realEstateTeamHeaderSchema);
  const leadership = value('real-estate.team.leadership', S.realEstateTeamMembersSchema);
  const staff = value('real-estate.team.staff', S.realEstateTeamMembersSchema);
  const agents = value('real-estate.team.agents', S.realEstateTeamMembersSchema);
  const testimonialsHeader = value(
    'real-estate.testimonials.header',
    S.realEstateTestimonialsHeaderSchema,
  );
  const testimonials = value('real-estate.testimonials.items', S.realEstateTestimonialsItemsSchema);
  const visibleTestimonials = editing.active
    ? testimonials
    : testimonials.filter((testimonial) =>
        S.isPubliclyVisible(
          testimonial.publicVisibility,
          !S.realEstateV2SeedData['real-estate.testimonials.items'].some(
            (seed) => seed.quote === testimonial.quote,
          ),
        ),
      );
  const faqHeader = value('real-estate.faq.header', S.realEstateFaqHeaderSchema);
  const faqs = value('real-estate.faq.items', S.realEstateFaqItemsSchema);
  const reviewsHeader = value('real-estate.reviews.header', S.realEstateReviewsHeaderSchema);
  const reviewPlatforms = value(
    'real-estate.reviews.platforms',
    S.realEstateReviewsPlatformsSchema,
  );
  const visibleReviews = editing.active
    ? reviewPlatforms
    : reviewPlatforms.filter((review) => review.externalUrl.trim() !== '');
  const reviewsFooter = value('real-estate.reviews.footer', S.realEstateReviewsFooterSchema);
  const contactHeader = value('real-estate.contact.header', S.realEstateContactHeaderSchema);
  const contact = value('real-estate.contact.details', S.realEstateContactDetailsSchema);
  const footerBrand = value('real-estate.footer.brand', S.realEstateFooterBrandSchema);
  const footerLinks = value('real-estate.footer.links', S.realEstateFooterLinksSchema);
  const footerLicense = value('real-estate.footer.license', S.realEstateFooterLicenseSchema);
  const footerLegal = value('real-estate.footer.legal', S.realEstateFooterLegalSchema);
  const teamGroups = [
    {
      key: 'leadership',
      id: 'real-estate.team.leadership',
      title: teamHeader.leadershipLabel,
      members: leadership,
    },
    { key: 'staff', id: 'real-estate.team.staff', title: teamHeader.staffLabel, members: staff },
    {
      key: 'agents',
      id: 'real-estate.team.agents',
      title: teamHeader.agentsLabel,
      members: agents,
    },
  ] as const;
  const renderTeamGroup = (group: (typeof teamGroups)[number]): React.JSX.Element => (
    <div className="mt-10" key={group.id}>
      <h3 className="mb-5 font-heading text-xl font-semibold">{group.title}</h3>
      <Collection
        id={group.id}
        value={group.members}
        className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
        renderItem={(item) => <PersonCard item={item} editing={editing.active} />}
      />
    </div>
  );
  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-3"
        href="#main-content"
      >
        Skip to main content
      </a>
      <Entity id="real-estate.anniversary-banner" value={banner}>
        <AnniversaryBanner message={banner.message} />
      </Entity>
      <MarketingLayout
        header={
          <Entity id="real-estate.header" value={header}>
            <PublicHeader
              logoSrc={imageFor(header.logo, tricoLogo)}
              logoAltText={header.logoAltText}
              divisionLabel={header.divisionLabel}
              links={header.navLinks}
              phone={header.phone}
              actionLabel={header.actionLabel}
            />
          </Entity>
        }
      >
        {fallback ? (
          <div className="bg-warning/10 p-3 text-center text-sm" role="status">
            Showing the checked-in site content while published content is unavailable.
          </div>
        ) : null}
        <div id="main-content">
          <Entity id="real-estate.hero" value={hero}>
            <section className="bg-sidebar py-20 text-sidebar-foreground sm:py-24">
              <Container
                width="wide"
                className="grid items-center gap-12 lg:grid-cols-[1.25fr_0.75fr]"
              >
                <div className="space-y-7">
                  <Badge className="border border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground">
                    <MapPin className="size-4" aria-hidden="true" />
                    {hero.badge}
                  </Badge>
                  <h1 className="font-heading !text-sidebar-foreground text-4xl font-semibold tracking-tight sm:text-6xl">
                    {hero.heading}
                  </h1>
                  <p className="max-w-2xl text-lg leading-relaxed text-sidebar-foreground/75">
                    {hero.description}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button render={<a href="#contact" />}>
                      {hero.primaryActionLabel}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                    <Button render={<a href="#services" />} variant="secondary">
                      {hero.secondaryActionLabel}
                    </Button>
                  </div>
                  <Collection
                    id="real-estate.hero.stats"
                    value={heroStats}
                    className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                    renderItem={(item) => {
                      const stat = S.realEstateHeroStatSchema.parse(item);
                      const Icon = contentIconComponents[stat.icon] ?? TrendingUp;
                      return (
                        <div className="rounded-lg border border-sidebar-foreground/20 bg-sidebar-accent p-4">
                          <Icon className="mb-2 size-5 text-sidebar-primary" aria-hidden="true" />
                          <strong className="block font-heading text-xl">{stat.value}</strong>
                          <span className="text-xs text-sidebar-foreground/70">{stat.label}</span>
                        </div>
                      );
                    }}
                  />
                </div>
                <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-sidebar-foreground/20 bg-sidebar-accent shadow-xl">
                  <img
                    className="size-full object-cover"
                    src={
                      heroListing === undefined ? commercialOnePhoto : imageFor(heroListing.image)
                    }
                    alt={
                      heroListing === undefined
                        ? 'Residential property represented by TriCo'
                        : heroListing.imageAltText
                    }
                  />
                  {heroListing === undefined ? null : (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-sidebar/85 px-4 py-3 text-sm text-sidebar-foreground">
                      Featured listing: {heroListing.address}, {heroListing.city}
                    </figcaption>
                  )}
                </figure>
              </Container>
            </section>
          </Entity>
          <section id="listings" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="real-estate.listings.header" value={listingsHeader}>
                <Intro {...listingsHeader} />
              </Entity>
              <Tabs
                value={listingTab}
                onValueChange={(next) => {
                  if (next === 'active' || next === 'sold') setListingTab(next);
                }}
              >
                <TabsList aria-label="Property listing status" className="mb-6">
                  {(['active', 'sold'] as const).map((status) => (
                    <TabsTrigger value={status} key={status} className="min-h-9 px-3">
                      {status === 'active' ? listingActions.activeLabel : listingActions.soldLabel}{' '}
                      ({listings.filter((listing) => listing.status === status).length})
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="active">
                  {listingTab === 'active' ? (
                    <ListingCollection value={listings} status="active" />
                  ) : null}
                </TabsContent>
                <TabsContent value="sold">
                  {listingTab === 'sold' ? (
                    <ListingCollection value={listings} status="sold" />
                  ) : null}
                </TabsContent>
              </Tabs>
              <Entity id="real-estate.listings.actions" value={listingActions}>
                <div
                  className="mt-8 flex flex-wrap justify-center gap-3"
                  role="group"
                  aria-label="Listing directories"
                >
                  {listingActions.directoryLinks.map((link) => (
                    <Button
                      key={link.id}
                      variant="outline"
                      render={<a href={link.externalUrl} target="_blank" rel="noreferrer" />}
                    >
                      {link.label}
                      <ExternalLink aria-hidden="true" />
                    </Button>
                  ))}
                  <Button variant="link" render={<a href="#contact" />}>
                    {listingActions.contactActionLabel}
                  </Button>
                </div>
              </Entity>
            </Container>
          </section>
          <section id="services" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="real-estate.services.header" value={servicesHeader}>
                <Intro {...servicesHeader} />
              </Entity>
              <Collection
                id="real-estate.services.items"
                value={services}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const service = S.realEstateServiceSchema.parse(item);
                  const Icon = contentIconComponents[service.icon] ?? Building2;
                  return (
                    <Card className="h-full border border-border/70">
                      <CardHeader>
                        <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
                          <Icon className="size-6" aria-hidden="true" />
                        </span>
                        <h3 className="font-heading text-xl font-semibold">{service.title}</h3>
                      </CardHeader>
                      <CardContent className="text-sm leading-relaxed text-muted-foreground">
                        {service.description}
                      </CardContent>
                    </Card>
                  );
                }}
              />
            </Container>
          </section>
          <section id="process" className="py-20 sm:py-24">
            <Container width="medium">
              <Entity id="real-estate.process.header" value={processHeader}>
                <Intro {...processHeader} />
              </Entity>
              <Collection
                id="real-estate.process.steps"
                value={process}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-4"
                renderItem={(item) => {
                  const step = S.realEstateProcessStepSchema.parse(item);
                  return (
                    <Card className="border border-border/70">
                      <CardContent className="flex gap-5 pt-6">
                        <Badge variant="secondary" className="h-fit">
                          {step.number}
                        </Badge>
                        <div>
                          <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }}
              />
            </Container>
          </section>
          <Entity id="real-estate.about" value={about}>
            <section id="about" className="bg-sidebar py-20 text-sidebar-foreground sm:py-24">
              <Container width="wide" className="grid items-center gap-12 lg:grid-cols-2">
                <div className="grid min-h-72 place-content-center rounded-2xl border border-sidebar-foreground/20 bg-sidebar-accent p-8 text-center">
                  <strong className="font-heading text-4xl">{about.brandLabel}</strong>
                  <span className="mt-2 text-sidebar-primary">{about.eyebrow}</span>
                  <strong className="mt-8 font-heading text-5xl">{about.statValue}</strong>
                  <small className="text-sidebar-foreground/70">{about.statLabel}</small>
                </div>
                <div className="space-y-5">
                  <Badge className="border border-sidebar-foreground/20 bg-sidebar-accent text-sidebar-foreground">
                    {about.eyebrow}
                  </Badge>
                  <h2 className="font-heading !text-sidebar-foreground text-3xl font-semibold sm:text-4xl">
                    {about.heading}
                  </h2>
                  <p className="text-lg leading-relaxed">{about.introduction}</p>
                  <p className="text-sidebar-foreground/70">{about.detail}</p>
                  <Collection
                    id="real-estate.about.features"
                    value={aboutFeatures}
                    className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2"
                    renderItem={(item) => (
                      <span className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4 text-sidebar-primary" aria-hidden="true" />
                        {S.realEstateAboutFeatureSchema.parse(item).label}
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
          <section id="team" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide">
              <Entity id="real-estate.team.header" value={teamHeader}>
                <Intro {...teamHeader} />
              </Entity>
              {editing.active ? (
                teamGroups.map(renderTeamGroup)
              ) : (
                <Tabs value={teamTab} onValueChange={setTeamTab}>
                  <div className="mt-8 max-w-full overflow-x-auto pb-2">
                    <TabsList aria-label="Real Estate team category" className="h-11">
                      {teamGroups.map((group) => (
                        <TabsTrigger key={group.key} value={group.key} className="min-h-10 px-4">
                          {group.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  {teamGroups.map((group) => (
                    <TabsContent key={group.key} value={group.key}>
                      {teamTab === group.key ? renderTeamGroup(group) : null}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </Container>
          </section>
          <CareersSection pageId="real-estate" />
          {editing.active || visibleTestimonials.length > 0 ? (
            <section className="py-20 sm:py-24">
              <Container width="wide">
                <Entity id="real-estate.testimonials.header" value={testimonialsHeader}>
                  <Intro {...testimonialsHeader} />
                </Entity>
                <Collection
                  id="real-estate.testimonials.items"
                  value={visibleTestimonials}
                  className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-2 lg:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                  renderItem={(item) => {
                    const testimonial = S.realEstateTestimonialSchema.parse(item);
                    return (
                      <Card className="h-full border border-border/70">
                        <CardHeader>
                          <Quote className="size-6 text-primary" aria-hidden="true" />
                          <div
                            className="flex text-warning"
                            aria-label={testimonial.rating + ' out of 5 stars'}
                          >
                            {Array.from({ length: testimonial.rating }, (_, index) => (
                              <Star
                                key={index}
                                className="size-4 fill-current"
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-muted-foreground">“{testimonial.quote}”</p>
                          <div>
                            <strong className="block">{testimonial.name}</strong>
                            <span className="text-xs text-muted-foreground">
                              {testimonial.role}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }}
                />
              </Container>
            </section>
          ) : null}
          <section id="faq" className="bg-muted/40 py-20 sm:py-24">
            <Container width="medium">
              <Entity id="real-estate.faq.header" value={faqHeader}>
                <Intro {...faqHeader} />
              </Entity>
              <Collection
                id="real-estate.faq.items"
                value={faqs}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-3"
                renderItem={(item) => {
                  const faq = S.realEstateFaqItemSchema.parse(item);
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
          <section id="reviews" className="py-20 sm:py-24">
            <Container width="wide">
              <Entity id="real-estate.reviews.header" value={reviewsHeader}>
                {editing.active || visibleReviews.length > 0 ? (
                  <Intro {...reviewsHeader} />
                ) : (
                  <h2 className="font-heading text-2xl font-semibold">Share feedback privately</h2>
                )}
              </Entity>
              <Collection
                id="real-estate.reviews.platforms"
                value={visibleReviews}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-5 sm:[&_[data-slot=editable-collection-items]]:grid-cols-3"
                renderItem={(item) => {
                  const review = S.realEstateReviewPlatformSchema.parse(item);
                  return (
                    <ReviewPlatformCard
                      name={review.name}
                      description={review.description}
                      externalUrl={review.externalUrl}
                    />
                  );
                }}
              />
              <Entity id="real-estate.reviews.footer" value={reviewsFooter}>
                <p className="mt-8 text-sm text-muted-foreground">
                  {reviewsFooter.message} Email{' '}
                  <a
                    className="text-primary underline underline-offset-4"
                    href={'mailto:' + reviewsFooter.email}
                  >
                    {reviewsFooter.email}
                  </a>
                  .
                </p>
              </Entity>
            </Container>
          </section>
          <span id="new-client" className="block scroll-mt-20" aria-hidden="true" />
          <section id="contact" className="bg-muted/40 py-20 sm:py-24">
            <Container width="wide" className="grid gap-10 lg:grid-cols-2">
              <div>
                <Entity id="real-estate.contact.header" value={contactHeader}>
                  <Intro {...contactHeader} />
                </Entity>
                <Entity id="real-estate.contact.details" value={contact}>
                  <div className="grid gap-4">
                    {(
                      [
                        { Icon: MapPin, label: contact.addressLabel, text: contact.address },
                        { Icon: Phone, label: contact.phoneLabel, text: contact.phone },
                        { Icon: Mail, label: contact.emailLabel, text: contact.email },
                        { Icon: Clock, label: contact.officeHoursLabel, text: contact.officeHours },
                      ] as const
                    ).map(({ Icon, label, text }) => (
                      <div className="flex items-start gap-3" key={label}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                          <strong className="block text-sm">{label}</strong>
                          <p className="text-sm text-muted-foreground">{text}</p>
                          {label === contact.phoneLabel ? (
                            <small className="text-muted-foreground">
                              {contact.faxLabel}: {contact.fax}
                            </small>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Entity>
              </div>
              <RealEstateContactForm />
            </Container>
          </section>
        </div>
        <footer className="bg-sidebar py-14 text-sidebar-foreground">
          <Container width="wide" className="grid gap-10 md:grid-cols-3">
            <Entity id="real-estate.footer.brand" value={footerBrand}>
              <div className="space-y-4">
                <img
                  className="h-12 w-auto rounded bg-background p-1"
                  src={imageFor(footerBrand.logo, tricoLogo)}
                  alt={footerBrand.logoAltText}
                  loading="lazy"
                />
                <p className="text-sm text-sidebar-foreground/70">{footerBrand.description}</p>
                <p className="text-xs text-sidebar-foreground/70">
                  {footerBrand.address}
                  <br />
                  {footerBrand.phone}
                  <br />
                  {footerBrand.email}
                </p>
              </div>
            </Entity>
            <div>
              <h3 className="mb-4 font-heading font-semibold">Quick Links</h3>
              <Collection
                id="real-estate.footer.links"
                value={footerLinks}
                className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2"
                renderItem={(item) => {
                  const link = S.realEstateFooterLinkSchema.parse(item);
                  return (
                    <FooterQuickLink href={`#${link.destination}`}>{link.label}</FooterQuickLink>
                  );
                }}
              />
            </div>
            <Entity id="real-estate.footer.license" value={footerLicense}>
              <div>
                <h3 className="mb-4 font-heading font-semibold">{footerLicense.heading}</h3>
                <p className="text-sm text-sidebar-foreground/70">{footerLicense.license}</p>
              </div>
            </Entity>
          </Container>
          <Container width="wide" className="mt-10 border-t border-sidebar-foreground/20 pt-5">
            <Entity id="real-estate.footer.legal" value={footerLegal}>
              <p className="text-xs text-sidebar-foreground/60">
                © {new Date().getFullYear()} {footerLegal.organizationName}.{' '}
                {footerLegal.rightsNotice}
              </p>
            </Entity>
          </Container>
        </footer>
      </MarketingLayout>
      <AuthenticatedEditorToolbar />
    </>
  );
}
export function RealEstateExperience(): React.JSX.Element {
  return (
    <EditModeProvider pageId="real-estate">
      <RealEstateBody />
    </EditModeProvider>
  );
}

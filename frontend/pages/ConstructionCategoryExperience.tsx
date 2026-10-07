import { useEffect, useState } from 'react';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import * as S from '@app/schemas';

import tricoLogo from '../assets/images/trico-logo.png';
import placeholderImage from '../assets/images/placeholder-neutral.svg';
import { AnniversaryBanner } from '../components/AnniversaryBanner.js';
import { PublicHeader } from '../components/PublicHeader.js';
import { ContentCollection, ContentEntity } from '../components/ContentEntity.js';
import { FooterQuickLink } from '../components/FooterQuickLink.js';
import { AuthenticatedEditorToolbar } from '../components/AuthenticatedEditorToolbar.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { Container } from '../design-system/layout.js';
import { MarketingLayout } from '../design-system/page-patterns.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { parseConstructionValue } from './constructionContent.js';
import { constructionCategories } from './pageContent.js';

type ConstructionEntityId = (typeof S.constructionEntityDefinitions)[number]['id'];
const categoryImages: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/placeholder-neutral.svg': placeholderImage,
};
function imageFor(key: string, fallback: string): string {
  return (
    categoryImages[key] ??
    (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback)
  );
}
function definitionFor(id: ConstructionEntityId): S.SemanticEntityDefinition {
  const result = S.constructionEntityDefinitions.find((entry) => entry.id === id);
  if (result === undefined) throw new Error(`Missing Construction editor definition: ${id}`);
  return result;
}
function CategoryBody({ status }: { readonly status: 'current' | 'completed' }): React.JSX.Element {
  const { categoryId } = useParams();
  const editing = useEditMode();
  const [document, setDocument] = useState<S.PageContent>({});
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('construction', { signal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted) setDocument(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDocument({});
      });
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending]);
  const category = constructionCategories.find((item) => item === categoryId);
  if (category === undefined)
    return <Navigate to={`/construction/${status}/multi-family`} replace />;
  const group = status === 'current' ? 'current-projects' : 'completed-projects';
  const categoryEntityId = `construction.${group}.category.${category}` as ConstructionEntityId;
  const projectEntityId = `construction.${group}.projects.${category}` as ConstructionEntityId;
  const categoryValue = parseConstructionValue(
    document,
    categoryEntityId,
    S.constructionProjectCategorySchema,
  );
  const projects = parseConstructionValue(document, projectEntityId, S.constructionProjectsSchema);
  const visibleProjects = editing.active
    ? projects
    : projects.filter(
        (project) =>
          S.hasRealConstructionProjectDetails(project) &&
          S.isPubliclyVisible(project.publicVisibility, true),
      );
  const banner = parseConstructionValue(
    document,
    'construction.anniversary-banner',
    S.constructionAnniversaryBannerSchema,
  );
  const siteHeader = parseConstructionValue(
    document,
    'construction.header',
    S.constructionHeaderSchema,
  );
  const sectionHeader = parseConstructionValue(
    document,
    status === 'current'
      ? 'construction.current-projects.header'
      : 'construction.completed-projects.header',
    S.constructionProjectsHeaderSchema,
  );
  const footerBrand = parseConstructionValue(
    document,
    'construction.footer.brand',
    S.constructionFooterBrandSchema,
  );
  const footerLinks = parseConstructionValue(
    document,
    'construction.footer.links',
    S.constructionFooterLinksSchema,
  );
  const footerLicenses = parseConstructionValue(
    document,
    'construction.footer.licenses',
    S.constructionFooterLicensesSchema,
  );
  const footerLegal = parseConstructionValue(
    document,
    'construction.footer.legal',
    S.constructionFooterLegalSchema,
  );
  const header = (
    <>
      <ContentEntity definition={definitionFor('construction.anniversary-banner')} value={banner}>
        <AnniversaryBanner message={banner.message} />
      </ContentEntity>
      <ContentEntity definition={definitionFor('construction.header')} value={siteHeader}>
        <PublicHeader
          logoSrc={imageFor(siteHeader.logo.key, tricoLogo)}
          logoAltText={siteHeader.logoAltText}
          divisionLabel={siteHeader.divisionLabel}
          links={siteHeader.navLinks}
          phone={siteHeader.phone}
          actionLabel={siteHeader.actionLabel}
          destinationBase="/construction"
        />
      </ContentEntity>
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
      <MarketingLayout header={header}>
        <div id="main-content" className="py-12 sm:py-16">
          <Container width="wide">
            <Button render={<Link to="/construction#projects" />} variant="ghost" className="mb-8">
              <ArrowLeft aria-hidden="true" />
              Back to Construction
            </Button>
            <ContentEntity definition={definitionFor(categoryEntityId)} value={categoryValue}>
              <div className="mb-8 max-w-3xl space-y-4">
                <Badge variant="secondary">{sectionHeader.eyebrow}</Badge>
                <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                  {categoryValue.label}
                </h1>
                <p className="text-lg text-muted-foreground">{categoryValue.blurb}</p>
              </div>
            </ContentEntity>
            <nav className="mb-10 flex flex-wrap gap-2" aria-label="Project categories">
              {constructionCategories.map((item) => (
                <Button
                  key={item}
                  render={<Link to={`/construction/${status}/${item}`} />}
                  variant={item === category ? 'default' : 'outline'}
                  size="sm"
                >
                  {
                    parseConstructionValue(
                      document,
                      `construction.${group}.category.${item}` as keyof typeof S.constructionV2SeedData,
                      S.constructionProjectCategorySchema,
                    ).label
                  }
                </Button>
              ))}
            </nav>
            <div className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-6 lg:[&_[data-slot=editable-collection-items]]:grid-cols-2">
              <ContentCollection
                definition={definitionFor(projectEntityId)}
                value={visibleProjects}
                renderItem={(item) => {
                  const project = S.constructionProjectsSchema.element.parse(item);
                  return (
                    <Card className="h-full overflow-hidden border border-border/70">
                      <img
                        className="aspect-video w-full object-cover"
                        src={imageFor(project.photo.key, placeholderImage)}
                        alt={project.photoAltText}
                        loading="lazy"
                        decoding="async"
                      />
                      <CardHeader>
                        <Badge variant="secondary" className="w-fit">
                          {project.dateLabel}
                        </Badge>
                        <h2 className="font-heading text-xl font-semibold">{project.name}</h2>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{project.description}</p>
                        {project.address === '' ? null : (
                          <p className="text-sm">{project.address}</p>
                        )}
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          {[
                            ['Owner', project.owner],
                            ['Architect', project.architect],
                            ['Engineer', project.engineer],
                            ['Size', project.squareFeet],
                          ].map(([label, detail]) =>
                            detail === '' ? null : (
                              <div key={label}>
                                <dt className="text-xs font-medium text-muted-foreground">
                                  {label}
                                </dt>
                                <dd>{detail}</dd>
                              </div>
                            ),
                          )}
                        </dl>
                      </CardContent>
                    </Card>
                  );
                }}
              />
            </div>
            {visibleProjects.length === 0 ? (
              <Card className="mt-6 items-center border border-dashed p-8 text-center">
                <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-heading text-xl font-semibold">
                  No projects are published in this category.
                </h2>
                <p className="text-sm text-muted-foreground">
                  Contact our construction team for current capabilities and project references.
                </p>
                <Button render={<Link to="/construction#contact" />}>Contact construction</Button>
              </Card>
            ) : null}
          </Container>
        </div>
        <footer className="bg-sidebar py-14 text-sidebar-foreground">
          <Container width="wide" className="grid gap-10 md:grid-cols-3">
            <ContentEntity
              definition={definitionFor('construction.footer.brand')}
              value={footerBrand}
            >
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
            </ContentEntity>
            <nav aria-label="Quick links">
              <h3 className="mb-4 font-heading font-semibold">Quick Links</h3>
              <div className="[&_[data-slot=editable-collection-items]]:grid [&_[data-slot=editable-collection-items]]:gap-2">
                <ContentCollection
                  definition={definitionFor('construction.footer.links')}
                  value={footerLinks}
                  renderItem={(item) => {
                    const link = S.constructionFooterLinkSchema.parse(item);
                    return (
                      <FooterQuickLink href={`/construction#${link.destination}`}>
                        {link.label}
                      </FooterQuickLink>
                    );
                  }}
                />
              </div>
            </nav>
            <ContentEntity
              definition={definitionFor('construction.footer.licenses')}
              value={footerLicenses}
            >
              <div>
                <h3 className="mb-4 font-heading font-semibold">{footerLicenses.heading}</h3>
                {footerLicenses.licenses.map((license) => (
                  <p className="text-sm text-sidebar-foreground/70" key={license.id}>
                    {license.label}
                  </p>
                ))}
              </div>
            </ContentEntity>
          </Container>
          <Container width="wide" className="mt-10 border-t border-sidebar-foreground/20 pt-5">
            <ContentEntity
              definition={definitionFor('construction.footer.legal')}
              value={footerLegal}
            >
              <small className="text-sidebar-foreground/60">
                © {new Date().getFullYear()} {footerLegal.organizationName}.{' '}
                {footerLegal.rightsNotice}
              </small>
            </ContentEntity>
          </Container>
        </footer>
      </MarketingLayout>
      <AuthenticatedEditorToolbar />
    </div>
  );
}
export function ConstructionCategoryExperience({
  status,
}: {
  readonly status: 'current' | 'completed';
}): React.JSX.Element {
  return (
    <EditModeProvider pageId="construction">
      <CategoryBody status={status} />
    </EditModeProvider>
  );
}

import { ArrowLeft, ImageIcon, Menu, Phone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  constructionAnniversaryBannerSchema,
  constructionEntityDefinitions,
  constructionFooterBrandSchema,
  constructionFooterLegalSchema,
  constructionFooterLicensesSchema,
  constructionFooterLinkSchema,
  constructionFooterLinksSchema,
  constructionHeaderSchema,
  constructionProjectCategorySchema,
  constructionProjectsHeaderSchema,
  constructionProjectsSchema,
  constructionV2SeedData,
  editableValueSchema,
  type EditableValue,
  type PageContent,
  type SemanticEntityDefinition,
} from '@app/schemas';

import tricoLogo from '../assets/images/trico-logo.png';
import placeholderImage from '../assets/images/placeholder-neutral.svg';
import { EditableBoundary, type EditorOwnership } from '../components/EditableBoundary.js';
import { EditableCollection } from '../components/EditableCollection.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { parseConstructionValue } from './constructionContent.js';
import { constructionCategories } from './pageContent.js';

const categoryImages: Readonly<Record<string, string>> = {
  'media/seed/trico-logo.png': tricoLogo,
  'media/seed/placeholder-neutral.svg': placeholderImage,
};
const constructionImage = (key: string, fallback: string): string =>
  categoryImages[key] ??
  (key.startsWith('media/') && !key.startsWith('media/seed/') ? `/${key}` : fallback);

type ConstructionEntityId = (typeof constructionEntityDefinitions)[number]['id'];
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

function CategoryBody({ status }: { readonly status: 'current' | 'completed' }): React.JSX.Element {
  const { categoryId } = useParams();
  const editing = useEditMode();
  const [document, setDocument] = useState<PageContent>({});
  const [menuOpen, setMenuOpen] = useState(false);
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
    constructionProjectCategorySchema,
  );
  const projects = parseConstructionValue(document, projectEntityId, constructionProjectsSchema);
  const categoryDefinition = definition(categoryEntityId);
  const projectDefinition = definition(projectEntityId);
  const banner = parseConstructionValue(
    document,
    'construction.anniversary-banner',
    constructionAnniversaryBannerSchema,
  );
  const siteHeader = parseConstructionValue(
    document,
    'construction.header',
    constructionHeaderSchema,
  );
  const sectionHeader = parseConstructionValue(
    document,
    status === 'current'
      ? 'construction.current-projects.header'
      : 'construction.completed-projects.header',
    constructionProjectsHeaderSchema,
  );
  const footerBrand = parseConstructionValue(
    document,
    'construction.footer.brand',
    constructionFooterBrandSchema,
  );
  const footerLinks = parseConstructionValue(
    document,
    'construction.footer.links',
    constructionFooterLinksSchema,
  );
  const footerLicenses = parseConstructionValue(
    document,
    'construction.footer.licenses',
    constructionFooterLicensesSchema,
  );
  const footerLegal = parseConstructionValue(
    document,
    'construction.footer.legal',
    constructionFooterLegalSchema,
  );
  const sharedBoundary = (
    id: ConstructionEntityId,
    value: EditableValue,
    child: React.ReactNode,
  ) => (
    <EditableBoundary
      active={editing.active}
      definition={definition(id)}
      value={value}
      ownership={ownership(id, editing)}
      busy={editing.busy}
      onSave={(next) => editing.save(id, next)}
      onReloadLatest={() => editing.reload(id)}
    >
      {child}
    </EditableBoundary>
  );
  return (
    <div className="co-page ui-page co-category ui-category">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {sharedBoundary(
        'construction.anniversary-banner',
        editableValueSchema.parse(banner),
        <div className="co-anniversary ui-anniversary">
          ✦ <strong>{banner.message}</strong> ✦
        </div>,
      )}
      {sharedBoundary(
        'construction.header',
        editableValueSchema.parse(siteHeader),
        <header className="co-header ui-header">
          <div className="co-container ui-container co-header-inner ui-header-inner">
            <Link className="co-brand ui-brand" to="/">
              <img
                src={constructionImage(siteHeader.logo.key, tricoLogo)}
                alt={siteHeader.logoAltText}
              />
              <strong>{siteHeader.divisionLabel}</strong>
            </Link>
            <nav aria-label="Primary navigation">
              {siteHeader.navLinks.map((item) => (
                <Link key={item.id} to={`/construction#${item.destination}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="co-header-actions ui-header-actions">
              <a href={`tel:${siteHeader.phone.replace(/[^\d+]/g, '')}`}>
                <Phone /> {siteHeader.phone}
              </a>
              <Link
                className="co-button ui-button co-button-blue ui-button-blue"
                to="/construction#contact"
              >
                {siteHeader.actionLabel}
              </Link>
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
              {siteHeader.navLinks.map((item) => (
                <Link
                  key={item.id}
                  to={`/construction#${item.destination}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <a href={`tel:${siteHeader.phone.replace(/[^\d+]/g, '')}`}>{siteHeader.phone}</a>
            </nav>
          ) : null}
        </header>,
      )}
      <main id="main-content">
        <div className="co-container ui-container">
          <Link className="co-category-back ui-category-back" to="/construction#projects">
            <ArrowLeft /> Back to Construction
          </Link>
          <EditableBoundary
            active={editing.active}
            definition={categoryDefinition}
            value={editableValueSchema.parse(categoryValue)}
            ownership={ownership(categoryEntityId, editing)}
            busy={editing.busy}
            onSave={(next) => editing.save(categoryEntityId, next)}
            onReloadLatest={() => editing.reload(categoryEntityId)}
          >
            <header className="co-heading ui-heading">
              <span>{sectionHeader.eyebrow}</span>
              <h1 className="type-display">{categoryValue.label}</h1>
              <p>{categoryValue.blurb}</p>
            </header>
          </EditableBoundary>
          <nav className="co-category-tabs ui-category-tabs" aria-label="Project categories">
            {constructionCategories.map((item) => (
              <Link
                className={item === category ? 'active' : ''}
                key={item}
                to={`/construction/${status}/${item}`}
              >
                {
                  parseConstructionValue(
                    document,
                    `construction.${group}.category.${item}` as keyof typeof constructionV2SeedData,
                    constructionProjectCategorySchema,
                  ).label
                }
              </Link>
            ))}
          </nav>
          {projects.length === 0 ? (
            <div className="co-project-empty-shell">
              <EditableCollection
                active={editing.active}
                definition={projectDefinition}
                value={projects}
                renderItem={() => null}
                ownership={ownership(projectEntityId, editing)}
                busy={editing.busy}
                onSave={(next) => editing.save(projectEntityId, next)}
                onReloadLatest={() => editing.reload(projectEntityId)}
              />
              <div className="co-project-empty ui-project-empty">
                <ImageIcon aria-hidden="true" />
                <h2 className="type-section-title">No projects are published in this category.</h2>
                <p>
                  Contact our construction team for current capabilities and project references.
                </p>
                <Link
                  className="co-button ui-button co-button-blue ui-button-blue"
                  to="/construction#contact"
                >
                  Contact construction
                </Link>
              </div>
            </div>
          ) : (
            <div className="co-project-grid ui-project-grid">
              <EditableCollection
                active={editing.active}
                definition={projectDefinition}
                value={projects}
                renderItem={(item: EditableValue) => {
                  const project = constructionProjectsSchema.element.parse(item);
                  return (
                    <article className="co-project-card ui-project-card">
                      <img
                        className="co-project-photo ui-project-photo"
                        src={constructionImage(project.photo.key, placeholderImage)}
                        alt={project.photoAltText}
                      />
                      <div>
                        <span>{project.dateLabel}</span>
                        <h2 className="type-section-title">{project.name}</h2>
                        <p>{project.description}</p>
                        {project.address === '' ? null : <p>{project.address}</p>}
                        <dl className="co-project-details ui-project-details">
                          {[
                            ['Owner', project.owner],
                            ['Architect', project.architect],
                            ['Engineer', project.engineer],
                            ['Size', project.squareFeet],
                          ].map(([label, value]) =>
                            value === '' ? null : (
                              <div key={label}>
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                              </div>
                            ),
                          )}
                        </dl>
                      </div>
                    </article>
                  );
                }}
                ownership={ownership(projectEntityId, editing)}
                busy={editing.busy}
                onSave={(next) => editing.save(projectEntityId, next)}
                onReloadLatest={() => editing.reload(projectEntityId)}
              />
            </div>
          )}
        </div>
      </main>
      <footer className="co-footer ui-footer">
        <div className="co-container ui-container co-footer-grid ui-footer-grid">
          {sharedBoundary(
            'construction.footer.brand',
            editableValueSchema.parse(footerBrand),
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
            </div>,
          )}
          <nav aria-label="Quick links">
            <h3 className="type-footer-title">Quick Links</h3>
            <EditableCollection
              active={editing.active}
              definition={definition('construction.footer.links')}
              value={footerLinks}
              renderItem={(item) => {
                const link = constructionFooterLinkSchema.parse(item);
                return <Link to={`/construction#${link.destination}`}>{link.label}</Link>;
              }}
              ownership={ownership('construction.footer.links', editing)}
              busy={editing.busy}
              onSave={(next) => editing.save('construction.footer.links', next)}
              onReloadLatest={() => editing.reload('construction.footer.links')}
            />
          </nav>
          {sharedBoundary(
            'construction.footer.licenses',
            editableValueSchema.parse(footerLicenses),
            <div>
              <h3 className="type-footer-title">{footerLicenses.heading}</h3>
              {footerLicenses.licenses.map((license) => (
                <p key={license.id}>{license.label}</p>
              ))}
            </div>,
          )}
        </div>
        {sharedBoundary(
          'construction.footer.legal',
          editableValueSchema.parse(footerLegal),
          <p className="co-legal ui-legal">
            © {new Date().getFullYear()} {footerLegal.organizationName}. {footerLegal.rightsNotice}
          </p>,
        )}
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function ConstructionCategoryPage({
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

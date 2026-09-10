import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EditableEntity } from '../components/EditableEntity.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { defaultPages, type PageContent, type PageId } from './pageContent.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPage, fetchPublicPage } from '../services/content.js';

const navItems = [
  { label: 'Services', anchors: ['services', 'features'] },
  { label: 'Projects', anchors: ['projects'] },
  { label: 'About', anchors: ['about'] },
  { label: 'Contact', anchors: ['contact'] },
] as const;

function PageBody({ pageId }: { readonly pageId: PageId }): React.JSX.Element {
  const editing = useEditMode();
  const [content, setContent] = useState<PageContent>(defaultPages[pageId]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPage : fetchPublicPage;
    setLoadState('loading');
    void loader(pageId, { signal: controller.signal })
      .then((page) => {
        if (!controller.signal.aborted) {
          setContent(page);
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setContent(defaultPages[pageId]);
          setLoadState('fallback');
        }
      });
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending, pageId]);

  const availableAnchors = new Set(content.sections.map((section) => section.anchor));
  return (
    <div className={`site-page page-${pageId}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="anniversary-banner">40+ years of excellence</div>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="TriCo home">
          <img src={content.logo} alt={`${content.division} logo`} />
          <span>{content.division}</span>
        </Link>
        {pageId === 'home' ? null : (
          <nav aria-label="Primary navigation">
            {navItems
              .map((item) => ({
                ...item,
                anchor: item.anchors.find((anchor) => availableAnchors.has(anchor)),
              }))
              .filter((item) => item.anchor !== undefined || item.label === 'Contact')
              .map((item) => (
                <a key={item.label} href={`#${item.anchor ?? 'contact'}`}>
                  {item.label}
                </a>
              ))}
          </nav>
        )}
        <a className="header-call" href={`tel:${content.contact.phone.replace(/[^\d+]/g, '')}`}>
          {content.contact.phone}
        </a>
      </header>
      {loadState === 'fallback' ? (
        <div className="content-notice" role="status">
          Showing the checked-in site content while published content is unavailable.
        </div>
      ) : null}
      <main id="main-content">
        <EditableEntity entityId={content.hero.entityId} value={content.hero}>
          <section
            className={`site-hero ${content.heroImage === undefined ? '' : 'with-image'}`}
            style={
              content.heroImage === undefined
                ? undefined
                : ({ '--hero-image': `url(${content.heroImage})` } as React.CSSProperties)
            }
          >
            <div className="hero-inner">
              <p className="eyebrow">{content.hero.eyebrow}</p>
              <h1>{content.hero.title}</h1>
              <p className="hero-copy">{content.hero.description}</p>
              <a className="button primary" href={content.hero.primaryHref}>
                {content.hero.primaryAction}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </section>
        </EditableEntity>
        {content.sections.map((section, index) => (
          <EditableEntity
            key={section.entityId}
            entityId={section.entityId}
            value={section.cards ?? section}
          >
            <section
              id={section.anchor}
              className={index % 2 === 0 ? 'content-section' : 'content-section section-tint'}
            >
              <div className="section-heading">
                {section.eyebrow === undefined ? null : (
                  <p className="eyebrow">{section.eyebrow}</p>
                )}
                <h2>{section.title}</h2>
                {section.description === undefined ? null : <p>{section.description}</p>}
              </div>
              {section.cards === undefined || section.cards.length === 0 ? (
                <div className="empty-state">
                  <strong>No items are published yet.</strong>
                  <p>
                    {section.emptyMessage ??
                      'Check back soon, or contact our team for current information.'}
                  </p>
                </div>
              ) : (
                <div className="card-grid">
                  {section.cards.map((item) => {
                    const body = (
                      <article className="content-card">
                        {item.meta === undefined ? null : (
                          <span className="card-meta">{item.meta}</span>
                        )}
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        {item.href === undefined ? null : (
                          <span className="card-link">Learn more →</span>
                        )}
                      </article>
                    );
                    return item.href === undefined ? (
                      <div key={item.id}>{body}</div>
                    ) : item.href.startsWith('/') ? (
                      <Link key={item.id} to={item.href}>
                        {body}
                      </Link>
                    ) : (
                      <a key={item.id} href={item.href} target="_blank" rel="noreferrer">
                        {body}
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          </EditableEntity>
        ))}
        <EditableEntity entityId={content.contact.entityId} value={content.contact}>
          <section id="contact" className="contact-section">
            <div>
              <p className="eyebrow">Let's work together</p>
              <h2>{content.contact.title}</h2>
              <p>{content.contact.description}</p>
            </div>
            <div className="contact-actions">
              <a
                className="button light"
                href={`tel:${content.contact.phone.replace(/[^\d+]/g, '')}`}
              >
                {content.contact.phone}
              </a>
              <a className="button outline-light" href={`mailto:${content.contact.email}`}>
                {content.contact.email}
              </a>
            </div>
          </section>
        </EditableEntity>
      </main>
      <footer className="site-footer">
        <img src={content.logo} alt="" />
        <p>Integrity, excellence, community, and teamwork.</p>
        <nav aria-label="Division navigation">
          <Link to="/property-management">Property Management</Link>
          <Link to="/real-estate">Real Estate</Link>
          <Link to="/construction">Construction</Link>
          <Link to="/storage">Storage</Link>
          <Link to="/development">Development</Link>
        </nav>
        <small>© {new Date().getFullYear()} TriCo, Inc. All rights reserved.</small>
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function SitePage({ pageId }: { readonly pageId: PageId }): React.JSX.Element {
  return (
    <EditModeProvider pageId={pageId}>
      <PageBody pageId={pageId} />
    </EditModeProvider>
  );
}

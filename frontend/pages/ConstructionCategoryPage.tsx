import { ArrowLeft, ImageIcon, Menu, Phone, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import tricoLogo from '../assets/images/trico-logo.png';
import { EditableEntity } from '../components/EditableEntity.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { constructionCategories } from './pageContent.js';
import './construction.css';

const labels: Readonly<Record<(typeof constructionCategories)[number], string>> = {
  'multi-family': 'Multi Family',
  retail: 'Retail',
  'office-ti': 'Office / TI',
  'medical-dental': 'Medical / Dental',
  industrial: 'Industrial',
  storage: 'Storage',
  subdivisions: 'Subdivisions',
  underground: 'Underground',
};
const blurbs: Readonly<Record<(typeof constructionCategories)[number], readonly [string, string]>> =
  {
    'multi-family': [
      'Apartments, townhomes, and condominium communities currently underway.',
      'Apartments, townhomes, and condominium communities built for long-term durability.',
    ],
    retail: [
      'Shopping centers, pads, and tenant spaces currently under construction.',
      'Shopping centers, pads, and tenant spaces designed to drive traffic.',
    ],
    'office-ti': [
      'Ground-up office buildings and tenant improvement build-outs in progress.',
      'Ground-up office buildings and tenant improvement build-outs.',
    ],
    'medical-dental': [
      'Clinics, dental suites, and specialty medical facilities being built.',
      'Clinics, dental suites, and specialty medical facilities.',
    ],
    industrial: [
      'Warehouse, flex, and manufacturing facilities under construction.',
      'Warehouse, flex, and manufacturing facilities.',
    ],
    storage: [
      'Self-storage and RV/boat storage facilities from pad to paint.',
      'Self-storage and RV/boat storage facilities from pad to paint.',
    ],
    subdivisions: [
      'Residential subdivisions from entitlement through final lot delivery.',
      'Residential subdivisions from entitlement through final lot delivery.',
    ],
    underground: [
      'Wet and dry utilities, storm drain, sewer, and site infrastructure.',
      'Wet and dry utilities, storm drain, sewer, and site infrastructure.',
    ],
  };

function CategoryBody({ status }: { readonly status: 'current' | 'completed' }): React.JSX.Element {
  const { categoryId } = useParams();
  const editing = useEditMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const category = constructionCategories.find((item) => item === categoryId);
  if (category === undefined)
    return <Navigate to={`/construction/${status}/multi-family`} replace />;
  const group = status === 'current' ? 'current-projects' : 'completed-projects';
  const heading = status === 'current' ? 'Current Projects' : 'Completed Projects';
  const blurb = blurbs[category][status === 'current' ? 0 : 1];
  return (
    <div className="co-page co-category">
      <div className="co-anniversary">
        ✦ <strong>40+ Years of Excellence</strong> ✦
      </div>
      <header className="co-header">
        <div className="co-container co-header-inner">
          <Link className="co-brand" to="/">
            <img src={tricoLogo} alt="TriCo Construction" />
            <strong>Construction</strong>
          </Link>
          <nav aria-label="Primary navigation">
            <Link to="/construction#services">Services</Link>
            <Link to="/construction#projects">Projects</Link>
            <Link to="/construction#plan-room">Plan Room</Link>
            <Link to="/construction#team">Our Team</Link>
            <Link to="/construction#contact">Contact</Link>
          </nav>
          <div className="co-header-actions">
            <a href="tel:8015718833">
              <Phone /> (801) 571-8833
            </a>
            <Link className="co-button co-button-blue" to="/construction#contact">
              Get Quote
            </Link>
          </div>
          <button
            className="co-menu"
            type="button"
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen ? (
          <nav className="co-mobile-nav" aria-label="Mobile navigation">
            <Link to="/construction#services">Services</Link>
            <Link to="/construction#projects">Projects</Link>
            <Link to="/construction#contact">Contact</Link>
          </nav>
        ) : null}
      </header>
      <main>
        <div className="co-container">
          <Link className="co-category-back" to="/construction#projects">
            <ArrowLeft /> Back to Construction
          </Link>
          <EditableEntity
            entityId={`construction.${group}.category.${category}`}
            value={{ label: labels[category], blurb }}
          >
            <header className="co-heading">
              <span>{heading}</span>
              <h1>{labels[category]}</h1>
              <p>{blurb}</p>
            </header>
          </EditableEntity>
          <nav className="co-category-tabs" aria-label="Project categories">
            {constructionCategories.map((item) => (
              <Link
                className={item === category ? 'active' : ''}
                key={item}
                to={`/construction/${status}/${item}`}
              >
                {labels[item]}
              </Link>
            ))}
          </nav>
          <EditableEntity entityId={`construction.${group}.projects.${category}`} value={[]}>
            <div className="co-project-empty">
              <ImageIcon aria-hidden="true" />
              <h2>No projects are published in this category.</h2>
              <p>Contact our construction team for current capabilities and project references.</p>
              {editing.active ? (
                <p>
                  <strong>
                    Use this section's Add project control to publish the first project.
                  </strong>
                </p>
              ) : null}
              <Link className="co-button co-button-blue" to="/construction#contact">
                Contact construction
              </Link>
            </div>
          </EditableEntity>
        </div>
      </main>
      <footer className="co-footer">
        <div className="co-container">
          <img src={tricoLogo} alt="TriCo Construction" />
          <p>Utah's trusted construction partner for over 40 years.</p>
          <p className="co-legal">
            © {new Date().getFullYear()} TriCo Construction. All rights reserved.
          </p>
        </div>
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

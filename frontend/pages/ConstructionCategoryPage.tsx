import { Link, Navigate, useParams } from 'react-router-dom';

import { constructionCategories } from './pageContent.js';

const labels: Readonly<Record<(typeof constructionCategories)[number], string>> = {
  'multi-family': 'Multi-family',
  retail: 'Retail',
  'office-ti': 'Office & tenant improvement',
  'medical-dental': 'Medical & dental',
  industrial: 'Industrial',
  storage: 'Storage',
  subdivisions: 'Subdivisions',
  underground: 'Underground utilities',
};

export function ConstructionCategoryPage({
  status,
}: {
  readonly status: 'current' | 'completed';
}): React.JSX.Element {
  const { categoryId } = useParams();
  const category = constructionCategories.find((item) => item === categoryId);
  if (category === undefined)
    return <Navigate to={`/construction/${status}/multi-family`} replace />;
  const heading = status === 'current' ? 'Current projects' : 'Completed projects';
  return (
    <div className="category-page">
      <header className="category-header">
        <Link to="/construction">TriCo Construction</Link>
      </header>
      <main>
        <Link className="back-link" to="/construction#projects">
          ← Back to construction
        </Link>
        <div className="section-heading">
          <p className="eyebrow">{heading}</p>
          <h1>{labels[category]}</h1>
          <p>Published {labels[category].toLowerCase()} work from TriCo Construction.</p>
        </div>
        <nav className="category-tabs" aria-label="Project categories">
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
        <div className="empty-state project-empty">
          <h2>No projects are published in this category.</h2>
          <p>Contact our construction team for current capabilities and project references.</p>
          <Link className="button primary" to="/construction#contact">
            Contact construction
          </Link>
        </div>
      </main>
    </div>
  );
}

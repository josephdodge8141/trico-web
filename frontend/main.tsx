import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import './design-system/themes/main.css';
import './styles.css';
import './pages/home.css';
import './pages/property-management.css';
import './pages/real-estate.css';
import './pages/construction.css';
import './pages/storage.css';
import './pages/development.css';

const rootElement = document.getElementById('root');

document.documentElement.dataset.theme = 'ds-21';

if (rootElement === null) {
  throw new Error('Application root element is missing');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

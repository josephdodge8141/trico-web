import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/open-sans/latin-400.css';
import '@fontsource/open-sans/latin-600.css';
import '@fontsource/open-sans/latin-700.css';
import '@fontsource/open-sans/latin-800.css';

import { App } from './App.js';
import './styles.css';
import './pages/home.css';
import './pages/property-management.css';
import './pages/real-estate.css';
import './pages/construction.css';
import './pages/storage.css';
import './pages/development.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Application root element is missing');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

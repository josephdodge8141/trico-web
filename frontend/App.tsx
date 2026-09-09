import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ConstructionCategoryPage } from './pages/ConstructionCategoryPage.js';
import { SitePage } from './pages/SitePage.js';
import { AuthPage } from './pages/AuthPage.js';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SitePage pageId="home" />} />
        <Route path="/property-management" element={<SitePage pageId="property-management" />} />
        <Route path="/real-estate" element={<SitePage pageId="real-estate" />} />
        <Route path="/construction" element={<SitePage pageId="construction" />} />
        <Route
          path="/construction/current/:categoryId"
          element={<ConstructionCategoryPage status="current" />}
        />
        <Route
          path="/construction/completed/:categoryId"
          element={<ConstructionCategoryPage status="completed" />}
        />
        <Route path="/storage" element={<SitePage pageId="storage" />} />
        <Route path="/development" element={<SitePage pageId="development" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/request-reset" element={<AuthPage mode="request-reset" />} />
        <Route path="/reset-password" element={<AuthPage mode="confirm-reset" />} />
        <Route path="/verify-email" element={<AuthPage mode="verify" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

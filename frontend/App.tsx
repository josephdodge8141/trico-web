import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

const routeTitles: Readonly<Record<string, string>> = {
  '/': "TriCo | Building Utah's Future",
  '/property-management': 'Property Management | TriCo',
  '/real-estate': 'Real Estate | TriCo',
  '/construction': 'Construction | TriCo',
  '/storage': 'Storage | TriCo',
  '/development': 'Development | TriCo',
  '/community': 'Giving Back to Our Community | TriCo',
  '/login': 'Editor sign in | TriCo',
  '/register': 'Create editor account | TriCo',
  '/request-reset': 'Reset password | TriCo',
  '/reset-password': 'Choose new password | TriCo',
  '/verify-email': 'Verify email | TriCo',
};

function RouteTitle(): null {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title =
      routeTitles[pathname] ??
      (pathname.startsWith('/construction/')
        ? 'Construction Projects | TriCo'
        : (routeTitles['/'] ?? 'TriCo'));
  }, [pathname]);
  return null;
}

function RouteViewport(): null {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (hash === '') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

const HomeExperience = lazy(() =>
  import('./pages/HomeExperience.js').then(({ HomeExperience }) => ({ default: HomeExperience })),
);
const PropertyManagementExperience = lazy(() =>
  import('./pages/PropertyManagementExperience.js').then(({ PropertyManagementExperience }) => ({
    default: PropertyManagementExperience,
  })),
);
const RealEstateExperience = lazy(() =>
  import('./pages/RealEstateExperience.js').then(({ RealEstateExperience }) => ({
    default: RealEstateExperience,
  })),
);
const ConstructionExperience = lazy(() =>
  import('./pages/ConstructionExperience.js').then(({ ConstructionExperience }) => ({
    default: ConstructionExperience,
  })),
);
const ConstructionCategoryExperience = lazy(() =>
  import('./pages/ConstructionCategoryExperience.js').then(
    ({ ConstructionCategoryExperience }) => ({
      default: ConstructionCategoryExperience,
    }),
  ),
);
const StorageExperience = lazy(() =>
  import('./pages/StorageExperience.js').then(({ StorageExperience }) => ({
    default: StorageExperience,
  })),
);
const DevelopmentExperience = lazy(() =>
  import('./pages/DevelopmentExperience.js').then(({ DevelopmentExperience }) => ({
    default: DevelopmentExperience,
  })),
);
const CommunityExperience = lazy(() =>
  import('./pages/CommunityExperience.js').then(({ CommunityExperience }) => ({
    default: CommunityExperience,
  })),
);
const AuthPage = lazy(() =>
  import('./pages/AuthPage.js').then(({ AuthPage }) => ({ default: AuthPage })),
);

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <RouteTitle />
      <RouteViewport />
      <Suspense
        fallback={
          <main
            className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
            role="status"
          >
            Loading page…
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<HomeExperience />} />
          <Route path="/property-management" element={<PropertyManagementExperience />} />
          <Route path="/real-estate" element={<RealEstateExperience />} />
          <Route path="/construction" element={<ConstructionExperience />} />
          <Route
            path="/construction/current/:categoryId"
            element={<ConstructionCategoryExperience status="current" />}
          />
          <Route
            path="/construction/completed/:categoryId"
            element={<ConstructionCategoryExperience status="completed" />}
          />
          <Route path="/storage" element={<StorageExperience />} />
          <Route path="/development" element={<DevelopmentExperience />} />
          <Route path="/community" element={<CommunityExperience />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/request-reset" element={<AuthPage mode="request-reset" />} />
          <Route path="/reset-password" element={<AuthPage mode="confirm-reset" />} />
          <Route path="/verify-email" element={<AuthPage mode="verify" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

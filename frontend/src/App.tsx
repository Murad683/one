import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/layout/Layout';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ScrollToTop from './components/utils/ScrollToTop';
import { ProtectedRoute } from './components/utils/ProtectedRoute';

// Lazy Loaded Pages — Main Website
const HomePage = lazy(() => import('./pages/HomePage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const PackagesPage = lazy(() => import('./pages/PackagesPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PortalLoginPage = lazy(() => import('./pages/PortalLoginPage'));

// Lazy Loaded Pages — Client Dashboard
const PortalLayout = lazy(() => import('./components/layout/PortalLayout'));
const DashboardOverviewPage = lazy(() => import('./pages/portal/DashboardOverviewPage'));
const DeliverablesPage = lazy(() => import('./pages/portal/DeliverablesPage'));
const BillingPage = lazy(() => import('./pages/portal/BillingPage'));
const SupportPage = lazy(() => import('./pages/portal/SupportPage'));

// Premium Loading Component
const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
    <div className="animate-pulse flex flex-col items-center">
      <span className="font-heading text-3xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
        ONE<span style={{ color: 'var(--accent-text)' }}>.</span>
      </span>
      <div className="mt-4 w-12 h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent" />
    </div>
  </div>
);
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence 
      mode="wait" 
      onExitComplete={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
    >
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* Main Website Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="paketler" element={<PackagesPage />} />
            <Route path="haqqimizda" element={<AboutPage />} />
            <Route path="elaqe" element={<ContactPage />} />
            <Route path="portal" element={<PortalLoginPage />} />
          </Route>

          {/* Client Dashboard Routes */}
          <Route path="/portal/panel" element={<ProtectedRoute />}>
            <Route element={<PortalLayout />}>
              <Route index element={<DashboardOverviewPage />} />
              <Route path="deliverables" element={<DeliverablesPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="support" element={<SupportPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
        <Router>
          <AuthProvider>
            <ScrollToTop />
            <AnimatedRoutes />
          </AuthProvider>
        </Router>
    </ThemeProvider>
  );
}

export default App;

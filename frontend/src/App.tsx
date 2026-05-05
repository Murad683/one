import { motion, AnimatePresence } from 'framer-motion';
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import ScrollToTop from './components/utils/ScrollToTop';

// Lazy Loaded Pages
const HomePage = lazy(() => import('./pages/HomePage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const PackagesPage = lazy(() => import('./pages/PackagesPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PortalLoginPage = lazy(() => import('./pages/PortalLoginPage'));

// Premium Minimalist Loading Component
const PageLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
    <motion.div
      initial={{ opacity: 0.4, y: 10 }}
      animate={{ opacity: [0.4, 1, 0.4], y: 0 }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="font-heading text-4xl md:text-5xl font-bold tracking-tighter mb-8"
      style={{ color: 'var(--text-primary)' }}
    >
      ONE<span style={{ color: 'var(--accent-text)' }}>.</span>
    </motion.div>
    
    <div className="w-32 h-[1px] bg-white/5 relative overflow-hidden">
      <motion.div 
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-y-0 bg-accent w-1/3"
        style={{ boxShadow: '0 0 10px var(--glow-accent)' }}
      />
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
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <ScrollToTop />
          <AnimatedRoutes />
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;

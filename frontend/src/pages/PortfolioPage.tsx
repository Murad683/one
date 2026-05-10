import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import FilterTabs from '../components/ui/FilterTabs';
import PortfolioGrid from '../components/sections/PortfolioGrid';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';
import { useSiteSettings, useProjects } from '../hooks/useSiteData';

const PortfolioPage = () => {
  const { data: settings, loading: settingsLoading } = useSiteSettings();
  const { data: projects, loading: projectsLoading } = useProjects();
  const [activeFilter, setActiveFilter] = useState('all');

  const categories = useMemo(() => {
    const cats = new Map();
    // Default "All" category
    cats.set('all', { key: 'all', label: 'HAMISI' });
    
    projects.forEach(p => {
      const cat = p.category;
      if (cat && cat.name) {
        cats.set(cat.name, {
          key: cat.name,
          label: cat.name.toUpperCase()
        });
      } else if (p.categoryLegacy) {
        cats.set(p.categoryLegacy, {
          key: p.categoryLegacy,
          label: p.categoryLegacy.toUpperCase()
        });
      }
    });
    return Array.from(cats.values());
  }, [projects]);

  if (settingsLoading || projectsLoading || !settings) return null;

  return (
    <PageTransition className="relative pt-40 pb-32 px-6 md:px-16 min-h-screen overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          variants={cockpitContainer}
          initial="hidden"
          animate="show"
          className="text-center mb-16"
        >
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            {settings.portfolioTopLabel || "İşlərimiz"}
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {settings.portfolioMainHeading || "Portfolio"}
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {settings.portfolioSubtext}
          </motion.p>
        </motion.div>

        <div className="mb-16 relative z-20">
          <FilterTabs categories={categories} active={activeFilter} onChange={setActiveFilter} />
        </div>

        <div className="relative z-10">
          <PortfolioGrid filter={activeFilter} />
        </div>
      </div>
    </PageTransition>
  );
};

export default PortfolioPage;

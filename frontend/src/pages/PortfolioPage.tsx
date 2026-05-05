import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import FilterTabs from '../components/ui/FilterTabs';
import PortfolioGrid from '../components/sections/PortfolioGrid';
import SectionOrbs from '../components/ui/SectionOrbs';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const PortfolioPage = () => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <PageTransition className="relative pt-40 pb-32 px-6 md:px-16 min-h-screen overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <SectionOrbs
        orbs={[
          { color: 'rgba(163, 230, 53, 0.06)', size: 'w-[500px] h-[500px]', position: 'top-1/3 right-0', blur: 'blur-[120px]', duration: 20 },
          { color: 'rgba(100, 50, 200, 0.05)', size: 'w-[400px] h-[400px]', position: 'bottom-1/3 left-0', blur: 'blur-[100px]', duration: 24 },
        ]}
      />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          variants={cockpitContainer}
          initial="hidden"
          animate="show"
          className="text-center mb-16"
        >
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            {t('portfolio_page.badge')}
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {t('portfolio_page.title')}
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('portfolio_page.subtitle')}
          </motion.p>
        </motion.div>

        <div className="mb-16 relative z-20">
          <FilterTabs active={activeFilter} onChange={setActiveFilter} />
        </div>

        <div className="relative z-10">
          <PortfolioGrid filter={activeFilter} />
        </div>
      </div>
    </PageTransition>
  );
};

export default PortfolioPage;

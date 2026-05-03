import { useState } from 'react';
import { motion } from 'framer-motion';
import FilterTabs from '../components/ui/FilterTabs';
import PortfolioGrid from '../components/sections/PortfolioGrid';
import SectionOrbs from '../components/ui/SectionOrbs';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const PortfolioPage = () => {
  const [activeFilter, setActiveFilter] = useState('Hamısı');

  return (
    <PageTransition className="relative py-32 px-6 md:px-16 min-h-screen bg-carbon overflow-hidden">
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
          <motion.p variants={cockpitItem} className="text-accent text-xs uppercase tracking-widest font-medium mb-4">
            İşlərimiz
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold text-white mb-6">
            Portfolio
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            Müştərilərimiz üçün yaratdığımız seçilmiş layihələr.
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

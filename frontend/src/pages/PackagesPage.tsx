import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PricingCards from '../components/sections/PricingCards';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const PackagesPage = () => {
  const { t } = useTranslation();

  return (
    <PageTransition className="relative pt-40 pb-32 px-6 md:px-16 min-h-screen overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <motion.div
          variants={cockpitContainer}
          initial="hidden"
          animate="show"
          className="max-w-2xl mx-auto mb-16"
        >
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            {t('packages_page.badge')}
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {t('packages_page.title')}
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('packages_page.subtitle')}
          </motion.p>
        </motion.div>

        <PricingCards />
      </div>
    </PageTransition>
  );
};

export default PackagesPage;

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cockpitContainer, cockpitItem } from '../../utils/animations';

const projects = [
  { 
    titleKey: 'data.featured_projects.0.title', 
    categoryKey: 'data.featured_projects.0.category',
    fullWidth: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80'
  },
  { 
    titleKey: 'data.featured_projects.1.title', 
    categoryKey: 'data.featured_projects.1.category',
    fullWidth: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'
  },
  { 
    titleKey: 'data.featured_projects.2.title', 
    categoryKey: 'data.featured_projects.2.category',
    fullWidth: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
  },
];

const FeaturedPortfolioSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-32 px-6 md:px-16 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex justify-between items-end mb-16">
          <div>
            <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
              {t('featured_portfolio.badge')}
            </motion.p>
            <motion.h2 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('featured_portfolio.title')}
            </motion.h2>
          </div>
          <motion.div variants={cockpitItem}>
            <Link
              to="/portfolio"
              className="text-sm transition-colors mb-2 inline-block hover:opacity-80"
              style={{ color: 'var(--text-faint)' }}
            >
              {t('featured_portfolio.view_all')}
            </Link>
          </motion.div>
        </div>

        <motion.div variants={cockpitItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`relative overflow-hidden rounded-2xl aspect-video cursor-pointer group ${
                project.fullWidth ? 'md:col-span-2' : 'col-span-1'
              }`}
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <img
                src={project.thumbnailUrl}
                alt={t(project.titleKey)}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              {/* Bottom gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />

              {/* Info at bottom */}
              <div className="absolute bottom-0 left-0 p-8 z-20">
                <p className="text-accent text-xs uppercase tracking-widest mb-2">
                  {t(project.categoryKey)}
                </p>
                <h3 className="text-white font-heading text-xl md:text-2xl font-semibold">
                  {t(project.titleKey)}
                </h3>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default FeaturedPortfolioSection;

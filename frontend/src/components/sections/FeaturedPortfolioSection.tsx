import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cockpitContainer, cockpitItem } from '../../utils/animations';

const projects = [
  { 
    title: 'Azər Kimya — Korporativ Film', 
    category: 'Video İstehsalı',
    fullWidth: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80'
  },
  { 
    title: 'TechAZ — Marka Yeniləməsi', 
    category: 'Brend Dizaynı',
    fullWidth: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'
  },
  { 
    title: 'Baku Foods — SMM Kampaniyası', 
    category: 'SMM',
    fullWidth: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
  },
];

const FeaturedPortfolioSection = () => {
  return (
    <section className="py-32 px-6 md:px-16 bg-carbon">
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex justify-between items-end mb-16">
          <div>
            <motion.p variants={cockpitItem} className="text-accent text-xs uppercase tracking-widest font-medium mb-4">
              İşlərimiz
            </motion.p>
            <motion.h2 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-semibold text-white">
              Seçilmiş İşlər
            </motion.h2>
          </div>
          <motion.div variants={cockpitItem}>
            <Link
              to="/portfolio"
              className="text-white/40 text-sm hover:text-accent transition-colors mb-2 inline-block"
            >
              Hamısına Bax →
            </Link>
          </motion.div>
        </div>

        <motion.div variants={cockpitItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`relative overflow-hidden rounded-2xl aspect-video cursor-pointer group bg-white/[0.04] ${
                project.fullWidth ? 'md:col-span-2' : 'col-span-1'
              }`}
            >
              <img
                src={project.thumbnailUrl}
                alt={project.title}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              {/* Bottom gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />

              {/* Info at bottom */}
              <div className="absolute bottom-0 left-0 p-8 z-20">
                <p className="text-accent text-xs uppercase tracking-widest mb-2">
                  {project.category}
                </p>
                <h3 className="text-white font-heading text-xl md:text-2xl font-semibold">
                  {project.title}
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

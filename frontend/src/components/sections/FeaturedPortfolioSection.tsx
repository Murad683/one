import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cockpitContainer, cockpitItem } from '../../utils/animations';
import PortfolioCard from '../ui/PortfolioCard';
import ProjectModal from '../ui/ProjectModal';
import { useProjects, useSiteSettings } from '../../hooks/useSiteData';

const FeaturedPortfolioSection = () => {
  const { data: projects, loading: projectsLoading } = useProjects(true);
  const { data: settings, loading: settingsLoading } = useSiteSettings();
  
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProjectClick = (project: any) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  if (projectsLoading || settingsLoading) return null;

  return (
    <section className="py-32 px-6 md:px-16 transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
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
              {settings?.portfolioTopLabel || "İşlərimiz"}
            </motion.p>
            <motion.h2 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {settings?.portfolioMainHeading || "Seçilmiş İşlər"}
            </motion.h2>
          </div>
          <motion.div variants={cockpitItem}>
            <Link
              to="/portfolio"
              className="text-sm transition-colors mb-2 inline-block hover:opacity-80"
              style={{ color: 'var(--text-faint)' }}
            >
              Hamısına Bax →
            </Link>
          </motion.div>
        </div>

        <motion.div variants={cockpitItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project: any, index: number) => (
            <div 
              key={project.id} 
              className={index === 0 ? 'md:col-span-2' : 'col-span-1'}
            >
              <PortfolioCard 
                project={project} 
                onClick={() => handleProjectClick(project)}
              />
            </div>
          ))}
        </motion.div>
      </motion.div>

      <ProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={selectedProject}
      />
    </section>
  );
};

export default FeaturedPortfolioSection;

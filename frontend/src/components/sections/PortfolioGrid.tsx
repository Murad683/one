import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PortfolioCard from '../ui/PortfolioCard';
import ProjectModal from '../ui/ProjectModal';
import { projects } from '../../data/projects';
import { cinematicEasing } from '../../utils/animations';

interface PortfolioGridProps {
  filter: string;
}

const PortfolioGrid: React.FC<PortfolioGridProps> = ({ filter }) => {
  const [selectedProject, setSelectedProject] = useState<(typeof projects)[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProjectClick = (project: (typeof projects)[0]) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  // Mapping filter key to data category key if necessary
  const filterToCategoryKeyMap: Record<string, string> = {
    'all': 'all',
    'Video İstehsalı': 'data.categories.video',
    'Brend Dizaynı': 'data.categories.brand',
    'SMM': 'data.categories.smm',
    'Veb Tərtibat': 'data.categories.web',
  };

  const targetCategoryKey = filterToCategoryKeyMap[filter] || filter;

  const filtered = targetCategoryKey === 'all' 
    ? projects 
    : projects.filter((p) => p.categoryKey === targetCategoryKey);

  return (
    <div className="relative">
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((project, index) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.05,
                ease: cinematicEasing
              }}
            >
              <PortfolioCard 
                project={project} 
                onClick={() => handleProjectClick(project)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <ProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={selectedProject}
      />
    </div>
  );
};

export default PortfolioGrid;

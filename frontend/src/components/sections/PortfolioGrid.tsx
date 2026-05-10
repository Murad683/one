import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PortfolioCard from '../ui/PortfolioCard';
import ProjectModal from '../ui/ProjectModal';
import { cinematicEasing } from '../../utils/animations';
import { useProjects } from '../../hooks/useSiteData';

interface PortfolioGridProps {
  filter: string;
}

const PortfolioGrid: React.FC<PortfolioGridProps> = ({ filter }) => {
  const { data: projects, loading } = useProjects();
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProjectClick = (project: any) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  if (loading) return null;

  const filtered = filter === 'all' 
    ? projects 
    : projects.filter((p) => {
        const catName = p.category ? p.category.name : (p.categoryLegacy || '');
        return catName === filter;
      });

  return (
    <div className="relative">
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((project: any, index: number) => (
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

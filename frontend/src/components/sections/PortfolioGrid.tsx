import { motion, AnimatePresence } from 'framer-motion';
import PortfolioCard from '../ui/PortfolioCard';
import { projects } from '../../data/projects';
import { cinematicEasing } from '../../utils/animations';

interface PortfolioGridProps {
  filter: string;
}

const PortfolioGrid: React.FC<PortfolioGridProps> = ({ filter }) => {
  const filtered = filter === 'Hamısı' 
    ? projects 
    : projects.filter((p) => p.category === filter);

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
              <PortfolioCard project={project} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default PortfolioGrid;

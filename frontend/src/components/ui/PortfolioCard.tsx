import { useRef } from 'react';
import { motion } from 'framer-motion';
import { cinematicEasing } from '../../utils/animations';
import { assetUrl } from '../../utils/api';

interface Project {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  youtubeId?: string;
  categoryLegacy?: string;
  category?: any;
}

interface PortfolioCardProps {
  project: Project;
  onClick?: () => void;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ project, onClick }) => {
  const thumbFailed = useRef(false);

  const categoryName = project.category ? project.category.name : (project.categoryLegacy || '');

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl aspect-video cursor-pointer group liquid-glass transition-colors duration-300 will-change-transform"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        borderTopColor: 'var(--card-border-top)',
      }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: cinematicEasing }}
      onClick={onClick}
    >
      <img
        src={assetUrl(project.thumbnailUrl) || "/portfolio.jpeg"}
        alt={project.title}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          if (thumbFailed.current) return;
          thumbFailed.current = true;
          (e.currentTarget as HTMLImageElement).src = "/portfolio.jpeg";
        }}
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-20" />

      <div className="absolute bottom-0 left-0 p-6 z-30">
        <p className="text-accent text-[10px] uppercase tracking-[0.2em] font-medium mb-2 opacity-90">
          {categoryName}
        </p>
        <h3 className="text-white font-heading text-lg font-semibold leading-tight">
          {project.title}
        </h3>
      </div>

      <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-white/10 transition-all duration-300 z-40" />
    </motion.div>
  );
};

export default PortfolioCard;

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
  slug?: string;
}

interface PortfolioCardProps {
  project: Project;
  onClick?: () => void;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ project, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    videoRef.current?.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const categoryName = project.category ? project.category.name : (project.categoryLegacy || '');

  return (
    <motion.div
      className="relative overflow-hidden aspect-video cursor-pointer group will-change-transform premium-glass premium-glass-card"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: cinematicEasing }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <img
        src={assetUrl(project.thumbnailUrl) || "/portfolio.jpeg"}
        alt={project.title}
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      
      {project.slug && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
        >
          <source src={assetUrl(`/videos/portfolio/${project.slug}.mp4`)} type="video/mp4" />
        </video>
      )}

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

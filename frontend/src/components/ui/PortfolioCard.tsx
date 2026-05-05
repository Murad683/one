import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cinematicEasing } from '../../utils/animations';

interface Project {
  id: number;
  titleKey: string;
  categoryKey: string;
  slug: string;
  thumbnailUrl?: string;
  youtubeId?: string;
  descKey?: string;
}

interface PortfolioCardProps {
  project: Project;
  onClick?: () => void;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ project, onClick }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    videoRef.current?.play().catch(() => {
      // Handle autoplay restrictions if necessary
    });
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl aspect-video cursor-pointer group border transition-colors duration-300"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        borderTopColor: 'var(--card-border-top)',
      }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: cinematicEasing }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Placeholder thumbnail */}
      <img
        src={project.thumbnailUrl}
        alt={t(project.titleKey)}
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      {/* Silent hover video */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
      >
        <source src={`/videos/portfolio/${project.slug}.mp4`} type="video/mp4" />
      </video>

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-20" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 p-6 z-30">
        <p className="text-accent text-[10px] uppercase tracking-[0.2em] font-medium mb-2 opacity-90">
          {t(project.categoryKey)}
        </p>
        <h3 className="text-white font-heading text-lg font-semibold leading-tight">
          {t(project.titleKey)}
        </h3>
      </div>

      {/* Subtle border reveal on hover */}
      <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-white/10 transition-all duration-300 z-40" />
    </motion.div>
  );
};

export default PortfolioCard;

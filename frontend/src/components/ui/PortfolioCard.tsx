import { useRef } from 'react';
import { motion } from 'framer-motion';
import { cinematicEasing } from '../../utils/animations';

interface Project {
  id: number;
  title: string;
  category: string;
  slug: string;
  thumbnailUrl?: string;
}

interface PortfolioCardProps {
  project: Project;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ project }) => {
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
      className="relative overflow-hidden rounded-2xl aspect-video cursor-pointer group bg-white/[0.04] border border-white/[0.05]"
      style={{ borderTopColor: 'rgba(255,255,255,0.10)' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: cinematicEasing }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Placeholder thumbnail */}
      <img
        src={project.thumbnailUrl}
        alt={project.title}
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
          {project.category}
        </p>
        <h3 className="text-white font-heading text-lg font-semibold leading-tight">
          {project.title}
        </h3>
      </div>

      {/* Subtle border reveal on hover */}
      <div className="absolute inset-0 rounded-2xl border border-white/0 group-hover:border-white/10 transition-all duration-300 z-40" />
    </motion.div>
  );
};

export default PortfolioCard;

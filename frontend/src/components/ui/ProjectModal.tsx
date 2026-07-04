import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Calendar, Tag } from 'lucide-react';
import { cinematicEasing } from '../../utils/animations';
import { assetUrl } from '../../utils/api';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any | null;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, project }) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.classList.add('lock-scroll');
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('lock-scroll');
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  if (!project) return null;

  const categoryName = project.category ? project.category.name : (project.categoryLegacy || '');

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[100] h-screen w-screen flex items-center justify-center backdrop-blur-sm px-4 sm:px-6"
          style={{ backgroundColor: 'var(--modal-backdrop)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: cinematicEasing }}
            className="liquid-glass border rounded-2xl sm:rounded-3xl max-w-4xl w-full p-0 relative overflow-hidden h-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl overscroll-contain"
            style={{
              backgroundColor: 'var(--modal-bg)',
              borderColor: 'var(--card-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-50 p-2 rounded-full liquid-glass-btn border transition-all cursor-pointer hover:bg-white/10"
              style={{ 
                color: 'var(--text-primary)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderColor: 'rgba(255,255,255,0.1)'
              }}
            >
              <X size={20} />
            </button>

            <div className="overflow-y-auto no-scrollbar overscroll-contain">
              <div className="relative w-full aspect-video bg-black">
                {project.youtubeId ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${project.youtubeId}?autoplay=0`}
                    title={project.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">
                    <img src={assetUrl(project.thumbnailUrl) || "/portfolio.jpeg"} className="w-full h-full object-cover opacity-50" alt="" />
                    <p className="absolute">Video tezliklə əlavə olunacaq</p>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-12">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                  <div className="flex-grow max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-accent/10 text-accent border border-accent/20">
                        {categoryName}
                      </span>
                    </div>
                    
                    <h2 className="font-heading text-2xl md:text-5xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                      {project.title}
                    </h2>
                    
                    <div className="space-y-6">
                      <p className="text-base md:text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {project.description}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-64 flex-shrink-0 space-y-8 pt-2">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Tag size={16} className="text-accent" />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-faint mb-1">Xidmət</p>
                          <p className="text-sm font-medium text-primary">{categoryName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-accent" />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-faint mb-1">İl</p>
                          <p className="text-sm font-medium text-primary">{project.year || '2024'}</p>
                        </div>
                      </div>
                    </div>

                    {project.externalUrl && (
                      <a 
                        href={project.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 border rounded-full font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-all duration-300"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                      >
                        Canlı Bax <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ProjectModal;

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Play } from 'lucide-react';
import { cinematicEasing } from '../../utils/animations';
import { useTheme } from '../../context/ThemeContext';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: any | null;
}

const PackageModal: React.FC<PackageModalProps> = ({ isOpen, onClose, pkg }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

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

  if (!pkg) return null;

  const name = pkg.name;
  const price = pkg.priceLabel || '';
  const description = pkg.description;
  const features = pkg.features || [];

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
            className="max-w-xl w-full p-0 relative overflow-hidden h-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl overscroll-contain premium-glass premium-glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-50 p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer hover:bg-white/10"
              style={{ 
                color: 'var(--text-primary)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderColor: 'rgba(255,255,255,0.1)'
              }}
            >
              <X size={20} />
            </button>

            <div className="overflow-y-auto no-scrollbar p-8 sm:p-10 overscroll-contain">
              <div
                className="relative w-full aspect-video rounded-xl overflow-hidden mb-8 group premium-glass"
              >
                {!pkg.videoSrc || pkg.videoSrc.includes('.mp4') ? (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        background: isDark
                          ? 'linear-gradient(135deg, #1A1A1A, #0A0A0A)'
                          : 'linear-gradient(135deg, #F0F0F0, #E0E0E0)',
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(circle at center, var(--glow-accent) 0%, transparent 50%)`,
                      }}
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center cursor-pointer transition-colors"
                      onClick={(e) => {
                        if (!pkg.youtubeUrl) return;
                        // Extract ID if full URL is provided
                        let videoId = pkg.youtubeUrl;
                        if (pkg.youtubeUrl.includes('v=')) videoId = pkg.youtubeUrl.split('v=')[1].split('&')[0];
                        else if (pkg.youtubeUrl.includes('be/')) videoId = pkg.youtubeUrl.split('be/')[1].split('?')[0];

                        const container = e.currentTarget.parentElement;
                        if (container) {
                          container.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
                        }
                      }}
                    >
                      <div
                        className="backdrop-blur-md border p-4 rounded-full group-hover:scale-110 transition-all duration-300"
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          borderColor: 'var(--border-default)',
                        }}
                      >
                        <Play size={24} className="text-accent group-hover:text-accent transition-colors" fill="currentColor" />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="text-left">
                <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--accent-text)' }}>
                  {name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  {price.includes('/') ? (
                    <>
                      <h2 className="font-heading text-3xl md:text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {price.split('/')[0].trim()}
                      </h2>
                      <span className="text-sm md:text-base font-medium opacity-50" style={{ color: 'var(--text-secondary)' }}>
                        / {price.split('/')[1].trim()}
                      </span>
                    </>
                  ) : (
                    <h2 className="font-heading text-3xl md:text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {price}
                    </h2>
                  )}
                </div>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{description}</p>

                <div className="space-y-4 mb-8">
                  {features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Check size={14} className="flex-shrink-0" style={{ color: 'var(--accent-text)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => window.location.href = '/elaqe'}
                  className="w-full py-4 font-semibold text-sm premium-glass-btn" 
                  style={{ color: 'var(--text-primary)' }}
                >
                  {pkg.buttonText || "Planı Seç"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default PackageModal;

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Play } from 'lucide-react';
import { packages } from '../../data/packages';
import { cinematicEasing } from '../../utils/animations';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: (typeof packages)[0] | null;
}

const PackageModal: React.FC<PackageModalProps> = ({ isOpen, onClose, pkg }) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  if (!pkg) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[100] h-screen w-screen flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: cinematicEasing }}
            className="bg-[rgba(18,18,18,0.95)] backdrop-blur-2xl border border-white/[0.07] rounded-3xl max-w-xl w-full p-10 relative overflow-y-auto no-scrollbar max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Video section (YouTube Facade) */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.05] mb-8 group">
              {!pkg.videoSrc || pkg.videoSrc.includes('.mp4') ? (
                // Facade state
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(163,230,53,0.15)_0%,transparent_50%)]" />
                  
                  <div className="absolute inset-0 flex items-center justify-center cursor-pointer transition-colors"
                    onClick={(e) => {
                      const container = e.currentTarget.parentElement;
                      if (container) {
                        container.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
                      }
                    }}
                  >
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-full group-hover:scale-110 group-hover:bg-white/10 group-hover:border-accent/30 transition-all duration-300">
                      <Play size={24} className="text-white/90 group-hover:text-accent transition-colors" fill="currentColor" />
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Content */}
            <div className="text-left">
              <p className="text-accent text-xs uppercase tracking-widest font-medium mb-2">
                {pkg.name}
              </p>
              <h2 className="font-heading text-4xl font-bold text-white mb-1">
                {pkg.price}
                {pkg.period && <span className="text-white/40 text-lg font-normal ml-2">{pkg.period}</span>}
              </h2>
              <p className="text-white/50 text-sm mb-6">{pkg.tagline}</p>
              <p className="text-white/60 text-sm leading-relaxed mb-8">
                {pkg.desc}
              </p>

              {/* Features list */}
              <div className="space-y-4 mb-8">
                {pkg.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check size={14} className="text-accent flex-shrink-0" />
                    <span className="text-white/70 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <button className="w-full py-4 bg-accent text-black font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200">
                {pkg.cta}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default PackageModal;

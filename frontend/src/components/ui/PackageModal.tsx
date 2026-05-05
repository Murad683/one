import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { packages } from '../../data/packages';
import { cinematicEasing } from '../../utils/animations';
import { useTheme } from '../../context/ThemeContext';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: (typeof packages)[0] | null;
}

const PackageModal: React.FC<PackageModalProps> = ({ isOpen, onClose, pkg }) => {
  const { t } = useTranslation();
  const backdropRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

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
          className="fixed inset-0 z-[100] h-screen w-screen flex items-center justify-center backdrop-blur-sm px-0 sm:px-6"
          style={{ backgroundColor: 'var(--modal-backdrop)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: cinematicEasing }}
            className="backdrop-blur-2xl border rounded-none sm:rounded-3xl max-w-xl w-full p-8 sm:p-10 relative overflow-y-auto no-scrollbar h-full sm:h-auto sm:max-h-[85vh]"
            style={{
              backgroundColor: 'var(--modal-bg)',
              borderColor: 'var(--card-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 transition-colors cursor-pointer hover:opacity-70"
              style={{ color: 'var(--text-faint)' }}
            >
              <X size={18} />
            </button>

            {/* Video section (YouTube Facade) */}
            <div
              className="relative w-full aspect-video rounded-xl overflow-hidden border mb-8 group"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
              }}
            >
              {!pkg.videoSrc || pkg.videoSrc.includes('.mp4') ? (
                // Facade state
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
                      const container = e.currentTarget.parentElement;
                      if (container) {
                        container.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
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

            {/* Content */}
            <div className="text-left">
              <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--accent-text)' }}>
                {t(pkg.nameKey)}
              </p>
              <h2 className="font-heading text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {pkg.priceKey ? t(pkg.priceKey) : pkg.price}
                {pkg.periodKey && <span className="text-lg font-normal ml-2" style={{ color: 'var(--text-faint)' }}>{t(pkg.periodKey)}</span>}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t(pkg.taglineKey)}</p>
              <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
                {t(pkg.descKey)}
              </p>

              {/* Features list */}
              <div className="space-y-4 mb-8">
                {pkg.featuresKeys.map((featureKey, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check size={14} className="flex-shrink-0" style={{ color: 'var(--accent-text)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t(featureKey)}</span>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <button className="w-full py-4 bg-accent font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200" style={{ color: 'var(--accent-on-accent)' }}>
                {t(pkg.ctaKey)}
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

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { packages } from '../../data/packages';
import PackageModal from '../ui/PackageModal';
import { cockpitContainer, cockpitItem } from '../../utils/animations';

const PricingCard = ({ pkg, openModal }: { pkg: typeof packages[number], openModal: (pkg: typeof packages[number]) => void }) => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      variants={cockpitItem}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 0 40px var(--glow-accent-subtle)',
      }}
      onClick={() => openModal(pkg)}
      className={`backdrop-blur-md rounded-3xl p-8 flex flex-col cursor-pointer border transition-colors duration-300 relative overflow-hidden h-full ${
        pkg.recommended ? 'pt-10' : ''
      }`}
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: pkg.recommended ? 'var(--accent-text)' : 'var(--card-border)',
        borderTopColor: pkg.recommended ? 'var(--accent-text)' : 'var(--card-border-top)',
        borderWidth: pkg.recommended ? '1.5px' : '1px',
      }}
    >
      {/* Spotlight glow effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, var(--glow-accent), transparent 40%)`,
        }}
      />

      {pkg.recommended && (
        <div
          className="absolute -top-px right-6 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black rounded-b-xl z-20"
          style={{
            background: 'linear-gradient(135deg, #A3E635 0%, #84cc16 100%)',
            boxShadow: '0 4px 20px rgba(163, 230, 53, 0.45), 0 2px 8px rgba(163, 230, 53, 0.3)',
          }}
        >
          {t('packages_page.popular_badge')}
        </div>
      )}

      <div className="flex flex-col h-full relative z-10">
        {/* ── TOP: centered block ── */}
        <div className="text-center mb-8">
          {/* Package name */}
          <p className="text-xs uppercase tracking-[0.2em] font-medium mb-5" style={{ color: 'var(--text-faint)' }}>
            {t(pkg.nameKey)}
          </p>

          {/* Price */}
          <div className="flex items-end justify-center gap-1">
            <span 
              className={`font-heading ${
                (pkg.priceKey ? t(pkg.priceKey) : (pkg.price || '')).toString().length > 8 
                  ? 'text-3xl' 
                  : 'text-5xl'
              } font-bold leading-none`} 
              style={{ color: 'var(--text-primary)' }}
            >
              {pkg.priceKey ? t(pkg.priceKey) : pkg.price}
            </span>
            {pkg.periodKey && (
              <span className="text-base font-normal mb-1" style={{ color: 'var(--text-faint)' }}>
                {t(pkg.periodKey)}
              </span>
            )}
          </div>

          {/* Tagline */}
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t(pkg.taglineKey)}
          </p>
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px mb-8" style={{ backgroundColor: 'var(--border-subtle)' }} />

        {/* ── FEATURES: left-aligned list, but the whole block is centered with mx-auto ── */}
        <ul className="space-y-3 mb-10 flex-1 w-fit mx-auto">
          {pkg.featuresKeys.map((featureKey: string, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-text)' }} />
              <span className="text-sm text-left" style={{ color: 'var(--text-secondary)' }}>{t(featureKey)}</span>
            </li>
          ))}
        </ul>

        {/* ── CTA BUTTON ── */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openModal(pkg);
          }}
          className={pkg.recommended
            ? "w-full py-3 bg-accent font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200"
            : "w-full py-3 border text-sm rounded-full transition-all duration-200 hover:opacity-80"
          }
          style={pkg.recommended
            ? { color: 'var(--accent-on-accent)' }
            : { borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
          }
        >
          {t(pkg.ctaKey)}
        </button>
      </div>
    </motion.div>
  );
};

const PricingCards = () => {
  const [selectedPkg, setSelectedPkg] = useState<(typeof packages)[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (pkg: (typeof packages)[0]) => {
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <section className="relative overflow-hidden">
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
      >
        {packages.map((pkg) => (
          <PricingCard key={pkg.id} pkg={pkg} openModal={openModal} />
        ))}
      </motion.div>

      <PackageModal
        isOpen={isModalOpen}
        onClose={closeModal}
        pkg={selectedPkg}
      />
    </section>
  );
};

export default PricingCards;

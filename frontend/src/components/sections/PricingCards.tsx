import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import PackageModal from '../ui/PackageModal';
import { cockpitContainer, cockpitItem } from '../../utils/animations';
import { usePackages } from '../../hooks/useSiteData';

const PricingCard = ({ pkg, openModal }: { pkg: any, openModal: (pkg: any) => void }) => {
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

  const name = pkg.name;
  const price = pkg.priceLabel || '';
  const description = pkg.description;
  const features = pkg.features || [];

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
      className={`p-8 flex flex-col cursor-pointer premium-glass premium-glass-card relative overflow-hidden h-full ${
        pkg.isPopular ? 'pt-10' : ''
      }`}
      style={pkg.isPopular ? { borderColor: 'var(--accent-text)', borderWidth: '1.5px' } : {}}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, var(--glow-accent), transparent 40%)`,
        }}
      />

      {pkg.isPopular && (
        <div
          className="absolute -top-px right-6 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black rounded-b-xl z-20"
          style={{
            background: 'linear-gradient(135deg, #A3E635 0%, #84cc16 100%)',
            boxShadow: '0 4px 20px rgba(163, 230, 53, 0.45), 0 2px 8px rgba(163, 230, 53, 0.3)',
          }}
        >
          ƏN POPULYAR
        </div>
      )}

      <div className="flex flex-col h-full relative z-10">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] font-medium mb-5" style={{ color: 'var(--text-faint)' }}>
            {name}
          </p>

          <div className="flex items-baseline justify-center gap-1 h-14">
            {price.includes('/') ? (
              <>
                <span className="font-heading text-4xl sm:text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {price.split('/')[0].trim()}
                </span>
                <span className="text-sm font-medium opacity-50" style={{ color: 'var(--text-secondary)' }}>
                  / {price.split('/')[1].trim()}
                </span>
              </>
            ) : (
              <span className="font-heading text-4xl sm:text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {price}
              </span>
            )}
          </div>

          <div className="min-h-[3rem] flex items-center justify-center">
            <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          </div>
        </div>

        <div className="h-px mb-8" style={{ backgroundColor: 'var(--border-subtle)' }} />

        <ul className="space-y-3 mb-10 flex-1 w-fit mx-auto">
          {features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-text)' }} />
              <span className="text-sm text-left" style={{ color: 'var(--text-secondary)' }}>{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={(e) => {
            e.stopPropagation();
            openModal(pkg);
          }}
          className={pkg.isPopular
            ? "w-full py-3 font-semibold text-sm premium-glass-btn"
            : "w-full py-3 text-sm premium-glass-btn"
          }
          style={pkg.isPopular
            ? { color: 'var(--text-primary)' }
            : { color: 'var(--text-secondary)' }
          }
        >
          {pkg.buttonText || "Planı Seç"}
        </button>
      </div>
    </motion.div>
  );
};

const PricingCards = () => {
  const { data: packages, loading } = usePackages();
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (pkg: any) => {
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (loading) return null;

  return (
    <section className="relative overflow-hidden">
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
      >
        {packages.map((pkg: any) => (
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

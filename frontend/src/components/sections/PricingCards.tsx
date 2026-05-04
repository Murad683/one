import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { packages } from '../../data/packages';
import PackageModal from '../ui/PackageModal';
import { cockpitContainer, cockpitItem } from '../../utils/animations';

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

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      variants={cockpitItem}
      whileHover={{
        scale: 1.02,
        borderColor: pkg.recommended ? 'rgba(163,230,53,0.35)' : 'rgba(163,230,53,0.15)',
        boxShadow: '0 0 40px rgba(163,230,53,0.07)',
      }}
      onClick={() => openModal(pkg)}
      className={`bg-white/[0.03] backdrop-blur-md rounded-3xl p-8 flex flex-col cursor-pointer border transition-colors relative overflow-hidden h-full ${
        pkg.recommended ? 'border-accent/30 pt-10' : 'border-white/[0.05]'
      }`}
      style={{ borderTopColor: 'rgba(255,255,255,0.10)' }}
    >
      {/* Spotlight glow effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(163, 230, 53, 0.15), transparent 40%)`,
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
          Ən Populyar
        </div>
      )}

      <div className="flex flex-col h-full relative z-10">
        {/* ── TOP: centered block ── */}
        <div className="text-center mb-8">
          {/* Package name */}
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-medium mb-5">
            {pkg.name}
          </p>

          {/* Price */}
          <div className="flex items-end justify-center gap-1">
            <span className="font-heading text-5xl font-bold text-white leading-none">
              {pkg.price}
            </span>
            {pkg.period && (
              <span className="text-white/40 text-base font-normal mb-1">
                {pkg.period}
              </span>
            )}
          </div>

          {/* Tagline */}
          <p className="text-white/50 text-sm mt-3 leading-relaxed">
            {pkg.tagline}
          </p>
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-white/[0.06] mb-8" />

        {/* ── FEATURES: left-aligned list, but the whole block is centered with mx-auto ── */}
        <ul className="space-y-3 mb-10 flex-1 w-fit mx-auto">
          {pkg.features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <Check size={13} className="text-accent mt-0.5 flex-shrink-0" />
              <span className="text-white/60 text-sm text-left">{feature}</span>
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
            ? "w-full py-3 bg-accent text-black font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200"
            : "w-full py-3 border border-white/10 text-white/70 text-sm rounded-full hover:border-accent/30 hover:text-white transition-all duration-200"
          }
        >
          {pkg.cta}
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
    <section className="relative">
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

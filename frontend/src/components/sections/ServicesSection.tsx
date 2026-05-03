import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { services } from '../../data/services';
import { cockpitContainer, cockpitItem } from '../../utils/animations';

const ServiceCard = ({ service }: { service: any }) => {
  const IconComponent = (LucideIcons as any)[service.icon];
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
      variants={cockpitItem}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{
        scale: 1.01,
        borderColor: 'rgba(163,230,53,0.2)',
        boxShadow: '0 0 30px rgba(163,230,53,0.06)',
      }}
      className="relative bg-white/[0.03] backdrop-blur-md border border-white/[0.05] rounded-2xl p-8 cursor-default overflow-hidden group"
      style={{ borderTopColor: 'rgba(255,255,255,0.10)' }}
    >
      {/* Spotlight glow effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(163, 230, 53, 0.15), transparent 40%)`,
        }}
      />
      
      {/* Content wrapper to stay above the glow */}
      <div className="relative z-10">
        {IconComponent && (
          <IconComponent className="w-8 h-8 text-accent mb-6" />
        )}
        <h3 className="font-heading text-lg font-semibold text-white mb-3">
          {service.title}
        </h3>
        <p className="text-white/50 text-sm leading-relaxed">
          {service.desc}
        </p>
      </div>
    </motion.div>
  );
};

const ServicesSection = () => {
  return (
    <section className="py-32 px-6 md:px-16 bg-carbon">
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-20">
          <motion.p variants={cockpitItem} className="text-accent text-xs uppercase tracking-widest font-medium mb-4">
            Xidmətlərimiz
          </motion.p>
          <motion.h2 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-semibold text-white">
            Biz nə edirik
          </motion.h2>
        </div>

        <motion.div
          variants={cockpitItem}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {services.map((service, index) => (
            <ServiceCard key={index} service={service} />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default ServicesSection;

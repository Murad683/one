import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { cockpitContainer, cockpitItem } from '../../utils/animations';
import { useServices, useSiteSettings } from '../../hooks/useSiteData';

const ServiceCard = ({ service }: { service: any }) => {
  const IconComponent = (LucideIcons as any)[service.iconName || 'Wrench'];
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
        boxShadow: '0 0 30px var(--glow-accent-subtle)',
      }}
      className="relative md:backdrop-blur-md rounded-2xl p-8 cursor-default overflow-hidden group transition-colors duration-300"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderWidth: '1px',
        borderColor: 'var(--card-border)',
        borderTopColor: 'var(--card-border-top)',
      }}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, var(--glow-accent), transparent 40%)`,
        }}
      />
      
      <div className="relative z-10">
        {IconComponent && (
          <IconComponent className="w-8 h-8 mb-6" style={{ color: 'var(--accent-text)' }} />
        )}
        <h3 className="font-heading text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {service.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {service.description}
        </p>
      </div>
    </motion.div>
  );
};

const ServicesSection = () => {
  const { data: services, loading: servicesLoading } = useServices();
  const { data: settings, loading: settingsLoading } = useSiteSettings();

  if (servicesLoading || settingsLoading) return null;

  return (
    <section className="py-32 px-6 md:px-16 overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-20">
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            {settings?.servicesTopLabel || "Xidmətlərimiz"}
          </motion.p>
          <motion.h2 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {settings?.servicesMainHeading || "Biz nə edirik"}
          </motion.h2>
        </div>

        <motion.div
          variants={cockpitItem}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {services.map((service, index) => (
            <ServiceCard key={service.id || index} service={service} />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default ServicesSection;

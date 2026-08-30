import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useSiteSettings } from '../../hooks/useSiteData';

const MarqueeBanner = () => {
  const { data: settings, loading } = useSiteSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  // Only run the infinite scroll while the banner is actually on screen.
  // Off-screen it would keep taxing the compositor for nothing.
  const inView = useInView(containerRef, { margin: '200px 0px' });

  if (loading || !settings) return <div className="h-40" />;

  let words = [];
  try {
    words = typeof settings.marqueeWords === 'string' ? JSON.parse(settings.marqueeWords) : (settings.marqueeWords || []);
  } catch (e) {
    words = [];
  }

  const text = words.length > 0 ? words.join('  ✦  ') + '  ✦  ' : '';

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden py-12 relative flex items-center transition-colors duration-300"
      style={{
        backgroundColor: 'transparent',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <motion.div
        className="flex whitespace-nowrap"
        animate={inView ? { x: ["0%", "-50%"] } : { x: "0%" }}
        transition={inView ? { ease: "linear", duration: 30, repeat: Infinity } : { duration: 0 }}
      >
        <div className="flex whitespace-nowrap">
          <span className="font-heading text-7xl font-black tracking-widest px-4 uppercase" style={{ color: 'var(--text-ghost)' }}>
            {text}
          </span>
          <span className="font-heading text-7xl font-black tracking-widest px-4 uppercase" style={{ color: 'var(--text-ghost)' }}>
            {text}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default MarqueeBanner;

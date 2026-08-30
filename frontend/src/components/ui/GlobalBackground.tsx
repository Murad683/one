import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

const GlobalBackground = () => {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // A tiny slower-than-content drift over the whole page. Imperceptible frame
  // to frame, but it gives the scroll a motion reference so the lower
  // (transparent-background) sections don't feel like they fly past a frozen
  // image. Headroom comes from the -inset-y below.
  const bgYRaw = useTransform(scrollYProgress, [0, 1], [0, -48]);
  const bgY = reduceMotion ? 0 : bgYRaw;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base Background Image Layer */}
      <motion.div
        className="absolute -inset-y-24 inset-x-0 z-[-2] transition-all duration-700 will-change-transform"
        style={{
          backgroundImage: 'var(--bg-image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.6,
          y: bgY,
        }}
      />
      
      {/* Subtle Overlay to ensure readability */}
      <div className="absolute inset-0 z-[-1]" style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.4 }} />

      <motion.div
        animate={{
          x: [0, 40, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[40px] md:blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(163, 230, 53, 0.04) 0%, rgba(163, 230, 53, 0) 70%)',
        }}
      />
      <motion.div
        animate={{
          x: [0, -30, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[60px] md:blur-[140px]"
        style={{
          background: 'radial-gradient(circle, rgba(100, 50, 200, 0.03) 0%, rgba(100, 50, 200, 0) 70%)',
        }}
      />
    </div>
  );
};

export default GlobalBackground;

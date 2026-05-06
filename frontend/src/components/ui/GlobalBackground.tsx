import { motion } from 'framer-motion';

const GlobalBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base Background Image Layer */}
      <div 
        className="absolute inset-0 z-[-2] transition-all duration-700"
        style={{ 
          backgroundImage: 'var(--bg-image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.6
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

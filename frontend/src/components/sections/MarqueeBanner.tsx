import { motion } from 'framer-motion';

const MarqueeBanner = () => {
  const text = "REELS  ✦  GRAPHIC DESIGN  ✦  BRAND STRATEGY  ✦  CONTENT CREATION  ✦  ANALYTICS  ✦  COMMUNITY  ✦  ";

  return (
    <div className="w-full overflow-hidden bg-carbon py-12 relative flex items-center border-y border-white/[0.02]">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ ease: "linear", duration: 30, repeat: Infinity }}
      >
        <div className="flex whitespace-nowrap">
          <span className="font-heading text-7xl font-black tracking-widest text-white/[0.04] px-4">
            {text}
          </span>
          <span className="font-heading text-7xl font-black tracking-widest text-white/[0.04] px-4">
            {text}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default MarqueeBanner;

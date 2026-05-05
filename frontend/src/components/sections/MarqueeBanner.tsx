import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const MarqueeBanner = () => {
  const { t } = useTranslation();
  const text = t('marquee.text');

  return (
    <div
      className="w-full overflow-hidden py-12 relative flex items-center transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ ease: "linear", duration: 30, repeat: Infinity }}
      >
        <div className="flex whitespace-nowrap">
          <span className="font-heading text-7xl font-black tracking-widest px-4" style={{ color: 'var(--text-ghost)' }}>
            {text}
          </span>
          <span className="font-heading text-7xl font-black tracking-widest px-4" style={{ color: 'var(--text-ghost)' }}>
            {text}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default MarqueeBanner;

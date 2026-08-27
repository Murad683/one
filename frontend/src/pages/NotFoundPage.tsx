import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const NotFoundPage = () => {
  const { isDark } = useTheme();

  return (
    <section
      className="min-h-screen relative flex items-center justify-center text-center px-6 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* soft vignette, same language as the hero overlays */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 50% 40%, rgba(163,230,53,0.06), transparent 60%)'
            : 'radial-gradient(circle at 50% 40%, rgba(0,0,0,0.04), transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center max-w-xl"
      >
        <p
          className="text-xs font-medium uppercase tracking-[0.3em] mb-6"
          style={{ color: 'var(--accent-text)' }}
        >
          Səhv 404
        </p>

        <h1
          className="font-heading text-7xl sm:text-8xl md:text-9xl font-medium leading-none mb-6 select-none"
          style={{ color: 'var(--text-primary)' }}
        >
          404
        </h1>

        <p
          className="font-heading text-xl sm:text-2xl font-medium mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          Bu kadr final montaja düşməyib.
        </p>
        <p
          className="text-sm md:text-base font-light leading-relaxed mb-10"
          style={{ color: 'var(--text-muted)' }}
        >
          Axtardığınız səhifə mövcud deyil və ya başqa ünvana köçüb.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 border liquid-glass-btn font-semibold text-sm rounded-full transition-all duration-200 hover:scale-[1.02] hover:bg-white/5"
          style={{ color: 'var(--accent-text)', borderColor: 'var(--border-default)' }}
        >
          ← Ana səhifəyə qayıt
        </Link>
      </motion.div>
    </section>
  );
};

export default NotFoundPage;

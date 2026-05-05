import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cockpitContainer, cockpitItem } from '../../utils/animations';
import { useTheme } from '../../context/ThemeContext';

const HeroSection = () => {
  const { t } = useTranslation();
  const { scrollY } = useScroll();
  const { isDark } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Force muted state before calling play
      videoRef.current.muted = true;
      videoRef.current.play().catch(error => {
        console.error("Autoplay was prevented:", error);
      });
    }
  }, []);

  // Parallax: scroll video down slower than page (moves up visually relative to page, creating parallax)
  const y = useTransform(scrollY, [0, 800], [0, 200]);

  // On-scroll blur and fade out
  const filter = useTransform(scrollY, [0, 600], ["blur(0px)", "blur(24px)"]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0.2]);

  return (
    <section className="min-h-screen relative flex items-center justify-center text-center px-6 overflow-hidden">
      {/* Background video container with parallax, blur, and opacity */}
      <motion.div
        style={{ y, filter, opacity }}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none scale-110" // scale up slightly to prevent parallax revealing edges
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      </motion.div>

      {/* Protective Top Gradient Mask for Navbar Readability */}
      <div
        className="absolute top-0 inset-x-0 h-40 z-10 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.90), rgba(0,0,0,0.40), transparent)'
            : 'linear-gradient(to bottom, rgba(248,248,248,0.95), rgba(248,248,248,0.50), transparent)',
        }}
      />

      {/* Darker overlay to keep it moody and ensure text readability */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.50), rgba(0,0,0,0.60), var(--bg-primary))'
            : 'linear-gradient(to bottom, rgba(248,248,248,0.50), rgba(248,248,248,0.70), var(--bg-primary))',
        }}
      />

      {/* Content */}
      <motion.div
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="relative z-20 flex flex-col items-center max-w-4xl"
      >
        <motion.p
          variants={cockpitItem}
          className="text-xs font-medium uppercase tracking-[0.2em] mb-6"
          style={{ color: 'var(--accent-text)' }}
        >
          {t('hero.badge')}
        </motion.p>

        <motion.h1
          variants={cockpitItem}
          className="flex flex-col gap-2 mb-8 px-4"
        >
          <span className="font-heading text-4xl sm:text-6xl md:text-8xl font-medium leading-[1.1] md:leading-[1.0]" style={{ color: 'var(--text-primary)' }}>{t('hero.title_line1')}</span>
          <span className="font-heading text-4xl sm:text-6xl md:text-8xl font-medium leading-[1.1] md:leading-[1.0]" style={{ color: 'var(--text-primary)' }}>{t('hero.title_line2')}</span>
        </motion.h1>

        <motion.p
          variants={cockpitItem}
          className="text-base md:text-xl font-light max-w-xl mx-auto mb-10 md:mb-12 leading-relaxed px-6"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.div variants={cockpitItem}>
          <Link
            to="/paketler"
            className="inline-flex items-center gap-2 px-10 py-5 bg-accent font-semibold text-base rounded-full hover:bg-accent/90 transition-all duration-200 hover:scale-[1.02]"
            style={{ color: 'var(--accent-on-accent)' }}
          >
            {t('hero.cta')}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;

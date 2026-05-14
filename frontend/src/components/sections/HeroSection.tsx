import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cockpitContainer, cockpitItem } from '../../utils/animations';
import { useTheme } from '../../context/ThemeContext';
import { useSiteSettings } from '../../hooks/useSiteData';
import { assetUrl } from '../../utils/api';

const HeroSection = () => {
  const { data: settings, loading } = useSiteSettings();
  const { scrollY } = useScroll();
  const { isDark } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(error => {
        console.error("Autoplay was prevented:", error);
      });
    }
  }, [settings]);

  const y = useTransform(scrollY, [0, 800], [0, 200]);
  const filter = useTransform(scrollY, [0, 600], ["blur(0px)", "blur(24px)"]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0.2]);

  if (loading || !settings) return <section className="min-h-screen bg-transparent" />;

  return (
    <section className="min-h-screen relative flex items-center justify-center text-center px-6 overflow-hidden">
      <motion.div
        style={{ y, filter, opacity }}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none scale-110 will-change-transform"
      >
        {settings.heroVideoUrl && settings.heroVideoUrl.match(/\.(mp4|webm|ogg)$|video/i) ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            key={settings.heroVideoUrl}
            className="w-full h-full object-cover brightness-90 contrast-[1.1]"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <source src={assetUrl(settings.heroVideoUrl)} type="video/mp4" />
          </video>
        ) : settings.heroVideoUrl ? (
          <motion.img 
            src={assetUrl(settings.heroVideoUrl)} 
            alt="Hero Background"
            className="w-full h-full object-cover brightness-90 contrast-[1.1]"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover brightness-90 contrast-[1.1]"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>

      <div
        className="absolute top-0 inset-x-0 h-40 z-10 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.90), rgba(0,0,0,0.40), transparent)'
            : 'linear-gradient(to bottom, rgba(248,248,248,0.40), rgba(248,248,248,0.20), transparent)',
        }}
      />

      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, var(--overlay-hero-from), var(--overlay-hero-via), var(--bg-primary))',
        }}
      />

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
          {settings.heroBadge}
        </motion.p>

        <motion.h1
          variants={cockpitItem}
          className="flex flex-col gap-2 mb-8 px-4"
        >
          <span className="font-heading text-4xl sm:text-6xl md:text-8xl font-medium leading-[1.1] md:leading-[1.0] drop-shadow-sm" style={{ color: 'var(--text-primary)' }}>
            {settings.heroHeading1}
          </span>
          <span className="font-heading text-4xl sm:text-6xl md:text-8xl font-medium leading-[1.1] md:leading-[1.0] drop-shadow-sm" style={{ color: 'var(--text-primary)' }}>
            {settings.heroHeading2}
          </span>
        </motion.h1>

        <motion.p
          variants={cockpitItem}
          className="text-base md:text-xl font-light max-w-xl mx-auto mb-10 md:mb-12 leading-relaxed px-6"
          style={{ color: 'var(--text-muted)' }}
        >
          {settings.heroSubtext}
        </motion.p>

        <motion.div variants={cockpitItem}>
          <Link
            to={settings.heroCtaUrl || "/paketler"}
            className="inline-flex items-center gap-2 px-7 py-3.5 md:px-10 md:py-5 bg-accent font-semibold text-sm md:text-base rounded-full hover:bg-accent/90 transition-all duration-200 hover:scale-[1.02]"
            style={{ color: 'var(--accent-on-accent)' }}
          >
            {settings.heroCtaText || "Xidmətlərimizə Bax →"}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;

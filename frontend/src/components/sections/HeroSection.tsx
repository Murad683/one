import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cockpitContainer, cockpitItem } from '../../utils/animations';

const HeroSection = () => {
  const { scrollY } = useScroll();

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
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover bg-[#0A0A0A]"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      </motion.div>

      {/* Protective Top Gradient Mask for Navbar Readability */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

      {/* Darker overlay to keep it moody and ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-carbon z-10 pointer-events-none" />

      {/* Content */}
      <motion.div
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="relative z-20 flex flex-col items-center max-w-4xl"
      >
        <motion.p
          variants={cockpitItem}
          className="text-accent text-xs font-medium uppercase tracking-[0.2em] mb-6"
        >
          Rəqəmsal İnkişaf Şirkəti
        </motion.p>

        <motion.h1
          variants={cockpitItem}
          className="flex flex-col gap-2 mb-8"
        >
          <span className="font-heading text-7xl md:text-8xl font-medium text-white leading-[1.0]">Brendinizi</span>
          <span className="font-heading text-7xl md:text-8xl font-medium text-white leading-[1.0]">Gələcəyə Daşıyırıq</span>
        </motion.h1>

        <motion.p
          variants={cockpitItem}
          className="text-white/50 text-lg md:text-xl font-light max-w-xl mx-auto mb-12 leading-relaxed"
        >
          Strateji kreativ həllər, premium video istehsalı və rəqəmsal marketinq xidmətləri.
        </motion.p>

        <motion.div variants={cockpitItem}>
          <Link
            to="/paketler"
            className="inline-flex items-center gap-2 px-10 py-5 bg-accent text-black font-semibold text-base rounded-full hover:bg-accent/90 transition-all duration-200 hover:scale-[1.02]"
          >
            Xidmətlərimizə Bax →
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;

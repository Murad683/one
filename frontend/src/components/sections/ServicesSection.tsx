import { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { cockpitItem } from '../../utils/animations';
import { gsap, ScrollTrigger } from '../../utils/gsap';
import ServiceCard from '../ui/ServiceCard';
import { useServices, useSiteSettings } from '../../hooks/useSiteData';

// Two independent scroll systems that must NEVER share an ancestor chain:
// a Framer Motion "rise into place" entrance (y + scale, scroll-linked, same
// pattern as IntroRiseSection.tsx/Footer.tsx) and a GSAP ScrollTrigger pin
// (same proven scaffold as FeaturedPortfolioSection.tsx) driving the
// card stack. An earlier version put `pinRef` INSIDE the
// Framer-transformed node — that broke ScrollTrigger's pin math, because its
// `start: 'top top'` is measured once (on mount/refresh) from `pinRef`'s
// document position, but a `refresh()` can fire at any scroll position
// (mount timers, window resize, Lenis's own refresh schedule in
// useSmoothScroll.ts) while the ancestor's y/scale transform is still
// mid-rise — baking in a stale offset that doesn't match where `pinRef`
// actually sits once the user scrolls there, producing a visible
// jump-then-hard-pin the moment ScrollTrigger's stale threshold is reached.
//
// Fix: split into two siblings under `riseRef` (which needs `relative` for
// this). `.rise-bg` is purely decorative (cream panel + rounded corners +
// the y/scale transform) and contains no content — GSAP never measures it.
// The content layer (label + pin + cards) carries NO transform, only an
// opacity fade tied to the same scrollYProgress, so it materializes in sync
// with the rising panel without ever moving `pinRef`'s document geometry.
//
// The top label lives INSIDE `pinRef`, above `.stack-3d`, not outside it —
// once GSAP pins that div, everything inside it (including the label) stays
// fixed on screen for the whole scroll-through, instead of scrolling away
// with the rest of the page before the card animation even starts.
const ServicesSection = () => {
  const { data: services, loading: servicesLoading } = useServices();
  const { data: settings, loading: settingsLoading } = useSiteSettings();

  const riseRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const reduceMotionFM = useReducedMotion();
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { scrollYProgress } = useScroll({
    target: riseRef,
    offset: ['start end', 'start start'],
  });
  const yRaw = useTransform(scrollYProgress, [0, 1], ['16%', '0%']);
  const scaleRaw = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const opacityRaw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = reduceMotionFM ? '0%' : yRaw;
  const scale = reduceMotionFM ? 1 : scaleRaw;
  const opacity = reduceMotionFM ? 1 : opacityRaw;

  useEffect(() => {
    if (!pinRef.current || !services || services.length === 0 || reduceMotion) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.paper-card');
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: 'top top',
          end: () => '+=' + window.innerHeight * (cards.length - 0.3),
          // `true` instead of a numeric lag: Lenis already smooths/inerts the
          // scroll input (see useSmoothScroll.ts's syncTouch), so a second,
          // independent lag layer here was fighting it — mid-transition, a
          // new touch would interrupt Lenis's coast while this scrub was
          // still easing toward the old target, and the two catching up at
          // different rates read as a jump right at the Services→Portfolio
          // boundary.
          scrub: true,
          pin: pinRef.current,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      cards.forEach((card, i) => {
        if (i === 0) return;
        tl.fromTo(
          card,
          { y: '12%', scale: 0.96, opacity: 0 },
          { y: '0%', scale: 1, opacity: 1, ease: 'none' },
          i - 1
        );
        tl.to(
          cards[i - 1],
          { y: '-6%', scale: 0.94, opacity: 0, ease: 'none' },
          i - 1
        );
      });
    }, pinRef);

    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
    };
  }, [services, reduceMotion]);

  const loading = servicesLoading || settingsLoading;
  const label = settings?.servicesTopLabel || 'Xidmətlərimiz';

  return (
    <section className="pt-32 transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      <div ref={riseRef} className="relative">
        <motion.div
          aria-hidden
          style={{ y, scale, backgroundColor: 'var(--bg-primary)' }}
          className="rise-bg absolute inset-0 rounded-t-[3rem] md:rounded-t-[4rem] overflow-hidden pointer-events-none"
        />
        <motion.div
          style={{ opacity }}
          className="relative rounded-t-[3rem] md:rounded-t-[4rem] overflow-hidden"
        >
          {loading || !services || services.length === 0 ? (
            <div className="min-h-dvh" />
          ) : reduceMotion ? (
            <div className="max-w-5xl mx-auto px-6 md:px-16 pt-16 pb-16">
              <motion.span
                variants={cockpitItem}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-10%' }}
                className="inline-block px-4 py-1.5 mb-10 md:mb-12 rounded-full text-xs uppercase tracking-widest font-medium border"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}
              >
                {label}
              </motion.span>
              {services.map((service: any, index: number) => (
                <ServiceCard
                  key={service.id || index}
                  service={service}
                  index={index}
                  total={services.length}
                  isStatic
                />
              ))}
            </div>
          ) : (
            <div ref={pinRef} className="min-h-screen flex items-center overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 md:px-16 w-full pt-16">
                <motion.span
                  variants={cockpitItem}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-10%' }}
                  className="inline-block px-4 py-1.5 mb-8 md:mb-10 rounded-full text-xs uppercase tracking-widest font-medium border"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}
                >
                  {label}
                </motion.span>
                <div className="stack-3d relative h-[min(60vh,440px)] md:h-[min(55vh,500px)]">
                  {services.map((service: any, index: number) => (
                    <ServiceCard
                      key={service.id || index}
                      service={service}
                      index={index}
                      total={services.length}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;

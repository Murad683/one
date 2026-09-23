import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useSiteSettings } from '../../hooks/useSiteData';

// Reuses clou.ch's own trick, without their GSAP dependency: as this section
// scrolls into view, it rises (y) and scales up into place. No pinning — it's
// a one-time entrance, not a scroll-through effect. Always dark, regardless
// of site theme, so it reads as a deliberate panel over the hero rather than
// just "the next section".
const IntroRiseSection = () => {
  const { data: settings, loading } = useSiteSettings();
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start start'],
  });

  const yRaw = useTransform(scrollYProgress, [0, 1], ['16%', '0%']);
  const scaleRaw = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const y = reduceMotion ? '0%' : yRaw;
  const scale = reduceMotion ? 1 : scaleRaw;

  // The ref div must mount on the very first render, loading or not — useScroll
  // captures `ref.current` when its effect first runs, and a ref that only
  // attaches later (once data arrives and this used to return null) never gets
  // picked up, leaving scrollYProgress stuck and the scale/y transforms inert.
  if (loading || !settings) {
    return (
      <div ref={ref}>
        <div className="min-h-screen rounded-t-[2rem] md:rounded-t-[2.5rem]" style={{ backgroundColor: '#101114' }} />
      </div>
    );
  }

  const firstParagraph = (settings.aboutDescription || '').split('\n\n')[0];

  let stats: any[] = [];
  try {
    stats = typeof settings.aboutStats === 'string' ? JSON.parse(settings.aboutStats) : (settings.aboutStats || []);
  } catch (e) {
    stats = [];
  }

  return (
    <div ref={ref}>
      <motion.section
        style={{ y, scale, translateZ: 0, willChange: 'transform', backgroundColor: '#101114' }}
        className="min-h-screen rounded-t-[2rem] md:rounded-t-[2.5rem] px-6 md:px-16 pt-28 pb-24 flex flex-col justify-between"
      >
        <div>
          {settings.aboutTopLabel && (
            <span
              className="inline-block px-4 py-1.5 mb-6 rounded-full text-xs uppercase tracking-widest font-medium border"
              style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.15)' }}
            >
              {settings.aboutTopLabel}
            </span>
          )}
          <h2
            className="font-heading text-4xl sm:text-5xl md:text-7xl font-medium leading-[1.1] max-w-4xl"
            style={{ color: '#FAFAFA' }}
          >
            {settings.aboutMainHeading}
          </h2>
        </div>

        {stats.length > 0 && (
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 pt-10 md:pt-12"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            {stats.map((stat: any, idx: number) => (
              <div key={idx}>
                <div className="font-heading text-3xl md:text-5xl font-bold" style={{ color: '#FAFAFA' }}>
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm mt-2 uppercase tracking-widest font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        <p
          className="text-base md:text-xl font-light leading-relaxed max-w-md self-start md:self-end text-left md:text-right mt-16"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          {firstParagraph}
        </p>
      </motion.section>
    </div>
  );
};

export default IntroRiseSection;

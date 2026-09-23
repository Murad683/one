import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cockpitContainer, cockpitItem, cinematicEasing } from '../../utils/animations';
import { gsap, ScrollTrigger } from '../../utils/gsap';
import StackedProjectCard from '../ui/StackedProjectCard';
import PortfolioCTACard from '../ui/PortfolioCTACard';
import ProjectModal from '../ui/ProjectModal';
import { useProjects } from '../../hooks/useSiteData';

const FeaturedPortfolioSection = () => {
  const { data: projects, loading: projectsLoading } = useProjects(true);

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const pinRef = useRef<HTMLDivElement>(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { damping: 25, stiffness: 300 });
  const springY = useSpring(cursorY, { damping: 25, stiffness: 300 });

  const handleMouseMove = (e: React.MouseEvent) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
  };

  // GSAP's scroll-pin can carry a card under an already-stationary cursor —
  // the browser still fires a native `mouseenter` even though no `mousemove`
  // ever happened, so `springX`/`springY` would still be sitting wherever
  // they last were (initially (0,0), the viewport's top-left corner) when
  // the pill's opacity flips on, producing a visible flash/jump from the
  // corner. `.jump()` seeds the spring from the hover event's own
  // coordinates instantly, bypassing the spring's travel time, so the pill
  // is already in the right place the first frame it's visible.
  const handleHoverStart = (e: React.MouseEvent, projectId: string) => {
    springX.jump(e.clientX);
    springY.jump(e.clientY);
    setHoveredId(projectId);
  };

  const handleProjectClick = (project: any) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  // leyla's Process.jsx stacking mechanism (GSAP pin + one scrubbed timeline
  // owning both the incoming and outgoing card per step) — ported directly
  // rather than reimplemented, since it's proven working code. Depends on
  // `projects`/`reduceMotion` because the card list loads async and this
  // component renders nothing (ref never attaches) until it's ready.
  useEffect(() => {
    if (!pinRef.current || !projects || projects.length === 0 || reduceMotion) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.stack-card');
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: 'top top',
          end: () => '+=' + window.innerHeight * (cards.length - 0.3),
          // See ServicesSection.tsx — Lenis (syncTouch) already smooths the
          // scroll input, so this shouldn't add its own independent lag.
          scrub: true,
          pin: pinRef.current,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      cards.forEach((card, i) => {
        if (i === 0) return;
        tl.fromTo(card, { yPercent: 110, rotate: 1.4 }, { yPercent: 0, rotate: 0, ease: 'none' }, i - 1);
        tl.to(cards[i - 1], { scale: 0.93, yPercent: -4, opacity: 0.4, ease: 'none' }, i - 1);
      });
    }, pinRef);

    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
    };
  }, [projects, reduceMotion]);

  if (projectsLoading) return <section className="pt-32 min-h-dvh" style={{ backgroundColor: 'transparent' }} />;

  return (
    <section
      className="pt-32 transition-colors duration-300"
      style={{ backgroundColor: 'transparent' }}
      onMouseMove={handleMouseMove}
    >
      <div ref={pinRef} className={reduceMotion ? '' : 'min-h-screen flex items-center'}>
        <div className="max-w-7xl mx-auto px-6 md:px-16 w-full">
          <motion.div
            variants={cockpitContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10%" }}
          >
            <div className="flex justify-between items-center mb-8">
              <motion.span
                variants={cockpitItem}
                className="inline-block px-4 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium border"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}
              >
                Seçilmiş İşlər
              </motion.span>
              <motion.div variants={cockpitItem}>
                <Link
                  to="/portfolio"
                  className="text-sm transition-colors inline-block hover:opacity-80"
                  style={{ color: 'var(--text-faint)' }}
                >
                  Hamısına Bax →
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <div className={reduceMotion ? 'flex flex-col' : 'stack relative h-[min(66vh,460px)] md:h-[min(70vh,560px)]'}>
            {projects.map((project: any, index: number) => (
              <StackedProjectCard
                key={project.id}
                project={project}
                index={index}
                isStatic={reduceMotion}
                onClick={() => handleProjectClick(project)}
                onHoverStart={(e) => handleHoverStart(e, project.id)}
                onHoverEnd={() => setHoveredId((current) => (current === project.id ? null : current))}
              />
            ))}
            <PortfolioCTACard index={projects.length} isStatic={reduceMotion} />
          </div>
        </div>
      </div>

      <motion.div className="fixed top-0 left-0 z-[60] pointer-events-none" style={{ x: springX, y: springY }}>
        <motion.div
          className="flex items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-widest whitespace-nowrap"
          style={{ backgroundColor: 'var(--accent-text)', color: 'var(--accent-on-accent)' }}
          initial={{ opacity: 0, scale: 0.6, x: '-50%', y: '-50%' }}
          animate={{
            opacity: hoveredId ? 1 : 0,
            scale: hoveredId ? 1 : 0.6,
            x: '-50%',
            y: '-50%',
          }}
          transition={{ duration: 0.2, ease: cinematicEasing }}
        >
          Layihəyə Bax
        </motion.div>
      </motion.div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={selectedProject}
      />
    </section>
  );
};

export default FeaturedPortfolioSection;

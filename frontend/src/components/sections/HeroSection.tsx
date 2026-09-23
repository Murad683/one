import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, animate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { cockpitContainer, cockpitItem, letterItem, cardItem } from '../../utils/animations';
import { useSiteSettings, useProjects } from '../../hooks/useSiteData';
import { assetUrl } from '../../utils/api';

// A board wider/taller than the viewport — some cards sit fully inside it,
// some spill past the edges and stay clipped by the section's overflow-hidden
// until the pointer pans the whole board to reveal them. Positions are given
// as board-relative percentages (not viewport ones); see BOARD_SIZE below for
// the conversion. Art-directed, not generated, so nothing collides with the
// wordmark or feels randomly scattered.
const BOARD_SIZE = 140; // % of viewport in each axis
const BOARD_OFFSET = (BOARD_SIZE - 100) / 2; // % — centers the oversized board

// `top` deliberately doesn't ascend slot-by-slot — an earlier version had
// values climbing steadily down the list (28→34→39→53→64→66→68), which
// reads as one neat diagonal cascade rather than a scattered pile. Jumbling
// the order (and mixing rotation signs/magnitudes more) is what actually
// sells "scattered", not the individual positions themselves.
const CARD_SLOTS = [
  { top: 20, left: 20, size: 'w-28 md:w-36', rotate: -12, mobile: true },
  { top: 38, left: 26, size: 'w-24 md:w-32', rotate: 8, mobile: true },
  { top: 16, left: 66, size: 'w-32 md:w-40', rotate: 9, mobile: false },
  { top: 50, left: 16, size: 'w-28 md:w-36', rotate: -4, mobile: false },
  // Kept off the bottom 30% of the board (max top: 63 below) — anything
  // lower sat close enough to the section's own overflow-hidden edge that
  // on shorter/wider viewports it got sliced mid-card, reading as if
  // IntroRiseSection's panel underneath was cutting into it (it wasn't —
  // Hero was clipping its own content, IntroRiseSection just happened to
  // start right after with no visual gap).
  { top: 60, left: 56, size: 'w-28 md:w-32', rotate: -7, mobile: true },
  { top: 58, left: 76, size: 'w-28 md:w-36', rotate: 5, mobile: true },
  { top: 48, left: 78, size: 'w-24 md:w-32', rotate: -6, mobile: false },
];

// Admin-curated "featured" projects come first (quality signal), then the
// most recent other projects fill the rest — so the board stays fresh as
// the portfolio grows without needing every new project marked featured.
// Capped client-side (no backend change): 7 board slots only need a modest
// pool to cycle through without visible repeats, and this bounds how many
// thumbnails the board ever fetches/renders regardless of how large the
// portfolio gets.
const HERO_PROJECT_LIMIT = 10;

const PLACEHOLDER_TILES = [
  { bg: 'linear-gradient(135deg, var(--accent-text), transparent)' },
  { bg: 'linear-gradient(135deg, var(--text-primary), transparent)' },
  { bg: 'linear-gradient(135deg, var(--accent-text), var(--bg-secondary))' },
  { bg: 'linear-gradient(135deg, var(--text-muted), transparent)' },
];

const PAN_RANGE_X = 260; // px the board shifts at full pointer deflection
const PAN_RANGE_Y = 190;

const HeroSection = () => {
  const { data: settings, loading } = useSiteSettings();
  const { data: featuredProjects } = useProjects(true);
  const { data: recentProjects } = useProjects(false);
  const reduceMotion = useReducedMotion();
  // A stale/missing thumbnail shouldn't leave an empty box on the board —
  // fall back to the same placeholder tiles used when there's no project yet.
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  // The whole card board pans opposite the pointer — move right, and the
  // board slides left, pulling the cards that were spilling off the right
  // edge into view. One shared pan, not per-card effects.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 100, damping: 22, mass: 0.5 });
  const springY = useSpring(pointerY, { stiffness: 100, damping: 22, mass: 0.5 });
  const panX = useTransform(springX, (v) => -v * PAN_RANGE_X);
  const panY = useTransform(springY, (v) => -v * PAN_RANGE_Y);

  // The pan reacts to ANY mouse movement across the whole section, including
  // movement while approaching a card — which shifts the board (and the card)
  // out from under the cursor before a click can land, since the cards are
  // small relative to the pan's own range. Freezing the pan while the pointer
  // is over a card (tracked via a ref, not state, so it never re-renders) lets
  // it settle in place long enough to actually click, without touching the
  // panning effect anywhere else on the board.
  const isOverCardRef = useRef(false);

  const handlePointerMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion || isOverCardRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  // Touch devices never fire `onMouseMove`, so the pan (and the sense that
  // the board is alive) never happens there — the board just sits static.
  // On a no-hover device (`matchMedia('(hover: none)')`, the reliable way to
  // detect "no mouse", touch or not), drive the same pointerX/pointerY
  // values that mouse-move normally sets, but with a slow, continuous
  // back-and-forth loop instead — reusing the existing spring→pan pipeline
  // rather than adding a second animation path. Offset durations (10s vs
  // 13s) keep x and y from ever repeating the same combined position, so
  // the drift reads as organic float rather than a mechanical loop. Note
  // for whoever debugs this next: `animate()` (and rAF in general) is
  // paused by the browser while the tab/window is hidden or unfocused —
  // if this looks inert while testing, check `document.hidden` before
  // assuming the effect itself is broken.
  useEffect(() => {
    // Both checks together — a hybrid laptop (touchscreen + trackpad) can
    // report `hover: none` while still being driven by a mouse/trackpad day
    // to day; requiring `pointer: coarse` too keeps the auto-drift strictly
    // to devices with no fine pointer at all, so desktop never gets it.
    const isTouch =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none)').matches &&
      window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch || reduceMotion) return;

    const controlsX = animate(pointerX, [0, 0.3, -0.3, 0], {
      duration: 10,
      repeat: Infinity,
      ease: 'easeInOut',
    });
    const controlsY = animate(pointerY, [0, -0.25, 0.25, 0], {
      duration: 13,
      repeat: Infinity,
      ease: 'easeInOut',
    });

    return () => {
      controlsX.stop();
      controlsY.stop();
    };
  }, [reduceMotion, pointerX, pointerY]);

  if (loading || !settings) return <section className="min-h-dvh bg-transparent" />;

  // Featured first (admin-curated quality signal), then fill the remainder
  // with the most recent other projects, deduped by id, capped at
  // HERO_PROJECT_LIMIT — see the comment above CARD_SLOTS for why.
  const seenIds = new Set<string>();
  const realProjects = [...(featuredProjects || []), ...(recentProjects || [])]
    .filter((p: any) => {
      if (!p.thumbnailUrl || seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    })
    .slice(0, HERO_PROJECT_LIMIT);

  type Card = { type: 'image'; src: string; alt: string } | { type: 'placeholder'; tile: (typeof PLACEHOLDER_TILES)[number] };

  // Cycle through whatever real project images exist (repeating them) rather
  // than falling back to an abstract gradient+icon tile once they run out —
  // a repeated real photo reads better than an empty-feeling placeholder.
  // The gradient tile stays only as the true last-resort (zero real images
  // at all, or an image that 404s at runtime — see brokenImages below).
  const cards: Card[] = CARD_SLOTS.map((_, i) =>
    realProjects.length > 0
      ? {
          type: 'image',
          src: assetUrl(realProjects[i % realProjects.length].thumbnailUrl),
          alt: realProjects[i % realProjects.length].title,
        }
      : { type: 'placeholder', tile: PLACEHOLDER_TILES[i % PLACEHOLDER_TILES.length] },
  );

  return (
    <section
      className="min-h-dvh relative flex flex-col items-center justify-center text-center px-6 overflow-hidden"
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
    >
      <motion.div
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
      >
        {/* Oversized board — panned opposite the pointer so cards spilling
            past the section's edges get pulled into view as you move. */}
        <motion.div
          style={{
            x: panX,
            y: panY,
            width: `${BOARD_SIZE}%`,
            height: `${BOARD_SIZE}%`,
            left: `-${BOARD_OFFSET}%`,
            top: `-${BOARD_OFFSET}%`,
          }}
          className="absolute z-0 pointer-events-none will-change-transform"
        >
          {cards.map((card, i) => (
            <motion.div
              key={i}
              variants={cardItem}
              whileHover={{ scale: 1.15, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onMouseEnter={() => { isOverCardRef.current = true; }}
              onMouseLeave={() => { isOverCardRef.current = false; }}
              style={{ top: `${CARD_SLOTS[i].top}%`, left: `${CARD_SLOTS[i].left}%`, rotate: CARD_SLOTS[i].rotate }}
              className={`absolute pointer-events-auto ${CARD_SLOTS[i].size} ${CARD_SLOTS[i].mobile ? '' : 'hidden md:block'} aspect-[4/5] rounded-2xl overflow-hidden shadow-xl will-change-transform cursor-pointer`}
            >
              <Link to="/portfolio" className="block w-full h-full" aria-label="Portfolioya bax">
                {card.type === 'placeholder' || brokenImages.has(i) ? (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: card.type === 'placeholder' ? card.tile.bg : PLACEHOLDER_TILES[i % PLACEHOLDER_TILES.length].bg,
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <Sparkles size={22} style={{ color: 'var(--bg-primary)' }} strokeWidth={1.5} />
                  </div>
                ) : (
                  <img
                    src={card.src}
                    alt={card.alt}
                    onError={() => setBrokenImages((prev) => new Set(prev).add(i))}
                    className="w-full h-full object-cover"
                    style={{ backgroundColor: 'var(--card-bg)' }}
                  />
                )}
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Softens the board's bottom edge — cards intentionally spill past
            Hero's own overflow-hidden boundary (see the CARD_SLOTS comment),
            and a hard clip there sat right at the seam with
            IntroRiseSection's panel underneath, reading as if that panel
            were slicing the card rather than Hero's own edge. Fading to the
            page background here instead makes that boundary the visible
            edge, so it looks intentional either way. */}
        <div
          className="absolute inset-x-0 bottom-0 h-16 md:h-36 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-primary))' }}
          aria-hidden
        />

        {/* `pointer-events-none` on the wrapper, `pointer-events-auto` back
            on the text itself: this block's padding/line-height leaves a
            lot of empty space around the actual glyphs, and without this
            split that whole box (not just the visible text) ate hover/click
            events meant for any board card peeking through underneath it —
            re-enabling it only on the h1/p keeps the wordmark and subtext
            selectable while letting cards behind the gaps stay interactive. */}
        <div className="relative z-20 flex flex-col items-center px-8 py-10 sm:px-16 pointer-events-none">
        <h1 className="flex items-center justify-center font-heading font-medium leading-none pointer-events-auto">
          {['O', 'N', 'E'].map((letter) => (
            <motion.span
              key={letter}
              variants={letterItem}
              style={{ color: 'var(--text-primary)', fontSize: 'clamp(3.5rem, min(14vw, 20vh), 11.25rem)' }}
            >
              {letter}
            </motion.span>
          ))}
          <motion.span
            variants={letterItem}
            style={{ color: 'var(--accent-text)', fontSize: 'clamp(3.5rem, min(14vw, 20vh), 11.25rem)' }}
          >
            .
          </motion.span>
        </h1>

        <motion.p
          variants={cockpitItem}
          className="text-base md:text-xl font-light max-w-xl mx-auto mt-6 leading-relaxed pointer-events-auto"
          style={{ color: 'var(--text-muted)' }}
        >
          {settings.heroSubtext}
        </motion.p>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;

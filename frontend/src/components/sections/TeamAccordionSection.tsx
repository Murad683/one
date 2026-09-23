import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cockpitContainer, cockpitItem } from '../../utils/animations';
import { useTeam } from '../../hooks/useSiteData';
import { assetUrl } from '../../utils/api';

// Decorative, desktop-only — sits behind the accordion row. With
// admin-uploaded photos (plain, opaque headshots, not the transparent
// branded cutouts this was originally built around) it mostly shows only
// in the gaps between panels rather than "through" them — that's fine,
// it's ambient texture, not load-bearing content (name/role are real HTML
// captions now, see the per-panel overlay below).
const BackgroundHeading = () => (
  <div className="absolute inset-0 z-0 flex justify-center overflow-hidden pointer-events-none px-4" style={{ alignItems: 'flex-start', paddingTop: '1%' }}>
    <motion.h2
      variants={cockpitItem}
      className="font-heading font-bold uppercase text-center select-none leading-none whitespace-nowrap"
      style={{
        color: 'var(--text-primary)',
        fontSize: 'clamp(1.75rem, 5.5vw, 5.5rem)',
        letterSpacing: '0.2em',
      }}
    >
      <span style={{ color: 'var(--color-accent)' }}>One</span> Komandası
    </motion.h2>
  </div>
);

const VisibleHeading = () => (
  <motion.h2
    variants={cockpitItem}
    className="font-heading font-semibold uppercase text-center mb-6"
    style={{
      color: 'var(--text-primary)',
      fontSize: 'clamp(1.75rem, 7vw, 2.5rem)',
      letterSpacing: '0.15em',
    }}
  >
    <span style={{ color: 'var(--color-accent)' }}>One</span> Komandası
  </motion.h2>
);

// Bottom gradient + name/role — shown always on the static grid (mobile,
// reduced-motion), shown only while a panel is expanded on the desktop
// accordion (passing `visible={false}` fades it out on the collapsed
// panels, matching the site's existing PortfolioCard caption pattern).
const Caption = ({ name, role, visible = true }: { name: string; role: string; visible?: boolean }) => (
  <div
    className="absolute inset-x-0 bottom-0 p-4 pt-10 transition-opacity duration-500"
    style={{
      background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
      opacity: visible ? 1 : 0,
    }}
  >
    <h3 className="font-heading text-sm font-semibold text-white whitespace-nowrap">{name}</h3>
    <p className="text-xs uppercase tracking-widest text-white/70 whitespace-nowrap">{role}</p>
  </div>
);

const TeamAccordionSection = () => {
  const { data: team, loading } = useTeam();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reduceMotionFM = useReducedMotion();
  const reduceMotion = reduceMotionFM || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  if (loading || !team || team.length === 0) return null;

  return (
    <section className="pt-32 pb-8 transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      {reduceMotion ? (
        <motion.div
          variants={cockpitContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
          className="px-6 md:px-16"
        >
          <VisibleHeading />
          <div className="flex flex-wrap justify-center gap-3">
            {team.map((member: any, idx: number) => (
              <motion.div
                key={member.id || idx}
                variants={cockpitItem}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden w-[calc(50%-0.375rem)] md:w-[calc(25%-0.5625rem)]"
              >
                <img
                  src={assetUrl(member.avatarUrl) || '/avatar-icon.png'}
                  alt={`${member.name} — ${member.role}`}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    if (!el.src.endsWith('/avatar-icon.png')) el.src = '/avatar-icon.png';
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <Caption name={member.name} role={member.role} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={cockpitContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
        >
          <div className="relative hidden md:block w-full h-[70vh]">
            <BackgroundHeading />
            <div className="relative z-10 flex w-full h-full gap-1">
              {team.map((member: any, idx: number) => (
                <motion.div
                  key={member.id || idx}
                  variants={cockpitItem}
                  className="relative h-full overflow-hidden transition-[flex-grow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ flexGrow: hoveredId === (member.id || idx) ? 6 : 1, flexBasis: 0 }}
                  onMouseEnter={() => setHoveredId(member.id || idx)}
                  onMouseLeave={() => setHoveredId((current) => (current === (member.id || idx) ? null : current))}
                >
                  <img
                    src={assetUrl(member.avatarUrl) || '/avatar-icon.png'}
                    alt={`${member.name} — ${member.role}`}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      if (!el.src.endsWith('/avatar-icon.png')) el.src = '/avatar-icon.png';
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: '50% 15%' }}
                  />
                  <Caption name={member.name} role={member.role} visible={hoveredId === (member.id || idx)} />
                  <div
                    className="absolute inset-0 rounded-2xl border transition-colors duration-700"
                    style={{ borderColor: hoveredId === (member.id || idx) ? 'rgba(255,255,255,0.14)' : 'transparent' }}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="md:hidden px-6">
            <VisibleHeading />
            <div className="flex flex-wrap justify-center gap-3">
              {team.map((member: any, idx: number) => (
                <motion.div
                  key={member.id || idx}
                  variants={cockpitItem}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden w-[calc(50%-0.375rem)]"
                >
                  <img
                    src={assetUrl(member.avatarUrl) || '/avatar-icon.png'}
                    alt={`${member.name} — ${member.role}`}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      if (!el.src.endsWith('/avatar-icon.png')) el.src = '/avatar-icon.png';
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <Caption name={member.name} role={member.role} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
};

export default TeamAccordionSection;

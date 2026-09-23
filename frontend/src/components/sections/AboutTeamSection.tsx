import { motion } from 'framer-motion';
import { cockpitContainer, cockpitItem } from '../../utils/animations';
import { useTeam } from '../../hooks/useSiteData';
import { assetUrl } from '../../utils/api';

interface AboutTeamSectionProps {
  badge?: string;
  title?: string;
}

// Admin-managed (`useTeam()` — Team page in the admin panel), both photo and
// name/role. Photo + caption are always separate here (unlike the
// homepage's TeamAccordionSection in its expanded state, which leans on
// baked-in card art) since admin-uploaded photos are plain headshots with
// no designed caption of their own.
const AboutTeamSection: React.FC<AboutTeamSectionProps> = ({ badge, title }) => {
  const { data: team, loading } = useTeam();

  if (loading || !team || team.length === 0) return null;

  return (
    <motion.section
      variants={cockpitContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10%' }}
      className="py-24 px-6 md:px-16"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
        {badge && (
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            {badge}
          </motion.p>
        )}
        {title && (
          <motion.h2 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-semibold mb-16" style={{ color: 'var(--text-primary)' }}>
            {title}
          </motion.h2>
        )}

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-10 w-full">
          {team.map((member: any, idx: number) => (
            <motion.div
              key={member.id || idx}
              variants={cockpitItem}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="w-[calc(50%-0.75rem)] sm:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)]"
            >
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={assetUrl(member.avatarUrl) || '/avatar-icon.png'}
                  alt={member.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    if (!el.src.endsWith('/avatar-icon.png')) el.src = '/avatar-icon.png';
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <h3 className="font-heading text-base font-semibold mt-4" style={{ color: 'var(--text-primary)' }}>
                {member.name}
              </h3>
              <p className="text-xs uppercase tracking-widest mt-1" style={{ color: 'var(--accent-text)' }}>
                {member.role}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default AboutTeamSection;

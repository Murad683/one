import { motion } from 'framer-motion';
import PageTransition from '../components/utils/PageTransition';
import AboutTeamSection from '../components/sections/AboutTeamSection';
import { cockpitContainer, cockpitItem } from '../utils/animations';
import { useSiteSettings } from '../hooks/useSiteData';
import { useSeo } from '../hooks/useSeo';

const AboutPage = () => {
  useSeo({
    title: 'Haqqımızda',
    description:
      'One — brendinizi gələcəyə daşıyan komanda. Agentliyimiz, dəyərlərimiz və işə yanaşmamız haqqında.',
    path: '/haqqimizda',
  });
  const { data: settings, loading: settingsLoading } = useSiteSettings();

  if (settingsLoading || !settings) return null;

  let stats = [];
  try {
    stats = typeof settings.aboutStats === 'string' ? JSON.parse(settings.aboutStats) : (settings.aboutStats || []);
  } catch (e) {
    stats = [];
  }

  return (
    <PageTransition className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      {/* Section 1 — Story */}
      <motion.section 
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="pt-40 pb-32 px-6 md:px-24 max-w-5xl mx-auto"
      >
        <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
          {settings.aboutTopLabel}
        </motion.p>
        <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold mb-10" style={{ color: 'var(--text-primary)' }}>
          {settings.aboutMainHeading}
        </motion.h1>

        <motion.div variants={cockpitItem} className="text-lg leading-relaxed space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <div className="whitespace-pre-line">
            {settings.aboutDescription}
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={cockpitItem}
          className="grid grid-cols-2 md:grid-cols-4 gap-10 mt-20 pt-20"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {stats.map((stat: any, idx: number) => (
            <div key={idx}>
              <div className="font-heading text-5xl font-bold" style={{ color: 'var(--accent-text)' }}>
                {stat.value}
              </div>
              <div className="text-sm mt-2 uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* Quote */}
      <div className="py-24 text-center max-w-2xl mx-auto">
        <p className="font-heading text-2xl md:text-3xl font-light leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
          {settings.aboutQuote}
        </p>
      </div>

      {/* Section 2 — Team */}
      <AboutTeamSection badge={settings.aboutTeamBadge} title={settings.aboutTeamTitle} />
    </PageTransition>
  );
};

export default AboutPage;

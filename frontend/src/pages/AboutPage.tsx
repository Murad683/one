import { motion } from 'framer-motion';
// Removed User import
import { team, stats } from '../data/team';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const AboutPage = () => {
  return (
    <PageTransition className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Section 1 — Story */}
      <motion.section 
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="pt-40 pb-32 px-6 md:px-24 max-w-5xl mx-auto"
      >
        <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
          Biz Kimik
        </motion.p>
        <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold mb-10" style={{ color: 'var(--text-primary)' }}>
          Brendləri Quranlara Tərəfdaşıq
        </motion.h1>

        <motion.div variants={cockpitItem} className="text-lg leading-relaxed space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <p>
            2019-cu ildə qurulan şirkətimiz, Azərbaycandakı ən innovativ brendlərə kreativ xidmətlər göstərməkdə ixtisaslaşmışdır. Biz yalnız görüntü yaratmır, brendlər üçün uzunmüddətli rəqəmsal miras qururuq.
          </p>
          <p>
            Komandamız video rejissorlar, brend strateglar, veb developerlar və məzmun yaradıcılarından ibarətdir. Hər layihəyə fərdi yanaşaraq ölçülə bilən nəticələr çatdırırıq.
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={cockpitItem}
          className="grid grid-cols-2 md:grid-cols-4 gap-10 mt-20 pt-20"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {stats.map((stat, idx) => (
            <div key={idx}>
              <div className="font-heading text-5xl font-bold" style={{ color: 'var(--accent-text)' }}>
                {stat.value}
              </div>
              <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.section>
      {/* Quote */}
      <div className="py-24 text-center max-w-2xl mx-auto">
        <p className="font-heading text-2xl md:text-3xl font-light leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
          "Biz sadəcə xidmət göstərmirik —
          brendlərin uzunmüddətli uğuruna sərmayə edirik."
        </p>
      </div>

      {/* Section 2 — Team */}
      <motion.section 
        variants={cockpitContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        className="py-24 px-6 md:px-16"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            Komandamız
          </motion.p>
          <motion.h2 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-semibold mb-16" style={{ color: 'var(--text-primary)' }}>
            Bizimlə Tanış Olun
          </motion.h2>

          <motion.div variants={cockpitItem} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {team.map((member, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="backdrop-blur-md border rounded-2xl p-6 text-center transition-colors cursor-default"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--card-border)',
                }}
              >
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-4 grayscale hover:grayscale-0 transition-all duration-300"
                />
                <h3 className="font-heading text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {member.name}
                </h3>
                <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
                  {member.role}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </PageTransition>
  );
};

export default AboutPage;

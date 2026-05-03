import { motion } from 'framer-motion';
// Removed User import
import { team, stats } from '../data/team';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const AboutPage = () => {
  return (
    <PageTransition className="min-h-screen bg-carbon">
      {/* Section 1 — Story */}
      <motion.section 
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="py-32 px-6 md:px-24 max-w-5xl mx-auto"
      >
        <motion.p variants={cockpitItem} className="text-accent text-xs uppercase tracking-widest font-medium mb-4">
          Biz Kimik
        </motion.p>
        <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold text-white mb-10">
          Brendləri Quranlara Tərəfdaşıq
        </motion.h1>

        <motion.div variants={cockpitItem} className="text-white/60 text-lg leading-relaxed space-y-6">
          <p>
            2019-cu ildə qurulan şirkətimiz, Azərbaycandakı ən innovativ brendlərə kreativ xidmətlər göstərməkdə ixtisaslaşmışdır. Biz yalnız görüntü yaratmır, brendlər üçün uzunmüddətli rəqəmsal miras qururuq.
          </p>
          <p>
            Komandamız video rejissorlar, brend strateglar, veb developerlar və məzmun yaradıcılarından ibarətdir. Hər layihəyə fərdi yanaşaraq ölçülə bilən nəticələr çatdırırıq.
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={cockpitItem} className="grid grid-cols-2 md:grid-cols-4 gap-10 mt-20 pt-20 border-t border-white/[0.06]">
          {stats.map((stat, idx) => (
            <div key={idx}>
              <div className="font-heading text-5xl font-bold text-accent">
                {stat.value}
              </div>
              <div className="text-white/50 text-sm mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.section>
      {/* Quote */}
      <div className="py-24 text-center max-w-2xl mx-auto">
        <p className="font-heading text-2xl md:text-3xl font-light text-white/60 leading-relaxed italic">
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
        className="py-24 px-6 md:px-16 border-t border-white/[0.04]"
      >
        <div className="max-w-7xl mx-auto">
          <motion.p variants={cockpitItem} className="text-accent text-xs uppercase tracking-widest font-medium mb-4">
            Komandamız
          </motion.p>
          <motion.h2 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-semibold text-white mb-16">
            Bizimlə Tanış Olun
          </motion.h2>

          <motion.div variants={cockpitItem} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {team.map((member, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4, borderColor: 'rgba(163,230,53,0.15)' }}
                className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] rounded-2xl p-6 text-center transition-colors cursor-default"
              >
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-4 grayscale hover:grayscale-0 transition-all duration-300"
                />
                <h3 className="font-heading text-sm font-semibold text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-accent text-xs">
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

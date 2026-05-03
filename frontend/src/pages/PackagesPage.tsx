import { motion } from 'framer-motion';
import PricingCards from '../components/sections/PricingCards';
import SectionOrbs from '../components/ui/SectionOrbs';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const PackagesPage = () => {
  return (
    <PageTransition className="relative py-32 px-6 md:px-16 min-h-screen bg-carbon overflow-hidden">
      <SectionOrbs
        orbs={[
          { color: 'rgba(163, 230, 53, 0.08)', size: 'w-[600px] h-[600px]', position: 'top-32 left-[-100px]', blur: 'blur-[130px]', duration: 18 },
          { color: 'rgba(59, 130, 246, 0.06)', size: 'w-[500px] h-[500px]', position: 'top-32 right-[-80px]', blur: 'blur-[120px]', duration: 22 },
          { color: 'rgba(163, 230, 53, 0.04)', size: 'w-[400px] h-[400px]', position: 'bottom-0 left-1/2 -translate-x-1/2', blur: 'blur-[100px]', duration: 28 },
        ]}
      />
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <motion.div
          variants={cockpitContainer}
          initial="hidden"
          animate="show"
          className="max-w-2xl mx-auto mb-16"
        >
          <motion.p variants={cockpitItem} className="text-accent text-xs uppercase tracking-widest font-medium mb-4">
            Qiymət Paketləri
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold text-white mb-6">
            Sizin üçün doğru plan
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-white/50 text-lg leading-relaxed">
            Hər ölçüdə biznes üçün uyğun paketlər. Şəffaf qiymət, aydın nəticələr.
          </motion.p>
        </motion.div>

        <PricingCards />
      </div>
    </PageTransition>
  );
};

export default PackagesPage;

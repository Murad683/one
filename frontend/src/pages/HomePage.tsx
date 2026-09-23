import HeroSection from '../components/sections/HeroSection';
import IntroRiseSection from '../components/sections/IntroRiseSection';
import ServicesSection from '../components/sections/ServicesSection';
import FeaturedPortfolioSection from '../components/sections/FeaturedPortfolioSection';
import TeamAccordionSection from '../components/sections/TeamAccordionSection';
import PageTransition from '../components/utils/PageTransition';
import { useSeo } from '../hooks/useSeo';

const HomePage = () => {
  useSeo({
    title: 'One — Rəqəmsal Marketinq və Brendinq Agentliyi',
    description:
      'One — brendlər üçün SMM, brend dizaynı, logo və video istehsalı. Peşəkar komanda ilə brendinizi gələcəyə daşıyırıq.',
    path: '/',
  });

  return (
    <PageTransition>
      <HeroSection />
      <IntroRiseSection />
      <ServicesSection />
      <FeaturedPortfolioSection />
      <TeamAccordionSection />
    </PageTransition>
  );
};

export default HomePage;

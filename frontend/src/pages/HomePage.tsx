import HeroSection from '../components/sections/HeroSection';
import MarqueeBanner from '../components/sections/MarqueeBanner';
import ServicesSection from '../components/sections/ServicesSection';
import FeaturedPortfolioSection from '../components/sections/FeaturedPortfolioSection';
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
      <MarqueeBanner />
      <ServicesSection />
      <FeaturedPortfolioSection />
    </PageTransition>
  );
};

export default HomePage;

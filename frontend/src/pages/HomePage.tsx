import HeroSection from '../components/sections/HeroSection';
import MarqueeBanner from '../components/sections/MarqueeBanner';
import ServicesSection from '../components/sections/ServicesSection';
import FeaturedPortfolioSection from '../components/sections/FeaturedPortfolioSection';
import PageTransition from '../components/utils/PageTransition';

const HomePage = () => {
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

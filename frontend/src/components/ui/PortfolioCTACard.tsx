import { Link } from 'react-router-dom';

interface PortfolioCTACardProps {
  index: number;
  isStatic?: boolean;
}

// Last item in the stack — same shared `.stack-card` box as the project
// cards, so it participates in the identical GSAP timeline as the closing
// card, but with centered CTA content instead of a project image.
const PortfolioCTACard: React.FC<PortfolioCTACardProps> = ({ index, isStatic }) => {
  return (
    <Link
      to="/portfolio"
      className={`stack-card ${isStatic ? 'relative aspect-video' : 'absolute inset-0'} rounded-2xl md:rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center px-6`}
      style={{ zIndex: index + 1, backgroundColor: '#101114' }}
    >
      <span className="inline-block px-4 py-1.5 mb-6 rounded-full text-xs uppercase tracking-widest font-medium text-white/70 border border-white/20">
        Layihələr
      </span>
      <h3 className="font-heading text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.1] text-white mb-8">
        Daha Çox İşimizi Kəşf Et
      </h3>
      <span className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-semibold bg-white text-black">
        Bütün Layihələri Gör
      </span>
    </Link>
  );
};

export default PortfolioCTACard;

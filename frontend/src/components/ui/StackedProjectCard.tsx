import { assetUrl } from '../../utils/api';

interface StackedProjectCardProps {
  project: any;
  index: number;
  isStatic?: boolean;
  onClick: () => void;
  onHoverStart: (e: React.MouseEvent) => void;
  onHoverEnd: () => void;
}

// One shared box (`inset-0`) — the `.stack` container (FeaturedPortfolioSection)
// carries its own explicit height via CSS, so every card (including the
// first) can be `absolute inset-0`; unlike leyla's cards, ours have no
// in-flow content (image/gradient/text are all absolutely positioned
// overlays), so a `position: relative` first card would collapse to zero
// height and get clipped by `overflow-hidden`. The parent's single GSAP
// timeline drives every card's transform by targeting the `.stack-card`
// class, the same mechanism as leyla's Process.jsx. No per-card scroll
// logic here. `isStatic` (prefers-reduced-motion fallback) renders it as a
// normal in-flow block instead of layered/absolute.
const StackedProjectCard: React.FC<StackedProjectCardProps> = ({
  project,
  index,
  isStatic,
  onClick,
  onHoverStart,
  onHoverEnd,
}) => {
  const categoryName = project.category ? project.category.name : (project.categoryLegacy || '');

  return (
    <article
      className={`stack-card ${isStatic ? 'relative aspect-video mb-5' : 'absolute inset-0'} rounded-2xl md:rounded-3xl overflow-hidden cursor-none`}
      style={{ zIndex: index + 1 }}
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <img
        src={assetUrl(project.thumbnailUrl) || '/portfolio.jpeg'}
        alt={project.title}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/portfolio.jpeg';
        }}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-transparent" />

      <div className="absolute top-0 left-0 p-6 md:p-10 max-w-2xl">
        <h3 className="font-heading text-2xl md:text-4xl font-semibold text-white leading-[1.05] mb-4">
          {project.title}
        </h3>
        {categoryName && (
          <span className="inline-block px-4 py-1.5 rounded-full text-xs uppercase tracking-widest font-medium text-white border border-white/30">
            {categoryName}
          </span>
        )}
      </div>
    </article>
  );
};

export default StackedProjectCard;

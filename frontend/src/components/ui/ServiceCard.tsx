import { getServicePalette } from '../../utils/servicesPalette';
import { iconForService } from '../../utils/serviceIcons';
import { useTheme } from '../../context/ThemeContext';

interface ServiceCardProps {
  service: any;
  index: number;
  total: number;
  isStatic?: boolean;
}

// Paper-sheet card for ServicesSection.tsx's stack — same `.paper-card`
// shared-box convention as StackedProjectCard's `.stack-card` (parent
// carries the explicit height, every card is `absolute inset-0` except the
// `isStatic` reduced-motion fallback, which lays them out in normal flow
// instead). Each card takes one bold color from servicesPalette.ts instead
// of a shared pale tint. The icon color is always the brand accent
// (var(--color-accent)) regardless of the card's own bg color, so every
// card still reads as "ONE" underneath its own hue. Light/dark mode each
// get their own palette (servicesPalette.ts) — a single set of hues can't
// serve both without either blowing out on the dark background or looking
// muddy on the light one.
const ServiceCard: React.FC<ServiceCardProps> = ({ service, index, total, isStatic }) => {
  const { isDark } = useTheme();
  const palette = getServicePalette(index, isDark);
  const Icon = iconForService(service.iconName);

  return (
    <article
      className={`paper-card ${isStatic ? 'relative mb-6 md:mb-8' : 'absolute inset-0'} rounded-2xl md:rounded-3xl flex flex-col justify-center px-6 py-8 md:px-14 md:py-10`}
      style={{
        zIndex: index + 1,
        backgroundColor: palette.bg,
        boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
        transformOrigin: '50% 0%',
      }}
    >
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div
          className="flex items-center justify-center rounded-full w-12 h-12 md:w-14 md:h-14 shrink-0"
          style={{ backgroundColor: palette.dot }}
        >
          <Icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--color-accent)' }} strokeWidth={1.75} />
        </div>
        <span
          className="font-heading text-xs uppercase tracking-widest"
          style={{ color: palette.description }}
        >
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      <div className="relative max-w-2xl">
        <h3
          className="font-heading text-3xl md:text-5xl font-medium leading-[1.05] mb-5 line-clamp-2"
          style={{ color: palette.title }}
        >
          {service.title}
        </h3>
        <p className="text-base md:text-lg leading-relaxed max-w-md line-clamp-3" style={{ color: palette.description }}>
          {service.description}
        </p>
      </div>

      <div className="flex gap-2 mt-8 relative">
        {Array.from({ length: total }).map((_, dotIndex) => (
          <span
            key={dotIndex}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: dotIndex === index ? '2rem' : '0.75rem',
              backgroundColor: dotIndex === index ? 'var(--color-accent)' : palette.dot,
            }}
          />
        ))}
      </div>
    </article>
  );
};

export default ServiceCard;

import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 ring-red-500/20',
  info: 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
  default: 'bg-surface-hover text-body ring-edge',
};

export const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => (
  <span
    className={[
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      variants[variant],
      className,
    ].join(' ')}
  >
    {children}
  </span>
);

export default Badge;

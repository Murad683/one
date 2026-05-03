import { motion } from 'framer-motion';

type OrbConfig = {
  color: string; // e.g. 'rgba(163,230,53,0.06)'
  size: string;  // e.g. 'w-[500px] h-[500px]'
  position: string; // e.g. 'top-0 left-1/4'
  blur: string;  // e.g. 'blur-[100px]'
  duration?: number;
};

const defaultOrbs: OrbConfig[] = [
  {
    color: 'rgba(163, 230, 53, 0.07)',
    size: 'w-[500px] h-[500px]',
    position: 'top-1/4 left-1/4',
    blur: 'blur-[120px]',
    duration: 20,
  },
  {
    color: 'rgba(59, 130, 246, 0.05)',
    size: 'w-[400px] h-[400px]',
    position: 'bottom-1/4 right-1/4',
    blur: 'blur-[100px]',
    duration: 25,
  },
];

export default function SectionOrbs({ orbs = defaultOrbs }: { orbs?: OrbConfig[] }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${orb.size} ${orb.position} ${orb.blur}`}
          style={{ background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)` }}
          animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
          transition={{ duration: orb.duration ?? 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

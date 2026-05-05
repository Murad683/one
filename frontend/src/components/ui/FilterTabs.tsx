import { motion } from 'framer-motion';
import { categories } from '../../data/projects';

interface FilterTabsProps {
  active: string;
  onChange: (cat: string) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ active, onChange }) => {
  return (
    <div className="flex gap-3 flex-wrap justify-center">
      {categories.map((cat) => (
        <motion.button
          key={cat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange(cat)}
          className={
            active === cat
              ? 'px-6 py-2.5 rounded-full bg-accent text-sm font-semibold transition-all shadow-[0_0_20px_rgba(163,230,53,0.2)]'
              : 'px-6 py-2.5 rounded-full border text-sm transition-all hover:opacity-80'
          }
          style={
            active === cat
              ? { color: 'var(--accent-on-accent)' }
              : { borderColor: 'var(--border-default)', color: 'var(--text-muted)' }
          }
        >
          {cat}
        </motion.button>
      ))}
    </div>
  );
};

export default FilterTabs;

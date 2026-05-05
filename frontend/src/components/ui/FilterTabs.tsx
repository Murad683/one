import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { categories } from '../../data/projects';

interface FilterTabsProps {
  active: string;
  onChange: (cat: string) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ active, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-4 md:flex-wrap md:justify-center md:pb-0 px-2">
      {categories.map((cat) => (
        <motion.button
          key={cat.key}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange(cat.key)}
          className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm transition-all ${
            active === cat.key
              ? 'bg-accent font-semibold shadow-[0_0_20px_rgba(163,230,53,0.2)]'
              : 'border hover:opacity-80'
          }`}
          style={
            active === cat.key
              ? { color: 'var(--accent-on-accent)' }
              : { borderColor: 'var(--border-default)', color: 'var(--text-muted)' }
          }
        >
          {t(cat.translationKey)}
        </motion.button>
      ))}
    </div>
  );
};

export default FilterTabs;

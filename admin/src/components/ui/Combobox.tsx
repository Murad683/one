import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface ComboboxProps {
  label: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  emptyMessage?: string;
  className?: string;
}

export const Combobox = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Axtarın...',
  error,
  emptyMessage = 'Müştəri tapılmadı',
  className = '',
}: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 300px below, and enough space above, open upwards
      if (spaceBelow < 280 && rect.top > 280) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`flex min-h-[38px] w-full cursor-pointer items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm transition focus-within:ring-2 ${
            error
              ? 'border-red-400 focus-within:ring-red-100'
              : 'border-slate-300 focus-within:border-slate-950 focus-within:ring-slate-100'
          }`}
        >
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            {selectedOption ? (
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-slate-950">{selectedOption.label}</span>
                {selectedOption.subLabel && (
                  <span className="truncate text-[10px] text-slate-400 leading-none">{selectedOption.subLabel}</span>
                )}
              </div>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <div 
            className={`absolute z-50 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100 ${
              openUpwards ? 'bottom-full mb-1' : 'mt-1'
            }`}
          >
            <div className="relative mb-1 flex items-center border-b border-slate-100 px-2 pb-1 pt-0.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                className="w-full bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
                placeholder="Axtarın..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <div className="max-h-[250px] overflow-y-auto scrollbar-minimal">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`flex cursor-pointer flex-col rounded-md px-3 py-2 transition-colors hover:bg-slate-50 ${
                      value === opt.value ? 'bg-slate-50' : ''
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-950">{opt.label}</span>
                    {opt.subLabel && <span className="text-xs text-slate-400">{opt.subLabel}</span>}
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-slate-500">{emptyMessage}</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Combobox;

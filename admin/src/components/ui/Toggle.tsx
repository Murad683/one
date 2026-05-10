interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Toggle = ({ checked, onChange, label }: ToggleProps) => (
  <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-slate-700">
    <span className="relative inline-flex h-6 w-11 items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-slate-950" />
      <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
    </span>
    {label && <span>{label}</span>}
  </label>
);

export default Toggle;

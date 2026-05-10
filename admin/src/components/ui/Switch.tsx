import { forwardRef } from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, label, description }, ref) => {
    return (
      <div
        className="flex cursor-pointer items-start gap-3"
        onClick={() => onChange(!checked)}
      >
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          className={`relative mt-0.5 inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
            checked ? 'bg-gray-900' : 'bg-gray-200'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onChange(!checked);
          }}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {description && <span className="text-sm text-gray-500">{description}</span>}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
export default Switch;

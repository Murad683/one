import React, { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  helperText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className={className}>
        <label className="mb-1 block text-sm font-medium text-body">{label}</label>
        <select
          ref={ref}
          className={`w-full rounded-lg border bg-field text-heading px-3 py-2 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 focus:ring-red-500'
              : 'border-field-border focus:ring-blue-500'
          }`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-muted">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;

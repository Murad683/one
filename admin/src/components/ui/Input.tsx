import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, id, className = '', ...props }, ref) => {
  const inputId = id || props.name;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-body">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={[
          'block w-full rounded-lg border bg-field px-3 py-2 text-sm text-heading outline-none transition placeholder:text-faint focus:ring-2',
          error ? 'border-red-400 focus:ring-red-100' : 'border-field-border focus:border-blue-500 focus:ring-blue-100',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

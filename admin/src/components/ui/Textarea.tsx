import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-body">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={[
            'block min-h-28 w-full rounded-lg border bg-field px-3 py-2 text-sm text-heading outline-none transition placeholder:text-faint focus:ring-2',
            error ? 'border-red-400 focus:ring-red-100' : 'border-field-border focus:border-blue-500 focus:ring-blue-100',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export default Textarea;

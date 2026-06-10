import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, hint, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label className="text-sm font-medium text-gray-700">{label}</label>
    )}
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
        'disabled:bg-gray-50 disabled:text-gray-500',
        error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
    {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;

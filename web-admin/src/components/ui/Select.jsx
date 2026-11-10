import clsx from 'clsx';
import { forwardRef } from 'react';

const Select = forwardRef(({ label, labelAction, error, hint, options = [], placeholder, className, ...props }, ref) => (
  <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
    {(label || labelAction) && (
      <div className="flex items-center justify-between gap-2">
        {label ? <label className="text-sm font-medium text-gray-700">{label}</label> : <span />}
        {labelAction}
      </div>
    )}
    <select
      ref={ref}
      className={clsx(
        'w-full min-w-0 min-h-[44px] sm:min-h-0 rounded-md border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition',
        'focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500',
        'disabled:bg-gray-50 disabled:text-gray-500',
        error ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-200 hover:border-gray-300',
        className
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
    {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
  </div>
));

Select.displayName = 'Select';
export default Select;


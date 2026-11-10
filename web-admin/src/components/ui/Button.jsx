import clsx from 'clsx';

const variants = {
  primary:   'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus:ring-brand-500/50',
  secondary: 'bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 focus:ring-gray-300',
  danger:    'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500/50',
  ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
  success:   'bg-green-600 text-white shadow-sm hover:bg-green-700 focus:ring-green-500/50',
};

const sizes = {
  xs: 'px-3 py-2 sm:py-1.5 text-xs min-h-[38px] sm:min-h-0',
  sm: 'px-3.5 py-2 text-sm min-h-[42px] sm:min-h-0',
  md: 'px-4 py-2.5 text-sm min-h-[44px] sm:min-h-0',
  lg: 'px-6 py-3 text-base min-h-[48px] sm:min-h-0',
};

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  className, icon: Icon, ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed  disabled:shadow-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : Icon ? (
        <Icon size={14} />
      ) : null}
      {children}
    </button>
  );
}

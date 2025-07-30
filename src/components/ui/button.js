export function Button({ children, className = '', variant = 'default', ...props }) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium focus:outline-none transition';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 text-gray-800 bg-white hover:bg-gray-50'
  };
  return (
    <button {...props} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}
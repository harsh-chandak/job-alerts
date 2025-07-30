export function Label({ children, className = '' }) {
  return <label className={`text-sm font-medium text-gray-700 ${className}`}>{children}</label>;
}
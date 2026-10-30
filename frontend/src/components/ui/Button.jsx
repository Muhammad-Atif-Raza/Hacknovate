import React from 'react';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary:
    'bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-500 disabled:bg-slate-400',
  secondary:
    'bg-white text-slate-800 border border-gray-300 hover:bg-gray-50 focus:ring-slate-300 disabled:bg-gray-100 disabled:text-gray-400',
  accent:
    'bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-400 disabled:bg-sky-300',
  danger:
    'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 disabled:bg-red-300',
  ghost:
    'bg-transparent text-slate-700 hover:bg-gray-100 focus:ring-gray-300 disabled:text-gray-400',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  type = 'button',
  fullWidth = false,
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        ${variantStyles[variant] || variantStyles.primary}
        ${sizeStyles[size] || sizeStyles.md}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
        ${className}
      `.trim()}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

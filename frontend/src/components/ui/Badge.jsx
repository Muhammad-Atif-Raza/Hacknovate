import React from 'react';

const variantStyles = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
  default: 'bg-gray-100 text-gray-700',
};

export default function Badge({ text, variant = 'default', className = '' }) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
        ${variantStyles[variant] || variantStyles.default}
        ${className}
      `.trim()}
    >
      {text}
    </span>
  );
}

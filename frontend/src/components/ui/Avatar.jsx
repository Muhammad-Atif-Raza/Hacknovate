import React from 'react';

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const bgColors = [
  'bg-sky-500',
  'bg-teal-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-indigo-500',
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorFromName(name) {
  if (!name) return bgColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bgColors[Math.abs(hash) % bgColors.length];
}

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizeClass = sizeStyles[size] || sizeStyles.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover border-2 border-white shadow-sm ${className}`}
      />
    );
  }

  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <div
      className={`
        ${sizeClass} ${bgColor}
        rounded-full flex items-center justify-center
        text-white font-semibold border-2 border-white shadow-sm
        ${className}
      `.trim()}
      title={name}
    >
      {initials}
    </div>
  );
}

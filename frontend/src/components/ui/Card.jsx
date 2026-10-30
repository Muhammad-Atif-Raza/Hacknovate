import React from 'react';

export default function Card({
  children,
  className = '',
  padding = 'p-6',
  hoverable = false,
}) {
  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-gray-100
        ${padding}
        ${hoverable ? 'hover:shadow-lg transition-shadow duration-300' : ''}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}

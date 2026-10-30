import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoaderSpinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2
      className={`animate-spin text-sky-500 ${sizeMap[size] || sizeMap.md} ${className}`}
    />
  );
}

export default function Loader({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-sky-500 rounded-full border-t-transparent animate-spin" />
        </div>
        {message && (
          <p className="text-sm font-medium text-slate-600">{message}</p>
        )}
      </div>
    </div>
  );
}

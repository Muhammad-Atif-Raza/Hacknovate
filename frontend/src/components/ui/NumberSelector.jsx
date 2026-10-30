import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function NumberSelector({
  value = 1,
  onChange,
  min = 0,
  max = 100,
  label,
  className = '',
}) {
  const atMin = value <= min;
  const atMax = value >= max;

  const decrement = () => {
    if (!atMin) onChange(value - 1);
  };

  const increment = () => {
    if (!atMax) onChange(value + 1);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={decrement}
          disabled={atMin}
          className={`
            flex items-center justify-center w-10 h-10
            transition-colors duration-200
            ${atMin
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'bg-slate-800 text-white hover:bg-slate-900 cursor-pointer'}
          `}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-14 text-center text-sm font-semibold text-slate-800 select-none">
          {value}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={atMax}
          className={`
            flex items-center justify-center w-10 h-10
            transition-colors duration-200
            ${atMax
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'bg-sky-500 text-white hover:bg-sky-600 cursor-pointer'}
          `}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

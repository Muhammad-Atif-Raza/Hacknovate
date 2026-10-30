import React from 'react';
import { Clock } from 'lucide-react';

export default function TimePicker({
  label,
  value,
  onChange,
  error,
  name,
  required = false,
  className = '',
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Clock className="w-4 h-4 text-gray-400" />
        </div>
        <input
          id={name}
          name={name}
          type="time"
          value={value}
          onChange={onChange}
          required={required}
          className={`
            block w-full rounded-lg border bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-800
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-300'}
          `.trim()}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

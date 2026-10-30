import React from 'react';

export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon: Icon,
  required = false,
  disabled = false,
  name,
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
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="w-4.5 h-4.5 text-gray-400" />
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800
            placeholder:text-gray-400
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-300'}
          `.trim()}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

import React from 'react';

export default function TextArea({
  label,
  placeholder,
  value,
  onChange,
  error,
  rows = 4,
  required = false,
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
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        className={`
          block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800
          placeholder:text-gray-400
          transition-colors duration-200 resize-vertical
          focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500
          ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-300'}
        `.trim()}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

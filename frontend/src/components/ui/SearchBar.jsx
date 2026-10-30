import React from 'react';
import { Search } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onSearch,
  className = '',
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className={`relative w-full max-w-md ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="w-4.5 h-4.5 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          block w-full rounded-full border border-gray-300 bg-white
          pl-11 pr-4 py-2.5 text-sm text-slate-800
          placeholder:text-gray-400
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500
        "
      />
      {onSearch && (
        <button
          type="button"
          onClick={() => onSearch(value)}
          className="absolute inset-y-0 right-0 pr-1.5 flex items-center"
        >
          <span className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium px-4 py-1.5 rounded-full transition-colors duration-200">
            Search
          </span>
        </button>
      )}
    </div>
  );
}

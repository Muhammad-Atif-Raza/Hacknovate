import React from 'react';
import { Inbox } from 'lucide-react';

export default function Table({
  columns = [],
  data = [],
  emptyMessage = 'No data available',
  className = '',
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className="hover:bg-slate-50/50 transition-colors even:bg-gray-50/30"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 text-slate-700 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden divide-y divide-gray-100">
        {data.map((row, rowIndex) => (
          <div key={row.id || rowIndex} className="p-4 space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-shrink-0">
                  {col.header}
                </span>
                <span className="text-sm text-slate-700 text-right">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

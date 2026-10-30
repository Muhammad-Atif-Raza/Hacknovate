import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap = {
  sky: 'bg-sky-100 text-sky-600',
  teal: 'bg-teal-100 text-teal-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
  violet: 'bg-violet-100 text-violet-600',
  navy: 'bg-slate-100 text-slate-600',
};

export default function StatCard({ title, value, icon: Icon, trend, color = 'sky' }) {
  const iconColors = colorMap[color] || colorMap.sky;
  const isPositive = trend && parseFloat(trend) >= 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconColors}`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{isPositive && '+'}{trend}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

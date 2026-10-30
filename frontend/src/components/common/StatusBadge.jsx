import React from 'react';

export const StatusBadge = ({ status, size = 'sm' }) => {
  const normStatus = (status || '').toUpperCase();

  const configs = {
    AVAILABLE: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Available' },
    OCCUPIED: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Occupied' },
    UNDER_MAINTENANCE: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Maintenance' },
    TEMPORARILY_UNAVAILABLE: { bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400', label: 'Unavailable' },
    
    // Booking statuses
    PENDING: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse', label: 'Under Review' },
    APPROVED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Approved' },
    CHECKED_IN: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', label: 'Checked In' },
    REJECTED: { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Rejected' },
    CANCELLED: { bg: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400', label: 'Cancelled' },
    EXPIRED: { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', label: 'Auto-Released' },
    COMPLETED: { bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400', label: 'Completed' },
  };

  const current = configs[normStatus] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    label: status
  };

  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`}></span>
      <span>{current.label}</span>
    </span>
  );
};

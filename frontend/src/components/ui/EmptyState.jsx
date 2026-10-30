import React from 'react';
import { Package } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Package,
  title = 'Nothing here yet',
  message = 'There are no items to display.',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{message}</p>
      {action && (
        <Button variant="accent" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

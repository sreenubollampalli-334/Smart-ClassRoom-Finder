import { } from 'lucide-react';
import React from 'react';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`text-center py-12 px-4 ${className}`}>
    {Icon && (
      <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
    )}
    <h3 className="text-sm font-medium text-slate-900">{title}</h3>
    {description && (
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

import { } from 'lucide-react';
import React from 'react';

export const Badge = ({
  children,
  status = 'default',
  icon: Icon,
  className = '',
}) => {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    free: 'bg-emerald-50 text-emerald-700',
    occupied: 'bg-rose-50 text-rose-700',
    'free-soon': 'bg-amber-50 text-amber-700',
    primary: 'bg-indigo-50 text-indigo-700',
  };

  const dots = {
    free: 'bg-emerald-500',
    occupied: 'bg-rose-500',
    'free-soon': 'bg-amber-500',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.default} ${className}`}>
      {dots[status] && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status]}`} />
      )}
      {Icon && <Icon className="mr-1 h-3.5 w-3.5" />}
      {children}
    </span>
  );
};

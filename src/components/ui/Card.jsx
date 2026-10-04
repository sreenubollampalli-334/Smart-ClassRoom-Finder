import React from 'react';

export const Card = ({ children, className = '', ...props }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 md:p-6 ${className}`} {...props}>
    {children}
  </div>
);

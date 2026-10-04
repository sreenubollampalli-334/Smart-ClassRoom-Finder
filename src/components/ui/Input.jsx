import React from 'react';

export const Input = ({
  label,
  error,
  id,
  className = '',
  ...props
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`appearance-none block w-full h-11 px-4 py-2 border rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition-shadow sm:text-sm bg-white ${
          error 
            ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' 
            : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
};

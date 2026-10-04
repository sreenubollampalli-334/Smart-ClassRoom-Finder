import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 24, className = '' }) => (
  <Loader2 className={`animate-spin text-indigo-600 ${className}`} size={size} />
);

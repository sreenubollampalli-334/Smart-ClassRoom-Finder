import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from './ui/Spinner';
import { Card } from './ui/Card';
import { Clock } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'hod') return <Navigate to="/hod" />;
    if (profile.role === 'cr') return <Navigate to="/cr" />;
    return <Navigate to="/" />;
  }

  // If role is CR, check if they are approved
  if (profile.role === 'cr' && !profile.is_approved) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-amber-200 bg-amber-50">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-white mb-5 shadow-sm border border-amber-100">
            <Clock className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Approval Pending</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your account is waiting for HOD approval. You will be able to access the CR dashboard once your account is reviewed and approved.
          </p>
        </Card>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

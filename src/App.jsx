import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HodDashboard from './pages/HodDashboard';
import CrDashboard from './pages/CrDashboard';

function App() {
  const isEnvMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (isEnvMissing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-rose-200 p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Missing Environment Variables</h2>
          <p className="text-slate-600 mb-6">
            Please create a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-slate-800">.env</code> file in the project root with your Supabase credentials:
          </p>
          <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-left text-sm overflow-x-auto mb-6">
            VITE_SUPABASE_URL=your_url<br/>
            VITE_SUPABASE_ANON_KEY=your_key
          </pre>
          <p className="text-sm text-slate-500">
            Restart the dev server after adding the file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />
          <main className="flex-grow flex flex-col fade-in">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route 
                path="/hod/*" 
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <HodDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/cr/*" 
                element={
                  <ProtectedRoute allowedRoles={['cr']}>
                    <CrDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
          <Toaster 
            position="bottom-center" 
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                background: '#fff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#e11d48',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Projector, Menu, X, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './ui/Button';

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 group-hover:bg-indigo-700 transition-colors shadow-sm">
                <Projector className="h-5 w-5 text-white" />
              </div>
              <span className="text-slate-900 font-semibold text-lg tracking-tight">Smart Classroom</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              Student View
            </Link>
            
            {user ? (
              <>
                {profile?.role === 'hod' && (
                  <Link 
                    to="/hod" 
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/hod') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                  >
                    HOD Dashboard
                  </Link>
                )}
                {profile?.role === 'cr' && (
                  <Link 
                    to="/cr" 
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/cr') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                  >
                    CR Dashboard
                  </Link>
                )}
                <div className="h-6 w-px bg-slate-200 mx-2"></div>
                
                <div className="flex items-center space-x-3 ml-2">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm border border-indigo-200">
                    {getInitials(profile?.full_name)}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 text-slate-500 hover:text-rose-600">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="h-6 w-px bg-slate-200 mx-2"></div>
                <Link to="/login">
                  <Button variant="secondary" size="sm" className="ml-2">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm" className="ml-2">Sign up</Button>
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-white border-t border-slate-100 absolute w-full shadow-lg`}>
        <div className="px-4 pt-3 pb-4 space-y-2">
          {user && (
            <div className="flex items-center px-3 py-3 mb-2 border-b border-slate-100">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm border border-indigo-200">
                {getInitials(profile?.full_name)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-900">{profile?.full_name || 'User'}</p>
                <p className="text-xs font-medium text-slate-500 capitalize">{profile?.role}</p>
              </div>
            </div>
          )}
          
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${isActive('/') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Student View
          </Link>
          
          {user ? (
            <>
              {profile?.role === 'hod' && (
                <Link
                  to="/hod"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${isActive('/hod') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  HOD Dashboard
                </Link>
              )}
              {profile?.role === 'cr' && (
                <Link
                  to="/cr"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${isActive('/cr') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  CR Dashboard
                </Link>
              )}
              <div className="pt-4 mt-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  icon={LogOut}
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <div className="pt-4 mt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="secondary" className="w-full">Log in</Button>
              </Link>
              <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

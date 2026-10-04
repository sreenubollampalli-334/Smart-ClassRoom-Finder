import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Projector, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    section: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            section: formData.section,
          }
        }
      });

      if (error) throw error;

      toast.success('Account created successfully! Please log in.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Error signing up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-gradient-to-b from-indigo-50/50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm mb-8 text-center">
        <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm mb-6">
          <Projector className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create an account
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Apply for Class Representative access
        </p>
      </div>

      <Card className="w-full max-w-sm p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSignup}>
          <Input
            label="Full Name"
            id="fullName"
            name="fullName"
            type="text"
            required
            value={formData.fullName}
            onChange={handleChange}
            placeholder="John Doe"
          />

          <Input
            label="Section"
            id="section"
            name="section"
            type="text"
            required
            value={formData.section}
            onChange={handleChange}
            placeholder="e.g. CSE-A 3rd Year"
          />

          <Input
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
              icon={!loading ? UserPlus : null}
            >
              Sign up
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Already have an account? </span>
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Signup;

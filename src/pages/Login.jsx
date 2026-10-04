import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Projector, LogIn } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        toast.success('Welcome back!');
        if (profile?.role === 'hod') {
          navigate('/hod');
        } else if (profile?.role === 'cr') {
          navigate('/cr');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      toast.error(error.message || 'Error logging in');
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
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to your account to continue
        </p>
      </div>

      <Card className="w-full max-w-sm p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleLogin}>
          <Input
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
              icon={!loading ? LogIn : null}
            >
              Sign in
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Don't have an account? </span>
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;

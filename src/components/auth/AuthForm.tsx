'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useNeon } from '../../utils/supabase/provider';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export function AuthForm() {
  const router = useRouter();
  const { supabase } = useNeon();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error('Error signing in:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="surface-panel rounded-[1.25rem] border-white/[0.08] shadow-2xl sm:rounded-[1.5rem]">
      <form onSubmit={handleSignIn}>
        <CardContent className="space-y-4 p-5 sm:space-y-6 sm:p-8">
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="email" className="text-sm font-medium text-gray-200">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-white/[0.08] bg-white/[0.035] pl-10 text-white placeholder:text-muted-foreground focus:border-primary sm:h-12"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="password" className="text-sm font-medium text-gray-200">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-white/[0.08] bg-white/[0.035] pl-10 pr-10 text-white placeholder:text-muted-foreground focus:border-primary sm:h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-3 rounded-lg bg-red-900/50 border border-red-700">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3 p-5 pt-0 sm:space-y-4 sm:p-8 sm:pt-0">
          <Button 
            type="submit" 
            className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 font-medium text-white shadow-lg shadow-blue-500/15 hover:from-blue-400 hover:to-violet-400 sm:h-12"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-300">
              Don't have an account?{' '}
              <Link 
                href="/signup" 
                className="font-medium text-primary transition-colors hover:text-blue-300"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthUser {
  username: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const clearError = () => setError(null);

  const checkAuth = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/auth/check', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setError(null);
      } else {
        setUser(null);
        if (response.status === 401) {
          // Token expired or invalid
          console.log('Auth token expired or invalid');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setError('Authentication check failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setError(null);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
        setError(errorData.error || 'Invalid credentials');
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Please check your connection and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Don't show error for logout failures
    } finally {
      setUser(null);
      setError(null);
      router.push('/login');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Handle redirects after authentication status is determined
  useEffect(() => {
    if (isLoading || hasRedirected) return; // Don't redirect while loading or already redirected
    
    if (!user && pathname !== '/login') {
      // Not authenticated and not on login page -> go to login
      setHasRedirected(true);
      router.replace('/login');
    } else if (user && pathname === '/login') {
      // Authenticated and on login page -> go to homepage
      setHasRedirected(true);
      router.replace('/');
    }
  }, [user, isLoading, pathname, router, hasRedirected]);

  // Reset redirect flag when pathname changes
  useEffect(() => {
    setHasRedirected(false);
  }, [pathname]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🥞</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-900 font-semibold">Loading...</p>
          <p className="text-amber-700 font-arabic text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated (except login page)
  if (!user && pathname !== '/login') {
    return null;
  }

  const value = {
    user,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
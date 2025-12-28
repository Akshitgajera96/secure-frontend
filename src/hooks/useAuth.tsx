import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { api } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthResponse {
  error: Error | null;
  data?: {
    user: AuthUser;
    token: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setUser(parsedUser);
        setToken(storedToken);
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }

    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const data = res.data;
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role || 'user', // Default to 'user' role if not specified
      };

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(authUser));

      setUser(authUser);
      setToken(data.token);

      return { 
        error: null,
        data: {
          user: authUser,
          token: data.token
        }
      };
    } catch (err) {
      const e = err as any;
      const message =
        e?.response?.data?.message ||
        e?.message ||
        'Login failed';
      return { error: new Error(message) };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/register', { email, password });
      const data = res.data;

      if (!data) {
        return { error: new Error('Registration failed') };
      }

      return { error: null };
    } catch (err) {
      const e = err as any;
      const message =
        e?.response?.data?.message ||
        e?.message ||
        'Registration failed';
      return { error: new Error(message) };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

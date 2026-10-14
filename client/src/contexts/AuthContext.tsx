import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, saveTokens, clearAuth, getAccessToken, getUser } from '@/lib/api';

interface User {
  id: number;
  email: string;
  full_name?: string;
  company_name?: string;
  plan?: string;
  is_admin_user?: boolean;
  plan_limits?: { sites: number; sessions: number; logs: number };
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

// Make sure RegisterData includes confirmPassword
interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;  // Add this field
  full_name?: string;
  company_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = !!(user?.is_admin_user);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      const savedUser = getUser();
      
      console.log('Auth check:', { hasToken: !!token, savedUser });
      
      if (token && savedUser) {
        // Verify token is still valid with backend
        const userData = await api.me();
        console.log('Me API response:', userData);
        
        if (userData && userData.id) {
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          // Token expired or invalid
          console.log('Token invalid, clearing auth');
          clearAuth();
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    console.log('Login attempt:', { email });
    setIsLoading(true);
    try {
      const { ok, data } = await api.login(email, password);
      console.log('Login API response:', { ok, data });
      
      if (ok && data.access && data.refresh && data.user) {
        saveTokens(data.access, data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setUser(data.user);
        console.log('Login successful, user set:', data.user);
      } else {
        // Handle specific error messages from backend
        const errorMessage = data.error || data.email?.[0] || data.password?.[0] || 'Invalid email or password';
        console.error('Login failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    console.log('Register attempt:', { email: data.email });
    setIsLoading(true);
    try {
      const { ok, data: responseData } = await api.register({
        email: data.email,
        full_name: data.full_name,
        company_name: data.company_name,
        password: data.password,
        confirmPassword: data.confirmPassword,  // Now this matches
      });
      console.log('Register API response:', { ok, data: responseData });
      
      if (ok && responseData.access && responseData.refresh && responseData.user) {
        saveTokens(responseData.access, responseData.refresh);
        localStorage.setItem('user', JSON.stringify(responseData.user));
        setIsAuthenticated(true);
        setUser(responseData.user);
        console.log('Registration successful, user set:', responseData.user);
      } else {
        // Handle validation errors
        let errorMessage = 'Registration failed';
        if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.email) {
          errorMessage = responseData.email[0];
        } else if (responseData.password) {
          errorMessage = responseData.password[0];
        } else if (responseData.confirmPassword) {
          errorMessage = responseData.confirmPassword[0];
        } else if (responseData.full_name) {
          errorMessage = responseData.full_name[0];
        } else if (responseData.company_name) {
          errorMessage = responseData.company_name[0];
        }
        console.error('Registration failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('Logout called');
    await api.logout();
    setIsAuthenticated(false);
    setUser(null);
    console.log('Logout complete');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isAdmin,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
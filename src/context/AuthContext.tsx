'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
  gender: string;
  linkedin: string;
  portfolio?: string;
  teamPreference?: string;
  role: 'admin' | 'team-leader' | 'participant';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentId?: string;
  couponUsed?: string;
  amountPaid: number;
  teamId?: string;
  teamRole?: 'leader' | 'member';
  checkedIn: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  isAdmin: boolean;
  isPaid: boolean;
  hasTeam: boolean;
  isTeamLeader: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('codesprint_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const savedToken = localStorage.getItem('codesprint_token');
    if (!savedToken) {
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/auth/me', {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setToken(savedToken);
        setLoading(false);
        return userData;
      } else {
        // Token is invalid/expired
        logout();
        return null;
      }
    } catch (err) {
      console.error('Error refreshing user profile:', err);
      setLoading(false);
      return null;
    }
  }, [logout]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('codesprint_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const isAdmin = user?.role === 'admin';
  const isPaid = user?.paymentStatus === 'paid';
  const hasTeam = !!user?.teamId;
  const isTeamLeader = user?.role === 'team-leader';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refreshUser,
        isAdmin,
        isPaid,
        hasTeam,
        isTeamLeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

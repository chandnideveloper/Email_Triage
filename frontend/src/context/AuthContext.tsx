import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, name?: string, role?: string) => void;
  loginWithMicrosoft: () => void;
  logout: () => void;
}

const STORAGE_KEY = 'triageai_auth_user_v2';

const DEFAULT_USER: User = {
  name: 'A. Wright',
  email: 'a.wright@yourpractice.com.au',
  role: 'Partner',
  avatarInitials: 'AW',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return null; // Require login first
  });

  const isAuthenticated = Boolean(user);

  const login = (email: string, name?: string, role?: string) => {
    const formattedName = name || (email.split('@')[0].replace(/[._]/g, ' ') || 'Practice User');
    const initials = formattedName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

    const newUser: User = {
      email,
      name: formattedName.replace(/\b\w/g, (c) => c.toUpperCase()),
      role: role || 'Accountant / Reviewer',
      avatarInitials: initials,
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  };

  const loginWithMicrosoft = () => {
    const m365User: User = {
      name: 'Ibex Triage Admin',
      email: 'ibex.triage@aoscaustralia.com',
      role: 'Enterprise Administrator',
      avatarInitials: 'IT',
    };
    setUser(m365User);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m365User));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        loginWithMicrosoft,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

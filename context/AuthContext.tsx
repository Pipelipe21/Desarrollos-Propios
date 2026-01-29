import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../db/db';
import { User, LogType, SyncStatus, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  activeDepartment: 'bazar' | 'taller';
  isLoading: boolean;
  login: (username: string, passwordHash: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchDepartment: (dept: 'bazar' | 'taller') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<'bazar' | 'taller'>('bazar');
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const storedUserId = localStorage.getItem('dnd_user_id');
      const storedDept = localStorage.getItem('dnd_active_dept') as 'bazar' | 'taller' | null;

      if (storedUserId) {
        try {
          const foundUser = await db.users.get(parseInt(storedUserId));
          if (foundUser) {
            setUser(foundUser);
            // If user has a fixed department (not admin), force it. Else use stored or default.
            if (foundUser.role === UserRole.ADMIN) {
                setActiveDepartment(storedDept || foundUser.department);
            } else {
                setActiveDepartment(foundUser.department);
            }
          }
        } catch (error) {
          console.error("Session restore failed", error);
        }
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  const login = async (username: string, passwordHash: string) => {
    try {
      const foundUser = await db.users.where('username').equals(username).first();

      if (!foundUser) {
        return { success: false, message: 'Usuario no encontrado.' };
      }

      if (foundUser.passwordHash !== passwordHash) {
        return { success: false, message: 'Contraseña incorrecta.' };
      }

      setUser(foundUser);
      // Initialize active department
      const initialDept = foundUser.department;
      setActiveDepartment(initialDept);
      
      localStorage.setItem('dnd_user_id', foundUser.id?.toString() || '');
      localStorage.setItem('dnd_active_dept', initialDept);

      if (foundUser.id) {
        await db.logs.add({
          userId: foundUser.id,
          type: LogType.LOGIN,
          timestamp: Date.now(),
          dataJson: JSON.stringify({ action: 'login', method: 'local_auth' }),
          syncStatus: SyncStatus.PENDING
        });
      }

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Error de base de datos local.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dnd_user_id');
    localStorage.removeItem('dnd_active_dept');
  };

  const switchDepartment = (dept: 'bazar' | 'taller') => {
    if (user?.role !== UserRole.ADMIN) return; // Security check
    setActiveDepartment(dept);
    localStorage.setItem('dnd_active_dept', dept);
  };

  return (
    <AuthContext.Provider value={{ user, activeDepartment, isLoading, login, logout, switchDepartment }}>
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

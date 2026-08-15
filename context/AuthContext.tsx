import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  AuthError,
} from 'firebase/auth';
import { auth } from '../db/firebase';
import { db } from '../db/db';
import { User, LogType, SyncStatus, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  activeDepartment: 'bazar' | 'taller';
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchDepartment: (dept: 'bazar' | 'taller') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Employees sign in with a short username (no personal email required), which we
// map to a fixed-domain address so Firebase Auth can verify it server-side.
const EMAIL_DOMAIN = 'dyd-industries.local';
const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;

const mapAuthError = (code?: string): string => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Usuario o contraseña incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.';
    case 'auth/user-disabled':
      return 'Esta cuenta fue deshabilitada. Contacta al administrador.';
    case 'auth/network-request-failed':
      return 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
    default:
      return 'No se pudo iniciar sesión. Intenta nuevamente.';
  }
};

// Finds the local profile (role/department/etc.) for an authenticated Firebase user.
// On the first login after the Firebase Auth migration, no local profile has a
// firebaseUid yet, so we fall back to matching by username once and persist the
// link for next time.
const resolveLocalProfile = async (uid: string, username: string): Promise<User | undefined> => {
  const byUid = await db.users.where('firebaseUid').equals(uid).first();
  if (byUid) return byUid;

  const legacy = await db.users.where('username').equals(username.trim().toLowerCase()).first();
  if (legacy?.id) {
    await db.users.update(legacy.id, { firebaseUid: uid });
    return { ...legacy, firebaseUid: uid };
  }
  return undefined;
};

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<'bazar' | 'taller'>('bazar');
  const [isLoading, setIsLoading] = useState(true);

  // Restores the session on load/refresh. Firebase Auth persists the session in
  // IndexedDB, so this resolves instantly offline once a device has logged in once.
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await db.users.where('firebaseUid').equals(firebaseUser.uid).first();
        if (profile) {
          setUser(profile);
          const storedDept = localStorage.getItem('dnd_active_dept') as 'bazar' | 'taller' | null;
          setActiveDepartment(profile.role === UserRole.ADMIN ? (storedDept || profile.department) : profile.department);
        } else {
          // Authenticated with Firebase but this device has no matching local
          // profile (e.g. a brand new device before first `login()` linking).
          setUser(null);
        }
      } catch (error) {
        console.error('Session restore failed', error);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string) => {
    if (!auth) {
      return { success: false, message: 'Sin conexión con el servidor de autenticación. Intenta más tarde.' };
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
      const profile = await resolveLocalProfile(credential.user.uid, username);

      if (!profile) {
        await signOut(auth);
        return { success: false, message: 'Cuenta válida pero sin perfil registrado en este dispositivo. Contacta al administrador.' };
      }

      setUser(profile);
      setActiveDepartment(profile.department);
      localStorage.setItem('dnd_active_dept', profile.department);

      if (profile.id) {
        await db.logs.add({
          userId: profile.id,
          type: LogType.LOGIN,
          timestamp: Date.now(),
          dataJson: JSON.stringify({ action: 'login', method: 'firebase_auth' }),
          syncStatus: SyncStatus.PENDING,
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: mapAuthError((error as AuthError)?.code) };
    }
  };

  const logout = () => {
    if (auth) {
      signOut(auth).catch((error) => console.error('Sign out failed', error));
    }
    setUser(null);
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

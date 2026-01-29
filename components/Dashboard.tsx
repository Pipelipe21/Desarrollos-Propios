import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types';
import { LogOut, Wifi, WifiOff, Settings } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import RoleBasedRouter from './RoleBasedRouter';
import SettingsView from './Admin/SettingsView';
import BusinessSwitcher from './BusinessSwitcher';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DocumentAlerts } from './Documents/DocumentAlerts';

const Dashboard: React.FC = () => {
  const { user, logout, activeDepartment } = useAuth();
  const isOnline = useNetworkStatus();
  const [showSettings, setShowSettings] = React.useState(false);

  // Notification Logic
  const unreadNotifications = useLiveQuery(
    () => db.notifications.where({ userId: user?.id || 0, read: 0 }).count(),
    [user]
  );

  const getRoleBadge = () => {
    switch (user?.role) {
      case UserRole.ADMIN: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case UserRole.VENDEDORA: return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case UserRole.OPERADOR: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case UserRole.ESPECIALISTA: return 'bg-yellow-100 text-yellow-800 border border-yellow-500';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Dynamic Header Styles
  const headerClass = activeDepartment === 'taller' 
    ? 'bg-slate-900 border-b border-yellow-600/30' 
    : 'bg-white border-b border-pink-100 dark:bg-slate-800 dark:border-slate-700';
  
  const textClass = activeDepartment === 'taller'
    ? 'text-white'
    : 'text-slate-800 dark:text-white';

  if (showSettings) {
    return <SettingsView onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${activeDepartment === 'taller' ? 'bg-black' : 'bg-slate-50 dark:bg-slate-900'}`}>
      
      {/* Universal Header */}
      <header className={`${headerClass} shadow-sm sticky top-0 z-40 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <span className={`text-xl font-bold mr-2 ${textClass}`}>D&D</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getRoleBadge()}`}>
                  {user?.role}
                </span>
              </div>
              
              {/* The Magic Switcher */}
              <BusinessSwitcher />
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`hidden sm:flex items-center px-2 py-1 rounded text-xs font-medium ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>

              {/* Settings */}
              <button 
                onClick={() => setShowSettings(true)}
                className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ${activeDepartment === 'taller' ? 'text-slate-400 hover:text-white' : 'text-slate-500'}`}
              >
                <Settings className="w-5 h-5" />
              </button>

              <button 
                onClick={logout}
                className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ${activeDepartment === 'taller' ? 'text-slate-400 hover:text-white' : 'text-slate-500'}`}
                aria-label="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Router */}
      <main>
        {/* Alerts for Admin regardless of department */}
        {user?.role === UserRole.ADMIN && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <DocumentAlerts />
          </div>
        )}
        
        <RoleBasedRouter />
      </main>
    </div>
  );
};

export default Dashboard;

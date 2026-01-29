import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TutorialProvider } from './context/TutorialContext';
import TutorialOverlay from './components/Tutorial/TutorialOverlay';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-slate-300 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {user ? <Dashboard /> : <Login />}
      <TutorialOverlay />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TutorialProvider>
          <AppContent />
        </TutorialProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

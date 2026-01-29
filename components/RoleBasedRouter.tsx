import React from 'react';
import { useAuth } from '../context/AuthContext';
import BazarDashboard from './Bazar/BazarDashboard';
import TallerDashboard from './Machinery/TallerDashboard';

const RoleBasedRouter: React.FC = () => {
  const { activeDepartment } = useAuth();

  // Strict Separation based on active context
  if (activeDepartment === 'bazar') {
    return <BazarDashboard />;
  }

  if (activeDepartment === 'taller') {
    return <TallerDashboard />;
  }

  return null;
};

export default RoleBasedRouter;

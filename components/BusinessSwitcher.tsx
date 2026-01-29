import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Store, Wrench, RefreshCw } from 'lucide-react';

const BusinessSwitcher: React.FC = () => {
  const { user, activeDepartment, switchDepartment } = useAuth();

  // Security: Only Admins can see this switcher
  if (user?.role !== UserRole.ADMIN) return null;

  const toggle = () => {
    switchDepartment(activeDepartment === 'bazar' ? 'taller' : 'bazar');
  };

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-300
        ${activeDepartment === 'bazar' 
          ? 'bg-white text-pink-600 border-pink-200 hover:bg-pink-50' 
          : 'bg-slate-900 text-yellow-500 border-yellow-600 hover:bg-black'}
      `}
      title="Cambiar Unidad de Negocio"
    >
      <div className="relative w-5 h-5">
        <Store 
          className={`absolute inset-0 w-5 h-5 transition-transform duration-300 ${activeDepartment === 'bazar' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} 
        />
        <Wrench 
          className={`absolute inset-0 w-5 h-5 transition-transform duration-300 ${activeDepartment === 'taller' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`} 
        />
      </div>
      <span className="text-xs font-bold uppercase hidden sm:block">
        {activeDepartment === 'bazar' ? 'Vista Bazar' : 'Vista Taller'}
      </span>
      <RefreshCw className="w-3 h-3 opacity-50" />
    </button>
  );
};

export default BusinessSwitcher;

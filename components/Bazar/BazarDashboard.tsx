import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { ShoppingBag, Store, TrendingUp, AlertCircle, Clock, Sparkles, PieChart } from 'lucide-react';
import POS from '../POS/POS';
import InventoryManager from '../InventoryManager';
import AttendanceModule from '../HR/AttendanceModule';
import AIReportModal from '../Admin/AIReportModal';
import FinancialDashboard from './FinancialDashboard';
import { UserRole } from '../../types';

const BazarDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<'pos' | 'inventory' | 'attendance' | 'financial' | null>(null);
  const [showAI, setShowAI] = useState(false);

  // KPIs for Bazar
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const salesToday = useLiveQuery(
    () => db.sales.where('timestamp').above(today.getTime()).toArray()
  );

  const lowStockProducts = useLiveQuery(
    () => db.products.filter(p => p.stockTotal <= 5).count()
  );

  const totalSalesAmount = salesToday?.reduce((acc, s) => acc + s.total, 0) || 0;

  // ROUTING WITHIN BAZAR
  if (activeModule === 'pos') {
    return (
      <div className="relative">
         <button onClick={() => setActiveModule(null)} className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold uppercase">
            Volver al Menú
         </button>
         <POS />
      </div>
    );
  }

  if (activeModule === 'inventory') {
    return (
      <div className="relative">
         <button onClick={() => setActiveModule(null)} className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold uppercase">
            Volver al Menú
         </button>
         <InventoryManager />
      </div>
    );
  }

  if (activeModule === 'attendance') {
    return (
      <div className="relative">
         <button onClick={() => setActiveModule(null)} className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold uppercase">
            Volver al Menú
         </button>
         <AttendanceModule />
      </div>
    );
  }

  if (activeModule === 'financial') {
    return <FinancialDashboard onBack={() => setActiveModule(null)} />;
  }

  return (
    <div className="min-h-screen bg-pink-50/50 dark:bg-slate-900 p-6 animate-in fade-in duration-500">
       
       {showAI && <AIReportModal onClose={() => setShowAI(false)} />}

       <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-pink-700 dark:text-pink-400 uppercase tracking-tight">D&D Bazar</h1>
            <p className="text-slate-500 font-medium">Panel de Ventas - {user?.fullName}</p>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => setShowAI(true)}
               className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-pink-200 dark:border-slate-700 text-pink-600 dark:text-pink-400 font-bold flex items-center gap-2 hover:bg-pink-50 transition-colors"
             >
                <Sparkles className="w-5 h-5" /> Consultor IA
             </button>
             <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-pink-100 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Ventas Hoy</span>
                <span className="text-xl font-black text-slate-800 dark:text-white">${totalSalesAmount.toLocaleString('es-CL')}</span>
             </div>
          </div>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Module: POS */}
          <div 
            onClick={() => setActiveModule('pos')}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-pink-300 transition-all group"
          >
             <div className="bg-pink-100 dark:bg-pink-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6 text-pink-600 dark:text-pink-400" />
             </div>
             <h3 className="font-bold text-slate-800 dark:text-white text-lg">Punto de Venta</h3>
             <p className="text-sm text-slate-500">Caja, Ventas y Devoluciones</p>
          </div>

          {/* Module: Inventory */}
          <div 
            onClick={() => setActiveModule('inventory')}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
          >
             <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
             </div>
             <h3 className="font-bold text-slate-800 dark:text-white text-lg">Inventario</h3>
             <p className="text-sm text-slate-500">Productos, Stock y Precios</p>
          </div>

          {/* Module: Attendance */}
          <div 
            onClick={() => setActiveModule('attendance')}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group"
          >
             <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
             </div>
             <h3 className="font-bold text-slate-800 dark:text-white text-lg">Mi Asistencia</h3>
             <p className="text-sm text-slate-500">Entrada, Salida y Horas</p>
          </div>

          {/* Module: Financial (ADMIN ONLY) */}
          {user?.role === UserRole.ADMIN && (
             <div 
               onClick={() => setActiveModule('financial')}
               className="bg-gradient-to-br from-white to-pink-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl shadow-sm border border-pink-200 dark:border-pink-900/50 cursor-pointer hover:shadow-lg hover:border-pink-500 hover:scale-[1.02] transition-all group relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-2 bg-pink-500 text-white text-[10px] font-bold uppercase rounded-bl-xl shadow-md">Panel Admin</div>
                <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Finanzas Avanzadas</h3>
                <p className="text-sm text-slate-500">KPIs, Utilidad & Estrategia IA</p>
             </div>
          )}

       </div>

       {/* Quick Alerts Section */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
             <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> Alertas de Stock
             </h3>
             {lowStockProducts && lowStockProducts > 0 ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-800 dark:text-red-200 text-sm">
                   Tienes <strong>{lowStockProducts} productos</strong> con stock bajo (menos de 5 unidades).
                </div>
             ) : (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-800 dark:text-green-200 text-sm">
                   Todo el inventario está saludable.
                </div>
             )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
             <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" /> Rendimiento
             </h3>
             <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl text-center">
                   <span className="text-2xl font-black text-slate-800 dark:text-white">{salesToday?.length || 0}</span>
                   <span className="block text-xs font-bold text-slate-400 uppercase mt-1">Ventas Hoy</span>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl text-center">
                   <span className="text-2xl font-black text-slate-800 dark:text-white">--</span>
                   <span className="block text-xs font-bold text-slate-400 uppercase mt-1">Meta Mensual</span>
                </div>
             </div>
          </div>
       </div>

    </div>
  );
};

export default BazarDashboard;

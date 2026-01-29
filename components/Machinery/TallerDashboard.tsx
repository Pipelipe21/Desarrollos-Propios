import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Wrench, Truck, ClipboardList, Clock, Activity, Sparkles, BrainCircuit, Book, Bot } from 'lucide-react';
import FleetDashboard from './FleetDashboard';
import SpecialistDashboard from './SpecialistDashboard';
import AttendanceModule from '../HR/AttendanceModule';
import AIReportModal from '../Admin/AIReportModal';
import TaskBoard from '../Tasks/TaskBoard';
import PreventiveAssistant from './PreventiveAssistant';
import LibraryManager from './LibraryManager';
import TechnicalAssistant from './TechnicalAssistant';
import { UserRole } from '../../types';

const TallerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<'fleet' | 'tasks' | 'attendance' | null>(null);
  
  // Modals
  const [showAI, setShowAI] = useState(false);
  const [showTaskBoard, setShowTaskBoard] = useState(false);
  const [showPreventive, setShowPreventive] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showTechAssist, setShowTechAssist] = useState(false);

  // KPIs for Taller
  const machines = useLiveQuery(() => db.equipment.toArray());
  const pendingOTs = useLiveQuery(() => db.workOrders.where('status').equals('in_process').count());
  const myPendingTasks = useLiveQuery(() => 
    db.tasks.where('assignedTo').equals(user?.id || 0).and(t => t.status === 'pending').count(), 
    [user]
  );

  const maintenanceAlerts = machines?.filter(m => (m.nextMaintenanceAt - m.currentHourMeter) <= 50).length || 0;

  // ROUTING WITHIN TALLER
  if (activeModule === 'fleet') {
    return <FleetDashboard onBack={() => setActiveModule(null)} />;
  }

  if (activeModule === 'tasks') {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-50">
           <button onClick={() => setActiveModule(null)} className="bg-slate-800 text-white px-4 py-2 rounded-sm text-xs font-bold uppercase border border-yellow-500">
             Volver al Panel
           </button>
        </div>
        <SpecialistDashboard />
      </div>
    );
  }

  if (activeModule === 'attendance') {
    return (
       <div className="relative pt-16 bg-slate-950 min-h-screen">
         <div className="absolute top-4 right-4 z-50">
           <button onClick={() => setActiveModule(null)} className="bg-slate-800 text-white px-4 py-2 rounded-sm text-xs font-bold uppercase border border-yellow-500">
             Volver al Panel
           </button>
        </div>
        <AttendanceModule />
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-6 animate-in fade-in duration-500">
       
       {showAI && <AIReportModal onClose={() => setShowAI(false)} />}
       {showTaskBoard && <TaskBoard onClose={() => setShowTaskBoard(false)} />}
       {showPreventive && <PreventiveAssistant onClose={() => setShowPreventive(false)} />}
       {showLibrary && <LibraryManager onClose={() => setShowLibrary(false)} />}
       {showTechAssist && <TechnicalAssistant onClose={() => setShowTechAssist(false)} />}

       <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <Wrench className="w-8 h-8 text-yellow-500" />
               <h1 className="text-3xl font-black text-white uppercase tracking-widest">D&D Taller</h1>
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-1">
               UNIDAD DE MAQUINARIA PESADA // {user?.fullName}
            </p>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
             {/* Admin AI Button */}
             {user?.role === UserRole.ADMIN && (
               <button 
                 onClick={() => setShowAI(true)}
                 className="bg-slate-800 text-slate-300 px-3 py-2 font-bold uppercase flex items-center gap-2 hover:bg-slate-700 transition-colors border border-slate-600 text-xs"
               >
                  <Sparkles className="w-4 h-4" /> Reporte Admin
               </button>
             )}

             {/* Library Manager */}
             {user?.role === UserRole.ADMIN && (
                <button 
                  onClick={() => setShowLibrary(true)}
                  className="bg-slate-800 text-yellow-500 px-3 py-2 font-bold uppercase flex items-center gap-2 hover:bg-slate-700 transition-colors border border-yellow-600/30 text-xs"
                >
                    <Book className="w-4 h-4" /> Manuales PDF
                </button>
             )}

             {/* Tech AI Button */}
             <button 
               onClick={() => setShowPreventive(true)}
               className="bg-blue-900/50 text-blue-400 border border-blue-500/50 px-3 py-2 font-bold uppercase flex items-center gap-2 hover:bg-blue-900 transition-colors text-xs"
             >
                <BrainCircuit className="w-4 h-4" /> Predictivo
             </button>

             {/* Dual AI Chat */}
             <button 
               onClick={() => setShowTechAssist(true)}
               className="bg-emerald-900/50 text-emerald-400 border border-emerald-500/50 px-3 py-2 font-bold uppercase flex items-center gap-2 hover:bg-emerald-900 transition-colors text-xs"
             >
                <Bot className="w-4 h-4" /> Asistente
             </button>

          </div>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Module: FLEET */}
          <div 
            onClick={() => setActiveModule('fleet')}
            className="bg-slate-900 p-6 border-2 border-slate-800 hover:border-yellow-500 cursor-pointer transition-all group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Truck className="w-24 h-24 text-white" />
             </div>
             <div className="relative z-10">
                <h3 className="font-bold text-white text-xl uppercase mb-2">Flota & Taller</h3>
                <p className="text-xs text-slate-400 mb-6 max-w-[80%]">
                   Gestión de equipos, horómetros, pañol de herramientas y repuestos.
                </p>
                <span className="text-yellow-500 text-xs font-bold uppercase underline">Acceder &rarr;</span>
             </div>
          </div>

          {/* Module: TASKS (Combined OTs and Task Board) */}
          <div 
            className="bg-slate-900 p-6 border-2 border-slate-800 hover:border-blue-500 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ClipboardList className="w-24 h-24 text-white" />
             </div>
             <div className="relative z-10">
                <h3 className="font-bold text-white text-xl uppercase mb-2">Tareas & OTs</h3>
                <p className="text-xs text-slate-400 mb-4 max-w-[80%]">
                   Órdenes de trabajo técnicas y asignaciones administrativas.
                </p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setActiveModule('tasks')} className="text-left text-blue-500 text-xs font-bold uppercase underline">
                    Ver OTs Técnicas &rarr;
                  </button>
                  <button onClick={() => setShowTaskBoard(true)} className="text-left text-purple-400 text-xs font-bold uppercase underline flex items-center gap-2">
                    Gestión de Tareas {myPendingTasks ? `(${myPendingTasks})` : ''} &rarr;
                  </button>
                </div>
             </div>
          </div>

          {/* Module: ATTENDANCE */}
          <div 
            onClick={() => setActiveModule('attendance')}
            className="bg-slate-900 p-6 border-2 border-slate-800 hover:border-emerald-500 cursor-pointer transition-all group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock className="w-24 h-24 text-white" />
             </div>
             <div className="relative z-10">
                <h3 className="font-bold text-white text-xl uppercase mb-2">Control Asistencia</h3>
                <p className="text-xs text-slate-400 mb-6 max-w-[80%]">
                   Registro de entrada/salida y ubicación GPS en faena.
                </p>
                <span className="text-emerald-500 text-xs font-bold uppercase underline">Marcar &rarr;</span>
             </div>
          </div>

       </div>
       
       <div className="mt-10 bg-slate-900 border border-slate-800 p-4 flex justify-between items-end">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono flex-1">
             <div>
                <span className="text-slate-600 block">DB Versión</span>
                <span className="text-slate-300">v12 (PDF RAG)</span>
             </div>
             <div>
                <span className="text-slate-600 block">Rol Actual</span>
                <span className="text-slate-300 uppercase">{user?.role}</span>
             </div>
             <div>
                <span className="text-slate-600 block">Departamento</span>
                <span className={`uppercase font-bold ${user?.department === 'taller' ? 'text-yellow-500' : 'text-pink-500'}`}>
                   {user?.department}
                </span>
             </div>
          </div>
          <div className="text-right">
             <div className="bg-slate-900 px-4 py-2 border border-red-900/50 rounded-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Alertas Mant.</span>
                <span className={`text-xl font-bold ${maintenanceAlerts > 0 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                  {maintenanceAlerts}
                </span>
             </div>
          </div>
       </div>

    </div>
  );
};

export default TallerDashboard;
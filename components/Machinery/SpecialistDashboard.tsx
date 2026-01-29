import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Clock, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import WorkOrderView from './WorkOrder/WorkOrderView';

const SpecialistDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedOtId, setSelectedOtId] = useState<number | null>(null);

  // Fetch OTs assigned to me
  const myTasks = useLiveQuery(
    () => db.workOrders
      .where('technicianId').equals(user?.id || 0)
      .reverse()
      .toArray(),
    [user]
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-500 text-black';
      case 'in_process': return 'bg-blue-600 text-white animate-pulse';
      case 'finished': return 'bg-emerald-600 text-white';
      case 'validated': return 'bg-purple-600 text-white';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  if (selectedOtId) {
    return <WorkOrderView workOrderId={selectedOtId} onBack={() => setSelectedOtId(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 pb-20">
       <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-white">Mis Tareas</h1>
            <p className="text-xs text-yellow-500 font-bold">PANEL DE TÉCNICO ESPECIALISTA</p>
          </div>
          <div className="relative">
             <Bell className="w-6 h-6 text-slate-400" />
             <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </div>
       </div>

       <div className="space-y-4">
          {myTasks?.map(ot => (
            <div 
              key={ot.id} 
              onClick={() => setSelectedOtId(ot.id!)}
              className="bg-slate-900 border-l-4 border-yellow-500 p-4 rounded shadow-lg active:scale-[0.98] transition-transform"
            >
               <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getStatusBadge(ot.status)}`}>
                    {ot.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(ot.createdAt).toLocaleDateString()}
                  </span>
               </div>
               
               <h3 className="text-lg font-bold text-white mb-1">OT #{ot.id}: {ot.title}</h3>
               <p className="text-sm text-slate-400 line-clamp-2">{ot.description}</p>
               
               <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                  <div className="flex gap-2">
                     <div className="flex items-center gap-1 text-xs text-slate-500">
                       <ClipboardList className="w-4 h-4" /> {ot.checklist.filter(c => c.completed).length}/{ot.checklist.length}
                     </div>
                  </div>
                  {ot.priority === 'high' && (
                    <div className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase">
                       <AlertCircle className="w-4 h-4" /> Prioridad Alta
                    </div>
                  )}
               </div>
            </div>
          ))}

          {(!myTasks || myTasks.length === 0) && (
            <div className="text-center py-20 opacity-50">
               <ClipboardList className="w-16 h-16 mx-auto mb-4" />
               <p>No tienes órdenes de trabajo asignadas.</p>
            </div>
          )}
       </div>
    </div>
  );
};

export default SpecialistDashboard;

import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Equipment } from '../../types';
import { Wrench, AlertTriangle, FileText, CheckSquare, Activity, Battery, ArrowLeft, Package, Settings } from 'lucide-react';
import DiagnosticAssistant from './DiagnosticAssistant';
import WorkshopDashboard from './WorkshopDashboard';
import MachineProfile from './MachineProfile';

const FleetDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState<Equipment | null>(null);
  const [showWorkshop, setShowWorkshop] = useState(false);
  
  const equipment = useLiveQuery(() => db.equipment.toArray());

  // Helper to determine status color
  const getStatusColor = (eq: Equipment) => {
    const hoursLeft = eq.nextMaintenanceAt - eq.currentHourMeter;
    if (hoursLeft <= 0) return 'bg-red-600 border-red-800 text-white animate-pulse'; // CRITICAL
    if (hoursLeft <= 50) return 'bg-yellow-500 border-yellow-600 text-black'; // WARNING
    return 'bg-emerald-600 border-emerald-800 text-white'; // OK
  };

  if (showWorkshop) {
    return <WorkshopDashboard onBack={() => setShowWorkshop(false)} />;
  }

  if (selectedMachineId) {
    return <MachineProfile machineId={selectedMachineId} onBack={() => setSelectedMachineId(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono pb-20">
      {showDiagnostic && (
        <DiagnosticAssistant 
          machine={showDiagnostic} 
          onClose={() => setShowDiagnostic(null)} 
        />
      )}

      {/* Industrial Header */}
      <div className="bg-slate-900 border-b-4 border-yellow-500 p-6 flex justify-between items-center sticky top-0 z-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 border border-slate-600 hover:bg-slate-800 text-yellow-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white">Módulo Tuerca</h1>
            <p className="text-xs text-yellow-500 font-bold">GESTIÓN DE FLOTA v2.0</p>
          </div>
        </div>
        
        {/* Navigation to Workshop */}
        <button 
           onClick={() => setShowWorkshop(true)}
           className="hidden sm:flex bg-slate-800 border border-yellow-500/50 text-yellow-500 px-4 py-2 hover:bg-slate-700 items-center gap-2 font-bold uppercase text-xs"
        >
           <Package className="w-4 h-4" /> Ir a Taller / Pañol
        </button>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        
        {/* Mobile Workshop Button */}
        <div className="sm:hidden mb-6">
           <button 
             onClick={() => setShowWorkshop(true)}
             className="w-full bg-slate-800 border border-yellow-500 text-yellow-500 py-3 font-bold uppercase flex justify-center items-center gap-2"
           >
             <Package className="w-5 h-5" /> Gestión de Taller y Repuestos
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment?.map(eq => {
            const hoursLeft = eq.nextMaintenanceAt - eq.currentHourMeter;
            const statusClass = getStatusColor(eq);

            return (
              <div key={eq.id} className="bg-slate-900 border-2 border-slate-800 rounded-sm overflow-hidden hover:border-slate-600 transition-colors shadow-xl flex flex-col relative group">
                
                {/* Config Button (Hover) */}
                <button 
                  onClick={() => setSelectedMachineId(eq.id!)}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-yellow-500 hover:text-black rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                    <Settings className="w-5 h-5" />
                </button>

                {/* Machine Header */}
                <div 
                   onClick={() => setSelectedMachineId(eq.id!)}
                   className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-start cursor-pointer hover:bg-slate-900"
                >
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-wider">{eq.brand}</h3>
                    <div className="text-3xl font-black text-yellow-500 mt-1">{eq.model}</div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-slate-500 uppercase">Patente</span>
                    <span className="bg-white text-black px-2 py-0.5 font-bold text-sm border border-slate-400 rounded-sm">
                      {eq.licensePlate}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="p-4 grid grid-cols-2 gap-4 bg-slate-900/50">
                   <div>
                     <span className="text-xs text-slate-500 uppercase block mb-1">Horómetro</span>
                     <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                       {eq.currentHourMeter.toLocaleString()} <span className="text-xs text-slate-600">HRS</span>
                     </div>
                   </div>
                   <div>
                     <span className="text-xs text-slate-500 uppercase block mb-1">Próx. Mantención</span>
                     <div className={`text-lg font-bold px-2 py-1 inline-block rounded-sm ${hoursLeft < 0 ? 'bg-red-600/20 text-red-500' : 'text-slate-300'}`}>
                       {hoursLeft} HRS RESTANTES
                     </div>
                   </div>
                </div>

                {/* Status Bar */}
                <div className={`h-2 w-full ${hoursLeft <= 0 ? 'bg-red-600' : hoursLeft <= 50 ? 'bg-yellow-500' : 'bg-emerald-600'}`}></div>

                {/* Actions */}
                <div className="p-4 grid grid-cols-2 gap-2 mt-auto">
                   <button 
                     onClick={() => setShowDiagnostic(eq)}
                     className="bg-slate-800 hover:bg-slate-700 text-yellow-500 border border-slate-700 py-3 font-bold uppercase text-xs flex flex-col items-center justify-center gap-1 group"
                   >
                     <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     Diagnóstico IA
                   </button>
                   
                   <button 
                     className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-3 font-bold uppercase text-xs flex flex-col items-center justify-center gap-1 group"
                     onClick={() => alert("Checklist Pre-operacional (Próximamente)")}
                   >
                     <CheckSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     Checklist
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FleetDashboard;

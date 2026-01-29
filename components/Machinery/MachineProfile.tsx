import React, { useState } from 'react';
import { db } from '../../db/db';
import { Equipment, UserRole, LogType, SyncStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Save, Lock, Unlock, AlertTriangle, History, ArrowLeft, Shield } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface MachineProfileProps {
  machineId: number;
  onBack: () => void;
}

const MachineProfile: React.FC<MachineProfileProps> = ({ machineId, onBack }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [locked, setLocked] = useState(true);
  
  // Fetch Data
  const machine = useLiveQuery(() => db.equipment.get(machineId), [machineId]);
  const history = useLiveQuery(
    () => db.machineLogs.where('machineId').equals(machineId).reverse().toArray(),
    [machineId]
  );

  // Form State
  const [formData, setFormData] = useState<Partial<Equipment>>({});

  // Sync formData when machine loads
  React.useEffect(() => {
    if (machine) setFormData(machine);
  }, [machine]);

  if (!machine || !formData) return <div className="p-8 text-white">Cargando ficha técnica...</div>;

  const isAdmin = user?.role === UserRole.ADMIN;

  const handleSave = async () => {
    if (!formData.licensePlate) return alert('La Patente es obligatoria.');
    if (!formData.brand || !formData.model) return alert('Marca y Modelo son obligatorios.');
    if ((formData.nextMaintenanceAt || 0) < (formData.currentHourMeter || 0)) {
        return alert('La próxima mantención no puede ser menor al horómetro actual.');
    }

    try {
      await db.transaction('rw', db.equipment, db.machineLogs, db.logs, async () => {
        // 1. Audit Changes
        const changes: string[] = [];
        
        if (formData.licensePlate !== machine.licensePlate) {
          await db.machineLogs.add({
            machineId, userId: user!.id!, timestamp: Date.now(),
            fieldChanged: 'Patente', oldValue: machine.licensePlate, newValue: formData.licensePlate || ''
          });
          changes.push('Patente');
        }
        
        if (formData.currentHourMeter !== machine.currentHourMeter) {
           await db.machineLogs.add({
            machineId, userId: user!.id!, timestamp: Date.now(),
            fieldChanged: 'Horómetro', oldValue: String(machine.currentHourMeter), newValue: String(formData.currentHourMeter)
          });
        }

        // 2. Update Machine
        await db.equipment.update(machineId, formData);

        // 3. General Log
        if (changes.length > 0) {
           await db.logs.add({
             userId: user!.id!, type: LogType.MACHINE_UPDATE, timestamp: Date.now(),
             dataJson: JSON.stringify({ changes }), syncStatus: SyncStatus.PENDING
           });
        }
      });

      setIsEditing(false);
      setLocked(true);
      alert('Ficha actualizada correctamente.');
    } catch (e) {
      console.error(e);
      alert('Error al guardar cambios.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono pb-20">
      {/* Header */}
      <div className="bg-slate-900 border-b-4 border-yellow-500 p-6 sticky top-0 z-20 shadow-xl flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 border border-slate-600 hover:bg-slate-800 text-yellow-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white">Ficha Técnica</h1>
            <p className="text-xs text-slate-400">ID: {machine.id} // {machine.brand}</p>
          </div>
        </div>
        
        {isAdmin && (
           <button 
             onClick={() => {
                if (locked) {
                    if (confirm('¿Desbloquear campos críticos? Esta acción quedará registrada.')) {
                        setLocked(false);
                        setIsEditing(true);
                    }
                } else {
                    setLocked(true);
                    setIsEditing(false);
                }
             }}
             className={`flex items-center gap-2 px-4 py-2 font-bold uppercase border-2 transition-colors ${
                locked ? 'border-red-600 text-red-500 hover:bg-red-900/20' : 'border-green-500 text-green-500 hover:bg-green-900/20'
             }`}
           >
             {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
             {locked ? 'Protegido' : 'Edición Admin'}
           </button>
        )}
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Main Profile Form */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Critical Data Section */}
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-sm relative overflow-hidden">
               {locked && <div className="absolute top-0 right-0 p-2 bg-slate-800 text-slate-500 text-xs font-bold uppercase flex gap-1"><Shield className="w-3 h-3"/> Solo Lectura</div>}
               
               <h3 className="text-yellow-500 font-bold uppercase mb-4 border-b border-slate-700 pb-2">Identificación de Activo</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marca</label>
                     <input 
                       disabled={locked}
                       className="w-full bg-black border border-slate-700 p-3 text-white focus:border-yellow-500 outline-none disabled:opacity-50"
                       value={formData.brand || ''}
                       onChange={e => setFormData({...formData, brand: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo</label>
                     <input 
                       disabled={locked}
                       className="w-full bg-black border border-slate-700 p-3 text-white focus:border-yellow-500 outline-none disabled:opacity-50"
                       value={formData.model || ''}
                       onChange={e => setFormData({...formData, model: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-red-500 uppercase mb-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Patente (PPU)
                     </label>
                     <input 
                       disabled={locked}
                       className="w-full bg-black border border-red-900/50 p-3 text-yellow-500 font-bold focus:border-red-500 outline-none disabled:opacity-50"
                       value={formData.licensePlate || ''}
                       onChange={e => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-red-500 uppercase mb-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Nº Serie (VIN)
                     </label>
                     <input 
                       disabled={locked}
                       className="w-full bg-black border border-slate-700 p-3 text-slate-400 focus:border-yellow-500 outline-none disabled:opacity-50"
                       value={formData.vin || ''}
                       onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})}
                     />
                  </div>
               </div>
            </div>

            {/* Operational Data */}
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-sm">
               <h3 className="text-blue-400 font-bold uppercase mb-4 border-b border-slate-700 pb-2">Estado Operacional</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horómetro Actual</label>
                     <input 
                       type="number"
                       // Can edit hour meter if user is admin OR if it's an update (handled separately usually, but allowing here for demo)
                       disabled={locked} 
                       className="w-full bg-black border border-slate-700 p-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 font-mono text-xl"
                       value={formData.currentHourMeter || 0}
                       onChange={e => setFormData({...formData, currentHourMeter: Number(e.target.value)})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Próx. Mantención</label>
                     <input 
                       type="number"
                       disabled={locked}
                       className="w-full bg-black border border-slate-700 p-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 font-mono text-xl"
                       value={formData.nextMaintenanceAt || 0}
                       onChange={e => setFormData({...formData, nextMaintenanceAt: Number(e.target.value)})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                     <select 
                       disabled={!isAdmin && locked} // Only admin can change status manually usually
                       value={formData.status}
                       onChange={e => setFormData({...formData, status: e.target.value as any})}
                       className="w-full bg-black border border-slate-700 p-3 text-white focus:border-blue-500 outline-none"
                     >
                        <option value="operative">Operativa</option>
                        <option value="maintenance">En Mantención</option>
                        <option value="repair">En Reparación</option>
                     </select>
                  </div>
               </div>
            </div>

            {!locked && (
                <div className="flex gap-4">
                    <button 
                        onClick={() => { setFormData(machine); setIsEditing(false); setLocked(true); }}
                        className="flex-1 py-4 border border-slate-600 text-slate-400 font-bold uppercase hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-1 py-4 bg-emerald-600 text-white font-bold uppercase hover:bg-emerald-500 shadow-lg shadow-emerald-900/50 flex justify-center items-center gap-2"
                    >
                        <Save className="w-5 h-5" /> Guardar Cambios
                    </button>
                </div>
            )}
         </div>

         {/* Sidebar: Audit Log */}
         <div className="space-y-6">
            <div className="bg-slate-900 border-l-4 border-slate-700 p-4">
               <h3 className="font-bold text-slate-400 uppercase flex items-center gap-2 mb-4">
                  <History className="w-4 h-4" /> Historial de Cambios
               </h3>
               <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {history?.map(log => (
                     <div key={log.id} className="text-xs border-b border-slate-800 pb-2 mb-2">
                        <div className="flex justify-between text-slate-500 mb-1">
                           <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                           <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-300">
                           <span className="font-bold text-yellow-500">{log.fieldChanged}</span> modificado.
                        </p>
                        <div className="mt-1 font-mono bg-black/50 p-1.5 rounded text-slate-500 truncate">
                           <span className="text-red-400 line-through mr-2">{log.oldValue}</span>
                           <span className="text-emerald-400">{log.newValue}</span>
                        </div>
                     </div>
                  ))}
                  {(!history || history.length === 0) && (
                     <p className="text-slate-600 italic text-sm">Sin cambios registrados.</p>
                  )}
               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default MachineProfile;

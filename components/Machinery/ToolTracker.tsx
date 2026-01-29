import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Tool, LogType, SyncStatus } from '../../types';
import { Wrench, CheckCircle, AlertTriangle, User, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ToolTrackerProps {
  onClose: () => void;
}

const ToolTracker: React.FC<ToolTrackerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [assigneeName, setAssigneeName] = useState('');

  const tools = useLiveQuery(
    () => db.tools
      .filter(t => t.name.toLowerCase().includes(filter.toLowerCase()))
      .toArray(),
    [filter]
  );

  const handleAction = async (action: 'checkout' | 'return') => {
    if (!selectedTool) return;
    if (action === 'checkout' && !assigneeName) return alert('Debes indicar quién retira la herramienta.');

    try {
      // Update Tool Status
      await db.tools.update(selectedTool.id!, {
        status: action === 'checkout' ? 'in_use' : 'available',
        assignedTo: action === 'checkout' ? assigneeName : undefined,
        lastMovement: Date.now()
      });

      // Log Transaction
      if (user?.id && selectedTool.id) {
        await db.toolLogs.add({
          toolId: selectedTool.id,
          userId: user.id,
          action: action,
          timestamp: Date.now(),
          syncStatus: SyncStatus.PENDING
        });

        await db.logs.add({
          userId: user.id,
          type: action === 'checkout' ? LogType.TOOL_CHECKOUT : LogType.TOOL_RETURN,
          timestamp: Date.now(),
          dataJson: JSON.stringify({ tool: selectedTool.name, who: assigneeName }),
          syncStatus: SyncStatus.PENDING
        });
      }

      setSelectedTool(null);
      setAssigneeName('');
    } catch (e) {
      console.error(e);
      alert('Error al actualizar herramienta.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border-2 border-yellow-600 rounded-sm flex flex-col h-[80vh] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-yellow-500 p-4 flex justify-between items-center">
          <h2 className="text-black font-black text-xl uppercase tracking-widest flex items-center gap-2">
            <Wrench className="w-6 h-6" /> Control de Pañol
          </h2>
          <button onClick={onClose} className="border-2 border-black px-2 hover:bg-black hover:text-yellow-500 transition-colors uppercase font-bold text-sm">
            Cerrar [X]
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          
          {/* List Side */}
          <div className="w-1/2 border-r border-slate-800 p-4 flex flex-col">
             <input 
               type="text" 
               placeholder="BUSCAR HERRAMIENTA..."
               value={filter}
               onChange={e => setFilter(e.target.value)}
               className="bg-black border border-slate-700 text-yellow-500 p-3 mb-4 focus:border-yellow-500 outline-none uppercase font-bold placeholder:text-slate-700"
             />
             
             <div className="flex-1 overflow-y-auto space-y-2">
               {tools?.map(tool => (
                 <div 
                   key={tool.id} 
                   onClick={() => setSelectedTool(tool)}
                   className={`p-3 border cursor-pointer transition-colors ${
                     selectedTool?.id === tool.id 
                     ? 'bg-yellow-500/20 border-yellow-500' 
                     : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                   }`}
                 >
                   <div className="flex justify-between items-start">
                     <div>
                       <div className="text-white font-bold">{tool.name}</div>
                       <div className="text-xs text-slate-500 uppercase">{tool.brand}</div>
                     </div>
                     <div className={`text-[10px] px-1 py-0.5 font-bold uppercase ${tool.status === 'in_use' ? 'bg-red-900 text-red-200' : 'bg-emerald-900 text-emerald-200'}`}>
                       {tool.status === 'in_use' ? 'EN USO' : 'DISPONIBLE'}
                     </div>
                   </div>
                   {tool.status === 'in_use' && (
                     <div className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
                       <User className="w-3 h-3" /> {tool.assignedTo}
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>

          {/* Action Side */}
          <div className="w-1/2 p-6 flex flex-col items-center justify-center bg-slate-900/50">
             {selectedTool ? (
               <div className="w-full max-w-sm space-y-6">
                 <div className="text-center">
                   <Wrench className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                   <h3 className="text-2xl text-white font-bold">{selectedTool.name}</h3>
                   <p className="text-slate-400 text-sm uppercase mb-6">ID: {selectedTool.id} // {selectedTool.brand}</p>
                 </div>

                 {selectedTool.status === 'available' ? (
                   <div className="bg-slate-900 p-4 border border-slate-700">
                      <label className="block text-yellow-500 text-xs font-bold uppercase mb-2">Asignar a:</label>
                      <input 
                        type="text" 
                        value={assigneeName}
                        onChange={e => setAssigneeName(e.target.value)}
                        placeholder="NOMBRE DEL TÉCNICO"
                        className="w-full bg-black border border-slate-600 p-3 text-white mb-4 uppercase focus:border-yellow-500 outline-none"
                      />
                      <button 
                        onClick={() => handleAction('checkout')}
                        disabled={!assigneeName}
                        className="w-full py-4 bg-yellow-600 text-black font-bold uppercase tracking-widest hover:bg-yellow-500 disabled:opacity-50"
                      >
                        Registrar Préstamo
                      </button>
                   </div>
                 ) : (
                   <div className="bg-slate-900 p-4 border border-slate-700 text-center">
                      <div className="text-red-500 font-bold mb-4 flex items-center justify-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        EN PODER DE: {selectedTool.assignedTo}
                      </div>
                      <button 
                         onClick={() => handleAction('return')}
                         className="w-full py-4 bg-emerald-700 text-white font-bold uppercase tracking-widest hover:bg-emerald-600"
                      >
                        Registrar Devolución
                      </button>
                   </div>
                 )}
               </div>
             ) : (
               <div className="text-slate-600 text-center">
                 <RefreshCw className="w-12 h-12 mx-auto mb-2 opacity-50" />
                 <p className="uppercase font-bold">Selecciona una herramienta<br/>del listado para gestionar.</p>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ToolTracker;

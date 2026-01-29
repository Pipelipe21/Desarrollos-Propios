import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { SparePart } from '../../types';
import { consultWorkshopAssistant } from '../../logic/AIService';
import { Search, Wrench, Package, AlertOctagon, MessageSquare, Send, ArrowLeft, ScanLine } from 'lucide-react';
import ToolTracker from './ToolTracker';

const WorkshopDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [showTools, setShowTools] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Live Queries
  const lowStockParts = useLiveQuery(
    () => db.spareParts.filter(p => p.currentStock <= p.minStock).toArray()
  );
  
  const allParts = useLiveQuery(() => db.spareParts.toArray());

  const handleAiAsk = async () => {
    if (!aiQuery) return;
    setLoadingAi(true);
    const answer = await consultWorkshopAssistant(aiQuery);
    setAiResponse(answer);
    setLoadingAi(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono pb-20">
      {showTools && <ToolTracker onClose={() => setShowTools(false)} />}

      {/* Industrial Header */}
      <div className="bg-slate-900 border-b-4 border-yellow-500 p-6 flex justify-between items-center sticky top-0 z-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 border border-slate-600 hover:bg-slate-800 text-yellow-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white">Taller & Pañol</h1>
            <p className="text-xs text-yellow-500 font-bold">INVENTARIO TÉCNICO v1.0</p>
          </div>
        </div>
        <button 
           onClick={() => setShowTools(true)}
           className="bg-yellow-600 text-black px-4 py-2 font-bold uppercase hover:bg-yellow-500 flex items-center gap-2"
        >
           <Wrench className="w-5 h-5" /> Herramientas
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Inventory Status */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Critical Alerts */}
           {lowStockParts && lowStockParts.length > 0 && (
             <div className="bg-red-900/20 border-2 border-red-600 p-4 animate-pulse-slow">
                <h3 className="text-red-500 font-bold uppercase flex items-center gap-2 mb-3">
                  <AlertOctagon className="w-6 h-6" /> Alerta de Stock Crítico
                </h3>
                <div className="space-y-2">
                   {lowStockParts.map(part => (
                     <div key={part.id} className="flex justify-between items-center bg-black/40 p-2 border-l-4 border-red-500">
                        <div>
                          <span className="text-white font-bold">{part.name}</span>
                          <span className="text-xs text-slate-400 ml-2">OEM: {part.oemCode}</span>
                        </div>
                        <div className="text-red-400 font-bold">
                           STOCK: {part.currentStock} / MIN: {part.minStock}
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {/* Inventory Table */}
           <div className="bg-slate-900 border border-slate-800">
              <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                 <h3 className="font-bold text-slate-400 uppercase">Repuestos Generales</h3>
                 <div className="flex gap-2">
                    <button className="p-2 bg-slate-800 hover:bg-slate-700 text-yellow-500">
                       <ScanLine className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-slate-800 hover:bg-slate-700 text-white">
                       <Search className="w-5 h-5" />
                    </button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-950">
                       <tr>
                          <th className="px-4 py-3">Repuesto</th>
                          <th className="px-4 py-3">Ubicación</th>
                          <th className="px-4 py-3 text-right">Stock</th>
                       </tr>
                    </thead>
                    <tbody>
                       {allParts?.map(part => (
                         <tr key={part.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="px-4 py-3">
                               <div className="font-bold text-white">{part.name}</div>
                               <div className="text-[10px] text-slate-500">{part.brand}</div>
                            </td>
                            <td className="px-4 py-3 text-yellow-500 font-mono">{part.location}</td>
                            <td className="px-4 py-3 text-right font-bold text-white">
                               {part.currentStock}
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: AI Assistant */}
        <div className="lg:col-span-1">
           <div className="bg-slate-900 border-2 border-slate-700 h-full min-h-[500px] flex flex-col">
              <div className="p-4 border-b border-slate-700 bg-slate-950">
                 <h3 className="font-bold text-white uppercase flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" /> Asistente de Taller
                 </h3>
                 <p className="text-xs text-slate-500">Consulta stock, ubicaciones o compatibilidad.</p>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                 <div className="bg-slate-800 p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl w-fit max-w-[90%] border border-slate-700">
                    <p className="text-sm text-slate-300">¿Qué necesitas encontrar hoy, Jefe?</p>
                 </div>
                 
                 {aiResponse && (
                   <div className="bg-blue-900/20 p-3 rounded-tl-xl rounded-bl-xl rounded-br-xl w-fit max-w-[90%] ml-auto border border-blue-800">
                      <p className="text-sm text-blue-100 whitespace-pre-line">{aiResponse}</p>
                   </div>
                 )}
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-700">
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Ej: ¿Dónde están los filtros?"
                      className="flex-1 bg-black border border-slate-700 text-white p-2 focus:border-yellow-500 outline-none text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
                    />
                    <button 
                      onClick={handleAiAsk}
                      disabled={loadingAi}
                      className="bg-yellow-600 text-black p-2 hover:bg-yellow-500 disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default WorkshopDashboard;

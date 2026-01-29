import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { GoogleGenAI } from "@google/genai";
import { Activity, RefreshCw, AlertTriangle, CheckCircle, BrainCircuit } from 'lucide-react';

const PreventiveAssistant: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');

  // 1. Get Machines with high usage or upcoming maintenance
  const machines = useLiveQuery(() => db.equipment.toArray());
  const criticalMachines = machines?.filter(m => {
     const hoursLeft = m.nextMaintenanceAt - m.currentHourMeter;
     return hoursLeft < 100; // Look for machines needing attention soon
  });

  const runAnalysis = async () => {
    if (!criticalMachines || criticalMachines.length === 0) {
      setAnalysis("No hay equipos en estado crítico para analizar hoy.");
      return;
    }

    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct context
    const context = criticalMachines.map(m => 
      `- ${m.brand} ${m.model} (Horas: ${m.currentHourMeter}, Prox. Mant: ${m.nextMaintenanceAt}).`
    ).join('\n');

    const prompt = `
      Actúa como Ingeniero de Confiabilidad de Maquinaria Pesada.
      Analiza la siguiente flota que se acerca a su mantenimiento:
      ${context}

      Para cada máquina, sugiere:
      1. Un punto clave de inspección visual preventiva antes del mantenimiento oficial.
      2. Un posible síntoma de desgaste a buscar basado en las horas acumuladas.
      
      Sé breve, técnico y directo.
    `;

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAnalysis(result.text || 'Sin respuesta del motor predictivo.');
    } catch (e) {
      setAnalysis('Error de conexión con el módulo IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [criticalMachines]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-blue-500/50 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.2)] overflow-hidden flex flex-col max-h-[80vh]">
        
        <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-blue-500 animate-pulse" />
              <div>
                 <h2 className="text-white font-bold text-xl uppercase tracking-wider">Motor Predictivo</h2>
                 <p className="text-xs text-blue-400">Análisis Preventivo de Flota</p>
              </div>
           </div>
           <button onClick={onClose} className="px-3 py-1 border border-slate-600 text-slate-400 hover:text-white rounded uppercase text-xs font-bold">
             Cerrar
           </button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto bg-slate-900/50">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-40 space-y-4">
               <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
               <p className="text-blue-200 animate-pulse">Escaneando telemetría de flota...</p>
             </div>
           ) : (
             <div className="prose prose-invert max-w-none">
                {criticalMachines && criticalMachines.length === 0 ? (
                   <div className="flex flex-col items-center text-slate-500 py-10">
                      <CheckCircle className="w-16 h-16 mb-4 text-emerald-500" />
                      <p className="text-lg">Toda la flota está en rango saludable.</p>
                   </div>
                ) : (
                   <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-blue-100">
                      {analysis}
                   </div>
                )}
             </div>
           )}
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
           <span className="text-xs text-slate-500 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {criticalMachines?.length || 0} Equipos analizados
           </span>
           <button 
             onClick={runAnalysis}
             className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs uppercase flex items-center gap-2"
           >
             <RefreshCw className="w-4 h-4" /> Re-Analizar
           </button>
        </div>

      </div>
    </div>
  );
};

export default PreventiveAssistant;

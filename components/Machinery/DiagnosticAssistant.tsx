import React, { useState } from 'react';
import { Equipment, LogType, SyncStatus } from '../../types';
import { diagnoseMachinery } from '../../logic/AIService';
import { db } from '../../db/db';
import { Wrench, Zap, Save, AlertTriangle, CheckCircle } from 'lucide-react';

interface DiagnosticAssistantProps {
  machine: Equipment;
  onClose: () => void;
}

interface Diagnosis {
  cause: string;
  probability: string;
  action: string;
}

const DiagnosticAssistant: React.FC<DiagnosticAssistantProps> = ({ machine, onClose }) => {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Diagnosis[] | null>(null);
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(false);

  const handleDiagnose = async () => {
    if (!navigator.onLine) {
      alert("Se requiere internet para consultar a la IA. Guardando reporte localmente...");
      // Logic to save offline draft would go here
      return;
    }

    setLoading(true);
    try {
      const jsonStr = await diagnoseMachinery(machine, symptoms);
      const parsed = JSON.parse(jsonStr);
      setResults(parsed);
    } catch (e) {
      alert("Error en el análisis. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLog = async () => {
    if (!machine.id) return;
    
    await db.diagnosticLogs.add({
      machineId: machine.id,
      timestamp: Date.now(),
      symptoms: symptoms,
      aiAnalysis: JSON.stringify(results),
      mechanicFeedback: feedback, // This closes the learning loop
      syncStatus: SyncStatus.PENDING
    });

    await db.logs.add({
        userId: 0, // Should use real user ID
        type: LogType.DIAGNOSTIC,
        timestamp: Date.now(),
        dataJson: JSON.stringify({ machine: machine.model, symptoms }),
        syncStatus: SyncStatus.PENDING
    });

    setSaved(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-yellow-600 rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Industrial Header */}
        <div className="bg-yellow-500 p-4 flex justify-between items-center text-black">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 fill-black" />
            <div>
              <h2 className="font-mono font-bold text-xl uppercase tracking-wider">Asistente de Diagnóstico</h2>
              <p className="font-mono text-xs font-bold">{machine.brand} {machine.model} // ID: {machine.licensePlate}</p>
            </div>
          </div>
          <button onClick={onClose} className="font-bold border-2 border-black px-3 py-1 hover:bg-black hover:text-yellow-500 transition-colors uppercase">
            Cerrar [X]
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!results ? (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-700 p-4 rounded text-slate-300">
                <label className="block font-mono text-yellow-500 text-sm mb-2 uppercase">Descripción de la Falla / Síntomas</label>
                <textarea 
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full bg-black border border-slate-600 p-4 text-white font-mono h-40 focus:border-yellow-500 focus:outline-none"
                  placeholder="Ej: Humo negro al acelerar, vibración en el brazo hidráulico, pérdida de potencia..."
                />
              </div>
              
              <button 
                onClick={handleDiagnose}
                disabled={!symptoms || loading}
                className="w-full py-4 bg-slate-800 border-2 border-yellow-600 text-yellow-500 font-mono font-bold text-lg hover:bg-yellow-600 hover:text-black transition-all flex justify-center items-center gap-2 uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? <Wrench className="animate-spin" /> : <Zap />}
                {loading ? 'Analizando Datos...' : 'Iniciar Diagnóstico IA'}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-10">
              {/* Results Grid */}
              <h3 className="text-yellow-500 font-mono text-sm uppercase mb-4 border-b border-yellow-500/30 pb-2">Resultados del Análisis</h3>
              <div className="grid gap-4">
                {results.map((res, idx) => (
                  <div key={idx} className="bg-slate-900 border-l-4 border-yellow-500 p-4 flex gap-4 items-start">
                    <div className="font-mono font-bold text-slate-500 text-2xl">0{idx+1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-white text-lg">{res.cause}</h4>
                        <span className={`text-xs font-mono px-2 py-1 ${res.probability.includes('Alta') ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-slate-300'}`}>
                          PROB: {res.probability.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm font-mono border-t border-slate-800 pt-2 mt-2">
                        ACCIÓN: {res.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback Loop */}
              <div className="mt-8 bg-slate-900 border border-slate-700 p-4 rounded">
                <div className="flex items-center gap-2 text-yellow-500 mb-3">
                  <Save className="w-5 h-5" />
                  <span className="font-mono font-bold uppercase">Feedback Técnico (Aprendizaje)</span>
                </div>
                <p className="text-xs text-slate-400 mb-2 font-mono">¿Cuál fue la solución real? Esto ayuda a mejorar diagnósticos futuros.</p>
                <input 
                  type="text" 
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-black border border-slate-600 p-3 text-white font-mono mb-4 focus:border-yellow-500 focus:outline-none"
                  placeholder="Ej: Se cambió el filtro de aire y se solucionó."
                />
                <button 
                  onClick={handleSaveLog}
                  disabled={saved}
                  className="w-full py-3 bg-yellow-600 text-black font-bold font-mono uppercase hover:bg-yellow-500 transition-colors flex justify-center items-center gap-2"
                >
                  {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                  {saved ? 'Registro Guardado' : 'Guardar en Historial de Máquina'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticAssistant;

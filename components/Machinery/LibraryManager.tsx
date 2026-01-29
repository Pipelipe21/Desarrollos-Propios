import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Equipment } from '../../types';
import { processPDF } from '../../logic/PDFService';
import { Book, Upload, Trash2, FileText, Loader2, CheckCircle, X } from 'lucide-react';

interface LibraryManagerProps {
  onClose: () => void;
}

const LibraryManager: React.FC<LibraryManagerProps> = ({ onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);

  const manuals = useLiveQuery(() => db.manuals.toArray());
  const equipment = useLiveQuery(() => db.equipment.toArray());

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') return alert('Solo se permiten archivos PDF.');

    setUploading(true);
    setProgress(0);

    try {
      await processPDF(file, selectedMachineId || undefined, (pct) => setProgress(pct));
      alert('Manual indexado correctamente para uso Offline.');
    } catch (err) {
      console.error(err);
      alert('Error al procesar el PDF.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteManual = async (id: number) => {
    if (!confirm('¿Eliminar manual? Se perderá la búsqueda offline.')) return;
    await db.manuals.delete(id);
    await db.manualSegments.where('manualId').equals(id).delete();
  };

  const getMachineName = (id?: number) => {
    if (!id) return 'General';
    return equipment?.find(e => e.id === id)?.model || 'Desconocido';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Book className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="text-white font-bold text-lg uppercase">Biblioteca Técnica</h2>
              <p className="text-xs text-slate-400">Gestión de Manuales Offline</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          
          {/* Upload Panel */}
          <div className="w-1/3 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">1. Asociar a Máquina (Opcional)</label>
                <select 
                  className="w-full bg-black border border-slate-700 text-white p-3 text-sm focus:border-yellow-500 outline-none"
                  value={selectedMachineId || ''}
                  onChange={e => setSelectedMachineId(e.target.value ? Number(e.target.value) : null)}
                >
                   <option value="">-- Manual General --</option>
                   {equipment?.map(eq => (
                     <option key={eq.id} value={eq.id}>{eq.model} - {eq.licensePlate}</option>
                   ))}
                </select>
             </div>

             <div className="flex-1 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center p-4 text-center hover:border-yellow-500 transition-colors relative">
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                {uploading ? (
                   <>
                     <Loader2 className="w-10 h-10 text-yellow-500 animate-spin mb-2" />
                     <p className="text-yellow-500 font-bold text-sm">Indexando... {progress}%</p>
                     <p className="text-xs text-slate-500 mt-2">Extrayendo texto para IA</p>
                   </>
                ) : (
                   <>
                     <Upload className="w-10 h-10 text-slate-500 mb-2" />
                     <p className="text-white font-bold text-sm">Subir PDF</p>
                     <p className="text-xs text-slate-500 mt-1">Click o arrastrar aquí</p>
                   </>
                )}
             </div>
          </div>

          {/* List Panel */}
          <div className="w-2/3 p-6 overflow-y-auto bg-slate-950/50">
             <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Manuales Disponibles ({manuals?.length || 0})
             </h3>
             
             <div className="space-y-3">
                {manuals?.map(doc => (
                  <div key={doc.id} className="bg-slate-900 border border-slate-800 p-4 flex justify-between items-center group hover:border-yellow-500/50 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-800 rounded">
                           <FileText className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                           <h4 className="text-white font-bold">{doc.title}</h4>
                           <div className="flex gap-2 text-xs text-slate-500 mt-1">
                              <span className="bg-slate-800 px-1.5 rounded">{getMachineName(doc.machineId)}</span>
                              <span>{doc.pageCount} páginas</span>
                              <span>{(doc.fileData.size / 1024 / 1024).toFixed(1)} MB</span>
                           </div>
                        </div>
                     </div>
                     <button 
                       onClick={() => deleteManual(doc.id!)}
                       className="text-slate-600 hover:text-red-500 p-2"
                     >
                        <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
                ))}

                {(!manuals || manuals.length === 0) && (
                   <p className="text-slate-600 italic text-sm text-center py-10">No hay manuales cargados.</p>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LibraryManager;
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../db/db';
import { WorkOrder, WorkOrderStep, SparePart, WorkOrderPart, LogType, SyncStatus } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckSquare, Package, Camera, Mic, Save, ArrowLeft, Plus, Trash2, StopCircle } from 'lucide-react';

interface WorkOrderViewProps {
  workOrderId: number;
  onBack: () => void;
}

const WorkOrderView: React.FC<WorkOrderViewProps> = ({ workOrderId, onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'checklist' | 'parts' | 'media' | 'notes'>('checklist');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  
  // Load Data
  const ot = useLiveQuery(() => db.workOrders.get(workOrderId), [workOrderId]);
  const machine = useLiveQuery(() => ot ? db.equipment.get(ot.machineId) : undefined, [ot]);
  const parts = useLiveQuery(() => db.spareParts.toArray());

  // Local State for Parts Addition
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [partQty, setPartQty] = useState(1);

  // Setup Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.lang = 'es-CL';
      recog.interimResults = true;
      
      recog.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        // Append to existing notes (handling via DB update directly would be safer for debounce)
        const textarea = document.getElementById('expertNotes') as HTMLTextAreaElement;
        if (textarea) {
           // This is a simple visual update, real update happens on stop
           textarea.value = (ot?.expertNotes || '') + ' ' + transcript;
        }
      };

      setRecognition(recog);
    }
  }, [ot]);

  const toggleRecording = () => {
    if (!recognition) return alert("Tu navegador no soporta dictado de voz.");
    
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      // Save content
      const textarea = document.getElementById('expertNotes') as HTMLTextAreaElement;
      if (textarea && ot) {
        db.workOrders.update(ot.id!, { expertNotes: textarea.value });
      }
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleToggleStep = async (stepId: string, currentVal: boolean) => {
    if (!ot) return;
    const newChecklist = ot.checklist.map(s => s.id === stepId ? { ...s, completed: !currentVal } : s);
    await db.workOrders.update(ot.id!, { checklist: newChecklist });
  };

  const handleAddPart = async () => {
    if (!selectedPartId || !ot || !parts) return;
    const part = parts.find(p => p.id === selectedPartId);
    if (!part) return;

    if (part.currentStock < partQty) {
      return alert("No hay suficiente stock en pañol.");
    }

    // Atomic Update: Deduct Stock & Add to OT
    await db.transaction('rw', db.workOrders, db.spareParts, async () => {
      // 1. Update Inventory
      await db.spareParts.update(part.id!, { currentStock: part.currentStock - partQty });
      
      // 2. Update OT
      const newPartsUsed = [...ot.partsUsed, { partId: part.id!, name: part.name, quantityUsed: partQty }];
      await db.workOrders.update(ot.id!, { partsUsed: newPartsUsed });
    });

    setSelectedPartId(null);
    setPartQty(1);
  };

  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && ot) {
      const file = e.target.files[0];
      
      // Compression Logic
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress to 70% quality
          
          // Save to DB
          const currentPhotos = ot.photos || [];
          db.workOrders.update(ot.id!, { photos: [...currentPhotos, dataUrl] });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinish = async () => {
    if (!ot) return;
    // Check if all steps done? (Optional)
    await db.workOrders.update(ot.id!, { 
      status: 'finished', 
      finishedAt: Date.now() 
    });

    // Notify Admin
    await db.notifications.add({
      userId: ot.createdBy, // Notify creator (Papá)
      title: 'OT Finalizada',
      message: `El técnico ha finalizado la OT #${ot.id} en ${machine?.model}.`,
      read: false,
      timestamp: Date.now()
    });

    onBack();
  };

  if (!ot || !machine) return <div className="p-10 text-white">Cargando OT...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono flex flex-col">
      {/* Header */}
      <div className="bg-yellow-500 p-4 text-black flex justify-between items-center sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-3">
           <button onClick={onBack} className="p-1 border-2 border-black hover:bg-black hover:text-yellow-500 transition-colors">
             <ArrowLeft className="w-6 h-6" />
           </button>
           <div>
             <h2 className="font-black text-lg uppercase leading-none">OT #{ot.id}</h2>
             <p className="text-xs font-bold">{machine.brand} {machine.model}</p>
           </div>
        </div>
        <div className="px-3 py-1 bg-black text-yellow-500 font-bold text-xs uppercase rounded">
           {ot.status === 'in_process' ? 'EN PROCESO' : ot.status}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 border-b border-slate-700 overflow-x-auto">
         {[
           { id: 'checklist', icon: CheckSquare, label: 'Pasos' },
           { id: 'parts', icon: Package, label: 'Repuestos' },
           { id: 'media', icon: Camera, label: 'Fotos' },
           { id: 'notes', icon: Mic, label: 'Bitácora' },
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`flex-1 min-w-[80px] py-4 flex flex-col items-center justify-center gap-1 border-r border-slate-800 ${activeTab === tab.id ? 'bg-slate-800 text-yellow-500 border-b-2 border-b-yellow-500' : 'text-slate-500 hover:bg-slate-900'}`}
           >
             <tab.icon className="w-6 h-6" />
             <span className="text-[10px] uppercase font-bold">{tab.label}</span>
           </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-900/50">
         
         {/* CHECKLIST TAB */}
         {activeTab === 'checklist' && (
           <div className="space-y-3">
             <div className="bg-slate-800 p-4 rounded border-l-4 border-blue-500 mb-4">
               <h3 className="font-bold text-white mb-1">Instrucciones:</h3>
               <p className="text-sm text-slate-300">{ot.description}</p>
             </div>
             {ot.checklist.map(step => (
               <div key={step.id} 
                    onClick={() => handleToggleStep(step.id, step.completed)}
                    className={`p-4 border-2 rounded flex items-center gap-4 cursor-pointer transition-all ${step.completed ? 'bg-emerald-900/20 border-emerald-600' : 'bg-slate-900 border-slate-700'}`}
               >
                  <div className={`w-8 h-8 flex items-center justify-center border-2 rounded ${step.completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-slate-500'}`}>
                    {step.completed && <CheckSquare className="w-5 h-5" />}
                  </div>
                  <span className={`font-bold ${step.completed ? 'text-emerald-500 line-through' : 'text-slate-200'}`}>
                    {step.label}
                  </span>
               </div>
             ))}
           </div>
         )}

         {/* PARTS TAB */}
         {activeTab === 'parts' && (
           <div className="space-y-6">
              <div className="bg-slate-900 p-4 border border-slate-700 rounded">
                 <h3 className="text-yellow-500 font-bold uppercase text-sm mb-3">Registrar Consumo</h3>
                 <div className="flex gap-2 mb-2">
                   <select 
                     className="flex-1 bg-black border border-slate-600 p-3 text-white text-sm"
                     value={selectedPartId || ''}
                     onChange={e => setSelectedPartId(Number(e.target.value))}
                   >
                     <option value="">Seleccionar Repuesto...</option>
                     {parts?.map(p => (
                       <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>
                     ))}
                   </select>
                   <input 
                     type="number" 
                     className="w-20 bg-black border border-slate-600 p-3 text-white text-center"
                     value={partQty}
                     onChange={e => setPartQty(Number(e.target.value))}
                     min={1}
                   />
                 </div>
                 <button 
                   onClick={handleAddPart}
                   disabled={!selectedPartId}
                   className="w-full bg-slate-800 border border-yellow-600 text-yellow-500 py-3 font-bold uppercase hover:bg-yellow-600 hover:text-black disabled:opacity-50"
                 >
                   + Agregar a la OT
                 </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs text-slate-500 uppercase font-bold">Repuestos Utilizados</h4>
                {ot.partsUsed.length === 0 && <p className="text-slate-600 italic">No se han registrado repuestos.</p>}
                {ot.partsUsed.map((part, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black p-3 border-l-2 border-purple-500">
                     <span className="text-white">{part.name}</span>
                     <span className="font-bold text-purple-400">x{part.quantityUsed}</span>
                  </div>
                ))}
              </div>
           </div>
         )}

         {/* MEDIA TAB */}
         {activeTab === 'media' && (
           <div className="space-y-4">
              <label className="block w-full h-32 border-2 border-dashed border-slate-600 rounded flex flex-col items-center justify-center text-slate-500 hover:border-yellow-500 hover:text-yellow-500 cursor-pointer bg-slate-900">
                 <Camera className="w-8 h-8 mb-2" />
                 <span className="text-xs font-bold uppercase">Tomar / Subir Foto</span>
                 <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapturePhoto} />
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                {ot.photos?.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square bg-black border border-slate-700">
                    <img src={photo} alt="OT Proof" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
           </div>
         )}

         {/* NOTES TAB */}
         {activeTab === 'notes' && (
            <div className="h-full flex flex-col">
               <div className="flex justify-between items-center mb-2">
                  <h3 className="text-yellow-500 font-bold uppercase text-sm">Bitácora del Experto</h3>
                  <button 
                    onClick={toggleRecording}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold uppercase ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-white'}`}
                  >
                    {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isRecording ? 'Detener Dictado' : 'Iniciar Dictado'}
                  </button>
               </div>
               <textarea
                 id="expertNotes"
                 className="flex-1 w-full bg-black border border-slate-700 p-4 text-white font-mono leading-relaxed focus:border-yellow-500 outline-none"
                 placeholder="Describa la solución técnica, hallazgos inusuales o recomendaciones futuras..."
                 defaultValue={ot.expertNotes}
                 onBlur={(e) => db.workOrders.update(ot.id!, { expertNotes: e.target.value })}
               />
               <p className="text-[10px] text-slate-500 mt-2">
                 * Esta información alimentará a la IA para futuras reparaciones.
               </p>
            </div>
         )}
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        {ot.status === 'pending' && (
          <button 
             onClick={() => db.workOrders.update(ot.id!, { status: 'in_process', startedAt: Date.now() })}
             className="w-full py-4 bg-blue-600 text-white font-black text-xl uppercase rounded shadow-lg hover:bg-blue-500"
          >
            Iniciar Trabajo
          </button>
        )}
        
        {ot.status === 'in_process' && (
          <button 
             onClick={handleFinish}
             className="w-full py-4 bg-emerald-600 text-white font-black text-xl uppercase rounded shadow-lg hover:bg-emerald-500"
          >
             Finalizar OT
          </button>
        )}

        {(ot.status === 'finished' || ot.status === 'validated') && (
           <div className="w-full py-4 bg-slate-800 text-slate-400 font-bold text-center uppercase border border-slate-600 rounded">
             Orden Cerrada
           </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrderView;
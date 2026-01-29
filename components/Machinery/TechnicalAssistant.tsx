import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { GoogleGenAI } from "@google/genai";
import { searchManualsLocally, SearchResult } from '../../logic/PDFService';
import { Bot, Wifi, WifiOff, Send, BookOpen, AlertTriangle, Layers } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface TechnicalAssistantProps {
  onClose: () => void;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: SearchResult[];
}

const TechnicalAssistant: React.FC<TechnicalAssistantProps> = ({ onClose }) => {
  const isOnline = useNetworkStatus();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const equipment = useLiveQuery(() => db.equipment.toArray());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      // 1. Perform Local Search (Always done, to provide context or offline answer)
      const localResults = await searchManualsLocally(userMsg.content, selectedMachineId || undefined);

      if (isOnline) {
        // ONLINE MODE: GEMINI + RAG
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let contextText = "";
        if (localResults.length > 0) {
           contextText = "CONTEXTO DE MANUALES TÉCNICOS:\n" + 
             localResults.map(r => `[Manual: ${r.manualTitle}, Pág ${r.segment.pageNumber}]: ${r.segment.content}`).join('\n\n');
        }

        const prompt = `
          Eres un Asistente Técnico Senior para maquinaria pesada.
          
          ${contextText}

          PREGUNTA DEL TÉCNICO: "${userMsg.content}"
          
          INSTRUCCIONES:
          - Usa el contexto de los manuales si es relevante.
          - Si no hay contexto útil, usa tu conocimiento general de mecánica.
          - Sé breve, preciso y prioriza la seguridad.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt
        });

        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: response.text || 'Sin respuesta.',
          sources: localResults.length > 0 ? localResults : undefined 
        }]);

      } else {
        // OFFLINE MODE: RAW SEARCH RESULTS
        if (localResults.length === 0) {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: 'No encontré información en los manuales descargados. Intenta con otras palabras clave.' 
          }]);
        } else {
          const topResult = localResults[0];
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: `Modo Offline: He encontrado referencias en el manual "${topResult.manualTitle}".\n\n"${topResult.segment.content.substring(0, 300)}..."`,
            sources: localResults
          }]);
        }
      }

    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', content: 'Error al procesar la consulta.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border-2 border-slate-700 rounded-lg shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className={`p-4 border-b border-slate-800 flex justify-between items-center ${isOnline ? 'bg-slate-900' : 'bg-slate-900 border-b-yellow-600'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isOnline ? 'bg-blue-600 text-white' : 'bg-yellow-600 text-black'}`}>
               <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg uppercase flex items-center gap-2">
                 Asistente Técnico
                 {isOnline ? (
                   <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> ONLINE (GEMINI + RAG)
                   </span>
                 ) : (
                   <span className="text-[10px] bg-yellow-900 text-yellow-200 px-2 py-0.5 rounded flex items-center gap-1">
                      <WifiOff className="w-3 h-3" /> OFFLINE (SOLO MANUALES)
                   </span>
                 )}
              </h2>
              <p className="text-xs text-slate-400">Consulta de manuales y procedimientos</p>
            </div>
          </div>
          <button onClick={onClose} className="border border-slate-600 text-slate-400 px-3 py-1 hover:bg-slate-800 hover:text-white transition-colors text-xs uppercase font-bold">
            Salir
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/50">
           {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4">
                <Layers className="w-16 h-16 opacity-20" />
                <p>Selecciona una máquina y haz tu consulta técnica.</p>
                {!isOnline && (
                   <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-500 p-3 rounded text-xs max-w-sm text-center">
                      <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                      Estás desconectado. Las respuestas se limitarán estrictamente al contenido de los manuales PDF descargados.
                   </div>
                )}
             </div>
           )}

           {messages.map((msg, idx) => (
             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-lg ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-blue-900/20 border border-blue-800 text-slate-200'}`}>
                   <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                   
                   {/* Citations / Sources */}
                   {msg.sources && msg.sources.length > 0 && (
                     <div className="mt-4 pt-3 border-t border-slate-700/50">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                           <BookOpen className="w-3 h-3" /> Referencias Encontradas:
                        </p>
                        <div className="space-y-2">
                           {msg.sources.slice(0, 3).map((src, i) => (
                             <div key={i} className="bg-black/30 p-2 rounded text-xs border-l-2 border-yellow-500">
                                <span className="text-yellow-500 font-bold block">{src.manualTitle} (Pág. {src.segment.pageNumber})</span>
                                <span className="text-slate-500 italic truncate block">"{src.segment.content.substring(0, 80)}..."</span>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
             </div>
           ))}
           {loading && (
             <div className="flex justify-start">
               <div className="bg-slate-900 p-4 rounded-lg flex items-center gap-2 text-slate-400 text-sm">
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                 {isOnline ? 'Consultando IA...' : 'Buscando en Manuales...'}
               </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
           <div className="flex gap-4 mb-2">
              <select 
                value={selectedMachineId || ''}
                onChange={e => setSelectedMachineId(e.target.value ? Number(e.target.value) : null)}
                className="bg-black border border-slate-700 text-slate-300 text-xs p-2 rounded focus:border-blue-500 outline-none max-w-[200px]"
              >
                 <option value="">Toda la Biblioteca</option>
                 {equipment?.map(eq => (
                   <option key={eq.id} value={eq.id}>{eq.model}</option>
                 ))}
              </select>
           </div>
           <div className="flex gap-2">
              <input 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ej: ¿Cuál es la presión de aceite recomendada?"
                className="flex-1 bg-black border border-slate-700 p-3 text-white focus:border-blue-500 outline-none"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !query.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 font-bold uppercase disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default TechnicalAssistant;
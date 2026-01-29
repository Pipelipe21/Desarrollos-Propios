import React, { useState } from 'react';
import { generateWeeklyReport } from '../../logic/AIService';
import { Sparkles, X, RefreshCw, Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AIReportModalProps {
  onClose: () => void;
}

const AIReportModal: React.FC<AIReportModalProps> = ({ onClose }) => {
  const { activeDepartment } = useAuth();
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    // In a real app, we would pass 'activeDepartment' to generateWeeklyReport 
    // to filter data specifically for Bazar or Taller.
    // For this demo, the AI logic already aggregates everything, but we prompt it slightly differently.
    const text = await generateWeeklyReport(); 
    setReport(text);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-generate on open
  React.useEffect(() => {
    handleGenerate();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 flex flex-col max-h-[85vh] ${activeDepartment === 'taller' ? 'border-yellow-500' : 'border-pink-300'}`}>
        
        {/* Header */}
        <div className={`p-6 flex justify-between items-center ${activeDepartment === 'taller' ? 'bg-slate-950 text-yellow-500' : 'bg-pink-50 text-pink-700'}`}>
           <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${activeDepartment === 'taller' ? 'bg-yellow-500 text-black' : 'bg-white text-pink-500'}`}>
                 <Sparkles className="w-6 h-6" />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase tracking-tight">Consultor IA</h2>
                 <p className="text-xs opacity-70 font-medium">Análisis de {activeDepartment === 'taller' ? 'Maquinaria' : 'Retail'}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-40 space-y-4">
                <RefreshCw className={`w-10 h-10 animate-spin ${activeDepartment === 'taller' ? 'text-yellow-500' : 'text-pink-500'}`} />
                <p className="text-slate-500 font-medium animate-pulse">Analizando métricas del negocio...</p>
             </div>
           ) : (
             <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                   {report}
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
           <button 
             onClick={handleGenerate}
             disabled={loading}
             className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Regenerar
           </button>

           <button 
             onClick={handleCopy}
             disabled={loading || !report}
             className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${activeDepartment === 'taller' ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-pink-500 hover:bg-pink-600'}`}
           >
             {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
             {copied ? 'Copiado' : 'Copiar Informe'}
           </button>
        </div>

      </div>
    </div>
  );
};

export default AIReportModal;

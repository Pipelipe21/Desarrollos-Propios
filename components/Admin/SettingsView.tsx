import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { syncDataToCloud, exportDatabaseToJson } from '../../logic/CloudSyncService';
import { Moon, Sun, Cloud, Download, Monitor, Check, ArrowLeft, RefreshCw } from 'lucide-react';

const SettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { theme, setTheme } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncMsg, setSyncMsg] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('Iniciando conexión segura...');
    setProgress(0);
    
    const result = await syncDataToCloud((pct) => setProgress(pct));
    
    setSyncMsg(result.message);
    setTimeout(() => {
        setSyncing(false);
        if (result.success) setSyncMsg('');
    }, 2000);
  };

  const handleExport = async () => {
    const success = await exportDatabaseToJson();
    if (success) alert('Copia de seguridad descargada correctamente.');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 pb-20">
       <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
             <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h1>
       </div>

       <div className="space-y-6 max-w-2xl mx-auto">
          
          {/* Theme Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
             <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Apariencia</h2>
             <div className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-sm">Claro</span>
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-sm">Oscuro</span>
                </button>
                <button 
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${theme === 'system' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <Monitor className="w-6 h-6" />
                  <span className="text-sm">Sistema</span>
                </button>
             </div>
          </div>

          {/* Sync Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
             <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
               <Cloud className="w-5 h-5 text-blue-500" /> Nube & Sincronización
             </h2>
             <p className="text-sm text-slate-500 mb-6">Sube tus ventas, registros de asistencia y órdenes de trabajo al servidor central.</p>
             
             {syncing ? (
               <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>Sincronizando...</span>
                    <span>{progress}%</span>
                 </div>
                 <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                 </div>
                 <p className="text-center text-xs text-slate-400 mt-2">{syncMsg}</p>
               </div>
             ) : (
               <button 
                 onClick={handleSync}
                 className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex justify-center items-center gap-2"
               >
                 <RefreshCw className="w-5 h-5" /> Sincronizar Ahora
               </button>
             )}
             {syncMsg && !syncing && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm">
                   <Check className="w-4 h-4" /> {syncMsg}
                </div>
             )}
          </div>

          {/* Backup Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
             <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
               <Download className="w-5 h-5 text-green-500" /> Respaldo Local
             </h2>
             <p className="text-sm text-slate-500 mb-6">Descarga una copia completa de tu base de datos en formato JSON.</p>
             
             <button 
               onClick={handleExport}
               className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-xl flex justify-center items-center gap-2"
             >
               <Download className="w-5 h-5" /> Exportar Datos
             </button>
          </div>

       </div>
    </div>
  );
};

export default SettingsView;

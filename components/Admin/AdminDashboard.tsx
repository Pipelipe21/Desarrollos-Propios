import React, { useState, useEffect } from 'react';
import { generateWeeklyReport, calculateAnalytics, AnalyticsSummary } from '../../logic/AIService';
import { useTutorial } from '../../context/TutorialContext';
import { Sparkles, BarChart3, TrendingUp, AlertTriangle, ArrowLeft, RefreshCw, Info, PieChart, Calendar, DollarSign } from 'lucide-react';
import PayrollDashboard from '../HR/PayrollDashboard';

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [metrics, setMetrics] = useState<AnalyticsSummary | null>(null);
  const [showPayroll, setShowPayroll] = useState(false);
  const { startTutorial } = useTutorial();

  useEffect(() => {
    // Load local metrics immediately on mount
    calculateAnalytics().then(data => setMetrics(data));
  }, []);

  const handleGenerate = async () => {
    setLoadingAI(true);
    const text = await generateWeeklyReport();
    setReport(text);
    setLoadingAI(false);
  };

  const runTutorial = () => {
    startTutorial([
      {
        targetId: 'ai-section',
        title: 'Asistente Inteligente',
        content: 'Presiona este botón para recibir un reporte escrito detallado sobre el estado de tu negocio.'
      },
      {
        targetId: 'metrics-grid',
        title: 'Métricas Clave',
        content: 'Aquí ves rápidamente cuánto has vendido y si hay diferencias en la caja.'
      },
      {
        targetId: 'payroll-btn',
        title: 'Remuneraciones',
        content: 'Accede al módulo de sueldos para calcular liquidaciones y ver costos de personal.'
      }
    ]);
  };

  if (showPayroll) {
     return <PayrollDashboard onBack={() => setShowPayroll(false)} />;
  }

  return (
    <div className="min-h-screen bg-orange-50/30 dark:bg-slate-900 transition-colors duration-500 pb-20">
      {/* Navbar */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/70 dark:bg-slate-800/70 border-b border-orange-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-amber-50">Panel de Control</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Inteligencia de Negocio</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
               id="payroll-btn"
               onClick={() => setShowPayroll(true)} 
               className="bg-green-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-green-500 shadow-lg shadow-green-600/20"
            >
               <DollarSign className="w-4 h-4" /> <span className="hidden sm:inline">Sueldos</span>
            </button>
            <button onClick={runTutorial} className="text-amber-600 dark:text-amber-400 p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full">
               <Info className="w-6 h-6" />
            </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        
        {/* Welcome / AI Header */}
        <div id="ai-section" className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-800 dark:to-black rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
           <div>
             <h2 className="text-3xl font-bold mb-2">Resumen Diario</h2>
             <p className="text-slate-300 max-w-lg">
               Tu consultor virtual está listo. Analizamos ventas, stock y caja en segundos.
             </p>
           </div>
           <button 
             onClick={handleGenerate}
             disabled={loadingAI}
             className="px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
           >
             {loadingAI ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
             {loadingAI ? 'Analizando...' : 'Generar Reporte IA'}
           </button>
        </div>

        {/* AI Report Output */}
        {report && (
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-500">
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-orange-100 dark:border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500"></div>
                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {report}
                </div>
             </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div id="metrics-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Total Sales */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-40 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                 <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                    <BarChart3 className="w-6 h-6" />
                 </div>
                 <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 rounded-full">Semanal</span>
              </div>
              <div>
                 <p className="text-slate-400 text-sm font-medium">Ventas Totales</p>
                 <p className="text-3xl font-black text-slate-800 dark:text-white">
                    ${metrics?.totalSales.toLocaleString('es-CL') || '0'}
                 </p>
              </div>
           </div>

           {/* Top Product */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-40 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                 <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
                    <TrendingUp className="w-6 h-6" />
                 </div>
              </div>
              <div>
                 <p className="text-slate-400 text-sm font-medium">Producto Estrella</p>
                 <p className="text-xl font-bold text-slate-800 dark:text-white truncate" title={metrics?.topProduct}>
                    {metrics?.topProduct || 'Calculando...'}
                 </p>
              </div>
           </div>

           {/* Cash Alert */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-40 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                 <div className={`p-3 rounded-xl ${metrics && metrics.cashDiscrepancy !== 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-green-50 text-green-600 dark:bg-green-900/20'}`}>
                    <AlertTriangle className="w-6 h-6" />
                 </div>
                 <span className={`text-xs font-bold px-2 py-1 rounded-full ${metrics && metrics.cashDiscrepancy !== 0 ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-green-500 bg-green-50 dark:bg-green-900/20'}`}>
                    {metrics && metrics.cashDiscrepancy !== 0 ? 'Revisar' : 'OK'}
                 </span>
              </div>
              <div>
                 <p className="text-slate-400 text-sm font-medium">Cuadratura de Caja</p>
                 <p className={`text-2xl font-bold ${metrics && metrics.cashDiscrepancy !== 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                    {metrics?.cashDiscrepancy !== 0 ? `$${metrics?.cashDiscrepancy.toLocaleString('es-CL')}` : 'Sin Diferencias'}
                 </p>
              </div>
           </div>
        </div>

        {/* Charts Section */}
        <div id="charts-section" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Daily Sales Bar Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
               <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-slate-400" />
                 Ventas por Día
               </h3>
               
               <div className="h-48 flex items-end justify-between gap-2">
                  {metrics?.dailySales.map((day, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-1 group relative">
                       {/* Tooltip */}
                       <div className="absolute -top-10 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                         ${day.value.toLocaleString('es-CL')}
                       </div>
                       
                       <div 
                         className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-lg relative overflow-hidden transition-all hover:bg-blue-200 dark:hover:bg-blue-800/50"
                         style={{ height: '100%' }}
                       >
                          <div 
                            className="absolute bottom-0 left-0 w-full bg-blue-500 rounded-t-lg transition-all duration-1000 ease-out"
                            style={{ height: `${day.height}%` }}
                          ></div>
                       </div>
                       <span className="text-xs font-medium text-slate-500 uppercase">{day.date}</span>
                    </div>
                  ))}
                  {(!metrics?.dailySales || metrics.dailySales.length === 0) && (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                      Sin datos recientes
                    </div>
                  )}
               </div>
            </div>

            {/* Category Pie/List */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
               <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                 <PieChart className="w-5 h-5 text-slate-400" />
                 Categorías Más Vendidas
               </h3>

               <div className="space-y-5">
                  {metrics?.salesByCategory.map((cat, idx) => (
                    <div key={idx}>
                       <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{cat.name}</span>
                          <span className="text-slate-500">${cat.value.toLocaleString('es-CL')} ({cat.percent}%)</span>
                       </div>
                       <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${cat.color} transition-all duration-1000 ease-out`}
                            style={{ width: `${cat.percent}%` }}
                          ></div>
                       </div>
                    </div>
                  ))}
                  {(!metrics?.salesByCategory || metrics.salesByCategory.length === 0) && (
                    <div className="text-center text-slate-400 py-10 text-sm">
                      No hay ventas registradas esta semana.
                    </div>
                  )}
               </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
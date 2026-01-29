import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { UserRole, Sale } from '../../types';
import { getSalesByRange, calculateFinancials, generateStrategicAdvice, FinancialMetrics, DateRange } from '../../logic/FinancialService';
import { ArrowLeft, Calendar, TrendingUp, DollarSign, PieChart as PieIcon, Sparkles, Filter, Download, ChevronRight, RefreshCw, User as UserIcon } from 'lucide-react';

interface FinancialDashboardProps {
  onBack: () => void;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Filter State
  const [rangeType, setRangeType] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [viewMode, setViewMode] = useState<'overview' | 'transactions'>('overview');

  // Load Users for name resolution
  const allUsers = useLiveQuery(() => db.users.toArray());
  const getUserName = (id: number) => allUsers?.find(u => u.id === id)?.fullName || 'Desconocido';

  // Security Guard
  if (user?.role !== UserRole.ADMIN) {
    return <div className="p-10 text-center text-red-500 font-bold">ACCESO DENEGADO</div>;
  }

  const loadData = async () => {
    setLoading(true);
    const now = new Date();
    let start = 0;
    let end = now.getTime(); // Up to now

    // Range Logic
    if (rangeType === 'today') {
      const d = new Date(); d.setHours(0,0,0,0);
      start = d.getTime();
    } else if (rangeType === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0);
      start = d.getTime();
    } else if (rangeType === 'month') {
      const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); // First day of current month
      start = d.getTime();
    } else if (rangeType === 'year') {
      const d = new Date(); d.setMonth(0, 1); d.setHours(0,0,0,0);
      start = d.getTime();
    }

    const data = await getSalesByRange({ start, end });
    const calculated = calculateFinancials(data);
    
    setSales(data);
    setMetrics(calculated);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [rangeType]);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const advice = await generateStrategicAdvice(sales);
    setAiReport(advice);
    setLoadingAi(false);
  };

  // --- SUB-COMPONENTS FOR CHARTS (Lightweight SVG) ---
  
  const SimpleTrendChart = ({ data }: { data: Sale[] }) => {
    if (data.length < 2) return <div className="h-32 flex items-center justify-center text-slate-400 text-xs">Faltan datos para gráfica</div>;

    // Group by day for the chart
    const daysMap: Record<string, number> = {};
    data.forEach(s => {
        const d = new Date(s.timestamp).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
        daysMap[d] = (daysMap[d] || 0) + s.total;
    });
    
    const points = Object.entries(daysMap).reverse(); // Oldest first
    const maxVal = Math.max(...points.map(p => p[1]));
    
    return (
        <div className="h-32 flex items-end justify-between gap-1 pt-4">
            {points.map(([label, val], idx) => {
                const height = maxVal > 0 ? (val / maxVal) * 100 : 0;
                return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            ${val.toLocaleString('es-CL')}
                        </div>
                        <div className="w-full bg-pink-100 dark:bg-pink-900/20 rounded-t-sm h-full relative">
                            <div 
                                style={{ height: `${height}%` }} 
                                className="absolute bottom-0 w-full bg-pink-500 rounded-t-sm transition-all duration-500"
                            ></div>
                        </div>
                        <span className="text-[9px] text-slate-400">{label}</span>
                    </div>
                )
            })}
        </div>
    );
  };

  const PaymentPieChart = ({ data }: { data: Sale[] }) => {
     const counts = { cash: 0, card: 0, transfer: 0 };
     data.forEach(s => {
         s.paymentMethods.forEach(p => {
             if (counts[p.method] !== undefined) counts[p.method] += p.amount;
         });
     });
     
     const total = counts.cash + counts.card + counts.transfer;
     if (total === 0) return null;

     const cashPct = (counts.cash / total) * 100;
     const cardPct = (counts.card / total) * 100;
     const transferPct = (counts.transfer / total) * 100;

     return (
        <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-sm overflow-hidden"
                 style={{
                    background: `conic-gradient(
                        #22c55e 0% ${cashPct}%, 
                        #3b82f6 ${cashPct}% ${cashPct + cardPct}%, 
                        #a855f7 ${cashPct + cardPct}% 100%
                    )`
                 }}
            >
                <div className="absolute inset-0 m-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <PieIcon className="w-6 h-6 text-slate-300" />
                </div>
            </div>
            <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Efectivo ({Math.round(cashPct)}%)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Tarjeta ({Math.round(cardPct)}%)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded-full"></div> Transf. ({Math.round(transferPct)}%)</div>
            </div>
        </div>
     );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 font-sans">
       {/* Top Bar */}
       <div className="bg-white dark:bg-slate-800 border-b border-pink-200 dark:border-slate-700 p-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
             <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
             </button>
             <div>
                <h1 className="text-lg font-black text-pink-700 dark:text-pink-400 uppercase tracking-tight">Finanzas & Estrategia</h1>
                <p className="text-xs text-slate-500">Panel Privado de Gerencia (Mamá)</p>
             </div>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
             <button onClick={() => setViewMode('overview')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'overview' ? 'bg-white dark:bg-slate-600 shadow-sm text-pink-600 dark:text-pink-400' : 'text-slate-500'}`}>Resumen</button>
             <button onClick={() => setViewMode('transactions')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'transactions' ? 'bg-white dark:bg-slate-600 shadow-sm text-pink-600 dark:text-pink-400' : 'text-slate-500'}`}>Detalle</button>
          </div>
       </div>

       <div className="max-w-5xl mx-auto p-6 space-y-6">
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
             <div className="flex gap-2">
                {[
                    { id: 'today', label: 'Hoy' },
                    { id: 'week', label: '7 Días' },
                    { id: 'month', label: 'Este Mes' },
                    { id: 'year', label: 'Este Año' }
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setRangeType(opt.id as any)}
                        className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                            rangeType === opt.id 
                            ? 'bg-pink-600 text-white border-pink-600' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-pink-300'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
             </div>
             <div className="text-xs font-medium text-slate-500">
                 {sales.length} transacciones encontradas
             </div>
          </div>

          {/* KPI CARDS */}
          {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <DollarSign className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Venta Total</span>
                    </div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">
                        ${metrics.totalRevenue.toLocaleString('es-CL')}
                    </div>
                 </div>

                 <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-500 mb-2">
                        <TrendingUp className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Utilidad Neta</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        ${metrics.netProfit.toLocaleString('es-CL')}
                    </div>
                    <div className="text-xs text-emerald-500 font-bold mt-1">
                        Margen: {metrics.marginPercent.toFixed(1)}%
                    </div>
                 </div>

                 <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Calendar className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Ticket Promedio</span>
                    </div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">
                        ${Math.round(metrics.ticketAverage).toLocaleString('es-CL')}
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg shadow-pink-500/20">
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <Sparkles className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Estrategia IA</span>
                    </div>
                    <button 
                        onClick={handleAiAnalysis}
                        disabled={loadingAi}
                        className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loadingAi ? <RefreshCw className="animate-spin w-4 h-4" /> : 'Analizar Ahora'}
                    </button>
                 </div>
              </div>
          )}

          {/* VIEW: OVERVIEW (Charts & AI) */}
          {viewMode === 'overview' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Charts Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Tendencia de Ventas</h3>
                        <SimpleTrendChart data={sales} />
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-2">Medios de Pago</h3>
                            <p className="text-xs text-slate-400 max-w-[200px]">Distribución de ingresos por tipo de transacción.</p>
                        </div>
                        <PaymentPieChart data={sales} />
                    </div>
                </div>

                {/* AI Report Column */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-pink-100 dark:border-slate-700 h-full">
                        <h3 className="font-bold text-pink-600 dark:text-pink-400 mb-4 flex items-center gap-2">
                           <Sparkles className="w-5 h-5" /> Resumen Estratégico
                        </h3>
                        {aiReport ? (
                            <div className="prose prose-sm dark:prose-invert text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed text-xs">
                                {aiReport}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm">Presiona "Analizar Ahora" para recibir consejos sobre tu stock, packs recomendados y ventas.</p>
                            </div>
                        )}
                    </div>
                </div>

             </div>
          )}

          {/* VIEW: TRANSACTION LIST */}
          {viewMode === 'transactions' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase text-xs">
                              <tr>
                                  <th className="px-6 py-4">Fecha</th>
                                  <th className="px-6 py-4">Vendedora</th>
                                  <th className="px-6 py-4">Items</th>
                                  <th className="px-6 py-4">Pago</th>
                                  <th className="px-6 py-4 text-right">Total</th>
                                  <th className="px-6 py-4 text-right">Utilidad</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {sales.map(sale => {
                                  // Calc profit per sale locally for display
                                  const cost = sale.items.reduce((acc, i) => acc + (i.costPerItem || 0) * i.quantity, 0);
                                  const profit = sale.total - cost;
                                  
                                  return (
                                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700 dark:text-slate-200">
                                                {new Date(sale.timestamp).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <UserIcon className="w-3 h-3" />
                                                <span className="text-xs font-medium">{getUserName(sale.userId)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {sale.items.map((i, idx) => (
                                                    <span key={idx} className="text-xs text-slate-600 dark:text-slate-300">
                                                        {i.quantity}x {i.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {sale.paymentMethods.map((pm, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold uppercase text-slate-500">
                                                        {pm.method}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-white">
                                            ${sale.total.toLocaleString('es-CL')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                            ${profit.toLocaleString('es-CL')}
                                        </td>
                                    </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

       </div>
    </div>
  );
};

export default FinancialDashboard;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { PayrollConfig, UserRole, EmployeeProfile, PayrollRecord } from '../../types';
import { calculatePayroll, generatePayslipPDF } from '../../logic/PayrollService';
import { DollarSign, Settings, Users, ArrowLeft, Save, Printer, AlertCircle, FileText } from 'lucide-react';

const PayrollDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'calculator' | 'config' | 'employees'>('calculator');
  
  // Config State
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  
  // Load Config
  useEffect(() => {
    db.payrollConfig.toArray().then(recs => {
      if (recs.length > 0) setConfig(recs[0]);
    });
  }, []);

  const handleUpdateConfig = async () => {
    if (!config || !config.id) return;
    await db.payrollConfig.update(config.id, config);
    alert('Parámetros mensuales actualizados.');
  };

  if (user?.role !== UserRole.ADMIN) {
     return <div className="p-8 text-center text-red-500 font-bold">ACCESO DENEGADO</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
       <div className="bg-slate-900 text-white p-6 sticky top-0 z-20 shadow-xl flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 border border-slate-600 hover:bg-slate-800 text-green-400 rounded-full">
               <ArrowLeft className="w-6 h-6" />
             </button>
             <div>
                <h1 className="text-xl font-black uppercase tracking-widest">Remuneraciones</h1>
                <p className="text-xs text-green-400 font-bold">NOMINACL v1.0</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => setActiveTab('calculator')} 
               className={`px-3 py-1 rounded text-xs font-bold uppercase ${activeTab === 'calculator' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}
             >
               Calcular
             </button>
             <button 
               onClick={() => setActiveTab('config')} 
               className={`px-3 py-1 rounded text-xs font-bold uppercase ${activeTab === 'config' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}
             >
               Parámetros
             </button>
             <button 
               onClick={() => setActiveTab('employees')} 
               className={`px-3 py-1 rounded text-xs font-bold uppercase ${activeTab === 'employees' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}
             >
               Empleados
             </button>
          </div>
       </div>

       <div className="max-w-6xl mx-auto p-6">
          
          {/* CONFIG TAB */}
          {activeTab === 'config' && config && (
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                   <Settings className="w-5 h-5 text-green-500" /> Parámetros PREVIRED
                </h2>
                
                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mes</label>
                      <input type="number" value={config.month} onChange={e => setConfig({...config, month: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-slate-700 p-2 rounded" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Año</label>
                      <input type="number" value={config.year} onChange={e => setConfig({...config, year: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-slate-700 p-2 rounded" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor UF</label>
                      <input type="number" value={config.ufValue} onChange={e => setConfig({...config, ufValue: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor UTM</label>
                      <input type="number" value={config.utmValue} onChange={e => setConfig({...config, utmValue: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sueldo Mínimo (IMM)</label>
                      <input type="number" value={config.immValue} onChange={e => setConfig({...config, immValue: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-slate-700 p-2 rounded font-mono" />
                   </div>
                </div>

                <div className="mt-6 flex justify-end">
                   <button 
                     onClick={handleUpdateConfig}
                     className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center gap-2"
                   >
                     <Save className="w-5 h-5" /> Guardar Parámetros
                   </button>
                </div>
             </div>
          )}

          {/* CALCULATOR TAB */}
          {activeTab === 'calculator' && config && (
             <PayrollCalculator config={config} />
          )}

          {/* EMPLOYEES TAB */}
          {activeTab === 'employees' && (
             <div className="text-center py-10">
                <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold">Gestión de Fichas (Próximamente)</p>
                <p className="text-xs text-slate-400">Aquí podrás asignar sueldos base y datos de AFP.</p>
             </div>
          )}
       </div>
    </div>
  );
};

// SUB-COMPONENT: CALCULATOR
const PayrollCalculator: React.FC<{ config: PayrollConfig }> = ({ config }) => {
  const employees = useLiveQuery(() => db.employeeProfiles.toArray());
  const users = useLiveQuery(() => db.users.toArray());
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [daysWorked, setDaysWorked] = useState(30);
  const [calculatedRecord, setCalculatedRecord] = useState<PayrollRecord | null>(null);

  // Link Profile to User Name
  const getEmpName = (userId: number) => users?.find(u => u.id === userId)?.fullName || 'Desconocido';

  // Attendance Integration
  const fetchAttendanceSuggestion = async (userId: number) => {
     // Simplified: In a real app, query db.attendance for distinct dates in current month
     // Here we just mock or use a simple heuristic if logs exist
     const count = await db.attendance
       .where('userId').equals(userId)
       .filter(a => {
           const d = new Date(a.timestamp);
           return d.getMonth() + 1 === config.month && d.getFullYear() === config.year;
       })
       .count();
       
     // Very rough estimation: if logs found, maybe they worked? 
     // For now, let's just default to 30 but warn if low logs
     if (count < 5) {
        alert("Advertencia: Pocos registros de asistencia detectados para este mes.");
     }
  };

  const handleCalculate = () => {
     if (!selectedEmpId || !employees) return;
     const emp = employees.find(e => e.id === selectedEmpId);
     if (!emp) return;

     const record = calculatePayroll(emp, config, daysWorked);
     setCalculatedRecord(record);
  };

  const handlePrint = async () => {
    if (!calculatedRecord || !selectedEmpId || !employees) return;
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) return;
    
    await generatePayslipPDF(calculatedRecord, getEmpName(emp.userId), emp.rut);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       {/* Selector */}
       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-700 dark:text-white mb-4">Selección</h3>
          <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empleado</label>
                <select 
                  className="w-full bg-slate-100 dark:bg-slate-700 p-2 rounded"
                  value={selectedEmpId || ''}
                  onChange={e => {
                     setSelectedEmpId(Number(e.target.value));
                     setCalculatedRecord(null);
                     if (e.target.value) {
                        const emp = employees?.find(em => em.id === Number(e.target.value));
                        if (emp) fetchAttendanceSuggestion(emp.userId);
                     }
                  }}
                >
                   <option value="">Seleccionar...</option>
                   {employees?.map(e => (
                      <option key={e.id} value={e.id}>{getEmpName(e.userId)}</option>
                   ))}
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Días Trabajados</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-100 dark:bg-slate-700 p-2 rounded font-bold"
                  value={daysWorked}
                  onChange={e => setDaysWorked(Number(e.target.value))}
                  max={30} min={0}
                />
             </div>
             <button 
               onClick={handleCalculate}
               disabled={!selectedEmpId}
               className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50"
             >
                Calcular Liquidación
             </button>
          </div>
       </div>

       {/* Preview */}
       <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-700 dark:text-white mb-4 flex items-center justify-between">
             <span>Vista Previa</span>
             {calculatedRecord && (
                <button onClick={handlePrint} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-red-200">
                   <FileText className="w-4 h-4" /> Generar PDF
                </button>
             )}
          </h3>

          {calculatedRecord ? (
             <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-2 gap-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                   <div>
                      <h4 className="text-xs font-bold text-green-600 uppercase mb-2">Haberes</h4>
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                         <div className="flex justify-between"><span>Sueldo Base</span> <span>${calculatedRecord.baseSalaryCalculated.toLocaleString()}</span></div>
                         <div className="flex justify-between"><span>Gratificación</span> <span>${calculatedRecord.gratification.toLocaleString()}</span></div>
                         <div className="flex justify-between"><span>Movilización</span> <span>${calculatedRecord.transportAllowance.toLocaleString()}</span></div>
                         <div className="flex justify-between"><span>Colación</span> <span>${calculatedRecord.lunchAllowance.toLocaleString()}</span></div>
                         <div className="flex justify-between font-bold border-t pt-1 mt-1 border-slate-200"><span>TOTAL HABERES</span> <span>${(calculatedRecord.totalTaxable + calculatedRecord.totalNonTaxable).toLocaleString()}</span></div>
                      </div>
                   </div>
                   <div>
                      <h4 className="text-xs font-bold text-red-600 uppercase mb-2">Descuentos</h4>
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                         <div className="flex justify-between"><span>AFP</span> <span>${calculatedRecord.afpAmount.toLocaleString()}</span></div>
                         <div className="flex justify-between"><span>Salud</span> <span>${calculatedRecord.healthAmount.toLocaleString()}</span></div>
                         <div className="flex justify-between"><span>Seg. Cesantía</span> <span>${calculatedRecord.unemploymentInsurance.toLocaleString()}</span></div>
                         <div className="flex justify-between"><span>Impuesto</span> <span>${calculatedRecord.incomeTax.toLocaleString()}</span></div>
                         <div className="flex justify-between font-bold border-t pt-1 mt-1 border-slate-200"><span>TOTAL DESCUENTOS</span> <span>${calculatedRecord.totalDiscounts.toLocaleString()}</span></div>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl flex justify-between items-center">
                   <div className="text-sm font-bold text-slate-500 uppercase">Alcance Líquido</div>
                   <div className="text-3xl font-black text-slate-800 dark:text-white">
                      ${calculatedRecord.liquidSalary.toLocaleString()}
                   </div>
                </div>
                
                <div className="text-right text-xs text-slate-400">
                   Costo Empresa Estimado: ${calculatedRecord.employerCost.toLocaleString()}
                </div>
             </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Printer className="w-12 h-12 mb-2 opacity-50" />
                <p>Selecciona un empleado y calcula para ver el detalle.</p>
             </div>
          )}
       </div>
    </div>
  );
};

export default PayrollDashboard;

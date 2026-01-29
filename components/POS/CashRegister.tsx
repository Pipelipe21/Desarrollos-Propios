import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { CashShift, LogType, SyncStatus, User } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Lock, Unlock, DollarSign, AlertTriangle } from 'lucide-react';

interface CashRegisterProps {
  user: User;
  onShiftChange: (isOpen: boolean) => void;
}

const CashRegister: React.FC<CashRegisterProps> = ({ user, onShiftChange }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Find open shift for current user
  const activeShift = useLiveQuery(
    () => db.cashShifts.where('status').equals('open').first()
  );

  useEffect(() => {
    onShiftChange(!!activeShift);
  }, [activeShift, onShiftChange]);

  const handleOpenShift = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      await db.cashShifts.add({
        userId: user.id!,
        startTime: Date.now(),
        initialAmount: parseInt(amount),
        status: 'open',
        syncStatus: SyncStatus.PENDING
      });
      
      await db.logs.add({
        userId: user.id!,
        type: LogType.SHIFT_OPEN,
        timestamp: Date.now(),
        dataJson: JSON.stringify({ initial: amount }),
        syncStatus: SyncStatus.PENDING
      });

      setAmount('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!amount || !activeShift) return;
    setLoading(true);
    
    try {
      // Calculate System Expected Amount (Anti-Theft Logic)
      // Expected = Initial + Cash Sales
      const sales = await db.sales
        .where('timestamp')
        .above(activeShift.startTime)
        .toArray();
      
      const cashSalesTotal = sales
        .filter(s => s.status === 'completed')
        .reduce((sum, sale) => {
          const cashPayment = sale.paymentMethods.find(p => p.method === 'cash');
          return sum + (cashPayment ? cashPayment.amount : 0);
        }, 0);

      const expected = activeShift.initialAmount + cashSalesTotal;
      const declared = parseInt(amount);

      // Close the shift
      await db.cashShifts.update(activeShift.id!, {
        endTime: Date.now(),
        declaredAmount: declared,
        expectedAmount: expected, // Saved to DB, NOT shown to user
        status: 'closed',
        syncStatus: SyncStatus.PENDING
      });

      await db.logs.add({
        userId: user.id!,
        type: LogType.SHIFT_CLOSE,
        timestamp: Date.now(),
        dataJson: JSON.stringify({ declared, expected }), // Log for audit
        syncStatus: SyncStatus.PENDING
      });

      setAmount('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (activeShift) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3 mb-4">
           <Lock className="text-red-600 dark:text-red-400 w-6 h-6" />
           <div>
             <h3 className="font-bold text-red-800 dark:text-red-300">Cierre de Caja (Ciego)</h3>
             <p className="text-xs text-red-600 dark:text-red-400">Ingrese el efectivo contado físico.</p>
           </div>
        </div>
        
        <div className="space-y-3">
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-lg font-bold"
            placeholder="Monto contado ($)"
          />
          <button 
            onClick={handleCloseShift}
            disabled={!amount || loading}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Cerrando...' : 'Cerrar Caja'}
          </button>
          <div className="flex items-start gap-2 text-xs text-slate-500 mt-2">
            <AlertTriangle className="w-4 h-4" />
            <p>El sistema no mostrará si hay diferencias. Estas serán revisadas por Administración.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-3 mb-4">
         <Unlock className="text-green-600 dark:text-green-400 w-6 h-6" />
         <div>
           <h3 className="font-bold text-green-800 dark:text-green-300">Apertura de Caja</h3>
           <p className="text-xs text-green-600 dark:text-green-400">Ingrese el fondo inicial.</p>
         </div>
      </div>
      
      <div className="space-y-3">
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 rounded-lg border border-green-300 dark:border-green-700 bg-white dark:bg-slate-800 text-lg font-bold"
          placeholder="Monto inicial ($)"
        />
        <button 
          onClick={handleOpenShift}
          disabled={!amount || loading}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
           {loading ? 'Abriendo...' : 'Abrir Turno'}
        </button>
      </div>
    </div>
  );
};

export default CashRegister;

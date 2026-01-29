import React, { useState, useEffect } from 'react';
import { CartItem, Payment, PaymentMethodType, Sale, SyncStatus, User } from '../../types';
import { db } from '../../db/db';
import { X, CreditCard, Banknote, Smartphone, CheckCircle } from 'lucide-react';

interface CheckoutTerminalProps {
  cart: CartItem[];
  total: number;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutTerminal: React.FC<CheckoutTerminalProps> = ({ cart, total, user, onClose, onSuccess }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentAmount, setCurrentAmount] = useState<string>('');
  const [activeMethod, setActiveMethod] = useState<PaymentMethodType>('cash');
  const [processing, setProcessing] = useState(false);

  // Calculate totals
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;

  // Keypad handler
  const handleKeypad = (val: string) => {
    if (val === 'C') {
      setCurrentAmount('');
    } else if (val === 'back') {
      setCurrentAmount(prev => prev.slice(0, -1));
    } else {
      setCurrentAmount(prev => prev + val);
    }
  };

  const addPayment = () => {
    const amount = parseInt(currentAmount);
    if (!amount || amount <= 0) return;

    setPayments([...payments, { method: activeMethod, amount }]);
    setCurrentAmount('');
  };

  const removePayment = (index: number) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);
  };

  const finalizeSale = async () => {
    if (remaining > 0) return alert('Falta cubrir el total');
    setProcessing(true);

    try {
      // Transaction: Save Sale AND Update Stock Atomically
      await db.transaction('rw', db.sales, db.products, db.batches, async () => {
        // 1. Create Sale Record
        const newSale: Sale = {
          userId: user.id!,
          timestamp: Date.now(),
          items: cart,
          total: total,
          paymentMethods: payments,
          status: 'completed',
          syncStatus: SyncStatus.PENDING
        };
        
        await db.sales.add(newSale);

        // 2. Deduct Stock
        for (const item of cart) {
          // Global Product Stock
          const product = await db.products.get(item.id!);
          if (product) {
            await db.products.update(item.id!, { 
              stockTotal: Math.max(0, product.stockTotal - item.quantity) 
            });
          }

          // Specific Batch Stock (if selected)
          if (item.selectedBatchId) {
            const batch = await db.batches.get(item.selectedBatchId);
            if (batch) {
              await db.batches.update(item.selectedBatchId, {
                quantity: Math.max(0, batch.quantity - item.quantity)
              });
            }
          }
        }
      });

      onSuccess();
    } catch (error) {
      console.error(error);
      alert('Error al procesar venta');
    } finally {
      setProcessing(false);
    }
  };

  // Preset amount to remaining if empty
  useEffect(() => {
    if (currentAmount === '' && remaining > 0) {
      // Optional: Auto-fill logic can go here, but manual is safer for POS
    }
  }, [remaining]);

  const methodConfig = {
    cash: { icon: Banknote, label: 'Efectivo', color: 'bg-green-600' },
    card: { icon: CreditCard, label: 'Tarjeta', color: 'bg-blue-600' },
    transfer: { icon: Smartphone, label: 'Transf.', color: 'bg-purple-600' }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl flex overflow-hidden">
        
        {/* Left: Summary & Payments */}
        <div className="w-1/2 p-6 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Total a Pagar</h2>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              ${total.toLocaleString('es-CL')}
            </div>
          </div>

          {/* Payment List */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-2">
            {payments.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${p.method === 'cash' ? 'bg-green-500' : p.method === 'card' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                  <span className="capitalize text-slate-700 dark:text-slate-200">
                    {p.method === 'transfer' ? 'Transferencia' : p.method === 'card' ? 'Tarjeta' : 'Efectivo'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold dark:text-white">${p.amount.toLocaleString('es-CL')}</span>
                  <button onClick={() => removePayment(idx)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {remaining > 0 && (
              <div className="p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center text-slate-500">
                Falta cubrir: <span className="font-bold text-red-500">${remaining.toLocaleString('es-CL')}</span>
              </div>
            )}
            
            {change > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                Vuelto: <span className="font-bold text-green-600 dark:text-green-400">${change.toLocaleString('es-CL')}</span>
              </div>
            )}
          </div>

          <div className="mt-auto">
             <button 
              disabled={remaining > 0 || processing}
              onClick={finalizeSale}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xl rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform flex justify-center items-center gap-2"
             >
               {processing ? 'Procesando...' : (
                 <>
                   <CheckCircle className="w-6 h-6" /> Confirmar Venta
                 </>
               )}
             </button>
             <button onClick={onClose} className="w-full mt-2 py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400">
               Cancelar
             </button>
          </div>
        </div>

        {/* Right: Keypad & Method */}
        <div className="w-1/2 bg-slate-50 dark:bg-slate-900 p-6 flex flex-col">
           {/* Method Selector */}
           <div className="grid grid-cols-3 gap-3 mb-6">
              {(['cash', 'card', 'transfer'] as PaymentMethodType[]).map(method => (
                <button
                  key={method}
                  onClick={() => setActiveMethod(method)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                    activeMethod === method 
                    ? `${methodConfig[method].color} text-white shadow-lg scale-105` 
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {React.createElement(methodConfig[method].icon, { className: 'w-6 h-6 mb-1' })}
                  <span className="text-xs font-bold">{methodConfig[method].label}</span>
                </button>
              ))}
           </div>

           {/* Display */}
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-inner mb-4 text-right">
              <span className="text-slate-400 text-sm block mb-1">Monto a agregar</span>
              <span className="text-3xl font-mono text-slate-900 dark:text-white">
                ${currentAmount ? parseInt(currentAmount).toLocaleString('es-CL') : '0'}
              </span>
           </div>

           {/* Numpad */}
           <div className="grid grid-cols-3 gap-3 flex-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button 
                  key={num} 
                  onClick={() => handleKeypad(num.toString())}
                  className="bg-white dark:bg-slate-800 text-2xl font-bold text-slate-700 dark:text-white rounded-xl shadow-sm hover:bg-slate-100 active:scale-95 transition-transform"
                >
                  {num}
                </button>
              ))}
              <button onClick={() => handleKeypad('C')} className="bg-red-100 text-red-600 font-bold rounded-xl">C</button>
              <button onClick={() => handleKeypad('0')} className="bg-white dark:bg-slate-800 text-2xl font-bold text-slate-700 dark:text-white rounded-xl shadow-sm">0</button>
              <button onClick={addPayment} className="bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center">
                 OK
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutTerminal;

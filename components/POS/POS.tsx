import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { CartItem, Product, LogType, SyncStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, ScanLine, Trash2, ShoppingCart, Plus, Minus, ArrowRight, Sparkles } from 'lucide-react';
import { getRecommendations } from '../../logic/RecommendationEngine';
import BarcodeScanner from '../BarcodeScanner';
import CashRegister from './CashRegister';
import CheckoutTerminal from './CheckoutTerminal';

const SmartSuggestions: React.FC<{ cart: CartItem[] }> = ({ cart }) => {
  if (cart.length === 0) return null;
  const lastItem = cart[cart.length - 1];
  const recs = getRecommendations(lastItem);

  if (recs.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/30 animate-in slide-in-from-bottom-2">
       <div className="flex items-center gap-2 mb-2 text-pink-600 dark:text-pink-400 font-bold uppercase text-xs tracking-wider">
          <Sparkles className="w-4 h-4" /> Sugerencia Inteligente
       </div>
       <div className="space-y-2">
         {recs.map((rec, idx) => (
           <div key={idx} className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-white">{rec.message}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{rec.productName}</span>
           </div>
         ))}
       </div>
    </div>
  );
};

const POS: React.FC = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);

  // Computed Values
  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  const products = useLiveQuery(
    () => db.products.where('name').startsWithIgnoreCase(searchTerm).limit(10).toArray(),
    [searchTerm]
  );

  const addToCart = (product: Product) => {
    // Check if item exists
    const existingIdx = cart.findIndex(item => item.id === product.id);
    if (existingIdx >= 0) {
      const newCart = [...cart];
      newCart[existingIdx].quantity += 1;
      newCart[existingIdx].subtotal = newCart[existingIdx].quantity * (product.price || 0);
      setCart(newCart);
    } else {
      setCart([...cart, { 
        ...product, 
        cartId: Math.random().toString(36), 
        quantity: 1, 
        subtotal: (product.price || 0)
      }]);
    }
  };

  const removeFromCart = async (index: number) => {
    const item = cart[index];
    
    // Audit Log for Removal (Anti-Theft)
    if (user?.id) {
       await db.logs.add({
         userId: user.id,
         type: LogType.AUDIT_CART_REMOVE,
         timestamp: Date.now(),
         dataJson: JSON.stringify({ productName: item.name, quantity: item.quantity, price: item.price }),
         syncStatus: SyncStatus.PENDING
       });
    }

    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleScan = async (code: string) => {
    const product = await db.products.where('ean').equals(code).first();
    if (product) {
      addToCart(product);
      setIsScannerOpen(false);
    } else {
      alert('Producto no encontrado');
    }
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 flex overflow-hidden">
      {isScannerOpen && <BarcodeScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}
      
      {isCheckoutOpen && (
        <CheckoutTerminal 
          cart={cart} 
          total={cartTotal} 
          user={user}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={() => {
            setIsCheckoutOpen(false);
            setCart([]);
            alert('Venta Exitosa');
          }}
        />
      )}

      {/* Left Column: Products & Search */}
      <div className="w-2/3 flex flex-col p-4 gap-4">
        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex gap-2">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
             <input 
               type="text" 
               placeholder="Buscar producto..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
             />
          </div>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="bg-slate-900 dark:bg-blue-600 text-white p-3 rounded-lg"
          >
            <ScanLine className="w-6 h-6" />
          </button>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pb-20">
           {products?.map(p => (
             <button 
               key={p.id}
               onClick={() => isShiftOpen ? addToCart(p) : alert('Debe abrir caja primero')}
               className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between h-32 ${!isShiftOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               <div>
                 <h3 className="font-bold text-slate-800 dark:text-white line-clamp-2">{p.name}</h3>
                 <p className="text-xs text-slate-500">{p.category}</p>
               </div>
               <div className="text-blue-600 dark:text-blue-400 font-bold">
                 ${p.price?.toLocaleString('es-CL') || '0'}
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* Right Column: Cart & Cashier */}
      <div className="w-1/3 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
         
         {/* Shift Control */}
         <div className="p-4 border-b border-slate-100 dark:border-slate-700">
           <CashRegister user={user} onShiftChange={setIsShiftOpen} />
         </div>

         {/* Cart Header */}
         <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <ShoppingCart className="w-5 h-5" />
              Carrito ({cart.length})
            </h2>
            <button 
              onClick={() => setCart([])} 
              className="text-xs text-red-500 hover:underline"
              disabled={cart.length === 0}
            >
              Vaciar
            </button>
         </div>

         {/* Cart Items */}
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {cart.map((item, idx) => (
             <div key={idx} className="flex justify-between items-center group">
                <div className="flex-1">
                   <div className="text-sm font-medium text-slate-800 dark:text-white">{item.name}</div>
                   <div className="text-xs text-slate-500">
                     {item.quantity} x ${item.price?.toLocaleString('es-CL')}
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="font-bold text-slate-900 dark:text-white">
                     ${((item.price || 0) * item.quantity).toLocaleString('es-CL')}
                   </div>
                   <button onClick={() => removeFromCart(idx)} className="text-slate-400 hover:text-red-500">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             </div>
           ))}
         </div>

         {/* Smart Suggestions AI Component (Visible only when shift open) */}
         {isShiftOpen && <SmartSuggestions cart={cart} />}

         {/* Footer Totals */}
         <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
           <div className="flex justify-between items-end mb-4">
              <span className="text-slate-500">Total</span>
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                ${cartTotal.toLocaleString('es-CL')}
              </span>
           </div>
           
           <button 
             onClick={() => setIsCheckoutOpen(true)}
             disabled={!isShiftOpen || cart.length === 0}
             className="w-full py-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold shadow-lg shadow-pink-600/20 disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2"
           >
             Pagar <ArrowRight className="w-5 h-5" />
           </button>
         </div>

      </div>
    </div>
  );
};

export default POS;

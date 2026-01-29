import React, { useState } from 'react';
import { db } from '../db/db';
import { Product, Batch } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, ScanLine, ArrowLeft, Save, X, Image as ImageIcon, Tag, DollarSign, Barcode, Layers, Trash2 } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

const InventoryManager: React.FC = () => {
  const [view, setView] = useState<'list' | 'form' | 'scanner'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form States (Shopify Style)
  const [formData, setFormData] = useState<Partial<Product>>({ category: 'Lana' });
  const [variants, setVariants] = useState<Partial<Batch>[]>([]); // Variants are Batches in our DB
  
  // Queries
  const products = useLiveQuery(
    () => {
      let collection = db.products.toCollection();
      if (filterCategory !== 'all') {
        collection = db.products.where('category').equals(filterCategory);
      }
      return collection.toArray();
    },
    [filterCategory]
  );

  const loadProductForEdit = async (product: Product) => {
     setSelectedProduct(product);
     setFormData(product);
     // Load variants
     const productVariants = await db.batches.where('productId').equals(product.id!).toArray();
     setVariants(productVariants);
     setView('form');
  };

  const handleScan = async (code: string) => {
    const product = await db.products.where('ean').equals(code).first();
    if (product) {
      loadProductForEdit(product);
    } else {
      setFormData({ ean: code, category: 'Lana', name: '' });
      setVariants([]);
      setSelectedProduct(null);
      setView('form');
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name) return alert('El título es obligatorio');
    
    try {
      let productId = selectedProduct?.id;
      const totalStock = variants.reduce((acc, v) => acc + (v.quantity || 0), 0);
      const productToSave = { ...formData, stockTotal: totalStock };

      if (productId) {
        await db.products.update(productId, productToSave);
      } else {
        productId = await db.products.add(productToSave as Product);
      }

      // Save Variants
      // Simple strategy: Delete all old batches for this product and recreate (to handle deletions/updates easily in this demo)
      // In production, you'd want to diff and update specific IDs to preserve history if linked to sales directly by ID
      if (selectedProduct) {
         // Smart update: Update existing ones, add new ones
         for (const v of variants) {
            const batchData = { ...v, productId: productId! } as Batch;
            if (v.id) {
               await db.batches.update(v.id, batchData);
            } else {
               await db.batches.add(batchData);
            }
         }
         // Note: Deleted variants handling omitted for brevity, assumes additive flow mostly
      } else {
         // New product, just add all
         await db.batches.bulkAdd(variants.map(v => ({ ...v, productId: productId! } as Batch)));
      }

      setView('list');
      setFormData({});
      setVariants([]);
    } catch (e) {
      console.error(e);
      alert('Error al guardar');
    }
  };

  const addVariant = () => {
    setVariants([...variants, { 
      batchNumber: '', 
      color: '', 
      price: formData.price, // Inherit base price
      sku: '', 
      quantity: 0 
    }]);
  };

  const updateVariant = (index: number, field: keyof Batch, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  // --- VIEWS ---

  if (view === 'scanner') {
    return <BarcodeScanner onScan={handleScan} onClose={() => setView('list')} />;
  }

  if (view === 'form') {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-20">
        {/* Top Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
           <div className="flex items-center gap-4">
              <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                 <X className="w-6 h-6 text-slate-500" />
              </button>
              <h2 className="font-bold text-lg text-slate-800 dark:text-white">
                 {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
           </div>
           <button 
             onClick={handleSaveProduct}
             className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-opacity"
           >
             Guardar
           </button>
        </div>

        <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* LEFT COLUMN: Main Info */}
           <div className="lg:col-span-2 space-y-6">
              
              {/* Title & Desc */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Título</label>
                    <input 
                      type="text" 
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej: Lana Merino Azul"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                    <textarea 
                      rows={4}
                      value={formData.description || ''}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
              </div>

              {/* Media (Placeholder for now) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-slate-500" /> Multimedia
                 </h3>
                 <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Agregar Archivos (Simulado)</span>
                 </div>
              </div>

              {/* Variants / Inventory */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Layers className="w-5 h-5 text-slate-500" /> Variantes (Stock)
                    </h3>
                    <button onClick={addVariant} className="text-sm text-blue-600 font-bold hover:underline">+ Agregar Opción</button>
                 </div>
                 
                 <div className="space-y-4">
                    {variants.map((v, idx) => (
                       <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 relative">
                          <button onClick={() => { const n = [...variants]; n.splice(idx, 1); setVariants(n); }} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Opción (Color/Talla)</label>
                                <input 
                                  type="text" 
                                  value={v.title || ''}
                                  onChange={e => updateVariant(idx, 'title', e.target.value)}
                                  className="w-full mt-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600" 
                                  placeholder="Ej: Azul / L"
                                />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Precio</label>
                                <input 
                                  type="number" 
                                  value={v.price || ''}
                                  onChange={e => updateVariant(idx, 'price', Number(e.target.value))}
                                  className="w-full mt-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600" 
                                />
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                                <input 
                                  type="text" 
                                  value={v.sku || ''}
                                  onChange={e => updateVariant(idx, 'sku', e.target.value)}
                                  className="w-full mt-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 font-mono text-xs" 
                                />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Barcode</label>
                                <div className="flex gap-1">
                                    <input 
                                    type="text" 
                                    value={v.barcode || ''}
                                    onChange={e => updateVariant(idx, 'barcode', e.target.value)}
                                    className="w-full mt-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 font-mono text-xs" 
                                    />
                                    <button className="mt-1 p-2 bg-slate-200 dark:bg-slate-700 rounded"><ScanLine className="w-4 h-4"/></button>
                                </div>
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Cantidad</label>
                                <input 
                                  type="number" 
                                  value={v.quantity || 0}
                                  onChange={e => updateVariant(idx, 'quantity', Number(e.target.value))}
                                  className="w-full mt-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-600 font-bold" 
                                />
                             </div>
                          </div>
                       </div>
                    ))}
                    {variants.length === 0 && (
                       <p className="text-center text-slate-400 py-4 text-sm">Este producto no tiene variantes. Se usará el precio base.</p>
                    )}
                 </div>
              </div>
           </div>

           {/* RIGHT COLUMN: Organization */}
           <div className="space-y-6">
              
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white mb-4">Organización</h3>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-500 mb-1">Categoría</label>
                       <select 
                         value={formData.category}
                         onChange={e => setFormData({...formData, category: e.target.value as any})}
                         className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                       >
                          <option value="Lana">Lana</option>
                          <option value="Hilo">Hilo</option>
                          <option value="Bazar">Bazar</option>
                          <option value="Accesorios">Accesorios</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-500 mb-1">Proveedor / Marca</label>
                       <input 
                         type="text" 
                         value={formData.vendor || ''}
                         onChange={e => setFormData({...formData, vendor: e.target.value})}
                         className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                       />
                    </div>
                 </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white mb-4">Precios Base</h3>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-500 mb-1">Precio</label>
                       <input 
                         type="number" 
                         value={formData.price || ''}
                         onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                         className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-500 mb-1">Precio Comparación</label>
                       <input 
                         type="number" 
                         value={formData.compareAtPrice || ''}
                         onChange={e => setFormData({...formData, compareAtPrice: Number(e.target.value)})}
                         className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-500 mb-1">Costo por ítem</label>
                       <input 
                         type="number" 
                         value={formData.costPerItem || ''}
                         onChange={e => setFormData({...formData, costPerItem: Number(e.target.value)})}
                         className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                       />
                    </div>
                 </div>
              </div>

           </div>

        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="bg-white dark:bg-slate-800 p-4 sticky top-0 z-10 shadow-sm space-y-4">
         <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Inventario</h1>
            <div className="flex gap-2">
              <button onClick={() => setView('scanner')} className="bg-slate-900 dark:bg-blue-600 text-white p-3 rounded-full shadow-lg">
                <ScanLine className="w-6 h-6" />
              </button>
              <button onClick={() => { setSelectedProduct(null); setFormData({}); setVariants([]); setView('form'); }} className="bg-pink-600 text-white p-3 rounded-full shadow-lg">
                <Plus className="w-6 h-6" />
              </button>
            </div>
         </div>
         
         <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, SKU o código..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
         </div>
      </div>

      <div className="p-4 space-y-4">
        {products?.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
          <div 
            key={product.id} 
            onClick={() => loadProductForEdit(product)}
            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-4">
               {/* Placeholder Image */}
               <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-slate-800 dark:text-white">{product.name}</h3>
                 <p className="text-sm text-slate-500">{product.vendor || product.category}</p>
               </div>
            </div>
            <div className="text-right">
               <span className="block text-lg font-bold text-slate-900 dark:text-white">${product.price?.toLocaleString('es-CL') || '0'}</span>
               <span className={`text-xs px-2 py-0.5 rounded-full ${product.stockTotal > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                 {product.stockTotal} en stock
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryManager;

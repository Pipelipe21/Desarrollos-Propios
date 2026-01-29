import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { AlertCircle, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

export const DocumentAlerts: React.FC = () => {
  const documents = useLiveQuery(() => db.documents.toArray());
  
  if (!documents || documents.length === 0) return null;

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Process status dynamically
  const alerts = documents.map(doc => {
    const daysLeft = Math.ceil((doc.expirationDate - now) / DAY_MS);
    let status: 'expired' | 'warning' | 'active' = 'active';
    
    if (daysLeft < 0) status = 'expired';
    else if (daysLeft <= 15) status = 'warning';

    return { ...doc, daysLeft, status };
  }).filter(d => d.status !== 'active'); // Only show issues

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
         <FileText className="w-5 h-5" /> Vencimientos y Legalidad
      </h3>
      
      {alerts.map((doc, idx) => (
        <div 
          key={idx}
          className={`p-4 rounded-xl border-l-4 shadow-sm flex items-start gap-3 ${
            doc.status === 'expired' 
              ? 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200' 
              : 'bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
          }`}
        >
          <div className="mt-1">
            {doc.status === 'expired' ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h4 className="font-bold">{doc.title}</h4>
            <p className="text-sm opacity-90">{doc.entityRef}</p>
            <p className="text-xs mt-1 font-mono font-bold uppercase">
              {doc.status === 'expired' 
                ? `Vencido hace ${Math.abs(doc.daysLeft)} días` 
                : `Vence en ${doc.daysLeft} días`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

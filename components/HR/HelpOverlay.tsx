import React from 'react';
import { X, HelpCircle, MapPin, Clock } from 'lucide-react';

interface HelpOverlayProps {
  onClose: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-blue-600 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <HelpCircle className="w-8 h-8" />
              Guía de Asistencia
            </h2>
            <p className="text-blue-100 mt-1">Cómo marcar tu entrada y salida.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full h-fit text-green-600 dark:text-green-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">1. Ubicación (GPS)</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                El sistema verifica automáticamente que estés en el local (San Vicente). 
                Si el punto está <span className="text-red-500 font-bold">rojo</span>, estás muy lejos. 
                Si está <span className="text-green-500 font-bold">verde</span>, puedes marcar.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
             <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full h-fit text-blue-600 dark:text-blue-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">2. Entrada y Salida</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Presiona el botón <span className="font-bold text-green-600">INICIAR JORNADA</span> cuando llegues a trabajar.
                <br/>
                Presiona <span className="font-bold text-red-500">FINALIZAR JORNADA</span> cuando te vayas a casa.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
             <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center font-medium">
               💡 Recuerda: Activa el GPS de tu teléfono para que funcione correctamente.
             </p>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-900 dark:bg-blue-600 text-white font-bold rounded-xl"
          >
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { UserRole, LogType, SyncStatus, AttendanceRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getCurrentPosition, isWithinGeofence } from '../../logic/GeofenceService';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapPin, Clock, AlertTriangle, ShieldCheck, History, HelpCircle } from 'lucide-react';
import { HelpOverlay } from './HelpOverlay';

const AttendanceModule: React.FC = () => {
  const { user } = useAuth();
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'allowed' | 'denied' | 'error' | 'searching'>('searching');
  const [distance, setDistance] = useState<number | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Location Polling
  useEffect(() => {
    let mounted = true;

    const checkLocation = async () => {
      if (!mounted) return;
      setLoadingLoc(true);
      try {
        const position = await getCurrentPosition();
        const { latitude, longitude, accuracy } = position.coords;
        
        // Anti-spoofing check: high accuracy required (> 100m is suspicious)
        if (accuracy > 150) {
            if (mounted) {
                setLocationStatus('error'); // Too imprecise
                setLoadingLoc(false);
            }
            return;
        }

        const check = isWithinGeofence(latitude, longitude);
        
        if (mounted) {
          setCurrentCoords({ lat: latitude, lng: longitude });
          setDistance(check.distance);
          setLocationStatus(check.isAllowed ? 'allowed' : 'denied');
        }
      } catch (error) {
        console.error(error);
        if (mounted) setLocationStatus('error');
      } finally {
        if (mounted) setLoadingLoc(false);
      }
    };

    checkLocation();
    // Poll every 10 seconds
    const interval = setInterval(checkLocation, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Fetch History
  const myLogs = useLiveQuery(
    () => db.attendance
      .where('userId').equals(user?.id || 0)
      .reverse()
      .limit(5)
      .toArray(),
    [user]
  );

  const lastLog = myLogs?.[0];
  const isWorking = lastLog?.type === 'entry';

  const handleMark = async (type: 'entry' | 'exit') => {
    if (locationStatus !== 'allowed' || !currentCoords) {
        alert('Ubicación no válida o GPS desactivado.');
        return;
    }

    try {
        await db.attendance.add({
            userId: user!.id!,
            type: type,
            timestamp: Date.now(),
            latitude: currentCoords.lat,
            longitude: currentCoords.lng,
            accuracy: 0, // Simplified for now
            syncStatus: SyncStatus.PENDING
        });

        await db.logs.add({
            userId: user!.id!,
            type: type === 'entry' ? LogType.ATTENDANCE_IN : LogType.ATTENDANCE_OUT,
            timestamp: Date.now(),
            dataJson: JSON.stringify({ lat: currentCoords.lat, lng: currentCoords.lng }),
            syncStatus: SyncStatus.PENDING
        });

        alert(type === 'entry' ? '¡Bienvenida! Jornada Iniciada.' : '¡Hasta mañana! Jornada Finalizada.');
    } catch (e) {
        console.error(e);
        alert('Error al guardar marca.');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 relative">
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-600" />
          Asistencia
        </h1>
        <button 
          onClick={() => setShowHelp(true)}
          className="text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full text-sm font-medium"
        >
          <HelpCircle className="w-4 h-4" />
          Ayuda
        </button>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        
        {/* Status Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
           
           {/* Radar / Status Indicator */}
           <div className={`h-40 flex flex-col items-center justify-center transition-colors duration-500 relative ${
             locationStatus === 'allowed' ? 'bg-emerald-500' :
             locationStatus === 'denied' ? 'bg-rose-500' : 
             'bg-slate-400'
           }`}>
              {/* Ping Animation */}
              {locationStatus === 'searching' && (
                 <div className="absolute w-full h-full">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/30 rounded-full animate-ping"></div>
                 </div>
              )}

              <div className="z-10 bg-white/20 p-4 rounded-full backdrop-blur-md">
                 {locationStatus === 'allowed' ? <ShieldCheck className="w-12 h-12 text-white" /> :
                  locationStatus === 'denied' ? <AlertTriangle className="w-12 h-12 text-white" /> :
                  <MapPin className="w-12 h-12 text-white animate-pulse" />
                 }
              </div>
              
              <div className="z-10 mt-3 text-white font-medium flex flex-col items-center">
                 <span>
                    {locationStatus === 'allowed' ? 'Ubicación Validada' :
                     locationStatus === 'denied' ? 'Fuera de Rango' :
                     locationStatus === 'searching' ? 'Buscando GPS...' : 'GPS Desactivado'}
                 </span>
                 {distance && (
                     <span className="text-xs opacity-90">Distancia: {Math.round(distance)}m</span>
                 )}
              </div>
           </div>

           {/* Clock Interface */}
           <div className="p-6 text-center">
              <div className="text-4xl font-black text-slate-800 dark:text-white mb-1 font-mono">
                 {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
              <p className="text-slate-400 text-sm mb-6">
                 {currentTime.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>

              {/* Action Buttons */}
              {locationStatus === 'allowed' ? (
                <div className="grid grid-cols-1 gap-4">
                  {!isWorking ? (
                    <button 
                      onClick={() => handleMark('entry')}
                      className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-xl font-bold">INICIAR JORNADA</span>
                      <span className="text-emerald-100 text-sm">Marcar Entrada</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleMark('exit')}
                      className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-500/30 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1"
                    >
                       <span className="text-xl font-bold">FINALIZAR JORNADA</span>
                       <span className="text-rose-100 text-sm">Marcar Salida</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-xl text-slate-500 dark:text-slate-400 text-sm">
                   Acércate al local para habilitar los botones.
                </div>
              )}
           </div>
        </div>

        {/* History List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-slate-400" />
            Últimas Marcas
          </h3>
          <div className="space-y-4">
             {myLogs?.map((log) => (
               <div key={log.id} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                     <div className={`w-2 h-10 rounded-full ${log.type === 'entry' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                     <div>
                       <p className="font-bold text-slate-700 dark:text-slate-200 capitalize">
                         {log.type === 'entry' ? 'Entrada' : 'Salida'}
                       </p>
                       <p className="text-xs text-slate-400">
                         {new Date(log.timestamp).toLocaleDateString()}
                       </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="font-mono font-bold text-slate-800 dark:text-white">
                       {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </p>
                     {log.syncStatus === SyncStatus.PENDING && (
                       <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Pendiente</span>
                     )}
                  </div>
               </div>
             ))}
             {(!myLogs || myLogs.length === 0) && (
               <p className="text-center text-slate-400 text-sm py-2">No hay registros recientes.</p>
             )}
          </div>
        </div>
        
        {/* Admin Link (Only for admin) */}
        {user.role === UserRole.ADMIN && (
          <button className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-sm">
             Ver Reporte Completo (Admin)
          </button>
        )}

      </div>
    </div>
  );
};

export default AttendanceModule;

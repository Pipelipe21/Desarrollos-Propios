import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { X, Camera, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string>('');
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (manualMode) return;

    let cancelled = false;
    const codeReader = new BrowserMultiFormatReader();

    codeReader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, err) => {
          if (cancelled) return;
          if (result) {
            controlsRef.current?.stop();
            onScan(result.getText());
            return;
          }
          // NotFoundException fires continuously while no code is in frame; ignore it.
          if (err && !(err instanceof NotFoundException)) {
            console.error('Scanner error:', err);
          }
        }
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      })
      .catch((err) => {
        console.error('Camera error:', err);
        if (!cancelled) setError('No se pudo acceder a la cámara. Verifique los permisos.');
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [manualMode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (code) onScan(code);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {manualMode ? (
          <form onSubmit={handleManualSubmit} className="w-full max-w-sm px-6 flex flex-col gap-4">
            <p className="text-white text-center text-sm">Ingresa el código manualmente</p>
            <input
              type="text"
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ej. 7800000004051"
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder:text-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 rounded-xl text-white font-bold active:scale-95 transition-transform"
            >
              Confirmar
            </button>
          </form>
        ) : !error ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay UI */}
            <div className="absolute inset-0 border-[50px] border-black/50 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-40 border-2 border-red-500 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-red-500 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-red-500 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-red-500 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-red-500 -mb-1 -mr-1"></div>

                <div className="absolute top-1/2 w-full h-0.5 bg-red-500 opacity-50 animate-pulse"></div>
              </div>
            </div>

            <button
              onClick={() => setManualMode(true)}
              className="absolute bottom-20 flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-white font-bold border border-white/50 active:scale-95 transition-transform"
            >
              <Keyboard className="w-5 h-5" />
              Ingresar código manualmente
            </button>
          </>
        ) : (
          <div className="text-white text-center p-6">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <p>{error}</p>
            <button
              onClick={() => setManualMode(true)}
              className="mt-4 px-4 py-2 bg-blue-600 rounded text-white"
            >
              Ingresar código manualmente
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
        >
          <X className="w-8 h-8" />
        </button>
      </div>

      <div className="h-24 bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <p className="text-sm font-medium">
          {manualMode ? 'Escribe el código y confirma' : 'Apunta al código de barras o QR'}
        </p>
        <p className="text-xs text-slate-400 mt-1">D&D Industries Scanner v2.0</p>
      </div>
    </div>
  );
};

export default BarcodeScanner;

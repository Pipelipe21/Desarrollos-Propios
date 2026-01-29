import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera Error: ", err);
        setError('No se pudo acceder a la cámara. Verifique los permisos.');
      }
    };

    if (scanning) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanning]);

  const handleSimulateScan = () => {
    // In a real production app, you would use a library like 'html5-qrcode' 
    // or 'react-zxing' here to process the video frames.
    // For this architectural demo, we simulate a successful detection.
    
    // Simulate detecting "Lana Merino" or a random code
    const mockCodes = ['780000000001', '780000000002', 'NEW_CODE_123'];
    const randomCode = mockCodes[Math.floor(Math.random() * mockCodes.length)];
    
    onScan(randomCode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {!error ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay UI */}
            <div className="absolute inset-0 border-[50px] border-black/50 flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-red-500 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-red-500 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-red-500 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-red-500 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-red-500 -mb-1 -mr-1"></div>
                
                <div className="absolute top-1/2 w-full h-0.5 bg-red-500 opacity-50 animate-pulse"></div>
              </div>
            </div>
            
            {/* Simulation Trigger (For Demo Purposes) */}
            <button 
              onClick={handleSimulateScan}
              className="absolute bottom-20 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-white font-bold border border-white/50 active:scale-95 transition-transform"
            >
              Simular Escaneo
            </button>
          </>
        ) : (
          <div className="text-white text-center p-6">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <p>{error}</p>
            <button 
              onClick={() => setScanning(false)}
              className="mt-4 px-4 py-2 bg-blue-600 rounded text-white"
            >
              Cerrar Escáner
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
        <p className="text-sm font-medium">Apunta al código de barras o QR</p>
        <p className="text-xs text-slate-400 mt-1">D&D Industries Scanner v1.0</p>
      </div>
    </div>
  );
};

export default BarcodeScanner;

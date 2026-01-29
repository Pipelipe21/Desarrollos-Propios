import React, { useEffect, useState } from 'react';
import { useTutorial } from '../../context/TutorialContext';
import { X, ArrowRight, Check } from 'lucide-react';

const TutorialOverlay: React.FC = () => {
  const { isActive, steps, currentStepIndex, nextStep, closeTutorial } = useTutorial();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStepIndex];

  useEffect(() => {
    if (isActive && step) {
      const element = document.getElementById(step.targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTargetRect(element.getBoundingClientRect());
      }
    }
  }, [isActive, step, currentStepIndex]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isActive && step) {
        const element = document.getElementById(step.targetId);
        if (element) setTargetRect(element.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, step]);

  if (!isActive || !step || !targetRect) return null;

  // Calculate position logic simplified
  const top = targetRect.bottom + 10;
  const left = targetRect.left;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dark Backdrop with hole */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] pointer-events-auto transition-all duration-300">
        <div 
           style={{
             position: 'absolute',
             top: targetRect.top - 5,
             left: targetRect.left - 5,
             width: targetRect.width + 10,
             height: targetRect.height + 10,
             boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
             borderRadius: '12px'
           }}
           className="transition-all duration-300 ease-in-out border-2 border-amber-400"
        ></div>
      </div>

      {/* Tooltip Card */}
      <div 
        style={{
          position: 'absolute',
          top: top > window.innerHeight - 200 ? targetRect.top - 180 : top, // Flip if too low
          left: Math.min(Math.max(10, left), window.innerWidth - 310), // Keep within bounds
        }}
        className="pointer-events-auto w-[300px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-5 fade-in duration-300"
      >
        <div className="flex justify-between items-start mb-2">
           <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
             Paso {currentStepIndex + 1} de {steps.length}
           </span>
           <button onClick={closeTutorial} className="text-slate-400 hover:text-slate-600">
             <X className="w-4 h-4" />
           </button>
        </div>
        
        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">{step.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          {step.content}
        </p>

        <div className="flex justify-end">
          <button 
            onClick={nextStep}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform"
          >
            {currentStepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            {currentStepIndex === steps.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;

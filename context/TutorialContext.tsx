import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialContextType {
  isActive: boolean;
  currentStepIndex: number;
  steps: TutorialStep[];
  startTutorial: (steps: TutorialStep[]) => void;
  nextStep: () => void;
  closeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>([]);

  const startTutorial = (newSteps: TutorialStep[]) => {
    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      closeTutorial();
    }
  };

  const closeTutorial = () => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setSteps([]);
  };

  return (
    <TutorialContext.Provider value={{ isActive, currentStepIndex, steps, startTutorial, nextStep, closeTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

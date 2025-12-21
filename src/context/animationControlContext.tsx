"use client";

import React, { createContext, useState, ReactNode } from "react";

// Interface for the context value
interface AnimationControlContextProps {
  showAutoTyping: boolean;
  setShowAutoTyping: React.Dispatch<React.SetStateAction<boolean>>;
  showContactRows: boolean;
  setShowContactRows: React.Dispatch<React.SetStateAction<boolean>>;
  showTeamShare: boolean;
  setShowTeamShare: React.Dispatch<React.SetStateAction<boolean>>;
  showAutoNotification: boolean;
  setShowAutoNotification: React.Dispatch<React.SetStateAction<boolean>>;
  showFinalAnimation: boolean;
  setShowFinalAnimation: React.Dispatch<React.SetStateAction<boolean>>;
}

// Default context state with matching types for setter functions
const defaultState: AnimationControlContextProps = {
  showAutoTyping: true,
  setShowAutoTyping: () => {},
  showContactRows: false,
  setShowContactRows: () => {},
  showTeamShare: false,
  setShowTeamShare: () => {},
  showAutoNotification: false,
  setShowAutoNotification: () => {},
  showFinalAnimation: false,
  setShowFinalAnimation: () => {},
};

// Creating the context
export const AnimationControlContext = createContext<AnimationControlContextProps>(defaultState);

// Provider component type
interface AnimationControlProviderProps {
  children: ReactNode;
}

// Provider component
export const AnimationControlProvider: React.FC<AnimationControlProviderProps> = ({ children }) => {
  // State hooks
  const [showAutoTyping, setShowAutoTyping] = useState(true);
  const [showContactRows, setShowContactRows] = useState(false);
  const [showTeamShare, setShowTeamShare] = useState(false);
  const [showAutoNotification, setShowAutoNotification] = useState(false);
  const [showFinalAnimation, setShowFinalAnimation] = useState(false);

  return (
    <AnimationControlContext.Provider
      value={{
        showAutoTyping,
        setShowAutoTyping,
        showContactRows,
        setShowContactRows,
        showTeamShare,
        setShowTeamShare,
        showAutoNotification,
        setShowAutoNotification,
        showFinalAnimation,
        setShowFinalAnimation,
      }}
    >
      {children}
    </AnimationControlContext.Provider>
  );
};

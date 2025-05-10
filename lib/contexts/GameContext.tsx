'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define our game state structure
interface GameState {
  score: number;
  level: number;
  playerName: string;
  completedModules: string[];
  wallet: {
    connected: boolean;
    address: string | null;
    balance: number;
  };
  quizProgress: {
    [moduleId: string]: {
      started: boolean;
      completed: boolean;
      score: number;
    };
  };
}

// Initial state to use if nothing in localStorage
const initialGameState: GameState = {
  score: 0,
  level: 1,
  playerName: '',
  completedModules: [],
  wallet: {
    connected: false,
    address: null,
    balance: 0,
  },
  quizProgress: {},
};

// The game context will provide state and update functions
interface GameContextType {
  gameState: GameState;
  setPlayerName: (name: string) => void;
  updateScore: (points: number) => void;
  advanceLevel: () => void;
  completeModule: (moduleId: string) => void;
  connectWallet: (address: string, balance: number) => void;
  disconnectWallet: () => void;
  updateWalletBalance: (balance: number) => void;
  startQuiz: (moduleId: string) => void;
  completeQuiz: (moduleId: string, score: number) => void;
  resetGameState: () => void;
}

// Create the context with a default undefined state (will be set in provider)
const GameContext = createContext<GameContextType | undefined>(undefined);

// Custom hook to use the game context
export const useGameState = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
};

// Provider component to wrap app with game state
interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  // Initialize state from localStorage or use initial values
  const [gameState, setGameState] = useState<GameState>(() => {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('legendOfLeoGameState');
      if (savedState) {
        try {
          return JSON.parse(savedState);
        } catch (error) {
          console.error('Failed to parse saved game state:', error);
        }
      }
    }
    return initialGameState;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('legendOfLeoGameState', JSON.stringify(gameState));
    }
  }, [gameState]);

  // State update functions
  const setPlayerName = (name: string) => {
    setGameState(prev => ({ ...prev, playerName: name }));
  };

  const updateScore = (points: number) => {
    setGameState(prev => ({ ...prev, score: prev.score + points }));
  };

  const advanceLevel = () => {
    setGameState(prev => ({ ...prev, level: prev.level + 1 }));
  };

  const completeModule = (moduleId: string) => {
    setGameState(prev => ({
      ...prev,
      completedModules: prev.completedModules.includes(moduleId)
        ? prev.completedModules
        : [...prev.completedModules, moduleId],
    }));
  };

  const connectWallet = (address: string, balance: number) => {
    setGameState(prev => ({
      ...prev,
      wallet: {
        connected: true,
        address,
        balance,
      },
    }));
  };

  const disconnectWallet = () => {
    setGameState(prev => ({
      ...prev,
      wallet: {
        connected: false,
        address: null,
        balance: 0,
      },
    }));
  };

  const updateWalletBalance = (balance: number) => {
    setGameState(prev => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        balance,
      },
    }));
  };

  const startQuiz = (moduleId: string) => {
    setGameState(prev => ({
      ...prev,
      quizProgress: {
        ...prev.quizProgress,
        [moduleId]: {
          started: true,
          completed: false,
          score: 0,
        },
      },
    }));
  };

  const completeQuiz = (moduleId: string, score: number) => {
    setGameState(prev => ({
      ...prev,
      quizProgress: {
        ...prev.quizProgress,
        [moduleId]: {
          started: true,
          completed: true,
          score,
        },
      },
    }));
  };

  const resetGameState = () => {
    setGameState(initialGameState);
  };

  // Create value object with state and update functions
  const value: GameContextType = {
    gameState,
    setPlayerName,
    updateScore,
    advanceLevel,
    completeModule,
    connectWallet,
    disconnectWallet,
    updateWalletBalance,
    startQuiz,
    completeQuiz,
    resetGameState,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export default GameContext; 
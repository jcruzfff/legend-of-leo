'use client';

import { useState, useEffect } from 'react';
import { useGameState } from '@/lib/contexts/GameContext';
import GameContainer from './GameContainer';
import { SceneKeys } from '@/lib/game/scenes';

interface StartScreenProps {
  initialScene?: string;
}

export default function StartScreen({ initialScene = SceneKeys.Level1 }: StartScreenProps) {
  const [screenState, setScreenState] = useState<'start' | 'confirm' | 'playing'>('start');
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isNewGame, setIsNewGame] = useState(false);
  const { resetGameState } = useGameState();
  
  // Check if there's a saved game in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('legendOfLeoGameState');
      // Check if saved state exists and has meaningful progress
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          // Consider a game "saved" if they've made any meaningful progress
          // You can customize this logic based on your game
          const hasProgress = 
            parsedState.score > 0 || 
            parsedState.level > 1 || 
            parsedState.completedModules.length > 0 ||
            parsedState.playerName;
          
          setHasSavedGame(hasProgress);
        } catch (error) {
          console.error('Failed to parse saved game state:', error);
          setHasSavedGame(false);
        }
      } else {
        setHasSavedGame(false);
      }
    }
  }, []);
  
  const handleStartNewGame = () => {
    if (hasSavedGame) {
      // Ask for confirmation before overwriting saved game
      setScreenState('confirm');
    } else {
      // No saved game, start right away
      startNewGame();
    }
  };
  
  const startNewGame = () => {
    // Reset to initial state
    resetGameState();
    // Mark as a new game
    setIsNewGame(true);
    // Change to playing screen
    setScreenState('playing');
  };
  
  const handleContinueGame = () => {
    // No need to load game state as it's already loaded in GameContext
    // Mark as a continued game
    setIsNewGame(false);
    setScreenState('playing');
  };
  
  const handleCancelNewGame = () => {
    // Go back to start screen
    setScreenState('start');
  };
  
  // If the game is started, show the game container
  if (screenState === 'playing') {
    return <GameContainer isNewGame={isNewGame} initialScene={initialScene} />;
  }
  
  // Show confirmation screen
  if (screenState === 'confirm') {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-ui-text" style={{ backgroundColor: '#2B2A3D' }}>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-white">Start New Game?</h2>
          <p className="mb-6 text-white">
            You have a saved game. Starting a new game will erase your current progress.
            Are you sure you want to continue?
          </p>
          
          <div className="flex space-x-4">
            <button 
              onClick={startNewGame}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition duration-300"
            >
              Start New Game
            </button>
            <button 
              onClick={handleCancelNewGame}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition duration-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show start screen
  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-ui-text" style={{ backgroundColor: '#2B2A3D' }}>
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-2 text-white">Legend of Leo</h1>
        <p className="text-lg text-white">An Aleo Blockchain Learning Adventure</p>
      </div>
      
      <div className="flex flex-col space-y-4 w-64">
        <button 
          onClick={handleStartNewGame}
          className="bg-primary-300 hover:bg-primary-400 text-white py-3 px-6 rounded-lg transition duration-300 font-semibold shadow-lg"
        >
          Start New Game
        </button>
        
        <button 
          onClick={handleContinueGame}
          className={`${
            hasSavedGame 
              ? 'bg-primary-300 hover:bg-primary-400 text-white' 
              : 'bg-gray-500 cursor-not-allowed text-gray-300'
          } py-3 px-6 rounded-lg transition duration-300 font-semibold shadow-lg`}
          disabled={!hasSavedGame}
        >
          Continue
        </button>
      </div>
      
      <div className="absolute bottom-4 text-sm opacity-70 text-white">
        Press Start to begin your blockchain journey
      </div>
    </div>
  );
} 
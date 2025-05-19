'use client';

import { useState, useEffect } from 'react';
import { useGameState } from '@/lib/contexts/GameContext';
import GameContainer from './GameContainer';
import { SceneKeys } from '@/lib/game/scenes';
import Image from 'next/image';

interface StartScreenProps {
  initialScene?: string;
  devModeAutoStart?: boolean;
}

export default function StartScreen({ initialScene = SceneKeys.Level1, devModeAutoStart = false }: StartScreenProps) {
  const [screenState, setScreenState] = useState<'start' | 'confirm' | 'playing'>(devModeAutoStart ? 'playing' : 'start');
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
  
  // Auto-start in development mode
  useEffect(() => {
    if (devModeAutoStart) {
      console.log('Development mode: Auto-starting game');
      setIsNewGame(false);
      setScreenState('playing');
    }
  }, [devModeAutoStart]);

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
      <div className="relative flex flex-col items-center justify-center w-full h-full text-ui-text">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0 bg-black">
          <Image
            src="/assets/maps/start-screen.png"
            alt="Legend of Leo"
            fill
            style={{ objectFit: 'cover', opacity: 0 }}
            priority
          />
        </div>
        
        <div className="relative z-10 bg-gray-900 bg-opacity-80 p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-white">Start New Game?</h2>
          <p className="mb-6 text-white">
            You have a saved game. Starting a new game will erase your current progress.
            Are you sure you want to continue?
          </p>
          
          <div className="flex space-x-4">
            <button 
              onClick={startNewGame}
              className="bg-[#E8E8C3] text-black hover:opacity-90 py-2 px-6 rounded-lg transition duration-300 font-medium"
            >
              Start New Game
            </button>
            <button 
              onClick={handleCancelNewGame}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg transition duration-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show start screen with new background image
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-black">
      {/* Background image - without overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/maps/start-screen.png"
          alt="Legend of Leo"
          fill
          style={{ objectFit: 'cover', opacity: 1 }}
          priority
        />
      </div>
      
      {/* Content centered vertically in the screen */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        {/* Button section - side by side positioning */}
        <div className="flex justify-start ml-72 w-full space-x-4 mt-[680px] mb-[100px] cursor-pointer">
          <button 
            onClick={handleStartNewGame}
            className="bg-[#E8E8C3] hover:opacity-90 text-black py-4 px-8 rounded-lg transition duration-300 font-medium text-lg cursor-pointer"
          >
            Start New Game
          </button>
          
          <button 
            onClick={handleContinueGame}
            className={`${
              hasSavedGame 
                ? 'bg-white hover:opacity-90 text-black' 
                : 'bg-white opacity-50 cursor-not-allowed text-gray-400'
            } py-4 px-8 rounded-lg transition duration-300 font-medium text-lg`}
            disabled={!hasSavedGame}
          >
            Continue Game
          </button>
        </div>
        

      </div>
    </div>
  );
} 
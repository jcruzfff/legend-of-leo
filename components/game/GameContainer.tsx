'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameState } from '@/lib/contexts/GameContext';

interface GameContainerProps {
  width?: number;
  height?: number;
  isNewGame?: boolean;
}

const GameContainer: React.FC<GameContainerProps> = ({
  width = 800,
  height = 600,
  isNewGame = false,
}) => {
  const gameRef = useRef<any | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [phaser, setPhaser] = useState<any | null>(null);
  const [sceneModule, setSceneModule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { gameState } = useGameState();

  // Load Phaser module
  useEffect(() => {
    const loadPhaser = async () => {
      try {
        setLoading(true);
        
        // Dynamically import Phaser
        const phaserModule = await import('phaser');
        setPhaser(phaserModule.default);
        
        // Don't dynamically import MainScene here anymore
        setLoading(false);
      } catch (error) {
        console.error('Failed to load Phaser:', error);
        setError('Failed to load game engine. Please refresh the page.');
        setLoading(false);
      }
    };
    
    loadPhaser();
    
    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Initialize game after Phaser is loaded
  useEffect(() => {
    // Make sure Phaser is loaded and we're in browser environment
    if (!phaser || !gameContainerRef.current || typeof window === 'undefined') {
      return;
    }

    // Don't create a new game if one already exists
    if (gameRef.current !== null) {
      return;
    }

    const initGame = async () => {
      try {
        // Dynamically import MainScene
        const MainSceneModule = await import('./scenes/MainScene');
        
        // Create a custom data object to pass to the scene
        const gameData = {
          isNewGame,
          playerName: gameState.playerName,
          playerLevel: gameState.level,
          playerScore: gameState.score,
          completedModules: gameState.completedModules,
        };

        // Create a simple boot scene that will start our main scene
        class BootScene extends phaser.Scene {
          constructor() {
            super({ key: 'BootScene' });
          }

          create() {
            // Store game data in the registry
            this.registry.set('gameData', gameData);
            
            // Add the main scene as a proper class instance
            const MainScene = MainSceneModule.default;
            this.scene.add('MainScene', new MainScene(), true);
          }
        }

        // Basic Phaser game configuration
        const config = {
          type: phaser.AUTO,
          width: '100%',  // Full container width
          height: '100%', // Full container height
          backgroundColor: '#303040', // Modern UI background color
          pixelArt: true,
          roundPixels: true,
          scale: {
            mode: phaser.Scale.FIT,
            autoCenter: phaser.Scale.CENTER_BOTH,
            width: width,
            height: height,
          },
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 0 },
              debug: process.env.NODE_ENV === 'development',
            },
          },
          scene: [BootScene],
          parent: gameContainerRef.current,
        };

        // Create the Phaser game instance
        gameRef.current = new phaser.Game(config);
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setError(`Failed to initialize game: ${error.message}. Please refresh the page.`);
      }
    };

    initGame();
    
  }, [phaser, width, height, isNewGame, gameState]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-ui-bg">
        <div className="text-center">
          <div className="mb-4 text-primary-200 text-xl animate-pulse">
            Loading game engine...
          </div>
          <div className="animate-spin w-10 h-10 border-4 border-primary-300 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-ui-bg">
        <div className="text-center text-red-500 p-4 bg-black bg-opacity-50 rounded-lg">
          <div className="text-xl mb-2">Error</div>
          <div>{error}</div>
          <button 
            className="mt-4 bg-primary-300 hover:bg-primary-400 text-white py-2 px-4 rounded" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={gameContainerRef} 
      className="game-container w-full h-full"
      data-testid="phaser-game"
      style={{ aspectRatio: '16/9' }}
    />
  );
};

export default GameContainer; 
'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameState } from '@/lib/contexts/GameContext';
import { gameScenes, SceneKeys } from '@/lib/game/scenes';
import dynamic from 'next/dynamic';

interface GameContainerProps {
  width?: number;
  height?: number;
  isNewGame?: boolean;
  initialScene?: string;
}

// Create a client-only version of this component
const GameContainerClient = ({ 
  width = 800,
  height = 600, 
  isNewGame = false,
  initialScene = SceneKeys.Level1
}: GameContainerProps) => {
  const gameRef = useRef<any | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [phaser, setPhaser] = useState<any | null>(null);
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

          async create() {
            // Store game data in the registry
            this.registry.set('gameData', gameData);
            
            // Dynamically load game scenes
            const scenes = await gameScenes();
            
            // Add all game scenes first
            for (const GameSceneClass of scenes) {
              const scene = new GameSceneClass();
              const key = scene.sys.settings.key;
              
              // Only add if not already added
              if (!this.scene.get(key)) {
                this.scene.add(key, GameSceneClass);
              }
            }
            
            // Start the initial scene
            this.scene.start(initialScene);
          }
        }

        // Basic Phaser game configuration
        const config = {
          type: phaser.AUTO,
          width: '100%',  // Full container width
          height: '100%', // Full container height
          backgroundColor: '#2B2A3D', // Updated to match level background color
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
    
  }, [phaser, width, height, isNewGame, gameState, initialScene]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#2B2A3D' }}>
        <div className="text-center">
          <div className="mb-4 text-white text-xl animate-pulse">
            Loading...
          </div>
          <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#2B2A3D' }}>
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

// Dynamic import with ssr: false to prevent server-side rendering
const GameContainer = dynamic(() => Promise.resolve(GameContainerClient), {
  ssr: false,
}) as typeof GameContainerClient;

export default GameContainer; 
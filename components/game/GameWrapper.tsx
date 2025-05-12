'use client';

import { useEffect, useState } from 'react';
import StartScreen from './StartScreen';
import { SceneKeys } from '@/lib/game/scenes';

export default function GameWrapper() {
  const [initialScene, setInitialScene] = useState(SceneKeys.Level1);
  
  // In development mode, check if there's a saved scene to load directly
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const savedScene = localStorage.getItem('currentScene');
      if (savedScene) {
        console.log('Development mode: Loading saved scene:', savedScene);
        setInitialScene(savedScene);
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden" style={{ backgroundColor: '#2B2A3D' }}>
      <StartScreen initialScene={initialScene} devModeAutoStart={process.env.NODE_ENV === 'development'} />
    </div>
  );
} 
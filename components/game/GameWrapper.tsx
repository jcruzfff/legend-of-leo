'use client';

import { useState } from 'react';
import StartScreen from './StartScreen';
import { SceneKeys } from '@/lib/game/scenes';

export default function GameWrapper() {
  // Set the initial scene to Level1 always
  const [initialScene] = useState(SceneKeys.Level1);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden" style={{ backgroundColor: '#2B2A3D' }}>
      <StartScreen initialScene={initialScene} />
    </div>
  );
} 
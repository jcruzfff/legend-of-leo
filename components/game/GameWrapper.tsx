'use client';

import { useState } from 'react';
import StartScreen from './StartScreen';

export default function GameWrapper() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      <StartScreen />
    </div>
  );
} 
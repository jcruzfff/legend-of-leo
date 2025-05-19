'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Loading from '@/components/ui/Loading';

// Dynamically load the game component to avoid SSR issues with browser APIs
const GameComponent = dynamic(
  () => import('@/components/game/Game'),
  { ssr: false, loading: () => <Loading /> }
);

export default function GamePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <Suspense fallback={<Loading />}>
        <GameComponent />
      </Suspense>
    </main>
  );
} 
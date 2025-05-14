'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Loading from '@/components/ui/Loading';
import GameWalletButton from '@/components/wallet/GameWalletButton';

// Dynamically load the game component to avoid SSR issues with browser APIs
const GameComponent = dynamic(
  () => import('@/components/game/Game'),
  { ssr: false, loading: () => <Loading /> }
);

export default function GamePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <GameWalletButton />
      <Suspense fallback={<Loading />}>
        <GameComponent />
      </Suspense>
    </main>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PuzzleWalletService } from '@/lib/services/PuzzleWalletService';

// Import WalletConnectorDisplay with dynamic import to prevent SSR issues
const WalletConnectorDisplay = dynamic(
  () => import('./WalletConnectorDisplay'),
  { ssr: false }
);

export default function WalletConnectorWrapper() {
  const [shouldRender, setShouldRender] = useState(false);
  
  // Check if the wallet service says we have an existing connection
  useEffect(() => {
    const walletService = PuzzleWalletService.getInstance();
    
    // If already connected, show the component
    if (walletService.isConnected()) {
      setShouldRender(true);
      return;
    }
    
    // Listen for connection
    const connectionListener = (connected: boolean) => {
      setShouldRender(connected);
    };
    
    walletService.addConnectionListener(connectionListener);
    
    return () => {
      walletService.removeConnectionListener(connectionListener);
    };
  }, []);
  
  // Only render the WalletConnectorDisplay if potentially connected
  return shouldRender ? <WalletConnectorDisplay /> : null;
} 
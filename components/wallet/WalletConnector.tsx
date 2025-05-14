'use client';

import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletAdapterNetwork, DecryptPermission, WalletName } from '@demox-labs/aleo-wallet-adapter-base';
import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";
import { useEffect, useState } from 'react';

// Store a flag in localStorage to track connection attempts across refreshes
const CONNECTION_ATTEMPT_KEY = 'wallet_connection_attempt';

interface WalletConnectorProps {
  onConnected?: (address: string) => void;
  onError?: (error: string) => void;
  customButtonText?: string;
  buttonStyle?: React.CSSProperties;
}

// Custom hook to access wallet functionality
export function useWalletConnector() {
  const { 
    connected, 
    connecting, 
    disconnect, 
    publicKey, 
    wallet,
    wallets,
    select,
    connect
  } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // When component mounts, check if we just refreshed
  useEffect(() => {
    // Get the refresh flag from localStorage
    const wasRefreshed = localStorage.getItem('wallet_just_refreshed');
    if (wasRefreshed) {
      // Clear the flag
      localStorage.removeItem('wallet_just_refreshed');
      console.log('[WalletConnector] Page was just refreshed, wallet connection may work better now');
    }
    
    // No cleanup needed here as disconnect is called explicitly
  }, []);

  // Function to initiate wallet connection
  const connectWallet = async () => {
    try {
      // Reset error and refresh state
      setError(null);
      setNeedsRefresh(false);
      
      // Check if already connected
      if (connected && publicKey) {
        console.log('[WalletConnector] Already connected:', publicKey);
        return;
      }
      
      // Check if connecting
      if (connecting) {
        console.log('[WalletConnector] Connection already in progress');
        return;
      }

      // Reset any stale state
      if (connected) {
        console.log('[WalletConnector] Cleaning up stale connection state');
        await disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Explicitly select Puzzle Wallet by default
      console.log('[WalletConnector] Selecting Puzzle Wallet');
      select('Puzzle Wallet' as WalletName);
      
      // Short delay to ensure wallet selection completes
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Request connection with appropriate permissions
      console.log('[WalletConnector] Requesting connection...');
      await connect(
        DecryptPermission.UponRequest,
        WalletAdapterNetwork.TestnetBeta,
        ['legend_of_leo_test.aleo']
      );
    } catch (err: any) {
      console.error('[WalletConnector] Failed to connect wallet:', err);
      
      // Check if this error is likely to be fixed by a refresh
      const errorMessage = err.message || String(err);
      const isSelectionError = 
        errorMessage.includes('wallet not selected') || 
        errorMessage.includes('No wallet selected') ||
        errorMessage.includes('adapter');
      
      if (isSelectionError) {
        console.log('[WalletConnector] Wallet selection error detected, refresh may help');
        setNeedsRefresh(true);
        setError('Connection issue detected. Refreshing the page usually fixes this.');
      } else {
        setError('Failed to connect to wallet. Please make sure Puzzle Wallet extension is installed.');
      }
    }
  };

  // Function to refresh page
  const refreshPage = () => {
    if (typeof window !== 'undefined') {
      // Set a flag so we know we just refreshed
      localStorage.setItem('wallet_just_refreshed', 'true');
      window.location.reload();
    }
  };

  return {
    connected,
    connecting,
    publicKey,
    walletName: wallet?.adapter?.name,
    connectWallet,
    disconnectWallet: disconnect,
    error,
    needsRefresh,
    refreshPage,
    wallets,
    select
  };
}

// Component for direct integration
export default function WalletConnector({ 
  onConnected, 
  onError,
  customButtonText,
  buttonStyle
}: WalletConnectorProps) {
  const { 
    connected, 
    connecting, 
    publicKey, 
    error,
    needsRefresh,
    refreshPage,
    connectWallet
  } = useWalletConnector();
  
  // Notify parent component when successfully connected
  useEffect(() => {
    if (connected && publicKey && onConnected) {
      onConnected(publicKey);
    }
  }, [connected, publicKey, onConnected]);
  
  // Notify parent of errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // For custom integration in games, we now need to handle wallet selection
  if (customButtonText) {
    // Two-phase approach: first select wallet, then connect
    return (
      <div className="flex flex-col gap-2">
        {!connected ? (
          <>
            <WalletMultiButton />
            {needsRefresh ? (
              <button 
                onClick={refreshPage}
                style={{
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  ...buttonStyle
                }}
              >
                Refresh Page to Fix
              </button>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={connecting}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  cursor: connecting ? 'wait' : 'pointer',
                  ...buttonStyle
                }}
              >
                {connecting ? 'Connecting...' : customButtonText}
              </button>
            )}
          </>
        ) : (
          <div>Connected: {publicKey?.substring(0, 6)}...{publicKey?.substring(publicKey.length - 4)}</div>
        )}
      </div>
    );
  }

  // Otherwise use the default WalletMultiButton
  return <WalletMultiButton />;
} 
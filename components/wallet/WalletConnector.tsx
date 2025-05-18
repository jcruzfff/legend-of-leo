'use client';

import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletAdapterNetwork, DecryptPermission, WalletName } from '@demox-labs/aleo-wallet-adapter-base';
import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";
import { useEffect, useState, useCallback } from 'react';

// Interface for wallet connector props
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
  const [showDirectMintMessage, setShowDirectMintMessage] = useState(false);

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
  const connectWallet = useCallback(async () => {
    // Call our new handleConnect function
    handleConnect();
  }, [handleConnect]);

  // Function to refresh page
  const refreshPage = () => {
    if (typeof window !== 'undefined') {
      // Set a flag so we know we just refreshed
      localStorage.setItem('wallet_just_refreshed', 'true');
      window.location.reload();
    }
  };

  const handleConnect = useCallback(async () => {
    try {
      setError(null);
      
      // Show direct mint message for hackathon demo
      setShowDirectMintMessage(true);
      
      // Dispatch event for wallet connection (for compatibility)
      window.dispatchEvent(new CustomEvent('aleo-wallet-connect-request'));
      
      // Auto-close the message after 5 seconds
      setTimeout(() => {
        setShowDirectMintMessage(false);
      }, 5000);
    } catch (error) {
      console.error('Connect error:', error);
      setError(error instanceof Error ? error.message : 'Unknown connection error');
    }
  }, []);

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
    select,
    showDirectMintMessage,
    handleConnect
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
    connectWallet,
    showDirectMintMessage,
    handleConnect
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
      <div className="w-full flex flex-col items-center">
        {/* Direct mint message */}
        {showDirectMintMessage && (
          <div className="mt-2 p-3 bg-blue-100 text-blue-800 rounded-md mb-4 max-w-lg text-sm">
            <p className="font-medium">Hackathon Demo Mode: Using Real Contract Output</p>
            <p>Using the successful terminal command output from:</p>
            <p className="text-xs mt-1 bg-gray-100 p-1 rounded font-mono">leo run mint aleo1435x7rqe9y4y8n2npugdfx3ffenehtwe2uxt6t584fdv042ymq8qvlj6hv 123field 456field 1scalar</p>
            <p className="text-xs mt-2">Transaction ID: at1zyevxdpwqgjn96ssvxwrvz0r4fj2mu9j4t33jz6a0hc05sszrygqwxcujf</p>
          </div>
        )}
        
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
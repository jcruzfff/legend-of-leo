'use client';

import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState, useEffect } from "react";
import { WALLET_EVENTS } from "@/lib/utils/walletBridge";

export default function GameWalletButton() {
  const [showButton, setShowButton] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { publicKey, connected, connecting, wallet } = useWallet();

  // Check for Puzzle wallet extension on mount and when visibility changes
  useEffect(() => {
    const checkPuzzleWallet = () => {
      // Only check if not already connected or connecting
      if (connected || connecting) {
        return;
      }
      
      const isPuzzleAvailable = typeof window !== 'undefined' && 
                               'puzzle' in window && 
                               window.puzzle !== undefined && 
                               window.puzzle !== null;
      
      setHasError(!isPuzzleAvailable);
      setErrorMessage(!isPuzzleAvailable ? 
        'Puzzle Wallet extension not detected. Please install it from the Chrome Web Store.' : 
        '');
    };
    
    // Check on mount with a slight delay to allow extension to initialize
    const timer = setTimeout(() => {
      checkPuzzleWallet();
    }, 1500);
    
    // Check if window visibility changes (e.g., user switches tabs and returns)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPuzzleWallet();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connected, connecting]);
  
  // Load and show button after initial checks
  useEffect(() => {
    // Only show once we've checked for the wallet
    setShowButton(true);
  }, []);
  
  // Monitor connection status
  useEffect(() => {
    if (connected && publicKey) {
      setHasError(false);
      setErrorMessage('');
      
      // If we were previously showing an error but now connected,
      // trigger a game state update
      if (hasError) {
        // Notify game of connection
        const walletConnectedEvent = new CustomEvent(WALLET_EVENTS.CONNECTED, {
          detail: {
            address: publicKey,
            name: wallet?.adapter?.name || 'Unknown wallet'
          }
        });
        window.dispatchEvent(walletConnectedEvent);
      }
    }
  }, [connected, publicKey, hasError, wallet]);
  
  // Handle manual refresh click
  const handleRefreshClick = () => {
    // Prevent multiple refreshes
    if (isRefreshing) {
      return;
    }
    
    setIsRefreshing(true);
    
    // Reset refresh attempts counter
    localStorage.removeItem('walletRefreshCount');
    localStorage.removeItem('walletLastRefreshTime');
    
    // Indicate refresh is about to happen
    setErrorMessage('Refreshing page in 1 second...');
    
    // Reload the page after a short delay
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 1000);
  };
  
  // Handle manual reload wallet click
  const handleReloadWalletClick = () => {
    // Reload just the wallet adapters without refreshing page
    window.dispatchEvent(new CustomEvent('reload-wallet-adapters'));
    setErrorMessage('Reloading wallet adapters...');
    
    // Clear error after a delay to show temporary status
    setTimeout(() => {
      const isPuzzleAvailable = typeof window !== 'undefined' && 
                               'puzzle' in window && 
                               window.puzzle !== undefined && 
                               window.puzzle !== null;
      
      setHasError(!isPuzzleAvailable);
      setErrorMessage(!isPuzzleAvailable ? 
        'Puzzle Wallet still not detected. Please install it from the Chrome Web Store.' : 
        'Wallet adapters reloaded. Please try connecting again.');
    }, 2000);
  };
  
  // Determine which UI to render based on state
  if (!showButton) {
    return null; // Don't show anything during initial load
  }
  
  // Error state UI (wallet not detected)
  if (hasError) {
    return (
      <div className="wallet-error-container">
        <div className="wallet-error-message">
          {errorMessage}
        </div>
        <div className="wallet-error-actions">
          <button 
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="wallet-refresh-button"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Page'}
          </button>
          <button 
            onClick={handleReloadWalletClick}
            className="wallet-reload-button"
          >
            Reload Wallet
          </button>
          <a 
            href="https://chrome.google.com/webstore/detail/puzzle-wallet/fdchdcpieegfofnofmkbdkjiphjojito"
            target="_blank"
            rel="noopener noreferrer"
            className="wallet-install-link"
          >
            Install Wallet
          </a>
        </div>
        <style jsx>{`
          .wallet-error-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 12px;
            background-color: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 0, 0, 0.3);
            border-radius: 8px;
            max-width: 400px;
          }
          .wallet-error-message {
            color: #ff3333;
            font-size: 14px;
          }
          .wallet-error-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .wallet-refresh-button, .wallet-reload-button, .wallet-install-link {
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
          }
          .wallet-refresh-button {
            background-color: #4a4a4a;
            color: white;
            border: none;
          }
          .wallet-refresh-button:disabled {
            background-color: #777;
            cursor: not-allowed;
          }
          .wallet-reload-button {
            background-color: #2a2a2a;
            color: white;
            border: none;
          }
          .wallet-install-link {
            background-color: #0077ff;
            color: white;
            border: none;
          }
        `}</style>
      </div>
    );
  }
  
  // Connected or standard UI
  return (
    <>
      <WalletMultiButton className="web3-button" />
      <style jsx global>{`
        .web3-button {
          background-color: #2a2a2a !important;
          transition: all 0.2s ease;
        }
        .web3-button:hover {
          background-color: #3a3a3a !important;
        }
      `}</style>
    </>
  );
} 
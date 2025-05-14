'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { 
  walletConnected, 
  walletDisconnected,
  walletError
} from '@/lib/utils/walletBridge';
import { DecryptPermission, WalletAdapterNetwork, WalletName } from '@demox-labs/aleo-wallet-adapter-base';

// Track refresh state globally to persist across component re-renders
const REFRESH_COUNT_KEY = 'walletRefreshCount';
const LAST_REFRESH_TIME_KEY = 'walletLastRefreshTime';
const MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between auto-refreshes

// Track when the wallet detection cycle was last run (Unix timestamp)
let lastDetectionTime = 0;

interface StoredConnection {
  address: string;
  timestamp: number;
}

export default function WalletListener() {
  const { 
    connect,
    disconnect, 
    connected, 
    connecting,
    publicKey, 
    wallet,
    select,
    wallets
  } = useWallet();
  
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  
  // Helper to store wallet connection in localStorage
  const storeWalletConnection = useCallback((address: string | undefined) => {
    if (!address) return;
    
    try {
      const connectionData: StoredConnection = {
        address,
        timestamp: Date.now()
      };
      localStorage.setItem('walletConnection', JSON.stringify(connectionData));
      console.log('[WalletListener] Wallet connection stored');
    } catch (error) {
      console.error('[WalletListener] Error storing wallet connection:', error);
    }
  }, []);
  
  // Helper to clear stored connection 
  const clearStoredConnection = useCallback(() => {
    try {
      localStorage.removeItem('walletConnection');
      console.log('[WalletListener] Cleared stored wallet connection');
    } catch (error) {
      console.error('[WalletListener] Error clearing wallet connection:', error);
    }
  }, []);
  
  // Check if we should allow a refresh based on timing and attempts
  const canRefreshPage = useCallback(() => {
    try {
      // Get current refresh count and last refresh time
      const refreshCount = Number(localStorage.getItem(REFRESH_COUNT_KEY) || '0');
      const lastRefreshTime = Number(localStorage.getItem(LAST_REFRESH_TIME_KEY) || '0');
      const now = Date.now();
      
      // Check if we've exceeded the maximum refresh attempts
      if (refreshCount >= 2) {
        console.log('[WalletListener] Maximum refresh attempts reached, not refreshing');
        return false;
      }
      
      // Check if enough time has passed since the last refresh
      if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
        console.log('[WalletListener] Not enough time since last refresh, waiting');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[WalletListener] Error checking refresh state:', error);
      return false;
    }
  }, []);
  
  // Proper connection handler
  const handleWalletConnection = useCallback(async () => {
    if (connected || connecting || connectionAttempted) {
      return;
    }
    
    setConnectionAttempted(true);
    setConnectionError(null);
    
    try {
      // Find puzzle wallet adapter
      const puzzleWallet = wallets.find(w => w.adapter.name.toLowerCase().includes('puzzle'));
      
      if (!puzzleWallet) {
        console.error('[WalletListener] Puzzle wallet not found in available wallets');
        setConnectionError('Puzzle wallet not found');
        return;
      }
      
      // Select the puzzle wallet
      select('Puzzle Wallet' as WalletName);
      
      console.log('[WalletListener] Attempting to connect to Puzzle wallet...');
      
      // Short delay to ensure wallet selection completes
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Connect with proper parameters according to the API
      await connect(
        DecryptPermission.UponRequest,
        WalletAdapterNetwork.TestnetBeta,
        ['puzzle_pieces_v015.aleo', 'wheres_alex_v018.aleo', 'legend_of_leo_test.aleo']
      );
      
      console.log('[WalletListener] Connection successful');
    } catch (error) {
      console.error('[WalletListener] Connection error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to wallet');
    }
  }, [connect, connected, connecting, connectionAttempted, select, wallets]);
  
  // Track connection success
  useEffect(() => {
    if (connected && publicKey) {
      console.log('[WalletListener] Wallet connected, public key:', publicKey);
      storeWalletConnection(publicKey);
      
      // Reset refresh counters on successful connection
      localStorage.removeItem(REFRESH_COUNT_KEY);
      localStorage.removeItem(LAST_REFRESH_TIME_KEY);
    }
  }, [connected, publicKey, storeWalletConnection]);
  
  // Track disconnection
  useEffect(() => {
    if (!connected && !connecting && connectionAttempted && !connectionError) {
      console.log('[WalletListener] Wallet disconnected');
      clearStoredConnection();
    }
  }, [connected, connecting, connectionAttempted, connectionError, clearStoredConnection]);
  
  // Check if wallet adapters have been loaded
  const hasWalletAdapters = wallets.length > 0;
  
  // Check for Puzzle wallet when component mounts, with better refresh control
  useEffect(() => {
    // Skip if we're already in the process of checking
    if (isCheckingWallet) {
      return;
    }
    
    // Use an immediately-invoked async function for cleaner async handling
    (async () => {
      setIsCheckingWallet(true);
      const now = Date.now();
      
      // Don't run detection if we've checked recently
      if (now - lastDetectionTime < 5000) { // 5 seconds
        console.log('[WalletListener] Skipping detection, checked recently');
        setIsCheckingWallet(false);
        return;
      }
      
      lastDetectionTime = now;
      
      // Check if Puzzle wallet is installed
      const isPuzzleAvailable = typeof window !== 'undefined' && 
                               'puzzle' in window && 
                               window.puzzle !== undefined && 
                               window.puzzle !== null;
      
      console.log('[WalletListener] Puzzle wallet available:', isPuzzleAvailable);
      console.log('[WalletListener] Wallet adapters loaded:', hasWalletAdapters);
      
      // Only consider refreshing if:
      // 1. Puzzle wallet is not available, AND
      // 2. We don't have wallet adapters loaded yet, AND
      // 3. We're not already connected or connecting
      if (!isPuzzleAvailable && !hasWalletAdapters && !connected && !connecting) {
        // Check if we can refresh based on our rules
        if (canRefreshPage()) {
          // Update refresh tracking state before initiating refresh
          const currentCount = Number(localStorage.getItem(REFRESH_COUNT_KEY) || '0');
          localStorage.setItem(REFRESH_COUNT_KEY, String(currentCount + 1));
          localStorage.setItem(LAST_REFRESH_TIME_KEY, String(Date.now()));
          
          console.log(`[WalletListener] Puzzle wallet not detected, refreshing in 8 seconds (attempt ${currentCount + 1})`);
          
          // Wait longer before refresh to allow extension to initialize
          setTimeout(() => {
            console.log('[WalletListener] Executing page refresh now');
            window.location.reload();
          }, 8000);
        } else {
          console.log('[WalletListener] Refresh not allowed at this time due to limits');
        }
      } else if (isPuzzleAvailable) {
        // Reset refresh counter when wallet is detected
        localStorage.removeItem(REFRESH_COUNT_KEY);
        localStorage.removeItem(LAST_REFRESH_TIME_KEY);
        
        // Initialize connection if not already connecting or connected
        if (!connecting && !connected && !connectionAttempted && hasWalletAdapters) {
          // Use a short delay to ensure everything has loaded
          setTimeout(() => {
            handleWalletConnection();
          }, 1500);
        }
      }
      
      setIsCheckingWallet(false);
    })();
    
    // Cleanup function - nothing specific to clean up here
    return () => {};
  }, [connected, connecting, connectionAttempted, handleWalletConnection, hasWalletAdapters, canRefreshPage]);
  
  // Log wallet state on mount for debugging
  useEffect(() => {
    console.log('[WalletListener] Initial wallet state:', {
      connected,
      connecting,
      publicKey: publicKey || 'none',
      walletName: wallet?.adapter?.name || 'none',
      availableWallets: wallets?.map(w => w?.adapter?.name || 'unnamed') || [],
      hasWalletAdapters
    });
  }, [connected, connecting, publicKey, wallet, wallets, hasWalletAdapters]);
  
  // Effect to handle connect/disconnect events from the game
  useEffect(() => {
    console.log('[WalletListener] Setting up event listeners...');
    
    // Log available wallets
    const availableWalletNames = wallets?.filter(w => w && w.adapter)
      .map(w => w.adapter.name) || [];
    console.log('[WalletListener] Available wallets:', availableWalletNames);
    
    const handleConnectRequest = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        programIds?: string[];
        network?: WalletAdapterNetwork;
        decryptPermission?: DecryptPermission;
      }>;
      
      console.log('[WalletListener] Connection request received from game');
      
      // Check if already connected
      if (connected && publicKey) {
        console.log('[WalletListener] Already connected, notifying game:', publicKey);
        walletConnected({
          address: publicKey,
          name: wallet?.adapter?.name || 'Unknown wallet'
        });
        return;
      }
      
      // Check if connection is in progress
      if (connecting) {
        console.log('[WalletListener] Connection already in progress');
        return;
      }
      
      try {
        // Check specifically for Puzzle Wallet with a more complete check
        const isPuzzleAvailable = typeof window !== 'undefined' && 
                                 'puzzle' in window && 
                                 window.puzzle !== undefined && 
                                 window.puzzle !== null;
        
        if (!isPuzzleAvailable) {
          console.error('[WalletListener] Puzzle Wallet not detected in window object');
          walletError('Puzzle Wallet extension not detected. Please install it from the Chrome Web Store and refresh the page.');
          return;
        }
        
        // Check if Puzzle wallet adapter is available in the list
        const puzzleWallet = wallets?.find(w => w?.adapter?.name === 'Puzzle Wallet');
        if (!puzzleWallet) {
          console.error('[WalletListener] Puzzle Wallet adapter not found in wallet list');
          walletError('Puzzle Wallet extension was detected but the adapter failed to initialize. Please refresh the page.');
          return;
        }
        
        // Extract connection parameters (if provided in the event)
        const detail = customEvent.detail || {};
        const programIds = detail.programIds || ['legend_of_leo_test.aleo'];
        const network = detail.network || WalletAdapterNetwork.TestnetBeta;
        const decryptPermission = detail.decryptPermission || DecryptPermission.UponRequest;
        
        // Directly select Puzzle Wallet
        console.log('[WalletListener] Selecting Puzzle Wallet');
        select('Puzzle Wallet' as WalletName);
        
        // Wait for wallet selection to take effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if selection worked
        if (!wallet || wallet.adapter.name !== 'Puzzle Wallet') {
          console.error('[WalletListener] Failed to select Puzzle Wallet');
          walletError('Failed to select Puzzle Wallet. Please make sure the extension is installed and refresh the page.');
          return;
        }
        
        // Attempt connection with Puzzle Wallet
        console.log('[WalletListener] Connecting with Puzzle Wallet');
        await connect(decryptPermission, network, programIds);
        
      } catch (err: unknown) {
        console.error('[WalletListener] Connection failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Connection failed';
        walletError(errorMessage);
      }
    };
    
    const handleDisconnectRequest = () => {
      console.log('[WalletListener] Disconnect requested from game');
      disconnect();
    };
    
    // Listen for events from the Phaser game
    window.addEventListener('wallet-connect-request', handleConnectRequest);
    window.addEventListener('wallet-disconnect-request', handleDisconnectRequest);
    
    return () => {
      console.log('[WalletListener] Cleaning up event listeners');
      window.removeEventListener('wallet-connect-request', handleConnectRequest);
      window.removeEventListener('wallet-disconnect-request', handleDisconnectRequest);
    };
  }, [connect, disconnect, connected, connecting, publicKey, select, wallet, wallets]);
  
  // Effect to notify the game when wallet connection state changes
  useEffect(() => {
    console.log('[WalletListener] Connection state changed:', {
      connected,
      connecting,
      publicKey: publicKey || 'none',
      walletName: wallet?.adapter?.name || 'none'
    });
    
    if (connected && publicKey) {
      console.log('[WalletListener] Connected, notifying game:', publicKey);
      walletConnected({
        address: publicKey,
        name: wallet?.adapter?.name || 'Unknown wallet'
      });
      
      // Store the successful connection data
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('walletConnection', JSON.stringify({
            address: publicKey,
            name: wallet?.adapter?.name || 'Unknown wallet',
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('[WalletListener] Error storing wallet connection:', error);
        }
      }
    } else if (!connected && !connecting) {
      console.log('[WalletListener] Disconnected, notifying game');
      walletDisconnected();
      
      // Remove stored connection from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('walletConnection');
      }
    }
  }, [connected, connecting, publicKey, wallet?.adapter?.name]);
  
  // This component doesn't render anything visible
  return null;
} 
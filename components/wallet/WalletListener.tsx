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
const AUTO_CONNECT_DISABLED = true; // Flag to disable automatic wallet connection

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
  
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [walletAvailable, setWalletAvailable] = useState<boolean>(false);
  const [walletsLoaded, setWalletsLoaded] = useState<boolean>(false);
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState<boolean>(false);
  
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
    if (!connected && !connecting) {
      console.log('[WalletListener] Wallet disconnected');
      clearStoredConnection();
    }
  }, [connected, connecting, clearStoredConnection]);
  
  // Check if wallet adapters have been loaded
  const hasWalletAdapters = wallets.length > 0;
  
  // Auto-connect logic - modified to respect AUTO_CONNECT_DISABLED flag
  useEffect(() => {
    // Skip auto-connection attempt if flag is set to disable it
    if (AUTO_CONNECT_DISABLED) {
      console.log('[WalletListener] Auto-connect disabled by configuration');
      return;
    }

    const attemptAutoConnect = async () => {
      if (walletAvailable && 
          !connected && 
          !connecting && 
          !hasAttemptedAutoConnect &&
          wallets.length > 0) {
        
        setHasAttemptedAutoConnect(true);
        
        try {
          console.log('[WalletListener] Attempting auto-connect to Puzzle wallet');
          select(wallets[0].adapter.name);
        } catch (error) {
          console.error('[WalletListener] Auto-connect error:', error);
        }
      }
    };

    attemptAutoConnect();
  }, [walletAvailable, connected, connecting, hasAttemptedAutoConnect, wallets, select]);
  
  // Initialize walletsLoaded state when wallets are available
  useEffect(() => {
    if (wallets.length > 0 && !walletsLoaded) {
      setWalletsLoaded(true);
      console.log('[WalletListener] Wallet adapters loaded:', true);
    }
  }, [wallets, walletsLoaded]);
  
  // Listen for wallet availability - modify existing wallet detection code
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
      
      setWalletAvailable(isPuzzleAvailable);
      console.log('[WalletListener] Puzzle wallet available:', isPuzzleAvailable);
      console.log('[WalletListener] Wallet adapters loaded:', hasWalletAdapters);
      
      setIsCheckingWallet(false);
    })();
  }, [isCheckingWallet, hasWalletAdapters, connected, connecting]);
  
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
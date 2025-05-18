'use client';

import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { WalletProvider as AleoWalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { DecryptPermission, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { useMemo, useEffect, useState } from "react";
import { PuzzleWalletAdapter } from 'aleo-adapters';
import "@demox-labs/aleo-wallet-adapter-reactui/dist/styles.css";

// Flag to disable automatic wallet connection
const AUTO_CONNECT_DISABLED = true;

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  // Define wallets using useMemo BEFORE any conditional returns
  // This ensures consistent hook call order
  const wallets = useMemo(
    () => [
      // Focus only on Puzzle wallet for better user experience
      new PuzzleWalletAdapter({
        programIdPermissions: {
          // Use existing tokens and game programs - both testnet and mainnet
          [WalletAdapterNetwork.TestnetBeta]: [
            'puzzle_pieces_v015.aleo',          // For Puzzle Pieces token
            'wheres_alex_v018.aleo',            // For where's Alex game
            'legend_of_leo_test.aleo'           // For our game
          ],
          [WalletAdapterNetwork.MainnetBeta]: [
            'puzzle_pieces.aleo',               // For mainnet Puzzle Pieces token
            'credits.aleo'                      // For credits
          ]
        },
        appName: 'Legend of Leo',
        appDescription: 'A privacy-focused educational blockchain game',
        appIconUrl: 'maps/logo.png', // Replace with your actual logo path
      })
    ],
    []
  );
  
  const [checkingStoredConnection, setCheckingStoredConnection] = useState(true);
  const [autoConnect, setAutoConnect] = useState(false);

  // Effect to check for stored wallet connection
  useEffect(() => {
    console.log('[WalletProvider] Checking for stored wallet connection');
    
    // Skip auto-connect if disabled
    if (AUTO_CONNECT_DISABLED) {
      console.log('[WalletProvider] Auto-connect disabled, skipping stored connection check');
      setCheckingStoredConnection(false);
      return;
    }

    try {
      // Check for a stored connection
      const storedConnection = localStorage.getItem('walletConnection');
      
      if (storedConnection) {
        try {
          const connectionData = JSON.parse(storedConnection);
          if (connectionData && connectionData.address) {
            // Check if the stored connection is less than 24 hours old
            const now = Date.now();
            const timestamp = connectionData.timestamp || 0;
            const isRecent = (now - timestamp) < (24 * 60 * 60 * 1000); // 24 hours
            
            if (isRecent) {
              console.log('[WalletProvider] Found valid recent wallet connection, enabling auto-connect');
              setAutoConnect(true);
            } else {
              console.log('[WalletProvider] Found wallet connection but it is old, not enabling auto-connect');
              localStorage.removeItem('walletConnection');
            }
          } else {
            console.log('[WalletProvider] Invalid stored connection data');
            localStorage.removeItem('walletConnection');
          }
        } catch (parseError) {
          console.error('[WalletProvider] Error parsing stored wallet connection:', parseError);
          localStorage.removeItem('walletConnection');
        }
      } else {
        console.log('[WalletProvider] No stored wallet connection found');
      }
    } catch (error) {
      console.error('[WalletProvider] Error checking stored wallet connection:', error);
      localStorage.removeItem('walletConnection');
    }

    setCheckingStoredConnection(false);
  }, []);

  // Extra check to reset the autoConnect if Puzzle isn't available
  useEffect(() => {
    if (autoConnect) {
      const isPuzzleAvailable = typeof window !== 'undefined' && 
                               'puzzle' in window && 
                               window.puzzle !== undefined && 
                               window.puzzle !== null;
      
      if (!isPuzzleAvailable) {
        console.log('[WalletProvider] Puzzle wallet not available for auto-connect, disabling');
        setAutoConnect(false);
      }
    }
  }, [autoConnect]);

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect={autoConnect}
      localStorageKey="legendOfLeoWalletPreference"
    >
      <WalletModalProvider>
        {!checkingStoredConnection ? children : null}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
} 
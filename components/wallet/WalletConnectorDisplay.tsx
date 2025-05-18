'use client';

import { useState, useEffect } from 'react';
import { PuzzleWalletService } from '@/lib/services/PuzzleWalletService';
import Image from 'next/image';
import styles from './WalletConnector.module.css';

export const WalletConnectorDisplay = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const walletService = PuzzleWalletService.getInstance();

  // Only set up listeners, no actual wallet checks on load
  useEffect(() => {
    // Set up listener for connection changes
    const connectionListener = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        setAddress(walletService.getAddress() || '');
      }
    };

    // Add the listener, which will fire when the wallet connects
    walletService.addConnectionListener(connectionListener);

    // Check current state - this won't make API calls, just reads from memory
    if (walletService.isConnected()) {
      setIsConnected(true);
      setAddress(walletService.getAddress() || '');
    }

    // Clean up listener on unmount
    return () => {
      walletService.removeConnectionListener(connectionListener);
    };
  }, []);

  // Handle disconnect
  const handleDisconnect = async () => {
    await walletService.disconnectWallet();
    setDropdownOpen(false);
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Don't render anything if not connected
  if (!isConnected) {
    return null;
  }

  const formattedAddress = walletService.formatAddress(address);
  
  return (
    <div className={styles.walletContainer}>
      <div 
        className={styles.walletButton}
        onClick={toggleDropdown}
      >
        <div className={styles.walletAvatar}>
          <Image 
            src="/assets/ui/avatar.png" 
            alt="Wallet Avatar" 
            width={28} 
            height={28}
            onError={(e) => {
              // Fallback for missing wallet avatar image
              const target = e.target as HTMLImageElement;
              target.src = '/assets/ui/avatar.png';
            }}
          />
        </div>
        <div className={styles.walletAddress}>
          {formattedAddress}
        </div>
      </div>
      
      {dropdownOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownItem} onClick={handleDisconnect}>
            Disconnect
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnectorDisplay; 
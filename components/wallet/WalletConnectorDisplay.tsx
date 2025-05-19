'use client';

import React, { useState, useEffect } from 'react';
import { PuzzleWalletService } from '@/lib/services/PuzzleWalletService';
import Image from 'next/image';

// Inline styles to replace CSS modules
const styles = {
  walletContainer: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 1000,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  } as const,
  
  walletButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '20px',
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  } as const,
  
  walletButtonHover: {
    backgroundColor: 'rgba(20, 20, 20, 0.8)'
  } as const,
  
  walletAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    overflow: 'hidden',
    marginRight: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  } as const,
  
  walletAddress: {
    fontSize: '14px',
    color: 'white',
    fontWeight: 500,
    maxWidth: '100px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  } as const,
  
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '0',
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: '8px',
    width: '150px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'fadeIn 0.2s ease-in-out'
  } as const,
  
  dropdownItem: {
    padding: '12px 16px',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    backgroundColor: 'transparent'
  } as const,
  
  dropdownItemHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  } as const
};

export const WalletConnectorDisplay = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isDropdownItemHovered, setIsDropdownItemHovered] = useState(false);
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
  }, [walletService]);

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
    <div style={styles.walletContainer}>
      <div 
        style={{
          ...styles.walletButton,
          ...(isButtonHovered ? styles.walletButtonHover : {})
        }}
        onClick={toggleDropdown}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
      >
        <div style={styles.walletAvatar}>
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
        <div style={styles.walletAddress}>
          {formattedAddress}
        </div>
      </div>
      
      {dropdownOpen && (
        <div style={styles.dropdown}>
          <div 
            style={{
              ...styles.dropdownItem,
              ...(isDropdownItemHovered ? styles.dropdownItemHover : {})
            }}
            onClick={handleDisconnect}
            onMouseEnter={() => setIsDropdownItemHovered(true)}
            onMouseLeave={() => setIsDropdownItemHovered(false)}
          >
            Disconnect
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnectorDisplay; 
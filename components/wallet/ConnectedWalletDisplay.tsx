'use client';

import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useEffect, useState, useRef } from 'react';

export default function ConnectedWalletDisplay() {
  const { connected, publicKey, disconnect } = useWallet();
  const [isVisible, setIsVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Wait until connection is confirmed before showing
  useEffect(() => {
    if (connected && publicKey) {
      // Add a small delay for visual effect
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setDropdownOpen(false);
    }
  }, [connected, publicKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format the address to show beginning and end
  const formatAddress = (address: string | null) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnect();
    setDropdownOpen(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={dropdownRef}
      className="fixed top-4 right-4 z-50 font-mono"
    >
      {/* Main display button */}
      <div 
        className="flex items-center gap-2 bg-black/90 rounded-md py-2 px-3 text-white shadow-lg border border-green-500/30 cursor-pointer select-none"
        style={{
          animation: 'slideIn 0.3s ease-out',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        }}
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        {/* Avatar */}
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-green-400/50">
          <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-green-700"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            {publicKey ? publicKey.substring(0, 2).toUpperCase() : 'AL'}
          </div>
        </div>
        
        {/* Address */}
        <div className="font-mono text-sm text-green-100">
          {formatAddress(publicKey)}
        </div>
        
        {/* Dropdown indicator */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`w-4 h-4 text-green-300 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      
      {/* Dropdown menu */}
      {dropdownOpen && (
        <div 
          className="absolute top-full right-0 mt-2 w-48 bg-black/90 rounded-md shadow-lg border border-green-500/30 overflow-hidden"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <button 
            className="w-full px-4 py-3 text-left text-sm text-green-100 hover:bg-green-900/40 transition-colors duration-200 flex items-center gap-2"
            onClick={handleDisconnect}
          >
            Disconnect Wallet
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
} 
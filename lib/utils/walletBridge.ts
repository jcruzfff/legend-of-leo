'use client';

/**
 * This file provides a bridge between the Phaser game and React wallet components.
 * It creates a set of callbacks and event handling for wallet integration.
 */

// Event names
export const WALLET_EVENTS = {
  CONNECT_REQUEST: 'wallet-connect-request',
  CONNECTED: 'wallet-connected',
  DISCONNECT_REQUEST: 'wallet-disconnect-request',
  DISCONNECTED: 'wallet-disconnected',
  ERROR: 'wallet-error'
};

// Interface for wallet data
export interface WalletData {
  address: string;
  name?: string;
}

// Callback types
type ConnectCallback = () => void;
type ConnectedCallback = (walletData: WalletData) => void;
type DisconnectCallback = () => void;
type DisconnectedCallback = () => void;
type ErrorCallback = (error: string) => void;

// Callback registries
const connectCallbacks: ConnectCallback[] = [];
const connectedCallbacks: ConnectedCallback[] = [];
const disconnectCallbacks: DisconnectCallback[] = [];
const disconnectedCallbacks: DisconnectedCallback[] = [];
const errorCallbacks: ErrorCallback[] = [];

// Connect to wallet
export function connectWallet() {
  // This triggers connect request which the React component will listen for
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(WALLET_EVENTS.CONNECT_REQUEST);
    window.dispatchEvent(event);
    
    // Notify all registered callbacks
    connectCallbacks.forEach(callback => callback());
  }
}

// Notify that wallet is connected
export function walletConnected(walletData: WalletData) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(WALLET_EVENTS.CONNECTED, { detail: walletData });
    window.dispatchEvent(event);
    
    // Store wallet connection in localStorage for persistence
    try {
      localStorage.setItem('walletConnection', JSON.stringify({
        address: walletData.address
      }));
    } catch (error) {
      console.error('Failed to store wallet connection:', error);
    }
    
    // Notify all registered callbacks
    connectedCallbacks.forEach(callback => callback(walletData));
  }
}

// Disconnect wallet
export function disconnectWallet() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(WALLET_EVENTS.DISCONNECT_REQUEST);
    window.dispatchEvent(event);
    
    // Notify all registered callbacks
    disconnectCallbacks.forEach(callback => callback());
  }
}

// Notify that wallet is disconnected
export function walletDisconnected() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(WALLET_EVENTS.DISCONNECTED);
    window.dispatchEvent(event);
    
    // Clear stored wallet connection from localStorage
    try {
      localStorage.removeItem('walletConnection');
    } catch (error) {
      console.error('Failed to remove wallet connection:', error);
    }
    
    // Notify all registered callbacks
    disconnectedCallbacks.forEach(callback => callback());
  }
}

// Notify about wallet errors
export function walletError(error: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(WALLET_EVENTS.ERROR, { detail: error });
    window.dispatchEvent(event);
    
    // Notify all registered callbacks
    errorCallbacks.forEach(callback => callback(error));
  }
}

// Register event listeners
export function onConnectWallet(callback: ConnectCallback) {
  connectCallbacks.push(callback);
}

export function onWalletConnected(callback: ConnectedCallback) {
  connectedCallbacks.push(callback);
}

export function onDisconnectWallet(callback: DisconnectCallback) {
  disconnectCallbacks.push(callback);
}

export function onWalletDisconnected(callback: DisconnectedCallback) {
  disconnectedCallbacks.push(callback);
}

export function onWalletError(callback: ErrorCallback) {
  errorCallbacks.push(callback);
}

// Remove event listeners
export function offConnectWallet(callback: ConnectCallback) {
  const index = connectCallbacks.indexOf(callback);
  if (index !== -1) connectCallbacks.splice(index, 1);
}

export function offWalletConnected(callback: ConnectedCallback) {
  const index = connectedCallbacks.indexOf(callback);
  if (index !== -1) connectedCallbacks.splice(index, 1);
}

export function offDisconnectWallet(callback: DisconnectCallback) {
  const index = disconnectCallbacks.indexOf(callback);
  if (index !== -1) disconnectCallbacks.splice(index, 1);
}

export function offWalletDisconnected(callback: DisconnectedCallback) {
  const index = disconnectedCallbacks.indexOf(callback);
  if (index !== -1) disconnectedCallbacks.splice(index, 1);
}

export function offWalletError(callback: ErrorCallback) {
  const index = errorCallbacks.indexOf(callback);
  if (index !== -1) errorCallbacks.splice(index, 1);
} 
'use client';

/**
 * Level management utility for Legend of Leo
 * Handles tracking current level and dispatching level change events
 */

// Custom event for level changes
const LEVEL_CHANGED_EVENT = 'level-changed';
const WALLET_CONNECT_REQUEST = 'wallet-connect-request';

// Get the current level from localStorage
export function getCurrentLevel(): number {
  try {
    const savedLevel = localStorage.getItem('currentLevel');
    return savedLevel ? parseInt(savedLevel, 10) : 1;
  } catch (error) {
    console.error('[LevelManager] Error getting current level:', error);
    return 1; // Default to level 1 if there's an error
  }
}

// Set the current level and dispatch a change event
export function setCurrentLevel(level: number): void {
  try {
    const previousLevel = getCurrentLevel();
    
    // Ensure level is a positive number
    const validLevel = Math.max(1, level);
    
    // Store in localStorage
    localStorage.setItem('currentLevel', validLevel.toString());
    console.log(`[LevelManager] Level set to ${validLevel}`);
    
    // Dispatch level changed event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LEVEL_CHANGED_EVENT, {
        detail: { level: validLevel, previousLevel }
      }));
      
      // Removed wallet connection request - no longer needed
    }
  } catch (error) {
    console.error('[LevelManager] Error setting current level:', error);
  }
}

// Check if we're on level 2 or above (used to require wallet connection)
// Now always returns false since wallet is not required anymore
export function isWalletRequired(): boolean {
  return false; // Wallet is no longer required at any level
}

// Register a callback for level changes
export function onLevelChanged(callback: (level: number, previousLevel: number) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ level: number, previousLevel: number }>;
    callback(
      customEvent.detail?.level || 1,
      customEvent.detail?.previousLevel || 1
    );
  };
  
  window.addEventListener(LEVEL_CHANGED_EVENT, handler);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(LEVEL_CHANGED_EVENT, handler);
  };
} 
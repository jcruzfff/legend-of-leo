import { 
  connect, 
  getAccount, 
  requestSignature,
  disconnect,
  getBalance,
  requestCreateEvent,
  ConnectResponse,
  SignatureResponse,
  Network,
  GetSelectedAccountResponse,
  GetBalancesResponse,
  CreateEventResponse,
  ConnectionWithAccountInfo,
  ProgramIdPermissions,
  CreateEventRequestData,
  EventType
} from '@puzzlehq/sdk-core';

/**
 * Represents the balance information from the Puzzle Wallet
 */
interface Balance {
  tokenId: string;
  name: string;
  symbol?: string;
  decimals: number;
  supply?: number;
  maxSupply?: number;
  admin?: string;
  externalAuthorizationRequired?: boolean;
  externalAuthorizationParty?: string;
  isMTSP: boolean;
  programId: string;
  recordName: string;
  displayIfZero?: boolean;
  iconURL?: string;
  usageCount?: number;
  priority: number;
  coinbaseSymbol?: string;
  owner: string;
  network: Network;
  values: {
    private: number;
    public: number;
  };
}

/**
 * Service for interacting with Puzzle Wallet
 */
export class PuzzleWalletService {
  private static instance: PuzzleWalletService;
  private address: string | null = null;
  private connection: ConnectionWithAccountInfo | null = null;
  private balances: Balance[] = [];
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private connectionChecked: boolean = false;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PuzzleWalletService {
    if (!PuzzleWalletService.instance) {
      PuzzleWalletService.instance = new PuzzleWalletService();
    }
    return PuzzleWalletService.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Connect to Puzzle wallet
   * @returns True if connection was successful
   */
  public async connectWallet(): Promise<boolean> {
    try {
      console.log('[PuzzleWalletService] Connecting to Puzzle wallet...');
      
      // Suppress console errors during connection attempt
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const errorMessage = args.length > 0 ? String(args[0]) : '';
        
        // If the error is related to wallet/TRPC, completely suppress it
        if (
          errorMessage.includes('TRPCClientError') ||
          errorMessage.includes('No connection found for hostname') ||
          errorMessage.includes('Puzzle Wallet') ||
          errorMessage.includes('wallet')
        ) {
          // Completely suppress wallet-related errors
          return;
        }
        
        // Log other errors normally
        originalConsoleError.apply(console, args);
      };
      
      // Connect with required parameters according to docs
      let connectResult: ConnectResponse | undefined;
      try {
        connectResult = await connect({
          dAppInfo: {
            name: "Legend of Leo",
            description: "An educational game about blockchain & digital security",
          },
          permissions: {
            programIds: {
              [Network.AleoTestnet]: ['legend_of_leo_nft.aleo'], // Request permission for our NFT program
              [Network.AleoMainnet]: ['legend_of_leo_nft.aleo']  // Also request mainnet permissions
            } as ProgramIdPermissions
          }
        });
      } finally {
        // Restore original error handler
        console.error = originalConsoleError;
      }
      
      // Store connection information
      if (connectResult?.connection) {
        this.connection = connectResult.connection;
        this.address = connectResult.connection.address;
        this.connectionChecked = true;
        
        // Get balances if available
        if (connectResult.connection.balances) {
          this.balances = connectResult.connection.balances;
        } else {
          // Try to fetch balances separately
          await this.fetchBalances();
        }
        
        this.notifyConnectionListeners(true);
        console.log('[PuzzleWalletService] Connected successfully to:', this.address);
        return true;
      }
      
      console.log('[PuzzleWalletService] Connection failed or user cancelled');
      this.notifyConnectionListeners(false);
      return false;
    } catch (error) {
      console.warn('[PuzzleWalletService] Error connecting to wallet:', error);
      this.notifyConnectionListeners(false);
      return false;
    }
  }
  
  /**
   * Disconnect from the Puzzle wallet
   * @returns True if disconnection was successful
   */
  public async disconnectWallet(): Promise<boolean> {
    try {
      console.log('[PuzzleWalletService] Disconnecting from Puzzle wallet...');
      await disconnect();
      
      this.address = null;
      this.connection = null;
      this.balances = [];
      this.connectionChecked = false;
      this.notifyConnectionListeners(false);
      
      console.log('[PuzzleWalletService] Disconnected successfully');
      return true;
    } catch (error) {
      console.error('[PuzzleWalletService] Error disconnecting from wallet:', error);
      return false;
    }
  }
  
  /**
   * Fetch account balances
   * @returns Balance information if successful
   */
  public async fetchBalances(): Promise<Balance[] | null> {
    if (!this.address) {
      console.error('[PuzzleWalletService] Cannot fetch balances: No account connected');
      return null;
    }
    
    try {
      console.log('[PuzzleWalletService] Fetching balances...');
      // Pass required account parameter
      const balanceResponse: GetBalancesResponse = await getBalance({
        address: this.address
      });
      
      if (balanceResponse.balances) {
        this.balances = balanceResponse.balances;
        return this.balances;
      }
      return null;
    } catch (error) {
      console.error('[PuzzleWalletService] Error fetching balances:', error);
      return null;
    }
  }
  
  /**
   * Create an event
   * @param programId Program ID for the event
   * @param functionId Function ID to execute
   * @param inputs Array of inputs for the function
   * @param fee Fee amount for the transaction
   * @returns Event response if successful
   */
  public async createEvent(
    programId: string, 
    functionId: string, 
    inputs: string[],
    fee: number = 0
  ): Promise<CreateEventResponse | null> {
    if (!this.address) {
      console.error('[PuzzleWalletService] Cannot create event: No account connected');
      return null;
    }
    
    try {
      console.log('[PuzzleWalletService] Creating event for program:', programId, 'function:', functionId);
      
      const eventData: CreateEventRequestData = {
        type: EventType.Execute,
        programId,
        functionId,
        fee,
        inputs
      };
      
      const eventResponse = await requestCreateEvent(eventData);
      console.log('[PuzzleWalletService] Event created successfully:', eventResponse);
      return eventResponse;
    } catch (error) {
      console.error('[PuzzleWalletService] Error creating event:', error);
      return null;
    }
  }
  
  /**
   * Request a message signature from the wallet
   * @param message Message to sign
   * @returns Signature response
   */
  public async signMessage(message: string): Promise<SignatureResponse | null> {
    if (!this.address) {
      console.error('[PuzzleWalletService] Cannot sign message: No account connected');
      return null;
    }
    
    try {
      console.log('[PuzzleWalletService] Requesting signature for message:', message);
      const signature = await requestSignature({ message });
      console.log('[PuzzleWalletService] Signature response:', signature);
      return signature;
    } catch (error) {
      console.error('[PuzzleWalletService] Error signing message:', error);
      return null;
    }
  }
  
  /**
   * Check if a wallet is connected
   */
  public isConnected(): boolean {
    return !!this.address;
  }
  
  /**
   * Get the connected account address
   */
  public getAddress(): string | null {
    return this.address;
  }
  
  /**
   * Get account balances
   */
  public getBalances(): Balance[] {
    return this.balances;
  }
  
  /**
   * Check if the wallet has any Aleo credits available
   * @param minAmount Optional minimum amount required (default: 0.01)
   * @returns True if the wallet has sufficient credits
   */
  public hasAleoCredits(minAmount: number = 0.01): boolean {
    if (!this.balances.length) {
      return false;
    }
    
    // Look for Aleo credits in the balances
    const credits = this.balances.find(balance => 
      balance.coinbaseSymbol === 'credits' || 
      balance.name.toLowerCase().includes('credit') ||
      balance.symbol?.toLowerCase().includes('credit')
    );
    
    if (!credits) {
      return false;
    }
    
    // Check if the combined balance (public + private) is greater than or equal to minAmount
    const totalBalance = credits.values.private + credits.values.public;
    return totalBalance >= minAmount;
  }
  
  /**
   * Format wallet address to show only beginning and end
   */
  public formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  /**
   * Add a listener for connection status changes
   */
  public addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
    
    // Immediately notify the listener of current status
    if (this.isConnected()) {
      listener(true);
    }
  }
  
  /**
   * Remove a connection listener
   */
  public removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }
  
  /**
   * Notify all listeners of connection status change
   */
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }
  
  /**
   * Refresh the account connection status
   * @param skipApiCall If true, will only check local state without making API calls
   */
  public async refreshConnection(skipApiCall: boolean = true): Promise<boolean> {
    // If we already have a connection, just return true
    if (this.address) {
      return true;
    }
    
    // If we've already checked or want to skip API calls, don't try to reconnect
    if (this.connectionChecked || skipApiCall) {
      return false;
    }
    
    try {
      // Wrap getAccount in a silent try-catch to avoid console errors
      let result: GetSelectedAccountResponse | null = null;
      try {
        result = await getAccount();
      } catch (getAccountError) {
        // Silently handle TRPC errors from getAccount - these are expected when wallet isn't connected
        const errorMessage = getAccountError instanceof Error ? getAccountError.message : String(getAccountError);
        
        // Only log at debug level, don't use console.error
        if (
          errorMessage.includes('TRPCClientError') ||
          errorMessage.includes('No connection found for hostname') ||
          errorMessage.includes('Puzzle Wallet not detected')
        ) {
          console.log('[PuzzleWalletService] Wallet not connected yet - will connect on demand');
          this.connectionChecked = true;
          return false;
        }
        
        // Re-throw unexpected errors
        throw getAccountError;
      }
      
      if (result?.account) {
        this.address = result.account.address;
        this.connectionChecked = true;
        
        // Try to fetch balances when refreshing connection
        this.fetchBalances().catch(() => {
          console.log('[PuzzleWalletService] Could not fetch balances during refresh');
        });
        
        this.notifyConnectionListeners(true);
        return true;
      } else {
        this.address = null;
        this.balances = [];
        this.connection = null;
        this.connectionChecked = true;
        this.notifyConnectionListeners(false);
        return false;
      }
    } catch (error) {
      // Check if error indicates wallet is not detected or no connection
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle common expected errors silently - avoid using console.error
      if (
        errorMessage.includes('Puzzle Wallet not detected') || 
        errorMessage.includes('No connection found for hostname') ||
        errorMessage.includes('TRPCClientError') ||
        errorMessage.includes('wallet')
      ) {
        // This is expected for users who don't have the wallet or aren't connected yet
        // Use console.log instead of error
        console.log('[PuzzleWalletService] Wallet not detected or not connected');
      } else {
        // Only log unexpected errors
        console.warn('[PuzzleWalletService] Error refreshing connection:', error);
      }
      
      this.address = null;
      this.balances = [];
      this.connection = null;
      this.connectionChecked = true;
      this.notifyConnectionListeners(false);
      return false;
    }
  }
  
  /**
   * Mint an NFT from the Legend of Leo contract
   * @param name Name field for the NFT
   * @param image Image field reference for the NFT
   * @param edition Edition number as a scalar
   * @returns Event response if successful
   */
  public async mintLeoNFT(
    name: string = '123field', 
    image: string = '456field', 
    edition: string = '1scalar'
  ): Promise<CreateEventResponse | null> {
    if (!this.address) {
      console.error('[PuzzleWalletService] Cannot mint NFT: No account connected');
      return null;
    }
    
    try {
      console.log('[PuzzleWalletService] Minting Legend of Leo NFT...');
      
      // Suppress console errors during connection attempt
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const errorMessage = args.length > 0 ? String(args[0]) : '';
        
        // Suppress wallet-related errors
        if (
          errorMessage.includes('TRPCClientError') ||
          errorMessage.includes('No connection found for hostname') ||
          errorMessage.includes('Puzzle Wallet') ||
          errorMessage.includes('wallet')
        ) {
          return;
        }
        
        // Log other errors normally
        originalConsoleError.apply(console, args);
      };
      
      try {
        // Get the user's address for the receiver parameter
        const receiver = this.address;
        
        // These are the inputs that the mint function expects
        const inputs = [
          receiver, // receiver address
          name,     // name field
          image,    // image field
          edition   // edition scalar
        ];
        
        console.log('[PuzzleWalletService] Creating event with inputs:', {
          type: EventType.Execute,
          programId: 'legend_of_leo_nft.aleo',
          functionId: 'mint',
          fee: 0.01,
          inputs
        });
        
        // Create the mint event using the deployed contract
        const eventResponse = await requestCreateEvent({
          type: EventType.Execute,
          programId: 'legend_of_leo_nft.aleo', // Use the actual deployed program ID
          functionId: 'mint',                  // Use the mint function
          fee: 0.01,                           // Set appropriate fee
          inputs
        });
        
        // The SDK returns eventId, not id
        console.log('[PuzzleWalletService] NFT minted successfully:', eventResponse);
        
        // Make sure we have the full response with eventId
        if (!eventResponse.eventId) {
          console.warn('[PuzzleWalletService] Event response missing eventId:', eventResponse);
        }
        
        return eventResponse;
      } catch (error) {
        // Log detailed error information
        console.error('[PuzzleWalletService] Error in requestCreateEvent:', error);
        
        // Check if we need to reconnect with proper permissions
        if (error instanceof Error && 
            error.message.includes('No permissions set for any program IDs')) {
          console.log('[PuzzleWalletService] Attempting to reconnect with proper permissions...');
          
          // Disconnect first
          await this.disconnectWallet().catch(() => {});
          
          // Try to reconnect with proper permissions
          const reconnected = await this.connectWallet();
          if (reconnected) {
            console.log('[PuzzleWalletService] Successfully reconnected with proper permissions, try minting again');
          }
        }
        
        // Re-throw to handle at higher level
        throw error;
      } finally {
        // Restore original error handler
        console.error = originalConsoleError;
      }
    } catch (error) {
      console.warn('[PuzzleWalletService] Error minting NFT:', error);
      return null;
    }
  }
} 
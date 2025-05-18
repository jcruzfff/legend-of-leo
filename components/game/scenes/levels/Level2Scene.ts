'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';
import Player from '@/lib/classes/Player';
import { PuzzleWalletService } from '@/lib/services/PuzzleWalletService';

/**
 * Level2Scene - Digital Defense
 * 
 * This is the second level of the Legend of Leo game.
 * Players learn about digital security and protection in this level.
 */
export default class Level2Scene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private map?: Phaser.Tilemaps.Tilemap;
  private layers?: MapLayers;
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private interactionIndicator?: Phaser.GameObjects.Sprite;
  private nearbyObject?: Phaser.GameObjects.GameObject;
  private receptionist?: Phaser.GameObjects.Sprite;
  private keycardWall?: Phaser.GameObjects.Sprite; // Wall with keycard slot
  private exitGate?: Phaser.Physics.Arcade.Sprite;
  private hasKeycard: boolean = false; // Whether player has received keycard from receptionist
  
  // Puzzle wallet integration
  private walletService: PuzzleWalletService;
  private walletConnected: boolean = false;
  private walletAddress: string = '';
  private walletConnectionPending: boolean = false;
  private messageSigned: boolean = false;

  private walletDialogueGroup?: Phaser.GameObjects.Group;
  private temporaryMessageGroup?: Phaser.GameObjects.Group; // Group for temporary messages

  constructor() {
    super({ key: 'Level2Scene' });
    this.walletService = PuzzleWalletService.getInstance();
  }

  init() {
    // Store current scene in localStorage for development mode reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentScene', this.scene.key);
      console.log('Current scene saved:', this.scene.key);
    }
    
    // Initialize interactive objects array
    this.interactiveObjects = [];
  
  }


  preload() {
    // Check if critical textures already exist from other scenes
    const textureCheck = (key: string) => {
      if (this.textures.exists(key)) {
        console.log(`Texture "${key}" already exists, skipping load`);
        return true;
      }
      return false;
    };
    
    // Load player sprite sheet if needed
    if (!textureCheck('player')) {
      this.load.spritesheet('player', '/assets/sprites/player.png', {
        frameWidth: 48,  // Each frame is 48x66 pixels
        frameHeight: 66,
        spacing: 0,
        margin: 0
      });
    }
    
    // Load floor tile
    if (!textureCheck('floor')) {
      this.load.image('floor', '/assets/maps/floor.png');
    }
    
    // Create wall texture
    this.createWallTexture();
    
    // Load level 2 tilemap
    this.load.tilemapTiledJSON('level2', '/assets/maps/levels/level2.json');
    
    // Load additional tile images for the map
    if (!textureCheck('wall')) {
      this.load.image('wall', '/assets/maps/wall.png');
    }
    
    if (!textureCheck('backwall')) {
      this.load.image('backwall', '/assets/maps/backwall.png');
    }

    if (!textureCheck('backwall-keycard')) {
      this.load.image('backwall-keycard', '/assets/maps/backwall-keycard.png');
    }

    if (!textureCheck('backwall-exit')) {
      this.load.image('backwall-exit', '/assets/maps/backwall-exit.png');
    }
    
    if (!textureCheck('couch-L1')) {
      this.load.image('couch-L1', '/assets/maps/couch-L1.png');
    }

    if (!textureCheck('left-couch')) {
      this.load.image('left-couch', '/assets/maps/left-couch.png');
    }
    
    if (!textureCheck('tower-L1')) {
      this.load.image('tower-L1', '/assets/maps/tower-L1.png');
    }

    if (!textureCheck('girl-reception')) {
      this.load.image('girl-reception', '/assets/maps/girl-reception.png');
    }

    // Load blue gate as a spritesheet with seven frames
    if (!textureCheck('blue-gate')) {
      this.load.spritesheet('blue-gate', '/assets/sprites/blue-gate.png', {
        frameWidth: 192,  // Each frame is 192px wide
        frameHeight: 93,  // Height from the texture
        spacing: 0,
        margin: 0,
        endFrame: 6 // Load all 7 frames (0-6)
      });
    }
    
    // Load border tiles
    const borderTiles = [
      'top-border', 'left-border', 'right-border', 'bottom-border',
      'left-t-corner-border', 'right-t-corner-border', 'left-b-corner-border', 'right-b-corner-border',
      'left-t-edge-corner', 'right-t-edge-corner', 'left-b-edge-corner', 'right-b-edge-corner'
    ];
    
    borderTiles.forEach(key => {
      if (!textureCheck(key)) {
        this.load.image(key, `/assets/maps/${key}.png`);
      }
    });

    // Create a white particle texture if it doesn't exist
    if (!this.textures.exists('white-particle')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xFFFFFF, 1);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('white-particle', 8, 8);
      graphics.destroy();
    }
  }

  /**
   * Create a wall texture for the level boundaries
   */
  createWallTexture() {
    // Skip if texture already exists
    if (this.textures.exists('wall')) {
      console.log('Wall texture already exists, reusing existing texture');
      return;
    }

    const size = 48; // Match the floor tile size
    
    // Create a canvas texture for the wall
    const wallCanvas = this.textures.createCanvas('wall', size, size);
    const ctx = wallCanvas?.getContext();
    
    if (!wallCanvas || !ctx) {
      console.error('Failed to create canvas texture for wall');
      return;
    }
    
    // Draw a simple wall texture
    ctx.fillStyle = '#6D5D4B'; // Brown wall color
    ctx.fillRect(0, 0, size, size);
    
    // Add some brick pattern
    ctx.fillStyle = '#5D4D3B'; // Darker brown for brick lines
    
    // Horizontal brick lines
    for (let y = 12; y < size; y += 12) {
      ctx.fillRect(0, y, size, 2);
    }
    
    // Vertical brick lines (offset every other row)
    for (let x = 0; x < size; x += 24) {
      ctx.fillRect(x, 0, 2, 12);
      ctx.fillRect(x + 12, 12, 2, 12);
      ctx.fillRect(x, 24, 2, 12);
      ctx.fillRect(x + 12, 36, 2, 12);
    }
    
    // Add some highlight and shadow to give depth
    ctx.strokeStyle = '#7D6D5B'; // Lighter color for highlights
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    
    // Update the canvas texture
    wallCanvas.refresh();
  }

  async create() {
    // Disable physics debugging
    this.physics.world.debugGraphic.clear();
    this.physics.world.debugGraphic.visible = false;
    
    // Set the background color
    this.cameras.main.setBackgroundColor('#2B2A3D');
    
    // Try to load tilemap or fall back to a basic level
    try {
      console.log('Loading level2 tilemap...');
      const { map, layers } = loadTilemap(
        this,
        'level2',
        ['Floor', 'Backwall', 'Objects', 'Collision'],
        ['Collision'] // Only use the Collision layer for collisions
      );
      
      this.map = map;
      this.layers = layers;
      
      // Set world bounds based on the map dimensions
      if (this.map) {
        const mapWidth = this.map.widthInPixels;
        const mapHeight = this.map.heightInPixels;
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
        console.log(`Map dimensions: ${mapWidth}x${mapHeight}`);
        
        // Center the map in the game canvas
        this.centerMap();
      }
    } catch (error) {
      console.error('Failed to load level2 tilemap:', error);
      // Fall back to creating a programmatic level
      this.createBasicLevel();
    }
    
    // Create player at starting position
    // Set the player to start at the bottom entrance of the level
    const tileSize = 48;
    const startX = 8.5 * tileSize; // Center of the bottom entrance (horizontally)
    const startY = 13 * tileSize;  // Bottom entrance (vertically)
    this.player = new Player(this, startX, startY);
    
    // Add collision with the Collision layer
    if (this.player && this.layers) {
      addCollision(this, this.player.sprite, this.layers, ['Collision']);
    }
    
    // Set up input
    this.cursors = this.input?.keyboard?.createCursorKeys();
    
    // Add space key for interactions
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.interactWithNearbyObject();
    });
    
    // Set up camera to follow player
    if (this.player) {
      this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
      this.cameras.main.setZoom(1);
      
      // Set camera bounds based on the map
      if (this.map) {
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
      }
      
      // Add a subtle deadzone for smoother camera
      this.cameras.main.setDeadzone(100, 100);
    }
    
    // Setup wallet connection checking - wrapping in try/catch and swallowing any errors
    this.setupWalletConnection();
    
    // Create the exit gate
    this.createExitGate();
  }
  
  /**
   * Setup wallet connection checking in a separate method
   * to keep the create method cleaner
   */
  private async setupWalletConnection() {
    try {
      // First check if console.error is being logged to the browser console
      const originalConsoleError = console.error;
      const temporaryErrorLog: string[] = [];
      
      // Temporarily override console.error to suppress wallet connection errors
      console.error = (...args) => {
        const errorMessage = args.length > 0 ? String(args[0]) : '';
        
        // Capture the error for debugging but don't output to console
        temporaryErrorLog.push(errorMessage);
        
        // If any of these strings are in the error message, suppress the error
        const suppressPatterns = [
          'TRPCClientError',
          'No connection found for hostname',
          'Puzzle Wallet',
          'wallet',
          'extension',
          'getAccount'
        ];
        
        // Check if any suppression pattern matches the error message
        const shouldSuppress = suppressPatterns.some(pattern => 
          errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (shouldSuppress) {
          // Don't log this error to console
          console.log('[Level2Scene] Suppressed wallet error:', args[0]);
          return;
        }
        
        // Log other errors normally
        originalConsoleError.apply(console, args);
      };
      
      // Quietly check for wallet connection - suppress all console output
      // Pass false to actually call the API and check for a connection
      await this.walletService.refreshConnection(false).catch(() => {
        // Completely swallow any errors - wallet will be required at interaction time
      });
      
      // Restore original console.error behavior
      console.error = originalConsoleError;
      
      // Only update state if wallet is connected
      if (this.walletService.isConnected()) {
        this.walletConnected = true;
        this.walletAddress = this.walletService.getAddress() || '';
      }
    } catch {
      // Completely swallow any errors - wallet will be required at interaction time
      // Do not log anything to console or disrupt game flow
    }
  }
  
  /**
   * Center the map within the game window
   */
  centerMap() {
    if (!this.map) return;
    
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    const offsetX = Math.max(0, (gameWidth - mapWidth) / 2);
    const offsetY = Math.max(0, (gameHeight - mapHeight) / 2);
    
    if (this.map.layers) {
      this.map.layers.forEach(layer => {
        if (layer.tilemapLayer) {
          layer.tilemapLayer.x = offsetX;
          layer.tilemapLayer.y = offsetY;
        }
      });
    }
    
    this.physics.world.setBounds(offsetX, offsetY, mapWidth, mapHeight);
    this.cameras.main.setBounds(offsetX, offsetY, mapWidth, mapHeight);
  }
  
  /**
   * Create a basic level layout as a fallback
   */
  createBasicLevel() {
    const levelWidth = 15;
    const levelHeight = 12;
    const tileSize = 48;
    
    this.map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: levelWidth,
      height: levelHeight
    });
    
    // Add tilesets, but first check if the textures exist
    if (!this.textures.exists('floor')) {
      console.error('Floor texture missing, some visual elements may not display correctly');
    }
    if (!this.textures.exists('wall')) {
      console.error('Wall texture missing, some visual elements may not display correctly');
    }
    
    const floorTiles = this.map.addTilesetImage('floor', 'floor');
    const wallTiles = this.map.addTilesetImage('wall', 'wall');
    
    if (!floorTiles || !wallTiles) {
      console.error('Failed to add tilesets');
      return;
    }
    
    const floorLayer = this.map.createBlankLayer('Floor', floorTiles);
    const wallsLayer = this.map.createBlankLayer('Walls', wallTiles);
    
    if (!floorLayer || !wallsLayer) {
      console.error('Failed to create map layers');
      return;
    }
    
    this.layers = {
      Floor: floorLayer,
      Walls: wallsLayer
    };
    
    // Fill the floor with tiles
    floorLayer.fill(0, 0, 0, levelWidth, levelHeight);
    
    // Create walls around the perimeter
    for (let x = 0; x < levelWidth; x++) {
      wallsLayer.putTileAt(0, x, 0);
      wallsLayer.putTileAt(0, x, levelHeight - 1);
    }
    
    for (let y = 0; y < levelHeight; y++) {
      wallsLayer.putTileAt(0, 0, y);
      wallsLayer.putTileAt(0, levelWidth - 1, y);
    }
    
    // Set collision for wall layer
    wallsLayer.setCollisionByExclusion([-1]);
  }
  

  
  /**
   * Check for interactive objects near the player
   */
  checkInteractiveObjects() {
    if (!this.player) return;
    
    // Find all interactive objects in range
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Interaction range
    let closestObject: Phaser.GameObjects.GameObject | undefined;
    let closestDistance = interactDistance;
    
    // Find the closest interactive object in range
    this.interactiveObjects.forEach(obj => {
      // Skip objects specifically marked as not visible for interaction
      if (obj.getData('visible') === false) return;
      
      let objX = 0;
      let objY = 0;
      
      if ('getCenter' in obj) {
        const center = (obj as unknown as Phaser.GameObjects.Sprite).getCenter();
        objX = center.x;
        objY = center.y;
      } else if ('x' in obj && 'y' in obj) {
        objX = (obj as unknown as { x: number }).x;
        objY = (obj as unknown as { y: number }).y;
      }
      
      const distance = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y,
        objX, objY
      );
      
      if (distance < closestDistance) {
        closestObject = obj;
        closestDistance = distance;
      }
    });
    
    // If we found an object in range, show indicator
    if (closestObject && closestObject !== this.nearbyObject) {
      this.nearbyObject = closestObject;
      this.showInteractionIndicator(closestObject);
    } 
    // If we moved out of range of the previous object
    else if (!closestObject && this.nearbyObject) {
      this.hideInteractionIndicator();
      this.nearbyObject = undefined;
    }
  }
  
  /**
   * Show interaction indicator above an object
   */
  showInteractionIndicator(object: Phaser.GameObjects.GameObject) {
    let objX = 0;
    let objY = 0;
    
    // Check if this object has a custom indicator target
    const indicatorTarget = object.getData('indicatorTarget');
    const targetObject = indicatorTarget || object;
    
    if ('getCenter' in targetObject) {
      const center = (targetObject as unknown as Phaser.GameObjects.Sprite).getCenter();
      objX = center.x;
      objY = center.y;
    } else if ('x' in targetObject && 'y' in targetObject) {
      objX = (targetObject as unknown as { x: number }).x;
      objY = (targetObject as unknown as { y: number }).y;
    }
    
    // Position above the object
    const x = objX;
    const y = objY - 40;
    
    // If we don't have an indicator yet, create one
    if (!this.interactionIndicator) {
      // Create a simple indicator
      this.interactionIndicator = this.add.sprite(x, y, 'interaction-indicator');
      
      if (!this.textures.exists('interaction-indicator')) {
        console.log('Creating interaction indicator texture');
        const graphics = this.make.graphics({ x: 0, y: 0 });
        
        // Draw a small white dot with a glow effect
        graphics.fillStyle(0xFFFFFF, 0.8);
        graphics.fillCircle(16, 16, 4);
        
        // Add a subtle glow/halo
        graphics.fillStyle(0xFFFFFF, 0.3);
        graphics.fillCircle(16, 16, 8);
        
        graphics.generateTexture('interaction-indicator', 32, 32);
      }
      
      // Add a subtle bobbing animation
      this.tweens.add({
        targets: this.interactionIndicator,
        y: y - 6,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Add a subtle pulsing effect
      this.tweens.add({
        targets: this.interactionIndicator,
        alpha: 0.6,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Set the texture and make visible
    this.interactionIndicator.setTexture('interaction-indicator');
    this.interactionIndicator.setVisible(true);
    this.interactionIndicator.setPosition(x, y);
    
    // Set high depth to ensure it's visible
    this.interactionIndicator.setDepth(200);
  }
  
  /**
   * Hide the interaction indicator
   */
  hideInteractionIndicator() {
    if (this.interactionIndicator) {
      this.interactionIndicator.setVisible(false);
    }
  }
  
  /**
   * Interact with the nearby object if one exists
   */
  interactWithNearbyObject() {
    if (this.nearbyObject) {
      // Check if it's the exit gate
      if (this.nearbyObject === this.exitGate) {
        this.useKeycardOnWall();
        return;
      }
      
      // For other interactive objects with handlers
      const onInteract = this.nearbyObject.getData('onInteract');
      if (typeof onInteract === 'function') {
        onInteract();
      }
    }
  }

  /**
   * Create the receptionist NPC
   */
  createReceptionist() {
    // Position the receptionist at the reception desk
    const tileSize = 48;
    const receptionistX = 12 * tileSize;
    const receptionistY = 5.5 * tileSize;
    
    console.log('Creating receptionist interaction at:', receptionistX, receptionistY);
    
    // Create receptionist sprite
    this.receptionist = this.add.sprite(receptionistX, receptionistY, 'girl-reception');
    this.receptionist.setAlpha(0.01); // Almost invisible - just for position
    
    // Create interaction zone in front of the desk
    const interactionZoneX = 14 * tileSize;
    const interactionZoneY = 7.5 * tileSize; // Position in front of desk where player would stand
    
    // Create interaction zone rectangle
    const interactionZone = this.add.rectangle(
      interactionZoneX,
      interactionZoneY,
      tileSize * 2,
      tileSize
    );
    
    // Create indicator target above the receptionist
    const indicatorTargetX = receptionistX + (tileSize * 2); // Positioned to the right
    const indicatorTargetY = receptionistY; // Same Y position
    
    // Create an invisible sprite as the indicator target
    const indicatorTarget = this.add.sprite(indicatorTargetX, indicatorTargetY, 'interaction-indicator');
    indicatorTarget.setAlpha(0); // Completely invisible
    
    // Make the interaction zone interactive and set the indicator target
    interactionZone.setData('interactive', true);
    interactionZone.setData('onInteract', () => {
      this.showReceptionistDialogue();
    });
    interactionZone.setData('indicatorTarget', indicatorTarget);
    
    // Add to interactive objects array
    this.interactiveObjects.push(interactionZone);
    
    // Also create the keycard wall interaction point
    this.createKeycardWall();
  }

  /**
   * Create the keycard wall interaction point
   */
  createKeycardWall() {
    const tileSize = 48;
    const keycardWallX = 10 * tileSize + (tileSize / 2);
    const keycardWallY = 2 * tileSize + (tileSize / 2);
    
    console.log('Creating keycard wall at:', keycardWallX, keycardWallY);
    
    // Create the keycard wall sprite
    this.keycardWall = this.add.sprite(keycardWallX, keycardWallY, 'backwall-keycard');
    
    // Create interaction zone below the keycard wall (where player would stand)
    const interactionZoneX = keycardWallX;
    const interactionZoneY = keycardWallY + tileSize; // Position one tile below
    
    const interactionZone = this.add.rectangle(
      interactionZoneX,
      interactionZoneY,
      tileSize * 2,
      tileSize
    );
    
    // Make interaction zone interactive but completely invisible
    interactionZone.setData('interactive', true);
    interactionZone.setData('onInteract', () => {
      this.useKeycardOnWall();
    });
    
    // Create just one subtle glow effect around the terminal
    const glowGraphics = this.add.graphics();

    glowGraphics.strokeRect(keycardWallX - 24, keycardWallY - 24, 48, 48);
    
    // Add a pulsing animation to the glow
    this.tweens.add({
      targets: glowGraphics,
      alpha: { from: 0.2, to: 0 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(interactionZone);
  }

  /**
   * Show dialogue from receptionist
   */
  showReceptionistDialogue() {
    // Create a dialogue box
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const dialogueBox = this.add.rectangle(
      width / 2,
      height - 135,
      width - 30,
      260,
      0x000000,
      0.9
    );
    dialogueBox.setScrollFactor(0);
    dialogueBox.setOrigin(0.5);
    dialogueBox.setStrokeStyle(2, 0xFFFFFF);
    dialogueBox.setData('role', 'dialogBox');
    
    let message = '';
    let buttonText = '';
    let buttonColor = 0x4CAF50; // Default green
    
    // Determine message based on wallet connection state
    if (this.walletService.isConnected() && this.messageSigned) {
      // Wallet is connected and message is signed - provide keycard
      message = `Welcome! Your identity has been verified with address ${this.walletService.formatAddress(this.walletService.getAddress() || 'unknown')}. Your security keycard is ready to use.`;
      buttonText = 'Take Keycard';
      buttonColor = 0x4CAF50; // Green
    } else if (this.walletService.isConnected() && !this.messageSigned) {
      // Wallet is connected but signature needed
      message = `Please sign a message to verify your identity and gain access to secured areas.`;
      buttonText = 'Sign Message';
      buttonColor = 0x2196F3; // Blue
    } else {
      // Wallet not connected
      message = 'Welcome to the Digital Defense Center! Please connect your Puzzle wallet to verify your identity and receive a security keycard.';
      buttonText = 'Connect Wallet';
      buttonColor = 0xFFA000; // Orange
    }
    
    const text = this.add.text(
      width / 2,
      height - 160,
      '', // Start empty for typewriter effect
      {
        fontSize: '24px',
        color: '#FFFFFF',
        align: 'center',
        wordWrap: { width: width - 60 },
        lineSpacing: 8
      }
    );
    text.setScrollFactor(0);
    text.setOrigin(0.5);
    text.setData('role', 'mainText');
    
    // Create action button
    const actionButton = this.add.rectangle(
      width / 2,
      height - 60,
      160,
      40,
      buttonColor
    );
    actionButton.setScrollFactor(0);
    actionButton.setInteractive({ useHandCursor: true });
    actionButton.setVisible(false); // Hide initially
    actionButton.setData('role', 'actionButton');
    
    const buttonTextObj = this.add.text(
      width / 2,
      height - 60, 
      buttonText,
      {
        fontSize: '16px',
        color: '#FFFFFF'
      }
    );
    buttonTextObj.setScrollFactor(0);
    buttonTextObj.setOrigin(0.5);
    buttonTextObj.setVisible(false); // Hide initially
    buttonTextObj.setData('role', 'buttonText');
    
    // Group all dialogue elements
    this.walletDialogueGroup = this.add.group([dialogueBox, text, actionButton, buttonTextObj]);
    
    // Typewriter effect
    let currentChar = 0;
    const typingSpeed = 10; // milliseconds per character
    
    const typewriterTimer = this.time.addEvent({
      delay: typingSpeed,
      callback: () => {
        text.setText(message.substring(0, currentChar));
        currentChar++;
        
        // When typing is complete, show the button
        if (currentChar > message.length) {
          typewriterTimer.destroy();
          actionButton.setVisible(true);
          buttonTextObj.setVisible(true);
        }
      },
      repeat: message.length
    });
    
    // Function to handle button click
    const handleButtonClick = async () => {
      // Disable button to prevent multiple clicks
      actionButton.disableInteractive();
      buttonTextObj.setText('Please wait...');
      
      if (this.walletService.isConnected() && this.messageSigned) {
        // If wallet connected and message signed, give keycard
        this.cleanupDialogue();
        this.hasKeycard = true;
        // Add success particles for visual effect
        this.addWalletSuccessParticles();
      } 
      else if (this.walletService.isConnected() && !this.messageSigned) {
        // If wallet connected but message not signed, request signature
        const message = "I verify my identity to access the Digital Defense Center";
        const signatureResponse = await this.walletService.signMessage(message);
        
        if (signatureResponse) {
          // Signature successful
          this.messageSigned = true;
          this.cleanupDialogue();
          // Show new dialogue with keycard option
          this.time.delayedCall(500, () => this.showReceptionistDialogue());
        } else {
          // Signature failed or rejected
          buttonTextObj.setText('Sign Message');
          actionButton.setInteractive({ useHandCursor: true });
          
          // Show error message
          this.showTemporaryMessage('Signature failed or rejected. Please try again.');
        }
      } 
      else {
        // If wallet not connected, try to connect
        const connected = await this.walletService.connectWallet();
        
        if (connected) {
          this.walletConnected = true;
          this.walletAddress = this.walletService.getAddress() || '';
          this.cleanupDialogue();
          // Show new dialogue for signature
          this.time.delayedCall(500, () => this.showReceptionistDialogue());
        } else {
          // Connection failed
          buttonTextObj.setText('Connect Wallet');
          actionButton.setInteractive({ useHandCursor: true });
          
          // Show error message
          this.showTemporaryMessage('Wallet connection failed. Please try again.');
        }
      }
    };
    
    // Handle button click
    actionButton.on('pointerdown', handleButtonClick);
    
    // Add keyboard support for Enter key
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (actionButton.visible && actionButton.input?.enabled) {
        handleButtonClick();
      }
    });
    
    // Add hover effects
    actionButton.on('pointerover', () => {
      actionButton.setFillStyle(buttonColor - 0x080808);
    });
    actionButton.on('pointerout', () => {
      actionButton.setFillStyle(buttonColor);
    });
  }

  /**
   * Show a temporary message that fades out
   */
  showTemporaryMessage(message: string, duration: number = 3000) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Remove any existing temporary message
    if (this.temporaryMessageGroup) {
      this.temporaryMessageGroup.destroy(true);
    }
    
    // Create background
    const msgBackground = this.add.rectangle(
      width / 2,
      height / 2 - 50,
      width - 60,
      80,
      0x000000,
      0.8
    );
    msgBackground.setScrollFactor(0);
    msgBackground.setStrokeStyle(1, 0xFF5722);
    
    // Create text
    const msgText = this.add.text(
      width / 2,
      height / 2 - 50,
      message,
      {
        fontSize: '18px',
        color: '#FFFFFF',
        align: 'center',
        wordWrap: { width: width - 80 }
      }
    );
    msgText.setScrollFactor(0);
    msgText.setOrigin(0.5);
    
    // Group elements
    this.temporaryMessageGroup = this.add.group([msgBackground, msgText]);
    
    // Add fade out effect
    this.tweens.add({
      targets: this.temporaryMessageGroup.getChildren(),
      alpha: 0,
      delay: duration - 500,
      duration: 500,
      onComplete: () => {
        if (this.temporaryMessageGroup) {
          this.temporaryMessageGroup.destroy(true);
          this.temporaryMessageGroup = undefined;
        }
      }
    });
  }

  // Add success particle effect
  addWalletSuccessParticles() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create particles using the white-particle texture we already loaded
    if (this.textures.exists('white-particle')) {
      const emitter = this.add.particles(width / 2, height - 150, 'white-particle', {
        speed: { min: 50, max: 200 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 800,
        blendMode: 'ADD',
        tint: 0x4CAF50, // Green color
        emitting: false
      });
      
      // Emit particles
      emitter.explode(20);
      
      // Destroy after animation completes
      this.time.delayedCall(1000, () => {
        emitter.destroy();
      });
    }
  }
  
  // Clean up dialogue and proceed
  cleanupDialogue() {
    // Remove the keyboard listener
    this.input.keyboard?.off('keydown-ENTER');
    
    // Destroy the dialogue
    if (this.walletDialogueGroup) {
      this.walletDialogueGroup.destroy(true);
      this.walletDialogueGroup = undefined;
    }
  }

  /**
   * Use keycard on the wall terminal to open the gate
   */
  useKeycardOnWall() {
    if (!this.hasKeycard) {
      // Player doesn't have the keycard yet
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      const message = "You need to get a security keycard from the receptionist desk first.";
      
      const noKeycardText = this.add.text(
        width / 2,
        height / 2,
        message,
        {
          fontSize: '18px',
          color: '#FFFFFF',
          backgroundColor: '#00000080',
          padding: { x: 15, y: 10 },
        }
      );
      noKeycardText.setScrollFactor(0);
      noKeycardText.setOrigin(0.5);
      
      // Auto fade out after 3 seconds
      this.tweens.add({
        targets: noKeycardText,
        alpha: 0,
        duration: 500,
        delay: 2500,
        onComplete: () => {
          noKeycardText.destroy();
        }
      });
      
      return;
    }
    
    // Player has the keycard, open the exit gate
    console.log('[Level2Scene] Using keycard on wall terminal');
    
    // Disable the keycard wall interaction
    if (this.keycardWall) {
      this.keycardWall.removeInteractive();
      this.keycardWall.setData('visible', false);
    }
    
    // Open the exit gate
    this.openExitGate();
  }

  /**
   * Create the exit gate
   */
  createExitGate() {
    try {
      const tileSize = 48;
      
      // Use the positions set by the user
      const exitGateX = 8 * tileSize;
      const exitGateY = 3 * tileSize;
      
      console.log('Creating exit gate at:', exitGateX, exitGateY);
      
      // Create the gate sprite with the blue-gate texture
      this.exitGate = this.physics.add.sprite(exitGateX, exitGateY, 'blue-gate');
      this.exitGate.setTexture('blue-gate', 0); // Set to the first frame (gate closed)
      
      // Use the user-set dimensions
      const frameWidth = 192;
      const textureHeight = 96;
      
      // Set up the sprite's frame configuration
      this.exitGate.setDisplaySize(frameWidth, textureHeight);
      
      // Store the frame dimensions for the animation
      this.exitGate.setData('frameWidth', frameWidth);
      this.exitGate.setData('textureHeight', textureHeight);
      
      // Set the physics body to match the visible portion
      this.exitGate.setSize(frameWidth, textureHeight);
      
      // Center the origin for proper positioning
      this.exitGate.setOrigin(0.5, 0.5);
      
      // Make the gate immovable and add collision with player
      this.exitGate.setImmovable(true);
      if (this.player) {
        this.physics.add.collider(this.player.sprite, this.exitGate);
      }
      
      // Set a flag to indicate the gate is locked initially
      this.exitGate.setData('isOpen', false);
      
      // Make the debug outline invisible by setting it to a fully transparent color
      this.exitGate.setDebugBodyColor(0x000000);
      
    } catch (error) {
      console.error('Error creating exit gate:', error);
    }
    
    // Create the receptionist after setting up the gate
    this.createReceptionist();
  }

  /**
   * Open the exit gate with animation
   */
  openExitGate() {
    if (!this.exitGate) return;
    
    // If the gate is already open, don't play the animation again
    if (this.exitGate.getData('isOpen')) {
      console.log('Gate is already open');
      return;
    }
    
    // Disable the collision body to allow player to pass through
    if (this.exitGate.body) {
      this.exitGate.body.enable = false;
    }
    
    // Create animation frames for the gate if they don't exist
    if (!this.anims.exists('blue-gate-open')) {
      const frames = [];
      for (let i = 0; i <= 6; i++) {
        frames.push({ key: 'blue-gate', frame: i });
      }
      
      this.anims.create({
        key: 'blue-gate-open',
        frames: frames,
        frameRate: 10,
        repeat: 0 // Play once
      });
    }
    
    // Play the opening animation
    this.exitGate.play('blue-gate-open');
    
    // Mark the gate as open
    this.exitGate.setData('isOpen', true);
    
    // Show a message about the gate opening
    
    
    // Add particle effect
    this.addGateOpeningEffect(this.exitGate.x, this.exitGate.y);
    
    // Remove text after a few seconds
  
  }

  /**
   * Add a particle effect when the gate opens
   */
  addGateOpeningEffect(x: number, y: number) {
    try {
      // Create a particle emitter for the gate opening effect - matching Level 1
      const particles = this.add.particles(x, y, 'blue-gate', {
        frame: 0,
        quantity: 15,
        lifespan: 1000,
        scale: { start: 0.05, end: 0 },
        speed: { min: 50, max: 100 },
        alpha: { start: 0.7, end: 0 },
        blendMode: 'ADD',
        emitting: false
      });
      
      // Emit a burst of particles
      particles.explode(15);
      
      // Add a glowing effect
      const glow = this.add.sprite(x, y, 'blue-gate');
      glow.setCrop(0, 0, 192, glow.height); // Use the correct frame width
      glow.setBlendMode('ADD');
      glow.setAlpha(0.3);
      
      // Animate the glow
      this.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          glow.destroy();
        }
      });
      
      // Clean up after particles are done
      this.time.delayedCall(1500, () => {
        particles.destroy();
      });
    } catch (error) {
      console.error('Error creating gate particles:', error);
    }
  }

  /**
   * Check if player walks through the open gate to trigger level transition
   */
  checkPlayerExitGate() {
    if (!this.player || !this.exitGate) return;
    
    // Only check if the gate is open
    if (!this.exitGate.getData('isOpen')) return;
    
    // If player is within the gate bounds
    const playerBounds = this.player.sprite.getBounds();
    const gateBounds = this.exitGate.getBounds();
    
    if (Phaser.Geom.Rectangle.Overlaps(playerBounds, gateBounds)) {
      // Prevent multiple transitions
      if (this.exitGate.getData('transitioning')) return;
      
      this.exitGate.setData('transitioning', true);
      this.transitionToNextLevel();
    }
  }

  /**
   * Transition to the next level
   */
  transitionToNextLevel() {
    // Fade out effect
    this.cameras.main.fade(1000, 0, 0, 0);
    
    // Wait for fade to complete then change scene
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Go to Level 3 instead of returning to Level 1
      this.scene.start('Level3Scene');
    });
  }

  /**
   * Update - called each frame
   */
  update() {
    if (!this.player || !this.cursors) return;
    
    // Update player movement and animations
    this.player.update(this.cursors);
    
    // Check for nearby interactive objects
    this.checkInteractiveObjects();
    
    // Check if player is walking through the open gate
    this.checkPlayerExitGate();
  }
} 
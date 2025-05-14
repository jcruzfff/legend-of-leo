'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';
import Player from '@/lib/classes/Player';
import { 
  connectWallet, 
  onWalletConnected, 
  onWalletError,
  offWalletConnected,
  offWalletError,
  WalletData
} from '@/lib/utils/walletBridge';

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
  
  // Wallet integration
  private walletConnected: boolean = false;
  private walletConnectionPending: boolean = false;
  private walletSkipped: boolean = false; // Flag to track if user skipped the wallet connection
  private walletAddress?: string;
  private walletDialogueGroup?: Phaser.GameObjects.Group;
  private temporaryMessageGroup?: Phaser.GameObjects.Group; // Group for temporary messages

  constructor() {
    super({ key: 'Level2Scene' });
  }

  init() {
    // Store current scene in localStorage for development mode reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentScene', this.scene.key);
      console.log('Current scene saved:', this.scene.key);
    }
    
    // Initialize interactive objects array
    this.interactiveObjects = [];
    
    // Reset wallet integration state
    this.walletConnected = false;
    this.walletAddress = '';
    this.walletConnectionPending = false;
    
    // Check for existing wallet connection
    this.checkStoredWalletConnection();
    
    // Set up wallet connection listeners
    this.setupWalletListeners();
  }

  // Check if wallet connection is stored in localStorage
  checkStoredWalletConnection() {
    if (typeof window !== 'undefined') {
      const savedConnection = localStorage.getItem('walletConnection');
      if (savedConnection) {
        try {
          const { address } = JSON.parse(savedConnection);
          if (address) {
            console.log('Found stored wallet connection:', address);
            this.walletConnected = true;
            this.walletAddress = address;
            this.hasKeycard = true; // Auto-grant keycard if wallet is connected
          }
        } catch (e) {
          console.error('Error parsing stored wallet connection:', e);
        }
      }
    }
  }

  // Add wallet connection listeners
  setupWalletListeners() {
    // Handle successful wallet connection
    const handleWalletConnected = (walletData: WalletData) => {
      console.log('Wallet connected in game:', walletData);
      this.walletConnected = true;
      this.walletAddress = walletData.address;
      this.walletConnectionPending = false;
      
      // Store connection in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('walletConnection', JSON.stringify({
          address: walletData.address
        }));
      }
      
      // If dialogue is open, update it
      if (this.walletDialogueGroup && !this.walletDialogueGroup.getChildren().some(child => !child.active)) {
        this.displayWalletConnectedSuccess();
      }
      
      // Give keycard to player if they don't already have it
      if (!this.hasKeycard) {
        this.hasKeycard = true;
      }
    };
    
    // Handle wallet connection errors
    const handleWalletError = (error: string) => {
      console.error('Wallet error in game:', error);
      this.walletConnectionPending = false;
      
      // If dialogue is open, update it with error
      if (this.walletDialogueGroup && !this.walletDialogueGroup.getChildren().some(child => !child.active)) {
        this.displayWalletConnectionError(error);
      }
    };
    
    // Register event listeners
    onWalletConnected(handleWalletConnected);
    onWalletError(handleWalletError);
    
    // Cleanup function will be called when this scene is shutdown
    this.events.on('shutdown', () => {
      // Cleanup event listeners when scene is destroyed
      offWalletConnected(handleWalletConnected);
      offWalletError(handleWalletError);
    });
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

  create() {
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
    
    // Show welcome message for level 2
  

    // Create the exit gate
    this.createExitGate();
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
   * Show dialogue when interacting with the receptionist
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
    
    // Different dialogue based on wallet connection status
    let message;
    if (this.walletConnected && this.walletAddress) {
      message = `Welcome back! Your identity has been verified with address ${this.formatWalletAddress(this.walletAddress)}. Your security keycard is ready to use.`;
    } else {
      // First-time message focusing on wallet setup
      message = "Hello! To access secure areas in the Digital Defense department, you need to verify your identity with your Puzzle Wallet. This ensures only authorized personnel can access private data.";
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
    
    // Different buttons based on wallet connection status
    const buttonWidth = 160;
    const buttonHeight = 40;
    
    // Connect Wallet button or Continue button
    const actionButton = this.add.rectangle(
      width / 2,
      height - 60,
      buttonWidth,
      buttonHeight,
      this.walletConnected ? 0x4CAF50 : 0x2196F3 // Green if connected, Blue if not
    );
    actionButton.setScrollFactor(0);
    actionButton.setInteractive({ useHandCursor: true });
    actionButton.setVisible(false); // Hide initially
    actionButton.setData('role', 'actionButton');
    
    const buttonText = this.add.text(
      width / 2,
      height - 60, 
      this.walletConnected ? 'Continue' : 'Connect Wallet',
      {
        fontSize: '16px',
        color: '#FFFFFF'
      }
    );
    buttonText.setScrollFactor(0);
    buttonText.setOrigin(0.5);
    buttonText.setVisible(false); // Hide initially
    buttonText.setData('role', 'buttonText');
    
    // Group all dialogue elements
    this.walletDialogueGroup = this.add.group([dialogueBox, text, actionButton, buttonText]);
    
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
          buttonText.setVisible(true);
        }
      },
      repeat: message.length
    });
    
    // Function to handle button click
    const handleButtonClick = () => {
      if (this.walletConnected) {
        // Already connected, just proceed
        this.cleanupDialogue();
      } else {
        // Show wallet setup instructions
        this.showWalletSetupInstructions();
      }
    };
    
    // Handle button click
    actionButton.on('pointerdown', handleButtonClick);
    
    // Add keyboard support for Enter key
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (actionButton.visible) {
        handleButtonClick();
      }
    });
    
    // Add hover effects
    actionButton.on('pointerover', () => {
      actionButton.setFillStyle(this.walletConnected ? 0x45A049 : 0x1E88E5);
    });
    actionButton.on('pointerout', () => {
      actionButton.setFillStyle(this.walletConnected ? 0x4CAF50 : 0x2196F3);
    });
  }
  
  // Show detailed wallet setup instructions
  showWalletSetupInstructions() {
    if (!this.walletDialogueGroup) return;
    
    // Get necessary elements from dialogue group
    const children = this.walletDialogueGroup.getChildren();
    const mainText = children.find(child => child.getData('role') === 'mainText') as Phaser.GameObjects.Text;
    const button = children.find(child => child.getData('role') === 'actionButton') as Phaser.GameObjects.Rectangle;
    const buttonText = children.find(child => child.getData('role') === 'buttonText') as Phaser.GameObjects.Text;
    
    // Update text with clearer wallet setup instructions
    if (mainText) {
      mainText.setText(
        "To connect your Puzzle Wallet:\n\n" +
        "1. Click 'Connect Wallet' to initiate the connection\n" +
        "2. When prompted, approve the connection request in the extension"
      );
    }
    
    // Create a visual cue pointing to the browser extension area
    const arrowGraphics = this.add.graphics();
    arrowGraphics.lineStyle(3, 0xFFFFFF, 1);
    arrowGraphics.beginPath();
    arrowGraphics.moveTo(this.cameras.main.width - 100, 100);
    arrowGraphics.lineTo(this.cameras.main.width - 50, 30);
    arrowGraphics.strokePath();
    
    // Add a pulsing circle around where the extension would be
    const extensionCircle = this.add.circle(this.cameras.main.width - 30, 20, 15, 0x2196F3, 0.6);
    this.tweens.add({
      targets: extensionCircle,
      alpha: 0.2,
      scale: 1.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
    
    // Add both graphics to the dialogue group
    this.walletDialogueGroup.add(arrowGraphics);
    this.walletDialogueGroup.add(extensionCircle);
    
    // Create a "Download Wallet" button for users who don't have it yet
    const downloadButton = this.add.rectangle(
      button.x - 120,
      button.y,
      160,
      40,
      0xFF5722
    );
    downloadButton.setScrollFactor(0);
    downloadButton.setInteractive({ useHandCursor: true });
    downloadButton.setData('role', 'downloadButton');
    
    const downloadButtonText = this.add.text(
      downloadButton.x,
      downloadButton.y, 
      'Download Wallet',
      {
        fontSize: '16px',
        color: '#FFFFFF'
      }
    );
    downloadButtonText.setScrollFactor(0);
    downloadButtonText.setOrigin(0.5);
    downloadButtonText.setData('role', 'downloadButtonText');
    
    // Add hover effects for download button
    downloadButton.on('pointerover', () => {
      downloadButton.setFillStyle(0xE64A19);
    });
    downloadButton.on('pointerout', () => {
      downloadButton.setFillStyle(0xFF5722);
    });
    
    // Handle download button click
    downloadButton.on('pointerdown', () => {
      // Open the Puzzle Wallet download page in a new tab
      if (typeof window !== 'undefined') {
        window.open('https://chromewebstore.google.com/detail/puzzle-aleo-wallet/fdchdcpieegfofnofhgdombfckhbcokj', '_blank');
      }
    });
    
    // Add download button to dialogue group
    this.walletDialogueGroup.add(downloadButton);
    this.walletDialogueGroup.add(downloadButtonText);
    
    // Update "Connect Wallet" button position
    if (button && buttonText) {
      button.setX(button.x + 120);
      buttonText.setX(buttonText.x + 120);
      buttonText.setText('Connect Wallet');
      
      // Remove previous listeners
      button.off('pointerdown');
      
      // Add new listener that initiates wallet connection
      button.on('pointerdown', () => {
        // Remove the visual cues
        arrowGraphics.destroy();
        extensionCircle.destroy();
        
        // Clean up download button
        downloadButton.destroy();
        downloadButtonText.destroy();
        
        // Reset Connect button position
        button.setX(button.x - 120);
        buttonText.setX(buttonText.x - 120);
        
        // Proceed with wallet connection
        this.initiateWalletConnection();
      });
    }
  }
  
  // Format wallet address to show only beginning and end
  formatWalletAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  // Initiate wallet connection
  initiateWalletConnection() {
    console.log('[Level2Scene] Initiating wallet connection...');
    
    // Log available wallet adapters if any
    if (typeof window !== 'undefined') {
      // Check for puzzle object on window
      console.log('[Level2Scene] Checking for Puzzle Wallet on window:', 'puzzle' in window);
      
      // Log installed wallets we can detect
      const detectedWallets = [];
      if ('puzzle' in window) detectedWallets.push('Puzzle');
      if ('leo' in window) detectedWallets.push('Leo');
      if ('fox' in window) detectedWallets.push('Fox');
      if ('soter' in window) detectedWallets.push('Soter');
      
      console.log('[Level2Scene] Detected wallet(s) on window:', detectedWallets.length ? detectedWallets.join(', ') : 'None');
    }
    
    // If already connected, don't try again
    if (this.walletConnected) {
      console.log('[Level2Scene] Already connected, skipping connection');
      if (this.walletDialogueGroup) {
        this.displayWalletConnectedSuccess();
      }
      return;
    }
    
    // If connection is already pending, prevent duplicate attempts
    if (this.walletConnectionPending) {
      console.log('[Level2Scene] Connection already in progress');
      return;
    }
    
    // Update button state to show connecting
    if (this.walletDialogueGroup) {
      const children = this.walletDialogueGroup.getChildren();
      const button = children.find(child => child.getData('role') === 'actionButton') as Phaser.GameObjects.Rectangle;
      const buttonText = children.find(child => child.getData('role') === 'buttonText') as Phaser.GameObjects.Text;
      const mainText = children.find(child => child.getData('role') === 'mainText') as Phaser.GameObjects.Text;
      
      if (button && buttonText) {
        button.setFillStyle(0xCCCCCC);
        button.removeInteractive();
        buttonText.setText('Connecting...');
      }
      
      if (mainText) {
        mainText.setText(
          'Contacting Puzzle Wallet extension...\n\n' +
          'If you have Puzzle Wallet installed, you should see a connection request popup.\n\n' +
          'If nothing happens, make sure the extension is installed and unlocked.'
        );
      }
    }
    
    // Set pending flag
    this.walletConnectionPending = true;
    
    try {
      // Add a small delay before initiating connection
      // This helps avoid race conditions with wallet selection
      setTimeout(() => {
        try {
          // Trigger wallet connection
          connectWallet();
        } catch (error) {
          console.error('[Level2Scene] Error triggering wallet connection:', error);
        }
      }, 1000); // Increased delay for more reliability
      
      // Set a timeout to reset the pending state if nothing happens (wallet not responding)
      setTimeout(() => {
        if (this.walletConnectionPending) {
          this.walletConnectionPending = false;
          
          // If dialogue is still open, show timeout error
          if (this.walletDialogueGroup) {
            this.displayWalletConnectionError(
              "No response from wallet after 12 seconds. Please check if Puzzle Wallet extension is installed and unlocked."
            );
          }
        }
      }, 12000); // Increased timeout to 12 seconds
    } catch (error) {
      // This is unlikely to be triggered as connectWallet doesn't throw, 
      // but just in case of unexpected errors
      console.error('[Level2Scene] Error initiating wallet connection:', error);
      this.walletConnectionPending = false;
      
      if (this.walletDialogueGroup) {
        this.displayWalletConnectionError("An unexpected error occurred. Please try again.");
      }
    }
  }
  
  // Display success message when wallet is connected
  displayWalletConnectedSuccess() {
    if (!this.walletDialogueGroup) return;
    
    const children = this.walletDialogueGroup.getChildren();
    
    // Update main text
    const mainText = children.find(child => child.type === 'Text' && child.getData('role') === 'mainText') as Phaser.GameObjects.Text;
    if (mainText) {
      mainText.setText(`Puzzle Wallet connected successfully! Your identity has been verified and you've been issued a security keycard.`);
    }
    
    // Update button
    const button = children.find(child => child.type === 'Rectangle' && child.getData('role') === 'actionButton') as Phaser.GameObjects.Rectangle;
    const buttonText = children.find(child => child.type === 'Text' && child.getData('role') === 'buttonText') as Phaser.GameObjects.Text;
    
    if (button && buttonText) {
      button.setFillStyle(0x4CAF50);
      button.setInteractive({ useHandCursor: true });
      buttonText.setText('Continue');
      
      // Update hover effects
      button.off('pointerover');
      button.off('pointerout');
      button.on('pointerover', () => {
        button.setFillStyle(0x45A049);
      });
      button.on('pointerout', () => {
        button.setFillStyle(0x4CAF50);
      });
      
      // Update click handler
      button.off('pointerdown');
      button.on('pointerdown', () => {
        this.cleanupDialogue();
      });
    }
    
    // Add success particles
    this.addWalletSuccessParticles();
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
  
  // Display error message when wallet connection fails
  displayWalletConnectionError(error: string) {
    if (!this.walletDialogueGroup) return;
    
    // Log the error for debugging
    console.error('[Level2Scene] Wallet connection error:', error);
    
    const children = this.walletDialogueGroup.getChildren();
    
    // Update main text
    const mainText = children.find(child => child.type === 'Text' && child.getData('role') === 'mainText') as Phaser.GameObjects.Text;
    if (mainText) {
      // Check if the error suggests Puzzle Wallet isn't installed
      const notInstalledPattern = /(not.*installed|not.*found|no wallet|wallet.*unavailable|not.*detected|not.*available)/i;
      
      // Check if it's a wallet selection error (which refreshing usually fixes)
      const selectionErrorPattern = /(wallet not selected|No wallet selected|adapter|failed to select|could not select)/i;
      
      // Check for other common errors
      const connectionErrorPattern = /(connection failed|connect.*failed|cannot connect|failed to connect)/i;
      
      if (notInstalledPattern.test(error)) {
        mainText.setText(
          "Puzzle Wallet extension doesn't appear to be installed.\n\n" +
          "Please install Puzzle Wallet from the Chrome Web Store and refresh the page.\n\n" +
          "The page will auto-refresh a few times to detect the wallet."
        );
      } else if (selectionErrorPattern.test(error)) {
        mainText.setText(
          "Wallet connection is having trouble finding Puzzle Wallet.\n\n" +
          "Please make sure the extension is installed, unlocked, and refresh the page.\n\n" +
          "The page will automatically refresh to try detecting the wallet again.\n\n" +
          "If problems persist, you can bypass this step for now and continue playing."
        );
      } else if (connectionErrorPattern.test(error)) {
        mainText.setText(
          "Connection to Puzzle Wallet failed.\n\n" +
          "Please check if the extension is running properly and try again.\n\n" +
          "If problems persist after a few attempts, you can continue without a wallet."
        );
      } else {
        mainText.setText(
          `Error connecting to Puzzle Wallet.\n\n${error}\n\n` +
          "If you continue having problems, you can skip this step for now."
        );
      }
    }
    
    // Reset the pending flag
    this.walletConnectionPending = false;
    
    // Update button
    const button = children.find(child => child.type === 'Rectangle' && child.getData('role') === 'actionButton') as Phaser.GameObjects.Rectangle;
    const buttonText = children.find(child => child.type === 'Text' && child.getData('role') === 'buttonText') as Phaser.GameObjects.Text;
    
    if (button && buttonText) {
      // Check if we need to provide download option
      const notInstalledPattern = /(not.*installed|not.*found|no wallet|wallet.*unavailable|not.*detected|not.*available)/i;
      
      // Check for wallet selection errors
      const selectionErrorPattern = /(wallet not selected|No wallet selected|adapter|failed to select|could not select)/i;
      
      if (notInstalledPattern.test(error)) {
        button.setFillStyle(0xFF5722); // Orange for download
        buttonText.setText('Get Puzzle Wallet');
        
        // Update hover effects
        button.off('pointerover');
        button.off('pointerout');
        button.on('pointerover', () => {
          button.setFillStyle(0xE64A19);
        });
        button.on('pointerout', () => {
          button.setFillStyle(0xFF5722);
        });
        
        // Update click handler to open download page
        button.off('pointerdown');
        button.on('pointerdown', () => {
          if (typeof window !== 'undefined') {
            window.open('https://chromewebstore.google.com/detail/puzzle-aleo-wallet/fdchdcpieegfofnofhgdombfckhbcokj', '_blank');
          }
        });
        
        // Add "Continue Without Wallet" button
        this.addContinueWithoutWalletButton();
      } else if (selectionErrorPattern.test(error)) {
        // For selection errors, show a REFRESH button
        button.setFillStyle(0xF57C00); // Deep orange
        button.setInteractive({ useHandCursor: true });
        buttonText.setText('Refresh Page');
        
        // Update hover effects
        button.off('pointerover');
        button.off('pointerout');
        button.on('pointerover', () => {
          button.setFillStyle(0xEF6C00);
        });
        button.on('pointerout', () => {
          button.setFillStyle(0xF57C00);
        });
        
        // Update click handler to refresh the page
        button.off('pointerdown');
        button.on('pointerdown', () => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        });
        
        // Add a second button for trying again
        const tryAgainButton = this.add.rectangle(
          button.x - 180,
          button.y,
          160,
          40,
          0x2196F3
        );
        tryAgainButton.setScrollFactor(0);
        tryAgainButton.setInteractive({ useHandCursor: true });
        tryAgainButton.setData('role', 'tryAgainButton');
        
        const tryAgainText = this.add.text(
          tryAgainButton.x,
          tryAgainButton.y,
          'Try Again',
          {
            fontSize: '16px',
            color: '#FFFFFF'
          }
        );
        tryAgainText.setScrollFactor(0);
        tryAgainText.setOrigin(0.5);
        tryAgainText.setData('role', 'tryAgainText');
        
        // Add hover effects
        tryAgainButton.on('pointerover', () => {
          tryAgainButton.setFillStyle(0x1E88E5);
        });
        tryAgainButton.on('pointerout', () => {
          tryAgainButton.setFillStyle(0x2196F3);
        });
        
        // Add click handler - this needs to be fixed to correctly initiate a new connection attempt
        tryAgainButton.on('pointerdown', () => {
          // Remove the extra button before trying again
          tryAgainButton.destroy();
          tryAgainText.destroy();
          
          // Reset position of the main button
          button.setX(button.x + 90);
          buttonText.setX(buttonText.x + 90);
          
          // Try again - with slight delay to ensure previous error is cleared
          setTimeout(() => {
            this.initiateWalletConnection();
          }, 500);
        });
        
        // Add to dialogue group
        this.walletDialogueGroup.add(tryAgainButton);
        this.walletDialogueGroup.add(tryAgainText);
        
        // Move the refresh button to the right
        button.setX(button.x + 90);
        buttonText.setX(buttonText.x + 90);
        
        // Add "Continue Without Wallet" button after multiple failed attempts
        this.addContinueWithoutWalletButton(button.y + 60);
        
      } else {
        // Regular try again button
        button.setFillStyle(0x2196F3);
        button.setInteractive({ useHandCursor: true });
        buttonText.setText('Try Again');
        
        // Update hover effects
        button.off('pointerover');
        button.off('pointerout');
        button.on('pointerover', () => {
          button.setFillStyle(0x1E88E5);
        });
        button.on('pointerout', () => {
          button.setFillStyle(0x2196F3);
        });
        
        // Update click handler with slight delay to ensure previous error is cleared
        button.off('pointerdown');
        button.on('pointerdown', () => {
          setTimeout(() => {
            this.initiateWalletConnection();
          }, 500);
        });
        
        // Add "Continue Without Wallet" button after multiple failed attempts
        this.addContinueWithoutWalletButton(button.y + 60);
      }
    }
  }
  
  // Add a button to continue without wallet
  addContinueWithoutWalletButton(yOffset?: number) {
    if (!this.walletDialogueGroup) return;
    
    // Find center position
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create a "Continue Without Wallet" button 
    const continueButton = this.add.rectangle(
      width / 2,
      yOffset || height - 70,
      240,
      40,
      0x795548 // Brown
    );
    continueButton.setScrollFactor(0);
    continueButton.setInteractive({ useHandCursor: true });
    continueButton.setData('role', 'continueWithoutWalletButton');
    
    const continueButtonText = this.add.text(
      continueButton.x,
      continueButton.y,
      'Continue Without Wallet',
      {
        fontSize: '16px',
        color: '#FFFFFF',
        align: 'center'
      }
    );
    continueButtonText.setScrollFactor(0);
    continueButtonText.setOrigin(0.5);
    continueButtonText.setData('role', 'continueWithoutWalletText');
    
    // Add hover effects
    continueButton.on('pointerover', () => {
      continueButton.setFillStyle(0x6D4C41);
    });
    continueButton.on('pointerout', () => {
      continueButton.setFillStyle(0x795548);
    });
    
    // Add click handler to bypass wallet connection
    continueButton.on('pointerdown', () => {
      console.log('[Level2Scene] User opted to continue without wallet');
      
      // Clean up the dialogue
      this.cleanupDialogue();
      
      // Set a flag that user chose to skip this
      this.walletSkipped = true;
      
      // Show an alternative message about the security keycard
      const messageBox = this.add.rectangle(
        width / 2,
        height / 2,
        width - 100,
        180,
        0x000000,
        0.8
      );
      messageBox.setScrollFactor(0);
      messageBox.setOrigin(0.5);
      
      const messageText = this.add.text(
        width / 2,
        height / 2,
        "The receptionist gives you a temporary visitor keycard.\n\n" +
        "\"This will give you limited access to the facility.\"\n\n" +
        "You've gained a security keycard!",
        {
          fontSize: '18px',
          color: '#FFFFFF',
          align: 'center',
          wordWrap: { width: width - 140 }
        }
      );
      messageText.setScrollFactor(0);
      messageText.setOrigin(0.5);
      
      // Add a close button
      const closeButton = this.add.rectangle(
        width / 2,
        height / 2 + 80,
        120,
        40,
        0x4CAF50
      );
      closeButton.setScrollFactor(0);
      closeButton.setOrigin(0.5);
      closeButton.setInteractive({ useHandCursor: true });
      
      const closeButtonText = this.add.text(
        closeButton.x,
        closeButton.y,
        'Continue',
        {
          fontSize: '16px',
          color: '#FFFFFF'
        }
      );
      closeButtonText.setScrollFactor(0);
      closeButtonText.setOrigin(0.5);
      
      // Add hover effects
      closeButton.on('pointerover', () => {
        closeButton.setFillStyle(0x45A049);
      });
      closeButton.on('pointerout', () => {
        closeButton.setFillStyle(0x4CAF50);
      });
      
      // Close the message and give keycard
      closeButton.on('pointerdown', () => {
        messageBox.destroy();
        messageText.destroy();
        closeButton.destroy();
        closeButtonText.destroy();
        
        // Give the keycard to the player
        this.hasKeycard = true;
      });
      
      // Create a temporary group for these elements
      this.temporaryMessageGroup = this.add.group([
        messageBox,
        messageText,
        closeButton,
        closeButtonText
      ]);
    });
    
    // Add to dialogue group
    this.walletDialogueGroup.add(continueButton);
    this.walletDialogueGroup.add(continueButtonText);
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
      
      let message = '';
      // Adjust message based on wallet status (connected, skipped, or not attempted)
      if (this.walletSkipped) {
        message = "You need to get a security keycard from the receptionist desk first.";
      } else if (!this.walletConnected) {
        message = "You need to connect your Puzzle Wallet at the receptionist desk first to receive a keycard.";
      } else {
        message = "You need to talk to the receptionist first to get your security keycard.";
      }
      
      const noKeycardText = this.add.text(
        width / 2,
        height / 2,
        message,
        {
          fontSize: '18px',
          color: '#FFFFFF',
          backgroundColor: '#00000080',
          padding: { x: 20, y: 10 },
          align: 'center',
          wordWrap: { width: width - 100 }
        }
      );
      noKeycardText.setScrollFactor(0);
      noKeycardText.setOrigin(0.5);
      
      // Auto-destroy after 3 seconds
      this.time.delayedCall(3000, () => {
        noKeycardText.destroy();
      });
      
      return;
    }
    
    // Player has keycard, open the gate
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
'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';
import Player from '@/lib/classes/Player';

/**
 * Level1Scene - The Awakening (Intro + Lore)
 * 
 * This is the first level of the Legend of Leo game.
 * Players learn why privacy matters in this level.
 * The level features a character standing in the doorway that won't let the player
 * pass until they understand privacy concepts: data loss, exposure, identity theft.
 */
export default class Level1Scene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private map?: Phaser.Tilemaps.Tilemap;
  private layers?: MapLayers;
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private interactionIndicator?: Phaser.GameObjects.Sprite;
  private computerInteractionIndicator?: Phaser.GameObjects.Sprite;
  private nearbyObject?: Phaser.GameObjects.GameObject;
  private guardNPC?: Phaser.GameObjects.Sprite;
  private gate?: Phaser.Physics.Arcade.Sprite;
  private exitGate?: Phaser.Physics.Arcade.Sprite;
  private keycard?: Phaser.GameObjects.Sprite;
  private hasKeycard: boolean = false;
  private gateOpen: boolean = false;

  constructor() {
    super({ key: 'Level1Scene' });
  }

  init() {
    // Store current scene in localStorage for development mode reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentScene', this.scene.key);
      console.log('Current scene saved:', this.scene.key);
    }
    
    // Initialize interactive objects array
    this.interactiveObjects = [];
    
    // Initialize flag for gate status
    this.gateOpen = false;
  }

  preload() {
    // Load player sprite sheet
    this.load.spritesheet('player', '/assets/sprites/player.png', {
      frameWidth: 48,  // Each frame is 48x66 pixels
      frameHeight: 66,
      spacing: 0,
      margin: 0
    });

    // Load placeholder graphics until final assets are integrated
    this.load.image('player-placeholder', '/assets/sprites/player-placeholder.png');
    
    // Load floor tile
    this.load.image('floor', '/assets/maps/floor.png');

    // Create wall texture
    this.createWallTexture();
    
    // Load level 1 tilemap
    this.load.tilemapTiledJSON('level1', '/assets/maps/levels/level1.json');
    
    // Load additional tile images for the map
    this.load.image('wall', '/assets/maps/wall.png');
    
    // Load custom wall assets
    this.load.image('backwall', '/assets/maps/backwall.png');
    
    // Load silver gate as a regular image instead of a spritesheet
    this.load.image('silver-gate', '/assets/sprites/silver-gate.png');
    
    // Load blue gate as a spritesheet with seven frames
    this.load.spritesheet('blue-gate', '/assets/sprites/blue-gate.png', {
      frameWidth: 192,  // Each frame is 192px wide
      frameHeight: 93,  // Height from the texture
      spacing: 0,
      margin: 0,
      endFrame: 6 // Load all 7 frames (0-6)
    });
    
    // Load border tiles
    this.load.image('top-border', '/assets/maps/top-border.png');
    this.load.image('left-border', '/assets/maps/left-border.png');
    this.load.image('right-border', '/assets/maps/right-border.png');
    this.load.image('bottom-border', '/assets/maps/bottom-border.png');
    this.load.image('left-t-corner-border', '/assets/maps/left-t-corner-border.png');
    this.load.image('right-t-corner-border', '/assets/maps/right-t-corner-border.png');
    this.load.image('left-b-corner-border', '/assets/maps/left-b-corner-border.png');
    this.load.image('right-b-corner-border', '/assets/maps/right-b-corner-border.png');
    this.load.image('left-t-edge-corner', '/assets/maps/left-t-edge-corner.png');
    this.load.image('right-t-edge-corner', '/assets/maps/right-t-edge-corner.png');
    this.load.image('left-b-edge-corner', '/assets/maps/left-b-edge-corner.png');
    this.load.image('right-b-edge-corner', '/assets/maps/right-b-edge-corner.png');
    this.load.image('backwall-keycard', '/assets/maps/backwall-keycard.png');
    this.load.image('backwall-exit', '/assets/maps/backwall-exit.png');
    // Load game level assets
    this.load.image('guard', '/assets/maps/guard-l1.png');
    this.load.image('computer', '/assets/maps/computer-L1.png');
    this.load.image('tower', '/assets/maps/tower-L1.png');
    this.load.image('couch', '/assets/maps/couch-L1.png');
    
    // Create placeholder images for objects that don't exist yet
    this.createPlaceholderTiles(['desk']);
  }

  /**
   * Create a wall texture for the level boundaries
   */
  createWallTexture() {
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

  /**
   * Create placeholder tiles for missing assets
   */
  createPlaceholderTiles(tileNames: string[]) {
    tileNames.forEach(name => {
      // Create a placeholder if the image doesn't exist
      if (!this.textures.exists(name)) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        
        // Choose color based on name
        let color = 0x3498db; // Default blue
        
        if (name === 'desk') {
          color = 0x8B4513; // Brown for desk
        } else if (name === 'guard') {
          color = 0xE74C3C; // Red for guard
        }
        
        // Draw a colored square
        graphics.fillStyle(color);
        graphics.fillRect(0, 0, 48, 48);
        
        // Add a border and label
        graphics.lineStyle(2, 0xFFFFFF);
        graphics.strokeRect(1, 1, 46, 46);
        
        // Generate texture
        graphics.generateTexture(name, 48, 48);
        
        console.log(`Created placeholder texture for ${name}`);
      }
    });
  }

  create() {
    // Disable physics debugging
    this.physics.world.debugGraphic.clear();
    this.physics.world.debugGraphic.visible = false;
    
    // Set the background color to match the tilemap backgroundColor
    this.cameras.main.setBackgroundColor('#2B2A3D');
    
    console.log('Starting create() method...');
    
    // Load the tilemap
    try {
      console.log('Loading level1 tilemap...');
      const { map, layers } = loadTilemap(
        this,
        'level1',
        ['Floor', 'Backwall', 'Objects', 'Collision'],
        ['Collision'] // Only use the Collision layer for collisions
      );
      
      this.map = map;
      this.layers = layers;
      
      console.log('Tilemap loaded successfully:', {
        map: !!this.map,
        layers: !!this.layers,
        layerNames: Object.keys(this.layers || {})
      });
      
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
      console.error('Failed to load level1 tilemap:', error);
      // Fall back to creating a programmatic level
      this.createLevel();
    }
    
    // Create player at starting position on the couch in Room A, facing left
    // Couch is at tile X=13, Y=16 (0-indexed map tiles)
    const startX = (13 * 48) + (48 / 2); // Center of tile 13
    const startY = (16.5 * 48) + (48 / 2); // Center of tile 16, should place player visually on the couch
    this.player = new Player(this, startX, startY);
    // Or, if you have specific facing animations:
     this.player.sprite.anims.play('player-idle-left', true);
    
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
    
    // Create the guard NPC and silver gate
    this.createNPCs();
    
    // Create the blue exit gate at the top of area B
    this.createExitGate();

    // Create the computer interaction zone
    console.log('About to create computer interaction...');
    this.createComputerInteraction();
    console.log('Computer interaction creation completed');
  }
  
  /**
   * Center the map within the game window
   */
  centerMap() {
    if (!this.map) return;
    
    // Get the map and game dimensions
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    // Calculate offset to center the map
    const offsetX = Math.max(0, (gameWidth - mapWidth) / 2);
    const offsetY = Math.max(0, (gameHeight - mapHeight) / 2);
    
    // Apply offset to all map layers by moving the container
    if (this.map.layers) {
      this.map.layers.forEach(layer => {
        if (layer.tilemapLayer) {
          layer.tilemapLayer.x = offsetX;
          layer.tilemapLayer.y = offsetY;
        }
      });
    }
    
    // Adjust physics world bounds
    this.physics.world.setBounds(
      offsetX, 
      offsetY, 
      mapWidth, 
      mapHeight
    );
    
    // Adjust camera bounds
    this.cameras.main.setBounds(
      offsetX,
      offsetY,
      mapWidth,
      mapHeight
    );
    
    console.log(`Centered map with offset: (${offsetX}, ${offsetY})`);
  }
  
  /**
   * Create the level layout based on the screenshot
   */
  createLevel() {
    // Set background color
    this.cameras.main.setBackgroundColor('#2B2A3D');
    
    // Define level dimensions in tiles
    const levelWidth = 15;
    const levelHeight = 12;
    const tileSize = 48;
    
    // Create the tilemap for this level (either load from JSON or create programmatically)
    // For now, we'll create it programmatically
    this.map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: levelWidth,
      height: levelHeight
    });
    
    // Add tileset
    const floorTiles = this.map.addTilesetImage('floor', 'floor');
    const wallTiles = this.map.addTilesetImage('wall', 'wall');
    
    if (!floorTiles || !wallTiles) {
      console.error('Failed to add tilesets');
      return;
    }
    
    // Create layers
    const floorLayer = this.map.createBlankLayer('Floor', floorTiles);
    const wallsLayer = this.map.createBlankLayer('Walls', wallTiles);
    
    if (!floorLayer || !wallsLayer) {
      console.error('Failed to create map layers');
      return;
    }
    
    // Store layers for collision
    this.layers = {
      Floor: floorLayer,
      Walls: wallsLayer
    };
    
    // Fill the floor with floor tiles
    floorLayer.fill(0, 0, 0, levelWidth, levelHeight);
    
    // Create walls around the perimeter (leaving space for door)
    for (let x = 0; x < levelWidth; x++) {
      // Top wall
      wallsLayer.putTileAt(0, x, 0);
      
      // Bottom wall (except for doorway)
      if (x < 6 || x > 8) {
        wallsLayer.putTileAt(0, x, levelHeight - 1);
      }
    }
    
    for (let y = 0; y < levelHeight; y++) {
      // Left wall
      wallsLayer.putTileAt(0, 0, y);
      
      // Right wall
      wallsLayer.putTileAt(0, levelWidth - 1, y);
    }
    
    // Add interior walls and objects based on the screenshot
    // (This will be enhanced with actual assets once available)
    
    // Add computer desk in top right corner
    for (let x = 10; x < 12; x++) {
      for (let y = 3; y < 5; y++) {
        // Add computer or desk tiles
        // For now, we'll just mark these tiles for visual reference
        floorLayer.putTileAt(1, x, y);
      }
    }
    
    // Create the computer interaction zone
    this.createComputerInteraction();
    
    // Set collision for wall layer
    wallsLayer.setCollisionByExclusion([-1]);
  }
  
  /**
   * Create the computer interaction zone
   */
  createComputerInteraction() {
    console.log('Starting createComputerInteraction...');
    
    // Find the computer from the Objects layer in the tilemap
    if (!this.map || !this.layers) {
      console.error('Map or layers not initialized');
      return;
    }

    // Get the Objects layer
    const objectsLayer = this.map.getLayer('Objects');
    if (!objectsLayer || !objectsLayer.data) {
      console.error('Objects layer not found');
      return;
    }

    // Find the computer tile (ID 7 in the tilemap)
    let computerTile;
    for (let y = 0; y < objectsLayer.data.length; y++) {
      for (let x = 0; x < objectsLayer.data[y].length; x++) {
        const tile = objectsLayer.data[y][x];
        if (tile.index === 7) { // 7 is the computer tile ID
          computerTile = tile;
          break;
        }
      }
      if (computerTile) break;
    }

    if (!computerTile) {
      console.error('Computer tile not found in map');
      return;
    }

    // Calculate pixel position from tile position
    const tileSize = 48;
    const computerX = computerTile.x * tileSize + (tileSize * 1.5); // Center of the 3-tile wide computer
    const computerY = computerTile.y * tileSize + (tileSize / 2);

    // Create an invisible interaction zone for the computer
    const computer = this.add.rectangle(computerX, computerY, tileSize * 3, tileSize, 0x000000, 0);
    computer.setData('interactive', true);
    computer.setData('onInteract', () => {
      this.showComputerDialogue();
    });

    // Create dedicated indicator for computer with its own unique texture
    const indicatorY = computerY - 40;
    
    // Create a dedicated texture just for the computer interaction
    const computerIndicatorName = 'computer-interaction-dot'; // Completely new name
    if (!this.textures.exists(computerIndicatorName)) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      
      // Clear any previous drawing
      graphics.clear();
      
      // Draw a white background to reset anything
      graphics.fillStyle(0x000000, 0);
      graphics.fillRect(0, 0, 32, 32);
      
      // Draw a small white dot with a glow effect
      graphics.fillStyle(0xFFFFFF, 0.8);
      graphics.fillCircle(16, 16, 4);
      
      // Add a subtle glow/halo
      graphics.fillStyle(0xFFFFFF, 0.3);
      graphics.fillCircle(16, 16, 8);
      
      graphics.generateTexture(computerIndicatorName, 32, 32);
      console.log(`Created new computer indicator texture: ${computerIndicatorName}`);
    }
    
    // Explicitly destroy any previous indicator
    if (this.computerInteractionIndicator) {
      this.computerInteractionIndicator.destroy();
    }
    
    // Use the dedicated computer indicator texture
    this.computerInteractionIndicator = this.add.sprite(computerX, indicatorY, computerIndicatorName);
    console.log(`Computer indicator created at ${computerX},${indicatorY} with texture ${computerIndicatorName}`);

    // Set up the computer indicator with same animations as NPC
    this.computerInteractionIndicator.setVisible(false);
    this.computerInteractionIndicator.setDepth(200);
    
    // Add bobbing animation
    this.tweens.add({
      targets: this.computerInteractionIndicator,
      y: indicatorY - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add pulsing effect
    this.tweens.add({
      targets: this.computerInteractionIndicator,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add to interactive objects array
    this.interactiveObjects.push(computer);
  }

  /**
   * Show educational dialogue about Web3 wallets when interacting with the computer
   */
  showComputerDialogue() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create a larger dialogue box for more content
    const dialogueBox = this.add.rectangle(
      width / 2,
      height - 300,
      width - 30,
      580,
      0x000000,
      1
    );
    dialogueBox.setScrollFactor(0);
    dialogueBox.setOrigin(0.5);
    dialogueBox.setStrokeStyle(2, 0x00ff00);
    dialogueBox.setDepth(1000);

    // Add a semi-transparent overlay behind the dialogue box
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.5
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(999);

    const message = "> TERMINAL ACCESS - PRIVACY ARCHIVES\n\n" +
      "Web3 wallets are your digital identity in the new world. Unlike traditional wallets that expose your every transaction, Web3 wallets with zero-knowledge proofs let you prove things about yourself without revealing the underlying data.\n\n" +
      "These wallets are your digital passport. They allow you to:\n\n" +
      "- Prove your identity without revealing personal info\n" +
      "- Make transactions that remain private\n" +
      "- Control what data you share and with whom\n" +
      "- Allow for true compliance with privacy laws\n" +
      "- Interact permissionlessly";

    const text = this.add.text(
      width / 2,
      height - 320,
      '', // Start empty for typewriter effect
      {
        fontSize: '18px',
        color: '#00ff00',
        align: 'left',
        wordWrap: { width: width - 60 },
        lineSpacing: 6,
        backgroundColor: undefined
      }
    );
    text.setScrollFactor(0);
    text.setOrigin(0.5);
    text.setDepth(1000);

    // Create close button
    const buttonWidth = 160;
    const buttonHeight = 40;
    
    const closeButton = this.add.rectangle(
      width / 2,
      height - 70,
      buttonWidth,
      buttonHeight,
      0x666666
    );
    closeButton.setScrollFactor(0);
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.setVisible(false);
    closeButton.setDepth(1000);
    
    const closeText = this.add.text(
      closeButton.x,
      closeButton.y,
      'Close Terminal',
      {
        fontSize: '16px',
        color: '#FFFFFF'
      }
    );
    closeText.setScrollFactor(0);
    closeText.setOrigin(0.5);
    closeText.setVisible(false);
    closeText.setDepth(1000);
    
    // Group all dialogue elements
    const dialogueGroup = this.add.group([
      overlay,
      dialogueBox,
      text,
      closeButton,
      closeText
    ]);

    // Typewriter effect function
    let currentChar = 0;
    const typingSpeed = 5;
    
    const typewriterTimer = this.time.addEvent({
      delay: typingSpeed,
      callback: () => {
        text.setText(message.substring(0, currentChar));
        currentChar++;
        
        // When typing is complete, show the close button
        if (currentChar > message.length) {
          typewriterTimer.destroy();
          closeButton.setVisible(true);
          closeText.setVisible(true);
        }
      },
      repeat: message.length
    });

    // Handle close button click
    closeButton.on('pointerdown', () => {
      dialogueGroup.destroy(true);
    });
    
    // Add hover effects
    closeButton.on('pointerover', () => {
      closeButton.setFillStyle(0x555555);
    });
    closeButton.on('pointerout', () => {
      closeButton.setFillStyle(0x666666);
    });
  }
  
  /**
   * Extract NPCs from the Objects layer and make them interactive
   */
  createNPCs() {
    // First, clean up any existing guard NPCs to avoid duplicates
    if (this.guardNPC) {
      this.guardNPC.destroy();
      // Remove from interactive objects array if it exists
      const index = this.interactiveObjects.findIndex(obj => obj === this.guardNPC);
      if (index !== -1) {
        this.interactiveObjects.splice(index, 1);
      }
      this.guardNPC = undefined;
    }
    
    // Clear any existing gate
    if (this.gate) {
      this.gate.destroy();
      this.gate = undefined;
    }
    
    // Clear any other guard-like sprites that might exist
    this.children.list.forEach(child => {
      if ('type' in child && 
          (child as Phaser.GameObjects.Sprite).type === 'Sprite' && 
          (child as Phaser.GameObjects.Sprite).texture && 
          (child as Phaser.GameObjects.Sprite).texture.key === 'guard') {
        (child as Phaser.GameObjects.Sprite).destroy();
      }
    });
    
    // Direct approach - create the guard at specific position from the map data
    try {
      // Define where the guard should be based on the map layout
      // Guard is in Room A, 3rd row from its top, 7th column from its left.
      // Room A starts at map row 10. So guard is at map row (10 + 2) = 12.
      // Guard is at column index 6.
      const guardX = 6 * 48 + 24; // Column 6 (0-indexed), centered in tile
      const guardY = 13 * 48 + 24; // Map Row 12 (0-indexed), centered in tile
      
      console.log(`Creating guard NPC at new position: (${guardX}, ${guardY})`);
      
      // Create the guard sprite
      this.guardNPC = this.add.sprite(guardX, guardY, 'guard');
      
      // Make the guard interactive
      this.guardNPC.setData('interactive', true);
      this.guardNPC.setData('onInteract', () => {
        this.showGuardDialogue();
      });
      
      // Add to interactive objects array
      this.interactiveObjects.push(this.guardNPC);
      
      // Create the gate above the guard
      const gateX = guardX + 120; // One tile to the right of guard
      const gateY = guardY - 96; // Three tiles above the guard
      
      try {
        // Create gate sprite with physics body to block player
        this.gate = this.physics.add.sprite(gateX, gateY, 'silver-gate');
        
        // If silver-gate.png doesn't exist, create a placeholder
        if (!this.textures.exists('silver-gate')) {
          console.log('Creating placeholder for silver-gate');
          const graphics = this.make.graphics({ x: 0, y: 0 });
          graphics.fillStyle(0xC0C0C0); // Silver color
          graphics.fillRect(0, 0, 144, 144);
          graphics.lineStyle(2, 0x808080);
          graphics.strokeRect(0, 0, 144, 144);
          
          // Add gate-like details
          graphics.lineStyle(1, 0x808080);
          for (let i = 0; i < 72; i += 6) {
            graphics.beginPath();
            graphics.moveTo(i, 0);
            graphics.lineTo(i, 144);
            graphics.closePath();
            graphics.strokePath();
          }
          
          graphics.generateTexture('silver-gate', 144, 144);
          this.gate.setTexture('silver-gate');
        }
        
        // Get texture dimensions for proper cropping
        const texture = this.textures.get('silver-gate');
        const textureWidth = texture.source[0].width;
        const textureHeight = texture.source[0].height;
        
        // The texture contains two frames side by side - we want to show only the first frame (left half)
        const frameWidth = textureWidth / 2;
        
        // Crop to show only the left half (closed gate)
        this.gate.setCrop(0, 0, frameWidth, textureHeight);
        
        // Store the frame dimensions for the animation
        this.gate.setData('frameWidth', frameWidth);
        this.gate.setData('textureWidth', textureWidth);
        this.gate.setData('textureHeight', textureHeight);
        
        // Set the physics body to match the visible portion
        this.gate.setSize(frameWidth, textureHeight);
        
        // Center the origin for proper positioning
        this.gate.setOrigin(0.5, 0.5);
        
        // Make the gate immovable and add collision with player
        this.gate.setImmovable(true);
        if (this.player) {
          this.physics.add.collider(this.player.sprite, this.gate);
        }
        
        console.log('Successfully created gate with proper cropping');
      } catch (error) {
        console.error('Error creating gate:', error);
      }
      
      console.log('Successfully created guard NPC');
    } catch (error) {
      console.error('Error creating guard NPC:', error);
    }
  }
  
  /**
   * Show dialogue when player interacts with the guard
   */
  showGuardDialogue() {
    // Create a dialogue box
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const dialogueBox = this.add.rectangle(
      width / 2,
      height - 150,
      width - 30,
      280,
      0x000000,
      0.9
    );
    dialogueBox.setScrollFactor(0);
    dialogueBox.setOrigin(0.5);
    dialogueBox.setStrokeStyle(2, 0xFFFFFF);
    
    const message = "Dr. Cipherpunk: \"Hey kid, the world you lived in is gone. It's been scraped and sold. You want to leave this cell? Then build your new identity and show the proof. Get a wallet and claim your own control. Privacy is the only freedom left.\"";
    
    const text = this.add.text(
      width / 2,
      height - 180,
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
    
    // Create buttons but hide them initially
    const buttonWidth = 160;
    const buttonHeight = 40;
    const buttonSpacing = 20;
    
    // Get Wallet button
    const getWalletButton = this.add.rectangle(
      width / 2 - buttonWidth/2 - buttonSpacing,
      height - 55,
      buttonWidth,
      buttonHeight,
      0x4CAF50
    );
    getWalletButton.setScrollFactor(0);
    getWalletButton.setInteractive({ useHandCursor: true });
    getWalletButton.setVisible(false);
    
    const getWalletText = this.add.text(
      getWalletButton.x,
      getWalletButton.y,
      'Get a Wallet',
      {
        fontSize: '16px',
        color: '#FFFFFF'
      }
    );
    getWalletText.setScrollFactor(0);
    getWalletText.setOrigin(0.5);
    getWalletText.setVisible(false);
    
    // Not Ready button
    const notReadyButton = this.add.rectangle(
      width / 2 + buttonWidth/2 + buttonSpacing,
      height - 55,
      buttonWidth,
      buttonHeight,
      0x666666
    );
    notReadyButton.setScrollFactor(0);
    notReadyButton.setInteractive({ useHandCursor: true });
    notReadyButton.setVisible(false);
    
    const notReadyText = this.add.text(
      notReadyButton.x,
      notReadyButton.y,
      'Not Ready',
      {
        fontSize: '16px',
        color: '#FFFFFF'
      }
    );
    notReadyText.setScrollFactor(0);
    notReadyText.setOrigin(0.5);
    notReadyText.setVisible(false);
    
    // Group all dialogue elements
    const dialogueGroup = this.add.group([
      dialogueBox, 
      text, 
      getWalletButton, 
      getWalletText,
      notReadyButton,
      notReadyText
    ]);
    
    // Typewriter effect
    let currentChar = 0;
    const typingSpeed = 10; // milliseconds per character
    
    const typewriterTimer = this.time.addEvent({
      delay: typingSpeed,
      callback: () => {
        text.setText(message.substring(0, currentChar));
        currentChar++;
        
        // When typing is complete, show the buttons
        if (currentChar > message.length) {
          typewriterTimer.destroy();
          getWalletButton.setVisible(true);
          getWalletText.setVisible(true);
          notReadyButton.setVisible(true);
          notReadyText.setVisible(true);
        }
      },
      repeat: message.length
    });
    
    // Function to handle getting wallet
    const getWallet = () => {
      // Open wallet URL in new tab
      if (typeof window !== 'undefined') {
        window.open('https://chromewebstore.google.com/detail/puzzle-aleo-wallet/fdchdcpieegfofnofhgdombfckhbcokj', '_blank');
      }
      
      // Open the gate
      if (this.gate) {
        // Disable the gate's collision body
        if (this.gate.body) {
          this.gate.body.enable = false;
        }
        
        try {
          // Get stored frame dimensions
          const frameWidth = this.gate.getData('frameWidth');
          const textureHeight = this.gate.getData('textureHeight');
          
          if (frameWidth && textureHeight) {
            // Switch to the second frame
            this.gate.setCrop(frameWidth, 0, frameWidth, textureHeight);
            this.gate.x -= frameWidth;
          }
        } catch (error) {
          console.error('Error opening gate:', error);
        }
      }
      
      // Clean up dialogue
      dialogueGroup.destroy(true);
    };
    
    // Function to handle not ready
    const notReady = () => {
      dialogueGroup.destroy(true);
    };
    
    // Handle button clicks
    getWalletButton.on('pointerdown', getWallet);
    notReadyButton.on('pointerdown', notReady);
    
    // Add hover effects
    getWalletButton.on('pointerover', () => {
      getWalletButton.setFillStyle(0x45A049);
    });
    getWalletButton.on('pointerout', () => {
      getWalletButton.setFillStyle(0x4CAF50);
    });
    
    notReadyButton.on('pointerover', () => {
      notReadyButton.setFillStyle(0x555555);
    });
    notReadyButton.on('pointerout', () => {
      notReadyButton.setFillStyle(0x666666);
    });
  }
  
  /**
   * Collect the keycard when player interacts with it
   */
  collectKeycard() {
    if (this.hasKeycard) {
      console.log('Keycard already collected, skipping collection');
      return;
    }
    
    console.log('Inserting keycard...');
    this.hasKeycard = true;
    
    // Create a visual and text feedback
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Add a flash effect at the keycard location
    if (this.keycard) {
      const flash = this.add.sprite(this.keycard.x, this.keycard.y, 'backwall-keycard');
      flash.setTint(0x00ff00);
      flash.setAlpha(0.5);
      
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 1.5,
        duration: 500,
        onComplete: () => flash.destroy()
      });
    }
    
    // Show insertion message
    const keycardText = this.add.text(
      width / 2,
      height / 2,
      "Keycard inserted! Gate is opening...",
      {
        fontSize: '18px',
        color: '#FFFFFF',
        backgroundColor: '#00000080',
        padding: { x: 20, y: 10 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Add a subtle bounce animation to the text
    this.tweens.add({
      targets: keycardText,
      y: height / 2 - 10,
      duration: 200,
      yoyo: true,
      ease: 'Bounce'
    });
    
    // Remove text after a few seconds
    this.time.delayedCall(3000, () => {
      keycardText.destroy();
    });
    
    // Hide or remove the keycard interaction
    if (this.keycard) {
      // Fade out the keycard sprite
      this.tweens.add({
        targets: this.keycard,
        alpha: 0,
        scale: 0,
        duration: 300,
        onComplete: () => {
          this.keycard?.destroy();
          
          // Remove from interactive objects array
          const index = this.interactiveObjects.findIndex(obj => obj === this.keycard);
          if (index !== -1) {
            this.interactiveObjects.splice(index, 1);
          }
          
          this.keycard = undefined;
          console.log('Keycard object removed from scene');
          
          // Automatically open the gate after keycard is collected
          if (this.exitGate) {
            this.openExitGate();
          }
        }
      });
    }
    
  }
  
  /**
   * Check if any interactive objects are in range and show indicators
   */
  checkInteractiveObjects() {
    if (!this.player) return;
    
    // Check if player is near the exit gate and has the keycard
    if (this.exitGate && this.hasKeycard && this.exitGate.getData('isLocked')) {
      const playerBounds = this.player.sprite.getBounds();
      const gateBounds = this.exitGate.getBounds();
      
      // Add some tolerance to the check to make it easier to trigger
      gateBounds.x -= 20;
      gateBounds.width += 40;
      
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, gateBounds)) {
        console.log('Player is at the exit gate with keycard - opening gate');
        this.openExitGate();
      }
    }
    
    // Check if player is touching the open exit gate (for level transition)
    if (this.exitGate && !this.exitGate.getData('isLocked') && !this.exitGate.getData('transitioning')) {
      const playerBounds = this.player.sprite.getBounds();
      const gateBounds = this.exitGate.getBounds();
      
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, gateBounds)) {
        console.log('Player is going through the open exit gate - transitioning to next level');
        this.transitionToNextLevel();
      }
    }
    
    // Original code for finding interactive objects
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Interaction range
    let closestObject: Phaser.GameObjects.GameObject | undefined;
    let closestDistance = interactDistance;
    
    // Find the closest interactive object in range
    this.interactiveObjects.forEach(obj => {
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
    // Check if this is the computer interaction
    if (object.getData('onInteract')?.toString().includes('showComputerDialogue')) {
      console.log('Showing computer indicator');
      // Make sure computer indicator exists and is visible
      if (this.computerInteractionIndicator) {
        this.computerInteractionIndicator.setVisible(true);
      } else {
        console.warn('Computer indicator not found when trying to show it');
      }
      return;
    }

    // Otherwise use the regular indicator for other objects
    let objX = 0;
    let objY = 0;
    
    if ('getCenter' in object) {
      const center = (object as unknown as Phaser.GameObjects.Sprite).getCenter();
      objX = center.x;
      objY = center.y;
    } else if ('x' in object && 'y' in object) {
      objX = (object as unknown as { x: number }).x;
      objY = (object as unknown as { y: number }).y;
    }
    
    // Position above the object
    const x = objX;
    const y = objY - 40;
    
    // If we don't have an indicator yet, create one
    if (!this.interactionIndicator) {
      // Create a simple indicator
      this.interactionIndicator = this.add.sprite(x, y, 'interaction-indicator');
      
      if (!this.textures.exists('interaction-indicator')) {
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
    // Hide regular indicator
    if (this.interactionIndicator) {
      this.interactionIndicator.setVisible(false);
    }
    
    // Hide computer indicator
    if (this.computerInteractionIndicator) {
      console.log('Hiding computer indicator');
      this.computerInteractionIndicator.setVisible(false);
    }
  }
  
  /**
   * Interact with the nearby object if one exists
   */
  interactWithNearbyObject() {
    if (this.nearbyObject) {
      const onInteract = this.nearbyObject.getData('onInteract');
      if (typeof onInteract === 'function') {
        onInteract();
      }
    }
  }

  /**
   * Create the blue exit gate at the top center of area B
   */
  createExitGate() {
    // Define the position for the exit gate in area B
    // The exit gate should be placed where the backwall-exit tiles are (row 1, columns 6-8)
    const tileSize = 48;
    const exitTileX = 7; // Center between columns 6-8 (0-indexed)
    const exitTileY = 2; // Row 1 (0-indexed)
    
    const gateX = exitTileX * tileSize + (tileSize * 1); // Center between the 3 tiles
    const gateY = exitTileY * tileSize + (tileSize / 1); // Center in the tile vertically
    
    console.log('Creating exit gate at position:', gateX, gateY);
    
    try {
      // Create gate sprite with physics body
      this.exitGate = this.physics.add.sprite(gateX, gateY, 'blue-gate');
      
      // Debug logging for gate properties
      console.log('Exit gate created:', {
        visible: this.exitGate.visible,
        alpha: this.exitGate.alpha,
        depth: this.exitGate.depth,
        x: this.exitGate.x,
        y: this.exitGate.y,
        texture: this.exitGate.texture.key
      });
      
      // Get texture dimensions for proper cropping
      const texture = this.textures.get('blue-gate');
      console.log('Blue gate texture:', {
        exists: this.textures.exists('blue-gate'),
        width: texture?.source[0]?.width,
        height: texture?.source[0]?.height
      });
      
      // The texture contains frames side by side - blue gate has 192px per frame
      const frameWidth = 192; // Fixed frame width to 192px
      const textureHeight = texture.source[0].height;
      
      // Instead of cropping, set up the sprite's frame configuration
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
      
      // Set a flag to indicate the gate is locked (requires keycard)
      this.exitGate.setData('isLocked', true);
      
      // Make sure the gate is visible and on the correct depth layer
      this.exitGate.setDepth(5); // Put it above the floor but below other objects
      this.exitGate.setAlpha(1); // Ensure full visibility
      
      // Additional debug logging after setup
      console.log('Exit gate setup complete:', {
        frameWidth,
        textureHeight,
        displaySize: {
          width: this.exitGate.displayWidth,
          height: this.exitGate.displayHeight
        },
        physicsBody: this.exitGate.body ? {
          width: this.exitGate.body.width,
          height: this.exitGate.body.height
        } : 'No physics body'
      });
      
    } catch (error) {
      console.error('Error creating exit gate:', error);
      // Add more detailed error information
      if (this.exitGate) {
        console.log('Exit gate state at error:', {
          exists: !!this.exitGate,
          texture: this.exitGate.texture?.key,
          frame: this.exitGate.frame,
          visible: this.exitGate.visible,
          position: { x: this.exitGate.x, y: this.exitGate.y }
        });
      }
    }
    
    // Create the keycard interactive object
    this.createKeycard();
  }
  
  /**
   * Create the keycard interactive object
   */
  createKeycard() {
    // Position the keycard where the backwall-keycard tile is (row 1, column 10)
    const tileSize = 48;
    const keycardTileX = 10;
    const keycardTileY = 3;
    
    const keycardX = keycardTileX * tileSize + (tileSize / 2);
    const keycardY = keycardTileY * tileSize + (tileSize / 2);
    
    console.log('Creating keycard interaction zone at:', keycardX, keycardY);
    
    // Create a small sprite for the keycard interaction zone
    this.keycard = this.add.sprite(keycardX, keycardY, 'backwall-keycard');
    
    // Make it semi-visible to show interaction area
    this.keycard.setAlpha(0);
    
    // Create a subtle glow effect
    const glowGraphics = this.add.graphics();
    glowGraphics.lineStyle(2, 0x00ff00, 0);
    glowGraphics.strokeRect(keycardX - 24, keycardY - 24, 48, 48);
    
    // Add a pulsing animation to the glow
    this.tweens.add({
      targets: glowGraphics,
      alpha: { from: 0.3, to: 0 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // Make the keycard interactive
    this.keycard.setInteractive({ useHandCursor: true });
    
    // Add to interactive objects array for player proximity detection
    this.keycard.setData('interactive', true);
    this.keycard.setData('onInteract', () => {
      console.log('Keycard interaction triggered');
      this.collectKeycard();
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(this.keycard);
    
    console.log('Keycard interaction zone created with glow effect');
  }

  /**
   * Open the exit gate
   */
  openExitGate() {
    if (!this.exitGate) return;
    
    // Only open if player has the keycard
    if (!this.hasKeycard) {
      console.log('Cannot open exit gate - keycard required');
      
      // Show a message that a keycard is needed
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      const lockedText = this.add.text(
        width / 2,
        height / 2,
        "The gate is locked. You need a keycard to open it.",
        {
          fontSize: '18px',
          color: '#FFFFFF',
          backgroundColor: '#00000080',
          padding: { x: 20, y: 10 },
          align: 'center'
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
      
      // Remove text after a few seconds
      this.time.delayedCall(3000, () => {
        lockedText.destroy();
      });
      
      return;
    }
    
    // Mark the gate as unlocked
    this.exitGate.setData('isLocked', false);
    
    // Get stored frame dimensions
    const frameWidth = this.exitGate.getData('frameWidth');
    const textureHeight = this.exitGate.getData('textureHeight');
    
    // Only proceed if we have the dimensions
    if (!frameWidth || !textureHeight) return;
    
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
        frameRate: 12,
        repeat: 0 // Play once
      });
    }
    
    // Play the opening animation
    this.exitGate.play('blue-gate-open');
    
    // Show a message about the gate opening
    // const width = this.cameras.main.width;
    // const height = this.cameras.main.height;
    
    // const gateText = this.add.text(
    //   width / 2,
    //   height / 2,
    //   "The exit gate has opened! Proceed to the next level.",
    //   {
    //     fontSize: '18px',
    //     color: '#FFFFFF',
    //     backgroundColor: '#00000080',
    //     padding: { x: 20, y: 10 },
    //     align: 'center'
    //   }
    // ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Add a subtle particle effect for emphasis
    this.addGateOpeningEffect(this.exitGate.x, this.exitGate.y);
    
    // Remove text after a few seconds
    // this.time.delayedCall(3000, () => {
    //   gateText.destroy();
    // });
  }
  
  /**
   * Add a particle effect when the gate opens
   */
  addGateOpeningEffect(x: number, y: number) {
    try {
      // Create a particle emitter for the gate opening effect
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
      console.error('Error creating gate opening effect:', error);
    }
  }
  
  /**
   * Transition to the next level
   */
  transitionToNextLevel() {
    // Prevent multiple transitions
    if (this.exitGate?.getData('transitioning')) return;
    
    if (this.exitGate) {
      this.exitGate.setData('transitioning', true);
    }
    
    // Fade out effect
    this.cameras.main.fade(1000, 0, 0, 0);
    
    // Wait for fade to complete then change scene
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Start Level 2
      this.scene.start('Level2Scene');
    });
  }

  update() {
    if (!this.player || !this.cursors) return;
    
    // Update player movement and animations
    this.player.update(this.cursors);
    
    // Check for nearby interactive objects
    this.checkInteractiveObjects();

    // Handle interactions
    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    
    if (spaceJustPressed) {
      console.log('SPACE pressed, checking for interactions...');
      
      // Find the closest interactive object
      const closestObject = this.findClosestInteractiveObject();
      console.log('Closest interactive object:', {
        found: !!closestObject,
        isComputer: closestObject?.getData('onInteract')?.toString().includes('showComputerDialogue')
      });

      if (closestObject && closestObject.getData('interactive')) {
        const onInteract = closestObject.getData('onInteract');
        if (onInteract && typeof onInteract === 'function') {
          console.log('Triggering interaction...');
          onInteract();
        }
      }
    }
  }

  /**
   * Find the closest interactive object to the player
   */
  findClosestInteractiveObject(): Phaser.GameObjects.Rectangle | null {
    if (!this.player || !this.interactiveObjects.length) return null;

    const playerBounds = this.player.sprite.getBounds();
    let closestObject = null;
    let closestDistance = Infinity;

    this.interactiveObjects.forEach((obj: Phaser.GameObjects.GameObject) => {
      if (!(obj instanceof Phaser.GameObjects.Rectangle) || !obj.getData('interactive')) return;

      const objBounds = obj.getBounds();
      const distance = Phaser.Math.Distance.BetweenPoints(
        { x: playerBounds.centerX, y: playerBounds.centerY },
        { x: objBounds.centerX, y: objBounds.centerY }
      );

      // Only consider objects within interaction range (adjust the 100 value as needed)
      if (distance < 100 && distance < closestDistance) {
        closestDistance = distance;
        closestObject = obj;
      }
    });

    return closestObject;
  }
} 
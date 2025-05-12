'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';
import Player from '@/lib/classes/Player';

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
    this.showWelcomeMessage();

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
   * Show welcome message for Level 2
   */
  showWelcomeMessage() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const welcomeText = this.add.text(
      width / 2,
      height / 2,
      "Welcome to Level 2!\nDigital Defense",
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#FFFFFF',
        backgroundColor: '#00000080',
        padding: { x: 20, y: 10 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Remove text after a few seconds
    this.time.delayedCall(3000, () => {
      welcomeText.destroy();
    });
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
      height - 100,
      width - 100,
      120,
      0x000000,
      0.7
    );
    dialogueBox.setScrollFactor(0);
    dialogueBox.setOrigin(0.5);
    dialogueBox.setStrokeStyle(2, 0xFFFFFF);
    
    // Different dialogue based on if player already has keycard
    let message;
    if (!this.hasKeycard) {
      message = "Hello! Welcome to the Digital Defense department. You'll need a security keycard to proceed.\nHere's your keycard.";
    } else {
      message = "You already have your keycard. Use it at the security terminal on the wall to open the gate.";
    }
    
    const text = this.add.text(
      width / 2,
      height - 100,
      message,
      {
        fontSize: '16px',
        color: '#FFFFFF',
        align: 'center',
        wordWrap: { width: width - 150 }
      }
    );
    text.setScrollFactor(0);
    text.setOrigin(0.5);
    
    // Add a continue button
    const continueButton = this.add.rectangle(
      width / 2,
      height - 40,
      120,
      30,
      0x4CAF50
    );
    continueButton.setScrollFactor(0);
    continueButton.setInteractive({ useHandCursor: true });
    
    const buttonText = this.add.text(
      width / 2,
      height - 40, 
      'Continue',
      {
        fontSize: '14px',
        color: '#FFFFFF'
      }
    );
    buttonText.setScrollFactor(0);
    buttonText.setOrigin(0.5);
    
    // Group all dialogue elements
    const dialogueGroup = this.add.group([dialogueBox, text, continueButton, buttonText]);
    
    // Function to handle dialogue completion
    const completeDialogue = () => {
      // Give keycard to player if they don't already have it
      if (!this.hasKeycard) {
        this.hasKeycard = true;
        
        // Show message about receiving keycard
        const keycardText = this.add.text(
          width / 2,
          height / 2,
          "You received a keycard! Use it at the security terminal on the wall.",
          {
            fontSize: '18px',
            color: '#FFFFFF',
            backgroundColor: '#00000080',
            padding: { x: 20, y: 10 },
            align: 'center'
          }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
        
        // Add a subtle bounce animation
        this.tweens.add({
          targets: keycardText,
          y: height / 2 - 10,
          duration: 200,
          yoyo: true,
          ease: 'Bounce'
        });
        
        // Remove message after a few seconds
        this.time.delayedCall(3000, () => {
          keycardText.destroy();
        });
      }
      
      // Remove the keyboard listener
      this.input.keyboard?.off('keydown-ENTER');
      
      // Destroy the dialogue
      dialogueGroup.destroy(true);
    };
    
    // Handle continue button click
    continueButton.on('pointerdown', completeDialogue);
    
    // Add keyboard support for Enter key
    this.input.keyboard?.on('keydown-ENTER', completeDialogue);
  }

  /**
   * Use keycard on the wall terminal to open the gate
   */
  useKeycardOnWall() {
    if (!this.hasKeycard) {
      // Player doesn't have the keycard yet
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      const noKeycardText = this.add.text(
        width / 2,
        height / 2,
        "You need a keycard to use this terminal. Talk to the receptionist first.",
        {
          fontSize: '18px',
          color: '#FFFFFF',
          backgroundColor: '#00000080',
          padding: { x: 20, y: 10 },
          align: 'center'
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
      
      // Remove message after a few seconds
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
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const gateText = this.add.text(
      width / 2,
      height / 2,
      "The gate has opened! You can now proceed to the next level.",
      {
        fontSize: '18px',
        color: '#FFFFFF',
        backgroundColor: '#00000080',
        padding: { x: 20, y: 10 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Add particle effect
    this.addGateOpeningEffect(this.exitGate.x, this.exitGate.y);
    
    // Remove text after a few seconds
    this.time.delayedCall(3000, () => {
      gateText.destroy();
    });
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
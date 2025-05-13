'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';
import Player from '@/lib/classes/Player';

/**
 * Level4Scene - Advanced Topics
 * 
 * This is the fourth level of the Legend of Leo game.
 * Players learn about advanced privacy topics and concepts.
 */
export default class Level4Scene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private map?: Phaser.Tilemaps.Tilemap;
  private layers?: MapLayers;
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private nearbyObject?: Phaser.GameObjects.GameObject;
  private keycard?: Phaser.GameObjects.Sprite;
  private hasKeycard: boolean = false;
  private exitGate?: Phaser.Physics.Arcade.Sprite;
  private concreteDoor?: Phaser.GameObjects.Sprite;
  private doorActive: boolean = false;
  private debugCollisions: boolean = true; // Toggle for debugging collisions
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private guardNPC?: Phaser.GameObjects.Sprite;
  // Remove the shared indicator and track object-specific indicators
  private interactionIndicators: Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Sprite> = new Map();

  constructor() {
    super({ key: 'Level4Scene' });
  }

  init() {
    // Store current scene in localStorage for development mode reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentScene', this.scene.key);
      console.log('Current scene saved:', this.scene.key);
    }
    
    // Initialize interactive objects array
    this.interactiveObjects = [];
    this.hasKeycard = false;
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
    
    // Load level 4 tilemap
    this.load.tilemapTiledJSON('level4', '/assets/maps/levels/level4.json');
    
    // Load tile images if they don't already exist
    if (!textureCheck('floor')) {
      this.load.image('floor', '/assets/maps/floor.png');
    }
    
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

    if (!textureCheck('big-desk')) {
      this.load.image('big-desk', '/assets/maps/big-desk.png');
    }

    if (!textureCheck('big-screens')) {
      this.load.image('big-screens', '/assets/maps/big-screens.png');
    }

    if (!textureCheck('guard-l1')) {
      this.load.image('guard-l1', '/assets/maps/guard-l1.png');
    }

    if (!textureCheck('concrete-door')) {
      // Load concrete-door as a spritesheet since it has multiple frames for animation
      this.load.spritesheet('concrete-door', '/assets/sprites/concrete-door.png', {
        frameWidth: 24,
        frameHeight: 144,
        spacing: 0,
        margin: 0
      });
    }

    // Load border tiles
    const borderTiles = [
      'top-border', 'left-border', 'right-border', 'bottom-border',
      'left-t-corner-border', 'right-t-corner-border', 'left-b-corner-border', 'right-b-corner-border',
      'left-t-edge-corner', 'right-t-edge-corner', 'left-b-edge-corner', 'right-b-edge-corner',
      'backwall-keycard', 'backwall-exit'
    ];
    
    borderTiles.forEach(key => {
      if (!textureCheck(key)) {
        this.load.image(key, `/assets/maps/${key}.png`);
      }
    });
    
    // Load blue gate as a spritesheet with seven frames if needed
    if (!textureCheck('blue-gate')) {
      this.load.spritesheet('blue-gate', '/assets/sprites/blue-gate.png', {
        frameWidth: 192,  // Each frame is 192px wide
        frameHeight: 93,  // Height from the texture
        spacing: 0,
        margin: 0,
        endFrame: 6 // Load all 7 frames (0-6)
      });
    }
  }

  create() {
    // Disable physics debugging
    this.physics.world.debugGraphic.clear();
    this.physics.world.debugGraphic.visible = false;
    
    // Set the background color to match the tilemap backgroundColor
    this.cameras.main.setBackgroundColor('#2B2A3D');
    
    // Load the tilemap
    try {
      console.log('Loading level4 tilemap...');
      const { map, layers } = loadTilemap(
        this,
        'level4',
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

      // Add big-desk and big-screens to the right room
      this.addFurniture();
      // Add the guard to the left room
      this.addGuard();
    } catch (error) {
      console.error('Failed to load level4 tilemap:', error);
      // Fall back to creating a programmatic level
      this.createBasicLevel();
    }
    
    // Create player at starting position in the bottom right of the level
    const tileSize = 48;
    const startX = 13.5 * tileSize; 
    const startY = 12 * tileSize;
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
    
    // Show welcome message for level 4
    this.showWelcomeMessage();
    
    // Create the keycard
    this.createKeycard();
    
    // Create the exit gate
    this.createExitGate();
    
    // Add the concrete door after the player is created
    // for better collision handling
    this.addConcreteDoor();
    
    console.log("Level 4 scene fully initialized");
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
   * Create a basic level as fallback
   */
  createBasicLevel() {
    // Create a simple level with two rooms connected by a passage
    const levelWidth = 20;
    const levelHeight = 15;
    const tileSize = 48;
    
    this.map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: levelWidth,
      height: levelHeight
    });
    
    // Add tilesets
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
    
    // Create walls around the perimeter and between rooms
    for (let x = 0; x < levelWidth; x++) {
      // Top and bottom walls
      wallsLayer.putTileAt(0, x, 0);
      wallsLayer.putTileAt(0, x, levelHeight - 1);
    }
    
    for (let y = 0; y < levelHeight; y++) {
      // Left and right walls
      wallsLayer.putTileAt(0, 0, y);
      wallsLayer.putTileAt(0, levelWidth - 1, y);
      
      // Middle dividing wall (with passage in the middle)
      if (y < 4 || y > 7) {
        wallsLayer.putTileAt(0, 10, y);
      }
    }
    
    // Set collision for wall layer
    wallsLayer.setCollisionByExclusion([-1]);
  }
  
  /**
   * Show welcome message for level 4
   */
  showWelcomeMessage() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const welcomeText = this.add.text(
      width / 2,
      height / 2,
      "Welcome to Level 4!\nAdvanced Privacy Concepts",
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
   * Create a keycard that the player can collect
   */
  createKeycard() {
    // Position the keycard terminal in the left room
    const tileSize = 48;
    const keycardX = 7.5 * tileSize;
    const keycardY = 3.5 * tileSize;
    
    console.log('Creating keycard terminal at:', keycardX, keycardY);
    
    // Create a sprite for the keycard terminal
    this.keycard = this.add.sprite(keycardX, keycardY, 'backwall-keycard');
    
    // Make it invisible but still interactive
    this.keycard.setAlpha(0);
    
    // Make it interactive
    this.keycard.setInteractive({ useHandCursor: true });
    
    // Add interactive behavior
    this.keycard.setData('interactive', true);
    this.keycard.setData('onInteract', () => {
      this.useKeycardTerminal();
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(this.keycard);

    // Create a dedicated indicator for the keycard terminal
    this.createInteractionIndicator(this.keycard);
  }
  
  /**
   * Use the keycard terminal - only works if player has keycard
   */
  useKeycardTerminal() {
    if (!this.hasKeycard) {
      // Show message that keycard is needed
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      const lockedText = this.add.text(
        width / 2,
        height / 2,
        "You need a keycard to use this terminal.",
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
    } else {
      // Player has keycard, unlock the exit gate
      if (this.exitGate) {
        this.unlockExitGate();
      }
    }
  }
  
  /**
   * Player collects the keycard from the guard
   */
  collectKeycard() {
    if (this.hasKeycard) return;
    
    this.hasKeycard = true;

  }
  
  /**
   * Create the exit gate
   */
  createExitGate() {
    const tileSize = 48;
    // Position the exit gate in the right room
    const gateX = 5 * tileSize;
    const gateY = 3 * tileSize;
    
    console.log('Creating exit gate at:', gateX, gateY);
    
    // Create the gate sprite with the blue-gate texture
    this.exitGate = this.physics.add.sprite(gateX, gateY, 'blue-gate');
    
    // Set the gate to the first frame (closed)
    this.exitGate.setFrame(0);
    
    // Use the standard dimensions
    const frameWidth = 192;
    const textureHeight = 93;
    
    // Set the display size
    this.exitGate.setDisplaySize(frameWidth, textureHeight);
    
    // Set the physics body to match the visible portion
    this.exitGate.setSize(frameWidth - 20, textureHeight - 20);
    
    // Make the gate immovable and add collision with player
    this.exitGate.setImmovable(true);
    if (this.player) {
      this.physics.add.collider(this.player.sprite, this.exitGate);
    }
    
    // Set a flag to indicate the gate is locked (requires keycard)
    this.exitGate.setData('isLocked', true);
    
    // Make the gate interactive
    this.exitGate.setInteractive({ useHandCursor: true });
    this.exitGate.setData('interactive', true);
    this.exitGate.setData('onInteract', () => {
      this.tryOpenExitGate();
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(this.exitGate);
  }
  
  /**
   * Try to open the exit gate (if player has keycard)
   */
  tryOpenExitGate() {
    if (!this.hasKeycard) {
      // Show message that keycard is needed
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
    } else {
      this.unlockExitGate();
    }
  }
  
  /**
   * Unlock the exit gate with the keycard
   */
  unlockExitGate() {
    if (!this.exitGate || !this.exitGate.getData('isLocked')) return;
    
    console.log('Unlocking exit gate with keycard');
    
    // Mark the gate as unlocked
    this.exitGate.setData('isLocked', false);
    
    // Disable the collision body to allow player to pass through
    if (this.exitGate.body) {
      this.exitGate.body.enable = false;
    }
    
    // Create animation frames for the gate if they don't exist
    if (!this.anims.exists('blue-gate-open')) {
      this.anims.create({
        key: 'blue-gate-open',
        frames: this.anims.generateFrameNumbers('blue-gate', { start: 0, end: 6 }),
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
    //   "The exit gate has opened!",
    //   {
    //     fontSize: '18px',
    //     color: '#FFFFFF',
    //     backgroundColor: '#00000080',
    //     padding: { x: 20, y: 10 },
    //     align: 'center'
    //   }
    // ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Add a particle effect for emphasis
    this.addGateOpeningEffect(this.exitGate.x, this.exitGate.y);
    
    // Remove text after a few seconds
    // this.time.delayedCall(3000, () => {
    //   gateText.destroy();
    // });
    
    // The player now needs to walk through the gate to trigger the transition
    // instead of immediately transitioning
  }
  
  /**
   * Check if player walks through the open exit gate to trigger level transition
   */
  checkPlayerExitGate() {
    if (!this.player || !this.exitGate) return;
    
    // Only check if the gate is unlocked
    if (this.exitGate.getData('isLocked')) return;
    
    // Check if player is within the gate bounds
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
   * Add a particle effect when the gate opens
   */
  addGateOpeningEffect(x: number, y: number) {
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
    
    // Clean up after particles are done
    this.time.delayedCall(1500, () => {
      particles.destroy();
    });
  }
  
  /**
   * Create a trigger zone after the exit gate for level transition
   */
  createExitTriggerZone() {
    if (!this.exitGate) return;
    
    const x = this.exitGate.x;
    const y = this.exitGate.y + 100; // Just below the gate
    const width = 200;
    const height = 100;
    
    // Create a zone that will trigger the level transition
    const triggerZone = this.add.zone(x, y, width, height);
    this.physics.world.enable(triggerZone, Phaser.Physics.Arcade.STATIC_BODY);
    
    // Add overlap detection
    if (this.player) {
      this.physics.add.overlap(this.player.sprite, triggerZone, () => {
        this.transitionToNextLevel();
      });
    }
  }
  
  /**
   * Transition to the next level
   */
  transitionToNextLevel() {
    // Prevent multiple transitions
    if (this.data && this.data.get('transitioning')) return;
    
    // Mark as transitioning
    this.data.set('transitioning', true);
    
    // Fade out effect
    this.cameras.main.fade(1000, 0, 0, 0);
    
    // Wait for fade to complete then change scene
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Go to Level 5
      this.scene.start('Level5Scene');
    });
  }
  
  /**
   * Check if any interactive objects are in range and show indicators
   */
  checkInteractiveObjects() {
    if (!this.player) return;
    
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Interaction range
    let closestObject: Phaser.GameObjects.GameObject | undefined;
    let closestDistance = interactDistance;
    
    // First, hide all indicators
    this.interactionIndicators.forEach(indicator => {
      indicator.setVisible(false);
    });
    
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
      
      if (distance < interactDistance) {
        // If object is in range, show its indicator
        const indicator = this.interactionIndicators.get(obj);
        if (indicator) {
          // Update position (in case object moved)
          indicator.setPosition(objX, objY - 40);
          indicator.setVisible(true);
        }
        
        // Track closest object for interaction
        if (distance < closestDistance) {
          closestObject = obj;
          closestDistance = distance;
        }
      }
    });
    
    // Update the nearby object reference
    this.nearbyObject = closestObject;
  }
  
  /**
   * Create an interaction indicator for a specific object
   */
  createInteractionIndicator(object: Phaser.GameObjects.GameObject) {
    // Get object position
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
    
    // Create indicator texture if it doesn't exist
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
    
    // Create a dedicated indicator for this object
    const indicator = this.add.sprite(x, y, 'interaction-indicator');
    indicator.setVisible(false); // Hide initially
    indicator.setDepth(200); // High depth to ensure visibility
    
    // Add animations
    this.tweens.add({
      targets: indicator,
      y: y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.tweens.add({
      targets: indicator,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Store the indicator reference
    this.interactionIndicators.set(object, indicator);
    
    return indicator;
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
   * Add furniture to the level
   */
  addFurniture() {
    const tileSize = 48;
    const deskX = 13.5 * tileSize;
    const deskY = 4 * tileSize;
    const bigDesk = this.add.image(deskX, deskY, 'big-desk');
    bigDesk.setDepth(5);
    const screensX = deskX;
    const screensY = deskY - (tileSize * 1.7);
    const bigScreens = this.add.image(screensX, screensY, 'big-screens');
    bigScreens.setDepth(6);

    // --- Custom interactive area for furniture ---
    // Area is as wide as the desk, 2 tiles below the desk
    const areaWidth = bigDesk.displayWidth || 144; // fallback width
    const areaHeight = tileSize; // 1 tile high
    const areaX = deskX;
    const areaY = deskY + (tileSize * 1); // 2 tiles below desk

  

    // Create the interactive zone
    const interactZone = this.add.zone(areaX, areaY, areaWidth, areaHeight);
    interactZone.setOrigin(0.5);
    interactZone.setInteractive({ useHandCursor: true });
    interactZone.setData('interactive', true);
    interactZone.setData('onInteract', () => {
      this.showScreensMessage();
    });
    this.interactiveObjects.push(interactZone);
    
    // Create a dedicated indicator for the screens interaction
    this.createInteractionIndicator(interactZone);

    console.log('Added furniture to right room:', { deskX, deskY, screensX, screensY, areaX, areaY, areaWidth, areaHeight });
  }

  addGuard() {
    const tileSize = 48;
    const guardX = 1.5 * tileSize;
    const guardY = 10 * tileSize;

    // Create the guard as a sprite so we can make it interactive
    this.guardNPC = this.add.sprite(guardX, guardY, 'guard-l1');
    this.guardNPC.setDepth(5);
    
    // Make the guard interactive
    this.guardNPC.setInteractive({ useHandCursor: true });
    this.guardNPC.setData('interactive', true);
    this.guardNPC.setData('onInteract', () => {
      this.talkToGuard();
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(this.guardNPC);
    
    // Create a dedicated indicator for the guard
    this.createInteractionIndicator(this.guardNPC);
    
    console.log('Added interactive guard at:', guardX, guardY);
  }

  /**
   * Handle dialogue with the guard
   */
  talkToGuard() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    if (!this.doorActive) {
      // If the concrete door isn't open yet, guard won't help
      const noAccessText = this.add.text(
        width / 2,
        height / 2,
        "Guard: Sorry, I can't help you right now.\nThe secure area is locked.",
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
        noAccessText.destroy();
      });
    } else if (this.hasKeycard) {
      // If player already has the keycard
      const alreadyHasText = this.add.text(
        width / 2,
        height / 2,
        "Guard: You already have the keycard.\nUse it at the terminal to open the gate.",
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
        alreadyHasText.destroy();
      });
    } else {
      // Create an interactive dialogue box
      const dialogueBox = this.add.rectangle(
        width / 2,
        height - 120,
        width - 100,
        150,
        0x000000,
        0.8
      );
      dialogueBox.setScrollFactor(0);
      dialogueBox.setOrigin(0.5);
      dialogueBox.setStrokeStyle(2, 0xFFFFFF);
      
      const message = "Guard: Congratulations for making it this far!\nWould you like to mint your graduation NFT?";
      
      const text = this.add.text(
        width / 2,
        height - 140,
        message,
        {
          fontSize: '18px',
          color: '#FFFFFF',
          align: 'center',
          wordWrap: { width: width - 150 }
        }
      );
      text.setScrollFactor(0);
      text.setOrigin(0.5);
      
      // Add "Mint" button
      const mintButton = this.add.rectangle(
        width / 2 - 70,
        height - 80,
        100,
        40,
        0x4CAF50
      );
      mintButton.setScrollFactor(0);
      mintButton.setInteractive({ useHandCursor: true });
      
      const mintText = this.add.text(
        width / 2 - 70,
        height - 80, 
        'Mint',
        {
          fontSize: '16px',
          color: '#FFFFFF'
        }
      );
      mintText.setScrollFactor(0);
      mintText.setOrigin(0.5);
      
      // Add "Deny" button
      const denyButton = this.add.rectangle(
        width / 2 + 70,
        height - 80,
        100,
        40,
        0xF44336
      );
      denyButton.setScrollFactor(0);
      denyButton.setInteractive({ useHandCursor: true });
      
      const denyText = this.add.text(
        width / 2 + 70,
        height - 80, 
        'Deny',
        {
          fontSize: '16px',
          color: '#FFFFFF'
        }
      );
      denyText.setScrollFactor(0);
      denyText.setOrigin(0.5);
      
      // Group all dialogue elements
      const dialogueGroup = this.add.group([
        dialogueBox, text, 
        mintButton, mintText, 
        denyButton, denyText
      ]);
      
      // Handle "Mint" button click
      mintButton.on('pointerdown', () => {
        // Update the dialogue text to show minting in progress
        text.setText("Minting your graduation NFT...");
        
        // Hide the buttons
        mintButton.setVisible(false);
        mintText.setVisible(false);
        denyButton.setVisible(false);
        denyText.setVisible(false);
        
        // After a short delay, show completion and give keycard
        this.time.delayedCall(2000, () => {
          dialogueGroup.destroy(true);
          
          // Show minting completion message
          const mintingCompleteText = this.add.text(
            width / 2,
            height / 2,
            "NFT Minted successfully!\nGuard: Here's your keycard as a reward!",
            {
              fontSize: '18px',
              color: '#FFFFFF',
              backgroundColor: '#00000080',
              padding: { x: 20, y: 10 },
              align: 'center'
            }
          ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
          
          // Give the keycard after dialogue finishes
          this.time.delayedCall(3000, () => {
            mintingCompleteText.destroy();
            this.collectKeycard();
          });
        });
      });
      
      // Handle "Deny" button click
      denyButton.on('pointerdown', () => {
        // Close the dialogue without giving keycard
        dialogueGroup.destroy(true);
        
        // Show a brief message
        const denyText = this.add.text(
          width / 2,
          height / 2,
          "Guard: No problem. Let me know if you change your mind.",
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
          denyText.destroy();
        });
      });
    }
  }

  /**
   * Show a message when interacting with the big-screens
   */
  showScreensMessage() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create a terminal-like interface
    const terminalBackground = this.add.rectangle(
      width / 2,
      height / 2,
      width - 100,
      height - 150,
      0x000000,
      0.9
    );
    terminalBackground.setScrollFactor(0);
    terminalBackground.setOrigin(0.5);
    terminalBackground.setStrokeStyle(2, 0x00ff00); // Green border for terminal look
    terminalBackground.setDepth(1000); // Set very high depth to appear above everything
    
    // Terminal header
    const headerBar = this.add.rectangle(
      width / 2,
      height / 2 - (height - 180) / 2 + 15,
      width - 110,
      30,
      0x333333,
      1
    );
    headerBar.setScrollFactor(0);
    headerBar.setOrigin(0.5);
    headerBar.setDepth(1000);
    
    const terminalTitle = this.add.text(
      width / 2,
      height / 2 - (height - 180) / 2 + 15,
      "Security Terminal Access",
      {
        fontSize: '16px',
        color: '#00ff00',
        fontFamily: 'monospace'
      }
    );
    terminalTitle.setScrollFactor(0);
    terminalTitle.setOrigin(0.5);
    terminalTitle.setDepth(1000);
    
    // Welcome message
    const welcomeText = this.add.text(
      width / 2,
      height / 2 - 80,
      "Welcome to the Aleo Security Terminal.\nPlease select an option:",
      {
        fontSize: '18px',
        color: '#00ff00',
        fontFamily: 'monospace',
        align: 'center'
      }
    );
    welcomeText.setScrollFactor(0);
    welcomeText.setOrigin(0.5);
    welcomeText.setDepth(1000);
    
    // Create Explorer button
    const explorerButton = this.add.rectangle(
      width / 2,
      height / 2 - 20,
      200,
      40,
      0x333333
    );
    explorerButton.setScrollFactor(0);
    explorerButton.setInteractive({ useHandCursor: true });
    explorerButton.setDepth(1000);
    
    const explorerText = this.add.text(
      width / 2,
      height / 2 - 20,
      "Explorer",
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }
    );
    explorerText.setScrollFactor(0);
    explorerText.setOrigin(0.5);
    explorerText.setDepth(1001); // Even higher to ensure text is above its button
    
    // Create Playground button
    const playgroundButton = this.add.rectangle(
      width / 2,
      height / 2 + 40,
      200,
      40,
      0x333333
    );
    playgroundButton.setScrollFactor(0);
    playgroundButton.setInteractive({ useHandCursor: true });
    playgroundButton.setDepth(1000);
    
    const playgroundText = this.add.text(
      width / 2,
      height / 2 + 40,
      "Playground",
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }
    );
    playgroundText.setScrollFactor(0);
    playgroundText.setOrigin(0.5);
    playgroundText.setDepth(1001);
    
    // Create Continue button
    const continueButton = this.add.rectangle(
      width / 2,
      height / 2 + 110,
      200,
      40,
      0x004400
    );
    continueButton.setScrollFactor(0);
    continueButton.setInteractive({ useHandCursor: true });
    continueButton.setDepth(1000);
    
    const continueText = this.add.text(
      width / 2,
      height / 2 + 110,
      "Continue",
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }
    );
    continueText.setScrollFactor(0);
    continueText.setOrigin(0.5);
    continueText.setDepth(1001);
    
    // Group all dialogue elements
    const terminalElements = this.add.group([
      terminalBackground, headerBar, terminalTitle, welcomeText,
      explorerButton, explorerText, playgroundButton, playgroundText,
      continueButton, continueText
    ]);
    
    // Handle Explorer button click
    explorerButton.on('pointerover', () => {
      explorerButton.setFillStyle(0x555555);
    });
    
    explorerButton.on('pointerout', () => {
      explorerButton.setFillStyle(0x333333);
    });
    
    explorerButton.on('pointerdown', () => {
      // Show a message that this would launch Explorer in a full implementation
      const responseText = this.add.text(
        width / 2,
        height / 2 - 130,
        "Explorer would open in a browser window\n(External URL will be added later)",
        {
          fontSize: '14px',
          color: '#ffff00',
          fontFamily: 'monospace',
          align: 'center'
        }
      );
      responseText.setScrollFactor(0);
      responseText.setOrigin(0.5);
      responseText.setDepth(1001);
      
      // Add to terminal elements group for cleanup
      terminalElements.add(responseText);
      
      // Remove after 3 seconds
      this.time.delayedCall(3000, () => {
        responseText.destroy();
      });
    });
    
    // Handle Playground button click
    playgroundButton.on('pointerover', () => {
      playgroundButton.setFillStyle(0x555555);
    });
    
    playgroundButton.on('pointerout', () => {
      playgroundButton.setFillStyle(0x333333);
    });
    
    playgroundButton.on('pointerdown', () => {
      // Show a message that this would launch Playground in a full implementation
      const responseText = this.add.text(
        width / 2,
        height / 2 - 130,
        "Playground would open in a browser window\n(External URL will be added later)",
        {
          fontSize: '14px',
          color: '#ffff00',
          fontFamily: 'monospace',
          align: 'center'
        }
      );
      responseText.setScrollFactor(0);
      responseText.setOrigin(0.5);
      responseText.setDepth(1001);
      
      // Add to terminal elements group for cleanup
      terminalElements.add(responseText);
      
      // Remove after 3 seconds
      this.time.delayedCall(3000, () => {
        responseText.destroy();
      });
    });
    
    // Handle Continue button click
    continueButton.on('pointerover', () => {
      continueButton.setFillStyle(0x006600);
    });
    
    continueButton.on('pointerout', () => {
      continueButton.setFillStyle(0x004400);
    });
    
    continueButton.on('pointerdown', () => {
      // Destroy the terminal interface
      terminalElements.destroy(true);
      
      // Now open the concrete door
      this.openConcreteDoor();
    });
    
    // Add keyboard support for ESC key to close the terminal
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    if (escKey) {
      escKey.once('down', () => {
        terminalElements.destroy(true);
        this.input.keyboard?.removeKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      });
    }
  }
  
  /**
   * Open the concrete door after interacting with big-screens
   */
  openConcreteDoor() {
    if (!this.concreteDoor || this.doorActive) return;
    this.doorActive = true;
    
    // Display a message about the door opening
    // const width = this.cameras.main.width;
    // const height = this.cameras.main.height;
    // const doorMsg = this.add.text(
    //   width / 2,
    //   height / 2,
    //   "The concrete door is opening!",
    //   {
    //     fontSize: '18px',
    //     color: '#FFFFFF',
    //     backgroundColor: '#00000080',
    //     padding: { x: 20, y: 10 },
    //     align: 'center'
    //   }
    // ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Play the door opening animation
    this.concreteDoor.play('concrete-door-open');
    
    // When the animation completes, disable the collision
    this.concreteDoor.once('animationcomplete', () => {
      console.log('Door animation completed, disabling collision');
      
      // Properly disable the physics body to allow player to pass through
      if (this.concreteDoor) {
        const doorBody = this.concreteDoor.body as Phaser.Physics.Arcade.Body;
        if (doorBody) {
          doorBody.enable = false; // Completely disable physics body
          
          // Set a debug message to verify it worked
          console.log('Door physics disabled:', doorBody.enable);
        }
      }
      
      // Add a subtle particle effect for emphasis
      if (this.concreteDoor) {
        this.addDoorOpeningEffect(this.concreteDoor.x, this.concreteDoor.y);
      }
      
      // Remove the message after a brief delay
      // this.time.delayedCall(1000, () => {
      //   doorMsg.destroy();
      // });
    });
  }
  
  /**
   * Add a particle effect when the door opens
   */
  addDoorOpeningEffect(x: number, y: number) {
    // Create a particle emitter for the door opening effect
    const particles = this.add.particles(x, y, 'concrete-door', {
      frame: 0,
      quantity: 10,
      lifespan: 800,
      scale: { start: 0.1, end: 0 },
      speed: { min: 30, max: 60 },
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });
    
    // Emit a burst of particles
    particles.explode(10);
    
    // Clean up after particles are done
    this.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  /**
   * Add the concrete door in the passage between rooms (closed by default)
   */
  addConcreteDoor() {
    const tileSize = 48;
    const doorX = 10 * tileSize;
    const doorY = 8.5 * tileSize;
    
    // Create the concrete door sprite with proper physics
    this.concreteDoor = this.physics.add.sprite(doorX, doorY, 'concrete-door');
    this.concreteDoor.setDisplaySize(24, 144);
    
    // Set the door to show the first frame (closed position)
    this.concreteDoor.setFrame(0);
    
    // Setup physics body properly for collision
    const doorBody = this.concreteDoor.body as Phaser.Physics.Arcade.Body;
    if (doorBody) {
      doorBody.immovable = true;
      doorBody.setSize(24, 144); // Ensure hitbox matches visual size
      doorBody.enable = true; // Make sure physics are enabled
      doorBody.allowGravity = false;
    }
    
    this.concreteDoor.setDepth(10);
    
    // Create the door opening animation if it doesn't exist
    if (!this.anims.exists('concrete-door-open')) {
      this.anims.create({
        key: 'concrete-door-open',
        frames: this.anims.generateFrameNumbers('concrete-door', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0 // Play once
      });
    }

    // Add collision with player - should work now that player exists
    if (this.player && this.concreteDoor) {
      console.log('Setting up concrete door collision with player');
      this.physics.add.collider(
        this.player.sprite, 
        this.concreteDoor,
        undefined,
        () => !this.doorActive, // Only collide when door is not active/open
        this
      );
    } else {
      console.error('Could not set up door collision - player or door missing');
    }
  }

  update() {
    if (!this.player || !this.cursors) return;
    
    // Update player movement and animations
    this.player.update(this.cursors);
    
    // Check for nearby interactive objects
    this.checkInteractiveObjects();
    
    // Check if player walks through the exit gate
    this.checkPlayerExitGate();
  }

  /**
   * Clean up any game objects when the scene shuts down
   */
  shutdown() {
    // Player cleanup
    if (this.player && this.player.sprite) {
      this.player.sprite.destroy();
    }
    
    // Clean up all indicators
    this.interactionIndicators.forEach(indicator => {
      if (indicator) {
        indicator.destroy();
      }
    });
    this.interactionIndicators.clear();
    
    // Clear interactive objects array
    this.interactiveObjects = [];
    
    // Remove keyboard events
    const keyboard = this.input?.keyboard;
    if (keyboard) {
      keyboard.off('keydown-SPACE');
      keyboard.off('keydown-E');
    }
  }

  /**
   * Initialize keyboard controls
   */
  setupControls() {
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      
      // Set up interaction key (E or SPACE)
      this.input.keyboard.on('keydown-E', () => {
        this.handleInteraction();
      });
      
      this.input.keyboard.on('keydown-SPACE', () => {
        this.handleInteraction();
      });
    }
  }

  /**
   * Handle interaction with nearby objects
   */
  handleInteraction() {
    if (this.nearbyObject) {
      const onInteract = this.nearbyObject.getData('onInteract');
      if (onInteract) {
        onInteract();
      }
    }
  }
} 
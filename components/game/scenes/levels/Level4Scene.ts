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
  private interactionIndicator?: Phaser.GameObjects.Sprite;
  private nearbyObject?: Phaser.GameObjects.GameObject;
  private keycard?: Phaser.GameObjects.Sprite;
  private hasKeycard: boolean = false;
  private exitGate?: Phaser.Physics.Arcade.Sprite;
  private concreteDoor?: Phaser.GameObjects.Sprite;
  private doorActive: boolean = false;

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
      this.load.image('concrete-door', '/assets/sprites/concrete-door.png');
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
      // Add the concrete door in the gap between rooms by default
      this.addConcreteDoor();
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
    // Position the keycard in the left room
    const tileSize = 48;
    const keycardX = 7.5 * tileSize;
    const keycardY = 3.5 * tileSize;
    
    console.log('Creating keycard at:', keycardX, keycardY);
    
    // Create a sprite for the keycard
    this.keycard = this.add.sprite(keycardX, keycardY, 'backwall-keycard');
    
    // Make it semi-visible to show interaction area
    this.keycard.setAlpha(0);
    
    // Add a subtle glow effect
    const glowGraphics = this.add.graphics();
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
    
    // Add interactive behavior
    this.keycard.setData('interactive', true);
    this.keycard.setData('onInteract', () => {
      this.collectKeycard();
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(this.keycard);
  }
  
  /**
   * Player collects the keycard
   */
  collectKeycard() {
    if (this.hasKeycard) return;
    
    this.hasKeycard = true;
    console.log('Keycard collected!');
    
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
    
    // Show collection message
    const keycardText = this.add.text(
      width / 2,
      height / 2,
      "Keycard collected!",
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
        }
      });
    }
    
    // Once the keycard is collected, unlock the exit gate
    if (this.exitGate) {
      this.unlockExitGate();
    }
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
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const gateText = this.add.text(
      width / 2,
      height / 2,
      "The exit gate has opened!",
      {
        fontSize: '18px',
        color: '#FFFFFF',
        backgroundColor: '#00000080',
        padding: { x: 20, y: 10 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Add a particle effect for emphasis
    this.addGateOpeningEffect(this.exitGate.x, this.exitGate.y);
    
    // Remove text after a few seconds
    this.time.delayedCall(3000, () => {
      gateText.destroy();
    });
    
    // Add a trigger zone after the gate to transition to the next level
    this.createExitTriggerZone();
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
      // Go back to the main scene or to level 5 if it exists
      this.scene.start('MainScene');
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
    if (this.interactionIndicator) {
      this.interactionIndicator.setVisible(false);
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
   * Add furniture to the level
   */
  addFurniture() {
    const tileSize = 48;
    const deskX = 13.5 * tileSize;
    const deskY = 4 * tileSize;
    const bigDesk = this.add.image(deskX, deskY, 'big-desk');
    bigDesk.setDepth(5);
    const screensX = deskX;
    const screensY = deskY - (tileSize * 1.6);
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

    console.log('Added furniture to right room:', { deskX, deskY, screensX, screensY, areaX, areaY, areaWidth, areaHeight });
  }

  addGuard() {
    const tileSize = 48;
    const guardX = 1.5 * tileSize;
    const guardY = 10 * tileSize;

    const guard = this.add.image(guardX, guardY, 'guard-l1');
    guard.setDepth(5);
  }

  /**
   * Add the concrete door in the passage between rooms (always visible)
   */
  addConcreteDoor() {
    const tileSize = 48;
    const doorX = 10 * tileSize;
    const doorY = 8.5 * tileSize;
    this.concreteDoor = this.physics.add.sprite(doorX, doorY, 'concrete-door');
    this.concreteDoor.setDisplaySize(62, 144);
    const doorBody = this.concreteDoor.body as Phaser.Physics.Arcade.Body | undefined;
    if (doorBody) {
      doorBody.immovable = true;
    }
    this.concreteDoor.setDepth(10);
    if (this.player) {
      this.physics.add.collider(this.player.sprite, this.concreteDoor);
    }
  }

  /**
   * Show a message when interacting with the big-screens
   */
  showScreensMessage() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const msg = this.add.text(
      width / 2,
      height / 2,
      "You see a wall of screens displaying cryptic code...",
      {
        fontSize: '18px',
        color: '#FFFFFF',
        backgroundColor: '#00000080',
        padding: { x: 20, y: 10 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.time.delayedCall(2500, () => {
      msg.destroy();
    });
  }

  update() {
    if (!this.player || !this.cursors) return;
    
    // Update player movement and animations
    this.player.update(this.cursors);
    
    // Check for nearby interactive objects
    this.checkInteractiveObjects();
  }
} 
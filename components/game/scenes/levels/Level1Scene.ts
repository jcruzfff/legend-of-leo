'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadAsepriteSheet, createAnimationsFromAseprite } from '@/lib/utils/aseprite';
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
  private nearbyObject?: Phaser.GameObjects.GameObject;
  private guardNPC?: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: 'Level1Scene' });
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
    this.load.image('left-wall', '/assets/maps/left-wall-level-one.png');
    this.load.image('right-wall', '/assets/maps/right-wall-level-one.png');
    
    // Load game level assets
    this.load.image('guard', '/assets/maps/guard-l1.png');
    this.load.image('computer', '/assets/maps/computer-l1.png');
    this.load.image('tower', '/assets/maps/tower-l1.png');
    this.load.image('couch', '/assets/maps/couch-l1.png');
    
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
    
    // Load the tilemap
    try {
      console.log('Loading level1 tilemap...');
      const { map, layers } = loadTilemap(
        this,
        'level1',
        ['Floor', 'Walls', 'Objects'],
        ['Walls']
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
      console.error('Failed to load level1 tilemap:', error);
      // Fall back to creating a programmatic level
      this.createLevel();
    }
    
    // Create player at starting position for level1
    const startX = 48 * 7; // Center of the floor horizontally
    const startY = 48 * 8; // Near the bottom of the map
    this.player = new Player(this, startX, startY);
    
    // Add collision with walls
    if (this.player && this.layers) {
      addCollision(this, this.player.sprite, this.layers, ['Walls']);
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
    
    // Create the guard NPC at the doorway - now using map data
    this.createNPCs();
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
    for (let x = 9; x < 12; x++) {
      for (let y = 3; y < 5; y++) {
        // Add computer or desk tiles
        // For now, we'll just mark these tiles for visual reference
        floorLayer.putTileAt(1, x, y);
      }
    }
    
    // Set collision for wall layer
    wallsLayer.setCollisionByExclusion([-1]);
  }
  
  /**
   * Extract NPCs from the Objects layer and make them interactive
   */
  createNPCs() {
    // If we have a valid map and Objects layer
    if (this.map && this.layers && this.layers['Objects']) {
      // Find guard tiles in the Objects layer
      const objectsLayer = this.layers['Objects'];
      
      // Find tiles with the guard tile ID (firstgid + 3 for guard in tileset)
      const guardTileId = 4; // Based on our tilemap JSON
      
      // Get all guard tiles
      const guardTiles = objectsLayer.filterTiles(tile => tile.index === guardTileId);
      
      guardTiles.forEach(tile => {
        // Convert tile position to world coordinates
        const x = tile.pixelX + (tile.width / 2);
        const y = tile.pixelY + (tile.height / 2);
        
        // Clear the tile from the map to avoid duplicates
        objectsLayer.removeTileAt(tile.x, tile.y);
        
        // Create guard NPC at this position
        this.guardNPC = this.add.sprite(x, y, 'guard');
        
        // Make the guard interactive
        this.guardNPC.setData('interactive', true);
        this.guardNPC.setData('onInteract', () => {
          this.showGuardDialogue();
        });
        
        // Add to interactive objects array
        this.interactiveObjects.push(this.guardNPC);
      });
      
      console.log(`Created ${guardTiles.length} guard NPCs from tilemap`);
      
      // If no guards were found in the map, create one at the default position
      if (guardTiles.length === 0) {
        this.createGuardNPC();
      }
    } else {
      // Fallback to creating the guard at a hard-coded position
      this.createGuardNPC();
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
      height - 100,
      width - 100,
      120,
      0x000000,
      0.7
    );
    dialogueBox.setScrollFactor(0);
    dialogueBox.setOrigin(0.5);
    dialogueBox.setStrokeStyle(2, 0xFFFFFF);
    
    const message = "Halt! You can't leave until you understand what's at stake.\nYour digital identity has been compromised. Do you understand\nthe importance of privacy in the digital world?";
    
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
    
    // Handle continue button click
    continueButton.on('pointerdown', () => {
      // For now, just destroy the dialogue
      // Later this will trigger the quiz/learning interaction
      dialogueGroup.destroy(true);
    });
  }
  
  /**
   * Check if any interactive objects are in range and show indicators
   */
  checkInteractiveObjects() {
    if (!this.player) return;
    
    // Check if player is near the door/exit area at the top of the map
    if (this.player.sprite.y < 48 * 3 && 
        this.player.sprite.x > 5 * 48 && 
        this.player.sprite.x < 8 * 48) {
      // Player reached the exit door area at the top of the level
      console.log('Player reached the exit door');
      
      // Show completion message
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      const message = "You completed Level 1! You now understand the importance of privacy.";
      
      const text = this.add.text(
        width / 2,
        height / 2,
        message,
        {
          fontSize: '20px',
          color: '#FFFFFF',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 },
          align: 'center'
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
      
      // Remove text after a few seconds
      this.time.delayedCall(3000, () => {
        text.destroy();
      });
      
      // Move player back down to prevent continuous triggering
      this.player.sprite.y += 48;
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
        this.interactionIndicator.setTexture('interaction-indicator');
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
    // Otherwise just move it to the new position
    else {
      this.interactionIndicator.setVisible(true);
      this.interactionIndicator.setPosition(x, y);
    }
    
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
   * Create the guard NPC at the doorway (fallback method if not defined in tilemap)
   */
  createGuardNPC() {
    // Position the guard near the exit at the top
    const doorX = 48 * 6;
    const doorY = 48 * 1; // Near the top exit
    
    // Create a placeholder NPC
    this.guardNPC = this.add.sprite(doorX, doorY, 'guard');
    
    // Make the guard interactive
    this.guardNPC.setData('interactive', true);
    this.guardNPC.setData('onInteract', () => {
      this.showGuardDialogue();
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(this.guardNPC);
    
    console.log('Created fallback guard NPC');
  }

  update() {
    if (!this.player || !this.cursors) return;
    
    // Update player movement and animations
    this.player.update(this.cursors);
    
    // Check for nearby interactive objects
    this.checkInteractiveObjects();
  }
} 
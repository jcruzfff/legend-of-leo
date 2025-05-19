'use client';

import { Scene } from 'phaser';
import Player from '@/lib/classes/Player';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';

// Define interfaces for the types
interface BuildingData {
  furniture?: FurnitureItem[];
  collisionAreas?: CollisionArea[];
  [key: string]: unknown;
}

interface FurnitureItem {
  x: number;
  y: number;
  texture: string;
  scale?: number;
  isInteractive?: boolean;
  interactionMessage?: string;
  [key: string]: unknown;
}

interface CollisionArea {
  x: number;
  y: number;
  color?: string;
  isInteractive?: boolean;
  interactionMessage?: string;
  [key: string]: unknown;
}

interface TiledObjectProperty {
  name: string;
  value: string | number | boolean;
  type: string;
}

interface Tileset {
  columns: number;
  firstgid: number;
  image: string;
  imageheight: number;
  imagewidth: number;
  margin: number;
  name: string;
  spacing: number;
  tilecount: number;
  tileheight: number;
  tilewidth: number;
}

export default class SecondBuildingScene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private exitPoints: Map<string, Phaser.GameObjects.Zone> = new Map();
  private interactionIndicators: Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Sprite> = new Map();
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private entryDoor: string = 'main'; // Default door
  private exitPrompt?: Phaser.GameObjects.Text;
  private playerInExitZone: boolean = false;
  private currentExitDoor: string = '';
  private exitTimer: Phaser.Time.TimerEvent | null = null;
  private buildingData?: BuildingData;
  private map?: Phaser.Tilemaps.Tilemap;
  private layers?: MapLayers;
  private dialogueBox?: Phaser.GameObjects.Container;
  
  constructor() {
    super({ key: 'SecondBuildingScene' });
  }
  
  init() {
    // Store current scene in localStorage for development mode reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentScene', this.scene.key);
      console.log('Current scene saved:', this.scene.key);
    }

    // Get entry data
    const data = this.scene.settings.data as {
      fromLevel5?: boolean;
      playerData?: Record<string, unknown>;
      entryDoor?: string;
    } | undefined;
    
    // Reset states
    this.playerInExitZone = false;
    this.exitTimer = null;
    
    // Set the entry door based on data
    if (data && data.entryDoor) {
      this.entryDoor = data.entryDoor;
    }
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
        frameWidth: 48,
        frameHeight: 66,
        spacing: 0,
        margin: 0
      });
    }
    
    // Create gray brick texture first, so it can be used immediately
    this.createGrayBrickTexture();
    
    // Load custom textures for this building
    const texturesToLoad = [
      'floor',
      'wall',
      'arcane-leftcouch',
      'arcane-lockers',
      'arcane-rightcouch',
      'arcane-snacks',
      'arcane-backwall',
      'arcane-bartable',
      'arcane-cashier'
    ];
    
    texturesToLoad.forEach(texture => {
      if (!textureCheck(texture)) {
        this.load.image(texture, `/assets/maps/${texture}.png`);
      }
    });
    
    // We don't need to load border textures anymore since we'll use our custom gray-brick
    // for all border elements
    
    // Create the interaction indicator texture if it doesn't exist
    if (!textureCheck('interaction-indicator')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      
      // Draw a small white dot with a glow effect
      graphics.fillStyle(0xFFFFFF, 0.8);
      graphics.fillCircle(16, 16, 4);
      
      // Add a subtle glow/halo
      graphics.fillStyle(0xFFFFFF, 0.3);
      graphics.fillCircle(16, 16, 8);
      
      graphics.generateTexture('interaction-indicator', 32, 32);
      console.log('Created interaction indicator texture');
    }
    
    // Load the tilemap
    this.load.tilemapTiledJSON('second-building-tilemap', '/assets/maps/buildings/second-building-tilemap.json');
    
    // Also load the original building data for fallback
    this.load.json('second-building-data', '/assets/maps/buildings/second-building.json');
  }
  
  /**
   * Create a gray brick texture for the walls
   */
  createGrayBrickTexture() {
    if (this.textures.exists('gray-brick')) {
      return;
    }
    
    // Create a canvas texture for the gray brick
    const size = 48;
    const brickCanvas = this.textures.createCanvas('gray-brick', size, size);
    const ctx = brickCanvas?.getContext();
    
    if (!brickCanvas || !ctx) return;
    
    // Base color (dark gray)
    ctx.fillStyle = '#444444';
    ctx.fillRect(0, 0, size, size);
    
    // Brick pattern (slightly lighter gray)
    ctx.fillStyle = '#555555';
    
    // Horizontal lines
    for (let y = 8; y < size; y += 16) {
      ctx.fillRect(0, y, size, 1);
    }
    
    // Vertical lines (offset every other row)
    for (let x = 0; x < size; x += 16) {
      ctx.fillRect(x, 0, 1, 8);
      ctx.fillRect(x + 8, 8, 1, 8);
      ctx.fillRect(x, 16, 1, 8);
      ctx.fillRect(x + 8, 24, 1, 8);
      ctx.fillRect(x, 32, 1, 8);
      ctx.fillRect(x + 8, 40, 1, 8);
    }
    
    // Add some subtle texture with slightly different colors for bricks
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 16) {
        // Skip some cells for variety
        if (Math.random() < 0.3) continue;
        
        const shade = Math.floor(Math.random() * 32);
        ctx.fillStyle = `rgb(${80 + shade}, ${80 + shade}, ${80 + shade})`;
        ctx.fillRect(x + 1, y + 1, 14, 14);
      }
    }
    
    // Update the canvas texture
    brickCanvas.refresh();
    console.log('Created gray brick texture');
    
    // Save the texture as a PNG file (only in development mode)
    if (process.env.NODE_ENV === 'development') {
      try {
        // Convert the canvas to a data URL and extract the base64 data
        const dataURL = brickCanvas.canvas.toDataURL('image/png');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
        
        // Create a link element to trigger a download
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'gray-brick.png';
        
        // Append to the document, click to trigger download, then remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Saved gray-brick texture to downloads. Move it to your assets folder.');
      } catch (error) {
        console.error('Failed to save texture:', error);
      }
    }
    
    // Create custom border textures using the gray brick
    this.createCustomBorderTextures();
  }
  
  /**
   * Create custom border textures using the gray brick texture
   */
  createCustomBorderTextures() {
    const size = 48;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const borderTextureNames = [
      'custom-top-border',
      'custom-left-border',
      'custom-right-border',
      'custom-bottom-border',
      'custom-left-t-corner-border',
      'custom-right-t-corner-border',
      'custom-left-b-edge-corner',
      'custom-right-b-edge-corner',
    ];
    
    // Check if textures already exist
    if (this.textures.exists('custom-top-border')) {
      console.log('Custom border textures already exist');
      return;
    }
    
    // Create top border
    const topBorderCanvas = this.textures.createCanvas('custom-top-border', size, size);
    const topCtx = topBorderCanvas?.getContext();
    if (topBorderCanvas && topCtx) {
      // Base is gray brick
      topCtx.drawImage(this.textures.get('gray-brick').source[0].image as HTMLImageElement, 0, 0);
      // Add edge detail
      topCtx.fillStyle = '#333333';
      topCtx.fillRect(0, 0, size, 4);
      topBorderCanvas.refresh();
    }
    
    // Create bottom border
    const bottomBorderCanvas = this.textures.createCanvas('custom-bottom-border', size, size);
    const bottomCtx = bottomBorderCanvas?.getContext();
    if (bottomBorderCanvas && bottomCtx) {
      // Base is gray brick
      bottomCtx.drawImage(this.textures.get('gray-brick').source[0].image as HTMLImageElement, 0, 0);
      // Add edge detail
      bottomCtx.fillStyle = '#333333';
      bottomCtx.fillRect(0, size - 4, size, 4);
      bottomBorderCanvas.refresh();
    }
    
    // Create left border
    const leftBorderCanvas = this.textures.createCanvas('custom-left-border', size, size);
    const leftCtx = leftBorderCanvas?.getContext();
    if (leftBorderCanvas && leftCtx) {
      // Base is gray brick
      leftCtx.drawImage(this.textures.get('gray-brick').source[0].image as HTMLImageElement, 0, 0);
      // Add edge detail
      leftCtx.fillStyle = '#333333';
      leftCtx.fillRect(0, 0, 4, size);
      leftBorderCanvas.refresh();
    }
    
    // Create right border
    const rightBorderCanvas = this.textures.createCanvas('custom-right-border', size, size);
    const rightCtx = rightBorderCanvas?.getContext();
    if (rightBorderCanvas && rightCtx) {
      // Base is gray brick
      rightCtx.drawImage(this.textures.get('gray-brick').source[0].image as HTMLImageElement, 0, 0);
      // Add edge detail
      rightCtx.fillStyle = '#333333';
      rightCtx.fillRect(size - 4, 0, 4, size);
      rightBorderCanvas.refresh();
    }
    
    // Create left-t-corner-border (with darkened top and left edges)
    const leftTCornerCanvas = this.textures.createCanvas('custom-left-t-corner-border', size, size);
    const leftTCornerCtx = leftTCornerCanvas?.getContext();
    if (leftTCornerCanvas && leftTCornerCtx) {
      // Base is gray brick
      leftTCornerCtx.drawImage(this.textures.get('gray-brick').source[0].image as HTMLImageElement, 0, 0);
      // Add edge details
      leftTCornerCtx.fillStyle = '#333333';
      leftTCornerCtx.fillRect(0, 0, 4, size); // left edge
      leftTCornerCtx.fillRect(0, size - 4, size, 4); // bottom edge
      leftTCornerCanvas.refresh();
    }
    
    // Create right-t-corner-border (with darkened top and right edges)
    const rightTCornerCanvas = this.textures.createCanvas('custom-right-t-corner-border', size, size);
    const rightTCornerCtx = rightTCornerCanvas?.getContext();
    if (rightTCornerCanvas && rightTCornerCtx) {
      // Base is gray brick
      rightTCornerCtx.drawImage(this.textures.get('gray-brick').source[0].image as HTMLImageElement, 0, 0);
      // Add edge details
      rightTCornerCtx.fillStyle = '#333333';
      rightTCornerCtx.fillRect(size - 4, 0, 4, size); // right edge
      rightTCornerCtx.fillRect(0, size - 4, size, 4); // bottom edge
      rightTCornerCanvas.refresh();
    }
    
    // Create left-b-edge-corner
    const leftBEdgeCanvas = this.textures.createCanvas('custom-left-b-edge-corner', size, size);
    const leftBEdgeCtx = leftBEdgeCanvas?.getContext();
    if (leftBEdgeCanvas && leftBEdgeCtx) {
      // Base is gray brick
      leftBEdgeCtx.drawImage(this.textures.get('gray-brick').source[0].image as HTMLImageElement, 0, 0);
      // Add edge details
      leftBEdgeCtx.fillStyle = '#333333';
      leftBEdgeCtx.fillRect(0, 0, size, 4); // top edge
      leftBEdgeCtx.fillRect(size - 4, 0, 4, size); // right edge
      leftBEdgeCanvas.refresh();
    }
    
    // Create right-b-edge-corner
    const rightBEdgeCanvas = this.textures.createCanvas('custom-right-b-edge-corner', size, size);
    const rightBEdgeCtx = rightBEdgeCanvas?.getContext();
    if (rightBEdgeCanvas && rightBEdgeCtx) {
      // Base is gray brick
      rightBEdgeCtx.drawImage(this.textures.get('gray-brick').source[0].image as HTMLImageElement, 0, 0);
      // Add edge details
      rightBEdgeCtx.fillStyle = '#333333';
      rightBEdgeCtx.fillRect(0, 0, size, 4); // top edge
      rightBEdgeCtx.fillRect(0, 0, 4, size); // left edge
      rightBEdgeCanvas.refresh();
    }
    
    console.log('Created custom border textures based on gray-brick');
  }
  
  create() {
    // Get entry data
    const data = this.scene.settings.data as {
      fromLevel5?: boolean;
      playerData?: Record<string, unknown>;
      entryDoor?: string;
    } | undefined;
    
    console.log('Second Building Scene created with data:', data);
    
    // Set the entry door based on data
    if (data && data.entryDoor) {
      this.entryDoor = data.entryDoor;
    }
    
    // Set background color
    this.cameras.main.setBackgroundColor('#2A2A2A');
    
    // Get the building JSON data for fallback
    this.buildingData = this.cache.json.get('second-building-data');
    
    // Before loading the tilemap, replace the border textures with our custom ones
    this.replaceMapTilesWithCustomTextures();
    
    // Load the tilemap using the utility function
    try {
      const { map, layers } = loadTilemap(
        this,
        'second-building-tilemap',
        ['Floor', 'Objects', 'Furniture', 'Backwall', 'Collision'],
        ['Collision'] // Only use the Collision layer for collisions
      );
      
      this.map = map;
      this.layers = layers;
      
      console.log('Second building tilemap loaded successfully');
      
      // Set world bounds based on the map dimensions
      if (this.map) {
        const mapWidth = this.map.widthInPixels;
        const mapHeight = this.map.heightInPixels;
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
        console.log(`Map dimensions: ${mapWidth}x${mapHeight}`);
      }
    } catch (error) {
      console.error('Failed to load tilemap:', error);
      // Fallback to old method if tilemap fails
      this.createRoom();
    }
    
    // Add player at the appropriate entry point
    // Default is center bottom
    const entryX = 400;
    const entryY = 500; // Moved up further from exit zone for better gameplay
    
    this.player = new Player(this, entryX, entryY);
    
    // Make the player face up from the entrance
    if (this.player.sprite && this.player.sprite.anims) {
      this.player.sprite.anims.play('player-idle-up', true);
    }
    
    // Add collision with the Collision layer if using the tilemap approach
    if (this.player && this.layers) {
      addCollision(this, this.player.sprite, this.layers, ['Collision']);
    }
    
    // Create interactive objects from the tilemap objects layer
    if (this.map) {
      this.createInteractiveObjectsFromTilemap();
    } else {
      // Create exit points that match the entry doors (fallback)
      this.createExitPoints();
      
      // Create interactive objects from the original JSON data (fallback)
      if (this.buildingData) {
        this.loadInteractiveElements();
      }
    }
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    
    // Set up input
    this.cursors = this.input.keyboard?.createCursorKeys();
    
    // Add spacebar for interactions
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.interactWithNearbyObject();
    });
    
    // Disable the pink debug indicators
    this.disableDebugVisuals();
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }
  
  /**
   * Replace map tileset textures with our custom textures
   */
  replaceMapTilesWithCustomTextures() {
    // If we loaded the tilemap, update its tilesets
    const map = this.cache.tilemap.get('second-building-tilemap');
    if (!map || !map.data) {
      console.warn('Tilemap data not found in cache, cannot replace textures');
      return;
    }
    
    // If we already have a gray-brick tileset in the map, we don't need to replace anything
    const hasBrickTileset = map.data.tilesets.some((tileset: Tileset) => tileset.name === 'gray-brick');
    if (hasBrickTileset) {
      console.log('Map already has gray-brick tileset, no texture replacement needed');
      return;
    }
    
    // For the createRoom fallback method
    if (!this.textures.exists('gray-brick')) {
      console.warn('Gray brick texture not found');
      return;
    }
    
    console.log('Using custom gray-brick texture for borders in createRoom method');
  }
  
  /**
   * Disable debug visuals like collision indicators
   */
  disableDebugVisuals() {
    // Find and hide all pink debug rectangles (they appear in Zones)
    this.children.list.forEach(child => {
      // Is it a Zone debugging rectangle?
      if (child instanceof Phaser.GameObjects.Rectangle && 
          child.fillColor === 0xff00ff) {
        // Turn off visibility to hide debug visuals
        child.setVisible(false);
      }
      
      // Some debug graphics may not be rectangles but have this color
      if (child instanceof Phaser.GameObjects.Graphics) {
        child.setVisible(false);
      }
    });
  }
  
  /**
   * Extract interactive objects from tilemap
   */
  createInteractiveObjectsFromTilemap() {
    if (!this.map) return;
    
    // Get the objects layer
    const objectsLayer = this.map.getObjectLayer('InteractiveObjects');
    if (!objectsLayer) {
      console.warn('No InteractiveObjects layer found in tilemap');
      
      // Create exit points since we won't get them from the tilemap
      this.createExitPoints();
      return;
    }
    
    // Process each object
    objectsLayer.objects.forEach((object) => {
      const x = object.x || 0;
      const y = object.y || 0;
      const properties: Record<string, string | number | boolean> = {};
      
      // Convert properties array to an object for easier access
      if (object.properties) {
        object.properties.forEach((prop: TiledObjectProperty) => {
          properties[prop.name] = prop.value;
        });
      }
      
      // Handle different object types
      switch (object.type) {
        case 'cashier':
          this.createCashierWithExtendedZone({
            x: x,
            y: y,
            texture: object.name || 'arcane-cashier',
            scale: (properties['scale'] as number) || 1
          });
          break;
          
        case 'exit':
          const doorId = (properties['doorId'] as string) || 'main';
          this.createExitPoint(doorId, x, y);
          break;
          
        case 'furniture':
          if (properties['isInteractive']) {
            this.createInteractiveObject({
              x: x,
              y: y,
              texture: object.name || 'arcane-furniture',
              scale: (properties['scale'] as number) || 1,
              interactionMessage: (properties['interactionMessage'] as string) || 'An interesting piece of furniture.'
            });
          }
          break;
      }
    });
  }
  
  /**
   * Create a cashier with extended interaction zone
   */
  createCashierWithExtendedZone({
    x,
    y,
    texture,
    scale = 1
  }: {
    x: number;
    y: number;
    texture: string;
    scale?: number;
  }) {
    if (!this.textures.exists(texture)) {
      console.warn(`Texture ${texture} not found, using default cashier texture`);
      texture = 'arcane-cashier'; // Fallback texture
    }
    
    // Create the cashier sprite
    const cashier = this.add.image(x, y, texture);
    cashier.setScale(scale);
    cashier.setDepth(8); // Above furniture but below player
    
    // Create an extended interaction zone (2 tiles down from the cashier)
    const zoneWidth = 96; // 2 tiles wide
    const zoneHeight = 144; // 3 tiles tall (extended downward)
    const zoneY = y + 48; // Shifted down to extend the zone below the cashier
    
    // Create a zone for the extended interaction area
    const interactionZone = this.add.zone(x, zoneY, zoneWidth, zoneHeight);
    
    // Make the interaction zone a physics object
    this.physics.world.enable(interactionZone);
    
    // Store interaction data on the zone
    interactionZone.setData('interactive', true);
    interactionZone.setData('onInteract', () => {
      this.showArcaneDialogue();
    });
    
    // Add to interactive objects
    this.interactiveObjects.push(interactionZone);
    
    // Create an interaction indicator for the zone
    this.createInteractionIndicator(interactionZone);
  }
  
  /**
   * Load interactive elements from JSON data (fallback method)
   */
  loadInteractiveElements() {
    if (!this.buildingData) return;
    
    // Load furniture items
    if (this.buildingData.furniture && Array.isArray(this.buildingData.furniture)) {
      this.buildingData.furniture.forEach(item => {
        if (item.isInteractive) {
          this.createInteractiveObject({
            x: item.x,
            y: item.y,
            texture: item.texture,
            scale: item.scale,
            interactionMessage: item.interactionMessage || 'An interesting object.'
          });
        }
      });
    }
    
    // Load collision areas
    if (this.buildingData.collisionAreas && Array.isArray(this.buildingData.collisionAreas)) {
      this.buildingData.collisionAreas.forEach(area => {
        if (area.isInteractive) {
          const interactiveZone = this.add.zone(area.x, area.y, 100, 100);
          interactiveZone.setData('onInteract', () => {
            this.showMessage(area.interactionMessage || 'An interesting area.');
          });
          
          // Add to physics engine for collision detection
          this.physics.world.enable(interactiveZone);
          
          // Add to interactive objects list
          this.interactiveObjects.push(interactiveZone);
        }
      });
    }
  }
  
  /**
   * Create an interactive object
   */
  createInteractiveObject({
    x,
    y,
    texture,
    scale = 1,
    interactionMessage
  }: {
    x: number;
    y: number;
    texture: string;
    scale?: number;
    interactionMessage: string;
  }) {
    if (!this.textures.exists(texture)) {
      console.warn(`Texture ${texture} not found, skipping interactive object`);
      return;
    }
    
    const object = this.add.image(x, y, texture);
    object.setScale(scale);
    
    // Make the object itself interactive by adding properties
    object.setData('onInteract', () => {
      this.showMessage(interactionMessage);
    });
    object.setData('interactive', true);
    
    // Add to interactive objects list
    this.interactiveObjects.push(object);
    
    // Create an interaction indicator
    this.createInteractionIndicator(object);
  }
  
  /**
   * Handle player interaction with nearby objects
   */
  interactWithNearbyObject() {
    if (!this.player) return;
    
    // Use the nearest interactive object stored on the player
    const nearbyObject = this.player.nearestInteractiveObject;
    
    if (nearbyObject) {
      // Execute the onInteract function if available
      const onInteract = nearbyObject.getData('onInteract');
      if (typeof onInteract === 'function') {
        onInteract();
      }
    }
  }
  
  /**
   * Create room using JSON data (fallback method)
   */
  createRoom() {
    if (!this.buildingData) {
      console.error('No building data available');
      return;
    }
    
    const roomWidth = 20;
    const roomHeight = 15;
    const tileSize = 48;
    
    // Create a simple physics groups for walls
    const walls = this.physics.add.staticGroup();
    
    // Create floor with custom texture
    const floor = this.add.tileSprite(
      tileSize * roomWidth / 2,
      tileSize * roomHeight / 2,
      tileSize * roomWidth,
      tileSize * roomHeight,
      'floor'
    );
    floor.setDepth(1);
    
    // Create walls around the perimeter using gray-brick instead of the old border textures
    for (let x = 0; x < roomWidth; x++) {
      for (let y = 0; y < roomHeight; y++) {
        // Top and bottom walls
        if (y === 0 || y === roomHeight - 1) {
          // Skip the exit at the bottom center
          if (y === roomHeight - 1 && x === Math.floor(roomWidth / 2)) {
            continue;
          }
          
          // Use appropriate border texture based on position
          let textureKey = 'gray-brick';
          
          // Use custom border textures if they exist
          if (this.textures.exists('custom-top-border') && y === 0) {
            textureKey = 'custom-top-border';
          } else if (this.textures.exists('custom-bottom-border') && y === roomHeight - 1) {
            textureKey = 'custom-bottom-border';
          }
          
          // Special corner cases
          if (x === 0 && y === 0 && this.textures.exists('custom-right-b-edge-corner')) {
            textureKey = 'custom-right-b-edge-corner';
          } else if (x === roomWidth - 1 && y === 0 && this.textures.exists('custom-left-b-edge-corner')) {
            textureKey = 'custom-left-b-edge-corner';
          } else if (x === 0 && y === roomHeight - 1 && this.textures.exists('custom-right-t-corner-border')) {
            textureKey = 'custom-right-t-corner-border';
          } else if (x === roomWidth - 1 && y === roomHeight - 1 && this.textures.exists('custom-left-t-corner-border')) {
            textureKey = 'custom-left-t-corner-border';
          }
          
          const wallTile = this.add.image(
            x * tileSize + tileSize / 2,
            y * tileSize + tileSize / 2,
            textureKey
          );
          wallTile.setDepth(5);
          walls.add(wallTile);
        }
        // Left and right walls
        else if (x === 0 || x === roomWidth - 1) {
          // Use appropriate border texture
          let textureKey = 'gray-brick';
          
          // Use custom border textures if they exist
          if (this.textures.exists('custom-left-border') && x === 0) {
            textureKey = 'custom-left-border';
          } else if (this.textures.exists('custom-right-border') && x === roomWidth - 1) {
            textureKey = 'custom-right-border';
          }
          
          const wallTile = this.add.image(
            x * tileSize + tileSize / 2,
            y * tileSize + tileSize / 2,
            textureKey
          );
          wallTile.setDepth(5);
          walls.add(wallTile);
        }
      }
    }
    
    // Add furniture items
    if (this.buildingData.furniture) {
      this.buildingData.furniture.forEach(item => {
        if (this.textures.exists(item.texture)) {
          const furniture = this.add.image(item.x, item.y, item.texture);
          
          if (item.scale) {
            furniture.setScale(item.scale);
          }
          
          // Add to interactive objects if needed
          if (item.isInteractive) {
            furniture.setData('interactive', true);
            furniture.setData('onInteract', () => {
              this.showMessage(item.interactionMessage || 'An interesting object.');
            });
            
            this.interactiveObjects.push(furniture);
          }
        }
      });
    }
    
    // Create exit points
    this.createExitPoints();
    
    // Enable collision with player
    if (this.player) {
      this.physics.add.collider(this.player.sprite, walls);
    }
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, roomWidth * tileSize, roomHeight * tileSize);
  }
  
  /**
   * Create exit points
   */
  createExitPoints() {
    // Create a single exit point in the center of the bottom of the map
    const mapWidth = this.map ? this.map.widthInPixels : 768; // Default width if no map
    const mapHeight = this.map ? this.map.heightInPixels : 720; // Default height if no map
    
    // Create the exit at the center bottom of the map
    const bottomY = mapHeight - 48; // 48 pixels from the bottom
    
    // Create a single exit at the bottom center
    this.createExitPoint('main', mapWidth / 2, bottomY);
  }
  
  /**
   * Create an exit point (door) that the player can use to leave the building
   */
  createExitPoint(doorId: string, x: number, y: number) {
    // Create a zone that will detect player overlap
    const zone = this.add.zone(x, y, 80, 60); // Smaller zone size for more precise detection
    
    // Enable physics for the zone
    this.physics.world.enable(zone);
    
    // Store the zone by its door ID
    this.exitPoints.set(doorId, zone);
    
    // Add debug visualization in dev mode
    if (process.env.NODE_ENV === 'development') {
      const graphics = this.add.graphics();
      graphics.lineStyle(2, 0xff0000, 0.5);
      graphics.strokeRect(
        zone.x - zone.width / 2,
        zone.y - zone.height / 2,
        zone.width,
        zone.height
      );
    }
  }
  
  /**
   * Show a prompt when player enters the exit zone
   */
  showExitPrompt() {
    // Remove existing prompt if it exists
    this.hideExitPrompt();
    
    // Create a new prompt
    this.exitPrompt = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 50,
      "Exiting building...",
      {
        fontSize: '20px',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold'
      }
    );
    this.exitPrompt.setOrigin(0.5);
    this.exitPrompt.setScrollFactor(0);
    this.exitPrompt.setDepth(1000);
    
    // Add a subtle animation to make it more noticeable
    this.tweens.add({
      targets: this.exitPrompt,
      y: '-=10',
      duration: 300,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut'
    });
  }
  
  /**
   * Hide the exit prompt
   */
  hideExitPrompt() {
    if (this.exitPrompt) {
      this.exitPrompt.destroy();
      this.exitPrompt = undefined;
    }
  }
  
  /**
   * Exit the building and return to main map
   */
  exitBuilding() {
    // Hide the exit prompt
    this.hideExitPrompt();
    
    // Fade out effect
    this.cameras.main.fade(500, 0, 0, 0);
    
    // When fade is complete, transition back to the main map
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Return to Level5Scene with the exit position data
      this.scene.start('Level5Scene', {
        fromBuilding: 'second',
        exitDoor: this.currentExitDoor
      });
    });
  }
  
  /**
   * Show a message popup
   */
  showMessage(message: string) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create a semi-transparent background
    const bg = this.add.rectangle(
      width / 2,
      height - 100,
      width - 40,
      160,
      0x000000,
      0.7
    );
    bg.setScrollFactor(0);
    bg.setStrokeStyle(2, 0xaaaaaa, 0.8);
    
    // Create the message text
    const text = this.add.text(
      width / 2,
      height - 100,
      message,
      {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: width - 80 },
        lineSpacing: 8
      }
    );
    text.setScrollFactor(0);
    text.setOrigin(0.5);
    
    // Group for easier management
    const group = this.add.group([bg, text]);
    
    // Auto-remove after a delay
    this.time.delayedCall(3000, () => {
      group.destroy(true);
    });
    
    // Add a fade-in effect
    bg.setAlpha(0);
    text.setAlpha(0);
    
    this.tweens.add({
      targets: [bg, text],
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
  }
  
  /**
   * Create or update an interaction indicator above an object
   */
  createInteractionIndicator(object: Phaser.GameObjects.GameObject) {
    // Check if we already have an indicator for this object
    if (this.interactionIndicators.has(object)) {
      const indicator = this.interactionIndicators.get(object);
      if (indicator) {
        return indicator;
      }
    }
    
    // We need to get the position of the object
    let x = 0;
    let y = 0;
    
    if ('getCenter' in object) {
      const center = (object as unknown as Phaser.GameObjects.Rectangle).getCenter();
      x = center.x;
      y = center.y;
    } else if ('x' in object && 'y' in object) {
      x = (object as unknown as { x: number }).x;
      y = (object as unknown as { y: number }).y;
    }
    
    // Position the indicator above the object
    const indicatorY = y - 88; // Positioned higher above the object
    
    // Create the indicator
    const indicator = this.add.sprite(x, indicatorY, 'interaction-indicator');
    indicator.setDepth(200); // Ensure it's above other elements
    
    // Add a bobbing animation
    this.tweens.add({
      targets: indicator,
      y: indicatorY - 6, // Small vertical movement
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add a subtle pulsing animation
    this.tweens.add({
      targets: indicator,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Start invisible - it will be shown when in range
    indicator.setVisible(false);
    
    // Store the indicator
    this.interactionIndicators.set(object, indicator);
    
    return indicator;
  }
  
  /**
   * Check for interactive objects near the player
   */
  checkInteractiveObjects() {
    if (!this.player) return;
    
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 70; // Interaction detection range
    
    // Reset player's nearest object at the start of each check
    this.player.nearestInteractiveObject = undefined;
    this.player.nearestInteractiveObjectDistance = Number.MAX_VALUE;
    
    // First, hide all indicators
    this.interactionIndicators.forEach(indicator => {
      indicator.setVisible(false);
    });
    
    // Check each interactive object
    this.interactiveObjects.forEach(obj => {
      // Skip if marked as not visible
      if (obj.getData('visible') === false) return;
      
      let objX = 0;
      let objY = 0;
      
      // Get position based on object type
      if ('getCenter' in obj) {
        const center = (obj as unknown as Phaser.GameObjects.Rectangle).getCenter();
        objX = center.x;
        objY = center.y;
      } else if ('x' in obj && 'y' in obj) {
        objX = (obj as unknown as { x: number }).x;
        objY = (obj as unknown as { y: number }).y;
      }
      
      // Calculate distance to player
      const distance = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y,
        objX, objY
      );
      
      // Get the indicator for this object
      const indicator = this.interactionIndicators.get(obj);
      
      // Show indicator if within range and interactive
      if (indicator && distance < interactDistance && obj.getData('interactive')) {
        indicator.setVisible(true);
        
        // Store reference to the closest object for interaction
        if (this.player && distance < this.player.nearestInteractiveObjectDistance) {
          this.player.nearestInteractiveObject = obj;
          this.player.nearestInteractiveObjectDistance = distance;
        }
      }
    });
  }
  
  /**
   * Check if player is in an exit zone
   */
  checkPlayerInExitZone() {
    if (!this.player) return;
    
    let inExitZone = false;
    let currentDoor = '';
    
    // Get player bounds
    const playerBounds = this.player.sprite.getBounds();
    
    // Check each exit zone
    this.exitPoints.forEach((zone, doorId) => {
      // Get zone bounds
      const zoneBounds = zone.getBounds();
      
      if (zoneBounds && Phaser.Geom.Rectangle.Overlaps(playerBounds, zoneBounds)) {
        inExitZone = true;
        currentDoor = doorId;
      }
    });
    
    // Handle entering exit zone
    if (inExitZone && (!this.playerInExitZone || this.currentExitDoor !== currentDoor)) {
      this.playerInExitZone = true;
      this.currentExitDoor = currentDoor;
      
      // Show prompt
      this.showExitPrompt();
      
      // Set timer to exit
      if (this.exitTimer) {
        this.exitTimer.remove();
      }
      
      this.exitTimer = this.time.delayedCall(1200, () => {
        if (this.playerInExitZone && this.currentExitDoor === currentDoor) {
          this.exitBuilding();
        }
      });
    }
    // Handle leaving exit zone
    else if (!inExitZone && this.playerInExitZone) {
      this.playerInExitZone = false;
      this.currentExitDoor = '';
      
      // Remove timer and prompt
      if (this.exitTimer) {
        this.exitTimer.remove();
        this.exitTimer = null;
      }
      
      this.hideExitPrompt();
    }
  }
  
  update() {
    // Update player movement if player exists
    if (this.player && this.cursors) {
      this.player.update(this.cursors);
    }
    
    // Check for interactive objects
    this.checkInteractiveObjects();
    
    // Check if player is still in exit zone
    this.checkPlayerInExitZone();
  }
  
  shutdown() {
    // Clean up resources
    if (this.interactionIndicators) {
      this.interactionIndicators.clear();
    }

    // Clear timer if it exists
    if (this.exitTimer) {
      this.exitTimer.remove();
      this.exitTimer = null;
    }

    // We should NOT clear the localStorage here since we want to 
    // persist the current scene when refreshing the page
    // Only remove all listeners to prevent memory leaks
    this.input.keyboard?.off('keydown-SPACE');
    this.input.keyboard?.off('keydown-ESC');
  }

  /**
   * Show Arcane Finance dialogue with multiple options
   */
  showArcaneDialogue() {
    this.switchDialogue(() => {
      const x = this.cameras.main.width / 2;
      const y = this.cameras.main.height / 2;
      
      // Create a container for all dialogue elements
      this.dialogueBox = this.add.container(0, 0);
      this.dialogueBox.setDepth(2000);
      
      // Create a semi-transparent background
      const bg = this.add.rectangle(
        x,
        y,
        700,
        600,
        0x000000,
        0.9
      );
      bg.setScrollFactor(0);
      bg.setStrokeStyle(2, 0x0052CC, 0.9); // Deep blue border for Arcane
      
      // Add the background to the container
      this.dialogueBox.add(bg);
      
      // Create title text
      const title = this.add.text(
        x,
        y - 240,
        "Welcome to Arcane Finance",
        {
          fontSize: '28px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center'
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      this.dialogueBox.add(title);
      
      // Add a subtitle
      const subtitle = this.add.text(
        x,
        y - 200,
        "Privacy-First Decentralized Exchange on Aleo",
        {
          fontSize: '18px',
          color: '#0052CC',
          align: 'center'
        }
      );
      subtitle.setOrigin(0.5);
      subtitle.setScrollFactor(0);
      this.dialogueBox.add(subtitle);
      
      // Greeting text
      const greeting = this.add.text(
        x,
        y - 160,
        "How can I assist you with privacy-enhanced trading today?",
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'center'
        }
      );
      greeting.setOrigin(0.5);
      greeting.setScrollFactor(0);
      this.dialogueBox.add(greeting);
      
      // Create dialogue options
      const dialogueOptions = [
        {
          text: "What is Arcane Finance?",
          action: () => this.showArcaneInfoDialogue()
        },
        {
          text: "Features of Arcane Finance",
          action: () => this.showArcaneFeaturesDialogue()
        },
        {
          text: "About Aleo Blockchain",
          action: () => this.showAleoInfoDialogue()
        },
        {
          text: "Visit Arcane Finance App",
          action: () => this.openArcaneWebsite()
        },
        {
          text: "Close",
          action: () => this.closeDialogueBox()
        }
      ];
      
      // Create buttons for each option
      dialogueOptions.forEach((option, index) => {
        const y_pos = y - 110 + (index * 50);
        
        // Create button background - special color for the Visit website option
        const buttonColor = option.text === "Visit Arcane Finance App" ? 0x0052CC : 0x6495ED; // Deep blue for website, blue for others
        const buttonBg = this.add.rectangle(
          x,
          y_pos,
          400,
          35,
          buttonColor,
          0.3
        );
        buttonBg.setScrollFactor(0);
        
        // Set appropriate stroke style based on the button type
        if (option.text === "Visit Arcane Finance App") {
          buttonBg.setStrokeStyle(1, 0x0052CC, 0.7); // Deep blue stroke to match fill
        } else {
          buttonBg.setStrokeStyle(1, 0x6495ED, 0.7); // Default blue stroke
        }
        
        // Make interactive with hand cursor
        buttonBg.setInteractive({ useHandCursor: true });
        
        // Apply gray color for the Close button
        if (option.text === "Close") {
          buttonBg.fillColor = 0x666666; // Gray for close button
          buttonBg.setStrokeStyle(1, 0x666666, 0.7);
        }
        
        // Add hover effect
        buttonBg.on('pointerover', () => {
          if (option.text === "Visit Arcane Finance App") {
            buttonBg.fillColor = 0x0052CC; // Deep blue
          } else if (option.text === "Close") {
            buttonBg.fillColor = 0x666666; // Gray
          } else {
            buttonBg.fillColor = 0x6495ED; // Blue
          }
          buttonBg.fillAlpha = 0.7;
        });
        
        buttonBg.on('pointerout', () => {
          if (option.text === "Visit Arcane Finance App") {
            buttonBg.fillColor = 0x0052CC; // Deep blue
          } else if (option.text === "Close") {
            buttonBg.fillColor = 0x666666; // Gray
          } else {
            buttonBg.fillColor = 0x6495ED; // Blue
          }
          buttonBg.fillAlpha = 0.3;
        });
        
        // Add click handler
        buttonBg.on('pointerdown', () => {
          option.action();
        });
        
        // Create button text
        const buttonText = this.add.text(
          x,
          y_pos,
          option.text,
          {
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
          }
        );
        buttonText.setOrigin(0.5);
        buttonText.setScrollFactor(0);
        
        // Add to container
        if (this.dialogueBox) {
          this.dialogueBox.add(buttonBg);
          this.dialogueBox.add(buttonText);
        }
      });

      // Add description at the bottom
      const description = this.add.text(
        x,
        y + 160,
        "Arcane Finance is a privacy-first DEX on Aleo blockchain,\noffering secure and private trading with advanced features.",
        {
          fontSize: '14px',
          color: '#aaaaaa',
          align: 'center'
        }
      );
      description.setOrigin(0.5);
      description.setScrollFactor(0);
      this.dialogueBox.add(description);
      
      // Add fade-in effect
      this.dialogueBox.setAlpha(0);
      this.tweens.add({
        targets: this.dialogueBox,
        alpha: 1,
        duration: 200,
        ease: 'Power1'
      });
      
      // Add escape key handler
      this.input.keyboard?.once('keydown-ESC', () => {
        this.closeDialogueBox();
      });
    });
  }

  /**
   * Helper method to transition between dialogue screens
   */
  switchDialogue(newDialogueCreator: () => void) {
    if (this.dialogueBox) {
      // Hide current dialogue (make it invisible but don't destroy)
      this.dialogueBox.setVisible(false);
      
      // Create the new dialogue immediately
      newDialogueCreator();
    } else {
      // No existing dialogue, just create the new one
      newDialogueCreator();
    }
  }

  /**
   * Show information about Arcane Finance
   */
  showArcaneInfoDialogue() {
    this.switchDialogue(() => {
      const x = this.cameras.main.width / 2;
      const y = this.cameras.main.height / 2;
      
      // Create container
      this.dialogueBox = this.add.container(0, 0);
      this.dialogueBox.setDepth(2000);
      
      // Create background
      const bg = this.add.rectangle(
        x,
        y,
        700,
        600,
        0x000000,
        0.9
      );
      bg.setScrollFactor(0);
      bg.setStrokeStyle(2, 0x0052CC, 0.8); // Deep blue for Arcane
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 220,
        "About Arcane Finance",
        {
          fontSize: '28px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center'
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      this.dialogueBox.add(title);
      
      // Create longer description text
      const infoText = [
        "Arcane Finance is a revolutionary privacy-first decentralized exchange (DEX) built on the Aleo blockchain.",
        "",
        "By fully leveraging zero-knowledge (ZK)-enabled security features, Arcane Finance ensures unmatched confidentiality and privacy for its users. This advanced level of security is crucial in the crypto space, where privacy concerns are paramount.",
        "",
        "The platform enhances user experience with unique features like flexible placement of concentrated liquidity for better returns and support for limit orders, giving users more control over their trading strategies.",
        "",
        "As the central liquidity hub within the Aleo blockchain ecosystem, Arcane Finance addresses existing privacy and confidentiality issues prevalent in cryptocurrency transactions, setting a new standard for secure and private trading."
      ].join("\n");
      
      const info = this.add.text(
        x,
        y,
        infoText,
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'left',
          wordWrap: { width: 650 }
        }
      );
      info.setOrigin(0.5, 0.5);
      info.setScrollFactor(0);
      this.dialogueBox.add(info);
      
      // Add back button
      const backButton = this.add.rectangle(
        x,
        y + 220,
        100,
        35,
        0x6495ED,
        0.3
      );
      backButton.setScrollFactor(0);
      backButton.setStrokeStyle(1, 0x6495ED, 0.7);
      backButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect
      backButton.on('pointerover', () => {
        backButton.fillColor = 0x6495ED;
        backButton.fillAlpha = 0.7;
      });
      
      backButton.on('pointerout', () => {
        backButton.fillColor = 0x6495ED;
        backButton.fillAlpha = 0.3;
      });
      
      // Add click handler
      backButton.on('pointerdown', () => {
        this.showArcaneDialogue();
      });
      
      // Add button text
      const backText = this.add.text(
        x,
        y + 220,
        "Back",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center'
        }
      );
      backText.setOrigin(0.5);
      backText.setScrollFactor(0);
      
      this.dialogueBox.add(backButton);
      this.dialogueBox.add(backText);
      
      // Add fade-in effect
      this.dialogueBox.setAlpha(0);
      this.tweens.add({
        targets: this.dialogueBox,
        alpha: 1,
        duration: 200,
        ease: 'Power1'
      });
      
      // Add escape key handler
      this.input.keyboard?.once('keydown-ESC', () => {
        this.showArcaneDialogue();
      });
    });
  }

  /**
   * Show features of Arcane Finance
   */
  showArcaneFeaturesDialogue() {
    this.switchDialogue(() => {
      const x = this.cameras.main.width / 2;
      const y = this.cameras.main.height / 2;
      
      // Create container
      this.dialogueBox = this.add.container(0, 0);
      this.dialogueBox.setDepth(2000);
      
      // Create background
      const bg = this.add.rectangle(
        x,
        y,
        700,
        600,
        0x000000,
        0.9
      );
      bg.setScrollFactor(0);
      bg.setStrokeStyle(2, 0x0052CC, 0.8);
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 240,
        "Features of Arcane Finance",
        {
          fontSize: '24px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center'
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      this.dialogueBox.add(title);
      
      // Create feature list text
      const featuresText = [
        "Key Features:",
        "",
        "• Unmatched Privacy - Zero-knowledge proofs ensure your transaction details remain confidential",
        "",
        "• Concentrated Liquidity - Flexible placement for optimized returns on your liquidity provisions",
        "",
        "• Limit Orders - Take control of your trading with advanced order types typically found on centralized exchanges",
        "",
        "• Central Liquidity Hub - Core infrastructure for the Aleo blockchain ecosystem",
        "",
        "• Advanced Trading Tools - Professional trading features in a decentralized environment",
        "",
        "• Future-Proof Design - Continuous improvement and feature expansion",
      ].join("\n");
      
      const features = this.add.text(
        x,
        y,
        featuresText,
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'left',
          lineSpacing: 5,
          wordWrap: { width: 650 }
        }
      );
      features.setOrigin(0.5, 0.5);
      features.setScrollFactor(0);
      this.dialogueBox.add(features);
      
      // Add navigation buttons
      const backButton = this.add.rectangle(
        x - 110,
        y + 220,
        100,
        35,
        0x6495ED,
        0.3
      );
      backButton.setScrollFactor(0);
      backButton.setStrokeStyle(1, 0x6495ED, 0.7);
      backButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect for back button
      backButton.on('pointerover', () => {
        backButton.fillColor = 0x6495ED;
        backButton.fillAlpha = 0.7;
      });
      
      backButton.on('pointerout', () => {
        backButton.fillColor = 0x6495ED;
        backButton.fillAlpha = 0.3;
      });
      
      // Add click handler for back button
      backButton.on('pointerdown', () => {
        this.showArcaneDialogue();
      });
      
      // Add back button text
      const backText = this.add.text(
        x - 110,
        y + 220,
        "Back",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center'
        }
      );
      backText.setOrigin(0.5);
      backText.setScrollFactor(0);
      
      // Add next button to Aleo info
      const nextButton = this.add.rectangle(
        x + 110,
        y + 220,
        100,
        35,
        0x0052CC,
        0.3
      );
      nextButton.setScrollFactor(0);
      nextButton.setStrokeStyle(1, 0x0052CC, 0.7);
      nextButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect for next button
      nextButton.on('pointerover', () => {
        nextButton.fillColor = 0x0052CC;
        nextButton.fillAlpha = 0.7;
      });
      
      nextButton.on('pointerout', () => {
        nextButton.fillColor = 0x0052CC;
        nextButton.fillAlpha = 0.3;
      });
      
      // Add click handler for next button
      nextButton.on('pointerdown', () => {
        this.showAleoInfoDialogue();
      });
      
      // Add next button text
      const nextText = this.add.text(
        x + 110,
        y + 220,
        "Next",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center'
        }
      );
      nextText.setOrigin(0.5);
      nextText.setScrollFactor(0);
      
      // Add buttons to container
      this.dialogueBox.add(backButton);
      this.dialogueBox.add(backText);
      this.dialogueBox.add(nextButton);
      this.dialogueBox.add(nextText);
      
      // Add fade-in effect
      this.dialogueBox.setAlpha(0);
      this.tweens.add({
        targets: this.dialogueBox,
        alpha: 1,
        duration: 200,
        ease: 'Power1'
      });
      
      // Add escape key handler
      this.input.keyboard?.once('keydown-ESC', () => {
        this.showArcaneDialogue();
      });
    });
  }

  /**
   * Show information about Aleo Blockchain
   */
  showAleoInfoDialogue() {
    this.switchDialogue(() => {
      const x = this.cameras.main.width / 2;
      const y = this.cameras.main.height / 2;
      
      // Create container
      this.dialogueBox = this.add.container(0, 0);
      this.dialogueBox.setDepth(2000);
      
      // Create background
      const bg = this.add.rectangle(
        x,
        y,
        700,
        600,
        0x000000,
        0.9
      );
      bg.setScrollFactor(0);
      bg.setStrokeStyle(2, 0x0052CC, 0.8);
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 240,
        "About Aleo Blockchain",
        {
          fontSize: '24px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center'
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      this.dialogueBox.add(title);
      
      // Create information text
      const infoText = [
        "Aleo is a privacy-focused blockchain platform that leverages zero-knowledge proofs (ZKPs) to enable fully private and scalable decentralized applications (dApps).",
        "",
        "Key Features of Aleo:",
        "",
        "• Zero-Knowledge Proofs - Advanced cryptographic techniques verify transactions without revealing sensitive information",
        "",
        "• Privacy by Default - All transactions on Aleo are private by default, giving users control over their data",
        "",
        "• Programmability - Leo programming language allows developers to build privacy-preserving applications",
        "",
        "• Decentralization - A network of validators ensures the integrity of the blockchain without compromising privacy"
      ].join("\n");
      
      const info = this.add.text(
        x,
        y,
        infoText,
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'left',
          lineSpacing: 5,
          wordWrap: { width: 650 }
        }
      );
      info.setOrigin(0.5, 0.5);
      info.setScrollFactor(0);
      this.dialogueBox.add(info);
      
      // Add navigation buttons
      const backButton = this.add.rectangle(
        x - 110,
        y + 220,
        100,
        35,
        0x6495ED,
        0.3
      );
      backButton.setScrollFactor(0);
      backButton.setStrokeStyle(1, 0x6495ED, 0.7);
      backButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect for back button
      backButton.on('pointerover', () => {
        backButton.fillColor = 0x6495ED;
        backButton.fillAlpha = 0.7;
      });
      
      backButton.on('pointerout', () => {
        backButton.fillColor = 0x6495ED;
        backButton.fillAlpha = 0.3;
      });
      
      // Add click handler for back button
      backButton.on('pointerdown', () => {
        this.showArcaneFeaturesDialogue();
      });
      
      // Add back button text
      const backText = this.add.text(
        x - 110,
        y + 220,
        "Previous",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center'
        }
      );
      backText.setOrigin(0.5);
      backText.setScrollFactor(0);
      
      // Add main menu button
      const menuButton = this.add.rectangle(
        x + 110,
        y + 220,
        100,
        35,
        0x0052CC,
        0.3
      );
      menuButton.setScrollFactor(0);
      menuButton.setStrokeStyle(1, 0x0052CC, 0.7);
      menuButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect for menu button
      menuButton.on('pointerover', () => {
        menuButton.fillColor = 0x0052CC;
        menuButton.fillAlpha = 0.7;
      });
      
      menuButton.on('pointerout', () => {
        menuButton.fillColor = 0x0052CC;
        menuButton.fillAlpha = 0.3;
      });
      
      // Add click handler for menu button
      menuButton.on('pointerdown', () => {
        this.showArcaneDialogue();
      });
      
      // Add menu button text
      const menuText = this.add.text(
        x + 110,
        y + 220,
        "Main Menu",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center'
        }
      );
      menuText.setOrigin(0.5);
      menuText.setScrollFactor(0);
      
      // Add buttons to container
      this.dialogueBox.add(backButton);
      this.dialogueBox.add(backText);
      this.dialogueBox.add(menuButton);
      this.dialogueBox.add(menuText);
      
      // Add fade-in effect
      this.dialogueBox.setAlpha(0);
      this.tweens.add({
        targets: this.dialogueBox,
        alpha: 1,
        duration: 200,
        ease: 'Power1'
      });
      
      // Add escape key handler
      this.input.keyboard?.once('keydown-ESC', () => {
        this.showArcaneDialogue();
      });
    });
  }

  /**
   * Open the Arcane Finance website in a new tab
   */
  openArcaneWebsite() {
    // Open the Arcane Finance website in a new tab
    if (typeof window !== 'undefined') {
      window.open('https://app.arcane.finance/', '_blank');
    }
    
    // Close the dialogue
    this.closeDialogueBox();
    
    // Show a confirmation message
    this.showMessage("Opening Arcane Finance app in a new tab!");
  }

  /**
   * Close the dialogue box
   */
  closeDialogueBox() {
    if (this.dialogueBox) {
      // Fade out and destroy
      this.tweens.add({
        targets: this.dialogueBox,
        alpha: 0,
        duration: 200,
        ease: 'Power1',
        onComplete: () => {
          if (this.dialogueBox) {
            this.dialogueBox.destroy();
            this.dialogueBox = undefined;
          }
        }
      });
    }
  }
} 
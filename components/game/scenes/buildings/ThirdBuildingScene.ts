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

export default class ThirdBuildingScene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private exitPoints: Map<string, Phaser.GameObjects.Zone> = new Map();
  private exitIndicators: Map<string, Phaser.GameObjects.Sprite> = new Map();
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
  private ansLookupInput?: HTMLInputElement;
  private currentDialogueOptions: {text: string, action: () => void}[] = [];
  
  constructor() {
    super({ key: 'ThirdBuildingScene' });
  }
  
  init() {
    // Store current scene in localStorage for development mode reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentScene', this.scene.key);
      console.log('Current scene saved:', this.scene.key);
    }
    
    // Get entry data (existing code)
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
        frameWidth: 48,
        frameHeight: 66,
        spacing: 0,
        margin: 0
      });
    }
    
    // Load custom textures for this building
    const texturesToLoad = [
      'floor',
      'wall',
      'ans-floor',
      'ans-cashier',
      'desk',
      'top-border',
      'left-border',
      'right-border',
      'bottom-border',
      'right-t-corner-border',
      'left-t-corner-border',
      'left-t-edge-corner',
      'right-t-edge-corner',
      'left-b-edge-corner',
      'right-b-edge-corner',
      'ans-backwall',
      // Add new furniture textures
      'ans-chalkboard',
      'ans-coffeetable',
      'ans-globe',
      'ans-leftcouch',
      'ans-rightcouch',
      'ans-topcouch'
    ];
    
    texturesToLoad.forEach(texture => {
      if (!textureCheck(texture)) {
        this.load.image(texture, `/assets/maps/${texture}.png`);
      }
    });
    
    // Load the tilemap
    this.load.tilemapTiledJSON('third-building-tilemap', '/assets/maps/buildings/third-building-tilemap.json');
    

    
    // Create the interaction indicator texture if it doesn't exist
    if (!textureCheck('interaction-indicator')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      
      // Draw a small white dot with a glow effect (exactly like Level1Scene)
      graphics.fillStyle(0xFFFFFF, 0.8);
      graphics.fillCircle(16, 16, 4);
      
      // Add a subtle glow/halo
      graphics.fillStyle(0xFFFFFF, 0.3);
      graphics.fillCircle(16, 16, 8);
      
      graphics.generateTexture('interaction-indicator', 32, 32);
      console.log('Created interaction indicator texture');
    }
  }
  
  create() {
    // Get entry data
    const data = this.scene.settings.data as {
      fromLevel5?: boolean;
      playerData?: Record<string, unknown>;
      entryDoor?: string;
    } | undefined;
    
    console.log('Third Building Scene created with data:', data);
    
    // Set the entry door based on data
    if (data && data.entryDoor) {
      this.entryDoor = data.entryDoor;
    }
    
    // Set background color
    this.cameras.main.setBackgroundColor('#426F60');
    
    // Get the building JSON data for fallback
    this.buildingData = this.cache.json.get('third-building-data');
    
    // Load the tilemap using the utility function
    try {
      const { map, layers } = loadTilemap(
        this,
        'third-building-tilemap',
        ['Floor', 'Objects', 'Furniture', 'Backwall', 'Collision'],
        ['Collision'] // Only use the Collision layer for collisions
      );
      
      this.map = map;
      this.layers = layers;
      
      console.log('Third building tilemap loaded successfully');
      
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
    let entryX = 400;
    let entryY = 600;
    
    // Adjust player position based on which door they entered through
    if (this.entryDoor === 'left') {
      entryX = 300;
      entryY = 600;
    } else if (this.entryDoor === 'right') {
      entryX = 500;
      entryY = 600;
    }
    
    this.player = new Player(this, entryX, entryY);
    
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
    
    // Add spacebar for interactions with NPCs and objects
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.interactWithNearbyObject();
    });
    
    // Disable the pink debug indicators
    this.disableDebugVisuals();
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }
  
  /**
   * Create interactive objects from the tilemap's object layer
   */
  createInteractiveObjectsFromTilemap() {
    if (!this.map) return;
    
    // Get the objects layer
    const objectsLayer = this.map.getObjectLayer('InteractiveObjects');
    if (!objectsLayer) {
      console.warn('No InteractiveObjects layer found in tilemap');
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
          // Create the cashier as an interactive object with an extended interaction zone
          this.createCashierWithExtendedZone({
            x,
            y,
            texture: object.name || 'ans-cashier', // Use the name as texture key
            scale: typeof properties.scale === 'number' ? properties.scale : 
                   typeof properties.scale === 'string' ? parseFloat(properties.scale) : 1.2,
            // ANS-specific message - we'll ignore this and use our dialogue system
            interactionMessage: "Welcome to ANS! How may I help you today?"
          });
          break;
      
        case 'furniture':
          // Create furniture as NON-interactive objects (display only)
          this.createNonInteractiveObject({
            x,
            y,
            texture: object.name || 'default-furniture', // Use the name as texture key
            scale: typeof properties.scale === 'number' ? properties.scale : 
                   typeof properties.scale === 'string' ? parseFloat(properties.scale) : 1
          });
          break;
          
        case 'exit':
          // Create exit point
          const doorId = typeof properties.doorId === 'string' ? properties.doorId : 'main';
          this.createExitPoint(doorId, x, y);
          break;
          
        default:
          console.warn(`Unknown object type: ${object.type}`);
          break;
      }
    });
  }
  
  /**
   * Disable debug visualizations for physics bodies
   */
  disableDebugVisuals() {
    // Disable pink outlines from physics debug
    this.physics.world.debugGraphic.clear();
    this.physics.world.debugGraphic.visible = false;
    
    // Hide any other debug graphics that might be showing
    this.children.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Graphics && 
          child.name && child.name.includes('debug')) {
        child.visible = false;
      }
    });
  }
  
  /**
   * Load interactive elements from the JSON data
   */
  loadInteractiveElements() {
    if (!this.buildingData) return;
    
    // Load furniture items as NON-interactive
    if (this.buildingData.furniture && Array.isArray(this.buildingData.furniture)) {
      this.buildingData.furniture.forEach((item: FurnitureItem) => {
        this.createNonInteractiveObject({
          x: item.x,
          y: item.y,
          texture: item.texture,
          scale: item.scale
        });
      });
    }
    
  
    
    // Add the cashier with extended interaction zone (fallback case)
    this.createCashierWithExtendedZone({
      x: 384,
      y: 192,
      texture: 'ans-cashier',
      scale: 1.2,
      interactionMessage: "Welcome to the ANS building! How may I help you?"
    });
    
    // Add the new furniture items manually in the fallback case
    // Chalkboard
    this.createNonInteractiveObject({
      x: 185,
      y: 120,
      texture: 'ans-chalkboard',
      scale: 1.0
    });
    
    // Coffee table
    this.createNonInteractiveObject({
      x: 384,
      y: 350,
      texture: 'ans-coffeetable',
      scale: 1.0
    });
    
    // Globe
    this.createNonInteractiveObject({
      x: 580,
      y: 120,
      texture: 'ans-globe',
      scale: 1.0
    });
    
    // Left couch
    this.createNonInteractiveObject({
      x: 120,
      y: 250,
      texture: 'ans-leftcouch',
      scale: 1.0
    });
    
    // Right couch
    this.createNonInteractiveObject({
      x: 570,
      y: 350,
      texture: 'ans-rightcouch',
      scale: 1.0
    });
    
    // Top couch
    this.createNonInteractiveObject({
      x: 384,
      y: 250,
      texture: 'ans-topcouch',
      scale: 1.0
    });
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
    
    const obj = this.add.image(x, y, texture);
    obj.setScale(scale);
    
    // Set depth based on the object type
    if (texture.includes('globe')) {
      // Globe should be above the player
      obj.setDepth(15);
    } else if (texture.includes('couch') || texture.includes('table') || texture.includes('chalkboard')) {
      // Furniture should be behind the player
      obj.setDepth(5);
    } else if (texture.includes('cashier')) {
      // Cashiers should be above furniture but behind player
      obj.setDepth(8);  
    } else {
      // Default depth for other objects
      obj.setDepth(7);
    }
    
    // Make the object interactive
    obj.setInteractive({ useHandCursor: true });
    obj.setData('interactive', true);
    obj.setData('onInteract', () => {
      this.showMessage(interactionMessage);
    });
    
    // Add to interactive objects
    this.interactiveObjects.push(obj);
    
    // Create an interaction indicator
    this.createInteractionIndicator(obj);
    
    return obj;
  }
  
  /**
   * Create a non-interactive object (for decoration only)
   */
  createNonInteractiveObject({
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
      console.warn(`Texture ${texture} not found, skipping non-interactive object`);
      return;
    }
    
    const obj = this.add.image(x, y, texture);
    obj.setScale(scale);
    
    // Set depth based on the object type
    if (texture.includes('globe')) {
      // Globe should be above the player
      obj.setDepth(15);
    } else if (texture.includes('couch') || texture.includes('table') || texture.includes('chalkboard')) {
      // Furniture should be behind the player
      obj.setDepth(5);
    } else {
      // Default depth for other objects
      obj.setDepth(7);
    }
    
    return obj;
  }
  
  /**
   * Create cashier with extended interaction zone
   */
  createCashierWithExtendedZone({
    x,
    y,
    texture,
    scale = 1,
    interactionMessage // eslint-disable-line @typescript-eslint/no-unused-vars
  }: {
    x: number;
    y: number;
    texture: string;
    scale?: number;
    interactionMessage: string; // Parameter kept for API consistency, but we use the ANS dialogue system instead
  }) {
    if (!this.textures.exists(texture)) {
      console.warn(`Texture ${texture} not found, skipping cashier object`);
      return;
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
    
    // Add a visual guide for the interaction zone (only visible during development in debug mode)
    // We'll make this completely invisible by setting alpha to 0
    const zoneVisual = this.add.rectangle(x, zoneY, zoneWidth, zoneHeight, 0x00ff00, 0);
    zoneVisual.setStrokeStyle(2, 0xffff00, 0); // Set alpha to 0 for stroke too
    zoneVisual.setDepth(6); // Below the cashier but above the floor
    
    // Store interaction data on the cashier
    cashier.setData('interactionZone', interactionZone);
    cashier.setData('interactive', true);
    cashier.setData('isCashier', true); // Add a flag to identify cashiers
    cashier.setData('onInteract', () => {
      // Instead of showing simple message, show ANS dialogue
      this.showANSDialogue();
    });
    
    // Make the interaction zone a physics object
    this.physics.world.enable(interactionZone);
    
    // Add to interactive objects
    this.interactiveObjects.push(cashier);
    
    // Create an interaction indicator
    const indicator = this.createInteractionIndicator(cashier);
    
    // Store the interaction zone with the indicator for checking overlap
    indicator.setData('cashierZone', interactionZone);
    
    return cashier;
  }
  
  /**
   * Interact with the nearest interactive object
   */
  interactWithNearbyObject() {
    if (!this.player) return;
    
    const playerPos = this.player.sprite.getCenter();
    let interactedWithCashier = false;
    
    // First check if player is within any cashier's extended interaction zone
    this.interactiveObjects.forEach(obj => {
      // Only check for cashier objects
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        getData: (key: string) => unknown;
        texture?: { key?: string };
      };
      
      // Skip if not a cashier
      if (!gameObj.texture || !gameObj.texture.key || !gameObj.texture.key.includes('cashier')) {
        return;
      }
      
      // Get the interaction zone for this cashier
      const interactionZone = gameObj.getData('interactionZone') as Phaser.GameObjects.Zone;
      if (interactionZone && this.physics.overlap(this.player!.sprite, interactionZone)) {
        // Player is within the extended interaction zone
        const onInteract = gameObj.getData('onInteract');
        if (typeof onInteract === 'function') {
          onInteract();
          interactedWithCashier = true;
        }
      }
    });
    
    // If already interacted with a cashier, don't check other objects
    if (interactedWithCashier) return;
    
    // Check for other interactive objects ( etc.) using the original logic
    const interactDistance = 60; // Interaction range
    let nearestObject: Phaser.GameObjects.GameObject | null = null;
    let shortestDistance = interactDistance;
    
    // Find the nearest interactive object (except cashiers which we already checked)
    this.interactiveObjects.forEach(obj => {
      // Skip cashiers and exit points
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        getData: (key: string) => unknown;
        texture?: { key?: string };
      };
      
      if (gameObj.getData('doorId') || 
          (gameObj.texture && gameObj.texture.key && gameObj.texture.key.includes('cashier'))) {
        return;
      }
      
      // Get object position
      let objX = 0;
      let objY = 0;
      
      if ('getCenter' in obj) {
        const center = (obj as unknown as Phaser.GameObjects.Rectangle).getCenter();
        objX = center.x;
        objY = center.y;
      } else if ('x' in obj && 'y' in obj) {
        objX = (obj as unknown as { x: number }).x;
        objY = (obj as unknown as { y: number }).y;
      }
      
      // Calculate distance
      const distance = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, objX, objY);
      
      // If this is the nearest object so far, update
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestObject = obj;
      }
    });
    
    // Interact with the nearest object
    if (nearestObject) {
      // Use type assertion to fix linter error with a more specific return type
      const gameObject = nearestObject as Phaser.GameObjects.GameObject & { 
        getData: (key: string) => (() => void) | undefined 
      };
      const onInteract = gameObject.getData('onInteract');
      if (typeof onInteract === 'function') {
        onInteract();
      }
    }
  }
  
  /**
   * Create a room layout - fallback method if tilemap fails
   */
  createRoom() {
    const roomWidth = 16;
    const roomHeight = 20;
    const tileSize = 48;
    
    // Create walls - without visible bounding boxes
    const graphics = this.add.graphics();
    
    // Floor - replace solid color with tiled floor texture
    const floorTile = this.textures.get('ans-floor');
    if (floorTile) {
      // Create a repeating tile pattern for the floor
      for (let x = 1; x < roomWidth - 1; x++) {
        for (let y = 1; y < roomHeight - 1; y++) {
          this.add.image(
            x * tileSize + tileSize / 2, 
            y * tileSize + tileSize / 2, 
            'ans-floor'
          ).setDepth(1);
        }
      }
    } else {
      // Fallback to solid color if texture is missing
      graphics.fillStyle(0x333355);
      graphics.fillRect(tileSize, tileSize, (roomWidth - 2) * tileSize, (roomHeight - 2) * tileSize);
    }
    
    // Walls
    graphics.fillStyle(0x555577);
    
    // Top wall
    graphics.fillRect(0, 0, roomWidth * tileSize, tileSize);
    
    // Bottom wall with two door gaps
    // Left door gap
    const leftDoorWidth = 150;
    const leftDoorX = 300;
    graphics.fillRect(0, (roomHeight - 1) * tileSize, leftDoorX - (leftDoorWidth / 2), tileSize);
    
    // Right door gap
    const rightDoorWidth = 150;
    const rightDoorX = 500;
    const middleSectionStart = leftDoorX + (leftDoorWidth / 2);
    const middleSectionWidth = rightDoorX - (rightDoorWidth / 2) - middleSectionStart;
    graphics.fillRect(middleSectionStart, (roomHeight - 1) * tileSize, middleSectionWidth, tileSize);
    
    // Right section of bottom wall
    graphics.fillRect(rightDoorX + (rightDoorWidth / 2), (roomHeight - 1) * tileSize, 
      roomWidth * tileSize - (rightDoorX + (rightDoorWidth / 2)), tileSize);
    
    // Left wall
    graphics.fillRect(0, tileSize, tileSize, (roomHeight - 2) * tileSize);
    
    // Right wall
    graphics.fillRect((roomWidth - 1) * tileSize, tileSize, tileSize, (roomHeight - 2) * tileSize);
    
    // Room divider - horizontal line one-third of the way down
    graphics.fillStyle(0x555577);
    
    // Add vertical dividers in the top section to create three rooms
    graphics.fillStyle(0x555577);
    graphics.fillRect(roomWidth * tileSize / 3, tileSize, tileSize / 2, (roomHeight / 3 - 1) * tileSize);
    graphics.fillRect(roomWidth * tileSize * 2 / 3, tileSize, tileSize / 2, (roomHeight / 3 - 1) * tileSize);
    
    // Add collision for walls
    const walls = this.physics.add.staticGroup();
    
    // Outer walls - Top
    walls.add(this.add.zone(roomWidth * tileSize / 2, tileSize / 2, roomWidth * tileSize, tileSize));
    
    // Bottom wall sections with gaps for doors
    walls.add(this.add.zone((leftDoorX - (leftDoorWidth / 2)) / 2, (roomHeight - 0.5) * tileSize, 
      leftDoorX - (leftDoorWidth / 2), tileSize));
    
    walls.add(this.add.zone(middleSectionStart + middleSectionWidth / 2, (roomHeight - 0.5) * tileSize, 
      middleSectionWidth, tileSize));
    
    walls.add(this.add.zone((rightDoorX + (rightDoorWidth / 2) + roomWidth * tileSize) / 2, 
      (roomHeight - 0.5) * tileSize, 
      roomWidth * tileSize - (rightDoorX + (rightDoorWidth / 2)), tileSize));
    
    // Left wall
    walls.add(this.add.zone(tileSize / 2, roomHeight * tileSize / 2, tileSize, roomHeight * tileSize));
    
    // Right wall
    walls.add(this.add.zone((roomWidth - 0.5) * tileSize, roomHeight * tileSize / 2, tileSize, roomHeight * tileSize));
    
    // Vertical dividers
    walls.add(this.add.zone(roomWidth * tileSize / 3 + tileSize / 4, (roomHeight / 6), 
      tileSize / 2, (roomHeight / 3 - 1) * tileSize));
    
    walls.add(this.add.zone(roomWidth * tileSize * 2 / 3 + tileSize / 4, (roomHeight / 6), 
      tileSize / 2, (roomHeight / 3 - 1) * tileSize));
    
    // Enable collision with player
    if (this.player) {
      this.physics.add.collider(this.player.sprite, walls);
    }
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, roomWidth * tileSize, roomHeight * tileSize);
  }
  
  /**
   * Create exit points matching the entry doors
   */
  createExitPoints() {
    // Create left exit
    const leftExitX = 350;
    // Position near bottom wall (roomHeight - 1) * tileSize = 19 * 48 = 912
    const leftExitY = 880; // Moved closer to the bottom wall at y=912
    this.createExitPoint('left', leftExitX, leftExitY);
    
    // Create right exit
    const rightExitX = 550;
    // Position near bottom wall (roomHeight - 1) * tileSize = 19 * 48 = 912
    const rightExitY = 880; // Moved closer to the bottom wall at y=912
    this.createExitPoint('right', rightExitX, rightExitY);
  }
  
  /**
   * Create a single exit point
   */
  createExitPoint(doorId: string, x: number, y: number) {
    // Create an exit zone
    const exitZone = this.add.zone(x, y, 96, 48);
    this.physics.world.enable(exitZone);
    
    // Store reference to the zone by doorId
    this.exitPoints.set(doorId, exitZone);
    
    // Create a visual indicator for the exit
    const indicatorX = x;
    const indicatorY = y - 24; // Above the exit zone
    
    // Create indicator if it doesn't exist
    if (!this.textures.exists('exit-indicator')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xFFFFFF, 0.7);
      graphics.fillCircle(8, 8, 4);
      graphics.generateTexture('exit-indicator', 16, 16);
    }
    
    // Create the indicator sprite but make it invisible
    const indicator = this.add.sprite(indicatorX, indicatorY, 'exit-indicator');
    indicator.setVisible(false); // Hide the exit indicators
    indicator.setDepth(100);
    
    // Store reference to the indicator
    this.exitIndicators.set(doorId, indicator);
    
    // Add bobbing animation
    this.tweens.add({
      targets: indicator,
      y: indicatorY - 5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Set up exit zone interaction
    exitZone.setData('doorId', doorId);
    
    // Check when player enters the exit zone
    this.physics.add.overlap(this.player!.sprite, exitZone, () => {
      if (!this.playerInExitZone) {
        this.playerInExitZone = true;
        this.currentExitDoor = doorId;
        this.showExitPrompt();
        
        // Set up a timer to auto-exit after 3 seconds if player remains in the zone
        this.exitTimer = this.time.delayedCall(3000, () => {
          if (this.playerInExitZone && this.currentExitDoor === doorId) {
            this.exitBuilding();
          }
        });
      }
    });
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
   * Exit building and return to Level5Scene
   */
  exitBuilding() {
    // Fade out
    this.cameras.main.fadeOut(500);
    
    // When fade is complete, return to the main level
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Pass data back to Level5Scene
      const returnData = {
        fromBuilding: 'ThirdBuildingScene',
        exitDoor: this.entryDoor
      };
      
      // Return to Level5Scene
      this.scene.start('Level5Scene', returnData);
    });
  }
  
  /**
   * Show a message dialog
   */
  showMessage(message: string) {
    const x = this.cameras.main.width / 2;
    const y = this.cameras.main.height / 2;
    
    // Create a background with much higher depth
    const bg = this.add.rectangle(x, y, 500, 120, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setScrollFactor(0); // Fix to camera
    bg.setDepth(2000); // Extremely high depth to ensure it's above everything
    
    // Add text with matching high depth
    const text = this.add.text(x, y, message, {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 480 }
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0); // Fix to camera
    text.setDepth(2001); // Even higher than background to ensure it's visible
    
    // Group for easier cleanup
    const group = this.add.group([bg, text]);
    
    // Close on click
    this.input.once('pointerdown', () => {
      group.destroy(true);
    });
    
    // Auto-close after 3 seconds
    this.time.delayedCall(3000, () => {
      group.destroy(true);
    });
  }
  
  /**
   * Create an interaction indicator for a specific object
   */
  createInteractionIndicator(object: Phaser.GameObjects.GameObject) {
    // Get object position
    let objX = 0;
    let objY = 0;
    
    if ('getCenter' in object) {
      const center = (object as unknown as Phaser.GameObjects.Rectangle).getCenter();
      objX = center.x;
      objY = center.y;
    } else if ('x' in object && 'y' in object) {
      objX = (object as unknown as { x: number }).x;
      objY = (object as unknown as { y: number }).y;
    }
    
    // Position higher above the object (48px higher than before)
    const x = objX;
    const y = objY - 88; // Changed from -40 to -88
    
    // Create a dedicated indicator for this object
    const indicator = this.add.sprite(x, y, 'interaction-indicator');
    indicator.setVisible(false); // Hide initially
    indicator.setDepth(200); // Very high depth to ensure visibility, same as Level1Scene
    
    // Add animations - adjust the bobbing animation to match the new height
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
   * Check for nearby interactive objects
   */
  checkInteractiveObjects() {
    if (!this.player || this.interactiveObjects.length === 0) return;
    
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Standard interaction range
    
    // First, hide all indicators
    this.interactionIndicators.forEach(indicator => {
      indicator.setVisible(false);
    });
    
    // Check each interactive object
    this.interactiveObjects.forEach(obj => {
      // Skip exit points, they have their own indicators
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        getData: (key: string) => unknown;
        texture?: { key?: string };
      };
      
      if (gameObj.getData('doorId')) return;
      
      // Get the indicator for this object
      const indicator = this.interactionIndicators.get(obj);
      if (!indicator) return;
      
      // Special handling for cashiers with extended zones
      if (gameObj.getData('isCashier')) {
        const interactionZone = gameObj.getData('interactionZone') as Phaser.GameObjects.Zone;
        
        if (interactionZone && this.physics.overlap(this.player!.sprite, interactionZone)) {
          // Player is in the cashier's extended zone, show the indicator
          indicator.setVisible(true);
          
          // Position the indicator directly above the cashier, not above the zone
          let objX = 0;
          let objY = 0;
          
          if ('x' in obj && 'y' in obj) {
            objX = (obj as unknown as { x: number }).x;
            objY = (obj as unknown as { y: number }).y;
          }
          
          indicator.x = objX;
          indicator.y = objY - 88; // Changed from -40 to -88
        }
        
        return; // Skip the standard distance check for cashiers
      }
      
      // Standard distance check for non-cashier interactive objects
      let objX = 0;
      let objY = 0;
      
      if ('getCenter' in obj) {
        const center = (obj as unknown as Phaser.GameObjects.Rectangle).getCenter();
        objX = center.x;
        objY = center.y;
      } else if ('x' in obj && 'y' in obj) {
        objX = (obj as unknown as { x: number }).x;
        objY = (obj as unknown as { y: number }).y;
      }
      
      // Calculate distance to the object
      const distance = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, objX, objY);
      
      // If in range, display indicator
      if (distance < interactDistance) {
        indicator.setVisible(true);
      }
    });
  }
  
  /**
   * Check if player is still in exit zone
   */
  checkPlayerInExitZone() {
    if (this.playerInExitZone && this.player) {
      let playerIsInAnyZone = false;
      
      // Check if player is in ANY exit zone
      this.exitPoints.forEach((zone) => {
        // Only check if the player's sprite exists and is valid
        if (this.player && this.player.sprite) {
          if (this.physics.overlap(this.player.sprite, zone)) {
            playerIsInAnyZone = true;
          }
        }
      });
      
      // If not in any zone but previously was, reset state
      if (!playerIsInAnyZone && this.playerInExitZone) {
        this.playerInExitZone = false;
        this.currentExitDoor = '';
        if (this.exitTimer) {
          this.exitTimer.remove();
          this.exitTimer = null;
        }
        this.hideExitPrompt();
      }
    }
  }
  
  /**
   * Show ANS dialogue with multiple options
   */
  showANSDialogue() {
    // Use switchDialogue to properly transition between dialogs
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
      bg.setStrokeStyle(2, 0x6495ED, 0.9);
      
      // Add the background to the container
      this.dialogueBox.add(bg);
      
      // Create title text
      const title = this.add.text(
        x,
        y - 120,
        "Welcome to Aleo Name Service",
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
      
      // Check if player has a saved ANS name
      const playerName = typeof window !== 'undefined' ? localStorage.getItem('playerANSName') : null;
      
      // Greeting text with or without player name
      const greetingText = playerName 
        ? `Hello, ${playerName}! How can I help you today?`
        : "How can I help you today?";
      
      const greeting = this.add.text(
        x,
        y - 80,
        greetingText,
        {
          fontSize: '18px',
          color: '#cccccc',
          align: 'center'
        }
      );
      greeting.setOrigin(0.5);
      greeting.setScrollFactor(0);
      this.dialogueBox.add(greeting);
      
      // Create dialogue options
      this.currentDialogueOptions = [
        {
          text: "Learn more about ANS",
          action: () => this.showANSInfoDialogue()
        },
        {
          text: "Try an ANS name lookup demo",
          action: () => this.showANSLookupDemo()
        },
        {
          text: "Try an address lookup demo",
          action: () => this.showAddressLookupDemo()
        },
        {
          text: "Get your own ANS Name Now!",
          action: () => this.openANSWebsite()
        },
        {
          text: "Close",
          action: () => this.closeDialogueBox()
        }
      ];
      
      // Create buttons for each option
      this.currentDialogueOptions.forEach((option, index) => {
        const y_pos = y - 40 + (index * 40);
        
        // Create button background - special color for the "Get your own ANS Name Now!" option
        const buttonColor = option.text === "Get your own ANS Name Now!" ? 0xFF8C00 : 0x6495ED; // Orange for ANS website, blue for others
        const buttonBg = this.add.rectangle(
          x,
          y_pos,
          400,
          30,
          buttonColor,
          0.3
        );
        buttonBg.setScrollFactor(0);
        
        // Set appropriate stroke style based on the button type
        if (option.text === "Get your own ANS Name Now!") {
          buttonBg.setStrokeStyle(1, 0xFF8C00, 0.7); // Bright orange stroke to match fill
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
          // Use orange for ANS website button, gray for close, blue for others
          if (option.text === "Get your own ANS Name Now!") {
            buttonBg.fillColor = 0xFF8C00; // Orange
          } else if (option.text === "Close") {
            buttonBg.fillColor = 0x666666; // Gray
          } else {
            buttonBg.fillColor = 0x6495ED; // Blue
          }
          buttonBg.fillAlpha = 0.7;
        });
        
        buttonBg.on('pointerout', () => {
          // Use orange for ANS website button, gray for close, blue for others
          if (option.text === "Get your own ANS Name Now!") {
            buttonBg.fillColor = 0xFF8C00; // Orange
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
      // Save a reference to DOM elements to clean up
      const inputToRemove = this.ansLookupInput;
      
      // Hide current dialogue (make it invisible but don't destroy)
      this.dialogueBox.setVisible(false);
      
      // Create the new dialogue immediately
      newDialogueCreator();
      
      // Clean up the DOM element from the previous dialogue if it exists
      if (inputToRemove && inputToRemove.parentNode) {
        inputToRemove.parentNode.removeChild(inputToRemove);
        // Only clear this if it refers to the saved reference
        if (this.ansLookupInput === inputToRemove) {
          this.ansLookupInput = undefined;
        }
      }
    } else {
      // No existing dialogue, just create the new one
      newDialogueCreator();
    }
  }
  
  /**
   * Modified to use the switchDialogue method
   */
  showANSInfoDialogue() {
    this.switchDialogue(() => {
      const x = this.cameras.main.width / 2;
      const y = this.cameras.main.height / 2;
      
      // Create container (previous one was hidden, not destroyed)
      this.dialogueBox = this.add.container(0, 0);
      this.dialogueBox.setDepth(2000);
      
      // Rest of the function stays the same...
      // Create background
      const bg = this.add.rectangle(
        x,
        y,
        700,  // Keep original width
        600,  // Keep original height
        0x000000,
        0.9
      );
      bg.setScrollFactor(0);
      bg.setStrokeStyle(2, 0x6495ED, 0.8);
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 220,
        "About Aleo Name Service",
        {
          fontSize: '28px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'start'
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      this.dialogueBox.add(title);
      
      // Create longer description text
      const infoText = [
        "Aleo Name Service (ANS) is to Aleo what DNS is to the internet.",
        "",
        "• Instead of typing long Aleo addresses like 'aleo1abc123 you can use simple names like 'yourname.ans'",
        "",
        "• ANS names can be used for receiving crypto, linking to content and representing your identity in the Aleo ecosystem",
        "",
        "• Names can be public or private, giving you control over your privacy",
        "",
        "• You can even set profile pictures and other information that apps can display when they see your ANS name"
      ].join("\n");
      
      const info = this.add.text(
        x,
        y - 5,
        infoText,
        {
          fontSize: '20px',
          color: '#cccccc',
          align: 'left',
          wordWrap: { width: 600 }  // Add wordWrap with reduced width (was full width before)
        }
      );
      info.setOrigin(0.5);
      info.setScrollFactor(0);
      this.dialogueBox.add(info);
      
      // Add back button - Lowered position by adjusting y coordinate
      const backButton = this.add.rectangle(
        x,
        y + 200,  // Changed from 120 to 150 to lower the button
        100,
        35,
        0x6495ED,
        0.3
      );
      backButton.setScrollFactor(0);
      backButton.setStrokeStyle(1, 0x6495ED, 0.7);
      backButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect - fix setFillAlpha
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
        this.showANSDialogue();
      });
      
      // Add button text
      const backText = this.add.text(
        x,
        y + 200,
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
        this.showANSDialogue();
      });
    });
  }
  
  /**
   * Lookup ANS name using the real ANS API
   */
  async lookupANSName(name: string): Promise<string | null> {
    try {
      // Check if name is valid format
      if (!name.endsWith('.ans')) {
        return null;
      }

      console.log(`Looking up ANS name: ${name}`);
      
      // Make a request to the ANS API - using the correct testnet API endpoint
      const response = await fetch(`https://testnet-api.aleonames.id/address/${name}`);
      
      if (!response.ok) {
        // 404 means name not registered (expected for most test names)
        if (response.status === 404) {
          console.log(`ANS name "${name}" is not registered (404)`);
        } else {
          console.error('ANS API request failed with status:', response.status);
        }
        return null;
      }
      
      const data = await response.json();
      console.log('ANS API response:', data);
      
      // Return the address if available
      if (data && data.address) {
        return data.address;
      }
      
      return null;
    } catch (error) {
      console.error('Error looking up ANS name:', error);
      return null;
    }
  }

  /**
   * Lookup address to find primary ANS name
   */
  async lookupAddress(address: string): Promise<string | null> {
    try {
      // Basic validation for Aleo address format
      if (!address.startsWith('aleo1')) {
        return null;
      }

      // Make a request to the ANS API - using correct testnet API endpoint
      const response = await fetch(`https://testnet-api.aleonames.id/primary_name/${address}`);
      
      if (!response.ok) {
        console.error('ANS API request failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      // Return the name if available
      if (data && data.name) {
        return data.name;
      }
      
      return null;
    } catch (error) {
      console.error('Error looking up address:', error);
      return null;
    }
  }

  /**
   * Show ANS name lookup demo
   */
  showANSLookupDemo() {
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
      bg.setStrokeStyle(2, 0x6495ED, 0.8);
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 130,
        "ANS Name Lookup Demo",
        {
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center'
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      this.dialogueBox.add(title);
      
      // Create description
      const description = this.add.text(
        x,
        y - 100, // Moved higher to add spacing
        "Enter an ANS name to see if it's registered and what address it resolves to",
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'center',
          wordWrap: { width: 600 }
        }
      );
      description.setOrigin(0.5);
      description.setScrollFactor(0);
      this.dialogueBox.add(description);
      
      // Sample examples - with improved spacing
      const examples = this.add.text(
        x,
        y - 60, // More space between description and examples
        "Examples: test.ans, aleo.ans, leo.ans",
        {
          fontSize: '14px',
          color: '#FFFF00', // Yellow for better visibility
          align: 'center',
          fontStyle: 'italic'
        }
      );
      examples.setOrigin(0.5);
      examples.setScrollFactor(0);
      this.dialogueBox.add(examples);
      
      
      
      // Create result text first (to avoid reference error)
      const resultText = this.add.text(
        x,
        y + 30,
        "Result will appear here...",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: 400 }
        }
      );
      resultText.setOrigin(0.5);
      resultText.setScrollFactor(0);
      this.dialogueBox.add(resultText);
      
      console.log('Creating input field for ANS lookup...');
      
      // Create a text input field directly in the game (Phaser game object instead of DOM)
      const inputFieldBackground = this.add.rectangle(
        x,
        y + 100, // Positioned directly below examples text
        300,
        40,
        0x333333,
        1
      );
      inputFieldBackground.setStrokeStyle(3, 0xFF8C00); // Orange border
      
      // Create a text prompt to store user input 
      let userInputText = "";
      
      // Create a text object to display what the user is typing
      const inputText = this.add.text(
        x,
        y + 100, // Positioned directly below examples text
        userInputText || "Click here to type...",
        {
          fontSize: '18px',
          color: userInputText ? '#FFFFFF' : '#888888',
          align: 'center'
        }
      );
      inputText.setOrigin(0.5);
      
      // Create invisible hit area for the input field (bigger than the visible bg for easier clicking)
      const hitArea = this.add.rectangle(
        x,
        y + 100, // Positioned directly below examples text
        320,
        50,
        0x000000,
        0
      );
      hitArea.setInteractive({ useHandCursor: true });
      
      // Variable to track if input is active
      let inputActive = false;
      
      // Make input field interactive
      hitArea.on('pointerdown', () => {
        inputActive = true;
        inputFieldBackground.setStrokeStyle(3, 0xFFFFFF); // White border when active
        // Clear placeholder text when user first clicks
        if (!userInputText) {
          inputText.setText('|'); // Show cursor
        }
        
        console.log('Input field activated');
      });
      
      // Deactivate input when clicking elsewhere
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
        if (inputActive && !gameObjects.includes(hitArea)) {
          inputActive = false;
          inputFieldBackground.setStrokeStyle(3, 0xFF8C00); // Back to orange when inactive
          // If empty, show placeholder again
          if (!userInputText) {
            inputText.setText("Click here to type...");
            inputText.setColor('#888888');
          }
        }
      });
      
      // Handle keyboard input
      if (this.input.keyboard) {
        this.input.keyboard.on('keydown', (event: {key: string}) => {
          if (!inputActive) return;
          
          console.log('Key pressed:', event.key);
        
        if (event.key === 'Backspace') {
          // Handle backspace
          userInputText = userInputText.slice(0, -1);
        } else if (event.key === 'Enter') {
          // Handle enter key
          if (userInputText) {
            console.log('Performing lookup for:', userInputText);
            performLookup(userInputText);
          }
          inputActive = false;
          inputFieldBackground.setStrokeStyle(3, 0xFF8C00);
        } else if (event.key.length === 1) {
          // Add character (only handle single characters)
          userInputText += event.key;
        }
        
        // Update the text display
        if (userInputText) {
          inputText.setText(userInputText + (inputActive ? '|' : ''));
          inputText.setColor('#FFFFFF');
        } else {
          inputText.setText(inputActive ? '|' : 'Click here to type...');
          inputText.setColor(inputActive ? '#FFFFFF' : '#888888');
        }
      });
      }
      
      // Add elements to the dialogue container
      this.dialogueBox.add(inputFieldBackground);
      this.dialogueBox.add(inputText);
      this.dialogueBox.add(hitArea);
      resultText.setOrigin(0.5);
      resultText.setScrollFactor(0);
      this.dialogueBox.add(resultText);
      
      // Create lookup button with a more prominent appearance
      const lookupButton = this.add.rectangle(
        x,
        y + 80,
        180, // Wider button
        40,  // Taller button
        0x4CAF50, // Green color
        0.5  // More visible
      );
      lookupButton.setScrollFactor(0);
      lookupButton.setStrokeStyle(2, 0x4CAF50, 0.9); // Thicker, more visible stroke
      lookupButton.setInteractive({ useHandCursor: true });
      
      // Add hover and active effects
      lookupButton.on('pointerover', () => {
        lookupButton.fillColor = 0x4CAF50;
        lookupButton.fillAlpha = 0.8;
        lookupButton.setStrokeStyle(2, 0xFFFFFF, 1); // White border on hover
      });
      
      lookupButton.on('pointerout', () => {
        lookupButton.fillColor = 0x4CAF50;
        lookupButton.fillAlpha = 0.5;
        lookupButton.setStrokeStyle(2, 0x4CAF50, 0.9);
      });
      
      // Create a function for the lookup with robust error handling and debugging
      const performLookup = async (inputValue = '') => {
        console.log('Starting ANS lookup process...');
        
        // Use provided input or fallback to test
        let searchName = inputValue.trim();
        let usingFallback = false;
        
        // If input is empty, use fallback
        if (!searchName) {
          searchName = "test";
          console.warn('Empty input, using default test name:', searchName);
          resultText.setText("Using default 'test.ans'");
          usingFallback = true;
        } else {
          console.log('Using provided input value:', searchName);
        }
        
        // Add .ans suffix if missing
        const fullName = searchName.endsWith('.ans') ? searchName : `${searchName}.ans`;
        console.log('Using name for lookup:', fullName);
        
        // Change text color to indicate processing
        resultText.setColor('#FFFFFF');
        
        // Show loading text with animation
        let dots = "";
        const loadingInterval = setInterval(() => {
          dots = dots.length >= 3 ? "" : dots + ".";
          resultText.setText(`Looking up address${dots}`);
        }, 300);
        
        try {
          console.log('Starting API lookup for:', fullName);
          
          // Use the real ANS API
          const address = await this.lookupANSName(fullName);
          console.log('API lookup returned:', address);
          
          // Clear the loading animation
          clearInterval(loadingInterval);
          
          if (address) {
            if (address === "Private Registration") {
              resultText.setText(`✅ ${fullName} is registered with private settings`);
              resultText.setColor('#4CAF50'); // Green color for success
              console.log('Result: Private registration');
            } else {
              // Format the long address with ellipsis in the middle
              const formattedAddress = address.slice(0, 15) + '...' + address.slice(-10);
              resultText.setText(`✅ Address: ${formattedAddress}`);
              resultText.setColor('#4CAF50'); // Green color for success
              console.log('Result: Address found:', formattedAddress);
              
              // Save this search for later
              if (typeof window !== 'undefined') {
                // Store last 5 searches
                try {
                  const searches = JSON.parse(localStorage.getItem('ansSearches') || '[]');
                  searches.unshift({ name: fullName, address });
                  // Keep only the last 5
                  while (searches.length > 5) searches.pop();
                  localStorage.setItem('ansSearches', JSON.stringify(searches));
                  console.log('Search saved to localStorage');
                } catch (storageError) {
                  console.error('Error saving to localStorage:', storageError);
                }
              }
            }
          } else {
            // Name not found
            resultText.setText(`❌ ${fullName} is not registered yet`);
            resultText.setColor('#FF5252'); // Red color for not found
            console.log('Result: Name not found or not registered');
            
            // Add suggestion to register the name
            const suggestion = document.createElement('a');
            suggestion.href = `https://app.aleonames.id/register?name=${fullName.replace('.ans', '')}`;
            suggestion.target = "_blank";
            suggestion.style.color = "#4CAF50";
            suggestion.style.textDecoration = "underline";
            suggestion.innerText = "Register it on aleonames.id";
            
            // If we used a fallback, show clearer message
            if (usingFallback) {
              resultText.setText(`❌ ${fullName} was checked but not found. Please try another name.`);
            } else {
              // Show availability message after a short delay
              setTimeout(() => {
                resultText.setText(`✨ ${fullName} appears to be available!`);
                resultText.setColor('#FFA500'); // Orange for available
              }, 1500);
            }
          }
        } catch (error) {
          // Clear the loading animation
          clearInterval(loadingInterval);
          
          console.error("Error in ANS lookup:", error);
          resultText.setText(`❌ Error looking up address. Please try again.`);
          resultText.setColor('#FF5252'); // Red color for error
        }
        
        // Reset the text input for the next search
        userInputText = "";
        inputText.setText("Click here to type...");
        inputText.setColor('#888888');
        console.log('Input field reset for next search');
      };
      
      // Add click handler with visual feedback and debugging
      lookupButton.on('pointerdown', () => {
        console.log('Lookup button clicked!');
        
        // Visual feedback - darker green when pressed
        lookupButton.fillColor = 0x388E3C;
        lookupButton.fillAlpha = 1;
        
        // Get the current input value from our text field
        const currentInputValue = userInputText || '';
        console.log('Current input value for search:', currentInputValue);
        
        // Call the lookup function with the current input value
        performLookup(currentInputValue);
        
        // Deactivate input field (if active)
        inputActive = false;
        inputFieldBackground.setStrokeStyle(3, 0xFF8C00);
        
        // Add a brief delay and reset the button color
        setTimeout(() => {
          lookupButton.fillColor = 0x4CAF50;
          lookupButton.fillAlpha = 0.5;
        }, 300);
      });
      
      // Add input event to show visual feedback when typing
      if (this.ansLookupInput) {
        this.ansLookupInput.addEventListener('input', () => {
          // Change the lookup button color based on whether there's text
          if (this.ansLookupInput && this.ansLookupInput.value.trim()) {
            lookupButton.fillColor = 0x4CAF50; // Green
            lookupButton.fillAlpha = 0.8;
          } else {
            lookupButton.fillColor = 0x4CAF50;
            lookupButton.fillAlpha = 0.5;
          }
        });
      }
      
      // Add button text with improved visibility
      const lookupText = this.add.text(
        x,
        y + 80,
        "Search ANS Name",
        {
          fontSize: '18px',
          color: '#ffffff',
          align: 'center',
          fontStyle: 'bold'
        }
      );
      lookupText.setOrigin(0.5);
      lookupText.setScrollFactor(0);
      
      this.dialogueBox.add(lookupButton);
      this.dialogueBox.add(lookupText);
      
      // Add back button
      const backButton = this.add.rectangle(
        x,
        y + 130,
        100,
        35,
        0x6495ED,
        0.3
      );
      backButton.setScrollFactor(0);
      backButton.setStrokeStyle(1, 0x6495ED, 0.7);
      backButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect - fixed to use direct property assignment
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
        this.showANSDialogue();
      });
      
      // Add button text
      const backText = this.add.text(
        x,
        y + 130,
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
        this.showANSDialogue();
      });
      
      // Focus the input field
      if (this.ansLookupInput) {
        setTimeout(() => {
          this.ansLookupInput?.focus();
        }, 300);
      }
    });
  }
  
  /**
   * Show address lookup demo
   */
  showAddressLookupDemo() {
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
      bg.setStrokeStyle(2, 0x6495ED, 0.8);
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 150,
        "Address to ANS Name Lookup",
        {
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center'
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      this.dialogueBox.add(title);
      
      // Create description
      const description = this.add.text(
        x,
        y - 120,
        "This demo shows how an Aleo address maps to its primary ANS name",
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'center'
        }
      );
      description.setOrigin(0.5);
      description.setScrollFactor(0);
      this.dialogueBox.add(description);
      
      // Show sample address (prefilled)
      const sampleAddressTitle = this.add.text(
        x,
        y - 80,
        "Sample Aleo address:",
        {
          fontSize: '14px',
          color: '#aaaaaa',
          align: 'center'
        }
      );
      sampleAddressTitle.setOrigin(0.5);
      sampleAddressTitle.setScrollFactor(0);
      this.dialogueBox.add(sampleAddressTitle);
      
      // Create a sample address display
      const sampleAddress = "aleo1s7w83kudhf724hr27gqjazyw48yt9g485ng90vrm0cul0tklyg9qgclz3y";
      const addressValue = this.add.text(
        x,
        y - 50,
        `${sampleAddress.slice(0, 15)}...${sampleAddress.slice(-10)}`,
        {
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
          fontStyle: 'italic'
        }
      );
      addressValue.setOrigin(0.5);
      addressValue.setScrollFactor(0);
      this.dialogueBox.add(addressValue);
      
      // Show result title
      const resultTitle = this.add.text(
        x,
        y - 10,
        "Primary ANS name:",
        {
          fontSize: '16px',
          color: '#aaaaaa',
          align: 'center'
        }
      );
      resultTitle.setOrigin(0.5);
      resultTitle.setScrollFactor(0);
      this.dialogueBox.add(resultTitle);
      
      // Show result value (initially empty)
      const resultValue = this.add.text(
        x,
        y + 20,
        "Click Lookup to check...",
        {
          fontSize: '24px',
          color: '#6495ED',
          align: 'center',
          fontStyle: 'bold'
        }
      );
      resultValue.setOrigin(0.5);
      resultValue.setScrollFactor(0);
      this.dialogueBox.add(resultValue);
      
      // Create lookup button
      const lookupButton = this.add.rectangle(
        x,
        y + 60,
        150,
        35,
        0x6495ED,
        0.3
      );
      lookupButton.setScrollFactor(0);
      lookupButton.setStrokeStyle(1, 0x6495ED, 0.7);
      lookupButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect
      lookupButton.on('pointerover', () => {
        lookupButton.fillColor = 0x6495ED;
        lookupButton.fillAlpha = 0.7;
      });
      
      lookupButton.on('pointerout', () => {
        lookupButton.fillColor = 0x6495ED;
        lookupButton.fillAlpha = 0.3;
      });
      
      // Add click handler
      lookupButton.on('pointerdown', async () => {
        resultValue.setText("Looking up...");
        
        try {
          // Try to look up using the real ANS API
          const name = await this.lookupAddress(sampleAddress);
          
          if (name) {
            resultValue.setText(name);
          } else {
            // Fall back to simulated data
            resultValue.setText("test.ans");
          }
        } catch (error) {
          console.error("Error in address lookup:", error);
          resultValue.setText("Error. Using simulated: test.ans");
        }
      });
      
      // Add button text
      const lookupText = this.add.text(
        x,
        y + 60,
        "Lookup",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center'
        }
      );
      lookupText.setOrigin(0.5);
      lookupText.setScrollFactor(0);
      
      this.dialogueBox.add(lookupButton);
      this.dialogueBox.add(lookupText);
      
      // Show recent searches if available
      if (typeof window !== 'undefined') {
        const searches = JSON.parse(localStorage.getItem('ansSearches') || '[]');
        if (searches.length > 0) {
          // Add history title
          const historyTitle = this.add.text(
            x,
            y + 100,
            "Your Recent Searches:",
            {
              fontSize: '14px',
              color: '#aaaaaa',
              align: 'center'
            }
          );
          historyTitle.setOrigin(0.5);
          historyTitle.setScrollFactor(0);
          this.dialogueBox.add(historyTitle);
          
          // Show up to 3 most recent searches
          const limit = Math.min(searches.length, 3);
          for (let i = 0; i < limit; i++) {
            const search = searches[i];
            const historyItem = this.add.text(
              x,
              y + 125 + (i * 20),
              `${search.name} → ${search.address.slice(0, 10)}...${search.address.slice(-6)}`,
              {
                fontSize: '12px',
                color: '#cccccc',
                align: 'center'
              }
            );
            historyItem.setOrigin(0.5);
            historyItem.setScrollFactor(0);
            this.dialogueBox.add(historyItem);
          }
        }
      }
      
      // Add explanation
      const explanation = this.add.text(
        x,
        y + 180,
        "Much easier to remember and share than a long address!",
        {
          fontSize: '14px',
          color: '#cccccc',
          align: 'center',
          fontStyle: 'italic'
        }
      );
      explanation.setOrigin(0.5);
      explanation.setScrollFactor(0);
      this.dialogueBox.add(explanation);
      
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
        this.showANSDialogue();
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
        this.showANSDialogue();
      });
    });
  }
  
  /**
   * Open the ANS website in a new tab
   */
  openANSWebsite() {
    // Open the ANS website in a new tab
    if (typeof window !== 'undefined') {
      window.open('https://www.aleonames.id/', '_blank');
    }
    
    // Close the dialogue
    this.closeDialogueBox();
    
    // Show a confirmation message
    this.showMessage("Opening ANS website in a new tab!");
  }
  
  /**
   * Close the dialogue box
   */
  closeDialogueBox() {
    if (this.dialogueBox) {
      // Remove DOM elements if they exist
      if (this.ansLookupInput && this.ansLookupInput.parentNode) {
        this.ansLookupInput.parentNode.removeChild(this.ansLookupInput);
        this.ansLookupInput = undefined;
      }
      
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
  
  /**
   * Show the dialogue for claiming a virtual ANS name
   */
  showClaimANSName() {
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
      bg.setStrokeStyle(2, 0x6495ED, 0.8);
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 130,
        "Register Your ANS Name",
        {
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center'
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      this.dialogueBox.add(title);
      
      // Check if player already has an ANS name
      const existingName = typeof window !== 'undefined' ? localStorage.getItem('playerANSName') : null;
      
      // Create description
      const description = this.add.text(
        x,
        y - 90,
        existingName 
          ? `Your current ANS name is ${existingName}. Enter a new one below:`
          : "Choose your own .ans name to use in the game:",
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'center'
        }
      );
      description.setOrigin(0.5);
      description.setScrollFactor(0);
      this.dialogueBox.add(description);
      
      // Note about limitations
      const note = this.add.text(
        x,
        y - 60,
        "Note: This is a game simulation and not a real ANS registration",
        {
          fontSize: '14px',
          color: '#aaaaaa',
          align: 'center',
          fontStyle: 'italic'
        }
      );
      note.setOrigin(0.5);
      note.setScrollFactor(0);
      this.dialogueBox.add(note);
      
      // Create a DOM element for input
      if (this.game.device.os.desktop) {
        // Create an input field using DOM element
        this.ansLookupInput = document.createElement('input');
        this.ansLookupInput.type = 'text';
        this.ansLookupInput.placeholder = 'Enter your preferred name (e.g. hero)';
        this.ansLookupInput.style.width = '300px';
        this.ansLookupInput.style.padding = '8px';
        this.ansLookupInput.style.borderRadius = '4px';
        this.ansLookupInput.style.border = '1px solid #6495ED';
        this.ansLookupInput.style.backgroundColor = '#333333';
        this.ansLookupInput.style.color = '#ffffff';
        this.ansLookupInput.style.textAlign = 'center';
        
        // Add the input to the DOM
        const inputElement = this.add.dom(x, y - 20, this.ansLookupInput);
        inputElement.setScrollFactor(0);
        this.dialogueBox.add(inputElement);
      }
      
      // Add .ans suffix display
      const suffixText = this.add.text(
        x,
        y + 10,
        ".ans",
        {
          fontSize: '18px',
          color: '#6495ED',
          align: 'center',
          fontStyle: 'bold'
        }
      );
      suffixText.setOrigin(0.5);
      suffixText.setScrollFactor(0);
      this.dialogueBox.add(suffixText);
      
      // Create result text (empty at first)
      const resultText = this.add.text(
        x,
        y + 40,
        "",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: 400 }
        }
      );
      resultText.setOrigin(0.5);
      resultText.setScrollFactor(0);
      this.dialogueBox.add(resultText);
      
      // Create register button
      const registerButton = this.add.rectangle(
        x,
        y + 80,
        150,
        35,
        0x6495ED,
        0.3
      );
      registerButton.setScrollFactor(0);
      registerButton.setStrokeStyle(1, 0x6495ED, 0.7);
      registerButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect
      registerButton.on('pointerover', () => {
        registerButton.fillColor = 0x6495ED;
        registerButton.fillAlpha = 0.7;
      });
      
      registerButton.on('pointerout', () => {
        registerButton.fillColor = 0x6495ED;
        registerButton.fillAlpha = 0.3;
      });
      
      // Add click handler
      registerButton.on('pointerdown', () => {
        if (this.ansLookupInput) {
          const name = this.ansLookupInput.value.trim();
          if (name) {
            // Show loading text
            resultText.setText("Registering your name...");
            
            // Simulate a registration process
            setTimeout(() => {
              // Generate a random Aleo address
              const randomAddress = "aleo1" + Array(60).fill(0).map(() => "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 36)]).join('');
              
              // Save to localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem('playerANSName', `${name}.ans`);
                localStorage.setItem('playerAddress', randomAddress);
              }
              
              // Show success message
              resultText.setText(`Congratulations! ${name}.ans is now your in-game ANS name.`);
              
              // Change the button to a "Back" button
              registerButtonText.setText("Back to Menu");
              registerButton.off('pointerdown');
              registerButton.on('pointerdown', () => {
                this.showANSDialogue();
              });
            }, 1500);
          } else {
            resultText.setText("Please enter a name");
          }
        } else {
          // If input isn't available, show error
          resultText.setText("Error: Cannot register on this device");
        }
      });
      
      // Add button text
      const registerButtonText = this.add.text(
        x,
        y + 80,
        "Register Name",
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center'
        }
      );
      registerButtonText.setOrigin(0.5);
      registerButtonText.setScrollFactor(0);
      
      this.dialogueBox.add(registerButton);
      this.dialogueBox.add(registerButtonText);
      
      // Add back button
      const backButton = this.add.rectangle(
        x,
        y + 130,
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
        this.showANSDialogue();
      });
      
      // Add button text
      const backText = this.add.text(
        x,
        y + 130,
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
        this.showANSDialogue();
      });
    });
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
    
    // Clean up DOM elements
    if (this.ansLookupInput && this.ansLookupInput.parentNode) {
      this.ansLookupInput.parentNode.removeChild(this.ansLookupInput);
      this.ansLookupInput = undefined;
    }
    
    // Close any open dialogue
    this.closeDialogueBox();

    // We should NOT clear the localStorage here since we want to 
    // persist the current scene when refreshing the page
    // Only remove all listeners to prevent memory leaks
    this.input.keyboard?.off('keydown-SPACE');
    this.input.keyboard?.off('keydown-ESC');
  }
} 
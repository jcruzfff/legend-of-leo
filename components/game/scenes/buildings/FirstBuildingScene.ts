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

export default class FirstBuildingScene extends Scene {
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
    super({ key: 'FirstBuildingScene' });
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
      'veru-floor-export',
      'veru-cashier',
      'veru-backwall',
      'veru-computers',
      'veru-desk',
      'veru-pool',
      'veru-sticks',
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
      'right-b-edge-corner'
    ];
    
    texturesToLoad.forEach(texture => {
      if (!textureCheck(texture)) {
        this.load.image(texture, `/assets/maps/${texture}.png`);
      }
    });
    
    // Create interaction indicator texture if it doesn't exist
    if (!textureCheck('interaction-indicator')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      // Draw a small white dot with a glow effect
      graphics.fillStyle(0xFFFFFF, 0.8);
      graphics.fillCircle(16, 16, 4);
      // Add a subtle glow/halo
      graphics.fillStyle(0xFFFFFF, 0.3);
      graphics.fillCircle(16, 16, 8);
      graphics.generateTexture('interaction-indicator', 32, 32);
    }
    
    // Load the tilemap
    this.load.tilemapTiledJSON('first-building-tilemap', '/assets/maps/buildings/first-building-tilemap.json');
    
    
    // Create gray brick texture for borders
    this.createGrayBrickTexture();
  }
  
  /**
   * Create a gray brick texture for the building borders
   */
  createGrayBrickTexture() {
    // Skip if texture already exists
    if (this.textures.exists('gray-brick')) {
      return;
    }
    
    const size = 48; // Match the tile size
    
    // Create a canvas texture for the gray brick
    const brickCanvas = this.textures.createCanvas('gray-brick', size, size);
    const ctx = brickCanvas?.getContext();
    
    if (!brickCanvas || !ctx) {
      console.error('Failed to create canvas texture for gray brick');
      return;
    }
    
    // Draw a gray brick texture
    ctx.fillStyle = '#787878'; // Base gray color
    ctx.fillRect(0, 0, size, size);
    
    // Add brick pattern
    ctx.fillStyle = '#686868'; // Darker gray for brick lines
    
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
    ctx.strokeStyle = '#888888'; // Lighter gray for highlights
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    
    // Update the canvas texture
    brickCanvas.refresh();
    
    console.log('Created gray brick texture for borders');
  }
  
  create() {
    // Get entry data
    const data = this.scene.settings.data as {
      fromLevel5?: boolean;
      playerData?: Record<string, unknown>;
      entryDoor?: string;
    } | undefined;
    
    console.log('First Building Scene created with data:', data);
    
    // Set the entry door based on data
    if (data && data.entryDoor) {
      this.entryDoor = data.entryDoor;
    }
    
    // Set background color
    this.cameras.main.setBackgroundColor('#4F3D33');
    
    // Get the building JSON data for fallback
    this.buildingData = this.cache.json.get('first-building-data');
    
    // Load the tilemap using the utility function
    try {
      const { map, layers } = loadTilemap(
        this,
        'first-building-tilemap',
        ['Floor', 'Objects', 'Furniture', 'Backwall', 'Collision'],
        ['Collision'] // Only use the Collision layer for collisions
      );
      
      this.map = map;
      this.layers = layers;
      
      console.log('First building tilemap loaded successfully');
      
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
    let entryY = 750;
    
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
      
      const scale = properties.scale as number || 1;
      const interactionMessage = properties.interactionMessage as string || '';
      
      // Handle based on object type
      switch (object.type) {
        case 'cashier':
          // Create the cashier with extended interaction zone
          this.createCashierWithExtendedZone({
            x,
            y,
            texture: object.name, // Use object name as texture key
            scale,
            interactionMessage
          });
          break;
          
        case 'furniture':
          // Create furniture items
          this.createInteractiveObject({
            x,
            y,
            texture: object.name, // Use object name as texture key
            scale,
            interactionMessage
          });
          break;
          
        default:
          console.warn(`Unknown object type: ${object.type}`);
      }
    });
    
    // Only create the exit points here, not in addition to tilemap exits
    this.createExitPoints();
  }
  
  /**
   * Disable debug visuals for cleaner production visuals
   */
  disableDebugVisuals() {
    // Turn off debug rendering for the physics world
    this.physics.world.debugGraphic.clear();
    this.physics.world.debugGraphic.visible = false;
    
    // Hide any debug visuals from interactive zones
    this.interactiveObjects.forEach(obj => {
      if (obj instanceof Phaser.GameObjects.Rectangle) {
        obj.setFillStyle(0, 0); // Completely transparent
        obj.setStrokeStyle(0, 0); // No stroke
      }
    });
    
    // Ensure no debug outlines on the player's physics body
    if (this.player?.sprite.body) {
      // debugBodyColor exists on ArcadeBody
      this.player.sprite.body.debugBodyColor = 0x00000000; // Fully transparent
    }
  }
  
  /**
   * Load interactive elements from the JSON data
   */
  loadInteractiveElements() {
    if (!this.buildingData) return;
    
    // Load furniture items that need interactivity
    if (this.buildingData.furniture && Array.isArray(this.buildingData.furniture)) {
      this.buildingData.furniture.forEach((item: FurnitureItem) => {
        if (item.isInteractive) {
          this.createInteractiveObject({
            x: item.x,
            y: item.y,
            texture: item.texture,
            scale: item.scale,
            interactionMessage: item.interactionMessage || "Welcome to the Verū building!"
          });
        }
      });
    }
    
    // Add the plant as an interactive object
    const plantInfo = (this.buildingData.collisionAreas || []).find((area: CollisionArea) => 
      area.isInteractive && area.color === "0x33AA33"
    );
    
    if (plantInfo) {
      this.createInteractiveObject({
        x: plantInfo.x,
        y: plantInfo.y,
        texture: 'plant',
        interactionMessage: plantInfo.interactionMessage || "A beautiful and well-maintained plant."
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
    
    const obj = this.add.image(x, y, texture);
    obj.setScale(scale);
    
    // Set a lower depth for furniture and higher for interactive characters
    if (texture.includes('couch') || texture.includes('table') || texture.includes('desk')) {
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
   * Handle player interaction with nearby objects
   */
  interactWithNearbyObject() {
    if (!this.player) return;
    
    // First check for cashier interactions since they have priority
    let interactedWithCashier = false;
    
    this.interactiveObjects.forEach(obj => {
      // Only check for cashier objects
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        getData: (key: string) => unknown;
        texture?: { key?: string };
      };
      
      // Skip if not a cashier
      if (!gameObj.getData('isCashier')) {
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
    
    // Otherwise use the nearest interactive object
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
   * Create a room layout - fallback method if tilemap fails
   */
  createRoom() {
    const roomWidth = 16;
    const roomHeight = 20;
    const tileSize = 48;
    
    // Create walls - without visible bounding boxes
    const graphics = this.add.graphics();
    
    // Floor - replace solid color with tiled floor texture
    const floorTile = this.textures.get('veru-floor-export');
    if (floorTile) {
      // Create a repeating tile pattern for the floor
      for (let x = 1; x < roomWidth - 1; x++) {
        for (let y = 1; y < roomHeight - 1; y++) {
          this.add.image(
            x * tileSize + tileSize / 2, 
            y * tileSize + tileSize / 2, 
            'veru--export'
          ).setDepth(1);
        }
      }
    } else {
      // Fallback to solid color if texture is missing
      graphics.fillStyle(0x334455);
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
   * Create exit points that lead back to the main map
   */
  createExitPoints() {
    // Create a single exit point in the middle of the map
    const mapWidth = this.map ? this.map.widthInPixels : 768; // Default width if no map
    const mapHeight = this.map ? this.map.heightInPixels : 960; // Default height if no map
    
    // Create the middle exit at the bottom of the map - position it very close to the bottom
    const middleX = mapWidth / 2;
    const bottomY = mapHeight - 48; // 48 pixels from the bottom
    
    // Clear any existing exit points (to prevent duplicates)
    this.exitPoints.forEach(zone => zone.destroy());
    this.exitPoints.clear();
    
    // Create only one exit point at the very bottom
    this.createExitPoint('middle', middleX, bottomY);
  }
  
  /**
   * Create a single exit point
   */
  createExitPoint(doorId: string, x: number, y: number) {
    // Create a visible rectangle to show the exit zone with a small opacity
    const visibleZone = this.add.rectangle(x, y, 200, 80, 0x00ffff, 0);
    visibleZone.setStrokeStyle(2, 0xffffff, 0);
    visibleZone.setDepth(1); // Set depth to be above floor but below other objects
    
    // Create the exit zone (wider to make it easier to trigger)
    const exitZone = this.add.zone(x, y, 200, 80);
    exitZone.setData('doorId', doorId);
    exitZone.setData('interactive', true);
    
    // Make the zone a physics object that can be overlapped
    this.physics.world.enable(exitZone);
    
    // Adjust the exit zone's body size and position
    const exitBody = exitZone.body as Phaser.Physics.Arcade.Body;
    exitBody.setSize(200, 80);
    exitBody.setOffset(-100, -40);
    
    // Add overlap detection with the player
    if (this.player) {
      this.physics.add.overlap(this.player.sprite, exitZone, () => {
        // Only trigger once when entering the zone
        if (!this.playerInExitZone || this.currentExitDoor !== doorId) {
          this.playerInExitZone = true;
          this.currentExitDoor = doorId;
          
          // Show a prompt that player has entered exit zone
          this.showExitPrompt();
          
          // Set a timer to exit after staying in the zone
          if (this.exitTimer) {
            this.exitTimer.remove();
          }
          
          this.exitTimer = this.time.delayedCall(800, () => {
            if (this.playerInExitZone && this.currentExitDoor === doorId) {
              this.exitBuilding();
            }
          });
        }
      });
    }
    
    // Store in map
    this.exitPoints.set(doorId, exitZone);
    
    return exitZone;
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
        fromBuilding: 'FirstBuildingScene',
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
   * Create an interaction indicator for an object
   */
  createInteractionIndicator(object: Phaser.GameObjects.GameObject) {
    // Get object position
    let objX = 0;
    let objY = 0;
    
    // Check if this is an object with a separate indicator target
    const indicatorTarget = object.getData('indicatorTarget');
    
    if (indicatorTarget) {
      // Use the target's position
      if ('getCenter' in indicatorTarget) {
        const center = (indicatorTarget as unknown as Phaser.GameObjects.Rectangle).getCenter();
        objX = center.x;
        objY = center.y;
      } else if ('x' in indicatorTarget && 'y' in indicatorTarget) {
        objX = (indicatorTarget as unknown as { x: number }).x;
        objY = (indicatorTarget as unknown as { y: number }).y;
      }
    } else {
      // Use the object's own position
      if ('getCenter' in object) {
        const center = (object as unknown as Phaser.GameObjects.Rectangle).getCenter();
        objX = center.x;
        objY = center.y;
      } else if ('x' in object && 'y' in object) {
        objX = (object as unknown as { x: number }).x;
        objY = (object as unknown as { y: number }).y;
      }
    }
    
    // Position higher above the object
    const indicatorX = objX;
    const indicatorY = objY - 88; // Positioned higher above the object
    
    // Create a dedicated indicator for this object
    const indicator = this.add.sprite(indicatorX, indicatorY, 'interaction-indicator');
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
    
    // Store the indicator in the map, keyed by the interactive object
    this.interactionIndicators.set(object, indicator);
    
    // Start invisible - it will be shown when in range
    indicator.setVisible(false);
    
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
      // Skip if marked as not visible or if it's a doorId (exit point)
      if (obj.getData('visible') === false || obj.getData('doorId')) return;
      
      // Special handling for cashiers with extended zones
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        getData: (key: string) => unknown;
        texture?: { key?: string };
      };
      
      if (gameObj.getData('isCashier')) {
        const interactionZone = gameObj.getData('interactionZone') as Phaser.GameObjects.Zone;
        
        if (interactionZone && this.physics.overlap(this.player!.sprite, interactionZone)) {
          // Player is in the cashier's extended zone, show the indicator
          const indicator = this.interactionIndicators.get(obj);
          if (indicator) {
            indicator.setVisible(true);
            
            // Position the indicator directly above the cashier, not above the zone
            let objX = 0;
            let objY = 0;
            
            if ('x' in obj && 'y' in obj) {
              objX = (obj as unknown as { x: number }).x;
              objY = (obj as unknown as { y: number }).y;
            }
            
            indicator.x = objX;
            indicator.y = objY - 88; // Position higher above the cashier
          }
          
          // Store as the nearest object for interaction
          this.player!.nearestInteractiveObject = obj;
          this.player!.nearestInteractiveObjectDistance = 0; // Priority interaction
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
      
      // Calculate distance to player
      const distance = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y,
        objX, objY
      );
      
      // Get the indicator for this object
      const indicator = this.interactionIndicators.get(obj);
      
      // Show or hide based on distance
      if (indicator && distance < interactDistance && obj.getData('interactive')) {
        indicator.setVisible(true);
        
        // Store reference to the closest object for interaction
        if (distance < this.player!.nearestInteractiveObjectDistance) {
          this.player!.nearestInteractiveObject = obj;
          this.player!.nearestInteractiveObjectDistance = distance;
        }
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
   * Create the cashier with an extended interaction zone
   */
  createCashierWithExtendedZone({
    x,
    y,
    texture,
    scale = 1,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interactionMessage
  }: {
    x: number;
    y: number;
    texture: string;
    scale?: number;
    interactionMessage: string;
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
      // Instead of showing simple message, show Verulink dialogue
      this.showVerulinkDialogue();
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
   * Show Verulink dialogue with multiple options
   */
  showVerulinkDialogue() {
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
      bg.setStrokeStyle(2, 0x4CAF50, 0.9); // Green border for Verulink
      
      // Add the background to the container
      this.dialogueBox.add(bg);
      
      // Create title text
      const title = this.add.text(
        x,
        y - 240,
        "Welcome to Verulink",
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
        "Your Trusted Bridge Between Aleo and Ethereum",
        {
          fontSize: '18px',
          color: '#4CAF50',
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
        "How can I help you learn about cross-chain bridging today?",
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
          text: "What is Verulink?",
          action: () => this.showVerulinkInfoDialogue()
        },
        {
          text: "How to bridge from Ethereum to Aleo",
          action: () => this.showEthToAleoGuide()
        },
        {
          text: "How to bridge from Aleo to Ethereum",
          action: () => this.showAleoToEthGuide()
        },
        {
          text: "Visit Verulink Website",
          action: () => this.openVerulinkWebsite()
        },
        {
          text: "Close",
          action: () => this.closeDialogueBox()
        }
      ];
      
      // Create buttons for each option
      dialogueOptions.forEach((option, index) => {
        const y_pos = y - 110 + (index * 50);
        
        // Create button background - special color for the "Visit Verulink Website" option
        const buttonColor = option.text === "Visit Verulink Website" ? 0x4CAF50 : 0x6495ED; // Green for website, blue for others
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
        if (option.text === "Visit Verulink Website") {
          buttonBg.setStrokeStyle(1, 0x4CAF50, 0.7); // Bright green stroke to match fill
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
          // Use orange for website button, gray for close, blue for others
          if (option.text === "Visit Verulink Website") {
            buttonBg.fillColor = 0x4CAF50; // Green
          } else if (option.text === "Close") {
            buttonBg.fillColor = 0x666666; // Gray
          } else {
            buttonBg.fillColor = 0x6495ED; // Blue
          }
          buttonBg.fillAlpha = 0.7;
        });
        
        buttonBg.on('pointerout', () => {
          // Use orange for website button, gray for close, blue for others
          if (option.text === "Visit Verulink Website") {
            buttonBg.fillColor = 0x4CAF50; // Green
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

      // Add Verulink logo or description at the bottom
      const description = this.add.text(
        x,
        y + 160,
        "Verulink connects Aleo with Ethereum, allowing secure and efficient\ncross-chain transactions for ETH, USDC, and USDT.",
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
   * Show information about Verulink
   */
  showVerulinkInfoDialogue() {
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
      bg.setStrokeStyle(2, 0x4CAF50, 0.8); // Green for Verulink
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 220,
        "About Verulink",
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
        "Verulink is a pioneering solution designed to facilitate secure and efficient cross-chain transactions between the Ethereum and Aleo blockchains.",
        "",
        "Key Features:",
        "",
        "• Bridges ETH, USDC, and USDT between Ethereum and Aleo blockchains",
        "",
        "• Enhanced Privacy: Leverages Aleo's zero-knowledge proofs to keep transactiondetails confidential",
        "",
        "• Security: Uses multi-signature verification, decentralized validator nodes, and compliance with industry standards",
        "",
        "• Interoperability: Enables users to benefit from the strengths of both platforms, expanding the use cases for decentralized applications",
        "",
        "• Flexibility: Designed with generic smart contracts for easy integration with various dApps and future expansions"
      ].join("\n");
      
      const info = this.add.text(
        x,
        y - 10,
        infoText,
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'left',
          wordWrap: { width: 650 }
        }
      );
      info.setOrigin(0.5);
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
        this.showVerulinkDialogue();
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
        this.showVerulinkDialogue();
      });
    });
  }

  /**
   * Show guide for bridging from Ethereum to Aleo
   */
  showEthToAleoGuide() {
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
      bg.setStrokeStyle(2, 0x4CAF50, 0.8);
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 240,
        "Bridging from Ethereum to Aleo",
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
      
      // Create shortened step-by-step guide text
      const stepsText = [
        "Prerequisites:",
        "• MetaMask wallet & Puzzle Wallet",
        "• Small amount of ETH for gas fees",
        "",
        "Step 1: Connect Wallets",
        "• Connect both Ethereum (MetaMask) and Aleo (Puzzle) wallets",
        "",
        "Step 2: Transfer",
        "• Select asset (ETH/USDC/USDT), enter amount & Aleo address",
        "• Confirm in MetaMask",
        "",
        "Step 3: Receive on Aleo",
        "• Click 'Ready to Mint' once verified",
        "• Confirm in Puzzle Wallet and wait for 1-2 minutes",
      ].join("\n");
      
      const steps = this.add.text(
        x,
        y - 30,
        stepsText,
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'left',
          lineSpacing: 5
        }
      );
      steps.setOrigin(0.5);
      steps.setScrollFactor(0);
      this.dialogueBox.add(steps);
      
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
        this.showVerulinkDialogue();
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
      
      // Add next button (to Aleo to Ethereum guide)
      const nextButton = this.add.rectangle(
        x + 110,
        y + 220,
        100,
        35,
        0x4CAF50,
        0.3
      );
      nextButton.setScrollFactor(0);
      nextButton.setStrokeStyle(1, 0x4CAF50, 0.7);
      nextButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect for next button
      nextButton.on('pointerover', () => {
        nextButton.fillColor = 0x4CAF50;
        nextButton.fillAlpha = 0.7;
      });
      
      nextButton.on('pointerout', () => {
        nextButton.fillColor = 0x4CAF50;
        nextButton.fillAlpha = 0.3;
      });
      
      // Add click handler for next button
      nextButton.on('pointerdown', () => {
        this.showAleoToEthGuide();
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
        this.showVerulinkDialogue();
      });
    });
  }

  /**
   * Show guide for bridging from Aleo to Ethereum
   */
  showAleoToEthGuide() {
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
      bg.setStrokeStyle(2, 0x4CAF50, 0.8);
      this.dialogueBox.add(bg);
      
      // Create title
      const title = this.add.text(
        x,
        y - 240,
        "Bridging from Aleo to Ethereum",
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
      
      // Create shortened step-by-step guide text
      const stepsText = [
        "Prerequisites:",
        "• Puzzle & MetaMask and a small amount of credits for gas fees",
        "",
        "Step 1: Connect Wallets",
        "• Connect both Aleo (Puzzle) and Ethereum (MetaMask) wallets",
        "",
        "Step 2: Transfer",
        "• Select your asset (ETH/USDC/USDT)",
        "• Enter amount & Ethereum address",
        "• Start the transcation and confirm in Puzzle Wallet",
        "",
        "Step 3: Burning Process",
        "• Tokens are burned on Aleo blockchain",
        "• Transaction is initiated on Ethereum",
        "",
        "Step 4: Receive on Ethereum",
        "• Click 'Ready to Mint' once verified",
        "• Assets appear in your ETH wallet in 1-2 min"
      ].join("\n");
      
      const steps = this.add.text(
        x,
        y - 20,
        stepsText,
        {
          fontSize: '16px',
          color: '#cccccc',
          align: 'left',
          lineSpacing: 5
        }
      );
      steps.setOrigin(0.5);
      steps.setScrollFactor(0);
      this.dialogueBox.add(steps);
      
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
        this.showEthToAleoGuide();
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
        0x4CAF50,
        0.3
      );
      menuButton.setScrollFactor(0);
      menuButton.setStrokeStyle(1, 0x4CAF50, 0.7);
      menuButton.setInteractive({ useHandCursor: true });
      
      // Add hover effect for menu button
      menuButton.on('pointerover', () => {
        menuButton.fillColor = 0x4CAF50;
        menuButton.fillAlpha = 0.7;
      });
      
      menuButton.on('pointerout', () => {
        menuButton.fillColor = 0x4CAF50;
        menuButton.fillAlpha = 0.3;
      });
      
      // Add click handler for menu button
      menuButton.on('pointerdown', () => {
        this.showVerulinkDialogue();
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
        this.showVerulinkDialogue();
      });
    });
  }

  /**
   * Open the Verulink website in a new tab
   */
  openVerulinkWebsite() {
    // Open the Verulink website in a new tab
    if (typeof window !== 'undefined') {
      window.open('https://bridge.verulink.com/', '_blank');
    }
    
    // Close the dialogue
    this.closeDialogueBox();
    
    // Show a confirmation message
    this.showMessage("Opening Verulink website in a new tab!");
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
  
  update() {
    if (!this.player || !this.cursors) return;
    
    // Update player movement
    this.player.update(this.cursors);
    
    // Check for interactive objects near the player
    this.checkInteractiveObjects();
    
    // Check if player is in an exit zone
    this.checkPlayerInExitZone();
  }

  /**
   * Cleanup resources before destroying the scene
   */
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

    // Close any open dialogue
    this.closeDialogueBox();

    // We should NOT clear the localStorage here since we want to 
    // persist the current scene when refreshing the page
    // Only remove all listeners to prevent memory leaks
    this.input.keyboard?.off('keydown-SPACE');
    this.input.keyboard?.off('keydown-ESC');
  }
} 
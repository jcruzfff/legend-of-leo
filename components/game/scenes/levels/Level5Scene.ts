'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';
import Player from '@/lib/classes/Player';

/**
 * Level5Scene - Aleo Ecosystem Integration
 * 
 * This is the fifth and final level of the Legend of Leo game.
 * Players learn about integrating with the Aleo ecosystem and blockchain.
 */
export default class Level5Scene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private map?: Phaser.Tilemaps.Tilemap;
  private layers?: MapLayers;
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private nearbyObject?: Phaser.GameObjects.GameObject;
  // Remove the shared indicator and track object-specific indicators
  private interactionIndicators: Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Sprite> = new Map();
  private finalNPC?: Phaser.GameObjects.Sprite;
  private backToMainButton?: Phaser.GameObjects.Rectangle;
  private debugCollisions: boolean = false; // Toggle for debugging collisions
  private buildingExitPoints: Map<string, { x: number, y: number, door?: string }> = new Map();
  
  // Mini map properties
  private miniMap?: Phaser.GameObjects.Container;
  private miniMapBg?: Phaser.GameObjects.Rectangle;
  private miniMapPlayer?: Phaser.GameObjects.Rectangle;
  private miniMapSize: number = 120; // Slightly smaller mini map
  private lastPlayerPosition: { x: number, y: number } = { x: 0, y: 0 };
  private playerStationaryTime: number = 0;
  private youAreHereText?: Phaser.GameObjects.Text;
  private miniMapToggleBtn?: Phaser.GameObjects.Container;
  private isMiniMapVisible: boolean = false; // Set initially to false to hide the mini map
  private debugGraphics?: Phaser.GameObjects.Graphics;

  // Add new properties for storing individual door indicators
  private firstBuildingDoorIndicator?: Phaser.GameObjects.Sprite;
  private secondBuildingDoorIndicator?: Phaser.GameObjects.Sprite;
  private thirdBuildingLeftDoorIndicator?: Phaser.GameObjects.Sprite;
  private thirdBuildingRightDoorIndicator?: Phaser.GameObjects.Sprite;
  private randomHouseDoorIndicator?: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: 'Level5Scene' });
  }

  init() {
    // Remove localStorage storage of current scene
    // We don't need it anymore as we're using proper scene navigation
    
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
    
    // Load level 5 tilemap (we'll create this file next)
    this.load.tilemapTiledJSON('level5', '/assets/maps/levels/level5.json');
    
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

    if (!textureCheck('guard-l1')) {
      this.load.image('guard-l1', '/assets/maps/guard-l1.png');
    }
    
    // Load outdoor tiles for level 5
    if (!textureCheck('grass')) {
      this.load.image('grass', '/assets/maps/grass.png');
    }
    
    if (!textureCheck('road')) {
      this.load.image('road', '/assets/maps/road.png');
    }
    
    // Load building for level 5
    if (!textureCheck('firstbuilding')) {
      this.load.image('firstbuilding', '/assets/maps/firstbuilding.png');
    }
    
    if (!textureCheck('secondbuilding')) {
      this.load.image('secondbuilding', '/assets/maps/secondbuilding.png');
    }
    
    if (!textureCheck('thirdbuilding')) {
      this.load.image('thirdbuilding', '/assets/maps/thirdbuilding.png');
    }
    
    if (!textureCheck('randomhouse')) {
      this.load.image('randomhouse', '/assets/maps/randomhouse.png');
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
  }

  create() {
    // Disable physics debugging
    this.physics.world.debugGraphic.clear();
    this.physics.world.debugGraphic.visible = false;
    
    // Set the background color to match the tilemap backgroundColor (sky blue for outdoor level)
    this.cameras.main.setBackgroundColor('#87CEEB');
    
    // Load the tilemap or create a basic level if the map doesn't exist yet
    try {
      console.log('Loading level5 tilemap...');
      const { map, layers } = loadTilemap(
        this,
        'level5',
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
      console.error('Failed to load level5 tilemap:', error);
      // Fall back to creating a programmatic level
      this.createBasicLevel();
    }
    
    // Create player at starting position - updated for the larger map
    const tileSize = 48;
    const startX = 10 * tileSize; 
    const startY = 40 * tileSize;
    this.player = new Player(this, startX, startY);
    
    // Add collision with the Collision layer
    if (this.player && this.layers) {
      addCollision(this, this.player.sprite, this.layers, ['Collision']);
    }
    
    // Add the first building along the middle road
    this.addBuildings();
    
    // Set up input
    this.cursors = this.input?.keyboard?.createCursorKeys();
    
    // Add space key for interactions
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.interactWithNearbyObject();
    });
    
    // Add debug toggle key
    this.input.keyboard?.on('keydown-D', () => {
      this.debugCollisions = !this.debugCollisions;
      console.log(`Debug mode: ${this.debugCollisions ? 'enabled' : 'disabled'}`);
      
      // Show/hide debug graphics
      if (this.debugGraphics) {
        this.debugGraphics.visible = this.debugCollisions;
      }
      
      // Show/hide physics debug
      this.physics.world.debugGraphic.visible = this.debugCollisions;
    });
    
    // Add mini map toggle key
    this.input.keyboard?.on('keydown-M', () => {
      this.isMiniMapVisible = !this.isMiniMapVisible;
      console.log(`Mini map: ${this.isMiniMapVisible ? 'visible' : 'hidden'}`);
      
      if (this.miniMap) {
        this.miniMap.setVisible(this.isMiniMapVisible);
      }
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
    
    // Show welcome message for level 5
    this.showWelcomeMessage();
    
    // Add final NPC
    this.addFinalNPC();

    // Create mini map
    this.createMiniMap();

    // Check for entry from a building
    this.checkBuildingEntry();
    
    // Register building scenes if not already registered
    this.registerBuildingScenes();

    console.log("Level 5 scene fully initialized");
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
   * Create a basic level as fallback if the tilemap doesn't exist yet
   */
  createBasicLevel() {
    // Create a simple level with a fenced area
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
    
    // Create walls around the perimeter
    for (let x = 0; x < levelWidth; x++) {
      // Top and bottom walls
      wallsLayer.putTileAt(0, x, 0);
      wallsLayer.putTileAt(0, x, levelHeight - 1);
    }
    
    for (let y = 0; y < levelHeight; y++) {
      // Left and right walls
      wallsLayer.putTileAt(0, 0, y);
      wallsLayer.putTileAt(0, levelWidth - 1, y);
    }
    
    // Add some interior structures for variety
    for (let x = 5; x < 8; x++) {
      for (let y = 5; y < 8; y++) {
        if (x === 5 || x === 7 || y === 5 || y === 7) {
          wallsLayer.putTileAt(0, x, y);
        }
      }
    }
    
    // Set collision for wall layer
    wallsLayer.setCollisionByExclusion([-1]);
  }
  
  /**
   * Show welcome message for level 5
   */
  showWelcomeMessage() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const welcomeText = this.add.text(
      width / 2,
      height / 2,
      "Welcome to the Level 5\nAleo the Ecosystem",
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
   * Add the final NPC that congratulates the player
   */
  addFinalNPC() {
    const tileSize = 48;
    const npcX = 23 * tileSize;
    const npcY = 25 * tileSize;

    // Create the NPC sprite
    this.finalNPC = this.add.sprite(npcX, npcY, 'guard-l1');
    this.finalNPC.setDepth(5);
    
    // Make the NPC interactive
    this.finalNPC.setInteractive({ useHandCursor: true });
    this.finalNPC.setData('interactive', true);
    this.finalNPC.setData('onInteract', () => {
      this.showFinalDialogue();
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(this.finalNPC);
    
    // Create a dedicated indicator for the NPC
    this.createInteractionIndicator(this.finalNPC);
    
    console.log('Added final NPC at:', npcX, npcY);
  }

  /**
   * Show the final dialogue and congratulations
   */
  showFinalDialogue() {
    // Create a dialogue box with congratulations
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const dialogueBox = this.add.rectangle(
      width / 2,
      height / 2,
      width - 100,
      height - 200,
      0x000000,
      0.8
    );
    dialogueBox.setScrollFactor(0);
    dialogueBox.setOrigin(0.5);
    dialogueBox.setStrokeStyle(2, 0xFFFFFF);
    dialogueBox.setDepth(1000);
    
    const congratsText = this.add.text(
      width / 2,
      height / 2 - 100,
      "Congratulations!",
      {
        fontSize: '32px',
        color: '#FFFF00',
        align: 'center'
      }
    );
    congratsText.setScrollFactor(0);
    congratsText.setOrigin(0.5);
    congratsText.setDepth(1000);
    
    const message = "You have completed all levels of Legend of Leo!\n\nYou've learned about privacy principles, data protection,\nand how Aleo's blockchain technology enables private applications.\n\nYou are now ready to build private applications using Aleo.";
    
    const detailsText = this.add.text(
      width / 2,
      height / 2,
      message,
      {
        fontSize: '18px',
        color: '#FFFFFF',
        align: 'center'
      }
    );
    detailsText.setScrollFactor(0);
    detailsText.setOrigin(0.5);
    detailsText.setDepth(1000);
    
    // Add a button to return to the main menu
    this.backToMainButton = this.add.rectangle(
      width / 2,
      height / 2 + 120,
      200,
      50,
      0x4CAF50
    );
    this.backToMainButton.setScrollFactor(0);
    this.backToMainButton.setInteractive({ useHandCursor: true });
    this.backToMainButton.setDepth(1000);
    
    const buttonText = this.add.text(
      width / 2,
      height / 2 + 120,
      "Return to Main Menu",
      {
        fontSize: '16px',
        color: '#FFFFFF'
      }
    );
    buttonText.setScrollFactor(0);
    buttonText.setOrigin(0.5);
    buttonText.setDepth(1000);
    
    // Group all elements for easier cleanup
    const dialogueGroup = this.add.group([
      dialogueBox, congratsText, detailsText, 
      this.backToMainButton, buttonText
    ]);
    
    // Handle the button click
    this.backToMainButton.on('pointerdown', () => {
      // Clean up the dialogue
      dialogueGroup.destroy(true);
      
      // Transition back to the main menu
      this.returnToMainMenu();
    });
  }
  
  /**
   * Return to the main menu
   */
  returnToMainMenu() {
    // Fade out effect
    this.cameras.main.fade(1000, 0, 0, 0);
    
    // Wait for fade to complete then change scene
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainScene');
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
   * Check for nearby interactive objects
   */
  checkForNearbyObjects() {
    if (!this.player || this.interactiveObjects.length === 0) return;
    
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;
    let nearestObject: Phaser.GameObjects.GameObject | undefined;
    let shortestDistance = 100; // Interaction range
    
    // First, hide all indicators EXCEPT building door indicators
    this.interactionIndicators.forEach((indicator, obj) => {
      // Skip building entrance indicators - they should stay visible
      if (obj.getData('isEntrance') === true) {
        return;
      }
      indicator.setVisible(false);
    });
    
    // Check distance to each interactive object
    this.interactiveObjects.forEach(obj => {
      if (!obj.active) return;
      
      // Define a type with x and y properties
      interface PositionComponent {
        x: number;
        y: number;
      }
      
      // Get object position with safer casting
      const position = (obj as unknown) as PositionComponent;
      const objX = position.x;
      const objY = position.y;
      
      // Calculate distance
      const distance = Phaser.Math.Distance.Between(playerX, playerY, objX, objY);
      
      // Get indicator for this object
      const indicator = this.interactionIndicators.get(obj);
      
      // If in interaction range, update nearest object
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestObject = obj;
      }
      
      // Update indicator visibility based on distance
      if (indicator && obj.getData('isEntrance') === true) {
        const interactionRange = 80; // Slightly larger than the nearest check
        // We still want to animate the door indicators when near, but never hide them
        if (distance < interactionRange) {
          // Make it pulse more vigorously when very close
          if (distance < 60) {
            indicator.setAlpha(0.8 + Math.sin(this.time.now / 150) * 0.2);
            indicator.setScale(1.3 + Math.sin(this.time.now / 200) * 0.1);
          } else {
            indicator.setAlpha(0.7 + Math.sin(this.time.now / 250) * 0.2);
            indicator.setScale(1.2 + Math.sin(this.time.now / 300) * 0.05);
          }
        }
      } else if (indicator && distance < shortestDistance) {
        // For non-entrance objects, only show indicator when in range
        indicator.setVisible(true);
      }
    });
    
    // Update the nearest object reference
    this.nearbyObject = nearestObject;
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
   * Create a mini map in the bottom left corner
   */
  createMiniMap() {
    if (!this.map || !this.player) return;
    
    // Get map dimensions
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    
    // Create a container for the mini map elements
    this.miniMap = this.add.container(20, this.cameras.main.height - 20);
    this.miniMap.setScrollFactor(0); // Fix to the camera
    this.miniMap.setDepth(1000); // Ensure it appears above other elements
    
    // Create background for the mini map
    this.miniMapBg = this.add.rectangle(
      0, 
      0, 
      this.miniMapSize, 
      this.miniMapSize, 
      0x87CEEB, // Sky blue background to match the level
      0.7
    );
    this.miniMapBg.setOrigin(0, 1); // Anchor to bottom left
    this.miniMap.add(this.miniMapBg);
    
    // Calculate the scale ratio between the mini map and the actual map
    const scaleX = this.miniMapSize / mapWidth;
    const scaleY = this.miniMapSize / mapHeight;
    
    // Get the actual road tiles from the map
    const floorLayer = this.map.getLayer('Floor');
    if (floorLayer && floorLayer.data) {
      for (let y = 0; y < floorLayer.data.length; y++) {
        for (let x = 0; x < floorLayer.data[y].length; x++) {
          const tile = floorLayer.data[y][x];
          if (tile.index === 6) { // Index 6 is road tile
            // Create a small rect for each road tile
            const roadTile = this.add.rectangle(
              x * 48 * scaleX, // Scale the x position to fit mini map
              -this.miniMapSize + y * 48 * scaleY, // Scale the y position to fit mini map, adjusted for the origin
              2, // Small width 
              2, // Small height
              0x555555, // Darker gray for roads
              1
            );
            roadTile.setOrigin(0, 0);
            this.miniMap.add(roadTile);
          }
        }
      }
    }
    
    // Add buildings to the mini map
    // First building
    const buildingX = 15 * 48 * scaleX; // Same position as in the world but scaled
    const buildingY = -this.miniMapSize + 10 * 48 * scaleY; // Adjusted for the origin
    const buildingSize = 7; // Size of the building marker on the mini map
    
    const buildingMarker = this.add.rectangle(
      buildingX,
      buildingY,
      buildingSize,
      buildingSize,
      0x663300, // Brown color for the building
      1
    );
    buildingMarker.setOrigin(0.5);
    this.miniMap.add(buildingMarker);
    
    // Second building
    const secondBuildingX = 37 * 48 * scaleX; // Same position as in the world but scaled
    const secondBuildingY = -this.miniMapSize + 15 * 48 * scaleY; // Adjusted for the origin
    
    const secondBuildingMarker = this.add.rectangle(
      secondBuildingX,
      secondBuildingY,
      buildingSize,
      buildingSize,
      0x993300, // Slightly different brown for the second building
      1
    );
    secondBuildingMarker.setOrigin(0.5);
    this.miniMap.add(secondBuildingMarker);
    
    // Third building
    const thirdBuildingX = 25 * 48 * scaleX; // Same position as in the world but scaled
    const thirdBuildingY = -this.miniMapSize + 40 * 48 * scaleY; // Adjusted for the origin
    
    const thirdBuildingMarker = this.add.rectangle(
      thirdBuildingX,
      thirdBuildingY,
      buildingSize,
      buildingSize,
      0x884400, // Different brown for the third building
      1
    );
    thirdBuildingMarker.setOrigin(0.5);
    this.miniMap.add(thirdBuildingMarker);
    
    // Random house
    const randomHouseX = (22 - 15) * 48 * scaleX; // 15 tiles to the left of the third building
    const randomHouseY = thirdBuildingY; // Same Y-coordinate as the third building
    
    const randomHouseMarker = this.add.rectangle(
      randomHouseX,
      randomHouseY,
      buildingSize,
      buildingSize,
      0x774411, // Different brown shade for the random house
      1
    );
    randomHouseMarker.setOrigin(0.5);
    this.miniMap.add(randomHouseMarker);
    
    // Create player indicator for the mini map
    this.miniMapPlayer = this.add.rectangle(
      0, 
      0, 
      4, // Width of player indicator
      4, // Height of player indicator
      0xff0000, // Red color for player
      1
    );
    this.miniMapPlayer.setOrigin(0.5, 0.5);
    this.miniMap.add(this.miniMapPlayer);
    
    // Save initial player position
    this.lastPlayerPosition = {
      x: this.player.sprite.x,
      y: this.player.sprite.y
    };
    
    // Add "You are here" text (initially hidden)
    this.youAreHereText = this.add.text(
      0,
      -15,
      "You are here",
      {
        fontSize: '10px',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    this.youAreHereText.setOrigin(0.5, 1);
    this.youAreHereText.setVisible(false);
    this.miniMap.add(this.youAreHereText);
    
    // Add toggle button for the mini map
    this.createMiniMapToggleButton();
    
    // Apply the initial visibility setting
    if (!this.isMiniMapVisible) {
      this.miniMap.setVisible(false);
    }
  }
  
  /**
   * Create a toggle button for the mini map
   */
  createMiniMapToggleButton() {
    // Position toggle button at top-right of mini map
    const toggleX = this.miniMapBg!.x + this.miniMapSize - 5;
    const toggleY = this.miniMapBg!.y - this.miniMapSize + 5;
    
    // Create container for toggle button elements
    this.miniMapToggleBtn = this.add.container(toggleX, toggleY);
    this.miniMapToggleBtn.setScrollFactor(0);
    this.miniMap?.add(this.miniMapToggleBtn);
    
    // Create background for toggle button
    const toggleBg = this.add.circle(0, 0, 10, 0x000000, 0.6);
    toggleBg.setInteractive({ useHandCursor: true });
    this.miniMapToggleBtn.add(toggleBg);
    
    // Create icon
    const icon = this.add.text(0, 0, "×", {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    });
    icon.setOrigin(0.5);
    this.miniMapToggleBtn.add(icon);
    
    // Add click handler to toggle mini map visibility
    toggleBg.on('pointerdown', () => {
      this.toggleMiniMap();
    });
  }
  
  /**
   * Toggle mini map visibility
   */
  toggleMiniMap() {
    if (!this.miniMap) return;
    
    this.isMiniMapVisible = !this.isMiniMapVisible;
    
    // Toggle visibility of all elements except the toggle button
    this.miniMap.list.forEach(item => {
      if (item !== this.miniMapToggleBtn) {
        // Use type assertion with unknown intermediate step
        ((item as unknown) as { setVisible: (visible: boolean) => void }).setVisible(this.isMiniMapVisible);
      }
    });
    
    // Update toggle button icon
    if (this.miniMapToggleBtn) {
      const icon = this.miniMapToggleBtn.list[1] as Phaser.GameObjects.Text;
      if (icon) {
        icon.setText(this.isMiniMapVisible ? "×" : "☰");
      }
    }
  }
  
  /**
   * Update the player's position on the mini map
   */
  updateMiniMapPlayer(delta: number) {
    if (!this.player || !this.miniMapPlayer || !this.map || !this.youAreHereText) return;
    
    // Calculate the scale ratio between the mini map and the actual map
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    const scaleX = this.miniMapSize / mapWidth;
    const scaleY = this.miniMapSize / mapHeight;
    
    // Calculate player position on mini map
    const miniMapX = this.player.sprite.x * scaleX;
    const miniMapY = -this.miniMapSize + this.player.sprite.y * scaleY;
    
    // Update mini map player position
    this.miniMapPlayer.setPosition(miniMapX, miniMapY);
    
    // Update "You are here" text position
    this.youAreHereText.setPosition(miniMapX, miniMapY - 5);
    
    // Check if player has moved
    const distance = Phaser.Math.Distance.Between(
      this.lastPlayerPosition.x,
      this.lastPlayerPosition.y,
      this.player.sprite.x,
      this.player.sprite.y
    );
    
    // If player is moving, reset stationary timer
    if (distance > 1) {
      this.playerStationaryTime = 0;
      this.lastPlayerPosition.x = this.player.sprite.x;
      this.lastPlayerPosition.y = this.player.sprite.y;
      this.youAreHereText.setVisible(false);
    } else {
      // If player is stationary, increment timer
      this.playerStationaryTime += delta;
      
      // Show "You are here" after 2 seconds of being stationary
      if (this.playerStationaryTime > 2000 && this.playerStationaryTime < 5000) {
        this.youAreHereText.setVisible(true);
      } else if (this.playerStationaryTime >= 5000) {
        this.youAreHereText.setVisible(false);
      }
    }
  }

  /**
   * Update - called each frame
   */
  update(time: number, delta: number) {
    // Update player movement if player exists
    if (this.player && this.cursors) {
      this.player.update(this.cursors);
    }
    
    // Update mini map player position only if mini map is visible
    if (this.miniMap && this.isMiniMapVisible) {
      this.updateMiniMapPlayer(delta);
    }
    
    // Check for nearby objects
    this.checkForNearbyObjects();
    
    // Update debug visualizations if enabled
    if (this.debugCollisions) {
      this.drawDebugCollisions();
    }
  }
  
  /**
   * Clean up any game objects when the scene shuts down
   */
  shutdown() {
    // We should NOT clear the localStorage here since we want to 
    // persist the current scene when refreshing the page
    
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
      keyboard.off('keydown-D');
      keyboard.off('keydown-M');
    }
  }

  /**
   * Add buildings to the level
   */
  addBuildings() {
    const tileSize = 48;
    
    // Add the first building - position it near the middle road (around rows 43-45)
    // We'll place it to the right of the vertical road that runs through the middle
    const buildingX = 20 * tileSize; // To the right of the vertical road at column 9-10
    const buildingY = 10 * tileSize; // Along the middle horizontal road at rows 43-45
    
    const firstBuilding = this.add.image(buildingX, buildingY, 'firstbuilding');
    firstBuilding.setOrigin(0.5); // Center the origin
    firstBuilding.setDepth(5); // Set depth to show above the ground but below some other elements
    
    // Make the building interactive but without visible indicator
    firstBuilding.setInteractive({ useHandCursor: true });
    firstBuilding.setData('interactive', true);
    firstBuilding.setData('onInteract', () => {
      this.showBuildingInfo("First Building", "This is the first building in our outdoor area. It's positioned along the main road.");
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(firstBuilding);
    
    console.log('Added first building at:', buildingX, buildingY);
    
    // First building door position
    const firstBuildingDoorX = buildingX;
    const firstBuildingDoorY = buildingY + 300; // Increased from +30 to +90 to position at bottom door
    
    const firstBuildingDoor = this.add.rectangle(firstBuildingDoorX, firstBuildingDoorY, 30, 30, 0x000000, 0.1);
    firstBuildingDoor.setOrigin(0.5);
    firstBuildingDoor.setInteractive({ useHandCursor: true });
    firstBuildingDoor.setData('interactive', true);
    firstBuildingDoor.setData('isEntrance', true); // Mark as entrance door
    firstBuildingDoor.setData('onInteract', () => {
      this.enterBuilding('FirstBuildingScene', { x: firstBuildingDoorX, y: firstBuildingDoorY });
    });
    
    // Add door to interactive objects
    this.interactiveObjects.push(firstBuildingDoor);
    
    // Create indicator ONLY for the door
    this.firstBuildingDoorIndicator = this.createDoorIndicator(firstBuildingDoor, firstBuildingDoorX, firstBuildingDoorY - 40);
    this.firstBuildingDoorIndicator.setVisible(true); // Always visible
    
    console.log('Added first building door at:', firstBuildingDoorX, firstBuildingDoorY);
    
    // Add the second building - about 5 columns to the right on the same street
    const secondBuildingX = (30 + 7) * tileSize; // 5 columns to the right of the first building
    const secondBuildingY = 15 * tileSize; // Same row as the first building
    
    const secondBuilding = this.add.image(secondBuildingX, secondBuildingY, 'secondbuilding');
    secondBuilding.setOrigin(0.5);
    secondBuilding.setDepth(5);
    
    // Make the second building interactive but without visible indicator
    secondBuilding.setInteractive({ useHandCursor: true });
    secondBuilding.setData('interactive', true);
    secondBuilding.setData('onInteract', () => {
      this.showBuildingInfo("Second Building", "This is the second building in our outdoor area, located down the street from the first building.");
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(secondBuilding);
    
    console.log('Added second building at:', secondBuildingX, secondBuildingY);
    
    // Second building door position 
    const secondBuildingDoorX = secondBuildingX;
    const secondBuildingDoorY = secondBuildingY + 300; // Increased from +30 to +90 to position at bottom door
    
    const secondBuildingDoor = this.add.rectangle(secondBuildingDoorX, secondBuildingDoorY, 30, 30, 0x000000, 0.1);
    secondBuildingDoor.setOrigin(0.5);
    secondBuildingDoor.setInteractive({ useHandCursor: true });
    secondBuildingDoor.setData('interactive', true);
    secondBuildingDoor.setData('isEntrance', true); // Mark as entrance door
    secondBuildingDoor.setData('onInteract', () => {
      this.enterBuilding('SecondBuildingScene', { x: secondBuildingDoorX, y: secondBuildingDoorY });
    });
    
    // Add door to interactive objects
    this.interactiveObjects.push(secondBuildingDoor);
    
    // Create indicator ONLY for the door
    this.secondBuildingDoorIndicator = this.createDoorIndicator(secondBuildingDoor, secondBuildingDoorX, secondBuildingDoorY - 40);
    this.secondBuildingDoorIndicator.setVisible(true); // Always visible
    
    console.log('Added second building door at:', secondBuildingDoorX, secondBuildingDoorY);
    
    // Add the third building - about 20 tiles below the first building
    const thirdBuildingX = 22 * tileSize; // Same column as the first building
    const thirdBuildingY = (20 + 15) * tileSize; // 20 tiles below the first building
    
    const thirdBuilding = this.add.image(thirdBuildingX, thirdBuildingY, 'thirdbuilding');
    thirdBuilding.setOrigin(0.5);
    thirdBuilding.setDepth(5);
    // Make the third building 20% smaller while maintaining aspect ratio
    thirdBuilding.setScale(0.8);
    
    // Make the third building interactive but without visible indicator
    thirdBuilding.setInteractive({ useHandCursor: true });
    thirdBuilding.setData('interactive', true);
    thirdBuilding.setData('onInteract', () => {
      this.showBuildingInfo("Third Building", "This is the third building in our outdoor area, located south of the first building.");
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(thirdBuilding);
    
    console.log('Added third building at:', thirdBuildingX, thirdBuildingY);
    
    // Third building doors positions
    const thirdBuildingDoor1X = thirdBuildingX - 120; // Left door, adjusted position
    const thirdBuildingDoor1Y = thirdBuildingY + 340; // Increased from +45 to +120 to position at bottom door
    
    const thirdBuildingDoor1 = this.add.rectangle(thirdBuildingDoor1X, thirdBuildingDoor1Y, 30, 30, 0x000000, 0.1);
    thirdBuildingDoor1.setOrigin(0.5);
    thirdBuildingDoor1.setInteractive({ useHandCursor: true });
    thirdBuildingDoor1.setData('interactive', true);
    thirdBuildingDoor1.setData('isEntrance', true); // Mark as entrance door
    thirdBuildingDoor1.setData('onInteract', () => {
      // Store the exit position for the left door with a special key
      this.buildingExitPoints.set('ThirdBuildingScene-left', { x: thirdBuildingDoor1X, y: thirdBuildingDoor1Y });
      this.enterBuilding('ThirdBuildingScene', { x: thirdBuildingDoor1X, y: thirdBuildingDoor1Y, door: 'left' });
    });
    
    // Add door to interactive objects
    this.interactiveObjects.push(thirdBuildingDoor1);
    
    // Create indicator for the first door
    this.thirdBuildingLeftDoorIndicator = this.createDoorIndicator(thirdBuildingDoor1, thirdBuildingDoor1X, thirdBuildingDoor1Y - 40);
    this.thirdBuildingLeftDoorIndicator.setVisible(true); // Always visible
    
    console.log('Added third building left door at:', thirdBuildingDoor1X, thirdBuildingDoor1Y);
    
    // Right door of third building
    const thirdBuildingDoor2X = thirdBuildingX + 110; // Right door, adjusted position
    const thirdBuildingDoor2Y = thirdBuildingY + 340; // Increased from +45 to +120 to position at bottom door
    
    const thirdBuildingDoor2 = this.add.rectangle(thirdBuildingDoor2X, thirdBuildingDoor2Y, 30, 30, 0x000000, 0.6);
    thirdBuildingDoor2.setOrigin(0.5);
    thirdBuildingDoor2.setInteractive({ useHandCursor: true });
    thirdBuildingDoor2.setData('interactive', true);
    thirdBuildingDoor2.setData('isEntrance', true); // Mark as entrance door
    thirdBuildingDoor2.setData('onInteract', () => {
      // Store the exit position for the right door with a special key
      this.buildingExitPoints.set('ThirdBuildingScene-right', { x: thirdBuildingDoor2X, y: thirdBuildingDoor2Y });
      this.enterBuilding('ThirdBuildingScene', { x: thirdBuildingDoor2X, y: thirdBuildingDoor2Y, door: 'right' });
    });
    
    // Add door to interactive objects
    this.interactiveObjects.push(thirdBuildingDoor2);
    
    // Create indicator for the second door
    this.thirdBuildingRightDoorIndicator = this.createDoorIndicator(thirdBuildingDoor2, thirdBuildingDoor2X, thirdBuildingDoor2Y - 40);
    this.thirdBuildingRightDoorIndicator.setVisible(true); // Always visible
    
    console.log('Added third building right door at:', thirdBuildingDoor2X, thirdBuildingDoor2Y);
    
    // Add the random house - 15 tiles to the left of the third building on the same street
    const randomHouseX = (22 - 18) * tileSize; // 15 tiles to the left of the third building
    const randomHouseY = thirdBuildingY; // Same Y-coordinate as the third building
    
    const randomHouse = this.add.image(randomHouseX, randomHouseY, 'randomhouse');
    randomHouse.setOrigin(0.5);
    randomHouse.setDepth(5);
    
    // Make the random house interactive but without visible indicator
    randomHouse.setInteractive({ useHandCursor: true });
    randomHouse.setData('interactive', true);
    randomHouse.setData('onInteract', () => {
      this.showBuildingInfo("Random House", "This is a random house that appeared in the neighborhood. It's located on the same street as the third building.");
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(randomHouse);
    
    console.log('Added random house at:', randomHouseX, randomHouseY);
    
    // Random house door
    const randomHouseDoorX = randomHouseX - 24;
    const randomHouseDoorY = randomHouseY + 220; // Increased from +30 to +90 to position at bottom door
    
    const randomHouseDoor = this.add.rectangle(randomHouseDoorX, randomHouseDoorY, 30, 30, 0x000000, 0.1);
    randomHouseDoor.setOrigin(0.5);
    randomHouseDoor.setInteractive({ useHandCursor: true });
    randomHouseDoor.setData('interactive', true);
    randomHouseDoor.setData('isEntrance', true); // Mark as entrance door
    randomHouseDoor.setData('onInteract', () => {
      this.enterBuilding('RandomHouseScene', { x: randomHouseDoorX, y: randomHouseDoorY });
    });
    
    // Add door to interactive objects
    this.interactiveObjects.push(randomHouseDoor);
    
    // Create indicator for the door
    this.randomHouseDoorIndicator = this.createDoorIndicator(randomHouseDoor, randomHouseDoorX, randomHouseDoorY - 40);
    this.randomHouseDoorIndicator.setVisible(true); // Always visible
    
    console.log('Added random house door at:', randomHouseDoorX, randomHouseDoorY);
  }
  
  /**
   * Show information about a building when interacted with
   */
  showBuildingInfo(title: string, description: string) {
    // Create a small popup with building information
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const infoBox = this.add.rectangle(
      width / 2,
      height / 2,
      width / 2,
      height / 4,
      0x000000,
      0.8
    );
    infoBox.setScrollFactor(0);
    infoBox.setOrigin(0.5);
    infoBox.setStrokeStyle(2, 0xFFFFFF);
    infoBox.setDepth(1000);
    
    const titleText = this.add.text(
      width / 2,
      height / 2 - height / 12,
      title,
      {
        fontSize: '24px',
        color: '#FFFFFF',
        align: 'center'
      }
    );
    titleText.setScrollFactor(0);
    titleText.setOrigin(0.5);
    titleText.setDepth(1000);
    
    const descText = this.add.text(
      width / 2,
      height / 2 + height / 24,
      description,
      {
        fontSize: '16px',
        color: '#FFFFFF',
        align: 'center',
        wordWrap: { width: width / 2.5 }
      }
    );
    descText.setScrollFactor(0);
    descText.setOrigin(0.5);
    descText.setDepth(1000);
    
    // Group all elements for easier cleanup
    const infoGroup = this.add.group([infoBox, titleText, descText]);
    
    // Add click handler to dismiss
    this.input.once('pointerdown', () => {
      infoGroup.destroy(true);
    });
    
    // Also dismiss after a few seconds
    this.time.delayedCall(5000, () => {
      infoGroup.destroy(true);
    });
  }

  /**
   * Draw debug visualizations if enabled
   */
  drawDebugCollisions() {
    if (!this.player || !this.map) return;
    
    // Clear previous debug graphics
    if (!this.debugGraphics) {
      this.debugGraphics = this.add.graphics();
    } else {
      this.debugGraphics.clear();
    }
    
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Interaction range
    
    // Draw interaction range circle
    this.debugGraphics.lineStyle(1, 0xff0000, 0.5);
    this.debugGraphics.strokeCircle(playerPos.x, playerPos.y, interactDistance);
    
    // Draw nearby objects
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
      
      const distance = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, objX, objY);
      
      if (distance < interactDistance) {
        this.debugGraphics?.lineStyle(2, 0x00ff00, 0.8);
        this.debugGraphics?.strokeCircle(objX, objY, 10);
      }
    });
  }

  /**
   * Check if we're entering from a building and set the player position accordingly
   */
  checkBuildingEntry() {
    // Use type assertion to define the expected data structure
    const data = this.scene.settings.data as { 
      fromBuilding?: string;
      exitDoor?: string;
    } | undefined;
    
    if (data && data.fromBuilding) {
      // We're returning from a building, so place the player at the exit point
      const exitPoint = this.buildingExitPoints.get(data.fromBuilding);
      if (exitPoint && this.player) {
        let exitX = exitPoint.x;
        let exitY = exitPoint.y;
        
        // Handle special case for third building with multiple doors
        if (data.fromBuilding === 'ThirdBuildingScene' && data.exitDoor) {
          // Adjust position based on which door the player is exiting from
          if (data.exitDoor === 'left') {
            // Use the left door position stored in buildingExitPoints
            const leftDoorPoint = this.buildingExitPoints.get('ThirdBuildingScene-left');
            if (leftDoorPoint) {
              exitX = leftDoorPoint.x;
              exitY = leftDoorPoint.y;
            }
          } else if (data.exitDoor === 'right') {
            // Use the right door position stored in buildingExitPoints
            const rightDoorPoint = this.buildingExitPoints.get('ThirdBuildingScene-right');
            if (rightDoorPoint) {
              exitX = rightDoorPoint.x;
              exitY = rightDoorPoint.y;
            }
          }
        }
        
        console.log(`Returning from ${data.fromBuilding} to position:`, exitX, exitY);
        this.player.sprite.setPosition(exitX, exitY);
      }
    }
  }
  
  /**
   * Register all building scenes
   */
  registerBuildingScenes() {
    // Register scenes sequentially to avoid conflicts
    this.registerFirstBuildingScene()
      .then(() => this.registerSecondBuildingScene())
      .then(() => this.registerThirdBuildingScene())
      .then(() => this.registerRandomHouseScene())
      .then(() => {
        console.log('All building scenes registered successfully');
      })
      .catch(error => {
        console.error('Error in scene registration chain:', error);
      });
  }

  /**
   * Register FirstBuildingScene
   */
  private registerFirstBuildingScene(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene.get('FirstBuildingScene')) {
        console.log('Registering FirstBuildingScene...');
        import('@/components/game/scenes/buildings/FirstBuildingScene')
          .then(module => {
            const FirstBuildingScene = module.default;
            this.scene.add('FirstBuildingScene', new FirstBuildingScene(), false);
            console.log('Successfully registered FirstBuildingScene');
            resolve();
          })
          .catch(error => {
            console.error('Error loading FirstBuildingScene:', error);
            resolve(); // Continue to next scene even if this one fails
          });
      } else {
        console.log('FirstBuildingScene already registered');
        resolve();
      }
    });
  }

  /**
   * Register SecondBuildingScene
   */
  private registerSecondBuildingScene(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene.get('SecondBuildingScene')) {
        console.log('Registering SecondBuildingScene...');
        import('@/components/game/scenes/buildings/SecondBuildingScene')
          .then(module => {
            const SecondBuildingScene = module.default;
            this.scene.add('SecondBuildingScene', new SecondBuildingScene(), false);
            console.log('Successfully registered SecondBuildingScene');
            resolve();
          })
          .catch(error => {
            console.error('Error loading SecondBuildingScene:', error);
            resolve(); // Continue to next scene even if this one fails
          });
      } else {
        console.log('SecondBuildingScene already registered');
        resolve();
      }
    });
  }

  /**
   * Register ThirdBuildingScene
   */
  private registerThirdBuildingScene(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene.get('ThirdBuildingScene')) {
        console.log('Registering ThirdBuildingScene...');
        import('@/components/game/scenes/buildings/ThirdBuildingScene')
          .then(module => {
            const ThirdBuildingScene = module.default;
            this.scene.add('ThirdBuildingScene', new ThirdBuildingScene(), false);
            console.log('Successfully registered ThirdBuildingScene');
            resolve();
          })
          .catch(error => {
            console.error('Error loading ThirdBuildingScene:', error);
            resolve(); // Continue to next scene even if this one fails
          });
      } else {
        console.log('ThirdBuildingScene already registered');
        resolve();
      }
    });
  }

  /**
   * Register RandomHouseScene
   */
  private registerRandomHouseScene(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene.get('RandomHouseScene')) {
        console.log('Registering RandomHouseScene...');
        import('@/components/game/scenes/buildings/RandomHouseScene')
          .then(module => {
            const RandomHouseScene = module.default;
            this.scene.add('RandomHouseScene', new RandomHouseScene(), false);
            console.log('Successfully registered RandomHouseScene');
            resolve();
          })
          .catch(error => {
            console.error('Error loading RandomHouseScene:', error);
            resolve(); // Continue even if this one fails
          });
      } else {
        console.log('RandomHouseScene already registered');
        resolve();
      }
    });
  }

  /**
   * Enter a building
   * @param building The scene key for the building interior
   * @param exitPoint The point where the player will exit when returning
   */
  enterBuilding(building: string, exitPoint: { x: number, y: number, door?: string }) {
    if (!this.player) return;
    
    // Ensure the scene exists before entering
    if (!this.scene.get(building)) {
      console.error(`Scene ${building} not found. Attempting to register it first.`);
      
      // Try to register the specific scene
      let registrationPromise: Promise<void>;
      
      switch(building) {
        case 'FirstBuildingScene':
          registrationPromise = this.registerFirstBuildingScene();
          break;
        case 'SecondBuildingScene':
          registrationPromise = this.registerSecondBuildingScene();
          break;
        case 'ThirdBuildingScene':
          registrationPromise = this.registerThirdBuildingScene();
          break;
        case 'RandomHouseScene':
          registrationPromise = this.registerRandomHouseScene();
          break;
        default:
          console.error(`Unknown building scene: ${building}`);
          return;
      }
      
      // Wait for registration to complete, then try entering again
      registrationPromise.then(() => {
        if (this.scene.get(building)) {
          this.actuallyEnterBuilding(building, exitPoint);
        } else {
          console.error(`Failed to register scene ${building}. Cannot enter building.`);
          this.showMessage("Building cannot be entered at this time.");
        }
      });
    } else {
      this.actuallyEnterBuilding(building, exitPoint);
    }
  }
  
  /**
   * Actually enter the building after ensuring the scene exists
   */
  private actuallyEnterBuilding(building: string, exitPoint: { x: number, y: number, door?: string }) {
    // Save this position as the exit point when returning from this building
    this.buildingExitPoints.set(building, exitPoint);
    
    // Store player data that needs to persist between scenes
    const playerData = {
      // Add any player data you want to persist between scenes
    };
    
    // Fade out
    this.cameras.main.fadeOut(500);
    
    // When fade is complete, start the building scene
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Create data to pass to the building scene
      const buildingData = {
        fromLevel5: true,
        playerData,
        entryDoor: exitPoint.door || 'main'
      };
      
      // Start the building scene
      this.scene.start(building, buildingData);
    });
  }
  
  /**
   * Show a message when something goes wrong
   */
  showMessage(message: string) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const messageBox = this.add.rectangle(
      width / 2,
      height / 2,
      400,
      100,
      0x000000,
      0.8
    );
    messageBox.setScrollFactor(0);
    messageBox.setDepth(1000);
    
    const text = this.add.text(
      width / 2,
      height / 2,
      message,
      {
        fontSize: '18px',
        color: '#FFFFFF',
        align: 'center'
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(1000);
    
    const group = this.add.group([messageBox, text]);
    
    this.time.delayedCall(3000, () => {
      group.destroy(true);
    });
  }

  /**
   * Create an indicator specifically for doors, which is always visible
   */
  createDoorIndicator(door: Phaser.GameObjects.GameObject, x: number, y: number): Phaser.GameObjects.Sprite {
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
    
    // Create a dedicated indicator for this door
    const indicator = this.add.sprite(x, y, 'interaction-indicator');
    indicator.setDepth(200); // High depth to ensure visibility
    indicator.setScale(1.2); // Make door indicators slightly larger
    
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
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Store the indicator in the map as well for consistency
    this.interactionIndicators.set(door, indicator);
    
    return indicator;
  }
} 
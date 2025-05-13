'use client';

import { Scene } from 'phaser';
import Player from '@/lib/classes/Player';

export default class ThirdBuildingScene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private exitPoints: Map<string, Phaser.GameObjects.Zone> = new Map();
  private exitIndicators: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private interactionIndicators: Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Sprite> = new Map();
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private entryDoor: string = 'main'; // Default door
  
  constructor() {
    super({ key: 'ThirdBuildingScene' });
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
    
    // Load floor and wall textures
    if (!textureCheck('floor')) {
      this.load.image('floor', '/assets/maps/floor.png');
    }
    
    if (!textureCheck('wall')) {
      this.load.image('wall', '/assets/maps/wall.png');
    }
    
    // Load interaction indicator texture if it doesn't exist
    if (!textureCheck('interaction-indicator')) {
      this.load.image('interaction-indicator', '/assets/sprites/interaction-indicator.png');
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
    
    // Set background
    this.cameras.main.setBackgroundColor('#332211');
    
    // Add subtle exit buttons
    this.createExitButtons();
    
    // Create a room
    this.createRoom();
    
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
    
    // Set up exit points that match the entry doors
    this.createExitPoints();
    
    // Create some furniture and interactive objects
    this.createFurniture();
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    
    // Set up input
    this.cursors = this.input.keyboard?.createCursorKeys();
    
    // Add space key for immediate exit
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.exitBuilding(this.entryDoor);
    });
    
    // Add ESC key for exit
    this.input.keyboard?.on('keydown-ESC', () => {
      this.exitBuilding(this.entryDoor);
    });
    
    // Set world bounds
    const roomWidth = 16;
    const roomHeight = 20;
    const tileSize = 48;
    this.physics.world.setBounds(0, 0, roomWidth * tileSize, roomHeight * tileSize);
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }
  
  /**
   * Create UI buttons to exit the building
   */
  createExitButtons() {
    const screenWidth = this.cameras.main.width;
    
    // Create a container for the exit buttons
    const buttonContainer = this.add.container(0, 0);
    buttonContainer.setScrollFactor(0);
    buttonContainer.setDepth(100);
    
    // Background panel (more subtle)
    const panel = this.add.rectangle(screenWidth / 2, 12, 200, 24, 0x000000, 0.5);
    panel.setStrokeStyle(1, 0xFFFFFF, 0.3);
    buttonContainer.add(panel);
    
    // Exit button text
    const buttonText = this.add.text(screenWidth / 2, 12, 'EXIT (SPACE)', {
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    buttonContainer.add(buttonText);
  }
  
  /**
   * Create a room layout
   */
  createRoom() {
    const roomWidth = 16;
    const roomHeight = 20;
    const tileSize = 48;
    
    // Create walls
    const graphics = this.add.graphics();
    
    // Floor
    graphics.fillStyle(0x333355);
    graphics.fillRect(tileSize, tileSize, (roomWidth - 2) * tileSize, (roomHeight - 2) * tileSize);
    
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
  }
  
  /**
   * Create furniture and interactive objects
   */
  createFurniture() {
    const tileSize = 48;
    
    // Add a central meeting table
    const tableX = 400;
    const tableY = 300;
    const table = this.add.rectangle(tableX, tableY, tileSize * 5, tileSize * 2, 0x8B4513);
    
    // Add chairs around the table
    const chairs = [];
    // Top chairs
    for (let i = 0; i < 3; i++) {
      const chairX = tableX - tileSize + i * tileSize;
      const chairY = tableY - tileSize;
      chairs.push(this.add.rectangle(chairX, chairY, tileSize / 2, tileSize / 2, 0x8B0000));
    }
    
    // Bottom chairs
    for (let i = 0; i < 3; i++) {
      const chairX = tableX - tileSize + i * tileSize;
      const chairY = tableY + tileSize;
      chairs.push(this.add.rectangle(chairX, chairY, tileSize / 2, tileSize / 2, 0x8B0000));
    }
    
    // Add a filing cabinet in the first room (top left)
    const cabinetX = 150;
    const cabinetY = 100;
    const cabinet = this.add.rectangle(cabinetX, cabinetY, tileSize, tileSize * 1.5, 0x776655);
    
    // Add a computer in the second room (top middle)
    const computerX = 400;
    const computerY = 100;
    const computer = this.add.rectangle(computerX, computerY, tileSize * 1.5, tileSize / 2, 0x555555);
    
    // Add a bookshelf in the third room (top right)
    const shelfX = 650;
    const shelfY = 100;
    const bookshelf = this.add.rectangle(shelfX, shelfY, tileSize * 2, tileSize / 2, 0x885522);
    
    // Make objects interactive
    table.setInteractive({ useHandCursor: true });
    table.setData('interactive', true);
    table.setData('onInteract', () => {
      this.showMessage("This is the central meeting table where team members gather.");
    });
    
    cabinet.setInteractive({ useHandCursor: true });
    cabinet.setData('interactive', true);
    cabinet.setData('onInteract', () => {
      this.showMessage("The filing cabinet contains important documents.");
    });
    
    computer.setInteractive({ useHandCursor: true });
    computer.setData('interactive', true);
    computer.setData('onInteract', () => {
      this.showMessage("This computer contains project files and documentation.");
    });
    
    bookshelf.setInteractive({ useHandCursor: true });
    bookshelf.setData('interactive', true);
    bookshelf.setData('onInteract', () => {
      this.showMessage("The bookshelf is filled with technical manuals and reference books.");
    });
    
    // Add interactive objects
    this.interactiveObjects.push(table);
    this.interactiveObjects.push(cabinet);
    this.interactiveObjects.push(computer);
    this.interactiveObjects.push(bookshelf);
    
    // Create indicators
    this.createInteractionIndicator(table);
    this.createInteractionIndicator(cabinet);
    this.createInteractionIndicator(computer);
    this.createInteractionIndicator(bookshelf);
    
    // Add collision with furniture
    const furniture = this.physics.add.staticGroup();
    
    // Table collision
    furniture.add(this.add.zone(tableX, tableY, tileSize * 5, tileSize * 2));
    
    // Chair collisions
    chairs.forEach((chair) => {
      furniture.add(this.add.zone(chair.x, chair.y, tileSize / 2, tileSize / 2));
    });
    
    // Other furniture collisions
    furniture.add(this.add.zone(cabinetX, cabinetY, tileSize, tileSize * 1.5));
    furniture.add(this.add.zone(computerX, computerY, tileSize * 1.5, tileSize / 2));
    furniture.add(this.add.zone(shelfX, shelfY, tileSize * 2, tileSize / 2));
    
    // Enable collision with player
    if (this.player) {
      this.physics.add.collider(this.player.sprite, furniture);
    }
  }
  
  /**
   * Create exit points matching the entry doors
   */
  createExitPoints() {
    const tileSize = 48;
    const roomHeight = 20;
    
    // Create left exit
    const leftExitX = 300;
    const leftExitY = 650;
    this.createExitPoint('left', leftExitX, leftExitY);
    
    // Create right exit
    const rightExitX = 500;
    const rightExitY = 650;
    this.createExitPoint('right', rightExitX, rightExitY);
  }
  
  /**
   * Create a single exit point
   */
  createExitPoint(doorId: string, x: number, y: number) {
    // Create a visual marker for the door
    const doorMarker = this.add.rectangle(x, y, 80, 10, 0x000000, 0.5);
    doorMarker.setDepth(1);
    
    // Create an exit zone
    const exitZone = this.add.zone(x, y, 120, 80);
    exitZone.setInteractive({ useHandCursor: true });
    
    // Store the exit data
    exitZone.setData('doorId', doorId);
    exitZone.setData('interactive', true);
    exitZone.setData('onInteract', () => {
      this.exitBuilding(doorId);
    });
    
    // Store in exit points map
    this.exitPoints.set(doorId, exitZone);
    
    // Add to interactive objects array
    this.interactiveObjects.push(exitZone);
    
    // Create an indicator for the exit
    const indicator = this.add.sprite(x, y - 40, 'interaction-indicator');
    indicator.setAlpha(0.8);
    indicator.setScale(0.6);
    indicator.setDepth(10);
    
    // Store in indicators map
    this.exitIndicators.set(doorId, indicator);
    
    return exitZone;
  }
  
  /**
   * Exit building and return to Level5Scene
   */
  exitBuilding(doorId: string = 'main') {
    // Fade out
    this.cameras.main.fadeOut(500);
    
    // When fade is complete, return to the main level
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Pass data back to Level5Scene
      const returnData = {
        fromBuilding: 'ThirdBuildingScene',
        exitDoor: doorId
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
    
    // Create a background
    const bg = this.add.rectangle(x, y, 500, 120, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setScrollFactor(0); // Fix to camera
    
    // Add text
    const text = this.add.text(x, y, message, {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 480 }
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0); // Fix to camera
    
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
    
    // Position above the object
    const x = objX;
    const y = objY - 40;
    
    // Create a dedicated indicator for this object
    const indicator = this.add.sprite(x, y, 'interaction-indicator');
    indicator.setVisible(false); // Hide initially
    indicator.setDepth(20); // High depth to ensure visibility
    indicator.setScale(0.5);
    
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
  checkInteractiveObjects() {
    if (!this.player || this.interactiveObjects.length === 0) return;
    
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Interaction range
    
    // First, hide all indicators
    this.interactionIndicators.forEach(indicator => {
      indicator.setVisible(false);
    });
    
    // Check each interactive object
    this.interactiveObjects.forEach(obj => {
      // Skip exit points, they have their own indicators
      if (obj.getData('doorId')) return;
      
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
      
      // If in range, display indicator and check for interaction
      if (distance < interactDistance) {
        // Show the indicator
        const indicator = this.interactionIndicators.get(obj);
        if (indicator) {
          indicator.setVisible(true);
        }
        
        // Check for space key interaction - NOT CHECKING HERE ANYMORE since SPACE is now for exit
      }
    });
  }
  
  update() {
    // Update player movement if player exists
    if (this.player && this.cursors) {
      this.player.update(this.cursors);
    }
    
    // Check for interactive objects
    this.checkInteractiveObjects();
  }
} 
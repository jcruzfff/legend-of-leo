'use client';

import { Scene } from 'phaser';
import Player from '@/lib/classes/Player';

export default class SecondBuildingScene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private exitPoint?: Phaser.GameObjects.Zone;
  private exitIndicator?: Phaser.GameObjects.Sprite;
  private interactionIndicators: Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Sprite> = new Map();
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private exitPrompt?: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'SecondBuildingScene' });
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
    } | undefined;
    
    console.log('Second Building Scene created with data:', data);
    
    // Set background
    this.cameras.main.setBackgroundColor('#222255');
    
    // Add exit button at the top of the screen
    this.createExitButtons();
    
    // Create a simple room
    this.createRoom();
    
    // Add player at entry point
    const entryX = 450;
    const entryY = 500; // Moved to the bottom of the building
    this.player = new Player(this, entryX, entryY);
    
    // Set up exit point near the entry
    this.createExitPoint(entryX, entryY + 20);
    
    // Create some furniture and interactive objects
    this.createFurniture();
    
    // Add information text
    this.createInfoText();
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    
    // Set up input
    this.cursors = this.input.keyboard?.createCursorKeys();
    
    // Add space key for immediate exit 
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.exitBuilding();
    });
    
    // Add ESC key as an exit method
    this.input.keyboard?.on('keydown-ESC', () => {
      this.exitBuilding();
    });
    
    // Explicitly set world bounds
    const roomWidth = 18;
    const roomHeight = 12;
    const tileSize = 48;
    this.physics.world.setBounds(0, 0, roomWidth * tileSize, roomHeight * tileSize);
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }
  
  /**
   * Create UI buttons to exit the building directly
   */
  createExitButtons() {
    const screenWidth = this.cameras.main.width;
    
    // Create a container for the exit buttons
    const buttonContainer = this.add.container(0, 0);
    buttonContainer.setScrollFactor(0);
    buttonContainer.setDepth(100);
    
    // Background panel (subtle)
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
   * Create a simple room with walls
   */
  createRoom() {
    const roomWidth = 18;
    const roomHeight = 12;
    const tileSize = 48;
    
    // Create walls
    const graphics = this.add.graphics();
    
    // Floor
    graphics.fillStyle(0x444444);
    graphics.fillRect(tileSize, tileSize, (roomWidth - 2) * tileSize, (roomHeight - 2) * tileSize);
    
    // Walls
    graphics.fillStyle(0x777777);
    
    // Top wall
    graphics.fillRect(0, 0, roomWidth * tileSize, tileSize);
    
    // Bottom wall (with gap for door)
    const doorWidth = 120; // Wider door gap
    const doorStart = (roomWidth * tileSize / 2) - (doorWidth / 2);
    graphics.fillRect(0, (roomHeight - 1) * tileSize, doorStart, tileSize); // Left section
    graphics.fillRect(doorStart + doorWidth, (roomHeight - 1) * tileSize, roomWidth * tileSize - (doorStart + doorWidth), tileSize); // Right section
    
    // Left wall
    graphics.fillRect(0, tileSize, tileSize, (roomHeight - 2) * tileSize);
    
    // Right wall
    graphics.fillRect((roomWidth - 1) * tileSize, tileSize, tileSize, (roomHeight - 2) * tileSize);
    
    // Add collision for walls - create invisible physics objects
    const walls = this.physics.add.staticGroup();
    
    // Top wall
    walls.add(this.add.zone(roomWidth * tileSize / 2, tileSize / 2, roomWidth * tileSize, tileSize));
    
    // Bottom walls (with gap for door)
    walls.add(this.add.zone(doorStart / 2, (roomHeight - 0.5) * tileSize, doorStart, tileSize)); // Left section
    walls.add(this.add.zone(doorStart + doorWidth + (roomWidth * tileSize - (doorStart + doorWidth)) / 2, (roomHeight - 0.5) * tileSize, roomWidth * tileSize - (doorStart + doorWidth), tileSize)); // Right section
    
    // Left wall
    walls.add(this.add.zone(tileSize / 2, roomHeight * tileSize / 2, tileSize, roomHeight * tileSize));
    
    // Right wall
    walls.add(this.add.zone((roomWidth - 0.5) * tileSize, roomHeight * tileSize / 2, tileSize, roomHeight * tileSize));
    
    // Enable collision with player
    if (this.player) {
      this.physics.add.collider(this.player.sprite, walls);
    }
  }
  
  /**
   * Create furniture and interactive objects in the room
   */
  createFurniture() {
    const tileSize = 48;
    
    // Add a reception desk in the main room
    const deskX = 300;
    const deskY = 300;
    const desk = this.add.rectangle(deskX, deskY, tileSize * 4, tileSize, 0x996633);
    

    desk.setInteractive({ useHandCursor: true });
    desk.setData('interactive', true);
    desk.setData('onInteract', () => {
      this.showMessage("Welcome to the second building. This is the reception desk.");
    });
    
    // Add a bookshelf in the corner
    const shelfX = 200;
    const shelfY = 100;
    const bookshelf = this.add.rectangle(shelfX, shelfY, tileSize * 2, tileSize / 2, 0x885522);
    
    // Make bookshelf interactive
    bookshelf.setInteractive({ useHandCursor: true });
    bookshelf.setData('interactive', true);
    bookshelf.setData('onInteract', () => {
      this.showMessage("These shelves contain various books and documents.");
    });
    
    // Add interactive objects
    this.interactiveObjects.push(desk);
    this.interactiveObjects.push(bookshelf);
    
    // Create indicators
    this.createInteractionIndicator(desk);
    this.createInteractionIndicator(bookshelf);
    
    // Add collision with furniture - create invisible physics objects
    const furniture = this.physics.add.staticGroup();
    furniture.add(this.add.zone(deskX, deskY, tileSize * 4, tileSize));
  
    furniture.add(this.add.zone(shelfX, shelfY, tileSize * 2, tileSize / 2));
    
    // Enable collision with player
    if (this.player) {
      this.physics.add.collider(this.player.sprite, furniture);
    }
  }
  
  /**
   * Create an exit point to return to Level5Scene
   */
  createExitPoint(x: number, y: number) {
    // Create an exit zone - much larger and positioned slightly up from the door
    this.exitPoint = this.add.zone(x, y - 20, 200, 150);
    this.exitPoint.setData('interactive', true);
    this.exitPoint.setData('onInteract', () => {
      this.exitBuilding();
    });
    
    // Make it interactive
    this.exitPoint.setInteractive({ useHandCursor: true });
    
    // Add to interactive objects array
    this.interactiveObjects.push(this.exitPoint);
    
    // Create an indicator for the exit - make it more visible
    this.exitIndicator = this.add.sprite(x, y - 60, 'interaction-indicator');
    this.exitIndicator.setAlpha(0.9);
    this.exitIndicator.setScale(0.8);
    this.exitIndicator.setDepth(100);
    
    // Add animations for the indicator
    this.tweens.add({
      targets: this.exitIndicator,
      y: y - 70,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add a visual cue for the door - make it more noticeable
    const doorGraphics = this.add.graphics();
    doorGraphics.fillStyle(0x000000, 0.7);
    doorGraphics.fillRect(x - 60, y - 25, 120, 40);
    doorGraphics.setDepth(1);
    
    // Add text label for the exit
    const exitText = this.add.text(x, y - 40, "Exit to Town", {
      fontSize: '16px',
      color: '#FFFFFF',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 }
    });
    exitText.setOrigin(0.5);
    exitText.setDepth(100);
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
        fromBuilding: 'SecondBuildingScene'
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
    indicator.setDepth(200); // High depth to ensure visibility
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
      if (obj === this.exitPoint) return; // Skip exit point, it has its own indicator
      
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
      
      // If in range, display indicator
      if (distance < interactDistance) {
        // Show the indicator
        const indicator = this.interactionIndicators.get(obj);
        if (indicator) {
          indicator.setVisible(true);
        }
        
        // Use E key for interaction instead of space
        if (this.input.keyboard?.checkDown(this.input.keyboard.addKey('E'), 500)) {
          const onInteract = obj.getData('onInteract');
          if (typeof onInteract === 'function') {
            onInteract();
          }
        }
      }
    });
  }
  
  /**
   * Add information text to explain the building's purpose
   */
  createInfoText() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const message = "Welcome to the Second Building\n\nThis building serves as the research center for the town. Look around to learn more about the various projects.";
    
    const infoBox = this.add.rectangle(
      width / 2,
      height / 3,
      width / 2,
      height / 4,
      0x000000,
      0.8
    );
    infoBox.setScrollFactor(0);
    infoBox.setOrigin(0.5);
    infoBox.setStrokeStyle(2, 0xFFFFFF);
    infoBox.setDepth(1000);
    
    const textMessage = this.add.text(
      width / 2,
      height / 3,
      message,
      {
        fontSize: '20px',
        color: '#FFFFFF',
        align: 'center',
        wordWrap: { width: width / 2.5 }
      }
    );
    textMessage.setScrollFactor(0);
    textMessage.setOrigin(0.5);
    textMessage.setDepth(1000);
    
    // Group all elements for easier cleanup
    const messageGroup = this.add.group([infoBox, textMessage]);
    
    // Add click handler to dismiss
    this.input.once('pointerdown', () => {
      messageGroup.destroy(true);
    });
    
    // Also dismiss after a few seconds
    this.time.delayedCall(4000, () => {
      messageGroup.destroy(true);
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
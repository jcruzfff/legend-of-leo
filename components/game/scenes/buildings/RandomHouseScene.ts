'use client';

import { Scene } from 'phaser';
import Player from '@/lib/classes/Player';

export default class RandomHouseScene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private exitPoint?: Phaser.GameObjects.Zone;
  private exitIndicator?: Phaser.GameObjects.Sprite;
  private interactionIndicators: Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Sprite> = new Map();
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private exitPrompt?: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'RandomHouseScene' });
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
    
    console.log('Random House Scene created with data:', data);
    
    // Set background
    this.cameras.main.setBackgroundColor('#664455');
    
    // Add exit button at the top of the screen
    this.createExitButtons();
    
    // Create a simple room
    this.createRoom();
    
    // Add player at entry point
    const entryX = 300;
    const entryY = 420; // Moved to the bottom of the building
    this.player = new Player(this, entryX, entryY);
    
    // Set up exit point
    this.createExitPoint(entryX, entryY + 20);
    
    // Create some furniture and interactive objects
    this.createFurniture();
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);
    
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
    const roomWidth = 12;
    const roomHeight = 10;
    const tileSize = 48;
    this.physics.world.setBounds(0, 0, roomWidth * tileSize, roomHeight * tileSize);
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }
  
  /**
   * Create a simple room
   */
  createRoom() {
    const roomWidth = 12;
    const roomHeight = 10;
    const tileSize = 48;
    
    // Create walls
    const graphics = this.add.graphics();
    
    // Floor
    graphics.fillStyle(0x664455);
    graphics.fillRect(tileSize, tileSize, (roomWidth - 2) * tileSize, (roomHeight - 2) * tileSize);
    
    // Walls
    graphics.fillStyle(0x886677);
    
    // Top wall
    graphics.fillRect(0, 0, roomWidth * tileSize, tileSize);
    
    // Bottom wall (with gap for door)
    const doorWidth = 100; // Wider door gap
    const doorStart = (roomWidth * tileSize / 2) - (doorWidth / 2);
    graphics.fillRect(0, (roomHeight - 1) * tileSize, doorStart, tileSize); // Left section
    graphics.fillRect(doorStart + doorWidth, (roomHeight - 1) * tileSize, roomWidth * tileSize - (doorStart + doorWidth), tileSize); // Right section
    
    // Left wall
    graphics.fillRect(0, tileSize, tileSize, (roomHeight - 2) * tileSize);
    
    // Right wall
    graphics.fillRect((roomWidth - 1) * tileSize, tileSize, tileSize, (roomHeight - 2) * tileSize);
    
    // Add collision for walls
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
   * Create furniture and interactive objects
   */
  createFurniture() {
    const tileSize = 48;
    
    // Add a bed
    const bedX = 200;
    const bedY = 150;
    const bed = this.add.rectangle(bedX, bedY, tileSize * 2, tileSize, 0x6495ED);
    
    // Add a small table
    const tableX = 350;
    const tableY = 200;
    const table = this.add.rectangle(tableX, tableY, tileSize, tileSize, 0x8B4513);
    
    // Add a chair
    const chairX = tableX + tileSize;
    const chairY = tableY;
    const chair = this.add.rectangle(chairX, chairY, tileSize / 2, tileSize / 2, 0x8B0000);
    
    // Make objects interactive
    bed.setInteractive({ useHandCursor: true });
    bed.setData('interactive', true);
    bed.setData('onInteract', () => {
      this.showMessage("This is a cozy bed. Maybe you should get some rest.");
    });
    
    table.setInteractive({ useHandCursor: true });
    table.setData('interactive', true);
    table.setData('onInteract', () => {
      this.showMessage("A small table with some personal belongings on it.");
    });
    
    chair.setInteractive({ useHandCursor: true });
    chair.setData('interactive', true);
    chair.setData('onInteract', () => {
      this.showMessage("A simple wooden chair. It looks comfortable enough.");
    });
    
    // Add interactive objects
    this.interactiveObjects.push(bed);
    this.interactiveObjects.push(table);
    this.interactiveObjects.push(chair);
    
    // Create indicators
    this.createInteractionIndicator(bed);
    this.createInteractionIndicator(table);
    this.createInteractionIndicator(chair);
    
    // Add collision with furniture - create invisible physics objects
    const furniture = this.physics.add.staticGroup();
    furniture.add(this.add.zone(bedX, bedY, tileSize * 2, tileSize));
    furniture.add(this.add.zone(tableX, tableY, tileSize, tileSize));
    furniture.add(this.add.zone(chairX, chairY, tileSize / 2, tileSize / 2));
    
    // Enable collision with player
    if (this.player) {
      this.physics.add.collider(this.player.sprite, furniture);
    }
  }
  
  /**
   * Create an exit point
   */
  createExitPoint(x: number, y: number) {
    // Create an exit zone - much larger and positioned better for access
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
    doorGraphics.fillRect(x - 50, y - 25, 100, 40);
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
        fromBuilding: 'RandomHouseScene'
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
  
  update() {
    if (!this.player || !this.cursors) return;
    
    // Update player movement and animations
    this.player.update(this.cursors);
    
    // Check for nearby interactive objects
    this.checkInteractiveObjects();
  }
  
  /**
   * Clean up resources when scene is shut down
   */
  shutdown() {
    // Clean up resources
    if (this.interactionIndicators) {
      this.interactionIndicators.clear();
    }

    // We should NOT clear the localStorage here since we want to 
    // persist the current scene when refreshing the page
    // Only remove all listeners to prevent memory leaks
    this.input.keyboard?.off('keydown-SPACE');
    this.input.keyboard?.off('keydown-ESC');
  }
} 
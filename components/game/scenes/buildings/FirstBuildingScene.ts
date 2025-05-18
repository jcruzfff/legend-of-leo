'use client';

import { Scene } from 'phaser';
import Player from '@/lib/classes/Player';

export default class FirstBuildingScene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private exitPoint?: Phaser.GameObjects.Zone;
  private exitIndicator?: Phaser.GameObjects.Sprite;
  private interactionIndicators: Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Sprite> = new Map();
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private exitPrompt?: Phaser.GameObjects.Text;
  private playerInExitZone: boolean = false;
  private exitTimer: Phaser.Time.TimerEvent | null = null;
  
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
    
    // Load floor and wall textures
    if (!textureCheck('floor')) {
      this.load.image('floor', '/assets/maps/floor.png');
    }
    
    if (!textureCheck('wall')) {
      this.load.image('wall', '/assets/maps/wall.png');
    }
    
    // Load custom floor texture for this building
    if (!textureCheck('veru-floor')) {
      this.load.image('veru-floor', '/assets/maps/veru-floor.png');
    }
    
    // Load cashier sprite from maps folder
    if (!textureCheck('cashier-one')) {
      this.load.image('cashier-one', '/assets/maps/cashier-one.png');
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
    
    console.log('First Building Scene created with data:', data);
    
    // Set background
    this.cameras.main.setBackgroundColor('#111111');
    
    // Add exit button at the top of the screen
    this.createExitButtons();
    
    // Create a simple room (15x15 tiles)
    this.createRoom();
    
    // Add player at entry point - moved to the very bottom of the room
    const entryX = 400;
    const entryY = 600; 
    this.player = new Player(this, entryX, entryY);
    
    // Set up exit point near the entry
    this.createExitPoint(entryX, entryY + 20);
    
    // Create some furniture and interactive objects
    this.createFurniture();
    
    // Add a welcome message
    this.showWelcomeMessage();
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    
    // Set up input
    this.cursors = this.input.keyboard?.createCursorKeys();
    
    // Add spacebar for interactions with NPCs and objects
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.interactWithNearbyObject();
    });
    
    // Explicitly set world bounds
    const roomWidth = 15;
    const roomHeight = 15;
    const tileSize = 48;
    this.physics.world.setBounds(0, 0, roomWidth * tileSize, roomHeight * tileSize);
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }
  
  /**
   * Create a simple room with walls
   */
  createRoom() {
    const roomWidth = 15;
    const roomHeight = 15;
    const tileSize = 48;
    
    // Create walls - without visible bounding boxes
    const graphics = this.add.graphics();
    
    // Floor - replace solid color with tiled floor texture
    const floorTile = this.textures.get('veru-floor');
    if (floorTile) {
      // Calculate how many tiles we need in each direction
      
      // Create a repeating tile pattern for the floor
      for (let x = 1; x < roomWidth - 1; x++) {
        for (let y = 1; y < roomHeight - 1; y++) {
          this.add.image(
            x * tileSize + tileSize / 2, 
            y * tileSize + tileSize / 2, 
            'veru-floor'
          ).setDepth(1);
        }
      }
    } else {
      // Fallback to solid color if texture is missing
      graphics.fillStyle(0x222222);
      graphics.fillRect(tileSize, tileSize, (roomWidth - 2) * tileSize, (roomHeight - 2) * tileSize);
    }
    
    // Walls
    graphics.fillStyle(0x555555);
    
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
    
    // Calculate room center
    const centerX = 7.5 * tileSize; // center of a 15-width room
    const centerY = 7 * tileSize;  // slightly above center of a 15-height room
    
    // Add a desk at the center
    const deskX = centerX;
    const deskY = centerY;
    const desk = this.add.rectangle(deskX, deskY, tileSize * 3, tileSize, 0x8B4513);
    
    // Add a chair
    const chairX = deskX;
    const chairY = deskY + tileSize;
    const chair = this.add.rectangle(chairX, chairY, tileSize, tileSize, 0x8B0000);
    // Add chair to interactive objects for collision
    const furniture = this.physics.add.staticGroup();
    furniture.add(chair);
    
    // Add cashier in the center behind the desk
    const cashierX = centerX;
    const cashierY = centerY - tileSize;
    
    let cashier;
    
    // Check if cashier sprite exists, otherwise create a fallback rectangle
    if (this.textures.exists('cashier-one')) {
      cashier = this.add.image(cashierX, cashierY, 'cashier-one');
      cashier.setScale(0.7); // Adjust scale to fit the scene
    } else {
      // Fallback to a colored rectangle if sprite is missing
      cashier = this.add.rectangle(cashierX, cashierY, tileSize, tileSize * 1.5, 0x6A5ACD);
      
      // Add a face-like element to make it look more like a person
      const head = this.add.circle(cashierX, cashierY - 10, 8, 0xFFE4C4);
      const body = this.add.rectangle(cashierX, cashierY + 10, 14, 25, 0x4682B4);
      
      // Group these elements
      this.add.group([cashier, head, body]);
    }
    
    cashier.setDepth(10); // Ensure it appears above the floor
    
    // Make cashier interactive
    cashier.setInteractive({ useHandCursor: true });
    cashier.setData('interactive', true);
    cashier.setData('onInteract', () => {
      this.showMessage("Hello! Welcome to our shop. How can I help you today?");
    });
    
    // Add cashier to interactive objects
    this.interactiveObjects.push(cashier);
    
    // Create indicator for the cashier
    this.createInteractionIndicator(cashier);
    
    // Make desk interactive
    desk.setInteractive({ useHandCursor: true });
    desk.setData('interactive', true);
    desk.setData('onInteract', () => {
      this.showMessage("This is a desk where you can work on projects.");
    });
    
    // Add desk to interactive objects array
    this.interactiveObjects.push(desk);
    
    // Create a dedicated indicator for the desk
    this.createInteractionIndicator(desk);
    
    // Add collision with furniture - create invisible physics objects
    furniture.add(this.add.zone(deskX, deskY, tileSize * 3, tileSize));
    furniture.add(this.add.zone(cashierX, cashierY, tileSize, tileSize)); // Add collision for cashier
    
    // Enable collision with player
    if (this.player) {
      this.physics.add.collider(this.player.sprite, furniture);
    }
  }
  
  /**
   * Interact with the nearest interactive object
   */
  interactWithNearbyObject() {
    if (!this.player) return;
    
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Interaction range
    let nearestObject: Phaser.GameObjects.GameObject | null = null;
    let shortestDistance = interactDistance;
    
    // Find the nearest interactive object
    this.interactiveObjects.forEach(obj => {
      if (obj === this.exitPoint) return; // Skip exit point since it's handled differently now
      
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
      // Type assertion to fix linter error
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
   * Create an exit point to return to Level5Scene
   */
  createExitPoint(x: number, y: number) {
    // Create a visible doormat in the exit area (make it smaller and more distinctive)
    const doormat = this.add.rectangle(x, y, 80, 60, 0x330000, 0.9);
    doormat.setStrokeStyle(3, 0xffaa00);
    doormat.setDepth(1);
    
    // Add more noticeable decorative elements
    const text = this.add.text(x, y - 15, "EXIT", {
      fontSize: '18px',
      color: '#ffdd00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    text.setOrigin(0.5);
    text.setDepth(2);
    
    // Multiple arrows to make it more obvious
    const arrow1 = this.add.text(x - 20, y + 10, "↓", {
      fontSize: '24px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3
    });
    arrow1.setOrigin(0.5);
    arrow1.setDepth(2);
    
    const arrow2 = this.add.text(x, y + 10, "↓", {
      fontSize: '24px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3
    });
    arrow2.setOrigin(0.5);
    arrow2.setDepth(2);
    
    const arrow3 = this.add.text(x + 20, y + 10, "↓", {
      fontSize: '24px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3
    });
    arrow3.setOrigin(0.5);
    arrow3.setDepth(2);
    
    // Create a smaller exit zone
    this.exitPoint = this.add.zone(x, y, 80, 60);
    this.exitPoint.setData('interactive', true);
    
    // Make the zone a physics object that can be overlapped
    this.physics.world.enable(this.exitPoint);
    
    // Adjust the exit zone's body size and position (smaller collision area)
    const exitBody = this.exitPoint.body as Phaser.Physics.Arcade.Body;
    exitBody.setSize(80, 60);
    exitBody.setOffset(-40, -30);
    
    // Add overlap detection with the player
    if (this.player) {
      this.physics.add.overlap(this.player.sprite, this.exitPoint, () => {
        if (!this.playerInExitZone) {
          this.playerInExitZone = true;
          
          // Show a prompt that player has entered exit zone
          this.showExitPrompt();
          
          // Set a timer to exit after staying in the zone
          this.exitTimer = this.time.delayedCall(800, () => {
            if (this.playerInExitZone) {
              this.exitBuilding();
            }
          });
        }
      });
      
      // We'll check if player leaves the zone in the update method instead
      // since the 'overlapend' event can be unreliable
    }
    
    // Create an indicator for the exit - make it more visible
    this.exitIndicator = this.add.sprite(x, y - 50, 'interaction-indicator');
    this.exitIndicator.setAlpha(0.9);
    this.exitIndicator.setScale(0.8);
    this.exitIndicator.setDepth(100);
    this.exitIndicator.setTint(0xffdd00);
    
    // Add animations for the indicator
    this.tweens.add({
      targets: this.exitIndicator,
      y: y - 60,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
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
        fromBuilding: 'FirstBuildingScene'
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
    
    // Exit button text - updated to reflect new exit mechanism
    const buttonText = this.add.text(screenWidth / 2, 12, 'WALK TO EXIT', {
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    buttonContainer.add(buttonText);
  }
  
  /**
   * Show a welcome message when entering the building
   */
  showWelcomeMessage() {
    // Create a small popup with building information
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const message = "Welcome to the First Building\n\nThis building serves as the main office for the town. Feel free to explore!";
    
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
        align: 'center'
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
    
    // Check if player is still in exit zone
    if (this.playerInExitZone && this.player && this.exitPoint) {
      const isOverlapping = this.physics.overlap(this.player.sprite, this.exitPoint);
      
      if (!isOverlapping) {
        this.playerInExitZone = false;
        if (this.exitTimer) {
          this.exitTimer.remove();
          this.exitTimer = null;
        }
        this.hideExitPrompt();
      }
    }
  }
} 
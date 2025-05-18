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
  private exitPrompt?: Phaser.GameObjects.Text;
  private playerInExitZone: boolean = false;
  private currentExitDoor: string = '';
  private exitTimer: Phaser.Time.TimerEvent | null = null;
  
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
    
    // Load custom floor texture for this building
    if (!textureCheck('ans-floor')) {
      this.load.image('ans-floor', '/assets/maps/ans-floor.png');
    }
    
    // Load cashier sprite - reusing cashier-one from maps folder
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
    
    // Add spacebar for interactions with NPCs and objects
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.interactWithNearbyObject();
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
      // Skip exit points, they're handled differently now
      // Use type assertion to help TypeScript understand what we're doing
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        getData: (key: string) => unknown;
      };
      
      if (gameObj.getData('doorId')) return;
      
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
    
    // Exit button text - updated to reflect new exit mechanism
    const buttonText = this.add.text(screenWidth / 2, 12, 'WALK TO EXIT', {
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
  }
  
  /**
   * Create furniture and interactive objects
   */
  createFurniture() {
    const tileSize = 48;
    const roomWidth = 16;
    
    // Calculate centers for the three sections
    const leftSectionX = roomWidth * tileSize / 6; // Center of left section
    const centerSectionX = roomWidth * tileSize / 2; // Center of room
    const rightSectionX = roomWidth * tileSize * 5 / 6; // Center of right section
    const topSectionY = tileSize * 5; // Center Y of top section
    
    // Room 1 (Left) - Information Desk
    const desk1X = leftSectionX;
    const desk1Y = topSectionY;
    const desk1 = this.add.rectangle(desk1X, desk1Y, tileSize * 2, tileSize, 0x996633);
    
    // Add a cashier to the left room information desk in center position
    const cashierX = desk1X;
    const cashierY = desk1Y - tileSize;
    
    let cashier;
    
    // Check if cashier sprite exists, otherwise create a fallback rectangle
    if (this.textures.exists('cashier-one')) {
      cashier = this.add.image(cashierX, cashierY, 'cashier-one');
      cashier.setScale(0.7); // Adjust scale to fit the scene
    } else {
      // Fallback to a colored rectangle if sprite is missing
      cashier = this.add.rectangle(cashierX, cashierY, tileSize, tileSize * 1.5, 0xCD5C5C);
      
      // Add a face-like element to make it look more like a person
      const head = this.add.circle(cashierX, cashierY - 10, 8, 0xFFDAB9);
      const body = this.add.rectangle(cashierX, cashierY + 10, 14, 25, 0x708090);
      
      // Group these elements
      this.add.group([cashier, head, body]);
    }
    
    cashier.setDepth(10); // Ensure it appears above the floor
    
    // Make cashier interactive
    cashier.setInteractive({ useHandCursor: true });
    cashier.setData('interactive', true);
    cashier.setData('onInteract', () => {
      this.showMessage("Welcome to our information center! Ask me anything about privacy and data protection.");
    });
    
    // Add cashier to interactive objects
    this.interactiveObjects.push(cashier);
    
    // Create indicator for the cashier
    this.createInteractionIndicator(cashier);
    
    // Make the desk interactive
    desk1.setInteractive({ useHandCursor: true });
    desk1.setData('interactive', true);
    desk1.setData('onInteract', () => {
      this.showMessage("This is the information desk. Talk to the attendant for assistance.");
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(desk1);
    
    // Create indicator for the desk
    this.createInteractionIndicator(desk1);
    
    // Room 2 (Center) - Research Area
    const desk2X = centerSectionX;
    const desk2Y = topSectionY;
    const desk2 = this.add.rectangle(desk2X, desk2Y, tileSize * 2, tileSize, 0x996633);
    
    // Make it interactive
    desk2.setInteractive({ useHandCursor: true });
    desk2.setData('interactive', true);
    desk2.setData('onInteract', () => {
      this.showMessage("This desk has resources about Aleo's blockchain technology.");
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(desk2);
    
    // Create indicator
    this.createInteractionIndicator(desk2);
    
    // Room 3 (Right) - Training Area
    const desk3X = rightSectionX;
    const desk3Y = topSectionY;
    const desk3 = this.add.rectangle(desk3X, desk3Y, tileSize * 2, tileSize, 0x996633);
    
    // Make it interactive
    desk3.setInteractive({ useHandCursor: true });
    desk3.setData('interactive', true);
    desk3.setData('onInteract', () => {
      this.showMessage("This is the training area for developers learning about privacy technologies.");
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(desk3);
    
    // Create indicator
    this.createInteractionIndicator(desk3);
    
    // Create a meeting table in the central area of the bottom section
    const tableX = 400;
    const tableY = 400;
    const meetingTable = this.add.rectangle(tableX, tableY, tileSize * 3, tileSize * 2, 0x884422);
    
    // Add collision for furniture
    const furniture = this.physics.add.staticGroup();
    furniture.add(this.add.zone(desk1X, desk1Y, tileSize * 2, tileSize));
    furniture.add(this.add.zone(cashierX, cashierY, tileSize, tileSize)); // Add collision for cashier
    furniture.add(this.add.zone(desk2X, desk2Y, tileSize * 2, tileSize));
    furniture.add(this.add.zone(desk3X, desk3Y, tileSize * 2, tileSize));
    furniture.add(this.add.zone(tableX, tableY, tileSize * 3, tileSize * 2));
    // Include the meeting table for collision
    furniture.add(meetingTable);
    
    // Enable collision with player
    if (this.player) {
      this.physics.add.collider(this.player.sprite, furniture);
    }
  }
  
  /**
   * Create exit points matching the entry doors
   */
  createExitPoints() {
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
    
    // Create an exit zone (smaller than before)
    const exitZone = this.add.zone(x, y, 80, 60);
    exitZone.setData('doorId', doorId);
    exitZone.setData('interactive', true);
    
    // Make the zone a physics object that can be overlapped
    this.physics.world.enable(exitZone);
    
    // Adjust the exit zone's body size and position (smaller collision area)
    const exitBody = exitZone.body as Phaser.Physics.Arcade.Body;
    exitBody.setSize(80, 60);
    exitBody.setOffset(-40, -30);
    
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
    
    // Create an indicator for the exit - make it more visible
    const indicator = this.add.sprite(x, y - 50, 'interaction-indicator');
    indicator.setAlpha(0.9);
    indicator.setScale(0.8);
    indicator.setDepth(100);
    indicator.setTint(0xffdd00);
    
    // Add animations for the indicator
    this.tweens.add({
      targets: indicator,
      y: y - 60,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Store in maps
    this.exitPoints.set(doorId, exitZone);
    this.exitIndicators.set(doorId, indicator);
    
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
      // Use type assertion to help TypeScript understand what we're doing
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        getData: (key: string) => unknown;
      };
      
      if (gameObj.getData('doorId')) return;
      
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
} 
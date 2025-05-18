'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadAsepriteSheet, createAnimationsFromAseprite } from '@/lib/utils/aseprite';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';

interface GameData {
  isNewGame: boolean;
  playerName: string;
  playerLevel: number;
  playerScore: number;
  completedModules: string[];
}

/**
 * Player class to handle character movement, animations and interactions
 */
class Player {
  public sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private animations: Record<string, string> = {};
  private currentDirection: string = 'down';
  private isMoving: boolean = false;
  private scene: Scene;
  private moveSpeed: number = 180;
  
  constructor(scene: Scene, x: number, y: number) {
    this.scene = scene;
    
    // Prioritize using the player sprite sheet as the primary option
    if (scene.textures.exists('player')) {
      console.log('Using player sprite sheet');
      this.sprite = scene.physics.add.sprite(x, y, 'player', 0);
      this.createPlayerAnimations();
      this.sprite.play('player-idle-down');
    } else {
      try {
        // Fall back to Aseprite file if player sprite isn't available
        console.log('Attempting to use Aseprite animations');
        this.animations = createAnimationsFromAseprite(scene, 'leo', 10);
        this.sprite = scene.physics.add.sprite(x, y, 'leo');
        
        // Initialize with idle animation
        if (this.animations['idle']) {
          this.sprite.play(this.animations['idle']);
        }
      } catch (error) {
        console.warn('All sprite assets failed to load, using placeholder:', error);
        this.sprite = scene.physics.add.sprite(x, y, 'player-placeholder');
        
        // Create placeholder animations as last resort
        this.createPlaceholderAnimations();
        this.sprite.play('player-idle');
      }
    }
    
    // Configure physics
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(0.1);
    
    // Remove display size adjustment to avoid stretching the sprite
    // and let the natural sprite size be maintained
    // this.sprite.setDisplaySize(48, 66);
    
    // Set depth to ensure player is drawn above background elements
    this.sprite.setDepth(10);
    
    // Remove debug body visualization
    this.sprite.setDebugBodyColor(0x00000000); // Fully transparent
    this.sprite.body.debugShowBody = false;
    this.sprite.body.debugShowVelocity = false;
  }
  
  private createPlayerAnimations(): void {
    const anims = this.scene.anims;
    
    // Log that we're creating player animations
    console.log('Creating player animations from spritesheet');
    
    // Clean up any existing animations to avoid conflicts
    if (anims.exists('player-walk-down')) {
      console.log('Animations already exist, skipping creation');
      return;
    }
    
    // Create animations for the new player sprite sheet
    // The sprite sheet has 12 frames (3 frames per direction)
    // Arrangement: [down1, down2, down3, left1, left2, left3, right1, right2, right3, up1, up2, up3]
    
    // Down animation
    anims.create({
      key: 'player-walk-down',
      frames: anims.generateFrameNumbers('player', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Left animation
    anims.create({
      key: 'player-walk-left',
      frames: anims.generateFrameNumbers('player', { start: 3, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Right animation
    anims.create({
      key: 'player-walk-right',
      frames: anims.generateFrameNumbers('player', { start: 6, end: 8 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Up animation
    anims.create({
      key: 'player-walk-up',
      frames: anims.generateFrameNumbers('player', { start: 9, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Idle animations (using the first frame of each direction)
    anims.create({
      key: 'player-idle-down',
      frames: [{ key: 'player', frame: 0 }],
      frameRate: 10,
      repeat: -1
    });
    
    anims.create({
      key: 'player-idle-left',
      frames: [{ key: 'player', frame: 3 }],
      frameRate: 10,
      repeat: -1
    });
    
    anims.create({
      key: 'player-idle-right',
      frames: [{ key: 'player', frame: 6 }],
      frameRate: 10,
      repeat: -1
    });
    
    anims.create({
      key: 'player-idle-up',
      frames: [{ key: 'player', frame: 9 }],
      frameRate: 10,
      repeat: -1
    });
    
    console.log('Player animations created successfully');
  }
  
  private createPlaceholderAnimations(): void {
    const anims = this.scene.anims;
    
    console.log('Creating placeholder animations for player');
    
    // Create a simple colored rectangle for the player sprite
    if (!this.sprite.texture.key || this.sprite.texture.key === 'player-placeholder') {
      // Use a graphics object to create a colored rectangle
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0x3498db); // Blue color
      graphics.fillRect(0, 0, 48, 66); // Match sprite dimensions
      graphics.lineStyle(2, 0x000000);
      graphics.strokeRect(0, 0, 48, 66);
      
      // Create a texture from the graphics object
      graphics.generateTexture('player-generated', 48, 66);
      
      // Set the player sprite to use this texture
      this.sprite.setTexture('player-generated');
    }
    
    // Create simple animations if they don't exist
    if (!anims.exists('player-idle')) {
      anims.create({
        key: 'player-idle',
        frames: [{ key: 'player-generated', frame: 0 }],
        frameRate: 10,
        repeat: -1
      });
    }
    
    // Basic movement animations for the placeholder
    ['left', 'right', 'up', 'down'].forEach(direction => {
      const key = `player-walk-${direction}`;
      if (!anims.exists(key)) {
        anims.create({
          key: key,
          frames: [{ key: 'player-generated', frame: 0 }],
          frameRate: 10,
          repeat: -1
        });
      }
      
      // Create directional idle animations as well
      const idleKey = `player-idle-${direction}`;
      if (!anims.exists(idleKey)) {
        anims.create({
          key: idleKey,
          frames: [{ key: 'player-generated', frame: 0 }],
          frameRate: 10,
          repeat: -1
        });
      }
    });
    
    console.log('Placeholder animations created successfully');
  }
  
  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    if (!cursors) return;
    
    // Reset velocity
    this.sprite.setVelocity(0);
    
    // Track if player is moving this frame
    let moving = false;
    let directionChanged = false;
    let newDirection = this.currentDirection;
    
    // Implement strict 4-directional movement (no diagonals)
    // Priority: Left/Right over Up/Down
    
    if (cursors.left.isDown) {
      // Left movement takes precedence
      this.sprite.setVelocityX(-this.moveSpeed);
      newDirection = 'left';
      moving = true;
    } else if (cursors.right.isDown) {
      // Right movement if not moving left
      this.sprite.setVelocityX(this.moveSpeed);
      newDirection = 'right';
      moving = true;
    } else if (cursors.up.isDown) {
      // Only move up if not moving horizontally
      this.sprite.setVelocityY(-this.moveSpeed);
      newDirection = 'up';
      moving = true;
    } else if (cursors.down.isDown) {
      // Only move down if not moving horizontally
      this.sprite.setVelocityY(this.moveSpeed);
      newDirection = 'down';
      moving = true;
    }
    
    // Check if direction changed
    if (newDirection !== this.currentDirection) {
      this.currentDirection = newDirection;
      directionChanged = true;
    }
    
    // Update animation based on movement state
    this.updateAnimation(moving, directionChanged);
    
    // Update internal state
    this.isMoving = moving;
  }
  
  private updateAnimation(moving: boolean, directionChanged: boolean): void {
    if (moving) {
      // If moving in a new direction or not currently in a walking animation
      if (this.sprite.texture.key === 'player') {
        // For the new player sprite sheet
        const walkAnim = `player-walk-${this.currentDirection}`;
        if (directionChanged || !this.sprite.anims.currentAnim || !this.sprite.anims.currentAnim.key.includes('walk')) {
          console.log(`Playing animation: ${walkAnim}`);
          this.sprite.play(walkAnim, true);
        }
      } else if (this.animations[`walk_${this.currentDirection}`]) {
        // For aseprite animations
        const walkAnim = this.animations[`walk_${this.currentDirection}`];
        if (directionChanged || !this.sprite.anims.currentAnim || !this.sprite.anims.currentAnim.key.includes('walk')) {
          this.sprite.play(walkAnim, true);
        }
      } else {
        // For placeholder animations
        const placeholderWalkAnim = `player-walk-${this.currentDirection}`;
        if (this.scene.anims.exists(placeholderWalkAnim)) {
          this.sprite.play(placeholderWalkAnim, true);
        }
      }
    } else if (!this.isMoving || directionChanged) {
      // If we stopped moving or changed direction while idle
      if (this.sprite.texture.key === 'player') {
        // For the new player sprite sheet
        const idleAnim = `player-idle-${this.currentDirection}`;
      
        this.sprite.play(idleAnim, true);
      } else if (this.animations['idle']) {
        // For aseprite animations
        this.sprite.play(this.animations['idle'], true);
      } else {
        // For placeholder animations
        const placeholderIdleAnim = 'player-idle';
        if (this.scene.anims.exists(placeholderIdleAnim)) {
          this.sprite.play(placeholderIdleAnim, true);
        }
      }
    }
  }
  
  // Add a method to handle object interactions in front of player
  interact(): Phaser.Types.Math.Vector2Like {
    // Calculate position in front of player based on facing direction
    const interactDistance = 30; // Increased for 48px tiles
    const position = {
      x: this.sprite.x,
      y: this.sprite.y
    };
    
    switch (this.currentDirection) {
      case 'up':
        position.y -= interactDistance;
        break;
      case 'down':
        position.y += interactDistance;
        break;
      case 'left':
        position.x -= interactDistance;
        break;
      case 'right':
        position.x += interactDistance;
        break;
    }
    
    return position;
  }
}

/**
 * MainScene for the Legend of Leo game
 * 
 * This scene handles the main game logic and rendering.
 * All game assets are pre-provided and loaded automatically.
 * The game uses a modern pixel art style similar to the reference image.
 */
export default class MainScene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private welcomeText?: Phaser.GameObjects.Text;
  private map?: Phaser.Tilemaps.Tilemap;
  private layers?: MapLayers;
  private gameData: GameData = {
    isNewGame: true,
    playerName: '',
    playerLevel: 1,
    playerScore: 0,
    completedModules: []
  };
  private introOverlay?: Phaser.GameObjects.Container;
  private gameStarted: boolean = false;
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private interactionIndicator?: Phaser.GameObjects.Sprite;
  private nearbyObject?: Phaser.GameObjects.GameObject;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Load pre-provided game assets
    loadAsepriteSheet(
      this,
      'leo',
      '/assets/sprites/leo.png',
      '/assets/aseprite/leo.json'
    );

    // Create a procedural tileset texture for walls
    this.createWallTexture();
    
    // Load the floor tile
    this.load.image('floor', '/assets/maps/floor.png');

    // Load environment elements
    this.load.image('building', '/assets/sprites/building.png');
    this.load.image('grass', '/assets/sprites/grass.png');
    this.load.image('sidewalk', '/assets/sprites/sidewalk.png');
    this.load.image('street', '/assets/sprites/street.png');

    // Load player sprite sheet (new character)
    console.log('Loading player sprite sheet...');
    this.load.spritesheet('player', '/assets/sprites/player.png', {
      frameWidth: 48,  // Each frame is 48x66 pixels
      frameHeight: 66,
      spacing: 0,      // No spacing between frames
      margin: 0        // No margin around frames
    });

    // Load placeholder graphics until final assets are integrated
    this.load.image('player-placeholder', '/assets/sprites/player-placeholder.png');
    
    // Load town tilemap JSON
    this.load.tilemapTiledJSON('town', '/assets/maps/town.json');
  }

  /**
   * Create a simple wall texture for the map boundaries
   */
  createWallTexture() {
    const size = 48; // Match the floor tile size
    
    // Create a canvas texture for the wall
    const wallCanvas = this.textures.createCanvas('wall', size, size);
    const ctx = wallCanvas?.getContext();
    
    // Check if canvas creation failed
    if (!wallCanvas || !ctx) {
      console.error('Failed to create canvas texture for wall');
      return;
    }
    
    // Draw a simple wall texture
    // Background color
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
    
    console.log('Wall texture created successfully');
  }

  create() {
    // Disable physics debugging
    this.physics.world.debugGraphic.clear();
    this.physics.world.debugGraphic.visible = false;
    this.physics.world.defaults.debugShowBody = false;
    this.physics.world.defaults.debugShowStaticBody = false;
    this.physics.world.defaults.debugShowVelocity = false;
    this.physics.world.defaults.bodyDebugColor = 0x00000000; // Transparent
    
    // Set background color to match the level scenes
    this.cameras.main.setBackgroundColor('#2B2A3D');
    
    // Get game data from registry if available
    if (this.registry.has('gameData')) {
      this.gameData = this.registry.get('gameData');
      console.log('Game data loaded:', this.gameData);
    } else {
      console.warn('No game data found in registry');
    }

    // Create the tilemap and layers
    try {
      console.log('Attempting to load tilemap...');
      const result = loadTilemap(
        this,
        'town', 
        ['Ground', 'Buildings', 'Collisions'],
        ['Collisions']
      );
      this.map = result.map;
      this.layers = result.layers;
      
      // Set world bounds based on the map dimensions
      const mapWidth = this.map.widthInPixels;
      const mapHeight = this.map.heightInPixels;
      this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
      console.log('Tilemap loaded successfully with dimensions:', mapWidth, 'x', mapHeight);
    } catch (error) {
      console.error('Failed to load tilemap, falling back to placeholder world. Error:', error);
      // Fall back to placeholder world if tilemap fails to load
      this.createPlaceholderWorld();
    }

    // Create player (starting position depends on whether we're using tilemap or placeholder)
    const startX = this.map ? 48 * 7 : 400; // Center of the map for 15x15 tiles
    const startY = this.map ? 48 * 7 : 300; // Center of the map for 15x15 tiles
    this.player = new Player(this, startX, startY);

    // Add colliders between player and tilemap layers if available
    if (this.layers && this.player) {
      addCollision(this, this.player.sprite, this.layers, ['Collisions']);
    }

    // Set up input
    this.cursors = this.input?.keyboard?.createCursorKeys();
    
    // Add keyboard interaction for player
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.interactWithNearbyObject();
    });
    
    // Set up camera to follow player with improved damping
    if (this.player) {
      this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
      this.cameras.main.setZoom(1); // Zoomed out for a wider view
      
      // Set camera bounds based on the map
      if (this.map) {
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
      } else {
        // Fallback to placeholder bounds
        this.cameras.main.setBounds(0, 0, 1200, 900);
      }
      
      // Add a subtle deadzone to make camera feel more natural
      this.cameras.main.setDeadzone(100, 100);
    }

    // Display the intro overlay instead of immediately showing welcome message
    this.createIntroOverlay();

    // Add some example interactive objects to the world (in the create method)
    // Add a few test interactive objects
    this.createInteractiveObject(300, 300, 0xFF0000, {
      isRectangle: true,
      width: 48,
      height: 48,
      onInteract: () => {
        console.log('Interacted with red object');
        this.createWelcomeMessage();
      }
    });

    this.createInteractiveObject(500, 400, 0x00FF00, {
      isRectangle: true,
      width: 48,
      height: 48,
      onInteract: () => {
        console.log('Interacted with green object');
        // Show some text above the object
        const text = this.add.text(500, 360, 'Hello!', {
          fontSize: '20px',
          color: '#FFFFFF',
          backgroundColor: '#00000080',
          padding: { x: 10, y: 5 }
        }).setOrigin(0.5);
        
        // Fade out after 2 seconds
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: text,
            alpha: 0,
            duration: 500,
            onComplete: () => text.destroy()
          });
        });
      }
    });
    
  }
  
  /**
   * Create the intro overlay with title, instructions, and continue button
   */
  createIntroOverlay() {
    // Get screen dimensions
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const centerX = width / 2;
    
    // Create a container for all overlay elements
    this.introOverlay = this.add.container(0, 0);
    this.introOverlay.setDepth(1000); // Make sure it's above everything
    
    // Semi-transparent background
    const background = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
    background.setOrigin(0, 0);
    this.introOverlay.add(background);
    
    // Game title
    const titleText = this.add.text(centerX, height * 0.25, 'Legend of Leo', {
      fontSize: '48px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold',
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000',
        blur: 5,
        fill: true
      }
    }).setOrigin(0.5);
    this.introOverlay.add(titleText);
    
    // Game description
    const descText = this.add.text(centerX, height * 0.4, 'An adventure through the world of Aleo blockchain', {
      fontSize: '20px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);
    this.introOverlay.add(descText);
    
    // Instructions
    const instructionsText = this.add.text(centerX, height * 0.55, 'Use arrow keys to move\nPress SPACE to interact with objects', {
      fontSize: '24px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);
    this.introOverlay.add(instructionsText);
    
    // Continue button
    const continueButton = this.add.rectangle(centerX, height * 0.75, 200, 60, 0x4CAF50);
    continueButton.setInteractive({ useHandCursor: true });
    
    const buttonText = this.add.text(centerX, height * 0.75, 'CONTINUE', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Add button elements to container
    this.introOverlay.add(continueButton);
    this.introOverlay.add(buttonText);
    
    // Button hover effect
    continueButton.on('pointerover', () => {
      continueButton.setFillStyle(0x2E7D32); // Darker green on hover
    });
    
    continueButton.on('pointerout', () => {
      continueButton.setFillStyle(0x4CAF50); // Back to original color
    });
    
    // Button click - start the game
    continueButton.on('pointerdown', () => {
      this.startGame();
    });
    
    // Make overlay fixed to camera
    this.introOverlay.setScrollFactor(0);
  }
  
  /**
   * Start the game by removing overlay and showing welcome message
   */
  startGame() {
    if (this.introOverlay) {
      // Fade out the overlay
      this.tweens.add({
        targets: this.introOverlay,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          if (this.introOverlay) {
            this.introOverlay.destroy();
            this.introOverlay = undefined;
          }
          
          // Show the welcome message
          this.createWelcomeMessage();
          
          // Set game as started
          this.gameStarted = true;
        }
      });
    }
  }
  
  createWelcomeMessage() {
    // Get screen dimensions for UI positioning
    const centerX = this.cameras.main.width / 2;
    
    const message = this.gameData.isNewGame
      ? "Welcome to Legend of Leo! Move around to explore."
      : `Welcome back, ${this.gameData.playerName || 'Adventurer'}! Level: ${this.gameData.playerLevel}`;

    this.welcomeText = this.add.text(centerX, 100, message, {
      fontSize: '20px',
      color: '#FFFFFF',
      backgroundColor: '#00000080',
      padding: { x: 16, y: 8 },
      align: 'center'
    }).setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    // Add a pulsing effect to the welcome text
    this.tweens.add({
      targets: this.welcomeText,
      scaleX: 1.05,
      scaleY: 1.05,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      duration: 800
    });
    
    // Hide welcome message after 5 seconds
    this.time.delayedCall(5000, () => {
      if (this.welcomeText) {
        this.tweens.add({
          targets: this.welcomeText,
          alpha: 0,
          duration: 1000,
          onComplete: () => {
            if (this.welcomeText) {
              this.welcomeText.destroy();
            }
          }
        });
      }
    });
  }
  
  /**
   * Fallback method to create a placeholder world if tilemap loading fails
   */
  createPlaceholderWorld() {
    console.log('Creating placeholder world');
    // Set up world boundaries
    this.physics.world.setBounds(0, 0, 1200, 900);
    
    // Set the background color
    this.cameras.main.setBackgroundColor('#2B2A3D');
    
    // Base layer - floor 
    this.add.rectangle(600, 450, 720, 720, 0x80A048).setOrigin(0.5);
    
    // Add some streets
    this.add.rectangle(600, 500, 600, 80, 0x505050).setOrigin(0.5);
    
    // Add street markings
    for (let i = 0; i < 7; i++) {
      this.add.rectangle(350 + i * 60, 500, 30, 6, 0xFFFF00);
    }
    
    // Add some buildings with shadow for depth
    const building = this.add.rectangle(400, 250, 300, 200, 0x2A4060).setOrigin(0.5);
    const buildingShadow = this.add.rectangle(410, 260, 300, 200, 0x000000, 0.3).setOrigin(0.5);
    buildingShadow.setDepth(0);
    building.setDepth(1);
    
    // Add collision for the building
    const buildingCollider = this.physics.add.existing(building, true) as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
    buildingCollider.body.setSize(300, 200);
    
    // Add some windows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        this.add.rectangle(300 + col * 70, 210 + row * 70, 30, 30, 0xF0D090).setDepth(2);
      }
    }
    
    // Add door
    this.add.rectangle(400, 330, 40, 60, 0x000000).setOrigin(0.5).setDepth(2);
    this.add.rectangle(400, 300, 60, 10, 0xA08060).setOrigin(0.5).setDepth(2);
    
    // Add some decorative elements
    for (let i = 0; i < 4; i++) {
      this.add.circle(250 + i * 100, 350, 15, 0x208040).setDepth(3);
    }
  }

  /**
   * Create an interactive object
   * 
   * @param x X position in the world
   * @param y Y position in the world
   * @param texture Texture key or color if using a rectangle
   * @param options Options including isRectangle, width, height, and onInteract
   * @returns The created object
   */
  createInteractiveObject(
    x: number, 
    y: number,
    texture: string | number,
    options: {
      isRectangle?: boolean, 
      width?: number, 
      height?: number,
      onInteract: () => void
    }
  ): Phaser.GameObjects.GameObject {
    // Create either a sprite or rectangle
    let object: Phaser.GameObjects.GameObject;
    
    if (options.isRectangle) {
      // Create a more visually appealing object instead of a plain rectangle
      const width = options.width || 48;
      const height = options.height || 48;
      
      // Create a container for our object
      const container = this.add.container(x, y);
      
      // Main colored rectangle with rounded corners and shadow effect
      const colorValue = texture as number;
      
      // Add shadow effect first (slightly offset darker rectangle)
      const shadow = this.add.rectangle(4, 4, width, height, 0x000000, 0.3);
      shadow.setOrigin(0.5);
      container.add(shadow);
      
      // Main rectangle with slightly rounded appearance
      const rect = this.add.rectangle(0, 0, width, height, colorValue, 1);
      rect.setOrigin(0.5);
      container.add(rect);
      
      // Add subtle highlight on top
      const highlight = this.add.rectangle(0, -height/2 + 5, width-4, 8, 0xFFFFFF, 0.2);
      highlight.setOrigin(0.5, 0.5);
      container.add(highlight);
      
      // Add a very subtle pulsing effect
      this.tweens.add({
        targets: rect,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      object = container;
    } else {
      object = this.add.sprite(x, y, texture as string);
    }
    
    // Make it interactive
    object.setData('interactive', true);
    object.setData('onInteract', options.onInteract);
    
    // Add to interactive objects array
    this.interactiveObjects.push(object);
    
    return object;
  }

  /**
   * Check if any interactive objects are in range and show indicators
   */
  checkInteractiveObjects() {
    if (!this.player) return;
    
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Interaction range
    let closestObject: Phaser.GameObjects.GameObject | undefined;
    let closestDistance = interactDistance;
    
    // Find the closest interactive object in range
    this.interactiveObjects.forEach(obj => {
      // Handle different types of game objects
      let objX = 0;
      let objY = 0;
      
      if ('getCenter' in obj) {
        const center = (obj as unknown as Phaser.GameObjects.Sprite).getCenter();
        objX = center.x;
        objY = center.y;
      } else if ('x' in obj && 'y' in obj) {
        // Use a type assertion with unknown first for safety
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
   * 
   * @param object The object to show indicator for
   */
  showInteractionIndicator(object: Phaser.GameObjects.GameObject) {
    // Get position of object (handle different types of game objects)
    let objX = 0;
    let objY = 0;
    
    if ('getCenter' in object) {
      const center = (object as unknown as Phaser.GameObjects.Sprite).getCenter();
      objX = center.x;
      objY = center.y;
    } else if ('x' in object && 'y' in object) {
      // Use a type assertion with unknown first for safety
      objX = (object as unknown as { x: number }).x;
      objY = (object as unknown as { y: number }).y;
    }
    
    // Position above the object
    const x = objX;
    const y = objY - 40;
    
    // If we don't have an indicator yet, create one
    if (!this.interactionIndicator) {
      // Create a subtle indicator that fits with the game's aesthetic
      this.interactionIndicator = this.add.sprite(x, y, 'interaction-indicator');
      
      // If we don't have an indicator texture, create a simple one
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
        y: y - 6, // Smaller movement for subtlety
        duration: 1200, // Slower for a more gentle feel
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Add a subtle pulsing effect
      this.tweens.add({
        targets: this.interactionIndicator,
        alpha: 0.6, // Pulse between full and 60% opacity
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
    if (this.nearbyObject && this.gameStarted) {
      const onInteract = this.nearbyObject.getData('onInteract');
      if (typeof onInteract === 'function') {
        onInteract();
      }
      
      // Remove visual feedback at the interaction point to keep the visuals clean
      // If you want subtle feedback, uncomment the code below
      /*
      const interactPosition = this.player?.interact();
      if (interactPosition) {
        const marker = this.add.circle(interactPosition.x, interactPosition.y, 5, 0xFFFF00, 0.3);
        marker.setAlpha(0.3);
        
        // Visual feedback will be removed after 300ms
        this.time.delayedCall(300, () => {
          this.tweens.add({
            targets: marker,
            alpha: 0,
            duration: 200,
            onComplete: () => marker.destroy()
          });
        });
      }
      */
    }
  }

 
  update() {
    if (!this.player || !this.cursors) return;

    // Only allow movement if the game has started
    if (this.gameStarted) {
      // Update player movement and animations
      this.player.update(this.cursors);
      
      // Check for nearby interactive objects
      this.checkInteractiveObjects();
    }
  }
} 
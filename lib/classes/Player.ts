'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';

/**
 * Player class to handle character movement, animations and interactions
 */
export default class Player {
  public sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private animations: Record<string, string> = {};
  private currentDirection: string = 'down';
  private isMoving: boolean = false;
  private scene: Scene;
  private moveSpeed: number = 180;
  public nearestInteractiveObject: Phaser.GameObjects.GameObject | undefined;
  public nearestInteractiveObjectDistance: number = Number.MAX_VALUE;
  
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
        if ('createAnimationsFromAseprite' in scene) {
          const createAnimationsFromAseprite = (scene as { createAnimationsFromAseprite: (scene: Scene, key: string, frameRate: number) => Record<string, string> }).createAnimationsFromAseprite;
          this.animations = createAnimationsFromAseprite(scene, 'leo', 10);
          this.sprite = scene.physics.add.sprite(x, y, 'leo');
          
          // Initialize with idle animation
          if (this.animations['idle']) {
            this.sprite.play(this.animations['idle']);
          }
        } else {
          throw new Error('Aseprite utilities not available');
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
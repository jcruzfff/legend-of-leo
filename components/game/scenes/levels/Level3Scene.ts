'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';
import { loadTilemap, addCollision, MapLayers } from '@/lib/utils/mapLoader';
import Player from '@/lib/classes/Player';

/**
 * Level3Scene - Privacy Protection
 * 
 * This is the third level of the Legend of Leo game.
 * Players learn advanced privacy protection techniques in this level.
 */
export default class Level3Scene extends Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private map?: Phaser.Tilemaps.Tilemap;
  private layers?: MapLayers;
  private interactiveObjects: Phaser.GameObjects.GameObject[] = [];
  private interactionIndicator?: Phaser.GameObjects.Sprite;
  private nearbyObject?: Phaser.GameObjects.GameObject;
  private exitGate?: Phaser.Physics.Arcade.Sprite;
  private blueGate?: Phaser.Physics.Arcade.Sprite;
  private boardTriggerZone?: Phaser.GameObjects.Zone;
  private boardTriggerActivated: boolean = false;

  constructor() {
    super({ key: 'Level3Scene' });
  }

  init() {
    // Store current scene in localStorage for development mode reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentScene', this.scene.key);
      console.log('Current scene saved:', this.scene.key);
    }
    
    // Initialize interactive objects array
    this.interactiveObjects = [];
    this.boardTriggerActivated = false;
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
    
    // Load floor tile
    if (!textureCheck('floor')) {
      this.load.image('floor', '/assets/maps/floor.png');
    }
    
    // Create wall texture
    this.createWallTexture();
    
    // Load level 3 tilemap (will need to be created)
    this.load.tilemapTiledJSON('level3', '/assets/maps/levels/level3.json');
    
    // Load additional tile images for the map
    if (!textureCheck('wall')) {
      this.load.image('wall', '/assets/maps/wall.png');
    }
    
    if (!textureCheck('backwall')) {
      this.load.image('backwall', '/assets/maps/backwall.png');
    }

    if (!textureCheck('backwall-keycard')) {
      this.load.image('backwall-keycard', '/assets/maps/backwall-keycard.png');
    }

    if (!textureCheck('backwall-exit')) {
      this.load.image('backwall-exit', '/assets/maps/backwall-exit.png');
    }

    if (!textureCheck('left-board')) {
      this.load.image('left-board', '/assets/maps/left-board.png');
    }

    if (!textureCheck('right-board')) {
      this.load.image('right-board', '/assets/maps/right-board.png');
    }

    // Load blue gate as a spritesheet with seven frames
    if (!textureCheck('blue-gate')) {
      this.load.spritesheet('blue-gate', '/assets/sprites/blue-gate.png', {
        frameWidth: 192,  // Each frame is 192px wide
        frameHeight: 93,  // Height from the texture
        spacing: 0,
        margin: 0,
        endFrame: 6 // Load all 7 frames (0-6)
      });
    }
    
    // Load border tiles
    const borderTiles = [
      'top-border', 'left-border', 'right-border', 'bottom-border',
      'left-t-corner-border', 'right-t-corner-border', 'left-b-corner-border', 'right-b-corner-border',
      'left-t-edge-corner', 'right-t-edge-corner', 'left-b-edge-corner', 'right-b-edge-corner'
    ];
    
    borderTiles.forEach(key => {
      if (!textureCheck(key)) {
        this.load.image(key, `/assets/maps/${key}.png`);
      }
    });

    // Create a white particle texture if it doesn't exist
    if (!this.textures.exists('white-particle')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xFFFFFF, 1);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('white-particle', 8, 8);
      graphics.destroy();
    }
  }

  /**
   * Create a wall texture for the level boundaries
   */
  createWallTexture() {
    // Skip if texture already exists
    if (this.textures.exists('wall')) {
      console.log('Wall texture already exists, reusing existing texture');
      return;
    }

    const size = 48; // Match the floor tile size
    
    // Create a canvas texture for the wall
    const wallCanvas = this.textures.createCanvas('wall', size, size);
    const ctx = wallCanvas?.getContext();
    
    if (!wallCanvas || !ctx) {
      console.error('Failed to create canvas texture for wall');
      return;
    }
    
    // Draw a simple wall texture
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
  }

  create() {
    // Disable physics debugging
    this.physics.world.debugGraphic.clear();
    this.physics.world.debugGraphic.visible = false;
    
    // Set the background color
    this.cameras.main.setBackgroundColor('#2B2A3D');
    
    // Try to load tilemap or fall back to a basic level
    try {
      console.log('Loading level3 tilemap...');
      const { map, layers } = loadTilemap(
        this,
        'level3',
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
      console.error('Failed to load level3 tilemap:', error);
      // Fall back to creating a programmatic level
      this.createBasicLevel();
    }
    
    // Create player at starting position
    // Set the player to spawn at the bottom left of the level
    const tileSize = 48;
    const startX = 2.5 * tileSize; // Bottom left of floor tiles (horizontally)
    const startY = 14 * tileSize; // Bottom left of floor tiles (vertically)
    this.player = new Player(this, startX, startY);
    
    // Add collision with the Collision layer
    if (this.player && this.layers) {
      addCollision(this, this.player.sprite, this.layers, ['Collision']);
    }
    
    // Set up input
    this.cursors = this.input?.keyboard?.createCursorKeys();
    
    // Add space key for interactions
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.interactWithNearbyObject();
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
    
    
    // Create an already-open blue gate in the hallway
    this.createOpenBlueGate();

    // Create the boards trigger area
    this.createBoardsTriggerArea();

    // Create a return point to Level 2 at the bottom left
    this.createReturnPoint();
  }

  /**
   * Create an already-open blue gate in the hallway
   */
  createOpenBlueGate() {
    const tileSize = 48;
    // Position the gate in the green hallway area visible in the image
    const gateX = 14 * tileSize; // Center of the hallway (horizontally)
    const gateY = 3 * tileSize; // Position in the hallway (vertically)
    
    console.log('Creating open blue gate at:', gateX, gateY);
    
    // Create the gate sprite with the blue-gate texture
    this.blueGate = this.physics.add.sprite(gateX, gateY, 'blue-gate');
    
    // Set the gate to show the final frame (fully open)
    this.blueGate.setFrame(6); // Use the last frame of the blue-gate spritesheet
    
    // Use the standard dimensions
    const frameWidth = 192;
    const textureHeight = 93;
    
    // Set the display size
    this.blueGate.setDisplaySize(frameWidth, textureHeight);
    
    // Store the frame dimensions
    this.blueGate.setData('frameWidth', frameWidth);
    this.blueGate.setData('textureHeight', textureHeight);
    
    // Disable physics body to allow player to pass through
    if (this.blueGate.body) {
      this.blueGate.body.enable = false;
    }
    
    // Set the gate as already open
    this.blueGate.setData('isOpen', true);
    
    // Add a subtle glow effect to make it more noticeable
    const glow = this.add.sprite(gateX, gateY, 'blue-gate');
    glow.setFrame(6); // Use the same frame as the gate
    glow.setDisplaySize(frameWidth, textureHeight);
    glow.setBlendMode('ADD');
    glow.setAlpha(0.15);
    
    // Add a subtle pulsing animation to the glow
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Create a trigger area below the boards that activates automatically
   */
  createBoardsTriggerArea() {
    const tileSize = 48;
    // Position the trigger zone below the boards in the hallway
    const triggerX = 10.5 * tileSize; // Center of the hallway (horizontally)
    const triggerY = 5.5 * tileSize; // Just below where the boards would be on the wall
    
    // Create an invisible zone that will trigger when the player walks through
    this.boardTriggerZone = this.add.zone(triggerX, triggerY, tileSize * 3, tileSize * 2);
    
    // Enable physics for the zone
    this.physics.world.enable(this.boardTriggerZone, Phaser.Physics.Arcade.STATIC_BODY);
    
    // Create the overlap detection with the player
    if (this.player) {
      this.physics.add.overlap(
        this.player.sprite,
        this.boardTriggerZone,
        this.triggerBoardDialog,
        undefined,
        this
      );
    }
    
    // Debug visualization (only in development)
    if (process.env.NODE_ENV === 'development') {
      const debugRect = this.add.rectangle(
        triggerX, 
        triggerY, 
        tileSize * 1, 
        tileSize * 3,
        0x00ff00,
        0
      );
      debugRect.setDepth(100);
    }

    
  }

  /**
   * Trigger dialog when player walks through the board area
   */
  triggerBoardDialog() {
    // Only trigger once
    if (this.boardTriggerActivated) return;

    this.boardTriggerActivated = true;
    console.log('Board trigger activated!');
    
    // Disable player movement while dialog is active
    if (this.player) {
      // Store the current movement state in the player object
      this.player.sprite.setData('previousVelocity', {x: this.player.sprite.body.velocity.x, y: this.player.sprite.body.velocity.y});
      // Stop the player
      this.player.sprite.setVelocity(0, 0);
      // Disable input processing in update
      this.player.sprite.setData('inputDisabled', true);
      
      // Stop any current animation and set to idle frame
      // Determine the appropriate idle animation based on last movement direction
      const lastVelocityX = this.player.sprite.body.velocity.x;
      const lastVelocityY = this.player.sprite.body.velocity.y;
      
      // Set to proper idle animation
      if (Math.abs(lastVelocityX) > Math.abs(lastVelocityY)) {
        // More horizontal movement
        if (lastVelocityX > 0) {
          this.player.sprite.anims.play('player-idle-right', true);
        } else {
          this.player.sprite.anims.play('player-idle-left', true);
        }
      } else {
        // More vertical movement
        if (lastVelocityY > 0) {
          this.player.sprite.anims.play('player-idle-down', true);
        } else {
          this.player.sprite.anims.play('player-idle-up', true);
        }
      }
      
      // Ensure the animation actually stops
      this.player.sprite.anims.pause();
    }
    
    // Create a dialogue box
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const dialogueBox = this.add.rectangle(
      width / 2,
      height - 250,
      width - 30,
      400,
      0x000000,
      0.9
    );
    dialogueBox.setScrollFactor(0);
    dialogueBox.setOrigin(0.5);
    dialogueBox.setStrokeStyle(2, 0xFFFFFF);
    
      const message = "Aleo is like the lego building blocks for users to take advantage of private, decentralized apps that use zero-knowledge cryptography — a shield against surveillance, exposure, and manipulation.\n\nThis isn't just about code. It's about control. It's about giving users the power to prove things without revealing everything.\n\nHere, privacy isn't a feature. It's the foundation.";
    
    const text = this.add.text(
      width / 2,
      height - 240,
      message,
      {
        fontSize: '24px',
        color: '#FFFFFF',
        align: 'center',
        wordWrap: { width: width - 150 }
      }
    );
    text.setScrollFactor(0);
    text.setOrigin(0.5);
    
    // Add a continue button
    const continueButton = this.add.rectangle(
      width / 2,
      height - 55,
      120,
      30,
      0x4CAF50
    );
    continueButton.setScrollFactor(0);
    continueButton.setInteractive({ useHandCursor: true });
    
    const buttonText = this.add.text(
      width / 2,
      height - 55, 
      'Continue',
      {
        fontSize: '14px',
        color: '#FFFFFF'
      }
    );
    buttonText.setScrollFactor(0);
    buttonText.setOrigin(0.5);
    
    // Group all dialogue elements
    const dialogueGroup = this.add.group([dialogueBox, text, continueButton, buttonText]);
    
    // Function to handle dialogue completion
    const completeDialogue = () => {
      // Remove the keyboard listener
      this.input.keyboard?.off('keydown-ENTER');
      
      // Destroy the dialogue
      dialogueGroup.destroy(true);

      // Re-enable player movement after dialog closes
      if (this.player) {
        // Re-enable input processing
        this.player.sprite.setData('inputDisabled', false);
        
        // Resume animation system (the actual animation will be controlled by the update method)
        this.player.sprite.anims.resume();
      }
    };
    
    // Handle continue button click
    continueButton.on('pointerdown', completeDialogue);
    
    // Add keyboard support for Enter key
    this.input.keyboard?.on('keydown-ENTER', completeDialogue);
  }
  
  /**
   * Center the map within the game window
   */
  centerMap() {
    if (!this.map) return;
    
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    const offsetX = Math.max(0, (gameWidth - mapWidth) / 2);
    const offsetY = Math.max(0, (gameHeight - mapHeight) / 2);
    
    if (this.map.layers) {
      this.map.layers.forEach(layer => {
        if (layer.tilemapLayer) {
          layer.tilemapLayer.x = offsetX;
          layer.tilemapLayer.y = offsetY;
        }
      });
    }
    
    this.physics.world.setBounds(offsetX, offsetY, mapWidth, mapHeight);
    this.cameras.main.setBounds(offsetX, offsetY, mapWidth, mapHeight);
  }
  
  /**
   * Create a basic level layout as a fallback
   */
  createBasicLevel() {
    const levelWidth = 20;
    const levelHeight = 15;
    const tileSize = 48;
    
    this.map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: levelWidth,
      height: levelHeight
    });
    
    // Add tilesets, but first check if the textures exist
    if (!this.textures.exists('floor')) {
      console.error('Floor texture missing, some visual elements may not display correctly');
    }
    if (!this.textures.exists('wall')) {
      console.error('Wall texture missing, some visual elements may not display correctly');
    }
    
    const floorTiles = this.map.addTilesetImage('floor', 'floor');
    const wallTiles = this.map.addTilesetImage('wall', 'wall');
    
    if (!floorTiles || !wallTiles) {
      console.error('Failed to add tilesets');
      return;
    }
    
    const floorLayer = this.map.createBlankLayer('Floor', floorTiles);
    const wallsLayer = this.map.createBlankLayer('Walls', wallTiles);
    
    if (!floorLayer || !wallsLayer) {
      console.error('Failed to create map layers');
      return;
    }
    
    this.layers = {
      Floor: floorLayer,
      Walls: wallsLayer
    };
    
    // Fill the floor with tiles
    floorLayer.fill(0, 0, 0, levelWidth, levelHeight);
    
    // Create walls around the perimeter
    for (let x = 0; x < levelWidth; x++) {
      wallsLayer.putTileAt(0, x, 0);
      wallsLayer.putTileAt(0, x, levelHeight - 1);
    }
    
    for (let y = 0; y < levelHeight; y++) {
      wallsLayer.putTileAt(0, 0, y);
      wallsLayer.putTileAt(0, levelWidth - 1, y);
    }
    
    // Set collision for wall layer
    wallsLayer.setCollisionByExclusion([-1]);
  }
  
  
  /**
   * Create a return point to go back to Level 2
   */
  createReturnPoint() {
    const tileSize = 48;
    // Position the return point at the bottom left of the level
    const returnX = 2.5 * tileSize;
    const returnY = 15 * tileSize;
    
    console.log('Creating return point at:', returnX, returnY);
    
    // Create an interaction zone
    const returnZone = this.add.rectangle(
      returnX,
      returnY,
      tileSize * 2,
      tileSize,
      0x0000ff,
      0.1
    );
    
    // Add a small arrow indicator pointing down to Level 2
    const arrowIndicator = this.add.text(
      returnX,
      returnY - tileSize/2,
      '↓',  // Down arrow symbol
      {
        fontSize: '24px',
        color: '#8888ff'
      }
    ).setOrigin(0.5);
    
    // Add a subtle pulsing effect to the arrow
    this.tweens.add({
      targets: arrowIndicator,
      alpha: { from: 0.7, to: 0.3 },
      duration: 1200,
      yoyo: true,
      repeat: -1
    });
    
    // Make the return zone interactive
    returnZone.setInteractive();
    returnZone.setData('interactive', true);
    returnZone.setData('onInteract', () => {
      this.returnToPreviousLevel();
    });
    
    // Add to interactive objects array
    this.interactiveObjects.push(returnZone);
  }
  
  /**
   * Return to previous level (Level 2)
   */
  returnToPreviousLevel() {
    // Prevent multiple transitions
    if (this.data && this.data.get('transitioning')) return;
    
    // Mark as transitioning
    this.data.set('transitioning', true);
    
    // Show a message about returning
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const returnText = this.add.text(
      width / 2,
      height / 2,
      "Returning to Level 2...",
      {
        fontSize: '18px',
        color: '#FFFFFF',
        backgroundColor: '#00000080',
        padding: { x: 20, y: 10 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Remove text after a few seconds
    this.time.delayedCall(2000, () => {
      returnText.destroy();
    });
    
    // Fade out effect
    this.cameras.main.fade(1000, 0, 0, 0);
    
    // Wait for fade to complete then change scene
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Level2Scene');
    });
  }
  
  /**
   * Check for interactive objects near the player
   */
  checkInteractiveObjects() {
    if (!this.player) return;
    
    // Find all interactive objects in range
    const playerPos = this.player.sprite.getCenter();
    const interactDistance = 60; // Interaction range
    let closestObject: Phaser.GameObjects.GameObject | undefined;
    let closestDistance = interactDistance;
    
    // Find the closest interactive object in range
    this.interactiveObjects.forEach(obj => {
      // Skip objects specifically marked as not visible for interaction
      if (obj.getData('visible') === false) return;
      
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
   */
  showInteractionIndicator(object: Phaser.GameObjects.GameObject) {
    let objX = 0;
    let objY = 0;
    
    // Check if this object has a custom indicator target
    const indicatorTarget = object.getData('indicatorTarget');
    const targetObject = indicatorTarget || object;
    
    if ('getCenter' in targetObject) {
      const center = (targetObject as unknown as Phaser.GameObjects.Sprite).getCenter();
      objX = center.x;
      objY = center.y;
    } else if ('x' in targetObject && 'y' in targetObject) {
      objX = (targetObject as unknown as { x: number }).x;
      objY = (targetObject as unknown as { y: number }).y;
    }
    
    // Position above the object
    const x = objX;
    const y = objY - 40;
    
    // If we don't have an indicator yet, create one
    if (!this.interactionIndicator) {
      // Create a simple indicator
      this.interactionIndicator = this.add.sprite(x, y, 'interaction-indicator');
      
      if (!this.textures.exists('interaction-indicator')) {
        console.log('Creating interaction indicator texture');
        const graphics = this.make.graphics({ x: 0, y: 0 });
        
        // Draw a small white dot with a glow effect
        graphics.fillStyle(0xFFFFFF, 0.8);
        graphics.fillCircle(16, 16, 4);
        
        // Add a subtle glow/halo
        graphics.fillStyle(0xFFFFFF, 0.3);
        graphics.fillCircle(16, 16, 8);
        
        graphics.generateTexture('interaction-indicator', 32, 32);
      }
      
      // Add a subtle bobbing animation
      this.tweens.add({
        targets: this.interactionIndicator,
        y: y - 6,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Add a subtle pulsing effect
      this.tweens.add({
        targets: this.interactionIndicator,
        alpha: 0.6,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Set the texture and make visible
    this.interactionIndicator.setTexture('interaction-indicator');
    this.interactionIndicator.setVisible(true);
    this.interactionIndicator.setPosition(x, y);
    
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
    if (this.nearbyObject) {
      const onInteract = this.nearbyObject.getData('onInteract');
      if (typeof onInteract === 'function') {
        onInteract();
      }
    }
  }

  /**
   * Update - called each frame
   */
  update() {
    if (!this.player || !this.cursors) return;
    
    // Check if player input is disabled (for dialog)
    const inputDisabled = this.player.sprite.getData('inputDisabled');
    
    // Only update player movement if input is not disabled
    if (!inputDisabled) {
      // Update player movement and animations
      this.player.update(this.cursors);
    }
    
    // Check for nearby interactive objects
    this.checkInteractiveObjects();
    
    // Check if player is walking through the open blue gate
    this.checkPlayerExitGate();
  }
  
  /**
   * Check if player walks through the open blue gate to trigger level transition
   */
  checkPlayerExitGate() {
    if (!this.player || !this.blueGate) return;
    
    // Check if player is within the gate bounds
    const playerBounds = this.player.sprite.getBounds();
    const gateBounds = this.blueGate.getBounds();
    
    if (Phaser.Geom.Rectangle.Overlaps(playerBounds, gateBounds)) {
      // Prevent multiple transitions
      if (this.blueGate.getData('transitioning')) return;
      
      this.blueGate.setData('transitioning', true);
      this.transitionToNextLevel();
    }
  }

  /**
   * Transition to the next level (Level 4)
   */
  transitionToNextLevel() {
    // Show a transition message
    // const width = this.cameras.main.width;
    // const height = this.cameras.main.height;
    
    // const transitionText = this.add.text(
    //   width / 2,
    //   height / 2,
    //   "Proceeding to Level 4...",
    //   {
    //     fontSize: '18px',
    //     color: '#FFFFFF',
    //     backgroundColor: '#00000080',
    //     padding: { x: 20, y: 10 },
    //     align: 'center'
    //   }
    // ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // // Remove text after a short delay (before the fade completes)
    // this.time.delayedCall(800, () => {
    //   transitionText.destroy();
    // });
    
    // Fade out effect
    this.cameras.main.fade(1000, 0, 0, 0);
    
    // Wait for fade to complete then change scene
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Transition to Level 4
      this.scene.start('Level4Scene');
    });
  }
} 
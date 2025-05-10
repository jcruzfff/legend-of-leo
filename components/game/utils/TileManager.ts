import { Scene, Tilemaps } from 'phaser';

/**
 * TileManager utility class to handle tilemap loading and collision detection
 */
export class TileManager {
  private scene: Scene;
  private map?: Tilemaps.Tilemap;
  private tileset?: Tilemaps.Tileset;
  private layers: Record<string, Tilemaps.TilemapLayer> = {};

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create tilemap from the specified key
   * 
   * @param key - The key of the loaded tilemap JSON
   * @param tilesetKey - The key of the loaded tileset image
   * @param tilesetName - The name of the tileset as defined in Tiled
   * @returns The created tilemap object
   */
  createMap(key: string, tilesetKey: string, tilesetName: string): Tilemaps.Tilemap {
    // Create the tilemap
    this.map = this.scene.make.tilemap({ key });
    
    // Add the tileset image to the map
    this.tileset = this.map.addTilesetImage(tilesetName, tilesetKey);
    
    if (!this.tileset) {
      throw new Error(`Failed to load tileset: ${tilesetName} with key ${tilesetKey}`);
    }
    
    return this.map;
  }

  /**
   * Create a layer from the tilemap and optionally set up collision
   * 
   * @param layerName - The name of the layer as defined in Tiled
   * @param createCollision - Whether to set up collision for this layer
   * @param visible - Whether the layer should be visible
   * @returns The created tilemap layer
   */
  createLayer(layerName: string, createCollision: boolean = false, visible: boolean = true): Tilemaps.TilemapLayer | undefined {
    if (!this.map || !this.tileset) {
      console.error('Map or tileset not initialized. Call createMap first.');
      return undefined;
    }

    // Create the layer
    const layer = this.map.createLayer(layerName, this.tileset, 0, 0);
    
    if (!layer) {
      console.error(`Failed to create layer: ${layerName}`);
      return undefined;
    }
    
    // Store the layer for later reference
    this.layers[layerName] = layer;
    
    // Set layer visibility
    layer.setVisible(visible);
    
    // Set up collision if requested
    if (createCollision) {
      // Method 1: Use 'collides' property set in Tiled
      this.map.setCollisionByProperty({ collides: true }, true, true, layerName);
      
      // Method 2: Set collision by tile index
      // uncomment if needed:
      // this.map.setCollision([1, 2, 3], true, true, layerName);
    }
    
    return layer;
  }

  /**
   * Add colliders between a game object and one or more map layers
   * 
   * @param object - The game object to add colliders for
   * @param layerNames - Array of layer names to create colliders with
   * @param callback - Optional callback function when collision occurs
   */
  addColliders(
    object: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    layerNames: string[],
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
  ): void {
    if (!this.map) {
      console.error('Map not initialized. Call createMap first.');
      return;
    }
    
    layerNames.forEach(layerName => {
      const layer = this.layers[layerName];
      if (layer) {
        if (callback) {
          this.scene.physics.add.collider(object, layer, callback);
        } else {
          this.scene.physics.add.collider(object, layer);
        }
      } else {
        console.warn(`Layer ${layerName} not found when adding colliders.`);
      }
    });
  }

  /**
   * Get a specific map layer by name
   * 
   * @param layerName - The name of the layer to retrieve
   * @returns The requested layer or undefined if not found
   */
  getLayer(layerName: string): Tilemaps.TilemapLayer | undefined {
    return this.layers[layerName];
  }

  /**
   * Get all created layers
   * 
   * @returns Record of all created layers
   */
  getLayers(): Record<string, Tilemaps.TilemapLayer> {
    return this.layers;
  }
  
  /**
   * Get the tilemap object
   * 
   * @returns The tilemap object or undefined if not created
   */
  getMap(): Tilemaps.Tilemap | undefined {
    return this.map;
  }
} 
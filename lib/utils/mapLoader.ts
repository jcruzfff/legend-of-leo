import { Scene, Tilemaps } from 'phaser';

/**
 * Object containing layers for easy access
 */
export interface MapLayers {
  [key: string]: Tilemaps.TilemapLayer;
}

/**
 * Load a tilemap with all its layers
 * 
 * @param scene The scene to load the map into
 * @param key The key of the tilemap JSON file
 * @param layerNames Array of layer names to load
 * @param collisionLayers Array of layer names that should have collision
 * @returns Object with map and layers
 */
export function loadTilemap(
  scene: Scene,
  key: string,
  layerNames: string[],
  collisionLayers: string[] = []
): { map: Tilemaps.Tilemap; layers: MapLayers } {
  // Create the map
  const map = scene.make.tilemap({ key });
  
  // Check if map loaded
  if (!map) {
    throw new Error(`Failed to create tilemap with key: ${key}`);
  }
  
  // Log map details for debugging
  console.log(`Map created: ${map.width}x${map.height} tiles, ${map.widthInPixels}x${map.heightInPixels}px`);
  console.log(`Map has ${map.layers.length} layers and ${map.tilesets.length} tilesets`);
  
  try {
    // Get information about the tilesets in the Tiled map
    const tilesets: Tilemaps.Tileset[] = [];
    
    // Add all tilesets from the map
    map.tilesets.forEach(tilesetData => {
      const tilesetName = tilesetData.name;
      const imageKey = tilesetName; // The key should match the name in the Tiled map
      
      console.log(`Adding tileset: ${tilesetName} with image key: ${imageKey}`);
      
      const tileset = map.addTilesetImage(tilesetName, imageKey);
      if (tileset) {
        tilesets.push(tileset);
      } else {
        console.warn(`Failed to add tileset: ${tilesetName}`);
      }
    });
    
    if (tilesets.length === 0) {
      throw new Error('No tilesets could be loaded for the map');
    }
    
    // Create the layers
    const layers: MapLayers = {};
    
    layerNames.forEach(layerName => {
      // Check if layer exists in map
      if (!map.getLayer(layerName)) {
        console.warn(`Layer "${layerName}" not found in tilemap`);
        return;
      }
      
      // Create the layer with all tilesets
      const layer = map.createLayer(layerName, tilesets, 0, 0);
      if (layer) {
        layers[layerName] = layer;
        
        // Set up collision for this layer if needed
        if (collisionLayers.includes(layerName)) {
          // Try property-based collision first
          map.setCollisionByProperty({ collides: true }, true, false, layerName);
          
          // Fallback to using non-zero tiles if no properties set
          const hasCollisionTiles = layer.filterTiles(tile => tile.collides).length > 0;
          if (!hasCollisionTiles) {
            map.setCollisionByExclusion([-1], true, layerName);
          }
        }
      } else {
        console.warn(`Failed to create layer: ${layerName}`);
      }
    });
    
    return { map, layers };
  } catch (error) {
    console.error('Error loading tilemap:', error);
    throw error;
  }
}

/**
 * Add collision between an object and tilemap layers
 * 
 * @param scene The scene containing the physics
 * @param object The game object to collide with layers
 * @param layers Object containing the tilemap layers
 * @param layerNames Names of layers to add collision with
 * @param callback Optional collision callback
 */
export function addCollision(
  scene: Scene,
  object: Phaser.Types.Physics.Arcade.ArcadeColliderType,
  layers: MapLayers,
  layerNames: string[],
  callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
): void {
  layerNames.forEach(layerName => {
    const layer = layers[layerName];
    if (layer) {
      if (callback) {
        scene.physics.add.collider(object, layer, callback);
      } else {
        scene.physics.add.collider(object, layer);
      }
    }
  });
} 
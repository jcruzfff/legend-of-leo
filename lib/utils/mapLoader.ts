'use client'; /* This file is only executed on the client side */

import { Scene } from 'phaser';

/**
 * Interface for storing map layers for easy access
 */
export interface MapLayers {
  [key: string]: Phaser.Tilemaps.TilemapLayer;
}

/**
 * Load a tilemap and create layers
 * 
 * @param scene The current Phaser scene
 * @param key The key of the tilemap in the cache
 * @param layerNames The names of the layers to create
 * @param collisionLayers Names of layers that should have collision enabled
 * @returns The created tilemap and layers
 */
export function loadTilemap(
  scene: Scene,
  key: string,
  layerNames: string[],
  collisionLayers: string[] = []
): { map: Phaser.Tilemaps.Tilemap, layers: MapLayers } {
  try {
    // Load the tilemap
    const map = scene.make.tilemap({ key });
    
    // Get the tileset(s) - this assumes the tileset name in Tiled matches the image key
    const tilesets: Phaser.Tilemaps.Tileset[] = [];
    
    // Try to add each potential tileset in the map
    map.tilesets.forEach(tileset => {
      try {
        // Check if the tileset image is loaded
        if (!scene.textures.exists(tileset.name)) {
          console.warn(`Tileset image '${tileset.name}' not loaded, skipping`);
          return;
        }
        
        const addedTileset = map.addTilesetImage(tileset.name, tileset.name);
        if (addedTileset) {
          tilesets.push(addedTileset);
        }
      } catch (e) {
        console.warn(`Failed to add tileset ${tileset.name}:`, e);
      }
    });
    
    // If we couldn't add any tilesets, try using a default tileset
    if (tilesets.length === 0) {
      if (scene.textures.exists('floor')) {
        const tileset = map.addTilesetImage('floor', 'floor');
        if (tileset) tilesets.push(tileset);
      }
      
      if (scene.textures.exists('wall')) {
        const tileset = map.addTilesetImage('wall', 'wall');
        if (tileset) tilesets.push(tileset);
      }
    }
    
    // If we still don't have any tilesets, create a fallback tilemap
    if (tilesets.length === 0) {
      console.warn('No valid tilesets found, using fallback map');
      return createFallbackMap(scene);
    }
    
    // Create all the layers
    const layers: MapLayers = {};
    
    layerNames.forEach(layerName => {
      try {
        // Check if the layer exists in the map data
        if (!map.layers.some(l => l.name === layerName)) {
          console.warn(`Layer '${layerName}' not found in map data, skipping`);
          return;
        }
        
        const layer = map.createLayer(layerName, tilesets);
        if (layer) {
          layers[layerName] = layer;
          
          // Enable collision for this layer if it's in the collision layers list
          if (collisionLayers.includes(layerName)) {
            layer.setCollisionByExclusion([-1]);
          }
        }
      } catch (e) {
        console.warn(`Failed to create layer ${layerName}:`, e);
      }
    });
    
    return { map, layers };
  } catch (error) {
    console.error('Error loading tilemap:', error);
    return createFallbackMap(scene);
  }
}

/**
 * Create a fallback map when the main tilemap fails to load
 */
function createFallbackMap(scene: Scene): { map: Phaser.Tilemaps.Tilemap, layers: MapLayers } {
  // Create an empty tilemap as fallback
  const fallbackMap = scene.make.tilemap({
    tileWidth: 48,
    tileHeight: 48,
    width: 20,
    height: 15
  });
  
  // Create empty layers
  const fallbackLayers: MapLayers = {};
  
  // Return the fallback map and layers
  return { map: fallbackMap, layers: fallbackLayers };
}

/**
 * Add collision between a sprite and tilemap layers
 * 
 * @param scene The current Phaser scene
 * @param sprite The sprite to add collision for
 * @param layers The map layers
 * @param collisionLayerNames Names of layers that should collide with the sprite
 */
export function addCollision(
  scene: Scene,
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
  layers: MapLayers,
  collisionLayerNames: string[]
): void {
  collisionLayerNames.forEach(layerName => {
    const layer = layers[layerName];
    if (layer) {
      scene.physics.add.collider(sprite, layer);
    } else {
      console.warn(`Layer '${layerName}' not found for collision`);
    }
  });
} 
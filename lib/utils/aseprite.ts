/**
 * Sprite sheet utilities for Phaser integration
 * 
 * This file provides utilities for working with pre-provided sprite sheets
 * exported from Aseprite. Users do NOT need to create or modify
 * these assets - they are included with the game.
 * 
 * The game uses a modern pixel art style with a full color palette,
 * similar to games like Stardew Valley, Eastward, or CrossCode.
 */

import { Scene } from 'phaser';

/**
 * Interface for Aseprite JSON tag data (animation sequences)
 */
interface AsepriteTag {
  name: string;
  from: number;
  to: number;
  direction: 'forward' | 'reverse' | 'pingpong';
}

/**
 * Interface for Aseprite JSON frame data
 */
interface AsepriteFrame {
  frame: { x: number; y: number; w: number; h: number };
  duration: number;
}

/**
 * Interface for Aseprite JSON export format
 */
interface AsepriteData {
  frames: Record<string, AsepriteFrame>;
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: string;
    frameTags: AsepriteTag[];
  };
}

/**
 * Load Aseprite sprite sheet into a Phaser scene
 * 
 * @param scene - The Phaser scene to load the sprite sheet into
 * @param key - The key to identify the sprite sheet
 * @param imagePath - Path to the sprite sheet image
 * @param jsonPath - Path to the Aseprite JSON file
 */
export function loadAsepriteSheet(
  scene: Scene,
  key: string,
  imagePath: string,
  jsonPath: string
): void {
  scene.load.atlas(key, imagePath, jsonPath);
}

/**
 * Create animations from Aseprite sprite sheet data
 * 
 * @param scene - The Phaser scene to create animations in
 * @param textureKey - The key for the loaded sprite sheet texture
 * @param animationSpeed - Default animation speed (frames per second)
 * @param repeat - Whether animations should repeat (-1 for infinite)
 * @returns Object mapping animation names to their keys
 */
export function createAnimationsFromAseprite(
  scene: Scene,
  textureKey: string,
  animationSpeed: number = 10,
  repeat: number = -1
): Record<string, string> {
  // Try to access the JSON data
  const json = scene.cache.json.get(textureKey) as AsepriteData;
  
  if (!json || !json.meta || !json.meta.frameTags) {
    console.error(`No Aseprite data found for key: ${textureKey}`);
    return {};
  }
  
  const animations: Record<string, string> = {};
  
  // Process each animation tag
  json.meta.frameTags.forEach((tag) => {
    const animKey = `${textureKey}_${tag.name}`;
    const frameNames = [];
    
    // Get the frame names for this animation
    for (let i = tag.from; i <= tag.to; i++) {
      const frameName = Object.keys(json.frames)[i];
      if (frameName) {
        frameNames.push({ key: textureKey, frame: frameName });
      }
    }
    
    // Create the animation with the appropriate direction
    scene.anims.create({
      key: animKey,
      frames: frameNames,
      frameRate: animationSpeed,
      repeat: repeat,
      yoyo: tag.direction === 'pingpong'
    });
    
    animations[tag.name] = animKey;
  });
  
  return animations;
}

/**
 * Get animation duration in milliseconds
 * 
 * @param scene - The Phaser scene
 * @param animKey - The animation key
 * @returns Duration in milliseconds or 0 if animation not found
 */
export function getAnimationDuration(scene: Scene, animKey: string): number {
  const anim = scene.anims.get(animKey);
  if (!anim) return 0;
  
  return anim.duration;
}

/**
 * Create a Phaser animation from an Aseprite tag
 * 
 * @param scene - The Phaser scene
 * @param textureKey - The sprite sheet texture key
 * @param tagName - The name of the Aseprite tag (animation)
 * @param animKey - Optional custom animation key (defaults to textureKey_tagName)
 * @param frameRate - Animation speed in frames per second
 * @param repeat - Number of times to repeat (-1 for infinite)
 * @returns The animation key or undefined if creation failed
 */
export function createAnimationFromTag(
  scene: Scene,
  textureKey: string,
  tagName: string,
  animKey?: string,
  frameRate: number = 10,
  repeat: number = -1
): string | undefined {
  const json = scene.cache.json.get(textureKey) as AsepriteData;
  
  if (!json || !json.meta || !json.meta.frameTags) {
    console.error(`No Aseprite data found for key: ${textureKey}`);
    return undefined;
  }
  
  // Find the tag by name
  const tag = json.meta.frameTags.find(t => t.name === tagName);
  
  if (!tag) {
    console.error(`No tag named '${tagName}' found in Aseprite data for key: ${textureKey}`);
    return undefined;
  }
  
  const key = animKey || `${textureKey}_${tagName}`;
  const frameNames = [];
  
  // Get the frame names for this animation
  for (let i = tag.from; i <= tag.to; i++) {
    const frameName = Object.keys(json.frames)[i];
    if (frameName) {
      frameNames.push({ key: textureKey, frame: frameName });
    }
  }
  
  // Create the animation
  scene.anims.create({
    key: key,
    frames: frameNames,
    frameRate: frameRate,
    repeat: repeat,
    yoyo: tag.direction === 'pingpong'
  });
  
  return key;
} 
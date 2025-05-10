'use client'; /* This file is only executed on the client side */

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
 * Interface for Aseprite animation tag data
 */
interface AsepriteTag {
  name: string;
  from: number;
  to: number;
  direction: string;
}

/**
 * Interface for Aseprite JSON data
 */
interface AsepriteData {
  frames: {
    [key: string]: {
      frame: {
        x: number;
        y: number;
        w: number;
        h: number;
      };
      duration: number;
    };
  };
  meta: {
    frameTags: AsepriteTag[];
  };
}

/**
 * Load an Aseprite spritesheet
 * 
 * @param scene The current Phaser scene
 * @param key The key to use for the spritesheet
 * @param imagePath Path to the spritesheet image
 * @param jsonPath Path to the Aseprite JSON data
 * @returns The loaded spritesheet
 */
export function loadAsepriteSheet(
  scene: Scene,
  key: string,
  imagePath: string,
  jsonPath: string
): void {
  // Load JSON data
  scene.load.json(`${key}-json`, jsonPath);
  
  // Load image
  scene.load.image(key, imagePath);
}

/**
 * Create animations from Aseprite JSON data
 * 
 * @param scene The current Phaser scene
 * @param key The key of the spritesheet
 * @param frameRate The frame rate to use (defaults to 10)
 * @returns A record of animation keys mapped to their names
 */
export function createAnimationsFromAseprite(
  scene: Scene,
  key: string,
  frameRate: number = 10
): Record<string, string> {
  try {
    // Get the JSON data
    const jsonKey = `${key}-json`;
    
    if (!scene.cache.json.exists(jsonKey)) {
      console.error(`JSON data for ${key} not found.`);
      return {};
    }
    
    const data = scene.cache.json.get(jsonKey) as AsepriteData;
    const animKeys: Record<string, string> = {};
    
    // Process each tag and create an animation
    if (data.meta && data.meta.frameTags) {
      data.meta.frameTags.forEach((tag) => {
        // Create a frame array for this tag
        const frames = [];
        
        // Calculate the number of frames in the spritesheet
        const frameCount = tag.to - tag.from + 1;
        
        // Create frames based on the tag data
        for (let i = 0; i < frameCount; i++) {
          const frameIndex = tag.from + i;
          frames.push({ key, frame: frameIndex });
        }
        
        // Animation key in the format "key_tagName"
        const animKey = `${key}_${tag.name}`;
        
        // Create the animation
        scene.anims.create({
          key: animKey,
          frames,
          frameRate,
          repeat: tag.direction === 'pingpong' ? -1 : -1, // Loop indefinitely
        });
        
        // Store the animation key
        animKeys[tag.name] = animKey;
      });
    } else {
      console.warn(`No frame tags found in Aseprite data for ${key}`);
    }
    
    return animKeys;
  } catch (error) {
    console.error('Error creating animations from Aseprite data:', error);
    return {};
  }
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
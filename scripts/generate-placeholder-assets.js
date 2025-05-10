#!/usr/bin/env node

/**
 * DEVELOPMENT USE ONLY
 * 
 * This script generates placeholder image assets for development and testing.
 * In the production game, these will be replaced with the official game assets.
 * The placeholders use a modern pixel art style similar to the reference image.
 * 
 * Users will NOT need to run this script - they will receive the game with all
 * assets pre-packaged and ready to use.
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../public/assets');
const SPRITES_DIR = path.join(ASSETS_DIR, 'sprites');
const ASEPRITE_DIR = path.join(ASSETS_DIR, 'aseprite');
const MAPS_DIR = path.join(ASSETS_DIR, 'maps');
const UI_DIR = path.join(ASSETS_DIR, 'ui');

// Ensure directories exist
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
if (!fs.existsSync(SPRITES_DIR)) fs.mkdirSync(SPRITES_DIR, { recursive: true });
if (!fs.existsSync(ASEPRITE_DIR)) fs.mkdirSync(ASEPRITE_DIR, { recursive: true });
if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true });
if (!fs.existsSync(UI_DIR)) fs.mkdirSync(UI_DIR, { recursive: true });

// Generate a placeholder PNG file with base64 data
function generatePlaceholderPNG(outputPath, width, height, color = '#306230') {
  // Create a small PNG data URL for a colored square
  // This is a very simple 1x1 pixel PNG, which browsers will scale up
  const pngData = Buffer.from(`
    iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==
    `.trim(), 'base64');

  fs.writeFileSync(outputPath, pngData);
  console.log(`Created placeholder image: ${outputPath}`);
}

// Generate a placeholder JSON file for Aseprite data
function generatePlaceholderAsepriteJSON(outputPath, textureName, animations = ['idle', 'walk_down', 'walk_up', 'walk_left', 'walk_right']) {
  const frames = {};
  let frameIndex = 0;
  
  // Create frames for each animation (2 frames per animation for simple movement)
  animations.forEach((anim, animIndex) => {
    frames[`${anim}_0`] = {
      frame: { x: 0, y: animIndex * 48, w: 32, h: 48 },
      duration: 200
    };
    frames[`${anim}_1`] = {
      frame: { x: 32, y: animIndex * 48, w: 32, h: 48 },
      duration: 200
    };
  });
  
  const data = {
    frames,
    meta: {
      app: "Placeholder Generator",
      version: "1.0",
      image: `/assets/sprites/${textureName}`,
      format: "RGBA8888",
      size: { w: 64, h: 240 }, // Space for 5 animations with 2 frames each
      scale: "1",
      frameTags: animations.map((anim, index) => ({
        name: anim,
        from: index * 2,
        to: index * 2 + 1,
        direction: "forward"
      }))
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Created placeholder Aseprite JSON: ${outputPath}`);
}

// Generate player placeholder
generatePlaceholderPNG(path.join(SPRITES_DIR, 'player-placeholder.png'), 32, 48, '#D04060');

// Generate Leo (main character) placeholder
generatePlaceholderPNG(path.join(SPRITES_DIR, 'leo.png'), 32, 48, '#6080C0');
generatePlaceholderAsepriteJSON(path.join(ASEPRITE_DIR, 'leo.json'), 'leo.png');

// Generate environment placeholders
generatePlaceholderPNG(path.join(SPRITES_DIR, 'tileset.png'), 256, 256, '#80C050');
generatePlaceholderPNG(path.join(SPRITES_DIR, 'building.png'), 300, 200, '#2A4060');
generatePlaceholderPNG(path.join(SPRITES_DIR, 'grass.png'), 64, 64, '#80A048');
generatePlaceholderPNG(path.join(SPRITES_DIR, 'sidewalk.png'), 64, 64, '#D0D0D0');
generatePlaceholderPNG(path.join(SPRITES_DIR, 'street.png'), 64, 64, '#505050');

// Generate UI placeholders
generatePlaceholderPNG(path.join(UI_DIR, 'button.png'), 120, 40, '#2080C0');
generatePlaceholderPNG(path.join(UI_DIR, 'panel.png'), 300, 200, '#303040');
generatePlaceholderPNG(path.join(UI_DIR, 'dialog.png'), 400, 200, '#F0F0F0');

console.log('All placeholder assets generated successfully!');
console.log('Replace these with actual assets when available.'); 
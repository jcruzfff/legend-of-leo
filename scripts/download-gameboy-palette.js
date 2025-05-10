#!/usr/bin/env node

/**
 * This script creates reference colors and palette information
 * for the modern pixel art style used in Legend of Leo
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../public/assets/palettes');

// Ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Create a reference palette JSON with suggested colors for different elements
// These aren't strict limitations, just references for consistency
const referencePalette = {
  // Character palettes (sample colors for common elements)
  character: {
    skin: ['#F8D8B0', '#E0B088', '#A86048', '#753820'],
    hair: ['#F0C000', '#D08020', '#803010', '#401010'],
    clothing: {
      warm: ['#F0A0A0', '#D04060', '#802040', '#401030'],
      cool: ['#A0C0F0', '#6080C0', '#304080', '#102040']
    }
  },
  
  // Environment palettes (sample colors for common elements)
  environment: {
    grass: ['#D0F8B0', '#80C050', '#408028', '#204018'],
    dirt: ['#F0D890', '#C09860', '#805830', '#403018'],
    stone: ['#F0F0F0', '#B0C0D0', '#708090', '#384048'],
    wood: ['#F0C080', '#C08040', '#805020', '#402818']
  },
  
  // UI palette (sample colors for interface elements)
  ui: {
    background: ['#FFFFFF', '#F0F0F0', '#D0D0D0', '#303040'],
    accent: ['#5CB8FF', '#2080C0', '#1060A0', '#084880'],
    text: ['#FFFFFF', '#E0E0E0', '#606060', '#202020'],
    highlight: ['#FFD700', '#FF8000', '#FF4000', '#FF0000']
  }
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'reference-colors.json'), 
  JSON.stringify(referencePalette, null, 2)
);

console.log('Modern pixel art color reference created at public/assets/palettes/reference-colors.json');
console.log('This file is for developer reference only and not a strict limitation.'); 
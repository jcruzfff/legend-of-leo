const fs = require('fs');
const path = require('path');

// Create a simple tileset as a data URL
function createTilesetDataURL() {
  // Define the canvas dimensions
  const width = 128;
  const height = 64;
  const tileSize = 32;
  
  // Create a canvas in memory
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Define colors for different tile types
  const colors = [
    '#8BC34A', // Grass - tile 1
    '#9CCC65', // Light grass - tile 2
    '#FFC107', // Sand/Path - tile 3
    '#03A9F4', // Water - tile 4
    '#795548', // Dirt/Wall - tile 5
    '#9E9E9E', // Stone - tile 6
    '#F44336', // Barrier - tile 7
    '#4CAF50'  // Tree/Bush - tile 8
  ];
  
  // Draw each tile
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 4; x++) {
      const index = y * 4 + x;
      const color = colors[index];
      
      // Fill the tile with the base color
      ctx.fillStyle = color;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      
      // Add a border
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      
      // Add some simple texture
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      if (index === 0 || index === 1) { // Grass tiles
        for (let i = 0; i < 5; i++) {
          const dotX = x * tileSize + Math.random() * tileSize;
          const dotY = y * tileSize + Math.random() * tileSize;
          ctx.fillRect(dotX, dotY, 2, 2);
        }
      } else if (index === 3) { // Water tile
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x * tileSize + 5, y * tileSize + 15, 22, 2);
      }
    }
  }
  
  // Return the canvas as a data URL
  return canvas.toDataURL('image/png');
}

// Create a very basic PNG directly using binary data
function createBasicTileset() {
  // IHDR chunk for a 128x64 PNG with 8-bit RGBA
  const IHDR = Buffer.from([
    0x00, 0x00, 0x00, 0x0D, // Length of IHDR chunk
    0x49, 0x48, 0x44, 0x52, // 'IHDR'
    0x00, 0x00, 0x00, 0x80, // Width (128)
    0x00, 0x00, 0x00, 0x40, // Height (64)
    0x08, // Bit depth (8)
    0x06, // Color type (6 = RGBA)
    0x00, // Compression method (0)
    0x00, // Filter method (0)
    0x00, // Interlace method (0)
    0x00, 0x00, 0x00, 0x00 // CRC (placeholder)
  ]);
  
  // Create a simple colored 4x2 tileset
  const pixelData = Buffer.alloc(128 * 64 * 4); // 4 bytes per pixel (RGBA)
  
  // Define colors for different tile types (R, G, B, A)
  const colors = [
    [139, 195, 74, 255],   // Grass - tile 1
    [156, 204, 101, 255],  // Light grass - tile 2
    [255, 193, 7, 255],    // Sand/Path - tile 3
    [3, 169, 244, 255],    // Water - tile 4
    [121, 85, 72, 255],    // Dirt/Wall - tile 5
    [158, 158, 158, 255],  // Stone - tile 6
    [244, 67, 54, 255],    // Barrier - tile 7
    [76, 175, 80, 255]     // Tree/Bush - tile 8
  ];
  
  // Fill the pixel data
  const tileSize = 32;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 128; x++) {
      // Determine which tile this pixel belongs to
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const tileIndex = tileY * 4 + tileX;
      
      // Get the color for this tile
      const color = colors[tileIndex];
      
      // Calculate the pixel index in the buffer
      const pixelIndex = (y * 128 + x) * 4;
      
      // Set the pixel color
      pixelData[pixelIndex] = color[0];     // R
      pixelData[pixelIndex + 1] = color[1]; // G
      pixelData[pixelIndex + 2] = color[2]; // B
      pixelData[pixelIndex + 3] = color[3]; // A
      
      // Add a simple border effect
      if (x % tileSize === 0 || y % tileSize === 0 || 
          x % tileSize === tileSize - 1 || y % tileSize === tileSize - 1) {
        pixelData[pixelIndex] = Math.max(0, color[0] - 30);
        pixelData[pixelIndex + 1] = Math.max(0, color[1] - 30);
        pixelData[pixelIndex + 2] = Math.max(0, color[2] - 30);
      }
    }
  }
  
  return pixelData;
}

// This is a very simplified approach that doesn't create a fully valid PNG
// In a real application, you would use a library like 'pngjs' or 'sharp'
// to properly create a PNG file
function createSimplePNG() {
  // Create a very simple colored tileset
  const width = 128;
  const height = 64;
  const tileSize = 32;
  
  // Create a very simple colored image with a 4x2 grid
  const buffer = Buffer.alloc(width * height * 4); // 4 bytes per pixel (RGBA)
  
  // Define colors for different tile types (R, G, B, A)
  const colors = [
    [139, 195, 74, 255],   // Grass - tile 1
    [156, 204, 101, 255],  // Light grass - tile 2
    [255, 193, 7, 255],    // Sand/Path - tile 3
    [3, 169, 244, 255],    // Water - tile 4
    [121, 85, 72, 255],    // Dirt/Wall - tile 5
    [158, 158, 158, 255],  // Stone - tile 6
    [244, 67, 54, 255],    // Barrier - tile 7
    [76, 175, 80, 255]     // Tree/Bush - tile 8
  ];
  
  // Fill the pixel data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Determine which tile this pixel belongs to
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const tileIndex = tileY * 4 + tileX;
      
      // Get the color for this tile
      const color = colors[tileIndex];
      
      // Calculate the pixel index in the buffer
      const pixelIndex = (y * width + x) * 4;
      
      // Set the pixel color
      buffer[pixelIndex] = color[0];     // R
      buffer[pixelIndex + 1] = color[1]; // G
      buffer[pixelIndex + 2] = color[2]; // B
      buffer[pixelIndex + 3] = color[3]; // A
      
      // Add a simple border effect
      if (x % tileSize === 0 || y % tileSize === 0 || 
          x % tileSize === tileSize - 1 || y % tileSize === tileSize - 1) {
        buffer[pixelIndex] = Math.max(0, color[0] - 30);
        buffer[pixelIndex + 1] = Math.max(0, color[1] - 30);
        buffer[pixelIndex + 2] = Math.max(0, color[2] - 30);
      }
    }
  }
  
  return buffer;
}

// Create this file if running in Node.js
if (typeof window === 'undefined') {
  // Since we can't create a canvas directly in Node.js without additional libraries,
  // we'll simply create a placeholder file with a warning
  const placeholderContent = `This is a placeholder for the tileset image.
Please use the HTML file (scripts/create-tileset.html) in a browser to generate a proper tileset image.
Then save it to public/assets/sprites/tileset.png`;
  
  const outputPath = path.join(__dirname, '../public/assets/sprites/tileset.png');
  fs.writeFileSync(outputPath, placeholderContent);
  
  console.log(`Created placeholder file at ${outputPath}`);
  console.log('Open scripts/create-tileset.html in a browser to generate a proper tileset image.');
}

// Export for browser usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTilesetDataURL,
    createBasicTileset,
    createSimplePNG
  };
} 
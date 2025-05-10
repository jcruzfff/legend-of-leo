# Game Assets for Legend of Leo

All game assets for Legend of Leo are pre-provided and ready to use. Players and users **do not need** to create or modify any pixel art assets.

## Asset Style

The game uses a modern pixel art style similar to games like Stardew Valley, Eastward, or CrossCode. The assets feature:

- Detailed characters with expressive animations
- Rich environmental elements with depth and texture
- Full color palette without retro restrictions
- Clean, readable UI elements with consistent styling

## Asset Organization

- All game sprites are located in `/public/assets/sprites/`
- All animation data is located in `/public/assets/aseprite/`
- Background tiles and maps are in `/public/assets/maps/`
- UI elements are stored in `/public/assets/ui/`

## For Developers Only

If you're a developer working on the official game assets:

1. Character sprites follow these specifications:

   - Main characters: 32x48 pixels
   - NPCs: 32x48 pixels
   - Standard animations include: idle, walk in four directions, action, and talk

2. Environment tiles are 16x16 pixels and organized into themed tilesets

3. For asset creation workflow details, please refer to the internal development documentation.

## Using Assets in the Game

The game engine automatically loads all necessary assets. Developers can use the utilities in `lib/utils/aseprite.ts` to work with these pre-provided assets.

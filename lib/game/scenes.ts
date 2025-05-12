'use client';

/* 
 * Scene registry for the game 
 * This file dynamically imports all scenes to prevent SSR issues with Phaser
 */

export const SceneKeys = {
  Main: 'MainScene',
  Level1: 'Level1Scene',
  Level2: 'Level2Scene',
  Level3: 'Level3Scene',
  Level4: 'Level4Scene',
};

/**
 * Get all scene keys
 */
export function getAllSceneKeys(): string[] {
  return Object.values(SceneKeys);
}

// We need to use a dynamic import pattern to prevent SSR issues with Phaser
export const gameScenes = async () => {
  const MainScene = (await import('@/components/game/scenes/MainScene')).default;
  const Level1Scene = (await import('@/components/game/scenes/levels/Level1Scene')).default;
  const Level2Scene = (await import('@/components/game/scenes/levels/Level2Scene')).default;
  const Level3Scene = (await import('@/components/game/scenes/levels/Level3Scene')).default;
  const Level4Scene = (await import('@/components/game/scenes/levels/Level4Scene')).default;
  
  return [
    MainScene,
    Level1Scene,
    Level2Scene,
    Level3Scene,
    Level4Scene,
  ];
}; 
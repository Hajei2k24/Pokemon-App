/**
 * One-time script to fix player stats based on existing caught Pokemon from gallery
 * Run this in React Native Debugger console or add a button to run it in ProgressionScreen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {initializePlayerStats, calculateLevel, checkBadgeUnlocks, POINTS} from './src/utils/gamification';

export const fixPlayerStats = async () => {
  try {
    console.log('=== FIXING PLAYER STATS ===');

    // Load gallery from file system
    const galleryPath = `${RNFS.DocumentDirectoryPath}/pokemon_gallery.json`;
    const exists = await RNFS.exists(galleryPath);

    if (!exists) {
      console.log('No gallery found. Stats reset to 0.');
      const newStats = initializePlayerStats();
      await AsyncStorage.setItem('playerStats', JSON.stringify(newStats));
      return newStats;
    }

    const galleryData = await RNFS.readFile(galleryPath, 'utf8');
    const gallery = JSON.parse(galleryData);
    console.log(`Found ${gallery.length} caught Pokemon in gallery`);

    if (gallery.length === 0) {
      console.log('Gallery is empty. Stats reset to 0.');
      const newStats = initializePlayerStats();
      await AsyncStorage.setItem('playerStats', JSON.stringify(newStats));
      return newStats;
    }

    // Initialize or load stats
    const statsData = await AsyncStorage.getItem('playerStats');
    let stats = statsData ? JSON.parse(statsData) : initializePlayerStats();

    // Get unique Pokemon names from gallery
    const uniquePokemonNames = new Set(gallery.map(p => p.pokemon.name));

    // Calculate stats
    stats.totalCatches = gallery.length;
    stats.uniquePokemon = uniquePokemonNames.size;
    stats.totalPoints = (gallery.length * POINTS.CATCH_POKEMON) + (uniquePokemonNames.size * POINTS.UNIQUE_POKEMON);
    stats.level = calculateLevel(stats.totalPoints);

    // Check for badge unlocks
    const caughtPokemon = gallery.map(p => ({
      id: p.pokemon.id,
      name: p.pokemon.name,
      types: [], // We don't have type info in gallery, so type badges won't unlock
    }));

    const newBadges = checkBadgeUnlocks(stats, caughtPokemon);
    if (newBadges.length > 0) {
      newBadges.forEach(newBadge => {
        const badgeIndex = stats.badges.findIndex(b => b.id === newBadge.id);
        if (badgeIndex !== -1) {
          stats.badges[badgeIndex] = newBadge;
          stats.totalPoints += POINTS.UNLOCK_BADGE;
        }
      });
      // Recalculate level after badge points
      stats.level = calculateLevel(stats.totalPoints);
    }

    // Save updated stats
    await AsyncStorage.setItem('playerStats', JSON.stringify(stats));

    console.log('=== STATS FIXED ===');
    console.log('Total Catches:', stats.totalCatches);
    console.log('Unique Pokemon:', stats.uniquePokemon);
    console.log('Total XP:', stats.totalPoints);
    console.log('Level:', stats.level);
    console.log('Badges Unlocked:', stats.badges.filter(b => b.unlocked).length);

    return stats;
  } catch (error) {
    console.error('Error fixing stats:', error);
    throw error;
  }
};

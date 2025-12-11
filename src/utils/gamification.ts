// Gamification utilities for badges, points, and daily challenges

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  category: 'catching' | 'exploration' | 'collection' | 'special';
  unlocked: boolean;
  unlockedAt?: string;
}

export interface DailyChallenge {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'catch-type' | 'catch-count' | 'distance' | 'biome' | 'specific-pokemon';
  target: string | number;
  progress: number;
  completed: boolean;
  reward: number; // Points
  icon: string;
}

export interface PlayerStats {
  totalPoints: number;
  level: number;
  totalCatches: number;
  uniquePokemon: number;
  distanceTraveled: number;
  badges: Badge[];
  dailyChallenges: DailyChallenge[];
  lastChallengeRefresh: string;
}

// Badge definitions
export const AVAILABLE_BADGES: Omit<Badge, 'unlocked' | 'unlockedAt'>[] = [
  // Catching badges
  {
    id: 'first-catch',
    name: 'First Catch',
    description: 'Catch your first Pokémon',
    icon: '🎯',
    requirement: 1,
    category: 'catching',
  },
  {
    id: 'catch-10',
    name: 'Pokémon Trainer',
    description: 'Catch 10 Pokémon',
    icon: '⚡',
    requirement: 10,
    category: 'catching',
  },
  {
    id: 'catch-50',
    name: 'Expert Trainer',
    description: 'Catch 50 Pokémon',
    icon: '🔥',
    requirement: 50,
    category: 'catching',
  },
  {
    id: 'catch-100',
    name: 'Master Trainer',
    description: 'Catch 100 Pokémon',
    icon: '👑',
    requirement: 100,
    category: 'catching',
  },
  // Collection badges
  {
    id: 'collector-5',
    name: 'Beginner Collector',
    description: 'Collect 5 unique Pokémon',
    icon: '📚',
    requirement: 5,
    category: 'collection',
  },
  {
    id: 'collector-25',
    name: 'Dedicated Collector',
    description: 'Collect 25 unique Pokémon',
    icon: '📖',
    requirement: 25,
    category: 'collection',
  },
  {
    id: 'collector-50',
    name: 'Elite Collector',
    description: 'Collect 50 unique Pokémon',
    icon: '🎓',
    requirement: 50,
    category: 'collection',
  },
  // Type-specific badges
  {
    id: 'fire-master',
    name: 'Fire Master',
    description: 'Catch 5 Fire-type Pokémon',
    icon: '🔥',
    requirement: 5,
    category: 'special',
  },
  {
    id: 'water-master',
    name: 'Water Master',
    description: 'Catch 5 Water-type Pokémon',
    icon: '💧',
    requirement: 5,
    category: 'special',
  },
  {
    id: 'grass-master',
    name: 'Grass Master',
    description: 'Catch 5 Grass-type Pokémon',
    icon: '🌿',
    requirement: 5,
    category: 'special',
  },
  {
    id: 'electric-master',
    name: 'Electric Master',
    description: 'Catch 5 Electric-type Pokémon',
    icon: '⚡',
    requirement: 5,
    category: 'special',
  },
  // Exploration badges
  {
    id: 'explorer-1km',
    name: 'Explorer',
    description: 'Travel 1 kilometer',
    icon: '🗺️',
    requirement: 1000,
    category: 'exploration',
  },
  {
    id: 'explorer-5km',
    name: 'Adventurer',
    description: 'Travel 5 kilometers',
    icon: '🧭',
    requirement: 5000,
    category: 'exploration',
  },
  {
    id: 'explorer-10km',
    name: 'World Traveler',
    description: 'Travel 10 kilometers',
    icon: '🌍',
    requirement: 10000,
    category: 'exploration',
  },
  // Daily challenge badges
  {
    id: 'daily-1',
    name: 'Daily Achiever',
    description: 'Complete 1 daily challenge',
    icon: '📅',
    requirement: 1,
    category: 'special',
  },
  {
    id: 'daily-7',
    name: 'Week Warrior',
    description: 'Complete 7 daily challenges',
    icon: '🏆',
    requirement: 7,
    category: 'special',
  },
  {
    id: 'daily-30',
    name: 'Monthly Master',
    description: 'Complete 30 daily challenges',
    icon: '💎',
    requirement: 30,
    category: 'special',
  },
];

// Points system
export const POINTS = {
  CATCH_POKEMON: 100,
  CATCH_RARE_POKEMON: 250,
  CATCH_LEGENDARY: 500,
  COMPLETE_DAILY_CHALLENGE: 200,
  UNLOCK_BADGE: 150,
  UNIQUE_POKEMON: 50,
  DISTANCE_METER: 0.5,
};

// Level calculation
export const calculateLevel = (points: number): number => {
  // Every 1000 points = 1 level
  return Math.floor(points / 1000) + 1;
};

export const getPointsForNextLevel = (currentPoints: number): number => {
  const currentLevel = calculateLevel(currentPoints);
  return currentLevel * 1000;
};

export const getProgressToNextLevel = (currentPoints: number): number => {
  const currentLevel = calculateLevel(currentPoints);
  const pointsInCurrentLevel = currentPoints - ((currentLevel - 1) * 1000);
  return (pointsInCurrentLevel / 1000) * 100;
};

// Generate daily challenges
export const generateDailyChallenges = (date: string): Omit<DailyChallenge, 'progress' | 'completed'>[] => {
  const types = ['fire', 'water', 'grass', 'electric', 'normal', 'flying', 'bug', 'poison', 'ground', 'rock'];
  const biomes = ['urban', 'forest', 'water', 'mountain', 'desert'];

  const challenges: Omit<DailyChallenge, 'progress' | 'completed'>[] = [
    {
      id: `daily-${date}-type`,
      date,
      title: `Catch ${types[Math.floor(Math.random() * types.length)]}-type Pokémon`,
      description: `Find and catch 3 ${types[Math.floor(Math.random() * types.length)]}-type Pokémon today`,
      type: 'catch-type',
      target: types[Math.floor(Math.random() * types.length)],
      reward: 300,
      icon: '🎯',
    },
    {
      id: `daily-${date}-count`,
      date,
      title: 'Daily Hunter',
      description: 'Catch 5 Pokémon today',
      type: 'catch-count',
      target: 5,
      reward: 250,
      icon: '⚡',
    },
    {
      id: `daily-${date}-distance`,
      date,
      title: 'Daily Explorer',
      description: 'Travel 2 kilometers today',
      type: 'distance',
      target: 2000,
      reward: 200,
      icon: '🗺️',
    },
  ];

  return challenges;
};

// Check if daily challenges need refresh
export const needsChallengeRefresh = (lastRefresh: string): boolean => {
  const lastDate = new Date(lastRefresh).toDateString();
  const today = new Date().toDateString();
  return lastDate !== today;
};

// Award points and check for badge unlocks
export const awardPoints = (
  currentStats: PlayerStats,
  points: number,
  reason: string,
): {
  newStats: PlayerStats;
  newBadges: Badge[];
  leveledUp: boolean;
} => {
  const oldLevel = currentStats.level;
  const newPoints = currentStats.totalPoints + points;
  const newLevel = calculateLevel(newPoints);

  const updatedStats = {
    ...currentStats,
    totalPoints: newPoints,
    level: newLevel,
  };

  return {
    newStats: updatedStats,
    newBadges: [],
    leveledUp: newLevel > oldLevel,
  };
};

// Check for badge unlocks based on player stats
export const checkBadgeUnlocks = (stats: PlayerStats, caughtPokemon: any[]): Badge[] => {
  const newBadges: Badge[] = [];

  AVAILABLE_BADGES.forEach(badgeTemplate => {
    const existingBadge = stats.badges.find(b => b.id === badgeTemplate.id);
    if (existingBadge?.unlocked) return;

    let shouldUnlock = false;

    switch (badgeTemplate.id) {
      // Catching badges
      case 'first-catch':
      case 'catch-10':
      case 'catch-50':
      case 'catch-100':
        shouldUnlock = stats.totalCatches >= badgeTemplate.requirement;
        break;

      // Collection badges
      case 'collector-5':
      case 'collector-25':
      case 'collector-50':
        shouldUnlock = stats.uniquePokemon >= badgeTemplate.requirement;
        break;

      // Exploration badges
      case 'explorer-1km':
      case 'explorer-5km':
      case 'explorer-10km':
        shouldUnlock = stats.distanceTraveled >= badgeTemplate.requirement;
        break;

      // Type-specific badges
      case 'fire-master':
        shouldUnlock = caughtPokemon.filter(p => p.types.includes('fire')).length >= 5;
        break;
      case 'water-master':
        shouldUnlock = caughtPokemon.filter(p => p.types.includes('water')).length >= 5;
        break;
      case 'grass-master':
        shouldUnlock = caughtPokemon.filter(p => p.types.includes('grass')).length >= 5;
        break;
      case 'electric-master':
        shouldUnlock = caughtPokemon.filter(p => p.types.includes('electric')).length >= 5;
        break;

      // Daily challenge badges
      case 'daily-1':
      case 'daily-7':
      case 'daily-30':
        const completedChallenges = stats.dailyChallenges.filter(c => c.completed).length;
        shouldUnlock = completedChallenges >= badgeTemplate.requirement;
        break;
    }

    if (shouldUnlock) {
      newBadges.push({
        ...badgeTemplate,
        unlocked: true,
        unlockedAt: new Date().toISOString(),
      });
    }
  });

  return newBadges;
};

// Initialize default player stats
export const initializePlayerStats = (): PlayerStats => {
  const today = new Date().toISOString().split('T')[0];
  return {
    totalPoints: 0,
    level: 1,
    totalCatches: 0,
    uniquePokemon: 0,
    distanceTraveled: 0,
    badges: AVAILABLE_BADGES.map(b => ({...b, unlocked: false})),
    dailyChallenges: generateDailyChallenges(today).map(c => ({...c, progress: 0, completed: false})),
    lastChallengeRefresh: new Date().toISOString(),
  };
};

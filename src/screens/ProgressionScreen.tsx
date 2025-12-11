import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import RNFS from 'react-native-fs';
import {
  PlayerStats,
  Badge,
  DailyChallenge,
  initializePlayerStats,
  getProgressToNextLevel,
  needsChallengeRefresh,
  generateDailyChallenges,
  AVAILABLE_BADGES,
  calculateLevel,
  checkBadgeUnlocks,
  POINTS,
} from '../utils/gamification';

const {width} = Dimensions.get('window');

const ProgressionScreen = () => {
  const navigation = useNavigation();
  const [stats, setStats] = useState<PlayerStats>(initializePlayerStats());
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'challenges'>('overview');

  // Reload stats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPlayerStats();
    }, [])
  );

  const loadPlayerStats = async () => {
    try {
      const stored = await AsyncStorage.getItem('playerStats');
      const caughtPokemonData = await AsyncStorage.getItem('caughtPokemon');

      console.log('Loading player stats from AsyncStorage:', stored);
      console.log('Caught Pokemon in storage:', caughtPokemonData);

      if (stored) {
        const playerStats: PlayerStats = JSON.parse(stored);
        console.log('Parsed player stats:', {
          totalCatches: playerStats.totalCatches,
          uniquePokemon: playerStats.uniquePokemon,
          totalPoints: playerStats.totalPoints,
          level: playerStats.level,
          badgesUnlocked: playerStats.badges.filter(b => b.unlocked).length,
        });

        // Check if daily challenges need refresh
        if (needsChallengeRefresh(playerStats.lastChallengeRefresh)) {
          const today = new Date().toISOString().split('T')[0];
          const newChallenges = generateDailyChallenges(today);
          playerStats.dailyChallenges = newChallenges.map(c => ({
            ...c,
            progress: 0,
            completed: false,
          }));
          playerStats.lastChallengeRefresh = new Date().toISOString();
          await AsyncStorage.setItem('playerStats', JSON.stringify(playerStats));
        }

        // Update challenge progress based on caught Pokemon
        if (caughtPokemonData) {
          const caughtPokemon = JSON.parse(caughtPokemonData);
          updateChallengeProgress(playerStats, caughtPokemon);
          await AsyncStorage.setItem('playerStats', JSON.stringify(playerStats));
        }

        setStats(playerStats);
      } else {
        console.log('No player stats found, initializing new stats');
        // Initialize new player stats
        const newStats = initializePlayerStats();
        await AsyncStorage.setItem('playerStats', JSON.stringify(newStats));
        setStats(newStats);
      }

      // Log for debugging
      const caught = caughtPokemonData ? JSON.parse(caughtPokemonData) : [];
      console.log(`DEBUG: Found ${caught.length} caught Pokemon in storage`);
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  };

  const openBadgeDetail = (badge: Badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };

  const closeBadgeDetail = () => {
    setSelectedBadge(null);
    setShowBadgeModal(false);
  };

  const getBadgesByCategory = (category: string) => {
    return stats.badges.filter(b => b.category === category);
  };

  const getUnlockedBadgesCount = () => {
    return stats.badges.filter(b => b.unlocked).length;
  };

  const updateChallengeProgress = (stats: PlayerStats, caughtPokemon: any[]) => {
    const today = new Date().toISOString().split('T')[0];

    // Filter catches from today
    const todaysCatches = caughtPokemon.filter((p: any) => {
      if (!p.caughtAt) return false;
      const catchDate = new Date(p.caughtAt).toISOString().split('T')[0];
      return catchDate === today;
    });

    // Update each challenge's progress
    stats.dailyChallenges.forEach(challenge => {
      if (challenge.completed) return; // Skip already completed challenges

      switch (challenge.type) {
        case 'catch-count':
          challenge.progress = todaysCatches.length;
          if (challenge.progress >= (challenge.target as number)) {
            challenge.completed = true;
          }
          break;

        case 'catch-type':
          const targetType = challenge.target as string;
          const typeCount = todaysCatches.filter((p: any) =>
            p.types && p.types.some((t: string) => t.toLowerCase() === targetType.toLowerCase())
          ).length;
          challenge.progress = typeCount;
          if (challenge.progress >= 3) { // Most type challenges require 3 catches
            challenge.completed = true;
          }
          break;

        case 'distance':
          // Distance tracking would need to be implemented in Hunt Mode
          // For now, use the total distance traveled
          challenge.progress = Math.floor(stats.distanceTraveled);
          if (challenge.progress >= (challenge.target as number)) {
            challenge.completed = true;
          }
          break;

        case 'biome':
          // Biome challenges would require tracking catches by biome
          const targetBiome = challenge.target as string;
          const biomeCount = todaysCatches.filter((p: any) =>
            p.biome && p.biome.toLowerCase() === targetBiome.toLowerCase()
          ).length;
          challenge.progress = biomeCount;
          if (challenge.progress >= 3) {
            challenge.completed = true;
          }
          break;

        case 'specific-pokemon':
          // Specific Pokemon challenges
          const targetPokemon = challenge.target as string;
          const hasCaught = todaysCatches.some((p: any) =>
            p.name && p.name.toLowerCase() === targetPokemon.toLowerCase()
          );
          challenge.progress = hasCaught ? 1 : 0;
          challenge.completed = hasCaught;
          break;
      }
    });
  };

  const syncStatsWithGallery = async () => {
    try {
      console.log('=== SYNCING PLAYER STATS WITH CAUGHT POKEMON ===');

      // Load caught Pokemon from AsyncStorage (from Hunt Mode)
      const caughtData = await AsyncStorage.getItem('caughtPokemon');

      if (!caughtData) {
        console.log('No caught Pokemon found. Stats reset to 0.');
        const newStats = initializePlayerStats();
        await AsyncStorage.setItem('playerStats', JSON.stringify(newStats));
        setStats(newStats);
        Alert.alert('Stats Synced', 'No caught Pokémon found. Stats reset to 0.');
        return;
      }

      const caughtPokemon = JSON.parse(caughtData);
      console.log(`Found ${caughtPokemon.length} caught Pokemon`);

      if (caughtPokemon.length === 0) {
        const newStats = initializePlayerStats();
        await AsyncStorage.setItem('playerStats', JSON.stringify(newStats));
        setStats(newStats);
        Alert.alert('Stats Synced', 'No caught Pokémon found. Stats reset to 0.');
        return;
      }

      // Get unique Pokemon IDs from caught Pokemon
      const uniquePokemonIds = new Set(caughtPokemon.map((p: any) => p.id));

      // Calculate stats from scratch
      const newStats = {...stats};
      newStats.totalCatches = caughtPokemon.length;
      newStats.uniquePokemon = uniquePokemonIds.size;

      // Recalculate points from scratch
      newStats.totalPoints = (caughtPokemon.length * POINTS.CATCH_POKEMON) + (uniquePokemonIds.size * POINTS.UNIQUE_POKEMON);
      newStats.level = calculateLevel(newStats.totalPoints);

      // Update daily challenge progress
      updateChallengeProgress(newStats, caughtPokemon);

      // Award points for completed challenges
      const completedChallenges = newStats.dailyChallenges.filter(c => c.completed);
      completedChallenges.forEach(challenge => {
        // Check if we already awarded points for this challenge
        const challengeKey = `challenge_${challenge.id}_awarded`;
        if (!newStats[challengeKey as keyof PlayerStats]) {
          newStats.totalPoints += challenge.reward;
          (newStats as any)[challengeKey] = true;
        }
      });

      // Check for badge unlocks
      const newBadges = checkBadgeUnlocks(newStats, caughtPokemon);
      if (newBadges.length > 0) {
        newBadges.forEach(newBadge => {
          const badgeIndex = newStats.badges.findIndex(b => b.id === newBadge.id);
          if (badgeIndex !== -1) {
            newStats.badges[badgeIndex] = newBadge;
            newStats.totalPoints += POINTS.UNLOCK_BADGE;
          }
        });
        newStats.level = calculateLevel(newStats.totalPoints);
      }

      // Save updated stats
      await AsyncStorage.setItem('playerStats', JSON.stringify(newStats));
      setStats(newStats);

      console.log('=== STATS SYNCED ===');
      const completedToday = newStats.dailyChallenges.filter(c => c.completed).length;
      Alert.alert(
        'Stats Synced Successfully!',
        `Total Catches: ${newStats.totalCatches}\nUnique Pokémon: ${newStats.uniquePokemon}\nLevel: ${newStats.level}\nXP: ${newStats.totalPoints}\nChallenges Completed: ${completedToday}/${newStats.dailyChallenges.length}`
      );
    } catch (error) {
      console.error('Error syncing stats:', error);
      Alert.alert('Error', 'Failed to sync stats. Please try again.');
    }
  };

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      {/* Sync Stats Button */}
      <TouchableOpacity style={styles.syncButton} onPress={syncStatsWithGallery}>
        <Text style={styles.syncButtonText}>🔄 Refresh</Text>
      </TouchableOpacity>

      {/* Level Card */}
      <View style={styles.levelCard}>
        <Text style={styles.levelTitle}>LEVEL {stats.level}</Text>
        <Text style={styles.pointsText}>{stats.totalPoints.toLocaleString()} XP</Text>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {width: `${getProgressToNextLevel(stats.totalPoints)}%`}
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {getProgressToNextLevel(stats.totalPoints).toFixed(0)}% to Level {stats.level + 1}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎯</Text>
          <Text style={styles.statValue}>{stats.totalCatches}</Text>
          <Text style={styles.statLabel}>Total Catches</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📚</Text>
          <Text style={styles.statValue}>{stats.uniquePokemon}</Text>
          <Text style={styles.statLabel}>Unique Pokémon</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🗺️</Text>
          <Text style={styles.statValue}>{(stats.distanceTraveled / 1000).toFixed(1)}</Text>
          <Text style={styles.statLabel}>Kilometers</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={styles.statValue}>{getUnlockedBadgesCount()}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
      </View>

      {/* Recent Achievements */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        {stats.badges
          .filter(b => b.unlocked)
          .sort((a, b) => {
            const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
            const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 3)
          .map(badge => (
            <TouchableOpacity
              key={badge.id}
              style={styles.achievementItem}
              onPress={() => openBadgeDetail(badge)}>
              <Text style={styles.achievementIcon}>{badge.icon}</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>{badge.name}</Text>
                <Text style={styles.achievementDesc}>{badge.description}</Text>
              </View>
              <Text style={styles.achievementDate}>
                {badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString() : ''}
              </Text>
            </TouchableOpacity>
          ))}
        {getUnlockedBadgesCount() === 0 && (
          <Text style={styles.emptyText}>No achievements yet. Keep hunting!</Text>
        )}
      </View>
    </View>
  );

  const renderBadges = () => (
    <ScrollView style={styles.badgesContainer}>
      {/* Catching Badges */}
      <View style={styles.badgeCategory}>
        <Text style={styles.categoryTitle}>🎯 Catching Achievements</Text>
        <View style={styles.badgeGrid}>
          {getBadgesByCategory('catching').map(badge => (
            <TouchableOpacity
              key={badge.id}
              style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}
              onPress={() => openBadgeDetail(badge)}>
              <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>
                {badge.icon}
              </Text>
              <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
                {badge.name}
              </Text>
              {badge.unlocked && (
                <View style={styles.unlockedBadge}>
                  <Text style={styles.unlockedText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Collection Badges */}
      <View style={styles.badgeCategory}>
        <Text style={styles.categoryTitle}>📚 Collection Achievements</Text>
        <View style={styles.badgeGrid}>
          {getBadgesByCategory('collection').map(badge => (
            <TouchableOpacity
              key={badge.id}
              style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}
              onPress={() => openBadgeDetail(badge)}>
              <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>
                {badge.icon}
              </Text>
              <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
                {badge.name}
              </Text>
              {badge.unlocked && (
                <View style={styles.unlockedBadge}>
                  <Text style={styles.unlockedText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Exploration Badges */}
      <View style={styles.badgeCategory}>
        <Text style={styles.categoryTitle}>🗺️ Exploration Achievements</Text>
        <View style={styles.badgeGrid}>
          {getBadgesByCategory('exploration').map(badge => (
            <TouchableOpacity
              key={badge.id}
              style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}
              onPress={() => openBadgeDetail(badge)}>
              <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>
                {badge.icon}
              </Text>
              <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
                {badge.name}
              </Text>
              {badge.unlocked && (
                <View style={styles.unlockedBadge}>
                  <Text style={styles.unlockedText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Special Badges */}
      <View style={styles.badgeCategory}>
        <Text style={styles.categoryTitle}>⭐ Special Achievements</Text>
        <View style={styles.badgeGrid}>
          {getBadgesByCategory('special').map(badge => (
            <TouchableOpacity
              key={badge.id}
              style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}
              onPress={() => openBadgeDetail(badge)}>
              <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>
                {badge.icon}
              </Text>
              <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
                {badge.name}
              </Text>
              {badge.unlocked && (
                <View style={styles.unlockedBadge}>
                  <Text style={styles.unlockedText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderChallenges = () => (
    <View style={styles.challengesContainer}>
      <Text style={styles.challengesTitle}>Today's Challenges</Text>
      <Text style={styles.challengesSubtitle}>
        Complete daily challenges to earn bonus XP!
      </Text>

      {stats.dailyChallenges.map(challenge => {
        const progress = typeof challenge.target === 'number'
          ? (challenge.progress / challenge.target) * 100
          : 0;

        return (
          <View
            key={challenge.id}
            style={[
              styles.challengeCard,
              challenge.completed && styles.challengeCardCompleted,
            ]}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeIcon}>{challenge.icon}</Text>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDesc}>{challenge.description}</Text>
              </View>
            </View>

            <View style={styles.challengeProgressContainer}>
              <View style={styles.challengeProgressBar}>
                <View
                  style={[
                    styles.challengeProgressFill,
                    {width: `${Math.min(progress, 100)}%`},
                    challenge.completed && styles.challengeProgressCompleted,
                  ]}
                />
              </View>
              <Text style={styles.challengeProgressText}>
                {challenge.completed
                  ? 'Completed!'
                  : `${challenge.progress} / ${challenge.target}`}
              </Text>
            </View>

            <View style={styles.challengeReward}>
              <Text style={styles.challengeRewardText}>+{challenge.reward} XP</Text>
              {challenge.completed && <Text style={styles.completedBadge}>✓</Text>}
            </View>
          </View>
        );
      })}

      <Text style={styles.challengesFooter}>
        Challenges reset daily at midnight
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Progression</Text>
          <Text style={styles.headerSubtitle}>Track Your Journey</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}>
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && styles.tabActive]}
          onPress={() => setActiveTab('badges')}>
          <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>
            Badges
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.tabActive]}
          onPress={() => setActiveTab('challenges')}>
          <Text style={[styles.tabText, activeTab === 'challenges' && styles.tabTextActive]}>
            Challenges
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'badges' && renderBadges()}
        {activeTab === 'challenges' && renderChallenges()}
      </ScrollView>

      {/* Badge Detail Modal */}
      <Modal
        visible={showBadgeModal}
        transparent
        animationType="fade"
        onRequestClose={closeBadgeDetail}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBadge && (
              <>
                <TouchableOpacity style={styles.closeButton} onPress={closeBadgeDetail}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>

                <Text style={styles.modalIcon}>{selectedBadge.icon}</Text>
                <Text style={styles.modalTitle}>{selectedBadge.name}</Text>
                <Text style={styles.modalDescription}>{selectedBadge.description}</Text>

                {selectedBadge.unlocked ? (
                  <>
                    <View style={styles.modalUnlockedBadge}>
                      <Text style={styles.modalUnlockedText}>✓ UNLOCKED</Text>
                    </View>
                    <Text style={styles.modalDate}>
                      Unlocked on{' '}
                      {selectedBadge.unlockedAt
                        ? new Date(selectedBadge.unlockedAt).toLocaleDateString()
                        : ''}
                    </Text>
                  </>
                ) : (
                  <View style={styles.modalLockedBadge}>
                    <Text style={styles.modalLockedText}>🔒 LOCKED</Text>
                    <Text style={styles.modalRequirement}>
                      Requirement: {selectedBadge.requirement}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProgressionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#9C27B0',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFDE00',
    textShadowColor: '#3B4CCA',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 5,
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#9C27B0',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  // Overview styles
  overviewContainer: {
    padding: 15,
  },
  syncButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 10,
  },
  pointsText: {
    fontSize: 20,
    color: '#666',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  fixStatsButton: {
    backgroundColor: '#FF9500',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fixStatsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    width: (width - 45) / 2,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 15,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 3,
  },
  achievementDesc: {
    fontSize: 12,
    color: '#666',
  },
  achievementDate: {
    fontSize: 11,
    color: '#999',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  // Badges styles
  badgesContainer: {
    flex: 1,
    padding: 15,
  },
  badgeCategory: {
    marginBottom: 25,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 15,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    width: (width - 45) / 2,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  badgeCardLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  badgeIconLocked: {
    opacity: 0.4,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C2C2C',
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: '#999',
  },
  unlockedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Challenges styles
  challengesContainer: {
    padding: 15,
  },
  challengesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 5,
  },
  challengesSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  challengeCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeCardCompleted: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  challengeIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 3,
  },
  challengeDesc: {
    fontSize: 13,
    color: '#666',
  },
  challengeProgressContainer: {
    marginBottom: 15,
  },
  challengeProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
  },
  challengeProgressCompleted: {
    backgroundColor: '#4CAF50',
  },
  challengeProgressText: {
    fontSize: 12,
    color: '#666',
  },
  challengeReward: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengeRewardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 'bold',
  },
  challengesFooter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalIcon: {
    fontSize: 80,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalUnlockedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  modalUnlockedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalDate: {
    fontSize: 14,
    color: '#999',
  },
  modalLockedBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  modalLockedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 8,
  },
  modalRequirement: {
    fontSize: 14,
    color: '#666',
  },
});

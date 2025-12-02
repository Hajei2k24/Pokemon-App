// src/screens/PokemonDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  getPokemonDetails,
  getPokemonSpecies,
  getEvolutionChain,
  PokemonDetails,
  PokemonSpecies,
  EvolutionChainItem,
} from '../services/pokeApi';
import type { PokemonDetailScreenProps } from '../navigation/MyStack';

const PokemonDetailScreen: React.FC<PokemonDetailScreenProps> = ({ route, navigation }) => {
  const { pokemon } = route.params;
  
  const [details, setDetails] = useState<PokemonDetails | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [evolutionChain, setEvolutionChain] = useState<EvolutionChainItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchPokemonData();
  }, []);

  const fetchPokemonData = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Fetch detailed data
      const detailsData = await getPokemonDetails(pokemon.id);
      setDetails(detailsData);

      // Fetch species data (description)
      const speciesData = await getPokemonSpecies(pokemon.id);
      setSpecies(speciesData);

      // Fetch evolution chain
      try {
        const evolutionData = await getEvolutionChain(speciesData.evolutionChainUrl);
        setEvolutionChain(evolutionData);
      } catch (error) {
        console.log('Evolution chain not available');
      }
    } catch (error) {
      console.error('Error fetching Pokémon data:', error);
      Alert.alert('Error', 'Failed to load Pokémon details');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      fire: '#FF6B6B',
      water: '#3B4CCA',
      grass: '#4CAF50',
      electric: '#FFDE00',
      psychic: '#FF6EC7',
      ice: '#70DEFF',
      dragon: '#7038F8',
      dark: '#705848',
      fairy: '#FFB7FA',
      normal: '#A8A878',
      fighting: '#C03028',
      flying: '#A890F0',
      poison: '#A040A0',
      ground: '#E0C068',
      rock: '#B8A038',
      bug: '#A8B820',
      ghost: '#705898',
      steel: '#B8B8D0',
    };
    return colors[type] || '#A8A878';
  };

  const getStatName = (stat: string): string => {
    const names: { [key: string]: string } = {
      hp: 'HP',
      attack: 'Attack',
      defense: 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      speed: 'Speed',
    };
    return names[stat] || stat;
  };

  const getStatColor = (value: number): string => {
    if (value >= 100) return '#4CAF50';
    if (value >= 70) return '#FFDE00';
    if (value >= 40) return '#FF9800';
    return '#FF6B6B';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B4CCA" />
        <Text style={styles.loadingText}>Loading Pokémon data...</Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load Pokémon</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchPokemonData}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: getTypeColor(details.types[0]) }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.pokemonId}>#{details.id.toString().padStart(3, '0')}</Text>
            <Text style={styles.pokemonName}>
              {details.name.charAt(0).toUpperCase() + details.name.slice(1)}
            </Text>
          </View>
          
          {species?.isLegendary && (
            <View style={styles.legendaryBadge}>
              <Text style={styles.legendaryText}>⭐ Legendary</Text>
            </View>
          )}
          {species?.isMythical && (
            <View style={styles.mythicalBadge}>
              <Text style={styles.mythicalText}>✨ Mythical</Text>
            </View>
          )}
        </View>

        <Image
          source={{ uri: details.sprites.official_artwork }}
          style={styles.pokemonImage}
          resizeMode="contain"
        />

        <View style={styles.typesContainer}>
          {details.types.map((type, index) => (
            <View
              key={index}
              style={[styles.typeTag, { backgroundColor: getTypeColor(type) }]}
            >
              <Text style={styles.typeText}>{type.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Description */}
      {species?.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{species.description}</Text>
        </View>
      )}

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pokédex Data</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Height</Text>
            <Text style={styles.infoValue}>{(details.height / 10).toFixed(1)} m</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Weight</Text>
            <Text style={styles.infoValue}>{(details.weight / 10).toFixed(1)} kg</Text>
          </View>
          {species?.habitat && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Habitat</Text>
                <Text style={styles.infoValue}>
                  {species.habitat.charAt(0).toUpperCase() + species.habitat.slice(1)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Base Stats</Text>
        {details.stats.map((stat, index) => (
          <View key={index} style={styles.statRow}>
            <Text style={styles.statName}>{getStatName(stat.name)}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <View style={styles.statBarContainer}>
              <View
                style={[
                  styles.statBar,
                  {
                    width: `${Math.min((stat.value / 200) * 100, 100)}%`,
                    backgroundColor: getStatColor(stat.value),
                  },
                ]}
              />
            </View>
          </View>
        ))}
        
        {/* Total Stats */}
        <View style={styles.totalStats}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {details.stats.reduce((sum, stat) => sum + stat.value, 0)}
          </Text>
        </View>
      </View>

      {/* Abilities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Abilities</Text>
        <View style={styles.abilitiesContainer}>
          {details.abilities.map((ability, index) => (
            <View key={index} style={styles.abilityTag}>
              <Text style={styles.abilityText}>
                {ability.name.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
                {ability.isHidden && ' (Hidden)'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Evolution Chain */}
      {evolutionChain.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evolution Chain</Text>
          <View style={styles.evolutionContainer}>
            {evolutionChain.map((evo, index) => (
              <React.Fragment key={evo.id}>
                <TouchableOpacity
                  style={[
                    styles.evolutionItem,
                    evo.id === pokemon.id && styles.currentEvolution,
                  ]}
                  onPress={() => {
                    if (evo.id !== pokemon.id) {
                      navigation.replace('PokemonDetail', {
                        pokemon: {
                          id: evo.id,
                          name: evo.name,
                          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png`,
                          types: [],
                        },
                      });
                    }
                  }}
                >
                  <Image
                    source={{
                      uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png`,
                    }}
                    style={styles.evolutionImage}
                  />
                  <Text style={styles.evolutionName}>
                    {evo.name.charAt(0).toUpperCase() + evo.name.slice(1)}
                  </Text>
                </TouchableOpacity>
                {index < evolutionChain.length - 1 && (
                  <Text style={styles.evolutionArrow}>→</Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Catch Button */}
      <TouchableOpacity
        style={styles.catchButton}
        onPress={() => Alert.alert('Caught!', `You caught ${details.name}!`)}
      >
        <Text style={styles.catchButtonText}>⚡ Catch Pokémon</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

export default PokemonDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3B4CCA',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pokemonId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  pokemonName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  legendaryBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  legendaryText: {
    color: '#2C2C2C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mythicalBadge: {
    backgroundColor: 'rgba(255, 182, 193, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mythicalText: {
    color: '#2C2C2C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pokemonImage: {
    width: 200,
    height: 200,
  },
  typesContainer: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  typeTag: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  typeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 15,
    padding: 20,
    marginHorizontal: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statName: {
    width: 80,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  statValue: {
    width: 40,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C2C2C',
    textAlign: 'right',
  },
  statBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginLeft: 10,
    overflow: 'hidden',
  },
  statBar: {
    height: '100%',
    borderRadius: 4,
  },
  totalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B4CCA',
  },
  abilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  abilityTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3B4CCA',
  },
  abilityText: {
    color: '#3B4CCA',
    fontSize: 14,
    fontWeight: '600',
  },
  evolutionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  evolutionItem: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
  },
  currentEvolution: {
    backgroundColor: '#FFDE00',
  },
  evolutionImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  evolutionName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginTop: 5,
  },
  evolutionArrow: {
    fontSize: 24,
    color: '#666',
    marginHorizontal: 10,
  },
  catchButton: {
    backgroundColor: '#FF6B6B',
    marginHorizontal: 15,
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  catchButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 30,
  },
});
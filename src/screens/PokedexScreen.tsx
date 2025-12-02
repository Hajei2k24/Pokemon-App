// src/screens/PokedexScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ListRenderItem,
} from 'react-native';
import { getAllPokemon, getPokemonByType, searchPokemonByName, PokemonListItem } from '../services/pokeApi';
import type { PokedexScreenProps } from '../navigation/MyStack';
import SearchBar from '../components/SearchBar';
import TypeFilter from '../components/TypeFilter';

const PokedexScreen: React.FC<PokedexScreenProps> = ({ navigation }) => {
  const [pokemonList, setPokemonList] = useState<PokemonListItem[]>([]);
  const [filteredList, setFilteredList] = useState<PokemonListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [offset, setOffset] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searching, setSearching] = useState<boolean>(false);

  // Fetch initial Pokémon
  useEffect(() => {
    fetchPokemon();
  }, []);

  const fetchPokemon = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getAllPokemon(50, 0);
      console.log('✅ Fetched Pokemon:', data.results.length);
      setPokemonList(data.results);
      setFilteredList(data.results);
      setOffset(50);
    } catch (error) {
      console.error('❌ Error fetching Pokémon:', error);
      Alert.alert('Error', 'Failed to load Pokémon. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // Search by name
  const handleSearch = async (text: string): Promise<void> => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      // If search is empty, show all or filtered by type
      if (selectedType) {
        handleTypeFilter(selectedType);
      } else {
        setFilteredList(pokemonList);
      }
      return;
    }

    setSearching(true);
    try {
      // Search in current list first
      const localResults = pokemonList.filter(pokemon =>
        pokemon.name.toLowerCase().includes(text.toLowerCase())
      );

      if (localResults.length > 0) {
        setFilteredList(localResults);
      } else {
        // Try API search
        try {
          const result = await searchPokemonByName(text);
          setFilteredList([result]);
        } catch (error) {
          setFilteredList([]);
          Alert.alert('Not Found', `No Pokémon found matching "${text}"`);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  // Filter by type
  const handleTypeFilter = async (type: string | null): Promise<void> => {
    setSelectedType(type);
    setSearchQuery(''); // Clear search when filtering by type

    if (!type) {
      setFilteredList(pokemonList);
      return;
    }

    setSearching(true);
    try {
      const typeResults = await getPokemonByType(type);
      setFilteredList(typeResults);
    } catch (error) {
      console.error('Type filter error:', error);
      Alert.alert('Error', 'Failed to filter by type');
    } finally {
      setSearching(false);
    }
  };

  // Clear search
  const handleClearSearch = (): void => {
    setSearchQuery('');
    if (selectedType) {
      handleTypeFilter(selectedType);
    } else {
      setFilteredList(pokemonList);
    }
  };

  // Pull to refresh
  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    setSearchQuery('');
    setSelectedType(null);
    try {
      const data = await getAllPokemon(50, 0);
      setPokemonList(data.results);
      setFilteredList(data.results);
      setOffset(50);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load more Pokémon (pagination)
  const loadMorePokemon = async (): Promise<void> => {
    if (loadingMore || offset === 0 || searchQuery || selectedType) {
      return;
    }

    if (pokemonList.length >= 150) {
      return;
    }

    try {
      setLoadingMore(true);
      const data = await getAllPokemon(20, offset);
      setPokemonList(prevList => [...prevList, ...data.results]);
      setFilteredList(prevList => [...prevList, ...data.results]);
      setOffset(prevOffset => prevOffset + 20);
    } catch (error) {
      console.error('❌ Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Get type color
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

  // Render each Pokémon card
  const renderPokemonCard: ListRenderItem<PokemonListItem> = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PokemonDetail', { pokemon: item })}
    >
      <View style={styles.cardContent}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.pokemonImage}
        />
        <Text style={styles.pokemonId}>#{item.id.toString().padStart(3, '0')}</Text>
        <Text style={styles.pokemonName}>
          {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
        </Text>
        <View style={styles.typesContainer}>
          {item.types.map((type, index) => (
            <View
              key={index}
              style={[styles.typeTag, { backgroundColor: getTypeColor(type) }]}
            >
              <Text style={styles.typeText}>{type}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading Pokédex...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearch}
        onClear={handleClearSearch}
        placeholder="Search by name (e.g. pikachu)"
      />

      {/* Type Filter */}
      <TypeFilter
        selectedType={selectedType}
        onSelectType={handleTypeFilter}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedType 
            ? `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Type` 
            : searchQuery 
            ? 'Search Results' 
            : 'Discover Pokémon'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {filteredList.length} Pokémon {searchQuery || selectedType ? 'found' : 'loaded'}
        </Text>
      </View>

      {searching ? (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.searchingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          renderItem={renderPokemonCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMorePokemon}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore && !searchQuery && !selectedType ? (
              <ActivityIndicator size="small" color="#FF6B6B" style={styles.loadingMore} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No Pokémon found</Text>
              <Text style={styles.emptySubtext}>Try a different search or filter</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default PokedexScreen;

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
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  listContainer: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    padding: 15,
    alignItems: 'center',
  },
  pokemonImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  pokemonId: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
    marginTop: 5,
  },
  pokemonName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginTop: 5,
    textAlign: 'center',
  },
  typesContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 5,
  },
  typeTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  loadingMore: {
    marginVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
});
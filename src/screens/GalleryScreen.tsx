import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  latitude: number;
  longitude: number;
  biome: string;
  distance?: number;
  height?: number;
  weight?: number;
  caughtAt?: string;
}

const GalleryScreen = () => {
  const [caughtPokemon, setCaughtPokemon] = useState<Pokemon[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadCaughtPokemon();
  }, []);

  const loadCaughtPokemon = async () => {
    try {
      const stored = await AsyncStorage.getItem('caughtPokemon');
      if (stored) {
        const pokemon = JSON.parse(stored);
        setCaughtPokemon(pokemon);
      }
    } catch (error) {
      console.error('Error loading caught Pokemon:', error);
    }
  };

  const getTypeColor = (type: string): string => {
    const typeColors: {[key: string]: string} = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC',
    };
    return typeColors[type] || '#A8A878';
  };

  const openPokemonDetail = (pokemon: Pokemon) => {
    setSelectedPokemon(pokemon);
    setShowDetailModal(true);
  };

  const closeDetail = () => {
    setSelectedPokemon(null);
    setShowDetailModal(false);
  };

  const releasePokemon = async (pokemon: Pokemon) => {
    Alert.alert(
      `Release ${pokemon.name}?`,
      'Are you sure you want to release this Pokémon? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove the Pokemon from the array
              const updatedPokemon = caughtPokemon.filter(
                (p, index) =>
                  !(
                    p.id === pokemon.id &&
                    p.caughtAt === pokemon.caughtAt &&
                    caughtPokemon.indexOf(p) === caughtPokemon.indexOf(pokemon)
                  ),
              );

              // Save to AsyncStorage
              await AsyncStorage.setItem(
                'caughtPokemon',
                JSON.stringify(updatedPokemon),
              );

              // Update state
              setCaughtPokemon(updatedPokemon);

              // Close the modal
              closeDetail();
            } catch (error) {
              console.error('Error releasing Pokemon:', error);
              Alert.alert('Error', 'Failed to release Pokémon. Please try again.');
            }
          },
        },
      ],
    );
  };

  const renderPokemonCard = ({item}: {item: Pokemon}) => (
    <TouchableOpacity
      style={styles.pokemonCard}
      onPress={() => openPokemonDetail(item)}>
      <View style={styles.cardImageContainer}>
        <Image source={{uri: item.sprite}} style={styles.cardImage} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.pokemonName}>{item.name.toUpperCase()}</Text>
        <View style={styles.typesContainer}>
          {item.types.map((type, index) => (
            <View
              key={index}
              style={[
                styles.typeBadge,
                {backgroundColor: getTypeColor(type)},
              ]}>
              <Text style={styles.typeText}>{type.toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.biomeText}>Biome: {item.biome}</Text>
        {item.caughtAt && (
          <Text style={styles.dateText}>
            {new Date(item.caughtAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Collection</Text>
        <Text style={styles.headerSubtitle}>
          {caughtPokemon.length} Pokémon Caught
        </Text>
      </View>

      {/* Pokemon Grid */}
      {caughtPokemon.length > 0 ? (
        <FlatList
          data={caughtPokemon}
          renderItem={renderPokemonCard}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>No Pokémon Yet</Text>
          <Text style={styles.emptyText}>
            Start hunting in AR Hunt Mode to catch your first Pokémon!
          </Text>
        </View>
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={closeDetail}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPokemon && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeDetail}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>

                <Image
                  source={{uri: selectedPokemon.sprite}}
                  style={styles.modalImage}
                />

                <Text style={styles.modalName}>
                  {selectedPokemon.name.toUpperCase()}
                </Text>

                <View style={styles.modalTypesContainer}>
                  {selectedPokemon.types.map((type, index) => (
                    <View
                      key={index}
                      style={[
                        styles.modalTypeBadge,
                        {backgroundColor: getTypeColor(type)},
                      ]}>
                      <Text style={styles.modalTypeText}>
                        {type.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pokédex #</Text>
                    <Text style={styles.detailValue}>
                      {selectedPokemon.id.toString().padStart(3, '0')}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Height</Text>
                    <Text style={styles.detailValue}>
                      {selectedPokemon.height
                        ? `${(selectedPokemon.height / 10).toFixed(1)} m`
                        : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weight</Text>
                    <Text style={styles.detailValue}>
                      {selectedPokemon.weight
                        ? `${(selectedPokemon.weight / 10).toFixed(1)} kg`
                        : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Biome</Text>
                    <Text style={styles.detailValue}>
                      {selectedPokemon.biome}
                    </Text>
                  </View>

                  {selectedPokemon.caughtAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Caught On</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedPokemon.caughtAt).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                      {selectedPokemon.latitude.toFixed(4)},{' '}
                      {selectedPokemon.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.releaseButton}
                  onPress={() => releasePokemon(selectedPokemon)}>
                  <Text style={styles.releaseButtonText}>
                    Release Pokémon
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GalleryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FF6B6B',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
  listContainer: {
    padding: 10,
  },
  pokemonCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    margin: 5,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: width / 2 - 20,
  },
  cardImageContainer: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    marginBottom: 10,
  },
  cardImage: {
    width: 100,
    height: 100,
  },
  cardInfo: {
    width: '100%',
    alignItems: 'center',
  },
  pokemonName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 5,
    textAlign: 'center',
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 5,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  typeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  biomeText: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },
  dateText: {
    fontSize: 10,
    color: '#999',
    marginTop: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
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
  modalImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C2C2C',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalTypesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  modalTypeBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    marginHorizontal: 5,
    marginVertical: 3,
  },
  modalTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#2C2C2C',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  releaseButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  releaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

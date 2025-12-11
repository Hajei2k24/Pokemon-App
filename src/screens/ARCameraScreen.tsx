import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  PermissionsAndroid,
  Platform,
  TextInput,
  FlatList,
  Dimensions,
  Modal,
  PanResponder,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import Voice from '@react-native-voice/voice';
import RNFS from 'react-native-fs';
import axios from 'axios';

const {width, height} = Dimensions.get('window');

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
}

interface CapturedPhoto {
  id: string;
  uri: string;
  pokemon: Pokemon;
  timestamp: number;
  pokemonPosition?: {
    x: number;
    y: number;
  };
}

// Popular Pokemon list for dropdown (Gen 1-2 most popular)
const POKEMON_LIST = [
  'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise', 'caterpie', 'metapod', 'butterfree',
  'weedle', 'kakuna', 'beedrill', 'pidgey', 'pidgeotto', 'pidgeot',
  'rattata', 'raticate', 'spearow', 'fearow', 'ekans', 'arbok',
  'pikachu', 'raichu', 'sandshrew', 'sandslash', 'nidoran-f', 'nidorina',
  'nidoqueen', 'nidoran-m', 'nidorino', 'nidoking', 'clefairy', 'clefable',
  'vulpix', 'ninetales', 'jigglypuff', 'wigglytuff', 'zubat', 'golbat',
  'oddish', 'gloom', 'vileplume', 'paras', 'parasect', 'venonat',
  'venomoth', 'diglett', 'dugtrio', 'meowth', 'persian', 'psyduck',
  'golduck', 'mankey', 'primeape', 'growlithe', 'arcanine', 'poliwag',
  'poliwhirl', 'poliwrath', 'abra', 'kadabra', 'alakazam', 'machop',
  'machoke', 'machamp', 'bellsprout', 'weepinbell', 'victreebel', 'tentacool',
  'tentacruel', 'geodude', 'graveler', 'golem', 'ponyta', 'rapidash',
  'slowpoke', 'slowbro', 'magnemite', 'magneton', 'farfetchd', 'doduo',
  'dodrio', 'seel', 'dewgong', 'grimer', 'muk', 'shellder',
  'cloyster', 'gastly', 'haunter', 'gengar', 'onix', 'drowzee',
  'hypno', 'krabby', 'kingler', 'voltorb', 'electrode', 'exeggcute',
  'exeggutor', 'cubone', 'marowak', 'hitmonlee', 'hitmonchan', 'lickitung',
  'koffing', 'weezing', 'rhyhorn', 'rhydon', 'chansey', 'tangela',
  'kangaskhan', 'horsea', 'seadra', 'goldeen', 'seaking', 'staryu',
  'starmie', 'mr-mime', 'scyther', 'jynx', 'electabuzz', 'magmar',
  'pinsir', 'tauros', 'magikarp', 'gyarados', 'lapras', 'ditto',
  'eevee', 'vaporeon', 'jolteon', 'flareon', 'porygon', 'omanyte',
  'omastar', 'kabuto', 'kabutops', 'aerodactyl', 'snorlax', 'articuno',
  'zapdos', 'moltres', 'dratini', 'dragonair', 'dragonite', 'mewtwo',
  'mew', 'chikorita', 'bayleef', 'meganium', 'cyndaquil', 'quilava',
  'typhlosion', 'totodile', 'croconaw', 'feraligatr', 'sentret', 'furret',
  'hoothoot', 'noctowl', 'ledyba', 'ledian', 'spinarak', 'ariados',
  'crobat', 'chinchou', 'lanturn', 'pichu', 'cleffa', 'igglybuff',
  'togepi', 'togetic', 'natu', 'xatu', 'mareep', 'flaaffy',
  'ampharos', 'bellossom', 'marill', 'azumarill', 'sudowoodo', 'politoed',
  'hoppip', 'skiploom', 'jumpluff', 'aipom', 'sunkern', 'sunflora',
  'yanma', 'wooper', 'quagsire', 'espeon', 'umbreon', 'murkrow',
  'slowking', 'misdreavus', 'unown', 'wobbuffet', 'girafarig', 'pineco',
  'forretress', 'dunsparce', 'gligar', 'steelix', 'snubbull', 'granbull',
  'qwilfish', 'scizor', 'shuckle', 'heracross', 'sneasel', 'teddiursa',
  'ursaring', 'slugma', 'magcargo', 'swinub', 'piloswine', 'corsola',
  'remoraid', 'octillery', 'delibird', 'mantine', 'skarmory', 'houndour',
  'houndoom', 'kingdra', 'phanpy', 'donphan', 'porygon2', 'stantler',
  'smeargle', 'tyrogue', 'hitmontop', 'smoochum', 'elekid', 'magby',
  'miltank', 'blissey', 'raikou', 'entei', 'suicune', 'larvitar',
  'pupitar', 'tyranitar', 'lugia', 'ho-oh', 'celebi'
];

const ARCameraScreen = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [gallery, setGallery] = useState<CapturedPhoto[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<CapturedPhoto | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredPokemon, setFilteredPokemon] = useState<string[]>([]);
  const [pokemonPosition, setPokemonPosition] = useState({x: width / 2 - 100, y: height * 0.4 - 100});

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');

  // PanResponder for dragging Pokemon
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        setPokemonPosition({
          x: pokemonPosition.x + gesture.dx,
          y: pokemonPosition.y + gesture.dy,
        });
      },
      onPanResponderRelease: (_, gesture) => {
        setPokemonPosition({
          x: pokemonPosition.x + gesture.dx,
          y: pokemonPosition.y + gesture.dy,
        });
      },
    })
  ).current;

  useEffect(() => {
    requestPermissions();
    loadGallery();

    // Setup voice recognition with error handling
    const setupVoice = async () => {
      try {
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechStart = () => console.log('Speech recognition started');
        Voice.onSpeechEnd = () => console.log('Speech recognition ended');
        console.log('Voice handlers registered');
      } catch (error) {
        console.log('Voice setup error:', error);
      }
    };

    setupVoice();

    return () => {
      try {
        Voice.destroy().then(Voice.removeAllListeners).catch((e) => console.log('Voice cleanup error:', e));
      } catch (error) {
        console.log('Voice cleanup error:', error);
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const cameraGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        const audioGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        setHasPermission(
          cameraGranted === PermissionsAndroid.RESULTS.GRANTED &&
          audioGranted === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
      }
    } else {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
    }
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);

    if (query.trim().length > 0) {
      // Filter Pokemon list based on query
      const filtered = POKEMON_LIST.filter(pokemon =>
        pokemon.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10); // Limit to 10 results for better UX
      setFilteredPokemon(filtered);
      setShowDropdown(true);
    } else {
      // Show all Pokemon if search is empty
      setFilteredPokemon(POKEMON_LIST.slice(0, 10));
      setShowDropdown(true);
    }
  };

  const selectPokemonFromDropdown = (name: string) => {
    setSearchQuery(name);
    setShowDropdown(false);
    searchPokemon(name);
  };

  const searchPokemon = async (name: string) => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a Pokémon name');
      return;
    }

    setIsSearching(true);
    setShowDropdown(false);
    try {
      const response = await axios.get(
        `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase().trim()}`
      );
      const pokemon: Pokemon = {
        id: response.data.id,
        name: response.data.name,
        sprite: response.data.sprites.front_default,
      };
      setSelectedPokemon(pokemon);
      Alert.alert('Success', `${pokemon.name} is ready to capture!`);
    } catch (error) {
      Alert.alert('Error', 'Pokémon not found. Try another name!');
    } finally {
      setIsSearching(false);
    }
  };

  const startVoiceSearch = async () => {
    try {
      setIsListening(true);
      setShowDropdown(false);

      console.log('Starting voice recognition...');
      await Voice.start('en-US');

      Alert.alert('🎤 Listening', 'Speak a Pokémon name...', [
        {
          text: 'Cancel',
          onPress: () => stopVoiceSearch(),
          style: 'cancel',
        },
      ]);
    } catch (error: any) {
      console.error('Voice error:', error);
      setIsListening(false);

      Alert.alert(
        'Voice Recognition Unavailable',
        'Voice recognition is not available. Please use the text search box to find Pokémon.',
        [{text: 'OK'}]
      );
    }
  };

  const stopVoiceSearch = async () => {
    try {
      if (Voice) {
        await Voice.stop();
      }
      setIsListening(false);
    } catch (error) {
      console.error('Voice stop error:', error);
      setIsListening(false);
    }
  };

  const onSpeechResults = (event: any) => {
    setIsListening(false);
    if (event.value && event.value[0]) {
      const spokenText = event.value[0];
      console.log('Voice recognized:', spokenText);
      setSearchQuery(spokenText);

      // Show what was recognized
      Alert.alert(
        '🎤 Recognized',
        `Searching for: "${spokenText}"`,
        [{text: 'OK', onPress: () => searchPokemon(spokenText)}]
      );
    } else {
      Alert.alert('No Speech', 'No speech was detected. Please try again.');
    }
  };

  const onSpeechError = (error: any) => {
    console.error('Speech error:', error);
    setIsListening(false);

    let errorMessage = 'Could not recognize speech. Please try again.';
    if (error.error?.code === '7') {
      errorMessage = 'No speech detected. Please speak clearly.';
    } else if (error.error?.code === '9') {
      errorMessage = 'Microphone permission denied. Please enable it in settings.';
    }

    Alert.alert('Voice Error', errorMessage);
  };

  const takePhoto = async () => {
    if (!selectedPokemon) {
      Alert.alert('No Pokémon Selected', 'Please search for a Pokémon first!');
      return;
    }

    try {
      if (camera.current) {
        const photoData = await camera.current.takePhoto({
          flash: 'off',
        });
        setPhoto(photoData.path);
        setIsCameraActive(false);

        // Save to gallery
        await saveToGallery(photoData.path, selectedPokemon);

        Alert.alert('Success', `${selectedPokemon.name} captured!`);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const saveToGallery = async (photoPath: string, pokemon: Pokemon) => {
    try {
      // Download pokemon sprite and save it locally
      const pokemonImagePath = `${RNFS.DocumentDirectoryPath}/pokemon_${Date.now()}.png`;
      await RNFS.downloadFile({
        fromUrl: pokemon.sprite,
        toFile: pokemonImagePath,
      }).promise;

      const capturedPhoto: CapturedPhoto = {
        id: Date.now().toString(),
        uri: photoPath,
        pokemon: {
          ...pokemon,
          sprite: pokemonImagePath, // Store local path instead of URL
        },
        timestamp: Date.now(),
        pokemonPosition: {
          x: pokemonPosition.x,
          y: pokemonPosition.y,
        },
      };

      const newGallery = [capturedPhoto, ...gallery];
      setGallery(newGallery);

      // Save gallery to storage
      const galleryPath = `${RNFS.DocumentDirectoryPath}/pokemon_gallery.json`;
      await RNFS.writeFile(galleryPath, JSON.stringify(newGallery), 'utf8');
    } catch (error) {
      console.error('Error saving to gallery:', error);
    }
  };

  const loadGallery = async () => {
    try {
      const galleryPath = `${RNFS.DocumentDirectoryPath}/pokemon_gallery.json`;
      const exists = await RNFS.exists(galleryPath);

      if (exists) {
        const data = await RNFS.readFile(galleryPath, 'utf8');
        setGallery(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setIsCameraActive(true);
  };

  const clearPokemon = () => {
    setSelectedPokemon(null);
    setSearchQuery('');
  };

  const deletePhoto = async (photo: CapturedPhoto) => {
    Alert.alert(
      'Delete Photo',
      `Are you sure you want to delete this photo of ${photo.pokemon.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the photo file
              const photoExists = await RNFS.exists(photo.uri);
              if (photoExists) {
                await RNFS.unlink(photo.uri);
              }

              // Delete the pokemon sprite file
              const spriteExists = await RNFS.exists(photo.pokemon.sprite);
              if (spriteExists) {
                await RNFS.unlink(photo.pokemon.sprite);
              }

              // Remove from gallery
              const newGallery = gallery.filter(item => item.id !== photo.id);
              setGallery(newGallery);

              // Update storage
              const galleryPath = `${RNFS.DocumentDirectoryPath}/pokemon_gallery.json`;
              await RNFS.writeFile(galleryPath, JSON.stringify(newGallery), 'utf8');

              // Close fullscreen if open
              if (fullscreenImage?.id === photo.id) {
                setFullscreenImage(null);
              }

              Alert.alert('Success', 'Photo deleted successfully');
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera and Microphone permissions are required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gallery Modal */}
      <Modal visible={showGallery} animationType="slide" transparent={true}>
        <View style={styles.galleryModal}>
          <View style={styles.galleryContent}>
            <Text style={styles.galleryTitle}>Captured Pokémon ({gallery.length})</Text>

            <FlatList
              data={gallery}
              numColumns={2}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <View style={styles.galleryItem}>
                  <TouchableOpacity
                    style={styles.galleryImageContainer}
                    onPress={() => setFullscreenImage(item)}>
                    <Image
                      source={{uri: `file://${item.uri}`}}
                      style={styles.galleryImage}
                    />
                    <Image
                      source={{uri: `file://${item.pokemon.sprite}`}}
                      style={[
                        styles.galleryPokemonOverlay,
                        item.pokemonPosition && {
                          left: (item.pokemonPosition.x / width) * (width / 2 - 40),
                          top: (item.pokemonPosition.y / height) * (width / 2 - 40),
                          transform: undefined,
                        },
                      ]}
                    />
                    <Text style={styles.galleryPokemonName}>{item.pokemon.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deletePhoto(item)}>
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No Pokémon captured yet!</Text>
              }
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowGallery(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Modal */}
      <Modal visible={fullscreenImage !== null} animationType="fade" transparent={true}>
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenImage(null)}>
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>

          {fullscreenImage && (
            <>
              <TouchableOpacity
                style={styles.fullscreenDeleteButton}
                onPress={() => deletePhoto(fullscreenImage)}>
                <Text style={styles.fullscreenDeleteText}>🗑️ Delete</Text>
              </TouchableOpacity>

              <Image
                source={{uri: `file://${fullscreenImage.uri}`}}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
              <Image
                source={{uri: `file://${fullscreenImage.pokemon.sprite}`}}
                style={[
                  styles.fullscreenPokemonOverlay,
                  fullscreenImage.pokemonPosition && {
                    left: fullscreenImage.pokemonPosition.x,
                    top: fullscreenImage.pokemonPosition.y,
                    transform: undefined,
                  },
                ]}
                resizeMode="contain"
              />
              <View style={styles.fullscreenInfo}>
                <Text style={styles.fullscreenPokemonName}>
                  {fullscreenImage.pokemon.name.toUpperCase()}
                </Text>
                <Text style={styles.fullscreenDate}>
                  {new Date(fullscreenImage.timestamp).toLocaleDateString()}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Camera or Photo Preview */}
      {photo ? (
        <View style={styles.previewContainer}>
          <Image
            source={{uri: `file://${photo}`}}
            style={styles.preview}
            resizeMode="contain"
          />
          {selectedPokemon && (
            <Image
              source={{uri: selectedPokemon.sprite}}
              style={[
                styles.pokemonOverlay,
                {
                  left: pokemonPosition.x,
                  top: pokemonPosition.y,
                  transform: undefined, // Remove default transform
                },
              ]}
              resizeMode="contain"
            />
          )}
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.button} onPress={retakePhoto}>
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setShowGallery(true)}>
              <Text style={styles.buttonText}>Gallery ({gallery.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Camera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={isCameraActive}
            photo={true}
          />

          {/* Pokemon Overlay - Draggable */}
          {selectedPokemon && (
            <View
              {...panResponder.panHandlers}
              style={[
                styles.arOverlay,
                {
                  left: pokemonPosition.x,
                  top: pokemonPosition.y,
                },
              ]}>
              <Image
                source={{uri: selectedPokemon.sprite}}
                style={styles.pokemonAR}
                resizeMode="contain"
              />
              <Text style={styles.pokemonName}>{selectedPokemon.name.toUpperCase()}</Text>
              <Text style={styles.dragHint}>👆 Drag to move</Text>
            </View>
          )}

          {/* Search UI */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search Pokémon..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearchQueryChange}
                onFocus={() => {
                  // Show dropdown with initial Pokemon when focused
                  setFilteredPokemon(POKEMON_LIST.slice(0, 10));
                  setShowDropdown(true);
                }}
                onSubmitEditing={() => searchPokemon(searchQuery)}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => searchPokemon(searchQuery)}
                disabled={isSearching}>
                <Text style={styles.searchButtonText}>
                  {isSearching ? '...' : '🔍'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
                onPress={isListening ? stopVoiceSearch : startVoiceSearch}>
                <Text style={styles.searchButtonText}>
                  {isListening ? '🔴' : '🎤'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dropdown List */}
            {showDropdown && !selectedPokemon && (
              <View style={styles.dropdown}>
                <FlatList
                  data={filteredPokemon}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  style={styles.dropdownList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => selectPokemonFromDropdown(item)}>
                      <Text style={styles.dropdownItemText}>
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.dropdownEmpty}>No Pokémon found</Text>
                  }
                />
                <TouchableOpacity
                  style={styles.dropdownClose}
                  onPress={() => setShowDropdown(false)}>
                  <Text style={styles.dropdownCloseText}>Close ✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedPokemon && (
              <View style={styles.selectedPokemon}>
                <Image
                  source={{uri: selectedPokemon.sprite}}
                  style={styles.selectedSprite}
                />
                <Text style={styles.selectedName}>{selectedPokemon.name}</Text>
                <TouchableOpacity onPress={clearPokemon}>
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.galleryIconButton}
              onPress={() => setShowGallery(true)}>
              <Text style={styles.galleryIcon}>🖼️</Text>
              {gallery.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{gallery.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, !selectedPokemon && styles.captureButtonDisabled]}
              onPress={takePhoto}
              disabled={!selectedPokemon}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    margin: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 5,
  },
  searchButton: {
    padding: 10,
    marginLeft: 5,
  },
  searchButtonText: {
    fontSize: 20,
  },
  voiceButton: {
    padding: 10,
    marginLeft: 5,
    borderRadius: 20,
  },
  voiceButtonActive: {
    backgroundColor: '#ff4444',
  },
  selectedPokemon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  selectedSprite: {
    width: 100,
    height: 50,
  },
  selectedName: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: -10,
    textTransform: 'capitalize',
  },
  clearText: {
    fontSize: 24,
    color: '#ff4444',
    padding: 5,
  },
  arOverlay: {
    position: 'absolute',
    alignItems: 'center',
    width: 200,
  },
  pokemonAR: {
    width: 200,
    height: 200,
  },
  pokemonName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 5,
  },
  dragHint: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    textShadowColor: '#000',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
    opacity: 0.8,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  galleryIconButton: {
    position: 'relative',
  },
  galleryIcon: {
    fontSize: 40,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    width: '100%',
    height: '80%',
  },
  pokemonOverlay: {
    position: 'absolute',
    width: 250,
    height: 250,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  galleryModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  galleryContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  galleryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  galleryItem: {
    flex: 1,
    margin: 5,
    position: 'relative',
  },
  galleryImageContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 10,
  },
  galleryImage: {
    width: width / 2 - 40,
    height: width / 2 - 40,
    borderRadius: 10,
  },
  galleryPokemonName: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff4444',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 50,
  },
  closeButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  galleryPokemonOverlay: {
    position: 'absolute',
    width: 80,
    height: 80,
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  fullscreenDeleteButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: '#ff4444',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  fullscreenDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullscreenImage: {
    width: width,
    height: height,
  },
  fullscreenPokemonOverlay: {
    position: 'absolute',
    width: 250,
    height: 250,
  },
  fullscreenInfo: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  fullscreenPokemonName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 5,
  },
  fullscreenDate: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 5,
  },
  dropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    marginTop: 10,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  dropdownList: {
    maxHeight: 250,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownEmpty: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  dropdownClose: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
  },
  dropdownCloseText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ARCameraScreen;

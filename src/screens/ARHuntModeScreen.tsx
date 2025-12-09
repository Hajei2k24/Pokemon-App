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
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import Geolocation from 'react-native-geolocation-service';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const {width, height} = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  latitude: number;
  longitude: number;
  biome: string;
  distance?: number;
  height?: number; // Pokemon height in decimeters from API
  weight?: number; // Pokemon weight in hectograms from API
  caughtAt?: string; // Timestamp when Pokemon was caught
  arPosition?: {
    horizontal: number; // -1 to 1 (left to right)
    vertical: number;   // -1 to 1 (top to bottom)
  };
}

const ARHuntModeScreen = () => {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [huntMode, setHuntMode] = useState(false);
  const [nearbyPokemon, setNearbyPokemon] = useState<Pokemon[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [pokeballThrown, setPokeballThrown] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [caughtPokemon, setCaughtPokemon] = useState<Pokemon[]>([]);
  const [showRadar, setShowRadar] = useState(true);
  const [deviceHeading, setDeviceHeading] = useState<number>(0); // Device compass heading

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const pokeballAnim = useRef(new Animated.Value(0)).current;
  const captureAnim = useRef(new Animated.Value(0)).current;
  const locationWatchId = useRef<number | null>(null);
  const headingWatchId = useRef<number | null>(null);

  useEffect(() => {
    requestAllPermissions();
    configurePushNotifications();

    return () => {
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
      }
      if (headingWatchId.current !== null) {
        Geolocation.clearWatch(headingWatchId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (huntMode && location) {
      startLocationTracking();
      startHeadingTracking();
      spawnNearbyPokemon();

      const interval = setInterval(() => {
        spawnNearbyPokemon();
      }, 30000); // Spawn new Pokemon every 30 seconds

      return () => {
        clearInterval(interval);
        if (locationWatchId.current !== null) {
          Geolocation.clearWatch(locationWatchId.current);
        }
        if (headingWatchId.current !== null) {
          Geolocation.clearWatch(headingWatchId.current);
        }
      };
    }
  }, [huntMode, location]);

  // Update Pokemon distances when location changes
  useEffect(() => {
    if (location && nearbyPokemon.length > 0) {
      updatePokemonDistances();
    }
  }, [location]);

  const configurePushNotifications = () => {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    PushNotification.createChannel(
      {
        channelId: 'pokemon-hunt',
        channelName: 'Pokémon Hunt',
        channelDescription: 'Notifications for nearby Pokémon',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Channel created: ${created}`)
    );
  };

  const requestAllPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const allGranted =
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          (granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED ||
           granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED);

        setHasPermissions(allGranted);

        if (!allGranted) {
          Alert.alert(
            'Permissions Required',
            'Camera and Location permissions are required for AR Hunt Mode.'
          );
        }
      } catch (err) {
        console.warn('Permission error:', err);
      }
    } else {
      const cameraPermission = await Camera.requestCameraPermission();
      setHasPermissions(cameraPermission === 'granted');
    }
  };

  const startLocationTracking = () => {
    if (locationWatchId.current !== null) {
      Geolocation.clearWatch(locationWatchId.current);
    }

    locationWatchId.current = Geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 1, // Update every 1 meter for better accuracy
        interval: 1000, // Update every 1 second for real-time tracking
        fastestInterval: 500, // Allow updates as fast as every 500ms
        useSignificantChanges: false, // Don't wait for significant changes
      }
    );
  };

  const startHeadingTracking = () => {
    if (headingWatchId.current !== null) {
      Geolocation.clearWatch(headingWatchId.current);
    }

    headingWatchId.current = Geolocation.watchPosition(
      (position) => {
        if (position.coords.heading !== null && position.coords.heading !== undefined) {
          setDeviceHeading(position.coords.heading);
        }
      },
      (error) => {
        console.error('Heading tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        interval: 100, // Update heading frequently for smooth rotation
        fastestInterval: 50,
        useSignificantChanges: false,
      }
    );
  };

  const getCurrentLocation = () => {
    if (!hasPermissions) {
      Alert.alert('Permission Required', 'Please grant location permission');
      requestAllPermissions();
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        Alert.alert('Success', 'Location acquired! You can now start Hunt Mode.');
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Location Error', 'Failed to get location. Make sure GPS is enabled.');
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );
  };

  const determineBiome = (lat: number, lng: number): string => {
    const latAbs = Math.abs(lat);
    const hash = Math.floor((lat + lng) * 1000) % 10;

    if (latAbs > 60) return 'ice';
    if (latAbs < 23.5 && hash < 3) return 'tropical';
    if (hash < 2) return 'water';
    if (hash < 5) return 'urban';
    if (hash < 7) return 'forest';
    return 'grassland';
  };

  const getPokemonByBiome = (biome: string): number[] => {
    const biomeTypes: {[key: string]: number[]} = {
      ice: [86, 87, 124, 144, 145, 238, 361, 362, 363, 364, 365],
      water: [7, 8, 9, 54, 55, 116, 117, 118, 119, 120, 129, 130],
      fire: [4, 5, 6, 37, 38, 58, 59, 77, 78, 126, 136, 146],
      tropical: [1, 2, 3, 43, 44, 45, 69, 70, 71, 102, 103, 114],
      urban: [16, 17, 18, 19, 20, 21, 22, 52, 53, 133, 137, 233],
      forest: [10, 11, 12, 13, 14, 15, 46, 47, 48, 49, 123, 127],
      grassland: [25, 26, 39, 40, 63, 64, 65, 79, 80, 96, 97, 104],
    };

    return biomeTypes[biome] || biomeTypes['grassland'];
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const updatePokemonDistances = () => {
    if (!location) return;

    const updatedPokemon = nearbyPokemon.map(pokemon => ({
      ...pokemon,
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        pokemon.latitude,
        pokemon.longitude
      ),
    }));

    // Sort by distance
    updatedPokemon.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    setNearbyPokemon(updatedPokemon);

    // Update selected Pokemon distance if it's still selected
    if (selectedPokemon) {
      const updated = updatedPokemon.find(p => p.id === selectedPokemon.id);
      if (updated) {
        setSelectedPokemon(updated);
      }
    }
  };

  const spawnNearbyPokemon = async () => {
    if (!location) {
      console.log('Location not available for spawning Pokemon');
      return;
    }

    try {
      const biome = determineBiome(location.latitude, location.longitude);
      const possiblePokemon = getPokemonByBiome(biome);
      const spawnCount = Math.floor(Math.random() * 3) + 2;

      const newPokemon: Pokemon[] = [];

      for (let i = 0; i < spawnCount; i++) {
        const randomId = possiblePokemon[Math.floor(Math.random() * possiblePokemon.length)];

        try {
          const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomId}`, {
            timeout: 10000,
          });

          if (response.data && response.data.sprites && response.data.sprites.front_default) {
            // Spawn within 5-15m radius (very close to user)
            const pokemonLat = location.latitude + (Math.random() - 0.5) * 0.00018;
            const pokemonLng = location.longitude + (Math.random() - 0.5) * 0.00018;
            const distance = calculateDistance(
              location.latitude,
              location.longitude,
              pokemonLat,
              pokemonLng
            );

            const pokemon: Pokemon = {
              id: response.data.id,
              name: response.data.name,
              sprite: response.data.sprites.front_default,
              types: response.data.types.map((t: any) => t.type.name),
              latitude: pokemonLat,
              longitude: pokemonLng,
              biome: biome,
              distance: distance,
              height: response.data.height, // Height in decimeters
              weight: response.data.weight, // Weight in hectograms
              // No random AR position - Pokemon stays at fixed GPS coordinates
            };
            newPokemon.push(pokemon);
          }
        } catch (error) {
          console.error(`Error fetching pokemon ${randomId}:`, error);
        }
      }

      if (newPokemon.length > 0) {
        setNearbyPokemon(prev => [...newPokemon, ...prev].slice(0, 20));

        if (huntMode) {
          try {
            PushNotification.localNotification({
              channelId: 'pokemon-hunt',
              title: 'Pokémon Nearby!',
              message: `A wild ${newPokemon[0].name} appeared in the ${biome} area!`,
              playSound: true,
              soundName: 'default',
            });
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
          }
        }
      }
    } catch (error) {
      console.error('Error in spawnNearbyPokemon:', error);
    }
  };

  const toggleHuntMode = () => {
    if (!location) {
      Alert.alert('Location Required', 'Please get your location first');
      return;
    }

    setHuntMode(!huntMode);
    setIsCameraActive(!huntMode);

    if (!huntMode) {
      Alert.alert('AR Hunt Mode Active', 'Use your camera to find and catch Pokémon!');
      spawnNearbyPokemon();
    } else {
      setNearbyPokemon([]);
      setSelectedPokemon(null);
    }
  };

  const throwPokeball = () => {
    if (!selectedPokemon) {
      Alert.alert('No Pokémon', 'No Pokémon in range to catch!');
      return;
    }

    setPokeballThrown(true);

    // Animate pokeball throw
    Animated.sequence([
      Animated.timing(pokeballAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pokeballAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Calculate catch success based on distance
      const distance = selectedPokemon.distance || 50;
      const catchRate = Math.max(0.2, 1 - distance / 100); // Closer = higher catch rate
      const success = Math.random() < catchRate;

      setCaptureSuccess(success);
      setShowCaptureModal(true);

      if (success) {
        // Save to AsyncStorage for Gallery
        saveCaughtPokemon(selectedPokemon);

        // Add to caught Pokemon in current session
        setCaughtPokemon(prev => [...prev, selectedPokemon]);

        // Remove from nearby
        setNearbyPokemon(prev => prev.filter(p => p.id !== selectedPokemon.id));

        // Animate capture
        Animated.spring(captureAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }).start();
      }

      setTimeout(() => {
        setPokeballThrown(false);
        setShowCaptureModal(false);
        setCaptureSuccess(false);
        captureAnim.setValue(0);

        if (success) {
          setSelectedPokemon(null);
        }
      }, 2500);
    });
  };

  const saveCaughtPokemon = async (pokemon: Pokemon) => {
    try {
      // Add caught timestamp
      const caughtPokemonWithTime = {
        ...pokemon,
        caughtAt: new Date().toISOString(),
      };

      // Load existing caught Pokemon
      const stored = await AsyncStorage.getItem('caughtPokemon');
      const existing = stored ? JSON.parse(stored) : [];

      // Add new Pokemon to the list
      const updated = [...existing, caughtPokemonWithTime];

      // Save back to storage
      await AsyncStorage.setItem('caughtPokemon', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving caught Pokemon:', error);
    }
  };

  const selectPokemon = (pokemon: Pokemon) => {
    setSelectedPokemon(pokemon);
  };

  const isPokemonInView = (pokemon: Pokemon): boolean => {
    if (!pokemon.distance) return false;
    // Pokemon is "in view" when user is within 3 meters
    return pokemon.distance < 3;
  };

  const getPokemonSize = (pokemon: Pokemon): number => {
    // Return a larger, consistent size for better visibility
    // All Pokemon will appear at a decent size regardless of their actual height
    return 250; // Larger, consistent size for better gameplay
  };

  if (!hasPermissions) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera and Location permissions are required for AR Hunt Mode
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestAllPermissions}>
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
      {/* Capture Result Modal */}
      <Modal visible={showCaptureModal} transparent animationType="fade">
        <View style={styles.captureModalOverlay}>
          <Animated.View
            style={[
              styles.captureModalContent,
              {
                transform: [{scale: captureAnim}],
              },
            ]}>
            <Text style={styles.captureModalTitle}>
              {captureSuccess ? 'Gotcha!' : 'Oh no!'}
            </Text>
            {selectedPokemon && (
              <>
                <Image source={{uri: selectedPokemon.sprite}} style={styles.captureModalImage} />
                <Text style={styles.captureModalText}>
                  {captureSuccess
                    ? `${selectedPokemon.name} was caught!`
                    : `${selectedPokemon.name} escaped! Try again!`}
                </Text>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Camera View or Placeholder */}
      {huntMode && isCameraActive ? (
        <>
          <Camera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={isCameraActive}
            photo={true}
          />

          {/* Compact Radar - Top Right with User Arrow */}
          {showRadar && (
            <View style={styles.radarCompact}>
              <View style={styles.radarCircleSmall}>
                {/* User position arrow (rotates based on device heading) */}
                <Animated.View
                  style={[
                    styles.radarUserArrow,
                    {
                      transform: [{rotate: `${deviceHeading}deg`}],
                    },
                  ]}>
                  <Text style={styles.radarUserArrowText}>▲</Text>
                </Animated.View>

                {/* Pokemon dots positioned relative to user */}
                {nearbyPokemon.slice(0, 10).map((pokemon, index) => {
                  if (!pokemon.distance || !location) return null;
                  const maxRadarDistance = 20;
                  const radarRadius = 25;
                  const normalizedDistance = Math.min(pokemon.distance / maxRadarDistance, 1);
                  const latDiff = pokemon.latitude - location.latitude;
                  const lngDiff = pokemon.longitude - location.longitude;
                  const angle = Math.atan2(lngDiff, latDiff);
                  const x = Math.sin(angle) * normalizedDistance * radarRadius;
                  const y = -Math.cos(angle) * normalizedDistance * radarRadius;

                  return (
                    <View
                      key={`${pokemon.id}-${index}`}
                      style={[
                        styles.radarDotSmall,
                        {
                          left: 30 + x,
                          top: 30 + y,
                          backgroundColor: selectedPokemon?.id === pokemon.id ? '#FFD700' : '#FF6B6B',
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <TouchableOpacity
                style={styles.radarToggleSmall}
                onPress={() => setShowRadar(!showRadar)}>
                <Text style={styles.radarToggleTextSmall}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {!showRadar && (
            <TouchableOpacity
              style={styles.radarOpenButton}
              onPress={() => setShowRadar(true)}>
              <Text style={styles.radarOpenText}>📡</Text>
            </TouchableOpacity>
          )}

          {/* AR Pokemon Overlay - Only show when very close (within 3m) and centered */}
          {selectedPokemon &&
           !pokeballThrown &&
           isPokemonInView(selectedPokemon) && (
            <View style={styles.arPokemonContainerCenter}>
              <Image
                source={{uri: selectedPokemon.sprite}}
                style={{
                  width: getPokemonSize(selectedPokemon),
                  height: getPokemonSize(selectedPokemon),
                }}
                resizeMode="contain"
              />
              <Text style={styles.pokemonName}>
                {selectedPokemon.name.toUpperCase()}
              </Text>
              <Text style={styles.pokemonDistance}>
                {selectedPokemon.distance?.toFixed(1)}m away
              </Text>
              <Text style={styles.pokemonHeight}>
                {selectedPokemon.height ? `${(selectedPokemon.height / 10).toFixed(1)}m tall` : ''}
              </Text>
            </View>
          )}

          {/* Hint when Pokemon is selected but not in view */}
          {selectedPokemon &&
           !pokeballThrown &&
           !isPokemonInView(selectedPokemon) && (
            <View style={styles.searchHint}>
              <Text style={styles.searchHintText}>
                🔍 Walk closer to find {selectedPokemon.name}
              </Text>
              <Text style={styles.searchHintDistance}>
                {selectedPokemon.distance?.toFixed(1)}m away
              </Text>
            </View>
          )}

          {/* Pokeball Animation */}
          {pokeballThrown && (
            <Animated.View
              style={[
                styles.pokeballAnimation,
                {
                  transform: [
                    {
                      translateY: pokeballAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [height, height * 0.4],
                      }),
                    },
                  ],
                },
              ]}>
              <Text style={styles.pokeballEmoji}>⚾</Text>
            </Animated.View>
          )}
        </>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {location ? 'Start Hunt Mode to activate AR camera' : 'Get your location to start hunting'}
          </Text>
        </View>
      )}

      {/* Minimal Control Panel - Only show when not in hunt mode */}
      {!huntMode && (
        <View style={styles.controlPanel}>
          <View style={styles.statusBar}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>Hunt Mode Inactive</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={getCurrentLocation}>
              <Text style={styles.controlButtonText}>📍 Get Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleHuntMode}>
              <Text style={styles.controlButtonText}>🎯 Start Hunt</Text>
            </TouchableOpacity>
          </View>

          {location && (
            <View style={styles.locationInfo}>
              <Text style={styles.infoText}>
                🌍 Biome: {determineBiome(location.latitude, location.longitude)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Minimal Top Bar - Only show during hunt mode */}
      {huntMode && (
        <View style={styles.minimalTopBar}>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={toggleHuntMode}>
            <Text style={styles.stopButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.statsMinimal}>
            {nearbyPokemon.length}👾 · {caughtPokemon.length}🎯
          </Text>
        </View>
      )}

      {/* Compact Pokemon Selector - Bottom */}
      {huntMode && nearbyPokemon.length > 0 && (
        <View style={styles.pokemonSelector}>
          <Text style={styles.selectorLabel}>TARGET:</Text>
          <View style={styles.pokemonListHorizontal}>
            {nearbyPokemon.slice(0, 5).map((pokemon, index) => (
              <TouchableOpacity
                key={`${pokemon.id}-${index}`}
                style={[
                  styles.pokemonChip,
                  selectedPokemon?.id === pokemon.id && styles.pokemonChipSelected,
                ]}
                onPress={() => selectPokemon(pokemon)}>
                <Image source={{uri: pokemon.sprite}} style={styles.pokemonChipImage} />
                <Text style={styles.pokemonChipDistance}>
                  {pokemon.distance?.toFixed(0)}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Pokeball Button - Only show when Pokemon is in view */}
      {huntMode && selectedPokemon && isPokemonInView(selectedPokemon) && (
        <TouchableOpacity
          style={styles.pokeballButton}
          onPress={throwPokeball}
          disabled={pokeballThrown}>
          <Text style={styles.pokeballButtonText}>⚾</Text>
          <Text style={styles.pokeballButtonLabel}>THROW</Text>
        </TouchableOpacity>
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
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
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
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  controlPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  minimalTopBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  stopButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsMinimal: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  radarCompact: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 35,
    padding: 5,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  radarCircleSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 76, 202, 0.3)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarUserArrow: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  radarUserArrowText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  radarDotSmall: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    transform: [{translateX: -2}, {translateY: -2}],
  },
  radarToggleSmall: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarToggleTextSmall: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  radarOpenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  radarOpenText: {
    fontSize: 24,
  },
  searchHint: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchHintText: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  searchHintDistance: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
  },
  arPokemonContainerCenter: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{translateX: -100}, {translateY: -100}],
    alignItems: 'center',
  },
  pokemonName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 5,
    marginTop: 10,
  },
  pokemonDistance: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
    marginTop: 5,
  },
  pokemonHeight: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
    marginTop: 3,
  },
  pokemonSelector: {
    position: 'absolute',
    bottom: 15,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  selectorLabel: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
  },
  pokemonListHorizontal: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  pokemonChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 4,
    minWidth: 50,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pokemonChipSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  pokemonChipImage: {
    width: 40,
    height: 40,
  },
  pokemonChipDistance: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  pokeballButton: {
    position: 'absolute',
    bottom: 90,
    left: '50%',
    transform: [{translateX: -40}],
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  pokeballButtonText: {
    fontSize: 36,
  },
  pokeballButtonLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -5,
  },
  pokeballAnimation: {
    position: 'absolute',
    left: '50%',
    transform: [{translateX: -25}],
  },
  pokeballEmoji: {
    fontSize: 50,
  },
  captureModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
  },
  captureModalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 20,
  },
  captureModalImage: {
    width: 150,
    height: 150,
  },
  captureModalText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});

export default ARHuntModeScreen;

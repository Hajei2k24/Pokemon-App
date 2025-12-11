import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MapView, {Marker, Circle} from 'react-native-maps';
import PushNotification from 'react-native-push-notification';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/MyStack';
import {Camera, useCameraDevice} from 'react-native-vision-camera';

const {width, height} = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
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
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Geolocation'>;

const GeolocationScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [huntMode, setHuntMode] = useState(false);
  const [nearbyPokemon, setNearbyPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraViewActive, setCameraViewActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [showPokemonDetails, setShowPokemonDetails] = useState(false);
  const [detailsPokemon, setDetailsPokemon] = useState<Pokemon | null>(null);
  const [pokeballThrown, setPokeballThrown] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const locationWatchId = useRef<number | null>(null);
  const pokeballAnim = useRef(new Animated.Value(0)).current;
  const captureAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestLocationPermission();
    configurePushNotifications();

    return () => {
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (huntMode && location) {
      spawnNearbyPokemon();
      startLocationTracking();
      const interval = setInterval(() => {
        spawnNearbyPokemon();
      }, 30000); // Spawn new Pokemon every 30 seconds
      return () => {
        clearInterval(interval);
        if (locationWatchId.current !== null) {
          Geolocation.clearWatch(locationWatchId.current);
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

  // Update selected Pokemon distance in real-time
  useEffect(() => {
    if (location && selectedPokemon && selectedPokemon.latitude && selectedPokemon.longitude) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        selectedPokemon.latitude,
        selectedPokemon.longitude
      );
      setSelectedPokemon(prev => prev ? {...prev, distance} : null);

      // Also update in detailsPokemon if modal is open
      if (detailsPokemon && detailsPokemon.id === selectedPokemon.id) {
        setDetailsPokemon(prev => prev ? {...prev, distance} : null);
      }
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

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Request both FINE and COARSE location permissions for better compatibility
        const fineLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for Pokémon hunting',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const coarseLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for Pokémon hunting',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const hasPermission =
          fineLocationGranted === PermissionsAndroid.RESULTS.GRANTED ||
          coarseLocationGranted === PermissionsAndroid.RESULTS.GRANTED;

        setHasPermission(hasPermission);

        if (!hasPermission) {
          Alert.alert(
            'Permission Denied',
            'Location permission is required for Pokémon hunting. Please grant permission in app settings.'
          );
        }
      } catch (err) {
        console.warn('Permission error:', err);
        Alert.alert('Error', 'Failed to request location permission');
      }
    } else {
      setHasPermission(true);
    }
  };

  const getCurrentLocation = () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant location permission');
      requestLocationPermission();
      return;
    }

    // Check if Geolocation is available
    if (!Geolocation || typeof Geolocation.getCurrentPosition !== 'function') {
      Alert.alert('Error', 'Geolocation service is not available on this device');
      return;
    }

    setLoading(true);

    try {
      Geolocation.getCurrentPosition(
        position => {
          try {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading,
              timestamp: position.timestamp,
            };
            setLocation(locationData);
            setLoading(false);
            Alert.alert('Success', 'Location acquired! You can now start Hunt Mode.');
          } catch (innerError) {
            console.error('Error processing location:', innerError);
            setLoading(false);
            Alert.alert('Error', 'Failed to process location data');
          }
        },
        error => {
          console.error('Location error:', error);
          setLoading(false);

          let errorMessage = 'Failed to get location. ';

          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage += 'Location permission denied. Please enable location in settings.';
              setHasPermission(false);
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage += 'Location service is unavailable. Make sure GPS is enabled.';
              break;
            case 3: // TIMEOUT
              errorMessage += 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage += error.message || 'Unknown error occurred.';
          }

          Alert.alert('Location Error', errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000, // Increased timeout
          maximumAge: 10000,
          forceRequestLocation: true, // Force location request on Android
          showLocationDialog: true, // Show dialog to enable location if disabled
        }
      );
    } catch (error) {
      console.error('Geolocation error:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to request location. Make sure location services are enabled.');
    }
  };

  const determineBiome = (lat: number, lng: number): string => {
    // Simple biome logic based on coordinates
    // In production, you could use Google Maps API or other services
    const latAbs = Math.abs(lat);
    const hash = Math.floor((lat + lng) * 1000) % 10;

    if (latAbs > 60) return 'ice'; // Far north/south
    if (latAbs < 23.5 && hash < 3) return 'tropical'; // Near equator
    if (hash < 2) return 'water'; // Coastal/water areas
    if (hash < 5) return 'urban'; // Cities
    if (hash < 7) return 'forest'; // Forested areas
    return 'grassland'; // Default
  };

  const getPokemonByBiome = (biome: string): number[] => {
    const biomeTypes: {[key: string]: number[]} = {
      ice: [86, 87, 124, 144, 145, 238, 361, 362, 363, 364, 365], // Ice types
      water: [7, 8, 9, 54, 55, 116, 117, 118, 119, 120, 129, 130], // Water types
      fire: [4, 5, 6, 37, 38, 58, 59, 77, 78, 126, 136, 146], // Fire types
      tropical: [1, 2, 3, 43, 44, 45, 69, 70, 71, 102, 103, 114], // Grass types
      urban: [16, 17, 18, 19, 20, 21, 22, 52, 53, 133, 137, 233], // Normal/Common
      forest: [10, 11, 12, 13, 14, 15, 46, 47, 48, 49, 123, 127], // Bug types
      grassland: [25, 26, 39, 40, 63, 64, 65, 79, 80, 96, 97, 104], // Electric/Psychic
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
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 1, // Update every 1 meter
        interval: 1000, // Update every 1 second
        fastestInterval: 500,
        useSignificantChanges: false,
      }
    );
  };

  const spawnNearbyPokemon = async () => {
    if (!location || !location.latitude || !location.longitude) {
      console.log('Location not available for spawning Pokemon');
      return;
    }

    try {
      const biome = determineBiome(location.latitude, location.longitude);
      const possiblePokemon = getPokemonByBiome(biome);
      const spawnCount = Math.floor(Math.random() * 3) + 2; // Spawn 2-4 Pokemon

      const newPokemon: Pokemon[] = [];

      for (let i = 0; i < spawnCount; i++) {
        const randomId = possiblePokemon[Math.floor(Math.random() * possiblePokemon.length)];

        try {
          const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomId}`, {
            timeout: 10000, // 10 second timeout
          });

          if (response.data && response.data.sprites && response.data.sprites.front_default) {
            const pokemonLat = location.latitude + (Math.random() - 0.5) * 0.0009;
            const pokemonLng = location.longitude + (Math.random() - 0.5) * 0.0009;
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
            };
            newPokemon.push(pokemon);
          }
        } catch (error) {
          console.error(`Error fetching pokemon ${randomId}:`, error);
          // Continue with other pokemon even if one fails
        }
      }

      if (newPokemon.length > 0) {
        setNearbyPokemon(prev => [...newPokemon, ...prev].slice(0, 20)); // Keep max 20 Pokemon

        // Send notification for first spawn
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

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        setHasCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    } else {
      const cameraPermission = await Camera.requestCameraPermission();
      setHasCameraPermission(cameraPermission === 'granted');
      return cameraPermission === 'granted';
    }
  };

  const huntWithCamera = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Please get your location first');
      return;
    }

    if (nearbyPokemon.length === 0) {
      Alert.alert('No Pokémon Found', 'Start hunt mode to find nearby Pokémon!');
      return;
    }

    // Request camera permission if not granted
    if (!hasCameraPermission) {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Camera Permission Required', 'Camera permission is needed for AR mode');
        return;
      }
    }

    // Activate camera view (split screen)
    setCameraViewActive(true);
  };

  const toggleHuntMode = () => {
    if (!location) {
      Alert.alert('Location Required', 'Please get your location first');
      return;
    }

    setHuntMode(!huntMode);
    if (!huntMode) {
      Alert.alert('Hunt Mode Active', 'You will be notified when Pokémon appear nearby!');
      spawnNearbyPokemon();
    } else {
      setNearbyPokemon([]);
    }
  };

  const showPokemonDetailsModal = (pokemon: Pokemon) => {
    setDetailsPokemon(pokemon);
    setShowPokemonDetails(true);
  };

  const huntSelectedPokemon = () => {
    if (detailsPokemon) {
      setSelectedPokemon(detailsPokemon);
      setShowPokemonDetails(false);
    }
  };

  const isPokemonInView = (pokemon: Pokemon): boolean => {
    if (!pokemon.distance) return false;
    return pokemon.distance < 10; // Within 10 meters
  };

  const saveCaughtPokemon = async (pokemon: Pokemon) => {
    try {
      // Get existing caught Pokemon
      const existing = await AsyncStorage.getItem('caughtPokemon');
      const caughtList = existing ? JSON.parse(existing) : [];

      // Add new Pokemon with timestamp
      const caughtPokemon = {
        ...pokemon,
        caughtAt: new Date().toISOString(),
        caughtLocation: {
          latitude: location?.latitude,
          longitude: location?.longitude,
        },
      };

      caughtList.push(caughtPokemon);

      // Save back to AsyncStorage
      await AsyncStorage.setItem('caughtPokemon', JSON.stringify(caughtList));
      console.log(`Saved ${pokemon.name} to caught Pokemon!`);
    } catch (error) {
      console.error('Error saving caught Pokemon:', error);
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
      const catchRate = Math.max(0.3, 1 - distance / 50); // Closer = higher catch rate
      const success = Math.random() < catchRate;

      setCaptureSuccess(success);
      setShowCaptureModal(true);

      if (success) {
        // Save caught Pokemon to AsyncStorage
        saveCaughtPokemon(selectedPokemon);

        // Remove from nearby Pokemon
        setNearbyPokemon(prev => prev.filter(p => p.id !== selectedPokemon.id));

        // Animate capture
        Animated.spring(captureAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }).start();

        // Send success notification
        try {
          PushNotification.localNotification({
            channelId: 'pokemon-hunt',
            title: 'Gotcha!',
            message: `${selectedPokemon.name.toUpperCase()} was caught!`,
            playSound: true,
            soundName: 'default',
          });
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      }

      setTimeout(() => {
        setPokeballThrown(false);
        setShowCaptureModal(false);
        setCaptureSuccess(false);
        captureAnim.setValue(0);

        if (success) {
          setSelectedPokemon(null);
          setCameraViewActive(false);
        }
      }, 2500);
    });
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Location permission is required for Pokémon hunting</Text>
        <TouchableOpacity style={styles.button} onPress={requestLocationPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
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

      {/* Pokemon Details Modal */}
      <Modal visible={showPokemonDetails} transparent animationType="slide">
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModalContent}>
            {detailsPokemon && (
              <>
                <TouchableOpacity
                  style={styles.detailsCloseButton}
                  onPress={() => setShowPokemonDetails(false)}>
                  <Text style={styles.detailsCloseText}>✕</Text>
                </TouchableOpacity>

                <Image
                  source={{uri: detailsPokemon.sprite}}
                  style={styles.detailsPokemonImage}
                />

                <Text style={styles.detailsPokemonName}>
                  {detailsPokemon.name.toUpperCase()}
                </Text>

                <View style={styles.detailsTypesContainer}>
                  {detailsPokemon.types.map((type, index) => (
                    <View key={index} style={styles.detailsTypeChip}>
                      <Text style={styles.detailsTypeText}>{type.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailsStatsContainer}>
                  <View style={styles.detailsStatRow}>
                    <Text style={styles.detailsStatLabel}>📍 Distance:</Text>
                    <Text style={styles.detailsStatValue}>
                      {detailsPokemon.distance?.toFixed(1) || '???'}m
                    </Text>
                  </View>

                  <View style={styles.detailsStatRow}>
                    <Text style={styles.detailsStatLabel}>🌍 Biome:</Text>
                    <Text style={styles.detailsStatValue}>
                      {detailsPokemon.biome.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.detailsStatRow}>
                    <Text style={styles.detailsStatLabel}>🎯 Status:</Text>
                    <Text style={[
                      styles.detailsStatValue,
                      detailsPokemon.distance && detailsPokemon.distance < 10
                        ? styles.statusInRange
                        : styles.statusOutOfRange
                    ]}>
                      {detailsPokemon.distance && detailsPokemon.distance < 10
                        ? '✨ IN RANGE!'
                        : '🚶 WALK CLOSER'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.huntThisButton}
                  onPress={huntSelectedPokemon}>
                  <Text style={styles.huntThisButtonText}>🎯 Hunt This Pokémon</Text>
                </TouchableOpacity>

                {detailsPokemon.distance && detailsPokemon.distance > 10 && (
                  <Text style={styles.detailsHint}>
                    Get within 10m to catch this Pokémon!
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {!cameraViewActive ? (
        <>
          {/* Control Panel */}
          <View style={styles.controlPanel}>
            <View style={styles.statusBar}>
              <View style={[styles.statusIndicator, huntMode && styles.statusActive]} />
              <Text style={styles.statusText}>
                {huntMode ? 'HUNT MODE ACTIVE' : 'Hunt Mode Inactive'}
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.controlButton, loading && styles.buttonDisabled]}
                onPress={getCurrentLocation}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.controlButtonText}>📍 Get Location</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, huntMode && styles.buttonActive]}
                onPress={toggleHuntMode}>
                <Text style={styles.controlButtonText}>
                  {huntMode ? '⏸️ Stop Hunt' : '🎯 Start Hunt'}
                </Text>
              </TouchableOpacity>
            </View>

            {location && (
              <View style={styles.locationInfo}>
                <Text style={styles.infoText}>
                  📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
                <Text style={styles.infoText}>
                  🌍 Biome: {determineBiome(location.latitude, location.longitude)}
                </Text>
                <Text style={styles.infoText}>
                  👾 Nearby Pokémon: {nearbyPokemon.length}
                </Text>
              </View>
            )}
          </View>

          {/* Map View */}
          {location && location.latitude && location.longitude ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation
              showsMyLocationButton
              loadingEnabled={true}
              loadingIndicatorColor="#007AFF"
              loadingBackgroundColor="#f5f5f5">

              {/* Search radius circle */}
              <Circle
                center={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                radius={500}
                fillColor="rgba(59, 76, 202, 0.2)"
                strokeColor="rgba(59, 76, 202, 0.5)"
                strokeWidth={2}
              />

              {/* Nearby Pokemon markers */}
              {nearbyPokemon.map((pokemon, index) => (
                <Marker
                  key={`${pokemon.id}-${index}`}
                  coordinate={{
                    latitude: pokemon.latitude,
                    longitude: pokemon.longitude,
                  }}
                  onPress={() => showPokemonDetailsModal(pokemon)}>
                  <View style={styles.markerContainer}>
                    <Image source={{uri: pokemon.sprite}} style={styles.markerImage} />
                  </View>
                </Marker>
              ))}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.placeholderText}>Get your location to start hunting!</Text>
            </View>
          )}

          {/* Hunt with Camera Button - Always visible at bottom center */}
          {huntMode && nearbyPokemon.length > 0 && (
            <TouchableOpacity style={styles.huntCameraFloatingButton} onPress={huntWithCamera}>
              <Text style={styles.huntCameraFloatingIcon}>📹</Text>
              <Text style={styles.huntCameraFloatingText}>Hunt with Camera</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          {/* Split View: Camera (60% top) + Map (40% bottom) */}

          {/* Camera View - Top 60% */}
          {device && (
            <Camera
              ref={camera}
              style={styles.cameraTop}
              device={device}
              isActive={cameraViewActive}
              photo={true}
            />
          )}

          {/* Pokemon appears in camera when in range */}
          {selectedPokemon && isPokemonInView(selectedPokemon) && (
            <View style={styles.arPokemonOverlay}>
              <Image
                source={{uri: selectedPokemon.sprite}}
                style={styles.arPokemonImage}
                resizeMode="contain"
              />
              <Text style={styles.arPokemonName}>
                {selectedPokemon.name.toUpperCase()}
              </Text>
              <Text style={styles.arPokemonDistance}>
                {selectedPokemon.distance?.toFixed(1)}m away
              </Text>
              <View style={styles.arPokemonReadyBadge}>
                <Text style={styles.arPokemonReadyText}>✨ Ready to catch! ✨</Text>
              </View>
            </View>
          )}

          {/* Pokeball Throw Button - Bottom Center of Camera View */}
          {selectedPokemon && isPokemonInView(selectedPokemon) && !pokeballThrown && (
            <TouchableOpacity
              style={styles.pokeballButton}
              onPress={throwPokeball}
              activeOpacity={0.7}>
              <Image
                source={{uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}}
                style={styles.pokeballImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Pokeball Animation Overlay */}
          {pokeballThrown && (
            <Animated.View
              style={[
                styles.pokeballAnimation,
                {
                  transform: [
                    {
                      translateY: pokeballAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [height * 0.5, height * 0.15],
                      }),
                    },
                    {
                      scale: pokeballAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.5, 0.5],
                      }),
                    },
                  ],
                  opacity: pokeballAnim.interpolate({
                    inputRange: [0, 0.8, 1],
                    outputRange: [1, 1, 0],
                  }),
                },
              ]}>
              <Image
                source={{uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}}
                style={styles.pokeballAnimationImage}
                resizeMode="contain"
              />
            </Animated.View>
          )}

          {/* Hint when Pokemon is selected but not in range */}
          {selectedPokemon && !isPokemonInView(selectedPokemon) && (
            <View style={styles.arHintOverlay}>
              <Text style={styles.arHintText}>
                🚶 Walk to {selectedPokemon.name.toUpperCase()}'s location
              </Text>
              <Text style={styles.arHintDistance}>
                {selectedPokemon.distance?.toFixed(1)}m away
              </Text>
            </View>
          )}

          {/* Map View - Bottom 40% */}
          {location && location.latitude && location.longitude ? (
            <MapView
              style={styles.mapBottom}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
              loadingEnabled={true}
              loadingIndicatorColor="#4CAF50"
              loadingBackgroundColor="#1a1a1a">

              {/* Circle around user position */}
              <Circle
                center={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                radius={50}
                fillColor="rgba(59, 76, 202, 0.2)"
                strokeColor="rgba(59, 76, 202, 0.5)"
                strokeWidth={2}
              />

              {/* Nearby Pokemon markers */}
              {nearbyPokemon.map((pokemon, index) => (
                <Marker
                  key={`${pokemon.id}-${index}`}
                  coordinate={{
                    latitude: pokemon.latitude,
                    longitude: pokemon.longitude,
                  }}
                  onPress={() => showPokemonDetailsModal(pokemon)}>
                  <View style={styles.markerContainer}>
                    <Image source={{uri: pokemon.sprite}} style={styles.markerImage} />
                  </View>
                </Marker>
              ))}
            </MapView>
          ) : (
            <View style={styles.mapBottomPlaceholder}>
              <Text style={styles.placeholderText}>Loading Map...</Text>
            </View>
          )}

          {/* Close Camera Button */}
          <TouchableOpacity
            style={styles.closeCameraButton}
            onPress={() => setCameraViewActive(false)}>
            <Text style={styles.closeCameraButtonText}>✕ Exit AR</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  controlPanel: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: '#666',
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
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationInfo: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  encounterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  encounterCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    elevation: 10,
  },
  encounterTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  encounterImage: {
    width: 150,
    height: 150,
  },
  encounterTypes: {
    flexDirection: 'row',
    marginVertical: 15,
    gap: 10,
  },
  encounterType: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  encounterTypeText: {
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  encounterBiome: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  encounterButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  huntCameraButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
  },
  huntCameraButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  encounterButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
  },
  encounterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  huntCameraFloatingButton: {
    position: 'absolute',
    bottom: 50,
    left: '43%',
    transform: [{translateX: -80}],
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  huntCameraFloatingIcon: {
    fontSize: 24,
  },
  huntCameraFloatingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraTop: {
    width: width,
    height: height * 0.7,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  mapBottom: {
    width: width,
    height: height * 0.3,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  mapBottomPlaceholder: {
    width: width,
    height: height * 0.4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeCameraButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeCameraButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Pokemon Details Modal Styles
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  detailsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 25,
    alignItems: 'center',
    width: '85%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 10000,
  },
  detailsCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#FF3B30',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailsCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsPokemonImage: {
    width: 180,
    height: 180,
    marginBottom: 15,
  },
  detailsPokemonName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsTypesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  detailsTypeChip: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailsTypeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailsStatsContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  detailsStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailsStatLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  detailsStatValue: {
    fontSize: 16,
    color: '#2C2C2C',
    fontWeight: 'bold',
  },
  statusInRange: {
    color: '#4CAF50',
  },
  statusOutOfRange: {
    color: '#FF9800',
  },
  huntThisButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  huntThisButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // AR Pokemon Overlay Styles
  arPokemonOverlay: {
    position: 'absolute',
    top: height * 0.02,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  arPokemonImage: {
    width: 320,
    height: 320,
  },
  arPokemonName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 5,
    marginTop: -30,
  },
  arPokemonDistance: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
    marginTop: 5,
  },
  arPokemonReadyBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  arPokemonReadyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  arHintOverlay: {
    position: 'absolute',
    top: height * 0.45,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  arHintText: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  arHintDistance: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 15,
  },
  // Pokeball Button Styles
  pokeballButton: {
    position: 'absolute',
    bottom: height * 0.31, // Just above the map (which takes 40% of screen)
    left: width / 2 - 50, // Center horizontally (50 = half of button width)
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 150,
  },
  pokeballButtonText: {
    fontSize: 60,
    textAlign: 'center',
  },
  pokeballImage: {
    width: 120,
    height: 120,
  },
  pokeballButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    textShadowColor: '#000',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  pokeballAnimation: {
    position: 'absolute',
    left: width / 2 - 40,
    top: 0,
    zIndex: 200,
  },
  pokeballAnimationImage: {
    width: 80,
    height: 80,
  },
  pokeballEmoji: {
    fontSize: 80,
  },
  // Capture Modal Styles
  captureModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  captureModalContent: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  captureModalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2C2C2C',
  },
  captureModalImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  captureModalText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
});

export default GeolocationScreen;

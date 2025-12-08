import React, {useState, useEffect} from 'react';
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
  Modal,
  Animated,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MapView, {Marker, Circle} from 'react-native-maps';
import PushNotification from 'react-native-push-notification';
import axios from 'axios';

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
}

const GeolocationScreen = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [huntMode, setHuntMode] = useState(false);
  const [nearbyPokemon, setNearbyPokemon] = useState<Pokemon[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [encounterModal, setEncounterModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const scaleAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    requestLocationPermission();
    configurePushNotifications();
  }, []);

  useEffect(() => {
    if (huntMode && location) {
      spawnNearbyPokemon();
      const interval = setInterval(() => {
        spawnNearbyPokemon();
      }, 30000); // Spawn new Pokemon every 30 seconds
      return () => clearInterval(interval);
    }
  }, [huntMode, location]);

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
            const pokemon: Pokemon = {
              id: response.data.id,
              name: response.data.name,
              sprite: response.data.sprites.front_default,
              types: response.data.types.map((t: any) => t.type.name),
              // Spawn within 50m radius (much closer!)
              latitude: location.latitude + (Math.random() - 0.5) * 0.0009,
              longitude: location.longitude + (Math.random() - 0.5) * 0.0009,
              biome: biome,
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

  const encounterPokemon = (pokemon: Pokemon) => {
    setSelectedPokemon(pokemon);
    setEncounterModal(true);

    // Animate Pokemon appearance
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const closeEncounter = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setEncounterModal(false);
      setSelectedPokemon(null);
    });
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
      {/* Encounter Modal */}
      <Modal visible={encounterModal} transparent animationType="fade">
        <View style={styles.encounterOverlay}>
          <Animated.View style={[styles.encounterCard, {transform: [{scale: scaleAnim}]}]}>
            {selectedPokemon && (
              <>
                <Text style={styles.encounterTitle}>Wild {selectedPokemon.name} appeared!</Text>
                <Image source={{uri: selectedPokemon.sprite}} style={styles.encounterImage} />
                <View style={styles.encounterTypes}>
                  {selectedPokemon.types.map((type, idx) => (
                    <View key={idx} style={styles.encounterType}>
                      <Text style={styles.encounterTypeText}>{type}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.encounterBiome}>Found in: {selectedPokemon.biome}</Text>
                <TouchableOpacity style={styles.encounterButton} onPress={closeEncounter}>
                  <Text style={styles.encounterButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

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
              onPress={() => encounterPokemon(pokemon)}>
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
  encounterButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  encounterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GeolocationScreen;

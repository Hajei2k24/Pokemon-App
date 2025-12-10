// src/screens/HuntModeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { requestLocationPermission } from '../utils/permissions';

interface SpawnedPokemon {
  id: number;
  name: string;
  image: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

interface HuntModeScreenProps {
  navigation: any;
}

const HuntModeScreen: React.FC<HuntModeScreenProps> = ({ navigation }) => {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [spawnedPokemon, setSpawnedPokemon] = useState<SpawnedPokemon[]>([]);
  const [huntMode, setHuntMode] = useState(false);

  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Location permission is needed to hunt Pokémon',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    getCurrentLocation();
  };

  const getCurrentLocation = () => {
    console.log('🔍 Attempting to get location...');
    
    Geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Location found:', position.coords);
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setLoading(false);
        spawnNearbyPokemon(latitude, longitude);
      },
      (error) => {
        console.error('❌ Location error:', error);
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        
        // Always use demo location on error
        Alert.alert(
          'Location Unavailable',
          'Using demo location. Enable GPS and restart for real location.',
          [{ text: 'OK' }]
        );
        
        // Demo location: Cebu City, Philippines (your location!)
        const demoLocation = { latitude: 10.3157, longitude: 123.8854 };
        setUserLocation(demoLocation);
        setLoading(false);
        spawnNearbyPokemon(demoLocation.latitude, demoLocation.longitude);
      },
      { 
        enableHighAccuracy: false, // Use network location (faster)
        timeout: 10000, // 10 seconds
        maximumAge: 60000 // Accept cached location up to 1 minute old
      }
    );
  };

  const spawnNearbyPokemon = (lat: number, lon: number) => {
    // Spawn 5 random Pokémon within 500m radius
    const spawned: SpawnedPokemon[] = [];
    const radius = 0.005; // ~500m in degrees

    for (let i = 0; i < 5; i++) {
      const randomLat = lat + (Math.random() - 0.5) * radius;
      const randomLon = lon + (Math.random() - 0.5) * radius;
      const randomId = Math.floor(Math.random() * 150) + 1; // Gen 1 Pokémon

      spawned.push({
        id: randomId,
        name: `pokemon-${randomId}`,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${randomId}.png`,
        latitude: randomLat,
        longitude: randomLon,
      });
    }

    setSpawnedPokemon(spawned);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const handlePokemonTap = (pokemon: SpawnedPokemon) => {
    if (!userLocation) return;

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      pokemon.latitude,
      pokemon.longitude
    );

    if (distance <= 50) { // Within 50 meters
      Alert.alert(
        'Pokémon Found! 🎉',
        `You discovered a Pokémon! (ID: ${pokemon.id})`,
        [
          {
            text: 'View Details',
            onPress: () => {
              navigation.navigate('PokemonDetail', {
                pokemon: {
                  id: pokemon.id,
                  name: pokemon.name,
                  image: pokemon.image,
                  types: [],
                }
              });
            }
          },
          { text: 'Continue Hunting', style: 'cancel' }
        ]
      );

      // Remove caught Pokémon
      setSpawnedPokemon(prev => prev.filter(p => p.id !== pokemon.id));
    } else {
      Alert.alert(
        'Too Far! 📍',
        `This Pokémon is ${Math.round(distance)}m away. Get closer to catch it!`
      );
    }
  };

  const toggleHuntMode = () => {
    setHuntMode(!huntMode);
    if (!huntMode && userLocation) {
      spawnNearbyPokemon(userLocation.latitude, userLocation.longitude);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to get location</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeLocation}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {/* User location circle */}
        <Circle
          center={userLocation}
          radius={50}
          fillColor="rgba(59, 76, 202, 0.2)"
          strokeColor="rgba(59, 76, 202, 0.8)"
          strokeWidth={2}
        />

        {/* Spawned Pokémon markers */}
        {huntMode && spawnedPokemon.map((pokemon) => (
          <Marker
            key={pokemon.id}
            coordinate={{
              latitude: pokemon.latitude,
              longitude: pokemon.longitude,
            }}
            onPress={() => handlePokemonTap(pokemon)}
          >
            <View style={styles.markerContainer}>
              <Image
                source={{ uri: pokemon.image }}
                style={styles.pokemonMarker}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* UI Overlay */}
      <View style={styles.overlay}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🗺️ Hunt Mode</Text>
          <Text style={styles.infoText}>
            {huntMode 
              ? `${spawnedPokemon.length} Pokémon nearby!`
              : 'Tap "Start Hunting" to find Pokémon'
            }
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.huntButton, huntMode && styles.huntButtonActive]}
          onPress={toggleHuntMode}
        >
          <Text style={styles.huntButtonText}>
            {huntMode ? '🔴 Stop Hunting' : '▶️ Start Hunting'}
          </Text>
        </TouchableOpacity>

        {huntMode && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsText}>
              💡 Tap on Pokémon markers to catch them!
            </Text>
            <Text style={styles.instructionsText}>
              📍 Get within 50m to catch
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default HuntModeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  huntButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  huntButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  huntButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionsCard: {
    backgroundColor: 'rgba(255, 222, 0, 0.95)',
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
  },
  instructionsText: {
    fontSize: 14,
    color: '#2C2C2C',
    marginVertical: 3,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pokemonMarker: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
});
// src/navigation/MyStack.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Import your screens
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import PokedexScreen from '../screens/PokedexScreen';
import PokemonDetailScreen from '../screens/PokemonDetailScreen';
import ARCameraScreen from '../screens/ARCameraScreen';
import GeolocationScreen from '../screens/GeolocationScreen';
import ARHuntModeScreen from '../screens/ARHuntModeScreen';
import GalleryScreen from '../screens/GalleryScreen';

// Define navigation types
export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  Pokedex: undefined;
  PokemonDetail: {
    pokemon: {
      id: number;
      name: string;
      image: string;
      types: string[];
    };
  };
  Camera: undefined;
  Geolocation: undefined;
  ARHuntMode: undefined;
  Gallery: undefined;
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type PokedexScreenProps = NativeStackScreenProps<RootStackParamList, 'Pokedex'>;
export type PokemonDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'PokemonDetail'>;
export type CameraScreenProps = NativeStackScreenProps<RootStackParamList, 'Camera'>;
export type GeolocationScreenProps = NativeStackScreenProps<RootStackParamList, 'Geolocation'>;
export type ARHuntModeScreenProps = NativeStackScreenProps<RootStackParamList, 'ARHuntMode'>;
export type GalleryScreenProps = NativeStackScreenProps<RootStackParamList, 'Gallery'>;

const Stack = createStackNavigator<RootStackParamList>();

const MyStack: React.FC = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      
      <Stack.Screen 
        name="Pokedex" 
        component={PokedexScreen}
        options={{
          headerShown: true,
          headerTitle: 'Pokédex',
          headerStyle: {
            backgroundColor: '#FF6B6B',
          },
          headerTintColor: '#FFDE00',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
          },
        }}
      />
      <Stack.Screen
        name="PokemonDetail"
        component={PokemonDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Pokémon Details',
          headerStyle: {
            backgroundColor: '#3B4CCA',
          },
          headerTintColor: '#FFDE00',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
          },
        }}
      />
      <Stack.Screen
        name="Camera"
        component={ARCameraScreen}
        options={{
          headerShown: true,
          headerTitle: 'AR Pokémon Capture',
          headerStyle: {
            backgroundColor: '#34C759',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
          },
        }}
      />
      <Stack.Screen
        name="Geolocation"
        component={GeolocationScreen}
        options={{
          headerShown: true,
          headerTitle: 'Geolocation',
          headerStyle: {
            backgroundColor: '#FF9500',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
          },
        }}
      />
      <Stack.Screen
        name="ARHuntMode"
        component={ARHuntModeScreen}
        options={{
          headerShown: true,
          headerTitle: 'AR Hunt Mode',
          headerStyle: {
            backgroundColor: '#FF3B30',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
          },
        }}
      />
      <Stack.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          headerShown: true,
          headerTitle: 'My Gallery',
          headerStyle: {
            backgroundColor: '#FF6B6B',
          },
          headerTintColor: '#FFDE00',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
          },
        }}
      />
    </Stack.Navigator>
  );
};

export default MyStack;
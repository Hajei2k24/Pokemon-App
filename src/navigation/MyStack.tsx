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
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type PokedexScreenProps = NativeStackScreenProps<RootStackParamList, 'Pokedex'>;
export type PokemonDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'PokemonDetail'>;

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
    </Stack.Navigator>
  );
};

export default MyStack;
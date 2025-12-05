// src/components/TypeFilter.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface TypeFilterProps {
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
}

const POKEMON_TYPES = [
  'all',
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'dragon',
  'dark',
  'fairy',
  'normal',
  'fighting',
  'flying',
  'poison',
  'ground',
  'rock',
  'bug',
  'ghost',
  'steel',
];

const TypeFilter: React.FC<TypeFilterProps> = ({ selectedType, onSelectType }) => {
  const getTypeColor = (type: string): string => {
    if (type === 'all') return '#2C2C2C';
    
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

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {POKEMON_TYPES.map((type) => {
          const isSelected = selectedType === type || (selectedType === null && type === 'all');
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                { 
                  backgroundColor: isSelected ? getTypeColor(type) : '#F5F5F5',
                  borderColor: getTypeColor(type),
                  borderWidth: isSelected ? 0 : 1,
                }
              ]}
              onPress={() => onSelectType(type === 'all' ? null : type)}
            >
              <Text 
                style={[
                  styles.typeText,
                  { color: isSelected ? 'white' : getTypeColor(type) }
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default TypeFilter;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 15,
    gap: 10,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
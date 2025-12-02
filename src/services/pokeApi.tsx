// src/services/pokeApi.ts
import axios from 'axios';

const BASE_URL = 'https://pokeapi.co/api/v2';

// Type Definitions
export interface PokemonListItem {
  id: number;
  name: string;
  image: string;
  types: string[];
}

export interface PokemonListResponse {
  count: number;
  results: PokemonListItem[];
}

export interface PokemonAbility {
  name: string;
  isHidden: boolean;
}

export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonSprites {
  front_default: string;
  front_shiny: string;
  official_artwork: string;
  animated?: string;
}

export interface PokemonDetails {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  abilities: PokemonAbility[];
  stats: PokemonStat[];
  sprites: PokemonSprites;
  moves: string[];
}

export interface PokemonSpecies {
  description: string;
  evolutionChainUrl: string;
  generation: string;
  habitat: string;
  isLegendary: boolean;
  isMythical: boolean;
}

export interface EvolutionChainItem {
  name: string;
  id: number;
}

/**
 * Get a paginated list of Pokémon
 */
export const getAllPokemon = async (
  limit: number = 20,
  offset: number = 0
): Promise<PokemonListResponse> => {
  try {
    const response = await axios.get(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
    
    // Fetch detailed info for each Pokémon in the list
    const pokemonPromises = response.data.results.map(async (pokemon: any) => {
      const details = await axios.get(pokemon.url);
      return {
        id: details.data.id,
        name: details.data.name,
        image: details.data.sprites.other['official-artwork'].front_default || details.data.sprites.front_default,
        types: details.data.types.map((type: any) => type.type.name),
      };
    });

    const pokemonList = await Promise.all(pokemonPromises);
    
    return {
      count: response.data.count,
      results: pokemonList,
    };
  } catch (error) {
    console.error('Error fetching Pokémon list:', error);
    throw error;
  }
};

/**
 * Get detailed information about a specific Pokémon
 */
export const getPokemonDetails = async (nameOrId: string | number): Promise<PokemonDetails> => {
  try {
    const response = await axios.get(`${BASE_URL}/pokemon/${nameOrId}`);
    const pokemon = response.data;

    return {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      types: pokemon.types.map((type: any) => type.type.name),
      abilities: pokemon.abilities.map((ability: any) => ({
        name: ability.ability.name,
        isHidden: ability.is_hidden,
      })),
      stats: pokemon.stats.map((stat: any) => ({
        name: stat.stat.name,
        value: stat.base_stat,
      })),
      sprites: {
        front_default: pokemon.sprites.front_default,
        front_shiny: pokemon.sprites.front_shiny,
        official_artwork: pokemon.sprites.other['official-artwork'].front_default,
        animated: pokemon.sprites.versions['generation-v']['black-white'].animated?.front_default,
      },
      moves: pokemon.moves.slice(0, 10).map((move: any) => move.move.name),
    };
  } catch (error) {
    console.error('Error fetching Pokémon details:', error);
    throw error;
  }
};

/**
 * Get Pokémon species data (includes flavor text/description)
 */
export const getPokemonSpecies = async (id: number): Promise<PokemonSpecies> => {
  try {
    const response = await axios.get(`${BASE_URL}/pokemon-species/${id}`);
    const species = response.data;

    // Get English flavor text
    const flavorText = species.flavor_text_entries
      .find((entry: any) => entry.language.name === 'en')?.flavor_text
      .replace(/\f/g, ' ') || 'No description available.';

    return {
      description: flavorText,
      evolutionChainUrl: species.evolution_chain.url,
      generation: species.generation.name,
      habitat: species.habitat?.name || 'Unknown',
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
    };
  } catch (error) {
    console.error('Error fetching Pokémon species:', error);
    throw error;
  }
};

/**
 * Get evolution chain for a Pokémon
 */
export const getEvolutionChain = async (evolutionChainUrl: string): Promise<EvolutionChainItem[]> => {
  try {
    const response = await axios.get(evolutionChainUrl);
    const chain = response.data.chain;

    const evolutionChain: EvolutionChainItem[] = [];
    let current = chain;

    // Traverse the evolution chain
    while (current) {
      const speciesId = current.species.url.split('/').slice(-2, -1)[0];
      evolutionChain.push({
        name: current.species.name,
        id: parseInt(speciesId),
      });
      current = current.evolves_to[0];
    }

    return evolutionChain;
  } catch (error) {
    console.error('Error fetching evolution chain:', error);
    throw error;
  }
};

/**
 * Get all Pokémon of a specific type
 */
export const getPokemonByType = async (type: string): Promise<PokemonListItem[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/type/${type.toLowerCase()}`);
    
    // Get first 20 Pokémon of this type
    const pokemonList = response.data.pokemon.slice(0, 20).map((item: any) => ({
      name: item.pokemon.name,
      url: item.pokemon.url,
    }));

    // Fetch details for each
    const detailsPromises = pokemonList.map(async (pokemon: any) => {
      const details = await axios.get(pokemon.url);
      return {
        id: details.data.id,
        name: details.data.name,
        image: details.data.sprites.other['official-artwork'].front_default || details.data.sprites.front_default,
        types: details.data.types.map((type: any) => type.type.name),
      };
    });

    return await Promise.all(detailsPromises);
  } catch (error) {
    console.error('Error fetching Pokémon by type:', error);
    throw error;
  }
};

/**
 * Search Pokémon by name
 */
export const searchPokemonByName = async (searchTerm: string): Promise<PokemonListItem> => {
  try {
    const response = await axios.get(`${BASE_URL}/pokemon/${searchTerm.toLowerCase()}`);
    const pokemon = response.data;

    return {
      id: pokemon.id,
      name: pokemon.name,
      image: pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default,
      types: pokemon.types.map((type: any) => type.type.name),
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Pokémon not found');
    }
    console.error('Error searching Pokémon:', error);
    throw error;
  }
};

/**
 * Get all available types
 */
export const getAllTypes = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/type`);
    return response.data.results
      .filter((type: any) => !['unknown', 'shadow'].includes(type.name))
      .map((type: any) => type.name);
  } catch (error) {
    console.error('Error fetching types:', error);
    throw error;
  }
};
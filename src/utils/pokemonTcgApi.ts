// Pokemon TCG API Service
// We use the SDK types for safety, but implement the fetch manually 
// because the SDK uses Axios hardcoded to the external URL (causing CORS),
// and does not support our Vite Proxy settings easily in the browser.

import { PokemonTCG } from 'pokemon-tcg-sdk-typescript';

// Types
export type PokemonSet = PokemonTCG.Set;
export type PokemonCard = PokemonTCG.Card;

// Proxy Base URL (configured in vite.config.ts)
// Maps /api-pokemon -> https://api.pokemontcg.io/v2
const BASE_URL = '/api-pokemon';

interface ApiResponse<T> {
    data: T;
}

// Fetch all sets
export async function fetchSets(): Promise<PokemonSet[]> {
    try {
        const response = await fetch(`${BASE_URL}/sets?orderBy=-releaseDate&pageSize=250`);
        const json: ApiResponse<PokemonSet[]> = await response.json();
        return json.data;
    } catch (error) {
        console.error('Error fetching sets:', error);
        return [];
    }
}

// Fetch cards from a specific set
export async function fetchCardsBySet(setId: string): Promise<PokemonCard[]> {
    try {
        const response = await fetch(`${BASE_URL}/cards?q=set.id:${setId}&pageSize=250`);
        const json: ApiResponse<PokemonCard[]> = await response.json();
        return json.data;
    } catch (error) {
        console.error('Error fetching cards:', error);
        return [];
    }
}

// Fetch a single card by ID
export async function fetchCardById(cardId: string): Promise<PokemonCard | null> {
    try {
        const response = await fetch(`${BASE_URL}/cards/${cardId}`);
        const json: ApiResponse<PokemonCard> = await response.json();
        return json.data;
    } catch (error) {
        console.error('Error fetching card:', error);
        return null;
    }
}

// Search cards
export async function searchCards(query: string): Promise<PokemonCard[]> {
    try {
        const response = await fetch(`${BASE_URL}/cards?q=name:${query}*&pageSize=20`);
        const json: ApiResponse<PokemonCard[]> = await response.json();
        return json.data;
    } catch (error) {
        console.error('Error searching cards:', error);
        return [];
    }
}

// Get random popular Pokemon cards for initial display
export async function getRandomCards(count: number = 10): Promise<PokemonCard[]> {
    try {
        const queries = [
            'rarity:rare',
            'rarity:"ultra rare"',
            'rarity:holo',
            'supertype:pokemon',
        ];

        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        const randomPage = Math.floor(Math.random() * 10) + 1;

        const response = await fetch(`${BASE_URL}/cards?q=${randomQuery}&page=${randomPage}&pageSize=${count}`);
        const json: ApiResponse<PokemonCard[]> = await response.json();
        return json.data;
    } catch (error) {
        console.error('Error fetching random cards:', error);
        return [];
    }
}

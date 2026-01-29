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

// Hardcoded fallback data
const FALLBACK_SETS: PokemonSet[] = [
    {
        id: 'sv1',
        name: 'Scarlet & Violet',
        series: 'Scarlet & Violet',
        printedTotal: 198,
        total: 252,
        releaseDate: '2023/03/31',
        images: {
            symbol: 'https://images.pokemontcg.io/sv1/symbol.png',
            logo: 'https://images.pokemontcg.io/sv1/logo.png',
        },
    } as PokemonSet,
    {
        id: 'sv2',
        name: 'Paldea Evolved',
        series: 'Scarlet & Violet',
        printedTotal: 193,
        total: 261,
        releaseDate: '2023/06/09',
        images: {
            symbol: 'https://images.pokemontcg.io/sv2/symbol.png',
            logo: 'https://images.pokemontcg.io/sv2/logo.png',
        },
    } as PokemonSet,
    {
        id: 'sv3',
        name: 'Obsidian Flames',
        series: 'Scarlet & Violet',
        printedTotal: 197,
        total: 230,
        releaseDate: '2023/08/11',
        images: {
            symbol: 'https://images.pokemontcg.io/sv3/symbol.png',
            logo: 'https://images.pokemontcg.io/sv3/logo.png',
        },
    } as PokemonSet,
    {
        id: 'sv4',
        name: 'Paradox Rift',
        series: 'Scarlet & Violet',
        printedTotal: 182,
        total: 266,
        releaseDate: '2023/11/03',
        images: {
            symbol: 'https://images.pokemontcg.io/sv4/symbol.png',
            logo: 'https://images.pokemontcg.io/sv4/logo.png',
        },
    } as PokemonSet,
    {
        id: 'swsh12',
        name: 'Silver Tempest',
        series: 'Sword & Shield',
        printedTotal: 195,
        total: 245,
        releaseDate: '2022/11/11',
        images: {
            symbol: 'https://images.pokemontcg.io/swsh12/symbol.png',
            logo: 'https://images.pokemontcg.io/swsh12/logo.png',
        },
    } as PokemonSet,
    {
        id: 'swsh11',
        name: 'Lost Origin',
        series: 'Sword & Shield',
        printedTotal: 196,
        total: 247,
        releaseDate: '2022/09/09',
        images: {
            symbol: 'https://images.pokemontcg.io/swsh11/symbol.png',
            logo: 'https://images.pokemontcg.io/swsh11/logo.png',
        },
    } as PokemonSet,
    {
        id: 'swsh10',
        name: 'Astral Radiance',
        series: 'Sword & Shield',
        printedTotal: 189,
        total: 216,
        releaseDate: '2022/05/27',
        images: {
            symbol: 'https://images.pokemontcg.io/swsh10/symbol.png',
            logo: 'https://images.pokemontcg.io/swsh10/logo.png',
        },
    } as PokemonSet,
    {
        id: 'swsh9',
        name: 'Brilliant Stars',
        series: 'Sword & Shield',
        printedTotal: 172,
        total: 216,
        releaseDate: '2022/02/25',
        images: {
            symbol: 'https://images.pokemontcg.io/swsh9/symbol.png',
            logo: 'https://images.pokemontcg.io/swsh9/logo.png',
        },
    } as PokemonSet,
    {
        id: 'swsh8',
        name: 'Fusion Strike',
        series: 'Sword & Shield',
        printedTotal: 264,
        total: 284,
        releaseDate: '2021/11/12',
        images: {
            symbol: 'https://images.pokemontcg.io/swsh8/symbol.png',
            logo: 'https://images.pokemontcg.io/swsh8/logo.png',
        },
    } as PokemonSet,
    {
        id: 'swsh7',
        name: 'Evolving Skies',
        series: 'Sword & Shield',
        printedTotal: 203,
        total: 237,
        releaseDate: '2021/08/27',
        images: {
            symbol: 'https://images.pokemontcg.io/swsh7/symbol.png',
            logo: 'https://images.pokemontcg.io/swsh7/logo.png',
        },
    } as PokemonSet,
];

// Fetch all sets
export async function fetchSets(): Promise<PokemonSet[]> {
    try {
        const response = await fetch(`${BASE_URL}/sets?orderBy=-releaseDate&pageSize=250`);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const json: ApiResponse<PokemonSet[]> = await response.json();
        return json.data;
    } catch (error) {
        console.error('Error fetching sets, using fallback data:', error);
        return FALLBACK_SETS;
    }
}

// Fetch cards from a specific set
export async function fetchCardsBySet(setId: string): Promise<PokemonCard[]> {
    try {
        const response = await fetch(`${BASE_URL}/cards?q=set.id:${setId}&pageSize=250`);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const json: ApiResponse<PokemonCard[]> = await response.json();
        return json.data;
    } catch (error) {
        console.error('Error fetching cards, returning empty array:', error);
        return [];
    }
}

// Fetch a single card by ID
export async function fetchCardById(cardId: string): Promise<PokemonCard | null> {
    try {
        const response = await fetch(`${BASE_URL}/cards/${cardId}`);
        if (!response.ok) {
            throw new Error('API request failed');
        }
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
        if (!response.ok) {
            throw new Error('API request failed');
        }
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
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const json: ApiResponse<PokemonCard[]> = await response.json();
        return json.data;
    } catch (error) {
        console.error('Error fetching random cards:', error);
        return [];
    }
}

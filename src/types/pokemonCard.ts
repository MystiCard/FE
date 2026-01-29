// Pokemon TCG API Type Definitions

export interface CardImages {
    small: string;
    large: string;
}

export interface CardSet {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: {
        unlimited?: string;
        standard?: string;
        expanded?: string;
    };
    releaseDate: string;
    updatedAt: string;
    images: {
        symbol: string;
        logo: string;
    };
}

export interface TCGPlayerPrices {
    holofoil?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow: number | null;
    };
    reverseHolofoil?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow: number | null;
    };
    normal?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow: number | null;
    };
}

export interface TCGPlayer {
    url: string;
    updatedAt: string;
    prices?: TCGPlayerPrices;
}

export interface Attack {
    name: string;
    cost: string[];
    convertedEnergyCost: number;
    damage: string;
    text: string;
}

export interface Ability {
    name: string;
    text: string;
    type: string;
}

export interface PokemonCard {
    id: string;
    name: string;
    supertype: string;
    subtypes?: string[];
    level?: string;
    hp?: string;
    types?: string[];
    evolvesFrom?: string;
    evolvesTo?: string[];
    rules?: string[];
    abilities?: Ability[];
    attacks?: Attack[];
    weaknesses?: Array<{
        type: string;
        value: string;
    }>;
    resistances?: Array<{
        type: string;
        value: string;
    }>;
    retreatCost?: string[];
    convertedRetreatCost?: number;
    set: CardSet;
    number: string;
    artist?: string;
    rarity?: string;
    flavorText?: string;
    nationalPokedexNumbers?: number[];
    legalities?: {
        unlimited?: string;
        standard?: string;
        expanded?: string;
    };
    regulationMark?: string;
    images: CardImages;
    tcgplayer?: TCGPlayer;
    cardmarket?: {
        url: string;
        updatedAt: string;
        prices?: {
            averageSellPrice: number;
            lowPrice: number;
            trendPrice: number;
            germanProLow: number;
            suggestedPrice: number;
            reverseHoloSell: number;
            reverseHoloLow: number;
            reverseHoloTrend: number;
            lowPriceExPlus: number;
            avg1: number;
            avg7: number;
            avg30: number;
            reverseHoloAvg1: number;
            reverseHoloAvg7: number;
            reverseHoloAvg30: number;
        };
    };
}

export interface PokemonCardApiResponse {
    data: PokemonCard[];
    page: number;
    pageSize: number;
    count: number;
    totalCount: number;
}

export interface SingleCardApiResponse {
    data: PokemonCard;
}

// Extended interface for portfolio cards (user's collection)
export interface PortfolioCard extends PokemonCard {
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    change: string;
    dateAdded?: string;
}

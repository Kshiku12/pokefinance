// Pokemon ↔ App Category mapping and game mechanics configuration

export interface PokemonConfig {
  id: number;          // Pokedex ID
  name: string;
  displayName: string;
  type: string;
  growthRate: 'fast' | 'medium-fast' | 'medium-slow' | 'slow';
  evolutions: {
    stage: number;
    name: string;
    pokedexId: number;
    minLevel: number;
    spriteUrl: string;
  }[];
  spriteUrl: string;
  color: string;       // Theme color for the category
}

export interface AppCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;        // Emoji
  color: string;
  gradientFrom: string;
  gradientTo: string;
  apps: string[];
  pokemon: PokemonConfig;
}

// Experience calculation using Pokemon Medium Fast growth rate: EXP = n³
export function getExpForLevel(level: number): number {
  return Math.pow(level, 3);
}

// Get level from total EXP
export function getLevelFromExp(totalExp: number): number {
  return Math.floor(Math.cbrt(totalExp));
}

// Get EXP progress within current level (0-1)
export function getLevelProgress(totalExp: number): number {
  const currentLevel = getLevelFromExp(totalExp);
  const currentLevelExp = getExpForLevel(currentLevel);
  const nextLevelExp = getExpForLevel(currentLevel + 1);
  return (totalExp - currentLevelExp) / (nextLevelExp - currentLevelExp);
}

// Convert spending amount (₹) to EXP points
export function amountToExp(amount: number): number {
  // Base conversion: ₹1 = 1 XP with logarithmic bonus for larger amounts
  const baseExp = amount;
  const bonus = Math.floor(Math.log10(Math.max(amount, 1)) * 50);
  return Math.max(Math.floor(baseExp + bonus), 1);
}

// Sprite URL helper from PokeAPI
function sprite(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// All app categories with their Pokemon
export const APP_CATEGORIES: AppCategory[] = [
  {
    id: 'food-delivery',
    name: 'Food Delivery',
    slug: 'food-delivery',
    icon: '🍔',
    color: '#FF6B35',
    gradientFrom: '#FF6B35',
    gradientTo: '#FF4500',
    apps: ['Zomato', 'Swiggy', 'Uber Eats', 'DoorDash'],
    pokemon: {
      id: 4,
      name: 'charmander',
      displayName: 'Charmander',
      type: 'fire',
      growthRate: 'medium-slow',
      spriteUrl: sprite(4),
      color: '#F08030',
      evolutions: [
        { stage: 1, name: 'Charmander', pokedexId: 4, minLevel: 1, spriteUrl: sprite(4) },
        { stage: 2, name: 'Charmeleon', pokedexId: 5, minLevel: 16, spriteUrl: sprite(5) },
        { stage: 3, name: 'Charizard', pokedexId: 6, minLevel: 36, spriteUrl: sprite(6) },
      ],
    },
  },
  {
    id: 'grocery',
    name: 'Grocery',
    slug: 'grocery',
    icon: '🛒',
    color: '#78C850',
    gradientFrom: '#78C850',
    gradientTo: '#4E8234',
    apps: ['Blinkit', 'Swiggy Instamart', 'BigBasket', 'JioMart', 'Zepto'],
    pokemon: {
      id: 1,
      name: 'bulbasaur',
      displayName: 'Bulbasaur',
      type: 'grass',
      growthRate: 'medium-slow',
      spriteUrl: sprite(1),
      color: '#78C850',
      evolutions: [
        { stage: 1, name: 'Bulbasaur', pokedexId: 1, minLevel: 1, spriteUrl: sprite(1) },
        { stage: 2, name: 'Ivysaur', pokedexId: 2, minLevel: 16, spriteUrl: sprite(2) },
        { stage: 3, name: 'Venusaur', pokedexId: 3, minLevel: 32, spriteUrl: sprite(3) },
      ],
    },
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    slug: 'ecommerce',
    icon: '📦',
    color: '#6890F0',
    gradientFrom: '#6890F0',
    gradientTo: '#4A6DB5',
    apps: ['Amazon', 'Flipkart', 'Meesho', 'Snapdeal'],
    pokemon: {
      id: 7,
      name: 'squirtle',
      displayName: 'Squirtle',
      type: 'water',
      growthRate: 'medium-slow',
      spriteUrl: sprite(7),
      color: '#6890F0',
      evolutions: [
        { stage: 1, name: 'Squirtle', pokedexId: 7, minLevel: 1, spriteUrl: sprite(7) },
        { stage: 2, name: 'Wartortle', pokedexId: 8, minLevel: 16, spriteUrl: sprite(8) },
        { stage: 3, name: 'Blastoise', pokedexId: 9, minLevel: 36, spriteUrl: sprite(9) },
      ],
    },
  },
  {
    id: 'upi-payments',
    name: 'UPI / Payments',
    slug: 'upi-payments',
    icon: '💳',
    color: '#F8D030',
    gradientFrom: '#F8D030',
    gradientTo: '#C8A008',
    apps: ['Google Pay', 'Paytm', 'PhonePe', 'CRED', 'Amazon Pay'],
    pokemon: {
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
      type: 'electric',
      growthRate: 'medium-fast',
      spriteUrl: sprite(25),
      color: '#F8D030',
      evolutions: [
        { stage: 1, name: 'Pichu', pokedexId: 172, minLevel: 1, spriteUrl: sprite(172) },
        { stage: 2, name: 'Pikachu', pokedexId: 25, minLevel: 10, spriteUrl: sprite(25) },
        { stage: 3, name: 'Raichu', pokedexId: 26, minLevel: 22, spriteUrl: sprite(26) },
      ],
    },
  },
  {
    id: 'clothing',
    name: 'Clothing',
    slug: 'clothing',
    icon: '👕',
    color: '#C183C1',
    gradientFrom: '#C183C1',
    gradientTo: '#9B589B',
    apps: ['Myntra', 'Ajio', 'Bonkers', 'Wtflex', 'Nykaa Fashion'],
    pokemon: {
      id: 133,
      name: 'eevee',
      displayName: 'Eevee',
      type: 'normal',
      growthRate: 'medium-fast',
      spriteUrl: sprite(133),
      color: '#C6B382',
      evolutions: [
        { stage: 1, name: 'Eevee', pokedexId: 133, minLevel: 1, spriteUrl: sprite(133) },
        { stage: 2, name: 'Vaporeon', pokedexId: 134, minLevel: 25, spriteUrl: sprite(134) },
      ],
    },
  },
  {
    id: 'trading-stocks',
    name: 'Trading & Stocks',
    slug: 'trading-stocks',
    icon: '📈',
    color: '#B8A038',
    gradientFrom: '#D4AF37',
    gradientTo: '#B8860B',
    apps: ['Groww', 'Zerodha', 'Angel One', 'Upstox'],
    pokemon: {
      id: 52,
      name: 'meowth',
      displayName: 'Meowth',
      type: 'normal',
      growthRate: 'medium-fast',
      spriteUrl: sprite(52),
      color: '#B8A038',
      evolutions: [
        { stage: 1, name: 'Meowth', pokedexId: 52, minLevel: 1, spriteUrl: sprite(52) },
        { stage: 2, name: 'Persian', pokedexId: 53, minLevel: 28, spriteUrl: sprite(53) },
      ],
    },
  },
  {
    id: 'gaming-entertainment',
    name: 'Gaming & Entertainment',
    slug: 'gaming-entertainment',
    icon: '🎮',
    color: '#705898',
    gradientFrom: '#705898',
    gradientTo: '#4A3870',
    apps: ['Steam', 'Epic Games', 'Netflix', 'Disney+', 'Prime Video'],
    pokemon: {
      id: 92,
      name: 'gastly',
      displayName: 'Gastly',
      type: 'ghost',
      growthRate: 'medium-slow',
      spriteUrl: sprite(92),
      color: '#705898',
      evolutions: [
        { stage: 1, name: 'Gastly', pokedexId: 92, minLevel: 1, spriteUrl: sprite(92) },
        { stage: 2, name: 'Haunter', pokedexId: 93, minLevel: 25, spriteUrl: sprite(93) },
        { stage: 3, name: 'Gengar', pokedexId: 94, minLevel: 40, spriteUrl: sprite(94) },
      ],
    },
  },
  {
    id: 'travel-booking',
    name: 'Travel & Booking',
    slug: 'travel-booking',
    icon: '✈️',
    color: '#A890F0',
    gradientFrom: '#A890F0',
    gradientTo: '#7B68C0',
    apps: ['MakeMyTrip', 'IRCTC', 'Ola', 'Uber', 'Goibibo'],
    pokemon: {
      id: 16,
      name: 'pidgey',
      displayName: 'Pidgey',
      type: 'flying',
      growthRate: 'medium-slow',
      spriteUrl: sprite(16),
      color: '#A890F0',
      evolutions: [
        { stage: 1, name: 'Pidgey', pokedexId: 16, minLevel: 1, spriteUrl: sprite(16) },
        { stage: 2, name: 'Pidgeotto', pokedexId: 17, minLevel: 18, spriteUrl: sprite(17) },
        { stage: 3, name: 'Pidgeot', pokedexId: 18, minLevel: 36, spriteUrl: sprite(18) },
      ],
    },
  },
  {
    id: 'health-pharmacy',
    name: 'Health & Pharmacy',
    slug: 'health-pharmacy',
    icon: '💊',
    color: '#F0A0B0',
    gradientFrom: '#F0A0B0',
    gradientTo: '#D07080',
    apps: ['PharmEasy', 'Practo', '1mg', 'Netmeds'],
    pokemon: {
      id: 113,
      name: 'chansey',
      displayName: 'Chansey',
      type: 'normal',
      growthRate: 'fast',
      spriteUrl: sprite(113),
      color: '#F0A0B0',
      evolutions: [
        { stage: 1, name: 'Happiny', pokedexId: 440, minLevel: 1, spriteUrl: sprite(440) },
        { stage: 2, name: 'Chansey', pokedexId: 113, minLevel: 15, spriteUrl: sprite(113) },
        { stage: 3, name: 'Blissey', pokedexId: 242, minLevel: 30, spriteUrl: sprite(242) },
      ],
    },
  },
  {
    id: 'recharge-bills',
    name: 'Recharge & Bills',
    slug: 'recharge-bills',
    icon: '📱',
    color: '#B8B8D0',
    gradientFrom: '#B8B8D0',
    gradientTo: '#8888A0',
    apps: ['Jio', 'Airtel', 'Vi', 'Electricity', 'Water Bill'],
    pokemon: {
      id: 81,
      name: 'magnemite',
      displayName: 'Magnemite',
      type: 'electric',
      growthRate: 'medium-fast',
      spriteUrl: sprite(81),
      color: '#B8B8D0',
      evolutions: [
        { stage: 1, name: 'Magnemite', pokedexId: 81, minLevel: 1, spriteUrl: sprite(81) },
        { stage: 2, name: 'Magneton', pokedexId: 82, minLevel: 30, spriteUrl: sprite(82) },
        { stage: 3, name: 'Magnezone', pokedexId: 462, minLevel: 45, spriteUrl: sprite(462) },
      ],
    },
  },
  {
    id: 'quick-commerce',
    name: 'Quick Commerce',
    slug: 'quick-commerce',
    icon: '🍕',
    color: '#C09050',
    gradientFrom: '#C09050',
    gradientTo: '#9C6B30',
    apps: ['Zepto', 'Dunzo', 'Swiggy Genie'],
    pokemon: {
      id: 63,
      name: 'abra',
      displayName: 'Abra',
      type: 'psychic',
      growthRate: 'medium-slow',
      spriteUrl: sprite(63),
      color: '#C09050',
      evolutions: [
        { stage: 1, name: 'Abra', pokedexId: 63, minLevel: 1, spriteUrl: sprite(63) },
        { stage: 2, name: 'Kadabra', pokedexId: 64, minLevel: 16, spriteUrl: sprite(64) },
        { stage: 3, name: 'Alakazam', pokedexId: 65, minLevel: 36, spriteUrl: sprite(65) },
      ],
    },
  },
  {
    id: 'education',
    name: 'Education',
    slug: 'education',
    icon: '📚',
    color: '#F85888',
    gradientFrom: '#F85888',
    gradientTo: '#C83868',
    apps: ['Coursera', 'Udemy', 'Unacademy', 'Skillshare'],
    pokemon: {
      id: 79,
      name: 'slowpoke',
      displayName: 'Slowpoke',
      type: 'psychic',
      growthRate: 'medium-fast',
      spriteUrl: sprite(79),
      color: '#F85888',
      evolutions: [
        { stage: 1, name: 'Slowpoke', pokedexId: 79, minLevel: 1, spriteUrl: sprite(79) },
        { stage: 2, name: 'Slowbro', pokedexId: 80, minLevel: 37, spriteUrl: sprite(80) },
      ],
    },
  },
  {
    id: 'web-purchases',
    name: 'Web Purchases',
    slug: 'web-purchases',
    icon: '🌐',
    color: '#F05868',
    gradientFrom: '#E85880',
    gradientTo: '#C03860',
    apps: ['Direct Website Orders', 'Custom URL'],
    pokemon: {
      id: 137,
      name: 'porygon',
      displayName: 'Porygon',
      type: 'normal',
      growthRate: 'medium-fast',
      spriteUrl: sprite(137),
      color: '#F05868',
      evolutions: [
        { stage: 1, name: 'Porygon', pokedexId: 137, minLevel: 1, spriteUrl: sprite(137) },
        { stage: 2, name: 'Porygon2', pokedexId: 233, minLevel: 25, spriteUrl: sprite(233) },
        { stage: 3, name: 'Porygon-Z', pokedexId: 474, minLevel: 45, spriteUrl: sprite(474) },
      ],
    },
  },
  {
    id: 'rent-housing',
    name: 'Rent & Housing',
    slug: 'rent-housing',
    icon: '🏠',
    color: '#445566',
    gradientFrom: '#556677',
    gradientTo: '#334455',
    apps: ['NoBroker', 'Housing.com', 'MagicBricks', 'Rent'],
    pokemon: {
      id: 143,
      name: 'snorlax',
      displayName: 'Snorlax',
      type: 'normal',
      growthRate: 'slow',
      spriteUrl: sprite(143),
      color: '#445566',
      evolutions: [
        { stage: 1, name: 'Munchlax', pokedexId: 446, minLevel: 1, spriteUrl: sprite(446) },
        { stage: 2, name: 'Snorlax', pokedexId: 143, minLevel: 20, spriteUrl: sprite(143) },
      ],
    },
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    slug: 'subscriptions',
    icon: '💸',
    color: '#A890F0',
    gradientFrom: '#B8A0FF',
    gradientTo: '#8878D0',
    apps: ['Spotify', 'YouTube Premium', 'Hotstar', 'iCloud'],
    pokemon: {
      id: 132,
      name: 'ditto',
      displayName: 'Ditto',
      type: 'normal',
      growthRate: 'medium-fast',
      spriteUrl: sprite(132),
      color: '#A890F0',
      evolutions: [
        { stage: 1, name: 'Ditto', pokedexId: 132, minLevel: 1, spriteUrl: sprite(132) },
      ],
    },
  },
  {
    id: 'cafe-dining',
    name: 'Cafe & Dining',
    slug: 'cafe-dining',
    icon: '☕',
    color: '#A0522D',
    gradientFrom: '#B8662D',
    gradientTo: '#8B4513',
    apps: ['Starbucks', 'Dominos', 'Pizza Hut', 'KFC'],
    pokemon: {
      id: 446,
      name: 'munchlax',
      displayName: 'Munchlax',
      type: 'normal',
      growthRate: 'slow',
      spriteUrl: sprite(446),
      color: '#A0522D',
      evolutions: [
        { stage: 1, name: 'Munchlax', pokedexId: 446, minLevel: 1, spriteUrl: sprite(446) },
        { stage: 2, name: 'Snorlax', pokedexId: 143, minLevel: 20, spriteUrl: sprite(143) },
      ],
    },
  },
  {
    id: 'gifting',
    name: 'Gifting',
    slug: 'gifting',
    icon: '🎁',
    color: '#F0C0D0',
    gradientFrom: '#F0C0D0',
    gradientTo: '#D0A0B0',
    apps: ['Ferns N Petals', 'IGP', 'FlowerAura'],
    pokemon: {
      id: 175,
      name: 'togepi',
      displayName: 'Togepi',
      type: 'fairy',
      growthRate: 'fast',
      spriteUrl: sprite(175),
      color: '#F0C0D0',
      evolutions: [
        { stage: 1, name: 'Togepi', pokedexId: 175, minLevel: 1, spriteUrl: sprite(175) },
        { stage: 2, name: 'Togetic', pokedexId: 176, minLevel: 20, spriteUrl: sprite(176) },
        { stage: 3, name: 'Togekiss', pokedexId: 468, minLevel: 40, spriteUrl: sprite(468) },
      ],
    },
  },
  {
    id: 'investments-mf',
    name: 'Investments & MF',
    slug: 'investments-mf',
    icon: '💰',
    color: '#58A060',
    gradientFrom: '#58A060',
    gradientTo: '#3C7040',
    apps: ['Groww MF', 'Coin by Zerodha', 'Kuvera', 'ET Money'],
    pokemon: {
      id: 246,
      name: 'larvitar',
      displayName: 'Larvitar',
      type: 'rock',
      growthRate: 'slow',
      spriteUrl: sprite(246),
      color: '#58A060',
      evolutions: [
        { stage: 1, name: 'Larvitar', pokedexId: 246, minLevel: 1, spriteUrl: sprite(246) },
        { stage: 2, name: 'Pupitar', pokedexId: 247, minLevel: 30, spriteUrl: sprite(247) },
        { stage: 3, name: 'Tyranitar', pokedexId: 248, minLevel: 55, spriteUrl: sprite(248) },
      ],
    },
  },
];

// Pokemon type colors for UI theming
export const TYPE_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  fire:     { bg: '#F08030', text: '#FFFFFF', glow: 'rgba(240, 128, 48, 0.5)' },
  water:    { bg: '#6890F0', text: '#FFFFFF', glow: 'rgba(104, 144, 240, 0.5)' },
  grass:    { bg: '#78C850', text: '#FFFFFF', glow: 'rgba(120, 200, 80, 0.5)' },
  electric: { bg: '#F8D030', text: '#1A1A2E', glow: 'rgba(248, 208, 48, 0.5)' },
  psychic:  { bg: '#F85888', text: '#FFFFFF', glow: 'rgba(248, 88, 136, 0.5)' },
  ghost:    { bg: '#705898', text: '#FFFFFF', glow: 'rgba(112, 88, 152, 0.5)' },
  normal:   { bg: '#A8A878', text: '#FFFFFF', glow: 'rgba(168, 168, 120, 0.5)' },
  flying:   { bg: '#A890F0', text: '#FFFFFF', glow: 'rgba(168, 144, 240, 0.5)' },
  fairy:    { bg: '#EE99AC', text: '#FFFFFF', glow: 'rgba(238, 153, 172, 0.5)' },
  rock:     { bg: '#B8A038', text: '#FFFFFF', glow: 'rgba(184, 160, 56, 0.5)' },
};

// Get the current evolution form based on level
export function getCurrentEvolution(pokemon: PokemonConfig, level: number) {
  const evolutions = [...pokemon.evolutions].sort((a, b) => b.minLevel - a.minLevel);
  for (const evo of evolutions) {
    if (level >= evo.minLevel) {
      return evo;
    }
  }
  return pokemon.evolutions[0];
}

// Check if a level-up triggers evolution
export function checkEvolution(pokemon: PokemonConfig, oldLevel: number, newLevel: number) {
  for (const evo of pokemon.evolutions) {
    if (oldLevel < evo.minLevel && newLevel >= evo.minLevel) {
      return evo;
    }
  }
  return null;
}

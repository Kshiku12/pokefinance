import { APP_CATEGORIES, type AppCategory } from './pokemon';

export interface CategorizationResult {
  categoryId: string;
  appName: string;
  confidence: number;
  category: AppCategory;
}

export interface ExtractedReceipt {
  appName: string;
  amount: number;
  categoryId: string;
  category: AppCategory;
  date: string;
  orderId?: string;
  description?: string;
  confidence: number;
}

// Known merchants and payment signatures mapping to categories
const MERCHANT_RULES: Array<{
  categorySlug: string;
  defaultAppName: string;
  keywords: string[];
}> = [
  {
    categorySlug: 'food-delivery',
    defaultAppName: 'Zomato',
    keywords: ['zomato', 'swiggy', 'eatclub', 'box8', 'faasos', 'behrouz', 'dominos', 'pizza hut', 'mcdonalds', 'kfc', 'burger king', 'starbucks', 'rebel foods'],
  },
  {
    categorySlug: 'grocery',
    defaultAppName: 'Blinkit',
    keywords: ['blinkit', 'grofers', 'swiggy instamart', 'instamart', 'bigbasket', 'bb daily', 'jiomart', 'zepto', 'nature basket', 'dmart', 'spencer', 'more retail'],
  },
  {
    categorySlug: 'ecommerce',
    defaultAppName: 'Amazon',
    keywords: ['amazon', 'amzn', 'flipkart', 'fkart', 'meesho', 'ajio', 'snapdeal', 'tatacliq', 'nykaa', 'tata 1mg', 'croma', 'reliance digital'],
  },
  {
    categorySlug: 'upi-payments',
    defaultAppName: 'Google Pay',
    keywords: ['gpay', 'google pay', 'phonepe', 'paytm', 'bhim', 'cred upi', 'upi transfer', 'superpe', 'bharatpe'],
  },
  {
    categorySlug: 'clothing',
    defaultAppName: 'Myntra',
    keywords: ['myntra', 'zara', 'h&m', 'hm', 'bonkers', 'wtflex', 'snitch', 'bewakoof', 'marks and spencer', 'uniqlo', 'urbanic', 'westside', 'lifestyle', 'max fashion'],
  },
  {
    categorySlug: 'trading-stocks',
    defaultAppName: 'Groww',
    keywords: ['groww', 'zerodha', 'kite', 'upstox', 'angel one', 'icici direct', '5paisa', 'dhan', 'indmoney', 'cred club'],
  },
  {
    categorySlug: 'gaming-entertainment',
    defaultAppName: 'Steam',
    keywords: ['steam', 'playstation', 'psn', 'xbox', 'epic games', 'riot games', 'battlenet', 'nintendo', 'bookmyshow', 'pvr', 'inox', 'netflix', 'prime video', 'hotstar', 'disney'],
  },
  {
    categorySlug: 'travel-booking',
    defaultAppName: 'Uber',
    keywords: ['uber', 'ola', 'rapido', 'makemytrip', 'mmt', 'irctc', 'ixigo', 'goibibo', 'easemytrip', 'cleartrip', 'indigo', 'air india', 'spicejet', 'redbus', 'abhibus'],
  },
  {
    categorySlug: 'health-pharmacy',
    defaultAppName: 'PharmEasy',
    keywords: ['pharmeasy', '1mg', 'tata 1mg', 'netmeds', 'apollo', 'apollo pharmacy', 'practo', 'medplus', 'cult.fit', 'cure.fit', 'dr lal pathlabs'],
  },
  {
    categorySlug: 'recharge-bills',
    defaultAppName: 'Jio',
    keywords: ['jio', 'airtel', 'vi ', 'vodafone', 'bsnl', 'tatasky', 'tata play', 'dish tv', 'electricity', 'bescom', 'tneb', 'cesc', 'adani electricity', 'mahadiscom', 'water bill', 'piped gas'],
  },
  {
    categorySlug: 'quick-commerce',
    defaultAppName: 'Zepto',
    keywords: ['zepto', 'dunzo', 'swiggy genie', 'borzo', 'porter'],
  },
  {
    categorySlug: 'education',
    defaultAppName: 'Coursera',
    keywords: ['coursera', 'udemy', 'unacademy', 'byjus', 'simplilearn', 'scaler', 'edx', 'skillshare', 'linkedin learning', 'upgrad'],
  },
  {
    categorySlug: 'web-purchases',
    defaultAppName: 'Web Purchase',
    keywords: ['stripe', 'razorpay', 'paypal', 'shopify', 'gumroad', 'github', 'cloudflare', 'digitalocean', 'aws', 'vercel', 'google cloud', 'domain'],
  },
  {
    categorySlug: 'rent-housing',
    defaultAppName: 'NoBroker',
    keywords: ['nobroker', 'housing.com', 'magicbricks', '99acres', 'society maintenance', 'rent transfer', 'flat rent', 'nestaway'],
  },
  {
    categorySlug: 'subscriptions',
    defaultAppName: 'Spotify',
    keywords: ['spotify', 'youtube premium', 'youtube music', 'apple.com/bill', 'itunes', 'google storage', 'icloud', 'notion', 'chatgpt', 'openai', 'midjourney', 'substack', 'medium', 'canva'],
  },
  {
    categorySlug: 'cafe-dining',
    defaultAppName: 'Starbucks',
    keywords: ['starbucks', 'ccd', 'cafe coffee day', 'third wave', 'blue tokai', 'barista', 'chaayos', 'chai point', 'costa coffee', 'tim hortons'],
  },
  {
    categorySlug: 'gifting',
    defaultAppName: 'Ferns N Petals',
    keywords: ['fnp', 'ferns n petals', 'fernsnpetals', 'igp', 'floweraura', 'winni', 'giftxoxo', 'archies', 'bakingo'],
  },
  {
    categorySlug: 'investments-mf',
    defaultAppName: 'Mutual Funds',
    keywords: ['coin by zerodha', 'kuvera', 'et money', 'uti mf', 'sbi mf', 'hdfc mf', 'nippon', 'ppfas', 'mirae asset', 'axis mf', 'tata mf', 'icici pru'],
  },
];

// Smart Categorization from any text string (narration, merchant, email header)
export function categorizeTransaction(text: string): CategorizationResult {
  const normalized = text.toLowerCase();

  for (const rule of MERCHANT_RULES) {
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        const cat = APP_CATEGORIES.find((c) => c.slug === rule.categorySlug) || APP_CATEGORIES[0];
        // Capitalize match or use default app name
        const matchedApp = rule.defaultAppName;
        return {
          categoryId: cat.id,
          appName: matchedApp,
          confidence: 0.95,
          category: cat,
        };
      }
    }
  }

  // Fallback to Web Purchases (Porygon) or E-Commerce (Squirtle)
  const fallbackCat = APP_CATEGORIES.find((c) => c.slug === 'web-purchases') || APP_CATEGORIES[2];
  return {
    categoryId: fallbackCat.id,
    appName: text.slice(0, 24).trim() || 'Online Order',
    confidence: 0.4,
    category: fallbackCat,
  };
}

// Heuristic pattern extractor for order confirmation emails and SMS receipts
export function parseReceiptText(content: string): ExtractedReceipt | null {
  if (!content || content.trim().length === 0) return null;

  // 1. Extract Amount: looks for ₹, Rs, INR, followed by numbers
  const amountPatterns = [
    /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /total\s*(?:amount|paid|order|bill)?\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /amount\s*(?:debited|paid)?\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:debited|paid|charged)/i,
  ];

  let detectedAmount = 0;
  for (const pattern of amountPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        detectedAmount = cleanNum;
        break;
      }
    }
  }

  // 2. Extract Merchant / App
  const categorization = categorizeTransaction(content);

  // 3. Extract Order ID if present
  const orderIdMatch = content.match(/(?:order\s*#?|id\s*[:=-]?|reference\s*no\s*[:=-]?)\s*([A-Za-z0-9\-_]{5,20})/i);
  const orderId = orderIdMatch ? orderIdMatch[1] : undefined;

  // 4. Extract or default date
  const now = new Date().toISOString();

  // If no amount detected, default to 0 (user can adjust in UI)
  return {
    appName: categorization.appName,
    amount: detectedAmount,
    categoryId: categorization.categoryId,
    category: categorization.category,
    date: now,
    orderId,
    description: orderId ? `Order #${orderId} from ${categorization.appName}` : `Purchase from ${categorization.appName}`,
    confidence: detectedAmount > 0 ? categorization.confidence : 0.5,
  };
}

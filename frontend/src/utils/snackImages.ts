import { SnackCategory } from '../types/snack';

// Curated high quality food photography from Unsplash
const SPECIFIC_IMAGES: Record<string, string> = {
  'dark chocolate almond bark': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80',
  'artisan glazed donuts': 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80',
  'organic gummy bears': 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=600&q=80',
  'cinnamon sugar pretzel bites': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
  'kettle cooked sea salt chips': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80',
  'white cheddar popcorn': 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80',
  'smoked paprika crisps': 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=600&q=80',
  'spicy sriracha cashews': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'cold brew coffee can': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
  'sparkling lime water': 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
  'organic ginger kombucha': 'https://images.unsplash.com/photo-1559839914-1b34645a399e?auto=format&fit=crop&w=600&q=80',
  'matcha green tea latte': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
  'roasted salted edamame': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  'mixed berry granola bar': 'https://images.unsplash.com/photo-1622484216850-256f08149886?auto=format&fit=crop&w=600&q=80',
  'freeze-dried strawberries': 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80',
  'greek yogurt cups': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
};

const CATEGORY_FALLBACKS: Record<SnackCategory, string> = {
  SWEET: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?auto=format&fit=crop&w=600&q=80',
  SAVOURY: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=600&q=80',
  DRINK: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80',
  HEALTHY_ISH: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
};

export const getSnackImageUrl = (name: string, category: SnackCategory): string => {
  const normalized = name.toLowerCase().trim();
  if (SPECIFIC_IMAGES[normalized]) {
    return SPECIFIC_IMAGES[normalized];
  }
  return CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.SWEET;
};

export const getCategoryEmoji = (category: SnackCategory): string => {
  switch (category) {
    case 'SWEET':
      return '🍫';
    case 'SAVOURY':
      return '🥨';
    case 'DRINK':
      return '🥤';
    case 'HEALTHY_ISH':
      return '🥗';
    default:
      return '🍿';
  }
};


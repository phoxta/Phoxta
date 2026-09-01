export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  sampleRange: [number, number];
  multiplierSuffix: string;
  rateToUSD?: number;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', sampleRange: [130000, 165000], multiplierSuffix: 'k' },
  { code: 'GBP', symbol: '£', name: 'British Pound', sampleRange: [75000, 100000], multiplierSuffix: 'k' },
  { code: 'EUR', symbol: '€', name: 'Euro', sampleRange: [80000, 110000], multiplierSuffix: 'k' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', sampleRange: [120000, 150000], multiplierSuffix: 'k' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', sampleRange: [140000, 180000], multiplierSuffix: 'k' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', sampleRange: [15000000, 25000000], multiplierSuffix: 'm' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', sampleRange: [2000000, 3500000], multiplierSuffix: 'L' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', sampleRange: [8000000, 12000000], multiplierSuffix: 'M' },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar', sampleRange: [110000, 150000], multiplierSuffix: 'k' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', sampleRange: [120000, 160000], multiplierSuffix: 'k' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', sampleRange: [250000, 380000], multiplierSuffix: 'k' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', sampleRange: [600000, 950000], multiplierSuffix: 'k' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', sampleRange: [180000, 280000], multiplierSuffix: 'k' },
];

/**
 * Automatically fetch / detect the user's local currency based on browser settings, locale, and timezone.
 */
export function detectUserCurrency(): CurrencyOption {
  try {
    const locale = navigator.language || 'en-US';
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
    const resolved = formatter.resolvedOptions();
    
    // Try Intl resolved currency if available
    if (resolved && (resolved as any).currency) {
      const code = (resolved as any).currency.toUpperCase();
      const match = SUPPORTED_CURRENCIES.find((c) => c.code === code);
      if (match) return match;
    }

    // Heuristics based on timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('London') || tz.includes('Europe/Belfast')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'GBP')!;
    }
    if (tz.includes('Lagos') || tz.includes('Africa/Lagos')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'NGN')!;
    }
    if (tz.includes('Berlin') || tz.includes('Paris') || tz.includes('Amsterdam') || tz.includes('Madrid') || tz.includes('Rome') || tz.includes('Europe/')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'EUR')!;
    }
    if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Canada')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'CAD')!;
    }
    if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Australia')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'AUD')!;
    }
    if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('Asia/Kolkata')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'INR')!;
    }
    if (tz.includes('Tokyo') || tz.includes('Asia/Tokyo')) {
      return SUPPORTED_CURRENCIES.find((c) => c.code === 'JPY')!;
    }
  } catch (err) {
    console.warn('Currency auto-detect fallback:', err);
  }

  return SUPPORTED_CURRENCIES[0]; // Default to USD
}

/**
 * Infer currency from location string (e.g. "London, UK", "Lagos, Nigeria", "Berlin, Germany")
 */
export function inferCurrencyFromLocation(locationText: string): CurrencyOption | null {
  if (!locationText) return null;
  const loc = locationText.toLowerCase();

  if (loc.includes('uk') || loc.includes('united kingdom') || loc.includes('london') || loc.includes('manchester') || loc.includes('edinburgh')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'GBP') || null;
  }
  if (loc.includes('nigeria') || loc.includes('lagos') || loc.includes('abuja')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'NGN') || null;
  }
  if (loc.includes('germany') || loc.includes('france') || loc.includes('netherlands') || loc.includes('berlin') || loc.includes('paris') || loc.includes('amsterdam') || loc.includes('europe') || loc.includes('ireland') || loc.includes('dublin')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'EUR') || null;
  }
  if (loc.includes('canada') || loc.includes('toronto') || loc.includes('vancouver') || loc.includes('montreal')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'CAD') || null;
  }
  if (loc.includes('australia') || loc.includes('sydney') || loc.includes('melbourne') || loc.includes('brisbane')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'AUD') || null;
  }
  if (loc.includes('india') || loc.includes('bangalore') || loc.includes('mumbai') || loc.includes('delhi') || loc.includes('hyderabad')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'INR') || null;
  }
  if (loc.includes('japan') || loc.includes('tokyo') || loc.includes('osaka')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'JPY') || null;
  }
  if (loc.includes('singapore')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'SGD') || null;
  }
  if (loc.includes('switzerland') || loc.includes('zurich') || loc.includes('geneva')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'CHF') || null;
  }
  if (loc.includes('dubai') || loc.includes('uae') || loc.includes('abu dhabi')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'AED') || null;
  }
  if (loc.includes('south africa') || loc.includes('cape town') || loc.includes('johannesburg')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'ZAR') || null;
  }
  if (loc.includes('us') || loc.includes('usa') || loc.includes('united states') || loc.includes('new york') || loc.includes('san francisco') || loc.includes('seattle') || loc.includes('austin')) {
    return SUPPORTED_CURRENCIES.find((c) => c.code === 'USD') || null;
  }

  return null;
}

/**
 * Generate formatted salary presets for a given currency
 */
export function getCurrencyPresets(curr: CurrencyOption): string[] {
  const sym = curr.symbol;
  if (curr.code === 'NGN') {
    return [
      `${sym}10m - ${sym}15m /yr`,
      `${sym}18m - ${sym}25m /yr`,
      `${sym}30m - ${sym}45m /yr`,
      `${sym}1.2m - ${sym}1.8m /mo`,
    ];
  }
  if (curr.code === 'INR') {
    return [
      `${sym}15L - ${sym}25L /yr`,
      `${sym}30L - ${sym}45L /yr`,
      `${sym}50L - ${sym}75L /yr`,
      `${sym}2L - ${sym}3.5L /mo`,
    ];
  }
  if (curr.code === 'JPY') {
    return [
      `${sym}7,000,000 - ${sym}9,000,000 /yr`,
      `${sym}10,000,000 - ${sym}14,000,000 /yr`,
      `${sym}15,000,000+ /yr`,
    ];
  }
  if (curr.code === 'GBP') {
    return [
      `${sym}60,000 - ${sym}80,000 /yr`,
      `${sym}85,000 - ${sym}110,000 /yr`,
      `${sym}115,000 - ${sym}140,000 /yr`,
      `${sym}500 - ${sym}650 /day`,
    ];
  }
  if (curr.code === 'EUR') {
    return [
      `${sym}65,000 - ${sym}85,000 /yr`,
      `${sym}90,000 - ${sym}115,000 /yr`,
      `${sym}120,000 - ${sym}150,000 /yr`,
      `${sym}550 - ${sym}750 /day`,
    ];
  }

  // Standard USD / CAD / AUD format
  return [
    `${sym}110,000 - ${sym}135,000 /yr`,
    `${sym}140,000 - ${sym}170,000 /yr`,
    `${sym}180,000 - ${sym}220,000 /yr`,
    `${sym}75 - ${sym}105 /hr`,
  ];
}

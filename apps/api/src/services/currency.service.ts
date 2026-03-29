import { redis } from '../config/redis';
import { logger } from '../utils/logger';

interface CountryCurrency {
  country: string;
  currency: string;
  code: string;
  symbol: string;
}

export const currencyService = {
  async getCountryCurrencies(): Promise<CountryCurrency[]> {
    const cacheKey = 'currencies:countries';
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const res = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies');
      const data: any[] = await res.json();

      const result: CountryCurrency[] = [];
      for (const country of data) {
        if (!country.currencies) continue;
        for (const [code, info] of Object.entries<any>(country.currencies)) {
          result.push({
            country: country.name.common,
            currency: info.name || code,
            code,
            symbol: info.symbol || code,
          });
        }
      }

      await redis.set(cacheKey, JSON.stringify(result), 'EX', 24 * 60 * 60);
      return result;
    } catch (err) {
      logger.error('Failed to fetch country currencies', { err });
      return [];
    }
  },

  async getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<number> {
    if (baseCurrency === targetCurrency) return 1;

    const cacheKey = `exchange:${baseCurrency}`;
    let rates: Record<string, number> = {};

    const cached = await redis.get(cacheKey);
    if (cached) {
      rates = JSON.parse(cached);
    } else {
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
        const data = await res.json();
        rates = data.rates || {};
        await redis.set(cacheKey, JSON.stringify(rates), 'EX', 60 * 60);
      } catch (err) {
        logger.error('Failed to fetch exchange rates', { err });
        return 1;
      }
    }

    return rates[targetCurrency] || 1;
  },

  async convertToBase(amount: number, fromCurrency: string, baseCurrency: string) {
    const rate = await currencyService.getExchangeRate(baseCurrency, fromCurrency);
    const exchangeRate = rate === 0 ? 1 : 1 / rate;
    const amountInBase = amount * exchangeRate;
    return { amountInBase, exchangeRate };
  },
};

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
      const data = await res.json() as any[];

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

  /**
   * Returns how many units of `toCurrency` you get per 1 unit of `fromCurrency`.
   * e.g. getConversionRate('USD', 'INR') → ~83
   * Fetches: https://api.exchangerate-api.com/v4/latest/USD → rates.INR
   */
  async getConversionRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const cacheKey = `exchange:${fromCurrency}`;
    let rates: Record<string, number> = {};

    const cached = await redis.get(cacheKey);
    if (cached) {
      rates = JSON.parse(cached);
    } else {
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
        const data = await res.json() as { rates?: Record<string, number> };
        rates = data.rates || {};
        await redis.set(cacheKey, JSON.stringify(rates), 'EX', 60 * 60);
      } catch (err) {
        logger.error('Failed to fetch exchange rates', { err });
        return 1;
      }
    }

    return rates[toCurrency] || 1;
  },

  /**
   * Converts `amount` in `fromCurrency` to `baseCurrency`.
   * exchangeRate stored on the expense = how many baseCurrency per 1 fromCurrency.
   */
  async convertToBase(amount: number, fromCurrency: string, baseCurrency: string) {
    const exchangeRate = await currencyService.getConversionRate(fromCurrency, baseCurrency);
    const amountInBase = amount * exchangeRate;
    return { amountInBase, exchangeRate };
  },
};

import { createWorker } from 'tesseract.js';
import { parse } from 'date-fns';
import { logger } from '../utils/logger';

interface OcrResult {
  amount: string | null;
  date: string | null;
  category: string | null;
  vendor: string | null;
  description: string;
  rawText: string;
  confidence: number;
}

export const ocrService = {
  async scan(imagePath: string): Promise<OcrResult> {
    const worker = await createWorker('eng');

    try {
      const { data } = await worker.recognize(imagePath);
      const rawText = data.text || '';
      const confidence = data.confidence || 0;

      const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

      // Extract amount — find largest currency-like number
      const amountMatches = rawText.match(/[\d,]+\.?\d{2}/g) || [];
      const amounts = amountMatches
        .map((m) => parseFloat(m.replace(/,/g, '')))
        .filter((n) => !isNaN(n));
      const amount = amounts.length > 0 ? Math.max(...amounts).toFixed(2) : null;

      // Extract date
      let extractedDate: string | null = null;
      const datePatterns = [
        /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
        /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i,
      ];
      for (const pattern of datePatterns) {
        const match = rawText.match(pattern);
        if (match) {
          try {
            const parsed =
              parse(match[0], 'MM/dd/yyyy', new Date()) ||
              parse(match[0], 'dd/MM/yyyy', new Date()) ||
              new Date(match[0]);
            if (!isNaN(parsed.getTime())) {
              extractedDate = parsed.toISOString().split('T')[0];
              break;
            }
          } catch {
            extractedDate = match[0];
          }
        }
      }

      // First non-empty line is often vendor
      const vendor = lines[0] || null;
      const description = lines.slice(1, 5).join(' ');

      // Simple category guessing
      let category: string | null = 'OTHER';
      const text = rawText.toUpperCase();
      if (text.includes('HOTEL') || text.includes('STAY') || text.includes('INN')) category = 'ACCOMMODATION';
      else if (text.includes('RESTAURANT') || text.includes('FOOD') || text.includes('CAFE') || text.includes('DINING')) category = 'MEALS';
      else if (text.includes('FLIGHT') || text.includes('AIRLINE') || text.includes('TAXI') || text.includes('UBER') || text.includes('LYFT')) category = 'TRAVEL';
      else if (text.includes('SOFTWARE') || text.includes('SAAS') || text.includes('SUBSCRIPTION')) category = 'SOFTWARE';
      else if (text.includes('LAPTOP') || text.includes('MONITOR') || text.includes('HARDWARE')) category = 'EQUIPMENT';

      return { amount, date: extractedDate, category, vendor, description, rawText, confidence };
    } finally {
      await worker.terminate();
    }
  },
};

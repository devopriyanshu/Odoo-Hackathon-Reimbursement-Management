import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { CountryCurrency } from '@/types';

// Shadcn style popover/dropdown simplified
interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function CurrencySelector({ value, onChange, error }: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: currencies = [], isLoading } = useQuery<CountryCurrency[]>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const res = await api.get('/company/currencies');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Simple hardcoded list fallback if API fails
  const fallbackList = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  ];

  const displayList = currencies.length > 0 ? currencies : fallbackList;

  const filtered = useMemo(() => {
    return displayList.filter(
      (c) =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        ('currency' in c ? c.currency : c.name).toLowerCase().includes(search.toLowerCase()) ||
        ('country' in c && c.country.toLowerCase().includes(search.toLowerCase()))
    );
  }, [displayList, search]);

  const selectedTitle = useMemo(() => {
    const found = displayList.find((c) => c.code === value);
    if (!found) return 'Select currency...';
    return `${found.code} - ${'currency' in found ? found.currency : found.name}`;
  }, [displayList, value]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all',
          open ? 'border-primary ring-1 ring-primary/50' : 'border-border',
          error ? 'border-destructive' : '',
          'bg-muted/50 text-foreground hover:bg-muted/70'
        )}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {isLoading ? 'Loading...' : selectedTitle}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border shadow-xl rounded-lg z-50 overflow-hidden flex flex-col max-h-[300px] animate-fade-in">
          <div className="p-2 border-b border-border sticky top-0 bg-card z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 rounded-md border border-border focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto p-1 flex-1">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No results found.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted/80 transition-colors',
                    value === c.code && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <span className="truncate pr-4">
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs mr-2">{c.code}</span>
                    {'currency' in c ? c.currency : c.name}
                  </span>
                  {value === c.code && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

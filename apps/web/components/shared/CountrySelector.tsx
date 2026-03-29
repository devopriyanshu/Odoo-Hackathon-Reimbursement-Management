import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { CountryCurrency } from '@/types';

interface CountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function CountrySelector({ value, onChange, error }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: countries = [], isLoading } = useQuery<CountryCurrency[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await api.get('/company/currencies');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Unique list of countries since some currencies map to multiple countries, 
  // but for the selector we just want a simple list.
  const uniqueCountries = useMemo(() => {
    const map = new Map<string, CountryCurrency>();
    countries.forEach(c => map.set(c.country, c));
    return Array.from(map.values())
      .sort((a, b) => a.country.localeCompare(b.country));
  }, [countries]);

  const fallbackList = [
    { country: 'United States', code: 'USD' },
    { country: 'United Kingdom', code: 'GBP' },
    { country: 'India', code: 'INR' },
    { country: 'Canada', code: 'CAD' },
    { country: 'Australia', code: 'AUD' },
    { country: 'Germany', code: 'EUR' },
    { country: 'France', code: 'EUR' },
    { country: 'Japan', code: 'JPY' },
    { country: 'Singapore', code: 'SGD' },
  ];

  const displayList = uniqueCountries.length > 0 ? uniqueCountries : fallbackList;

  const filtered = useMemo(() => {
    return displayList.filter(
      (c) => c.country.toLowerCase().includes(search.toLowerCase())
    );
  }, [displayList, search]);

  const selectedTitle = useMemo(() => {
    const found = displayList.find((c) => c.country === value);
    if (!found) return 'Select country...';
    return found.country;
  }, [displayList, value]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all text-left',
          open ? 'border-primary ring-1 ring-primary/50' : 'border-border',
          error ? 'border-destructive' : '',
          'bg-muted/50 text-foreground hover:bg-muted/70'
        )}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {isLoading ? 'Loading...' : selectedTitle}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border shadow-xl rounded-lg z-50 overflow-hidden flex flex-col max-h-[300px] animate-fade-in">
          <div className="p-2 border-b border-border sticky top-0 bg-card z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 rounded-md border border-border focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto p-1 flex-1">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No countries found.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.country}
                  type="button"
                  onClick={() => {
                    onChange(c.country);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted/80 transition-colors',
                    value === c.country && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <span className="truncate pr-4">{c.country}</span>
                  {value === c.country && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

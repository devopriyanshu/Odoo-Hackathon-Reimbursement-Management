import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AnalyticsData } from '@/types';

interface UseAnalyticsParams {
  period?: 'month' | 'quarter' | 'year';
}

export function useAnalytics({ period = 'month' }: UseAnalyticsParams = {}) {
  return useQuery<AnalyticsData>({
    queryKey: ['analytics', { period }],
    queryFn: async () => {
      const res = await api.get(`/expenses/analytics?period=${period}`);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 15, // 15 mins
  });
}

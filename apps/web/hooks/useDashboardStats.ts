import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardStats } from '@/types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/expenses/stats');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

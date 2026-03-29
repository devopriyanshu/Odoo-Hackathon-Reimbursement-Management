import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PaginatedResponse, Expense } from '@/types';

interface UseApprovalsParams {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'HISTORY';
}

export function useApprovals({ page = 1, limit = 10, status = 'PENDING' }: UseApprovalsParams = {}) {
  return useQuery<PaginatedResponse<Expense>>({
    queryKey: ['approvals', { page, limit, status }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status
      });

      const res = await api.get(`/approvals?${params.toString()}`);
      return res.data;
    },
  });
}

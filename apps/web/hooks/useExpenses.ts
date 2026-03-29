import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Expense, PaginatedResponse, ExpenseStatus } from '@/types';

interface UseExpensesParams {
  page?: number;
  limit?: number;
  status?: ExpenseStatus | '';
  search?: string;
}

export function useExpenses({ page = 1, limit = 10, status = '', search = '' }: UseExpensesParams = {}) {
  return useQuery<PaginatedResponse<Expense>>({
    queryKey: ['expenses', { page, limit, status, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const res = await api.get(`/expenses?${params.toString()}`);
      return res.data.data;
    },
  });
}

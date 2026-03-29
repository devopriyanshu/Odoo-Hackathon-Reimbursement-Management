import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ApprovalRule, ApprovalGroup } from '@/types';

export function useApprovalRules() {
  return useQuery<ApprovalRule[]>({
    queryKey: ['rules'],
    queryFn: async () => {
      const res = await api.get('/rules');
      return res.data.data;
    },
  });
}

export function useApprovalGroups() {
  return useQuery<ApprovalGroup[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/rules/groups');
      return res.data.data;
    },
  });
}

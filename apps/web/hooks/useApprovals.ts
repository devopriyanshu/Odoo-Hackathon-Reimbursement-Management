import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ApprovalStepWithExpense {
  id: string;
  expenseId: string;
  groupId: string;
  approverId: string;
  sequence: number;
  status: string;
  comment?: string;
  decidedAt?: string;
  createdAt: string;
  expense: {
    id: string;
    companyId: string;
    submittedById: string;
    amount: number;
    currency: string;
    amountInBase: number;
    exchangeRate: number;
    category: string;
    description: string;
    expenseDate: string;
    receiptUrl?: string;
    status: string;
    currentStep: number;
    createdAt: string;
    updatedAt: string;
    submittedBy: { id: string; name: string; email: string };
    company?: { id: string; name: string; currency: string };
  };
  group: {
    id: string;
    name: string;
    sequence: number;
    rule?: { name: string; ruleType: string };
  };
}

export function useApprovals(enabled = true) {
  return useQuery<ApprovalStepWithExpense[]>({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => {
      const res = await api.get('/approvals/pending');
      return res.data.data;
    },
    refetchInterval: 30_000, // auto-refresh every 30s
    enabled,
  });
}

export function useApprovalsHistory() {
  return useQuery<ApprovalStepWithExpense[]>({
    queryKey: ['approvals', 'history'],
    queryFn: async () => {
      const res = await api.get('/approvals/history');
      return res.data.data;
    },
  });
}

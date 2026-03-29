import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

export const approvalService = {
  async getPendingForUser(userId: string, companyId: string) {
    const steps = await prisma.approvalStep.findMany({
      where: { approverId: userId, status: 'PENDING' },
      include: {
        expense: {
          include: {
            submittedBy: { select: { id: true, name: true, email: true } },
            company: { select: { id: true, name: true, currency: true } },
          },
        },
        group: { include: { rule: { select: { name: true, ruleType: true } } } },
      },
    });

    // Filter by company
    return steps.filter((s) => s.expense.companyId === companyId);
  },

  async getHistory(userId: string, companyId: string) {
    const steps = await prisma.approvalStep.findMany({
      where: {
        approverId: userId,
        status: { in: ['APPROVED', 'REJECTED'] },
      },
      include: {
        expense: {
          include: {
            submittedBy: { select: { id: true, name: true, email: true } },
          },
        },
        group: { include: { rule: { select: { name: true } } } },
      },
      orderBy: { decidedAt: 'desc' },
    });

    return steps.filter((s) => s.expense.companyId === companyId);
  },
};

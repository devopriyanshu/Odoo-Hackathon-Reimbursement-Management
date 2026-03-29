import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { workflowService } from './workflow.service';
import { currencyService } from './currency.service';
import { CreateExpenseInput, UpdateExpenseInput } from '../validators/expense.validator';
// Role and ExpenseStatus removed for SQLite compatibility

export const expenseService = {
  async create(input: CreateExpenseInput, userId: string, companyId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } });
    if (!user) throw new ApiError(404, 'User not found');

    const { amountInBase, exchangeRate } = await currencyService.convertToBase(
      input.amount as number,
      input.currency as string,
      user.company.currency
    );

    const expense = await prisma.expense.create({
      data: {
        companyId,
        submittedById: userId,
        amount: input.amount as number,
        currency: input.currency as string,
        amountInBase,
        exchangeRate,
        category: input.category as string,
        description: input.description as string,
        expenseDate: new Date(input.expenseDate as string),
        receiptUrl: (input.receiptUrl as string | null | undefined) ?? null,
        ocrData: input.ocrData ? JSON.stringify(input.ocrData) : null,
        status: 'PENDING',
      },
      include: { submittedBy: { select: { id: true, name: true, email: true, role: true } } },
    });

    await prisma.auditLog.create({
      data: {
        expenseId: expense.id,
        actorId: userId,
        action: 'SUBMITTED',
        metadata: JSON.stringify({ amount: input.amount, currency: input.currency }),
      },
    });

    // Trigger workflow engine
    await workflowService.initializeWorkflow(expense.id, companyId, userId);

    return prisma.expense.findUnique({
      where: { id: expense.id },
      include: expenseService.fullInclude(),
    });
  },

  async findAll(companyId: string, userId: string, role: string, query: any) {
    const { status, category, page = 1, limit = 20, search, from, to } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    // Role-based filtering
    if (role === 'EMPLOYEE') {
      where.submittedById = userId;
    } else if (role === 'MANAGER') {
      const subordinates = await prisma.user.findMany({
        where: { managerId: userId, companyId },
        select: { id: true },
      });
      where.submittedById = { in: [...subordinates.map((s: any) => s.id), userId] };
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (search) where.description = { contains: search, mode: 'insensitive' };
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      if (to) where.expenseDate.lte = new Date(to);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          submittedBy: { select: { id: true, name: true, email: true } },
          company: { select: { id: true, name: true, currency: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return { data: expenses, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  },

  async findById(id: string, companyId: string) {
    const expense = await prisma.expense.findFirst({
      where: { id, companyId },
      include: expenseService.fullInclude(),
    });
    if (!expense) throw new ApiError(404, 'Expense not found');
    return expense;
  },

  async update(id: string, companyId: string, userId: string, input: UpdateExpenseInput) {
    const expense = await prisma.expense.findFirst({ where: { id, companyId } });
    if (!expense) throw new ApiError(404, 'Expense not found');
    if (expense.submittedById !== userId) throw new ApiError(403, 'Not authorized to update this expense');
    if (expense.status !== 'PENDING') throw new ApiError(400, 'Only PENDING expenses can be updated');

    return prisma.expense.update({
      where: { id },
      data: {
        ...(input.amount !== undefined && { amount: input.amount as number }),
        ...(input.currency !== undefined && { currency: input.currency as string }),
        ...(input.category !== undefined && { category: input.category as string }),
        ...(input.description !== undefined && { description: input.description as string }),
        ...(input.expenseDate !== undefined && { expenseDate: new Date(input.expenseDate as string) }),
        ...(input.receiptUrl !== undefined && { receiptUrl: input.receiptUrl as string | null }),
      },
      include: expenseService.fullInclude(),
    });
  },

  async cancel(id: string, companyId: string, userId: string) {
    const expense = await prisma.expense.findFirst({ where: { id, companyId } });
    if (!expense) throw new ApiError(404, 'Expense not found');
    if (expense.submittedById !== userId) throw new ApiError(403, 'Not authorized');
    if (expense.status !== 'PENDING') throw new ApiError(400, 'Only PENDING expenses can be cancelled');

    await prisma.auditLog.create({
      data: { expenseId: id, actorId: userId, action: 'CANCELLED' },
    });

    return prisma.expense.update({ where: { id }, data: { status: 'CANCELLED' } });
  },

  async getStats(companyId: string, userId: string, role: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const where: any = { companyId };
    if (role === 'EMPLOYEE') where.submittedById = userId;

    const [totalThisMonth, pending, approved, rejected, totalAmount] = await Promise.all([
      prisma.expense.count({ where: { ...where, createdAt: { gte: startOfMonth } } }),
      prisma.expense.count({ where: { ...where, status: { in: ['PENDING', 'IN_REVIEW'] } } }),
      prisma.expense.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.expense.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.expense.aggregate({ where: { ...where, status: 'APPROVED' }, _sum: { amountInBase: true } }),
    ]);

    // 30-day trend — single groupBy query for performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const trendRaw = await prisma.expense.findMany({
      where: { ...where, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    // Bucket by day
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().split('T')[0]] = 0;
    }
    for (const e of trendRaw) {
      const day = e.createdAt.toISOString().split('T')[0];
      if (day in buckets) buckets[day]++;
    }
    const trend = Object.entries(buckets).map(([date, count]) => ({ date, count }));

    return {
      totalThisMonth,
      pending,
      approved,
      rejected,
      totalAmount: Number(totalAmount._sum.amountInBase || 0),
      trend,
    };
  },

  async exportToCsv(companyId: string, userId: string, role: string, query: any) {
    const { status, category, from, to } = query;
    const where: any = { companyId };

    if (role === 'EMPLOYEE') where.submittedById = userId;
    else if (role === 'MANAGER') {
      const subordinates = await prisma.user.findMany({ where: { managerId: userId }, select: { id: true } });
      where.submittedById = { in: [userId, ...subordinates.map((s: any) => s.id)] };
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      if (to) where.expenseDate.lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { submittedBy: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Date', 'Submitted By', 'Category', 'Amount', 'Currency', 'Base Amount', 'Status', 'Description'];
    const rows = expenses.map((e: any) => [
      e.expenseDate.toISOString().split('T')[0],
      e.submittedBy.name,
      e.category,
      e.amount.toString(),
      e.currency,
      e.amountInBase.toString(),
      e.status,
      `"${e.description.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
  },

  fullInclude() {
    return {
      submittedBy: { select: { id: true, name: true, email: true, role: true } },
      approvalSteps: {
        include: {
          approver: { select: { id: true, name: true, email: true, role: true } },
          group: { select: { id: true, name: true, sequence: true } },
        },
        orderBy: { sequence: 'asc' as const },
      },
      auditLog: { orderBy: { createdAt: 'asc' as const } },
      company: { select: { id: true, name: true, currency: true } },
    };
  },
};

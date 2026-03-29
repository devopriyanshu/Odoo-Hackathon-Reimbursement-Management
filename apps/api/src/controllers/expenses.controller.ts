import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { expenseService } from '../services/expense.service';
import { currencyService } from '../services/currency.service';

export const expenseController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.create(req.body, req.user.id, req.user.companyId);
    res.status(201).json({ success: true, data: expense });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await expenseService.findAll(req.user.companyId, req.user.id, req.user.role, req.query);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.findById(req.params.id, req.user.companyId);
    res.json({ success: true, data: expense });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.update(req.params.id, req.user.companyId, req.user.id, req.body);
    res.json({ success: true, data: expense });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    await expenseService.cancel(req.params.id, req.user.companyId, req.user.id);
    res.json({ success: true, message: 'Expense cancelled' });
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await expenseService.getStats(req.user.companyId, req.user.id, req.user.role);
    res.json({ success: true, data: stats });
  }),

  export: asyncHandler(async (req: Request, res: Response) => {
    const csv = await expenseService.exportToCsv(req.user.companyId, req.user.id, req.user.role, req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.status(200).send(csv);
  }),

  previewConversion: asyncHandler(async (req: Request, res: Response) => {
    const { sourceCurrency, targetCurrency } = req.body;
    if (!sourceCurrency || !targetCurrency) {
      return res.status(400).json({ success: false, message: 'sourceCurrency and targetCurrency are required' });
    }
    const rate = await currencyService.getConversionRate(
      sourceCurrency as string,
      targetCurrency as string
    );
    res.json({ success: true, data: { rate, sourceCurrency, targetCurrency } });
  }),
};

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/database';
import { currencyService } from '../services/currency.service';
import { ApiError } from '../utils/ApiError';

export const companyController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    if (!company) throw new ApiError(404, 'Company not found');
    res.json({ success: true, data: company });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { name, currency } = req.body;
    const company = await prisma.company.update({
      where: { id: req.user.companyId },
      data: { ...(name && { name }), ...(currency && { currency }) },
    });
    res.json({ success: true, data: company });
  }),

  getCurrencies: asyncHandler(async (req: Request, res: Response) => {
    const currencies = await currencyService.getCountryCurrencies();
    res.json({ success: true, data: currencies });
  }),

  uploadPolicy: asyncHandler(async (req: Request, res: Response) => {
    const { policyUrl } = req.body;
    const company = await prisma.company.update({
      where: { id: req.user.companyId },
      data: { policyUrl },
    });
    res.json({ success: true, data: company });
  }),
};

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import bcrypt from 'bcryptjs';

export const usersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search, role } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { companyId: req.user.companyId };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit),
        select: { id: true, name: true, email: true, role: true, isActive: true, managerId: true, createdAt: true, manager: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ success: true, data: { data: users, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role, managerId } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { companyId: req.user.companyId, name, email, password: hashed, role: role || 'EMPLOYEE', managerId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: user });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      select: { id: true, name: true, email: true, role: true, isActive: true, managerId: true, createdAt: true, manager: { select: { id: true, name: true } } },
    });
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ success: true, data: user });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { name, role, managerId, isActive } = req.body;
    const user = await prisma.user.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!user) throw new ApiError(404, 'User not found');
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(role && { role }), ...(managerId !== undefined && { managerId }), ...(isActive !== undefined && { isActive }) },
      select: { id: true, name: true, email: true, role: true, isActive: true, managerId: true },
    });
    res.json({ success: true, data: updated });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!user) throw new ApiError(404, 'User not found');
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'User deactivated' });
  }),

  getManagers: asyncHandler(async (req: Request, res: Response) => {
    const managers = await prisma.user.findMany({
      where: { companyId: req.user.companyId, role: { in: ['MANAGER', 'ADMIN'] }, isActive: true },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ success: true, data: managers });
  }),
};

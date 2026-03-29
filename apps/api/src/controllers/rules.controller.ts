import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { ExpenseCategory, RuleType } from '@prisma/client';

export const rulesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const rules = await prisma.approvalRule.findMany({
      where: { companyId: req.user.companyId },
      include: { approvalGroups: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }, orderBy: { sequence: 'asc' } } },
      orderBy: { priority: 'desc' },
    });
    res.json({ success: true, data: rules });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, description, minAmount, maxAmount, categories, isManagerFirstApprover, ruleType, percentageThreshold, specificApproverId, priority, groups } = req.body;
    const rule = await prisma.approvalRule.create({
      data: {
        companyId: req.user.companyId,
        name, description: description || null,
        minAmount: minAmount || null, maxAmount: maxAmount || null,
        categories: categories || [],
        isManagerFirstApprover: isManagerFirstApprover || false,
        ruleType: ruleType || 'SEQUENTIAL',
        percentageThreshold: percentageThreshold || null,
        specificApproverId: specificApproverId || null,
        priority: priority || 0,
      },
    });

    if (groups && Array.isArray(groups)) {
      for (const group of groups) {
        const created = await prisma.approvalGroup.create({
          data: { ruleId: rule.id, companyId: req.user.companyId, name: group.name, sequence: group.sequence },
        });
        if (group.memberIds?.length) {
          await prisma.approvalGroupMember.createMany({
            data: group.memberIds.map((userId: string) => ({ groupId: created.id, userId })),
          });
        }
      }
    }

    const full = await prisma.approvalRule.findUnique({
      where: { id: rule.id },
      include: { approvalGroups: { include: { members: { include: { user: { select: { id: true, name: true } } } } } } },
    });
    res.status(201).json({ success: true, data: full });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const rule = await prisma.approvalRule.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: { approvalGroups: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } } },
    });
    if (!rule) throw new ApiError(404, 'Rule not found');
    res.json({ success: true, data: rule });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const rule = await prisma.approvalRule.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!rule) throw new ApiError(404, 'Rule not found');
    const { name, description, minAmount, maxAmount, categories, isManagerFirstApprover, ruleType, percentageThreshold, specificApproverId, priority } = req.body;
    const updated = await prisma.approvalRule.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(description !== undefined && { description }), ...(minAmount !== undefined && { minAmount }), ...(maxAmount !== undefined && { maxAmount }), ...(categories && { categories }), ...(isManagerFirstApprover !== undefined && { isManagerFirstApprover }), ...(ruleType && { ruleType }), ...(percentageThreshold !== undefined && { percentageThreshold }), ...(specificApproverId !== undefined && { specificApproverId }), ...(priority !== undefined && { priority }) },
    });
    res.json({ success: true, data: updated });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const rule = await prisma.approvalRule.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!rule) throw new ApiError(404, 'Rule not found');
    await prisma.approvalRule.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Rule deleted' });
  }),

  toggle: asyncHandler(async (req: Request, res: Response) => {
    const rule = await prisma.approvalRule.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!rule) throw new ApiError(404, 'Rule not found');
    const updated = await prisma.approvalRule.update({ where: { id: req.params.id }, data: { isActive: !rule.isActive } });
    res.json({ success: true, data: updated });
  }),
};

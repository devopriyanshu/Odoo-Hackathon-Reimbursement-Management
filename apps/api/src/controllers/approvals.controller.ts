import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { approvalService } from '../services/approval.service';
import { workflowService } from '../services/workflow.service';
import { ApiError } from '../utils/ApiError';
import { z } from 'zod';

const decisionSchema = z.object({ comment: z.string().optional() });
const rejectSchema = z.object({ comment: z.string().min(1, 'Comment is required for rejection') });

export const approvalController = {
  getPending: asyncHandler(async (req: Request, res: Response) => {
    const steps = await approvalService.getPendingForUser(req.user.id, req.user.companyId);
    res.json({ success: true, data: steps });
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const { comment } = decisionSchema.parse(req.body);
    const result = await workflowService.processDecision(
      req.params.expenseId,
      req.user.id,
      'APPROVED',
      comment
    );
    res.json({ success: true, data: result });
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const { comment } = rejectSchema.parse(req.body);
    const result = await workflowService.processDecision(
      req.params.expenseId,
      req.user.id,
      'REJECTED',
      comment
    );
    res.json({ success: true, data: result });
  }),

  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const history = await approvalService.getHistory(req.user.id, req.user.companyId);
    res.json({ success: true, data: history });
  }),

  override: asyncHandler(async (req: Request, res: Response) => {
    const { decision, comment } = req.body;
    await workflowService.adminOverride(req.params.expenseId, req.user.id, decision, comment);
    res.json({ success: true, message: `Admin override: ${decision}` });
  }),
};

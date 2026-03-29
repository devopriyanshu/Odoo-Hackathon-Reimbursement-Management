import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export const workflowService = {
  async initializeWorkflow(expenseId: string, companyId: string, submitterId: string) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new ApiError(404, 'Expense not found');

    const submitter = await prisma.user.findUnique({ where: { id: submitterId } });

    // Find matching rule
    const rules = await prisma.approvalRule.findMany({
      where: { companyId, isActive: true },
      include: {
        approvalGroups: {
          include: { members: true },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { priority: 'desc' },
    });

    const matchingRule = rules.find((rule: any) => {
      const amount = Number(expense.amountInBase);
      if (rule.minAmount !== null && amount < Number(rule.minAmount)) return false;
      if (rule.maxAmount !== null && amount > Number(rule.maxAmount)) return false;
      
      // categories is ExpenseCategory[] on PostgreSQL
      const categories: string[] = Array.isArray(rule.categories) ? rule.categories : [];
      if (categories.length > 0 && !categories.includes(expense.category)) return false;
      
      return true;
    });

    if (!matchingRule) {
      await prisma.expense.update({ where: { id: expenseId }, data: { status: 'APPROVED' } });
      await prisma.auditLog.create({
        data: { expenseId, actorId: submitterId, action: 'AUTO_APPROVED', metadata: JSON.stringify({ reason: 'No matching rule' }) },
      });
      return;
    }

    await prisma.auditLog.create({
      data: {
        expenseId,
        actorId: submitterId,
        action: 'RULE_APPLIED',
        metadata: JSON.stringify({ ruleId: matchingRule.id, ruleName: matchingRule.name }),
      },
    });

    // We only create steps for the FIRST group (or manager) initially
    // to strictly follow Step 1 -> Step 2 logic.
    await this.activateNextStep(expenseId, matchingRule.id, 0, submitter?.managerId);
  },

  async activateNextStep(expenseId: string, ruleId: string, currentStepSequence: number, managerId?: string | null) {
    const rule = await prisma.approvalRule.findUnique({
      where: { id: ruleId },
      include: { approvalGroups: { orderBy: { sequence: 'asc' } } },
    });
    if (!rule) return;

    // sequence 0 is reserved for manager if enabled
    if (currentStepSequence === 0 && rule.isManagerFirstApprover && managerId) {
      // Use the first real group's id — manager is a pre-step before group 1
      const firstGroupId = rule.approvalGroups[0]?.id;
      if (!firstGroupId) {
        logger.warn('isManagerFirstApprover is true but no groups are configured');
      } else {
        await prisma.approvalStep.create({
          data: {
            expenseId,
            groupId: firstGroupId,
            approverId: managerId,
            sequence: 0,
            status: 'PENDING',
          },
        });
        await prisma.expense.update({
          where: { id: expenseId },
          data: { status: 'IN_REVIEW', currentStep: 0 },
        });
        return;
      }
    }

    // Otherwise find the group for the current sequence
    // If we were at 0 and just finished manager, we look for group 1.
    // Actually the groups have their own 'sequence' property.
    const group = rule.approvalGroups.find((g: any) => g.sequence >= currentStepSequence);
    
    if (!group) {
        // No more groups -> Fully Approved
        await prisma.expense.update({ where: { id: expenseId }, data: { status: 'APPROVED' } });
        return;
    }

    const members = await prisma.approvalGroupMember.findMany({ where: { groupId: group.id } });
    
    await prisma.approvalStep.createMany({
      data: members.map((m: any) => ({
        expenseId,
        groupId: group.id,
        approverId: m.userId,
        sequence: group.sequence,
        status: 'PENDING',
      }))
    });

    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'IN_REVIEW', currentStep: group.sequence },
    });
  },

  async processDecision(
    expenseId: string,
    approverId: string,
    decision: 'APPROVED' | 'REJECTED',
    comment?: string
  ) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        approvalSteps: {
          include: { group: { include: { rule: true } } },
          orderBy: { sequence: 'asc' },
        },
      },
    });
    if (!expense) throw new ApiError(404, 'Expense not found');
    
    const pendingStep = expense.approvalSteps.find(
      (s: any) => s.approverId === approverId && s.status === 'PENDING'
    );
    if (!pendingStep) throw new ApiError(404, 'No pending approval step found for you');

    await prisma.approvalStep.update({
      where: { id: pendingStep.id },
      data: { status: decision, comment, decidedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        expenseId,
        actorId: approverId,
        action: decision,
        metadata: JSON.stringify({ comment, stepId: pendingStep.id }),
      },
    });

    if (decision === 'REJECTED') {
      await prisma.expense.update({ where: { id: expenseId }, data: { status: 'REJECTED' } });
      return { status: 'REJECTED' };
    }

    // Logic for current group completion
    const rule = pendingStep.group.rule;
    const ruleType = rule.ruleType;

    const currentGroupSteps = await prisma.approvalStep.findMany({
      where: { expenseId, groupId: pendingStep.groupId }
    });
    
    const groupApprovedCount = currentGroupSteps.filter((s: any) => s.status === 'APPROVED').length;
    const groupTotalCount = currentGroupSteps.length;
    
    let groupResolved = false;

    if (ruleType === 'SEQUENTIAL') {
        groupResolved = groupApprovedCount === groupTotalCount;
    } else if (ruleType === 'PERCENTAGE') {
        const threshold = (rule.percentageThreshold || 60) / 100;
        groupResolved = (groupApprovedCount / groupTotalCount) >= threshold;
    } else if (ruleType === 'SPECIFIC_APPROVER') {
        groupResolved = (rule.specificApproverId === approverId) || (groupApprovedCount === groupTotalCount);
    } else if (ruleType === 'HYBRID') {
        const threshold = (rule.percentageThreshold || 60) / 100;
        groupResolved = (rule.specificApproverId === approverId) || (groupApprovedCount / groupTotalCount >= threshold);
    }

    if (groupResolved) {
        // Move to next step
        await this.activateNextStep(expenseId, rule.id, expense.currentStep + 1);
    }

    return { status: 'IN_REVIEW' };
  },

  async adminOverride(expenseId: string, actorId: string, decision: 'APPROVED' | 'REJECTED', comment: string) {
      await prisma.expense.update({
          where: { id: expenseId },
          data: { status: decision }
      });
      
      await prisma.auditLog.create({
          data: {
              expenseId,
              actorId,
              action: `ADMIN_OVERRIDE_${decision}`,
              metadata: JSON.stringify({ comment })
          }
      });
      
      return { success: true };
  }
};

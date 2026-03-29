// Shared TypeScript types for the Reimbursement Management System

export type Role = 'ADMIN' | 'MANAGER' | 'FINANCE' | 'EMPLOYEE';

export type ExpenseStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type ExpenseCategory =
  | 'TRAVEL'
  | 'MEALS'
  | 'ACCOMMODATION'
  | 'EQUIPMENT'
  | 'SOFTWARE'
  | 'TRAINING'
  | 'MARKETING'
  | 'UTILITIES'
  | 'OTHER';

export type RuleType = 'SEQUENTIAL' | 'PERCENTAGE' | 'SPECIFIC_APPROVER' | 'HYBRID';

export type ApprovalStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

export interface Company {
  id: string;
  name: string;
  domain: string;
  currency: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: Role;
  managerId?: string;
  isActive: boolean;
  createdAt: string;
  company?: Company;
  manager?: Pick<User, 'id' | 'name'>;
}

export interface Expense {
  id: string;
  companyId: string;
  submittedById: string;
  amount: number;
  currency: string;
  amountInBase: number;
  exchangeRate: number;
  category: ExpenseCategory;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
  ocrData?: Record<string, any>;
  status: ExpenseStatus;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  submittedBy: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  approvalSteps?: ApprovalStep[];
  auditLog?: AuditLog[];
  company?: Pick<Company, 'id' | 'name' | 'currency'>;
}

export interface ApprovalStep {
  id: string;
  expenseId: string;
  groupId: string;
  approverId: string;
  sequence: number;
  status: ApprovalStepStatus;
  comment?: string;
  decidedAt?: string;
  createdAt: string;
  approver: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  group: { id: string; name: string; sequence: number; rule?: Pick<ApprovalRule, 'name' | 'ruleType'> };
}

export interface AuditLog {
  id: string;
  expenseId: string;
  actorId: string;
  action: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ApprovalRule {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categories: ExpenseCategory[];
  isManagerFirstApprover: boolean;
  ruleType: RuleType;
  percentageThreshold?: number;
  specificApproverId?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  approvalGroups?: ApprovalGroup[];
  steps: {
    id: string;
    approvalGroupId: string;
    ruleType: RuleType;
    requiredPercentage: number | null;
    specificApproverId: string | null;
    sequence: number;
    groupName?: string;
  }[];
}

export interface ApprovalGroup {
  id: string;
  ruleId: string;
  companyId: string;
  name: string;
  sequence: number;
  members: ApprovalGroupMember[];
}

export interface ApprovalGroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface DashboardStats {
  totalThisMonth: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
  trend: { date: string; count: number }[];
}

export interface AnalyticsData {
  byCategory: { category: string; amount: number }[];
  byStatus: { status: string; count: number }[];
  trend: { date: string; amount: number }[];
}

export interface CountryCurrency {
  country: string;
  currency: string;
  code: string;
  symbol: string;
}

export interface OcrResult {
  amount: string | null;
  date: string | null;
  category: string | null;
  vendor: string | null;
  description: string;
  rawText: string;
  confidence: number;
}

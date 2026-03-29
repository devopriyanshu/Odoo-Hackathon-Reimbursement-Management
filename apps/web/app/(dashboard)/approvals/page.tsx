'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Search, ExternalLink, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { PageContainer } from '@/components/layout/PageContainer';
import { useApprovals } from '@/hooks/useApprovals';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/shared/LoadingSkeleton';
import api from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Expense } from '@/types';

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [page, setPage] = useState(1);
  const [commentOpenFor, setCommentOpenFor] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data, isLoading } = useApprovals({ 
    page, 
    limit: 10, 
    status: activeTab 
  });

  const handleAction = async (expenseId: string, action: 'APPROVE' | 'REJECT', currentStepId?: string) => {
    if (action === 'REJECT' && !commentOpenFor) {
      setCommentOpenFor(expenseId);
      return;
    }

    if (action === 'REJECT' && !comment.trim()) {
      toast.error('A comment is required when rejecting an expense');
      return;
    }

    setProcessingId(expenseId);

    try {
      await api.post(`/approvals/${expenseId}/action`, {
        action,
        comment: comment.trim() || undefined
      });

      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      toast.success(action === 'APPROVE' ? 'Expense approved' : 'Expense rejected');
      setCommentOpenFor(null);
      setComment('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process approval action');
    } finally {
      setProcessingId(null);
    }
  };

  const expenses = data?.data || [];

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Validations Queue</h1>
        <p className="text-muted-foreground mt-1 text-sm">Review and manage expense approval requests waiting for your action.</p>
      </div>

      <div className="mb-6 border-b border-border">
        <div className="flex gap-6 relative">
          <button
            onClick={() => { setActiveTab('PENDING'); setPage(1); }}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'PENDING' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Awaiting Action
            {activeTab === 'PENDING' && (
              <motion.div layoutId="approval-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('HISTORY'); setPage(1); }}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'HISTORY' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            History
            {activeTab === 'HISTORY' && (
              <motion.div layoutId="approval-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-display font-semibold text-foreground mb-1">You&apos;re all caught up!</h3>
          <p className="text-muted-foreground text-sm">No expenses are currently waiting for your review.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-12">
          <AnimatePresence>
            {expenses.map((expense) => {
              const formattedAmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount);
              // Find the active step that pertains to the current user (the backend should handle this, 
              // but we just assume the first pending one is the one we are acting on for simplicity)
              const activeStep = expense.approvalSteps?.find(s => s.status === 'PENDING');

              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                    
                    {/* Details Column */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-base font-semibold text-foreground">{expense.description}</h3>
                            {activeTab === 'HISTORY' && <StatusBadge status={expense.status} />}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted by <span className="font-medium text-foreground">{expense.submittedBy.name}</span> on {format(new Date(expense.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground">
                          {expense.category.replace(/_/g, ' ')}
                        </span>
                        <span className="px-2.5 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> 
                          {expense.receiptUrl ? 'Has Receipt' : 'No Receipt'}
                        </span>
                      </div>
                    </div>

                    {/* Financials Column */}
                    <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Amount</p>
                      <p className="text-2xl font-display font-bold text-foreground amount-display">
                        {formattedAmt}
                      </p>
                      {expense.currency !== expense.company?.currency && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Eqv. {new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.company?.currency || 'USD' }).format(expense.amountInBase)}
                        </p>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="md:col-span-1 flex flex-col sm:items-end justify-center w-full gap-3 mt-2 md:mt-0">
                      <Link
                        href={`/expenses/${expense.id}`}
                        className="px-4 py-2 w-full text-center sm:w-auto bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" /> View Details
                      </Link>

                      {activeTab === 'PENDING' && (
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button
                            onClick={() => handleAction(expense.id, 'APPROVE')}
                            disabled={processingId === expense.id}
                            className="px-4 py-2 bg-success text-white hover:bg-success/90 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(expense.id, 'REJECT')}
                            disabled={processingId === expense.id}
                            className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reject Comment Drawer */}
                  <AnimatePresence>
                    {commentOpenFor === expense.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-border bg-destructive/5 overflow-hidden"
                      >
                        <div className="p-5">
                          <label className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4" /> 
                            Reason for rejection (Required)
                          </label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="text"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Please explain why this expense is being rejected..."
                              className="flex-1 px-3 py-2 rounded-lg border border-destructive/20 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setCommentOpenFor(null);
                                  setComment('');
                                }}
                                className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleAction(expense.id, 'REJECT', activeStep?.id)}
                                disabled={processingId === expense.id || !comment.trim()}
                                className="px-4 py-2 bg-destructive text-white text-sm font-medium rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
                              >
                                {processingId === expense.id ? 'Processing...' : 'Confirm Reject'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {data?.total && data.total > 10 && (
            <div className="flex justify-center pt-4">
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page * 10 >= data.total}
                className="px-4 py-2 text-sm font-medium border border-border rounded-lg bg-card hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

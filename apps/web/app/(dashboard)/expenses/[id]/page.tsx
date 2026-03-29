'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Calendar, Tag, Building2, ExternalLink, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { PageContainer } from '@/components/layout/PageContainer';
import { ApprovalTimeline } from '@/components/expenses/ApprovalTimeline';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Skeleton } from '@/components/shared/LoadingSkeleton';
import api from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Expense } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const res = await api.get(`/expenses/${params.id}`);
        setExpense(res.data.data);
      } catch (err: any) {
        toast.error('Failed to load expense details');
        router.push('/expenses');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) fetchExpense();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!expense) return;
    setIsDeleting(true);
    try {
      await api.delete(`/expenses/${expense.id}`);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Expense cancelled successfully');
      router.push('/expenses');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel expense');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formattedAmount = expense 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)
    : '';

  const formattedBaseAmount = expense?.currency !== expense?.company?.currency
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: expense?.company?.currency || 'USD' }).format(expense?.amountInBase || 0)
    : null;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="mb-6"><Skeleton className="h-4 w-24" /></div>
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div><Skeleton className="h-96 w-full" /></div>
        </div>
      </PageContainer>
    );
  }

  if (!expense) return null;

  const canCancel = expense.status === 'PENDING' && (user?.id === expense.submittedBy.id || user?.role === 'ADMIN');

  return (
    <PageContainer>
      <div className="mb-6">
        <Link 
          href="/expenses" 
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Expenses
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-3 flex items-center gap-3">
            {expense.description}
            <StatusBadge status={expense.status} />
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}</span>
            <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> {expense.category.replace(/_/g, ' ')}</span>
            <span className="flex items-center gap-1.5"><UserIcon className="w-4 h-4" /> {expense.submittedBy.name}</span>
          </div>
        </div>
        
        {canCancel && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-lg text-sm font-medium transition-colors border border-destructive/20 shrink-0"
          >
            Cancel Request
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-6">Financial Details</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Submitted Amount</p>
                <p className="text-3xl font-display font-bold text-foreground amount-display tracking-tight">
                  {formattedAmount}
                </p>
              </div>
              
              {formattedBaseAmount && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Base Currency Equivalent</p>
                  <p className="text-xl font-medium text-primary amount-display mt-2">
                    {formattedBaseAmount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    FX Rate: 1 {expense.currency} = {(expense.amountInBase / expense.amount).toFixed(4)} {expense.company?.currency}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/20">
              <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Receipt Documentation
              </h2>
            </div>
            <div className="p-6">
              {expense.receiptUrl ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-muted/10">
                  {expense.receiptUrl.match(/\.(jpeg|jpg|png|webp)$/i) ? (
                    <img 
                      src={expense.receiptUrl} 
                      alt="Receipt" 
                      className="max-h-[400px] object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium mb-1">Document.pdf</p>
                    </div>
                  )}
                  <a 
                    href={expense.receiptUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="mt-4 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    View Original <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <div className="text-center py-10 bg-muted/10 rounded-xl border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">No receipt was attached to this expense.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Timeline */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            {/* Background decorative blob */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            
            <h2 className="text-lg font-display font-semibold text-foreground mb-6">Approval Workflow</h2>
            
            <ApprovalTimeline expense={expense} />
          </div>
          
          <div className="glass-card rounded-2xl p-6 bg-muted/20">
            <h3 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" /> System Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference ID</span>
                <span className="font-mono text-xs">{expense.id.split('-')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created At</span>
                <span>{format(new Date(expense.createdAt), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{format(new Date(expense.updatedAt), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Cancel Expense Request"
        description="Are you sure you want to cancel this expense request? This action cannot be undone."
        confirmText="Yes, cancel it"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </PageContainer>
  );
}

import { PageContainer } from '@/components/layout/PageContainer';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewExpensePage() {
  return (
    <PageContainer>
      <div className="mb-8">
        <Link 
          href="/expenses" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Expenses
        </Link>
        <h1 className="text-2xl font-display font-bold text-foreground">Submit Expense</h1>
        <p className="text-muted-foreground mt-1 text-sm">Follow the steps below to submit a new reimbursement request.</p>
      </div>

      <ExpenseForm />
    </PageContainer>
  );
}

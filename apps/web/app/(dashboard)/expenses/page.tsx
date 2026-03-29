'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { PlusCircle, Filter, Receipt, FileSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CategoryIconBadge } from '@/components/shared/CategoryIconBadge';
import { useExpenses } from '@/hooks/useExpenses';
import { Expense, ExpenseStatus } from '@/types';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';


export default function ExpensesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('');

  const { data, isLoading } = useExpenses({ 
    page, 
    limit, 
    search, 
    status: statusFilter 
  });

  const handleRowClick = (expense: Expense) => {
    router.push(`/expenses/${expense.id}`);
  };

  const columns = [
    {
      key: 'description',
      title: 'Expense Details',
      render: (exp: Expense) => (
        <div>
          <p className="font-medium text-foreground truncate max-w-[250px] sm:max-w-[400px]">{exp.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <CategoryIconBadge category={exp.category} />
            {user?.role !== 'EMPLOYEE' && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                by {exp.submittedBy.name}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      render: (exp: Expense) => {
        const companyCurrency = exp.company?.currency || user?.company?.currency;
        const isDifferentCurrency = companyCurrency && exp.currency !== companyCurrency;
        
        let amountColor = 'text-foreground';
        if (exp.status === 'APPROVED') amountColor = 'text-emerald-500';
        else if (exp.status === 'REJECTED') amountColor = 'text-red-500';
        else if (exp.status === 'PENDING' || exp.status === 'IN_REVIEW') amountColor = 'text-amber-500';

        return (
          <div className="flex flex-col">
            <span className={`amount-display font-medium ${amountColor}`}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: exp.currency }).format(exp.amount)}
            </span>
            {isDifferentCurrency && (
              <span className="amount-display text-xs text-muted-foreground">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency! }).format(exp.amountInBase)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      title: 'Status',
      render: (exp: Expense) => <StatusBadge status={exp.status} />
    },
    {
      key: 'expenseDate',
      title: 'Date',
      sortable: true,
      render: (exp: Expense) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {format(new Date(exp.expenseDate), 'MMM dd, yyyy')}
        </span>
      )
    }
  ];

  const statuses: { label: string; value: ExpenseStatus | '' }[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Review', value: 'IN_REVIEW' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {user?.role === 'EMPLOYEE' ? 'My Expenses' : 'All Expenses'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {user?.role === 'EMPLOYEE' 
              ? 'Manage and track your reimbursement requests.' 
              : 'View and manage company expense submissions.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const res = await api.get('/expenses/export', { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `expenses-${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
            className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors border border-border flex items-center gap-2"
          >
            Download CSV
          </button>
          <Link
            href="/expenses/new"
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm shadow-primary/20 shrink-0"
          >
            <PlusCircle className="w-4 h-4" /> New Expense
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto hide-scrollbar">
          <Filter className="w-4 h-4 text-muted-foreground/50 shrink-0 hidden sm:block mr-2" />
          {statuses.map((s) => {
            const isActive = statusFilter === s.value;
            return (
              <button
                key={s.value}
                onClick={() => {
                  setStatusFilter(s.value);
                  setPage(1);
                }}
                className={`relative px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors outline-none ${
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="expenseTabFilter"
                    className="absolute inset-0 bg-primary rounded-full shadow-sm shadow-primary/20"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[calc(100vh-280px)] min-h-[500px]">
        <DataTable
          columns={columns}
          data={data?.data || []}
          total={data?.total || 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          searchPlaceholder="Search descriptions or vendors..."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-24 h-24 mb-6 relative"
              >
                <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
                <div className="relative z-10 w-full h-full bg-card border border-border/50 rounded-2xl shadow-sm flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
                  {search || statusFilter ? <FileSearch className="w-10 h-10 text-muted-foreground/50" /> : <Receipt className="w-10 h-10 text-primary/50" />}
                </div>
              </motion.div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                {search || statusFilter ? 'No matching expenses' : 'No expenses yet'}
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                {search || statusFilter 
                  ? 'Try adjusting your filters or search query to find what you are looking for.' 
                  : 'Get started by creating your first reimbursement request.'}
              </p>
              {!search && !statusFilter && (
                <Link
                  href="/expenses/new"
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> Create Expense
                </Link>
              )}
            </div>
          }
        />
      </div>
    </PageContainer>
  );
}

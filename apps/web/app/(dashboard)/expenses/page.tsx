'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { PlusCircle, Filter } from 'lucide-react';

import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{exp.category}</span>
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
      render: (exp: Expense) => (
        <div className="flex flex-col">
          <span className="amount-display font-medium text-foreground">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: exp.currency }).format(exp.amount)}
          </span>
          {exp.currency !== exp.company?.currency && (
            <span className="amount-display text-xs text-muted-foreground">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: exp.company?.currency || 'USD' }).format(exp.amountInBase)}
            </span>
          )}
        </div>
      )
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
          <Filter className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStatusFilter(s.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                statusFilter === s.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
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
        />
      </div>
    </PageContainer>
  );
}

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PlusCircle, Clock, CheckCircle2, TrendingUp, DollarSign, Receipt } from 'lucide-react';
import { format } from 'date-fns';

import { PageContainer } from '@/components/layout/PageContainer';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useExpenses } from '@/hooks/useExpenses';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { Expense } from '@/types';
import { CardSkeleton, Skeleton } from '@/components/shared/LoadingSkeleton';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  // Fetch only top 5 recent expenses for the dashboard
  const { data: expensesData, isLoading: expensesLoading } = useExpenses({ limit: 5 });

  const chartData = useMemo(() => {
    if (!stats?.trend) return [];
    // Ensure chronological order just in case
    return [...stats.trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => ({
        ...t,
        displayDate: format(new Date(t.date), 'MMM dd')
      }));
  }, [stats?.trend]);

  const currencyCode = user?.company?.currency || 'USD';

  const columns = [
    {
      key: 'description',
      title: 'Expense',
      render: (exp: Expense) => (
        <div>
          <p className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">{exp.description}</p>
          <p className="text-xs text-muted-foreground">{exp.category}</p>
        </div>
      )
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (exp: Expense) => (
        <span className="amount-display font-medium">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: exp.currency }).format(exp.amount)}
        </span>
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
      render: (exp: Expense) => <span className="text-sm text-muted-foreground">{format(new Date(exp.expenseDate), 'MMM dd, yyyy')}</span>
    }
  ];

  if (statsLoading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><CardSkeleton /></div>
          <div><CardSkeleton /></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Greetings, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your expenses.</p>
        </div>
        <div className="flex items-center gap-3">
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Link
              href="/approvals"
              className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-border"
            >
              <CheckCircle2 className="w-4 h-4" /> Validations
            </Link>
          )}
          <Link
            href="/expenses/new"
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-primary/20"
          >
            <PlusCircle className="w-4 h-4" /> New Expense
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total This Month"
          value={stats?.totalThisMonth || 0}
          icon={TrendingUp}
          description="Submitted expenses"
          color="primary"
        />
        <StatCard
          title="Pending Approval"
          value={stats?.pending || 0}
          icon={Clock}
          description="Awaiting action"
          color="warning"
        />
        <StatCard
          title="Approved"
          value={stats?.approved || 0}
          icon={CheckCircle2}
          description="Fully approved"
          color="success"
        />
        <StatCard
          title="Total Amount"
          value={stats?.totalAmount || 0}
          isCurrency={true}
          currencyCode={currencyCode}
          icon={DollarSign}
          description={`in ${currencyCode}`}
          color="accent-2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-Day Trend Chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6 flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-display font-semibold text-foreground">30-Day Trend</h2>
            <p className="text-sm text-muted-foreground">Volume of expense submissions</p>
          </div>
          <div className="flex-1 min-h-[300px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis 
                  dataKey="displayDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Submissions"
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Expenses List */}
        <div className="glass-card rounded-xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Recent Expenses</h2>
              <p className="text-sm text-muted-foreground">Latest submissions</p>
            </div>
            <Link href="/expenses" className="text-sm text-primary hover:underline font-medium">
              View all
            </Link>
          </div>
          <div className="flex-1">
            <DataTable
              columns={columns}
              data={expensesData?.data || []}
              total={0} // Hide pagination for dash widget
              page={1}
              limit={5}
              onPageChange={() => {}}
              isLoading={expensesLoading}
              emptyState={
                <div className="text-center py-10 px-4">
                  <Receipt className="w-8 h-8 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No recent expenses found</p>
                  <Link href="/expenses/new" className="inline-block mt-3 text-sm text-primary hover:underline">
                    Submit your first expense
                  </Link>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

// Sub-component for the stats
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  color,
  isCurrency,
  currencyCode
}: { 
  title: string; 
  value: number; 
  icon: any; 
  description: string; 
  color: string;
  isCurrency?: boolean;
  currencyCode?: string;
}) {
  const displayValue = isCurrency && currencyCode
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat('en-US').format(value);

  return (
    <div className="glass-card rounded-xl p-5 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110`} />
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 rounded-lg bg-${color}/10 text-${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-display font-bold text-foreground amount-display">
          {displayValue}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PlusCircle, Clock, CheckCircle2, TrendingUp, DollarSign, Receipt, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { motion, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { PageContainer } from '@/components/layout/PageContainer';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useExpenses } from '@/hooks/useExpenses';
import { useApprovals } from '@/hooks/useApprovals';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { Expense } from '@/types';
import { CardSkeleton, Skeleton } from '@/components/shared/LoadingSkeleton';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  // Fetch only top 5 recent expenses for the dashboard
  const { data: expensesData, isLoading: expensesLoading } = useExpenses({ limit: 5 });
  const { data: pendingApprovals } = useApprovals(user?.role === 'ADMIN' || user?.role === 'MANAGER');
  
  const pendingCount = pendingApprovals?.length || 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

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
      render: (exp: Expense) => {
        const companyCurrency = exp.company?.currency || currencyCode;
        const isDifferentCurrency = exp.currency !== companyCurrency;
        return (
          <div className="flex flex-col">
            <span className="amount-display font-medium">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: exp.currency }).format(exp.amount)}
            </span>
            {isDifferentCurrency && (
              <span className="amount-display text-xs text-muted-foreground">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(exp.amountInBase)}
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
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-2xl border border-primary/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-2 text-base flex items-center gap-2">
            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && pendingCount > 0 ? (
              <span>You have <strong className="text-primary">{pendingCount} pending approvals</strong> to review.</span>
            ) : (
              <span>Here&apos;s what&apos;s happening with your expenses today.</span>
            )}
          </p>
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
      </motion.div>

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
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass-card rounded-xl p-6 flex flex-col relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[60px] rounded-full" />
          <div className="mb-6 relative z-10">
            <h2 className="text-lg font-display font-semibold text-foreground">30-Day Trend</h2>
            <p className="text-sm text-muted-foreground">Volume of expense submissions</p>
          </div>
          <div className="flex-1 min-h-[300px] w-full mt-2 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
        </motion.div>

        {/* Recent Expenses List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="glass-card rounded-xl flex flex-col overflow-hidden"
        >
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
        </motion.div>
      </div>

      {/* Floating Quick Actions */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && pendingCount > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
            <Link href="/approvals" className="flex items-center gap-2 px-4 py-3 bg-card border border-border shadow-2xl rounded-full hover:bg-muted text-sm font-medium transition-colors">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
              Review {pendingCount} Pending
            </Link>
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
          <Link href="/expenses/new" className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground shadow-lg shadow-primary/40 rounded-full hover:bg-primary/90 hover:scale-105 transition-all">
            <PlusCircle className="w-6 h-6" />
          </Link>
        </motion.div>
      </div>
    </PageContainer>
  );
}

// Sub-component for an animated number
function AnimatedCounter({ value, isCurrency, currencyCode }: { value: number; isCurrency?: boolean; currencyCode?: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate(val) {
        node.textContent = isCurrency && currencyCode
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(val)
          : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
      }
    });

    return () => controls.stop();
  }, [value, isCurrency, currencyCode]);

  return <span ref={nodeRef} />;
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
    <div className="glass-card rounded-xl p-5 relative overflow-hidden group border-t-[3px] border-t-transparent hover:border-t-primary transition-all duration-300">
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 bg-${color === 'primary' ? 'var(--primary)' : color === 'success' ? 'emerald-500' : color === 'warning' ? 'yellow-500' : 'blue-500'}`} />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2.5 rounded-xl bg-muted/50 text-${color === 'primary' ? 'primary' : color === 'success' ? 'emerald-500' : color === 'warning' ? 'yellow-500' : 'blue-500'} shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-display font-bold text-foreground amount-display">
          <AnimatedCounter value={value} isCurrency={isCurrency} currencyCode={currencyCode} />
        </h3>
        <p className="text-xs text-muted-foreground mt-2 font-medium">
          {description}
        </p>
      </div>
    </div>
  );
}

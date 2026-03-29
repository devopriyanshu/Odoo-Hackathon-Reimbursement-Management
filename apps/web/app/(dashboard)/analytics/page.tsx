'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts';
import { PieChart as PieChartIcon, BarChart3, TrendingUp, Calendar } from 'lucide-react';

import { PageContainer } from '@/components/layout/PageContainer';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/shared/LoadingSkeleton';
import { useAuthStore } from '@/store/authStore';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent-2))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#9ca3af'];

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  
  const { data, isLoading } = useAnalytics({ period });
  const currency = user?.company?.currency || 'USD';

  if (isLoading) {
    return (
      <PageContainer>
        <div className="mb-8"><Skeleton className="h-8 w-64" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </PageContainer>
    );
  }

  // Formatting for tooltips
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  };

  const customTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    color: 'hsl(var(--foreground))'
  };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <PieChartIcon className="w-6 h-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Deep dive into company expenditure patterns and breakdowns.</p>
        </div>
        
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
          <button 
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${period === 'month' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Month
          </button>
          <button 
            onClick={() => setPeriod('quarter')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${period === 'quarter' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Quarter
          </button>
          <button 
            onClick={() => setPeriod('year')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${period === 'year' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Breakdown - Pie */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Spend by Category</h2>
              <p className="text-sm text-muted-foreground">Distribution of expenses across categories</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg"><PieChartIcon className="w-4 h-4 text-primary" /></div>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            {data?.byCategory && data.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {data.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Total Amount']}
                    contentStyle={customTooltipStyle}
                  />
                  <Legend verticalAlign="bottom" height={36} formatter={(val) => <span className="text-sm text-foreground">{val.replace(/_/g, ' ')}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
            )}
          </div>
        </div>

        {/* Status Breakdown - Bar */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Pipeline Status</h2>
              <p className="text-sm text-muted-foreground">Volume of expenses by current workflow state</p>
            </div>
            <div className="p-2 bg-accent-2/10 rounded-lg"><BarChart3 className="w-4 h-4 text-accent-2" /></div>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            {data?.byStatus && data.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byStatus} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={customTooltipStyle}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  />
                  <Bar dataKey="count" name="Total Requests" fill="hsl(var(--accent-2))" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Trend Analysis - Area */}
      <div className="glass-card rounded-2xl p-6 flex flex-col min-h-[400px]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">Spend Trend Analysis</h2>
            <p className="text-sm text-muted-foreground">Historical expenditure tracking across the selected period</p>
          </div>
          <div className="p-2 bg-success/10 rounded-lg"><TrendingUp className="w-4 h-4 text-success" /></div>
        </div>
        
        <div className="flex-1 w-full">
          {data?.trend && data.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Spend']}
                  contentStyle={customTooltipStyle}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--success))" 
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  strokeWidth={2}
                  activeDot={{ r: 6, fill: 'hsl(var(--success))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No historical data available</div>
          )}
        </div>
      </div>

    </PageContainer>
  );
}

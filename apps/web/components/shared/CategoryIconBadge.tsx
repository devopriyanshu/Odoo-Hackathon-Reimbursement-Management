import { Plane, Utensils, Building, Car, Laptop, Monitor, Paperclip, Box, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExpenseCategory = 'TRAVEL' | 'MEALS' | 'ACCOMMODATION' | 'TRANSPORT' | 'SOFTWARE' | 'EQUIPMENT' | 'OFFICE_SUPPLIES' | 'OTHER';

const categoryConfig: Record<string, { icon: any; label: string; colorClass: string }> = {
  TRAVEL: { icon: Plane, label: 'Travel', colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  MEALS: { icon: Utensils, label: 'Meals', colorClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  ACCOMMODATION: { icon: Building, label: 'Accommodation', colorClass: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  TRANSPORT: { icon: Car, label: 'Transport', colorClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  SOFTWARE: { icon: Laptop, label: 'Software', colorClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  EQUIPMENT: { icon: Monitor, label: 'Equipment', colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  OFFICE_SUPPLIES: { icon: Paperclip, label: 'Office Supplies', colorClass: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  OTHER: { icon: Box, label: 'Other', colorClass: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export function CategoryIconBadge({ category, className }: { category: string; className?: string }) {
  const config = categoryConfig[category] || { icon: HelpCircle, label: category, colorClass: 'bg-muted text-muted-foreground border-border' };
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border font-display tracking-wide', config.colorClass, className)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

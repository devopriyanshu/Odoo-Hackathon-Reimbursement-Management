import { ExpenseStatus } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, AlertCircle, X } from 'lucide-react';

interface StatusBadgeProps {
  status: ExpenseStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = {
    PENDING: { label: 'Pending', icon: Clock, classes: 'badge-pending' },
    IN_REVIEW: { label: 'In Review', icon: AlertCircle, classes: 'badge-in-review' },
    APPROVED: { label: 'Approved', icon: CheckCircle2, classes: 'badge-approved' },
    REJECTED: { label: 'Rejected', icon: XCircle, classes: 'badge-rejected' },
    CANCELLED: { label: 'Cancelled', icon: X, classes: 'badge-cancelled' },
  };

  const { label, icon: Icon, classes } = config[status] || config.PENDING;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit whitespace-nowrap',
        classes,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

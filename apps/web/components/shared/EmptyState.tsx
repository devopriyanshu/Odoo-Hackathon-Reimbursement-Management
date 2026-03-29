import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FolderX } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-border bg-muted/20',
        className
      )}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4 text-muted-foreground">
        {icon || <FolderX className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-display font-semibold text-foreground mb-1">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

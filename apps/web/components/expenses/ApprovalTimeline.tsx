import { format } from 'date-fns';
import { Check, X, Clock, HelpCircle, User, MessageSquare } from 'lucide-react';
import { Expense, ApprovalStep, ApprovalStepStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface ApprovalTimelineProps {
  expense: Expense;
}

export function ApprovalTimeline({ expense }: ApprovalTimelineProps) {
  // We need to order steps essentially by their sequence.
  const steps = useMemo(() => {
    if (!expense.approvalSteps) return [];
    return [...expense.approvalSteps].sort((a, b) => a.sequence - b.sequence);
  }, [expense.approvalSteps]);

  // If no steps, it might be auto-approved or just missing data
  if (steps.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-xl">
        No approval steps required or workflow hasn&apos;t started.
      </div>
    );
  }

  // Determine active step based on the first PENDING step
  const activeStepIdx = steps.findIndex(s => s.status === 'PENDING');

  const getStatusConfig = (status: ApprovalStepStatus, isActive: boolean) => {
    switch (status) {
      case 'APPROVED':
        return {
          icon: Check,
          iconClass: 'bg-success text-white',
          lineClass: 'bg-success',
          textClass: 'text-success',
          label: 'Approved'
        };
      case 'REJECTED':
        return {
          icon: X,
          iconClass: 'bg-destructive text-white',
          lineClass: 'bg-border',
          textClass: 'text-destructive',
          label: 'Rejected'
        };
      case 'SKIPPED':
        return {
          icon: HelpCircle,
          iconClass: 'bg-muted text-muted-foreground',
          lineClass: 'bg-border',
          textClass: 'text-muted-foreground',
          label: 'Skipped'
        };
      case 'PENDING':
      default:
        return {
          icon: Clock,
          iconClass: isActive 
            ? 'bg-amber-500 text-white pulse-amber' 
            : 'bg-muted border-2 border-border text-muted-foreground',
          lineClass: 'bg-border pb-1 border-dashed',
          textClass: isActive ? 'text-amber-500 font-medium' : 'text-muted-foreground',
          label: isActive ? 'Awaiting Approval' : 'Pending'
        };
    }
  };

  return (
    <div className="relative pl-4 space-y-8 py-2">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isActive = activeStepIdx === idx;
        const config = getStatusConfig(step.status, isActive);
        const Icon = config.icon;

        return (
          <div key={step.id} className="relative">
            {/* Vertical connecting line */}
            {!isLast && (
              <div 
                className={cn(
                  "absolute left-4 top-8 -bottom-8 w-0.5",
                  config.lineClass
                )} 
              />
            )}

            <div className="flex gap-4 relative z-10">
              {/* Icon Marker */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm outline outline-4 outline-card relative -left-0",
                config.iconClass
              )}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-1 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {step.group?.name || 'Approver'}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{step.approver?.name}</span>
                      <span className="opacity-50">•</span>
                      <span>{step.approver?.role}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end">
                    <span className={cn("text-xs uppercase tracking-wider font-bold", config.textClass)}>
                      {config.label}
                    </span>
                    {step.decidedAt && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(step.decidedAt), 'MMM dd, p')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment Box */}
                {step.comment && (
                  <div className="mt-2 bg-muted/40 border border-border/60 rounded-lg p-3 relative relative z-0">
                    {/* Speech bubble pointer */}
                    <div className="absolute -top-1.5 left-4 w-3 h-3 bg-muted/40 border-l border-t border-border/60 transform rotate-45" />
                    <div className="flex items-start gap-2 relative z-10">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground/80 leading-relaxed italic">
                        &quot;{step.comment}&quot;
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

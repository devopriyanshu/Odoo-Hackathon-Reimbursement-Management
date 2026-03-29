import { cn } from '@/lib/utils';
import { User, ShieldAlert, ShieldCheck } from 'lucide-react';

export function AvatarInitials({
  name,
  role,
  size = 'md',
  className,
}: {
  name?: string;
  role?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || '??';

  const roleColor =
    role === 'ADMIN'
      ? 'bg-red-500/10 text-red-500 border-red-500/20'
      : role === 'MANAGER'
      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      : 'bg-green-500/10 text-green-500 border-green-500/20';

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-display font-bold border shrink-0',
          roleColor,
          sizeClass,
          className
        )}
      >
        {initials}
      </div>
      {role && (
        <div
          className="absolute -bottom-1 -right-1 rounded-full bg-background border border-border p-0.5"
          title={role}
        >
          {role === 'ADMIN' ? (
            <ShieldAlert className="w-3 h-3 text-red-500" />
          ) : role === 'MANAGER' ? (
            <ShieldCheck className="w-3 h-3 text-blue-500" />
          ) : (
            <User className="w-3 h-3 text-green-500" />
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Receipt, CheckSquare, BarChart3, Settings, Users 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/expenses', label: 'Expenses', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['ADMIN', 'MANAGER'] },
  { href: '/analytics', label: 'Data', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const filteredNav = navItems.filter((item) => user?.role && item.roles.includes(user.role));
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50 pb-safe">
      {filteredNav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground transition-colors',
              active && 'text-primary'
            )}
          >
            <item.icon className={cn('w-5 h-5', active && 'stroke-[2.5px]')} />
            <span className="text-[10px] font-medium font-display">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

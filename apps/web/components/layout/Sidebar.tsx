'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Receipt, CheckSquare, Users, Settings, BarChart3,
  DollarSign, ChevronLeft, ChevronRight, LogOut, Building2, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { toast } from 'sonner';
import api from '@/lib/api';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/expenses', label: 'Expenses', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['ADMIN', 'MANAGER'] },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
  { href: '/admin/rules', label: 'Rules', icon: Shield, roles: ['ADMIN'] },
  { href: '/admin/company', label: 'Company', icon: Building2, roles: ['ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      router.push('/login');
      toast.success('Logged out successfully');
    }
  };

  const filteredNav = navItems.filter((item) => user?.role && item.roles.includes(user.role));
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full bg-card border-r border-border hidden md:flex flex-col z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-display font-bold text-sm text-foreground truncate"
              >
                ReimburseFlow
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={toggleSidebar}
          className="shrink-0 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={cn('nav-item', active && 'active', !sidebarOpen && 'justify-center px-0 py-2.5')}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-border">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="font-display font-semibold text-xs text-foreground truncate">{user?.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground truncate">{user?.role}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="shrink-0 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

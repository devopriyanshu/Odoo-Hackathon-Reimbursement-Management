'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore();
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated && mounted) {
      router.push('/login');
    }
  }, [isAuthenticated, router, mounted]);

  // Don't render until client side hydrated to prevent hydration mismatch on auth
  if (!mounted) return null;
  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-200',
          'md:ml-0', // default mobile
          sidebarOpen ? 'md:ml-[240px]' : 'md:ml-[64px]'
        )}
      >
        <Topbar />
        <main className="flex-1 mt-16 pb-20 md:pb-0 overflow-y-auto">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

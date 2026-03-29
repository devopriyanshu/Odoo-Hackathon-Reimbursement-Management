'use client';

import { useTheme } from 'next-themes';
import { Bell, Sun, Moon, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const { sidebarOpen } = useUIStore();

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-6 gap-4 z-40 transition-all duration-200"
      style={{ left: sidebarOpen ? 240 : 64 }}
    >
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search expenses..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          id="theme-toggle"
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        {/* User badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="flex flex-col items-end">
            <span className="text-xs font-display font-semibold text-foreground">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.company?.name}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

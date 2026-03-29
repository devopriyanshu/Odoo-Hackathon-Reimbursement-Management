'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error('App Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card p-8 rounded-2xl border border-destructive/20 relative overflow-hidden"
      >
        {/* Decorative background blurs */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-4 ring-background">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>

          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Something went wrong!</h2>
          
          <div className="bg-muted w-full p-4 rounded-xl text-left border border-border mb-6 overflow-x-auto">
            <p className="font-mono text-sm text-muted-foreground break-all">
              {error.message || "An unexpected system error occurred."}
            </p>
          </div>

          <p className="text-muted-foreground text-sm mb-8">
            The application encountered a critical error. We&apos;ve logged the issue. You can try refreshing the view or returning to the dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={reset}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            <Link
              href="/"
              className="flex-1 py-3 px-4 bg-card text-foreground font-medium rounded-xl border border-border flex items-center justify-center gap-2 hover:bg-muted transition-colors"
            >
              <Home className="w-4 h-4" /> Go to Dashboard
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

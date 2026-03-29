import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
        <Loader2 className="w-8 h-8 text-primary animate-spin relative z-10" />
      </div>
      <h2 className="text-xl font-display font-medium text-foreground mb-1">Loading Content</h2>
      <p className="text-sm opacity-80">Fetching your data securely...</p>
    </div>
  );
}

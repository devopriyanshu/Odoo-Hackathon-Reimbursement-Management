'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, DollarSign, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  companyName: z.string().min(2, 'Company name required'),
  country: z.string().min(2, 'Country required'),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { country: 'India' },
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      const res = await api.post('/auth/signup', data);
      const { user, company } = res.data.data;
      setUser({ ...user, company });
      toast.success(`Welcome to ReimburseFlow, ${user.name}! 🎉`);
      router.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Signup failed';
      toast.error(msg);
      setError('root', { message: msg });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">ReimburseFlow</h1>
          <p className="text-muted-foreground mt-1">Create your company workspace</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-8"
        >
          <h2 className="text-xl font-display font-semibold mb-2">Get started</h2>
          <p className="text-muted-foreground text-sm mb-6">Create your account &amp; company workspace</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Name</label>
                <input {...register('name')} id="name" placeholder="Jane Doe"
                  className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Country</label>
                <input {...register('country')} id="country" placeholder="India"
                  className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                {errors.country && <p className="text-destructive text-xs mt-1">{errors.country.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Company Name
              </label>
              <input {...register('companyName')} id="companyName" placeholder="Acme Corp"
                className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              {errors.companyName && <p className="text-destructive text-xs mt-1">{errors.companyName.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Work Email</label>
              <input {...register('email')} type="email" id="signup-email" placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} id="signup-password" placeholder="Min 8 chars, 1 upper, 1 number, 1 special"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-destructive text-sm">{errors.root.message}</p>
              </div>
            )}

            <button type="submit" id="signup-btn" disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

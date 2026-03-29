'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Building2, Globe, Save, Loader2, DollarSign } from 'lucide-react';

import { PageContainer } from '@/components/layout/PageContainer';
import { CountrySelector } from '@/components/shared/CountrySelector';
import { CurrencySelector } from '@/components/shared/CurrencySelector';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  domain: z.string().min(3, 'Domain is required'),
  country: z.string().min(2, 'Country is required'),
  currency: z.string().min(3, 'Base currency is required'),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function CompanySettingsPage() {
  const { user, setUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  // Fallback to empty if company data isn't fully loaded yet 
  // though realistically, the auth store hydration handles it
  const company = user?.company;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
      domain: company?.domain || '',
      country: company?.country || '',
      currency: company?.currency || 'USD',
    }
  });

  const onSubmit = async (data: CompanyFormData) => {
    setIsSaving(true);
    try {
      const res = await api.put('/company', data);
      
      // Update local auth store so layout (e.g., currency symbols) reflects immediately
      if (user) {
        setUser({ ...user, company: res.data.data });
      }
      
      // Need to invalidate everything relying on currency
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['approvals'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      toast.success('Company settings updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update company settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Company Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your organization&apos;s base settings, location, and reporting currency.</p>
      </div>

      <div className="max-w-3xl">
        <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-inner">
                {company?.name.charAt(0).toUpperCase() || <Building2 />}
              </div>
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground">{company?.name || 'Company Settings'}</h2>
                <p className="text-sm text-muted-foreground">Main Operating Entity</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-medium self-start sm:self-auto">
              Active Subscription
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Organization Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Organization Name *</label>
                  <input 
                    {...register('name')}
                    placeholder="Acme Corp"
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  />
                  {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email Domain *</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      {...register('domain')}
                      placeholder="acme.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Used for workspace identification and validation.</p>
                  {errors.domain && <p className="text-destructive text-xs mt-1">{errors.domain.message}</p>}
                </div>
              </div>
            </div>

            {/* Localization */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" /> Localization & Finance
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Headquarters Country *</label>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <CountrySelector 
                        value={field.value} 
                        onChange={field.onChange} 
                        error={errors.country?.message}
                      />
                    )}
                  />
                  {errors.country && <p className="text-destructive text-xs mt-1">{errors.country.message}</p>}
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center justify-between">
                    <span>Base Currency *</span>
                    <span className="bg-warning/10 text-warning px-1.5 py-0.5 rounded text-[10px] font-bold">CRITICAL</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    {/* Applying a pl-9 wrapper class to the CurrencySelector output to accommodate the icon */}
                    <div className="[&>div>button]:pl-10">
                      <Controller
                        control={control}
                        name="currency"
                        render={({ field }) => (
                          <CurrencySelector 
                            value={field.value} 
                            onChange={field.onChange} 
                            error={errors.currency?.message}
                          />
                        )}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    This is the currency all analytics and final reporting will be unified under. Modifying this will re-calculate existing reporting aggregates.
                  </p>
                  {errors.currency && <p className="text-destructive text-xs mt-1">{errors.currency.message}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-border mt-8">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50 min-w-[140px] justify-center"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Configuration</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}

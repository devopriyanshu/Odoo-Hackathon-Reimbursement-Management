'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Check, ChevronRight, FileText, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { queryClient } from '@/lib/queryClient';
import { ReceiptUpload } from './ReceiptUpload';
import { CurrencySelector } from '../shared/CurrencySelector';
import { OcrResult, ExpenseCategory } from '@/types';

const expenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z.string().min(3, 'Currency code required'),
  category: z.enum([
    'TRAVEL', 'MEALS', 'ACCOMMODATION', 'EQUIPMENT', 
    'SOFTWARE', 'TRAINING', 'MARKETING', 'UTILITIES', 'OTHER'
  ]),
  expenseDate: z.string().refine(val => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Date cannot be in the future'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  receiptUrl: z.string().optional(),
  ocrData: z.any().optional()
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const STEPS = [
  { id: 'receipt', title: 'Receipt' },
  { id: 'details', title: 'Details' },
  { id: 'review', title: 'Review' }
];

export function ExpenseForm() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [exchangeRatePreview, setExchangeRatePreview] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting }
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      currency: user?.company?.currency || 'USD',
      expenseDate: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const currencyData = watch('currency');
  const amountData = watch('amount');

  // Handle live currency preview
  useEffect(() => {
    const fetchRate = async () => {
      if (!currencyData || !amountData || currencyData === user?.company?.currency) {
        setExchangeRatePreview(null);
        return;
      }
      
      setPreviewLoading(true);
      try {
        const res = await api.post('/expenses/preview-conversion', {
          targetCurrency: user?.company?.currency,
          sourceCurrency: currencyData,
        });
        setExchangeRatePreview(res.data.data.rate);
      } catch (err) {
        // Silent fail for preview, handled downstream on actual submission
      } finally {
        setPreviewLoading(false);
      }
    };

    const debounce = setTimeout(fetchRate, 500);
    return () => clearTimeout(debounce);
  }, [currencyData, amountData, user?.company?.currency]);

  const handleScanComplete = (data: OcrResult, fileUrl: string) => {
    setValue('receiptUrl', fileUrl);
    setValue('ocrData', data);
    
    // Auto-fill from OCR
    if (data.amount) {
      // Remove commas and currency symbols
      const cleanAmt = data.amount.replace(/[^0-9.]/g, '');
      if (cleanAmt) setValue('amount', parseFloat(cleanAmt));
    }
    
    if (data.date) {
      const parsed = new Date(data.date);
      if (!isNaN(parsed.getTime()) && parsed <= new Date()) {
        setValue('expenseDate', format(parsed, 'yyyy-MM-dd'));
      }
    }
    
    if (data.category) {
      setValue('category', data.category as any);
    }

    setCurrentStep(1); // Move to details step
  };

  const handleNextStep = async () => {
    const fieldsToValidate = currentStep === 1 
      ? ['amount', 'currency', 'category', 'expenseDate', 'description'] as const
      : [];

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }
    
    setCurrentStep(s => Math.min(STEPS.length - 1, s + 1));
  };

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await api.post('/expenses', data);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      toast.success('Expense submitted successfully');
      router.push('/expenses');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit expense');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-12">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-border -z-10" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary transition-all duration-300 -z-10"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
          
          {STEPS.map((step, idx) => {
            const isActive = currentStep === idx;
            const isCompleted = currentStep > idx;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-4">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors border-2
                    ${isActive ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20' : ''}
                    ${isCompleted ? 'border-primary bg-primary/10 text-primary' : ''}
                    ${!isActive && !isCompleted ? 'border-border bg-muted/50 text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-sm relative min-h-[400px]">
        {/* Step Content */}
        <AnimatePresence mode="wait" custom={currentStep}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-8 h-full"
          >
            {currentStep === 0 && (
              <ReceiptUpload 
                onScanComplete={handleScanComplete}
                onSkip={() => setCurrentStep(1)}
              />
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-1">Expense Details</h2>
                  <p className="text-muted-foreground text-sm">Review or enter your expense details carefully.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Description</label>
                      <input 
                        {...register('description')}
                        placeholder="E.g., Client dinner at Dorsia"
                        className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 transition-all outline-none" 
                      />
                      {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Amount</label>
                        <input 
                          {...register('amount')}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm amount-display text-foreground focus:ring-2 focus:ring-primary/50 transition-all outline-none" 
                        />
                        {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Currency</label>
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

                    <AnimatePresence>
                      {amountData && currencyData && currencyData !== user?.company?.currency && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 bg-primary/5 border border-primary/20 rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                            <span className="text-muted-foreground">Approx. Converted Eqv.</span>
                            {previewLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : exchangeRatePreview ? (
                              <span className="amount-display text-primary">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: user?.company?.currency || 'USD' })
                                  .format(parseFloat(amountData.toString()) * exchangeRatePreview)}
                              </span>
                            ) : '-'}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Live rates applied on submission.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Category</label>
                      <select 
                        {...register('category')}
                        className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="TRAVEL">Travel</option>
                        <option value="MEALS">Meals & Entertainment</option>
                        <option value="ACCOMMODATION">Accommodation</option>
                        <option value="EQUIPMENT">Equipment & Hardware</option>
                        <option value="SOFTWARE">Software & Subscriptions</option>
                        <option value="TRAINING">Training & Courses</option>
                        <option value="MARKETING">Marketing & Advertising</option>
                        <option value="UTILITIES">Utilities & Internet</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {errors.category && <p className="text-destructive text-xs mt-1">{errors.category.message}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Expense Date</label>
                      <input 
                        {...register('expenseDate')}
                        type="date"
                        className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 transition-all outline-none" 
                      />
                      {errors.expenseDate && <p className="text-destructive text-xs mt-1">{errors.expenseDate.message}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-border mt-8">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    className="px-6 py-2 rounded-lg text-sm font-medium hover:bg-muted text-foreground transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-1">Final Review</h2>
                  <p className="text-muted-foreground text-sm">Please verify details before submitting.</p>
                </div>

                <div className="bg-muted/40 rounded-xl p-6 border border-border space-y-4">
                  <div className="flex justify-between pb-4 border-b border-border/50">
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium text-foreground">{watch('description')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-xl font-medium font-mono text-primary">
                        {watch('currency')} {watch('amount')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium text-foreground">{watch('category').replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-foreground">{format(new Date(watch('expenseDate')), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>

                  {watch('receiptUrl') && (
                    <div className="pt-4 border-t border-border/50 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Receipt attached from Step 1</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-4">
                  <div className="mt-0.5 text-primary"><CheckCircle2 className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-sm font-medium text-primary-foreground mb-1">Approval Workflow</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Upon submission, your expense will automatically enter the {user?.company?.name} approval pipeline. 
                      You will be notified once it is fully approved or if any action is required.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-border mt-8">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-lg text-sm font-medium hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className="px-8 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Check className="w-4 h-4" /> Submit Expense</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

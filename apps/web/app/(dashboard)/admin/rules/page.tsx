'use client';

import { useState } from 'react';
import { Plus, GripVertical, Trash2, ArrowRight, Settings2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { PageContainer } from '@/components/layout/PageContainer';
import { useApprovalRules, useApprovalGroups } from '@/hooks/useRules';
import { ApprovalRule, ApprovalGroup, RuleType } from '@/types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Skeleton } from '@/components/shared/LoadingSkeleton';
import api from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface StepFormData {
  id: string; // temp id for UI
  approvalGroupId: string;
  ruleType: RuleType;
  requiredPercentage: number | null;
  specificApproverId: string | null;
  sequence: number;
}

export default function RuleBuilderPage() {
  const { data: rules, isLoading: rulesLoading } = useApprovalRules();
  const { data: groups, isLoading: groupsLoading } = useApprovalGroups();

  const [selectedRule, setSelectedRule] = useState<ApprovalRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [steps, setSteps] = useState<StepFormData[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isLoading = rulesLoading || groupsLoading;

  const resetForm = () => {
    setRuleName('');
    setRuleDesc('');
    setMinAmount(0);
    setMaxAmount('');
    setSteps([]);
    setSelectedRule(null);
    setIsEditing(false);
  };

  const handleEditRule = (rule: ApprovalRule) => {
    setSelectedRule(rule);
    setRuleName(rule.name);
    setRuleDesc(rule.description || '');
    setMinAmount(rule.minAmount || 0);
    setMaxAmount(rule.maxAmount || '');
    
    // Map Steps
    const uiSteps = rule.steps.map(s => ({
      id: s.id,
      approvalGroupId: s.approvalGroupId,
      ruleType: s.ruleType,
      requiredPercentage: s.requiredPercentage,
      specificApproverId: s.specificApproverId || null,
      sequence: s.sequence,
    }));
    setSteps(uiSteps.sort((a,b) => a.sequence - b.sequence));
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    resetForm();
    setIsEditing(true);
    // Add one default step
    if (groups && groups.length > 0) {
      setSteps([{
        id: `temp-${Date.now()}`,
        approvalGroupId: groups[0].id,
        ruleType: 'SEQUENTIAL',
        requiredPercentage: null,
        specificApproverId: null,
        sequence: 1
      }]);
    }
  };

  const addStep = () => {
    if (!groups || groups.length === 0) return;
    setSteps([
      ...steps,
      {
        id: `temp-${Date.now()}`,
        approvalGroupId: groups[0].id,
        ruleType: 'SEQUENTIAL',
        requiredPercentage: null,
        specificApproverId: null,
        sequence: steps.length + 1
      }
    ]);
  };

  const removeStep = (id: string) => {
    const newSteps = steps.filter(s => s.id !== id);
    // Re-sequence
    setSteps(newSteps.map((s, i) => ({ ...s, sequence: i + 1 })));
  };

  const updateStep = (id: string, updates: Partial<StepFormData>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === steps.length - 1)
    ) return;

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    
    // Re-sequence
    setSteps(newSteps.map((s, i) => ({ ...s, sequence: i + 1 })));
  };

  const handleSave = async () => {
    if (!ruleName.trim()) return toast.error('Rule name is required');
    if (steps.length === 0) return toast.error('At least one approval step is required');

    setIsSaving(true);
    
    const payload = {
      name: ruleName,
      description: ruleDesc,
      minAmount: Number(minAmount),
      maxAmount: maxAmount === '' ? null : Number(maxAmount),
      steps: steps.map(s => ({
        approvalGroupId: s.approvalGroupId,
        ruleType: s.ruleType,
        requiredPercentage: s.requiredPercentage,
        specificApproverId: s.specificApproverId,
        sequence: s.sequence
      }))
    };

    try {
      if (selectedRule) { // Update
        await api.put(`/rules/${selectedRule.id}`, payload);
        toast.success('Rule updated successfully');
      } else { // Create
        await api.post('/rules', payload);
        toast.success('Rule created successfully');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['rules'] });
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsSaving(true);
    try {
      await api.delete(`/rules/${deleteId}`);
      await queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast.success('Rule deleted successfully');
      setDeleteId(null);
      if (selectedRule?.id === deleteId) resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete rule');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-96 w-full" />
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Workflow Engine</h1>
          <p className="text-muted-foreground mt-1 text-sm">Configure multi-step conditional approval routing.</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Build New Rule
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: List of Rules */}
        <div className={cn("flex flex-col gap-4", isEditing && "hidden lg:flex lg:opacity-50 pointer-events-none lg:pointer-events-auto transition-opacity")}>
          <div className="glass-card rounded-xl p-5 border-b border-border flex items-center gap-2 bg-muted/20">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Active Rules</h2>
          </div>
          
          <div className="space-y-3">
            {rules?.length === 0 ? (
              <div className="text-center py-8 bg-card border border-border rounded-xl">
                <p className="text-sm text-muted-foreground">No rules configured yet.</p>
              </div>
            ) : (
              rules?.map(rule => (
                <div 
                  key={rule.id}
                  onClick={() => !isEditing && handleEditRule(rule)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer relative group",
                    selectedRule?.id === rule.id 
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card border-border hover:border-primary/50 hover:shadow-sm",
                    isEditing && "pointer-events-none"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm text-foreground pr-8">{rule.name}</h3>
                    {!isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(rule.id); }}
                        className="absolute right-3 top-3 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8">
                    {rule.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-border/50 text-xs">
                    <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-mono">
                      {rule.minAmount === 0 && rule.maxAmount === null ? 'All Amounts' : 
                       rule.maxAmount === null ? `> ${rule.minAmount}` : 
                       `${rule.minAmount} - ${rule.maxAmount}`}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1 ml-auto">
                      {rule.steps.length} Step{rule.steps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Builder UI */}
        <div className="lg:col-span-2">
          {isEditing ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl shadow-lg border border-border/60 overflow-hidden"
            >
              {/* Builder Header */}
              <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">
                    {selectedRule ? 'Edit Rule' : 'New Approval Rule'}
                  </h2>
                  <p className="text-sm text-muted-foreground">Define triggering conditions and the routing flow.</p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Basic Info & Triggers */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">1. Conditions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1.5 block">Rule Name *</label>
                      <input 
                        value={ruleName}
                        onChange={e => setRuleName(e.target.value)}
                        placeholder="E.g., High Value C-Suite Approval"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1.5 block">Description</label>
                      <input 
                        value={ruleDesc}
                        onChange={e => setRuleDesc(e.target.value)}
                        placeholder="Explain when this rule applies..."
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Minimum Amount (Base Currency)</label>
                      <input 
                        type="number"
                        value={minAmount}
                        onChange={e => setMinAmount(Number(e.target.value))}
                        min={0}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Maximum Amount <span className="text-muted-foreground font-normal">(Leave blank for no limit)</span></label>
                      <input 
                        type="number"
                        value={maxAmount}
                        onChange={e => setMaxAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        min={minAmount}
                        placeholder="Infinity"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono" 
                      />
                    </div>
                  </div>
                </div>

                {/* Visual Workflow Steps Builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">2. Routing Flow</h3>
                    <button
                      type="button"
                      onClick={addStep}
                      className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Step
                    </button>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4 border border-border border-dashed space-y-4 relative min-h-[200px]">
                    {steps.length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <p className="text-sm mb-2">No steps defined. Expenses will be auto-approved.</p>
                        <button onClick={addStep} className="px-3 py-1.5 bg-background border border-border rounded-md text-sm hover:bg-muted">Add First Step</button>
                      </div>
                    )}

                    <AnimatePresence>
                      {steps.map((step, idx) => (
                        <motion.div 
                          key={step.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="relative flex items-stretch gap-3"
                        >
                          {/* Flow line connector visually linking steps */}
                          {idx !== steps.length - 1 && (
                            <div className="absolute left-4 top-10 bottom-[-24px] w-[2px] bg-primary/20 z-0" />
                          )}

                          {/* Step Number & Drag Handle (Visual only for now) */}
                          <div className="flex flex-col items-center gap-2 pt-2 z-10 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm ring-4 ring-background">
                              {idx + 1}
                            </div>
                            <div className="flex flex-col gap-1 mt-1 opacity-50 hover:opacity-100 transition-opacity">
                              <button 
                                type="button" 
                                onClick={() => moveStep(idx, 'up')}
                                disabled={idx === 0}
                                className="disabled:opacity-20 disabled:cursor-not-allowed hover:bg-muted rounded p-0.5"
                              >
                                <ArrowRight className="w-3 h-3 -rotate-90" />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => moveStep(idx, 'down')}
                                disabled={idx === steps.length - 1}
                                className="disabled:opacity-20 disabled:cursor-not-allowed hover:bg-muted rounded p-0.5"
                              >
                                <ArrowRight className="w-3 h-3 rotate-90" />
                              </button>
                            </div>
                          </div>

                          {/* Step Content Card */}
                          <div className="flex-1 bg-background border border-border rounded-xl p-4 shadow-sm z-10 group transition-all hover:border-primary/30">
                            <div className="flex justify-between items-start mb-4">
                              <h4 className="text-sm font-semibold text-foreground">Configuration</h4>
                              <button 
                                type="button" 
                                onClick={() => removeStep(step.id)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Target Group</label>
                                <select
                                  value={step.approvalGroupId}
                                  onChange={e => updateStep(step.id, { approvalGroupId: e.target.value })}
                                  className="w-full px-3 py-2 rounded-md bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 outline-none appearance-none"
                                >
                                  {groups?.map(g => (
                                    <option key={g.id} value={g.id}>{g.name} ({g.members.length} members)</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Resolution Logic</label>
                                <select
                                  value={step.ruleType}
                                  onChange={e => {
                                    const val = e.target.value as RuleType;
                                    updateStep(step.id, { 
                                      ruleType: val,
                                      requiredPercentage: val === 'PERCENTAGE' ? 51 : null,
                                      specificApproverId: null
                                    });
                                  }}
                                  className="w-full px-3 py-2 rounded-md bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 outline-none appearance-none"
                                >
                                  <option value="SEQUENTIAL">Any 1 Member Approves</option>
                                  <option value="PERCENTAGE">Consensus % Required</option>
                                  <option value="SPECIFIC_APPROVER">Specific Individual</option>
                                </select>
                              </div>

                              {/* Conditional Fields based on logic */}
                              <AnimatePresence>
                                {step.ruleType === 'PERCENTAGE' && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="sm:col-span-2 pt-2 border-t border-border/50"
                                  >
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Required Consensus Percentage</label>
                                    <div className="flex items-center gap-3">
                                      <input 
                                        type="range" 
                                        min="1" max="100" 
                                        value={step.requiredPercentage || 51}
                                        onChange={e => updateStep(step.id, { requiredPercentage: Number(e.target.value) })}
                                        className="flex-1 accent-primary"
                                      />
                                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded w-16 text-center">{step.requiredPercentage || 51}%</span>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 glass-card rounded-2xl border border-dashed border-border/60 text-center text-muted-foreground">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Settings2 className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Rule Builder</h3>
              <p className="max-w-sm text-sm mb-6">Select a rule from the list to edit its conditions, or build a new multi-step approval workflow.</p>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-background border border-border text-foreground hover:bg-muted rounded-lg text-sm font-medium transition-colors"
              >
                Create Rule
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Rule"
        description="Are you sure you want to delete this approval rule? This will not affect existing expenses currently in progress, but new expenses will not use this rule."
        confirmText="Yes, delete rule"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isSaving}
      />
    </PageContainer>
  );
}

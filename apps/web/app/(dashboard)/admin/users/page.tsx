'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, UserPlus, Mail, Shield, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { User, Role } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'EMPLOYEE' as Role, password: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search }],
    queryFn: async () => {
      const res = await api.get('/users', {
        params: { page, limit: 10, search }
      });
      return res.data;
    }
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, role: user.role, password: '' });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'EMPLOYEE', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return toast.error('Name and email are required');
    if (!editingUser && !formData.password) return toast.error('Password is required for new users');

    setIsSaving(true);
    try {
      if (editingUser) {
        // Strip password if empty on edit
        const payload = { ...formData };
        if (!payload.password) delete (payload as any).password;
        
        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', formData);
        toast.success('User created successfully');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${deleteId}`);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'User',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{u.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> {u.email}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (u: User) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
          ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' : 
            u.role === 'FINANCE' ? 'bg-success/10 text-success border-success/20' :
            u.role === 'MANAGER' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
            'bg-muted/50 text-muted-foreground border-border'}
        `}>
          {u.role === 'ADMIN' && <Shield className="w-3 h-3" />}
          {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: 'Joined',
      render: (u: User) => <span className="text-sm text-muted-foreground">{format(new Date(u.createdAt), 'MMM dd, yyyy')}</span>
    },
    {
      key: 'actions',
      title: '',
      render: (u: User) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenModal(u); }}
            className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(u.id); }}
            disabled={u.id === currentUser?.id}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage employee access, roles, and profiles for your company.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm shadow-primary/20 shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="h-[calc(100vh-220px)] min-h-[500px]">
        <DataTable
          columns={columns}
          data={data?.data || []}
          total={data?.total || 0}
          page={page}
          limit={10}
          onPageChange={setPage}
          searchPlaceholder="Search users by name or email..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          isLoading={isLoading}
        />
      </div>

      {/* User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              onClick={() => !isSaving && setIsModalOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl relative overflow-hidden"
              >
                <div className="p-5 border-b border-border bg-muted/20">
                  <h2 className="font-display font-semibold text-foreground text-lg">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </h2>
                </div>

                <form onSubmit={handleSave} className="p-5 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                    <input 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Role</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 outline-none appearance-none"
                    >
                      <option value="EMPLOYEE">Employee (Submit Only)</option>
                      <option value="MANAGER">Manager (Approve/Submit)</option>
                      <option value="FINANCE">Finance (Final Approver)</option>
                      <option value="ADMIN">Admin (Full Access)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {editingUser ? 'New Password (Leave blank to keep current)' : 'Initial Password'}
                    </label>
                    <input 
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-1 outline-none" 
                    />
                  </div>

                  <div className="pt-4 mt-6 border-t border-border flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : 'Save User'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete User"
        description="Are you sure you want to delete this user? Their expense history will remain in the system for auditing purposes, but they will lose all access immediately."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </PageContainer>
  );
}

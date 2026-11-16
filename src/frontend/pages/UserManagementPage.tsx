import React, { useEffect, useState } from 'react';
import { Shield, UserPlus } from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { DbUser } from '../types/index.ts';

interface UserManagementPageProps {
  onDataMutated: () => void;
}

export function UserManagementPage({ onDataMutated }: UserManagementPageProps) {
  const { dbUser } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    displayName: '',
    role: 'analyst',
    department: 'Business Intelligence',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listUsers();
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const isAdmin = dbUser?.role === 'admin';

  const handleRoleChange = async (userId: number, role: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await api.updateUserAccess(userId, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
      setSuccess(`Updated role for ${res.user.email} to ${res.user.role}.`);
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    }
  };

  const handleStatusToggle = async (target: DbUser) => {
    setError(null);
    setSuccess(null);
    const nextStatus = target.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.updateUserAccess(target.id, { status: nextStatus });
      setUsers((prev) => prev.map((u) => (u.id === target.id ? res.user : u)));
      setSuccess(`Set ${res.user.email} status to ${res.user.status}.`);
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.inviteUser(inviteForm);
      setUsers((prev) => [res.user, ...prev]);
      setInviteForm({
        email: '',
        displayName: '',
        role: 'analyst',
        department: 'Business Intelligence',
      });
      setSuccess(`Provisioned dashboard access for ${res.user.email}.`);
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* RBAC Matrix */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Role-Based Access Governance
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Signed in as <span className="font-medium text-slate-900 dark:text-white">{dbUser?.email}</span> · Role:{' '}
              <span className="font-semibold text-violet-700 dark:text-violet-400">
                {dbUser?.role?.toUpperCase()}
              </span>
            </p>
          </div>
          <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Administrator</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Full control: manage team roles & dashboard access, import/delete datasets, record
              orders, and export executive reports.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Analyst</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload CSV/Excel datasets, manage imported ledgers, record transactions, slice
              analytics, and export PDF/CSV reports.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Viewer</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Read-only executive access to KPI dashboards, interactive charts, filters, and
              printable business reports.
            </p>
          </div>
        </div>
      </section>

      {success && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Admin Provision Form */}
      {isAdmin && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Provision Team Member Access
            </h3>
          </div>

          <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Corporate Email
              </span>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="analyst@company.com"
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Full Name
              </span>
              <input
                type="text"
                required
                value={inviteForm.displayName}
                onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })}
                placeholder="Jordan Lee"
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Department
              </span>
              <input
                type="text"
                value={inviteForm.department}
                onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Access Role
              </span>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Adding...' : 'Grant Access'}
            </button>
          </form>
        </section>
      )}

      {/* Team Directory Table */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Workspace Users ({users.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active PostgreSQL user directory synchronized with Firebase Authentication
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Login</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Access Control</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {users.map((u) => {
                  const isSelf = u.id === dbUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              u.photoUrl ||
                              '/src/assets/images/avatar_executive_user_1794846102549.jpg'
                            }
                            alt={u.displayName}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                '/src/assets/images/avatar_executive_user_1794846102549.jpg';
                            }}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {u.displayName} {isSelf && '(You)'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{u.department}</td>
                      <td className="py-3 px-3">
                        {isAdmin && !isSelf ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs font-medium text-slate-800 dark:text-slate-200"
                          >
                            <option value="admin">Admin</option>
                            <option value="analyst">Analyst</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase">
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs font-medium ${
                            u.status === 'active'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                        {new Date(u.lastLoginAt).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-3 text-right">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(u)}
                              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              {u.status === 'active' ? 'Suspend' : 'Restore'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

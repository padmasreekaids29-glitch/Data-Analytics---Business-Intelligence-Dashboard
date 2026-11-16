import React, { useEffect, useState } from 'react';
import { CheckCircle2, LogOut, Moon, Save, Sun } from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

export function SettingsPage() {
  const { dbUser, refreshProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [compactTables, setCompactTables] = useState(false);
  const [kpiAlertThresholdPct, setKpiAlertThresholdPct] = useState(10);
  const [emailDigest, setEmailDigest] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (dbUser) {
      setDisplayName(dbUser.displayName);
      setDepartment(dbUser.department);
      setDefaultCurrency(dbUser.preferences?.defaultCurrency || 'USD');
      setCompactTables(Boolean(dbUser.preferences?.compactTables));
      setKpiAlertThresholdPct(dbUser.preferences?.kpiAlertThresholdPct ?? 10);
      setEmailDigest(dbUser.preferences?.emailDigest ?? true);
    }
  }, [dbUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    setErrorMsg(null);
    try {
      await api.updateMyProfile({
        displayName,
        department,
        preferences: {
          theme,
          defaultCurrency,
          compactTables,
          kpiAlertThresholdPct: Number(kpiAlertThresholdPct),
          emailDigest,
        },
      });
      await refreshProfile();
      setSavedMsg('Profile and dashboard preferences saved to PostgreSQL.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {savedMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Settings */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Profile Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personalize how your identity appears across reports and team activity logs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Full Name
              </span>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Department
              </span>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Verified Corporate Email
              </span>
              <input
                type="email"
                disabled
                value={dbUser?.email || ''}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0B1120]/60 text-sm text-slate-500 dark:text-slate-400"
              />
            </label>
          </div>
        </section>

        {/* Theme Settings */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Theme Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Switch between Crisp White daylight mode and Dark Navy executive mode
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                <Sun className="w-4 h-4 text-violet-600" />
                <span>Crisp White & Navy Rail</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                High-clarity daylight analytical canvas with dark navy sidebar.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                <Moon className="w-4 h-4 text-violet-400" />
                <span>Executive Dark Navy</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deep navy slate workspace tuned for low-light operations.
              </p>
            </button>
          </div>
        </section>

        {/* Dashboard Preferences */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Dashboard Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure currency formatting, data grid density, and KPI alerting
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Reporting Currency
              </span>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="INR">INR (₹) — Indian Rupee</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                KPI Variance Alert Threshold (%)
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={kpiAlertThresholdPct}
                onChange={(e) => setKpiAlertThresholdPct(Number(e.target.value))}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100 font-mono"
              />
            </label>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Compact Table Rows
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tighten row padding across transaction and product matrices
                </p>
              </div>
              <input
                type="checkbox"
                checked={compactTables}
                onChange={(e) => setCompactTables(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Executive Summary Digest
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enable weekly KPI variance notifications in activity feed
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailDigest}
                onChange={(e) => setEmailDigest(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving Preferences...' : 'Save Settings'}
            </button>
          </div>
        </section>
      </form>

      {/* Account Management */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Account Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Role: {dbUser?.role?.toUpperCase()} · Status: {dbUser?.status?.toUpperCase()} · Member
            since {dbUser ? new Date(dbUser.createdAt).toLocaleDateString() : '—'}
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out of Workspace
        </button>
      </section>
    </div>
  );
}

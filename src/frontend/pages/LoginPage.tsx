import { ArrowRight, BarChart3, FileSpreadsheet, ShieldCheck, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export function LoginPage() {
  const { signInWithGoogle, authError } = useAuth();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-[#0B1120]">
      {/* Left Brand Panel (Dark Navy) */}
      <div className="bg-[#0B1120] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              INSIGHT PRO
            </span>
          </div>

          <div className="mt-14 max-w-lg">
            <p className="text-xs font-medium text-violet-400 tracking-wide">
              Enterprise Business Intelligence Platform
            </p>
            <h1
              className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Turn raw commercial ledgers into executive clarity.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              Connect PostgreSQL revenue datasets, ingest CSV and Excel workbooks with schema
              validation, monitor real-time profit margins, and distribute board-ready PDF reports.
            </p>
          </div>
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-6 pt-8 border-t border-slate-800/90">
          <div>
            <BarChart3 className="w-5 h-5 text-violet-400 mb-2" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Live PostgreSQL KPIs</h2>
            <p className="text-xs text-slate-400 mt-1">
              Revenue, profit margin, AOV, and YoY growth computed directly from SQL records.
            </p>
          </div>
          <div>
            <UploadCloud className="w-5 h-5 text-violet-400 mb-2" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">CSV & Excel Ingestion</h2>
            <p className="text-xs text-slate-400 mt-1">
              Preview spreadsheets, validate schemas, and manage datasets cleanly.
            </p>
          </div>
          <div>
            <ShieldCheck className="w-5 h-5 text-violet-400 mb-2" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Role-Based Access</h2>
            <p className="text-xs text-slate-400 mt-1">
              Admin, Analyst, and Viewer governance backed by verified authentication.
            </p>
          </div>
        </div>
      </div>

      {/* Right Sign-In Panel (Crisp White) */}
      <div className="flex items-center justify-center p-8 sm:p-12 bg-slate-50 dark:bg-[#0F172A]">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-8 sm:p-10">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Sign in to workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Authenticate with your Google corporate account to access INSIGHT PRO analytics and
            reports.
          </p>

          {authError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs text-rose-700 dark:text-rose-300"
            >
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-6 w-full h-11 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <span>Continue with Google</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
            <p>First workspace member is automatically provisioned as Administrator.</p>
            <p>All API endpoints are protected by verified Firebase ID tokens and PostgreSQL RBAC.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

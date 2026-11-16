import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { formatCurrency } from '../lib/exportUtils.ts';
import type { ImportedDataset } from '../types/index.ts';

interface DataImportPageProps {
  currency: string;
  userRole: string;
  onDataMutated: () => void;
}

export function DataImportPage({
  currency,
  userRole,
  onDataMutated,
}: DataImportPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [datasets, setDatasets] = useState<ImportedDataset[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [totalFileRows, setTotalFileRows] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const loadDatasets = async () => {
    setLoadingList(true);
    try {
      const res = await api.listDatasets();
      setDatasets(res.datasets);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load datasets.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const parsePreviewFile = async (file: File) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setValidationErrors([]);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setSelectedFile(null);
      setPreviewHeaders([]);
      setPreviewRows([]);
      setErrorMessage('Invalid file format. Please upload a .csv, .xlsx, or .xls spreadsheet.');
      return;
    }

    setSelectedFile(file);
    setDatasetName(file.name.replace(/\.(csv|xlsx|xls)$/i, ''));

    try {
      if (ext === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
        });
        const rows = parsed.data || [];
        setTotalFileRows(rows.length);
        setPreviewHeaders(parsed.meta.fields || Object.keys(rows[0] || {}));
        setPreviewRows(rows.slice(0, 8));
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          setErrorMessage('Excel file contains no sheets.');
          return;
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
          raw: false,
          dateNF: 'yyyy-mm-dd',
        });
        setTotalFileRows(rows.length);
        setPreviewHeaders(Object.keys(rows[0] || {}));
        setPreviewRows(rows.slice(0, 8));
      }
    } catch {
      setErrorMessage('Could not parse file preview. Verify the spreadsheet is not corrupted.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parsePreviewFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parsePreviewFile(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setValidationErrors([]);

    try {
      const res = await api.uploadDataset(selectedFile, datasetName || selectedFile.name);
      setSuccessMessage(res.message);
      setSelectedFile(null);
      setPreviewHeaders([]);
      setPreviewRows([]);
      setDatasetName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDatasets();
      onDataMutated();
    } catch (err) {
      const typedErr = err as Error & { validationErrors?: string[] };
      setErrorMessage(typedErr.message || 'Dataset import failed.');
      if (typedErr.validationErrors) {
        setValidationErrors(typedErr.validationErrors);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDataset = async (ds: ImportedDataset) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const res = await api.deleteDataset(ds.id);
      setSuccessMessage(res.message);
      await loadDatasets();
      onDataMutated();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete dataset.');
    }
  };

  const handleReimportClick = () => {
    fileInputRef.current?.click();
  };

  const canModify = userRole === 'admin' || userRole === 'analyst';

  return (
    <div className="space-y-6">
      {/* Header & Template Action */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Import CSV & Excel Business Datasets
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Upload commercial sales workbooks (.csv, .xlsx, .xls). INSIGHT PRO validates required
              columns (OrderDate, CustomerName, Region, Category, ProductName, Quantity, UnitPrice),
              previews records, and persists normalized rows into PostgreSQL.
            </p>
          </div>
          <button
            type="button"
            onClick={() => api.downloadTemplate()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            Download CSV Template
          </button>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-300"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{errorMessage}</p>
                {validationErrors.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs space-y-1">
                    {validationErrors.map((ve, i) => (
                      <li key={i}>{ve}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dropzone */}
        {canModify ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/70 dark:bg-[#0B1120]/60"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <UploadCloud className="w-9 h-9 mx-auto text-violet-600 dark:text-violet-400 mb-3" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Drop your CSV or Excel file here, or click to browse
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supported formats: .csv, .xlsx, .xls · Maximum file size 15 MB
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
            Viewer role has read-only access. Contact an Administrator to upgrade to Analyst for
            dataset uploads.
          </div>
        )}

        {/* Data Preview Before PostgreSQL Ingestion */}
        {selectedFile && previewRows.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div className="flex-1 min-w-[240px] max-w-md">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Dataset Label ({selectedFile.name} · {totalFileRows} rows detected)
                  </span>
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewRows([]);
                    setPreviewHeaders([]);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Clear Preview
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleImportSubmit}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-60 cursor-pointer"
                >
                  {uploading ? 'Importing to PostgreSQL...' : `Import ${totalFileRows} Rows`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    {previewHeaders.map((h) => (
                      <th key={h} className="py-2 px-3 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      {previewHeaders.map((h) => (
                        <td
                          key={h}
                          className="py-2 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-mono"
                        >
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Showing preview of first {previewRows.length} of {totalFileRows} rows.
            </p>
          </div>
        )}
      </div>

      {/* Imported Datasets Registry */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              PostgreSQL Dataset Registry
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active business ledgers feeding live dashboard KPIs and charts
            </p>
          </div>
        </div>

        {loadingList ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : datasets.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            No imported datasets found. Upload a CSV or Excel workbook above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {datasets.map((ds) => (
              <div
                key={ds.id}
                className="py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {ds.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {ds.fileName} · {ds.fileType.toUpperCase()} ·{' '}
                      <span className="font-mono tabular-nums">{ds.rowCount}</span> rows ·{' '}
                      {new Date(ds.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  {ds.summary && (
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {formatCurrency(ds.summary.totalRevenue, currency)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Profit {formatCurrency(ds.summary.totalProfit, currency)}
                      </p>
                    </div>
                  )}

                  {canModify && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReimportClick}
                        title="Re-import replacement file"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Re-import
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDataset(ds)}
                        title="Delete dataset and associated rows"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import {
  EXCEL_IMPORT_TEMPLATES,
  downloadExcelTemplate,
  parseSpreadsheetFile,
  validateImportDataset,
  ImportValidationReport,
  ImportValidationIssueReport,
  ImportTemplateType,
  ExcelImportTemplateItem,
} from '../../utils/excelTemplates';

interface ImportCenterViewProps {
  hotel: Hotel;
  onImportCompleted: (templateType: ImportTemplateType, importedRows: any[]) => void;
  onMarkUnpublishedChanges: () => void;
}

export const ImportCenterView: React.FC<ImportCenterViewProps> = ({
  hotel,
  onImportCompleted,
  onMarkUnpublishedChanges,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ImportTemplateType>('fnb-menu-template.xlsx');
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<ImportValidationReport | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const parsed = await parseSpreadsheetFile(file);
      const valReport = validateImportDataset(selectedTemplate, parsed.rows);
      setRawRows(parsed.rows);
      setReport(valReport);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read spreadsheet file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommitImport = () => {
    if (!report || report.valid_count === 0) return;

    onImportCompleted(selectedTemplate, rawRows);
    onMarkUnpublishedChanges();

    setSuccessToast(
      `Successfully imported ${report.valid_count} records into ${hotel.name_en}!`
    );
    setTimeout(() => setSuccessToast(null), 4000);
    setReport(null);
    setRawRows([]);
  };

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="text-amber-400" size={20} />
            <span>Excel & CSV Import Center (Real Hotel Data Ingestion)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Download pre-formatted bilingual XLSX templates, map fields, validate for duplicates and missing data, and commit directly.
          </p>
        </div>
      </div>

      {/* Grid: 1. Template Downloader + 2. File Uploader */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Template Selector & Downloader */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
            <Download size={15} className="text-amber-400" />
            <span>1. Download Clean Template</span>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] text-stone-400">Select Department / Catalog:</label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value as ImportTemplateType);
                setReport(null);
                setRawRows([]);
              }}
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {EXCEL_IMPORT_TEMPLATES.map((tmpl: ExcelImportTemplateItem) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active template description */}
          {(() => {
            const currentTmpl = EXCEL_IMPORT_TEMPLATES.find((t: ExcelImportTemplateItem) => t.id === selectedTemplate);
            if (!currentTmpl) return null;
            return (
              <div className="p-3 bg-stone-850 rounded-xl text-[11px] space-y-2 border border-stone-800">
                <p className="text-stone-300">{currentTmpl.description}</p>
                <div className="text-[10px] text-stone-400">
                  <span className="font-bold text-amber-400">Required Columns: </span>
                  {currentTmpl.columns
                    .filter((c) => c.required)
                    .map((c) => c.header)
                    .join(', ')}
                </div>
              </div>
            );
          })()}

          <button
            onClick={() => downloadExcelTemplate(selectedTemplate)}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Download size={14} />
            <span>Download .XLSX Template</span>
          </button>
        </div>

        {/* Right 2 Cols: Drag & Drop File Ingest Area */}
        <div className="lg:col-span-2 bg-stone-900/90 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
            <UploadCloud size={16} className="text-amber-400" />
            <span>2. Upload Completed Spreadsheet</span>
          </div>

          {/* Upload Dropzone */}
          <label className="border-2 border-dashed border-stone-700 hover:border-amber-500/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-stone-950/40">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
            <div className="w-12 h-12 rounded-2xl bg-stone-800 text-amber-400 flex items-center justify-center mb-3">
              {isProcessing ? <RefreshCw className="animate-spin" size={22} /> : <UploadCloud size={24} />}
            </div>
            <div className="text-xs font-bold text-white mb-1">
              {isProcessing ? 'Validating spreadsheet data...' : 'Click to browse or drop .XLSX / .CSV here'}
            </div>
            <p className="text-[11px] text-stone-400 max-w-sm">
              Data is validated client-side against the {selectedTemplate} schema before importing.
            </p>
          </label>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <XCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Validation Report & Data Commit Card */}
      {report && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-400" />
                <span>Import Validation Summary</span>
              </h2>
              <p className="text-xs text-stone-400">
                Processed {report.total_rows} total rows for {selectedTemplate}.
              </p>
            </div>

            <button
              onClick={handleCommitImport}
              disabled={report.valid_count === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <CheckCircle2 size={14} />
              <span>Commit & Import ({report.valid_count} Valid Records)</span>
            </button>
          </div>

          {/* Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-750">
              <span className="text-[10px] text-stone-400 uppercase font-bold block">Total Rows</span>
              <span className="text-lg font-mono font-bold text-white">{report.total_rows}</span>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Valid & Ready</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{report.valid_count}</span>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Warnings</span>
              <span className="text-lg font-mono font-bold text-amber-400">{report.warning_count}</span>
            </div>
            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Invalid / Blocked</span>
              <span className="text-lg font-mono font-bold text-rose-400">{report.invalid_count}</span>
            </div>
          </div>

          {/* Validation Issues Inspector (if any) */}
          {report.issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                Detailed Validation Findings ({report.issues.length})
              </h3>
              <div className="bg-stone-950 rounded-xl border border-stone-800 divide-y divide-stone-850 max-h-56 overflow-y-auto">
                {report.issues.map((iss: ImportValidationIssueReport, idx: number) => (
                  <div key={idx} className="p-2.5 flex items-start gap-2.5 text-xs">
                    {iss.severity === 'FATAL' ? (
                      <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">
                          Row {iss.row_index}
                        </span>
                        <span className="font-bold text-white">{iss.column}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            iss.severity === 'FATAL'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {iss.severity}
                        </span>
                      </div>
                      <p className="text-stone-300 mt-0.5 text-[11px]">{iss.problem}</p>
                      {iss.suggested_fix && (
                        <p className="text-[10px] text-amber-400/90 mt-0.5">
                          Suggested Fix: {iss.suggested_fix}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Data Preview Table */}
          {rawRows.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={13} className="text-amber-400" />
                <span>Spreadsheet Raw Data Preview (First 5 Rows)</span>
              </h3>
              <div className="bg-stone-950 rounded-xl border border-stone-800 overflow-x-auto">
                <table className="w-full text-[11px] text-start">
                  <thead className="bg-stone-850 text-stone-400 uppercase text-[9px] border-b border-stone-800">
                    <tr>
                      {Object.keys(rawRows[0] || {}).map((col) => (
                        <th key={col} className="p-2 text-start whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850 text-stone-300">
                    {rawRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-900">
                        {Object.values(row).map((val: any, cIdx) => (
                          <td key={cIdx} className="p-2 whitespace-nowrap">
                            {String(val ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

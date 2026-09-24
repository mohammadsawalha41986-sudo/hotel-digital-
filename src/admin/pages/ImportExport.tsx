import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { roleCan } from '@shared/domain';
import { ENTITIES, IMPORT_WORKBOOKS, type EntityName } from '@shared/entities';
import { importColumns } from '@shared/importSpec';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, Field, Segmented, Select, cx } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { Card, PageHeader } from '../layout/AdminLayout';

interface RowResult {
  sheet: EntityName;
  row: number;
  action: 'create' | 'update' | 'error';
  name: string;
  errors: string[];
}
interface ImportResponse {
  committed: boolean;
  summary: { create: number; update: number; errors: number };
  results: RowResult[];
  message?: string;
}

const xlsx = () => import('xlsx');

/** Maps a worksheet name to an entity: accepts the entity key or its plural label. */
function sheetEntity(name: string, allowed: EntityName[]): EntityName | null {
  const n = name.trim().toLowerCase();
  return allowed.find((e) => e === n || ENTITIES[e].label.plural.toLowerCase() === n || e.replace('_', ' ') === n) ?? null;
}

export function ImportExport({ hid }: { hid: string }) {
  const me = useMe();
  const fb = useFeedback();
  const role = me.data?.user?.role;
  const workbooks = useMemo(() => Object.entries(IMPORT_WORKBOOKS).filter(([, w]) => role && w.entities.every((e) => roleCan(role, ENTITIES[e].module))), [role]);
  const [wbKey, setWbKey] = useState(workbooks[0]?.[0] ?? 'menu');
  const wb = IMPORT_WORKBOOKS[wbKey];
  const [mode, setMode] = useState<'upsert' | 'create_only'>('upsert');
  const [sheets, setSheets] = useState<Record<string, Record<string, unknown>[]> | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState<ImportResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useMutation({
    mutationFn: (commit: boolean) => api<ImportResponse>(`/admin/hotels/${hid}/import/${wbKey}`, { method: 'POST', body: { sheets: sheets ?? {}, mode, commit } }),
    onSuccess: (r) => {
      setResult(r);
      if (r.committed) {
        fb.success(`Imported: ${r.summary.create} new, ${r.summary.update} updated`);
        setSheets(null);
        setFileName('');
      }
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 422) fb.error(e.message);
      else fb.error(errorMessage(e));
    },
  });

  const downloadTemplate = async () => {
    const X = await xlsx();
    const book = X.utils.book_new();
    for (const e of wb.entities) {
      const cols = importColumns(e);
      X.utils.book_append_sheet(book, X.utils.aoa_to_sheet([cols.map((c) => c.header)]), e);
    }
    const help = wb.entities.flatMap((e) => [[ENTITIES[e].label.plural, ''], ...importColumns(e).map((c) => [`  ${e}.${c.header}`, c.hint]), ['', '']]);
    X.utils.book_append_sheet(book, X.utils.aoa_to_sheet([['Column', 'How to fill it'], ...help]), 'Instructions');
    X.writeFile(book, `${wbKey}-template.xlsx`);
  };

  const exportData = async () => {
    try {
      const data = await api<{ sheets: { entity: EntityName; columns: string[]; rows: Record<string, unknown>[] }[] }>(`/admin/hotels/${hid}/export/${wbKey}`);
      const X = await xlsx();
      const book = X.utils.book_new();
      for (const s of data.sheets) X.utils.book_append_sheet(book, X.utils.json_to_sheet(s.rows, { header: s.columns }), s.entity);
      X.writeFile(book, `${wbKey}-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      fb.error(errorMessage(e));
    }
  };

  const onFile = async (f: File) => {
    setParseError('');
    setResult(null);
    setFileName(f.name);
    if (f.size > 5 * 1024 * 1024) return setParseError('File is larger than 5 MB.');
    try {
      const X = await xlsx();
      const book = X.read(await f.arrayBuffer(), { type: 'array' });
      const out: Record<string, Record<string, unknown>[]> = {};
      const ignored: string[] = [];
      for (const name of book.SheetNames) {
        if (name.toLowerCase() === 'instructions') continue;
        // CSV files have a single anonymous sheet: map it to the only entity of the workbook.
        const target = sheetEntity(name, wb.entities) ?? (book.SheetNames.length === 1 && wb.entities.length === 1 ? wb.entities[0] : null);
        if (!target) {
          ignored.push(name);
          continue;
        }
        out[target] = X.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[name], { defval: '', raw: true });
      }
      if (!Object.keys(out).length) return setParseError(`No sheet matched. Expected sheet names: ${wb.entities.join(', ')}.`);
      if (ignored.length) setParseError(`Ignored sheets: ${ignored.join(', ')} (names must match ${wb.entities.join(', ')}).`);
      setSheets(out);
      run.mutate(false);
    } catch {
      setParseError('This file could not be read. Use .xlsx or .csv.');
    }
  };

  const errorsOnly = result?.results.filter((r) => r.action === 'error') ?? [];

  return (
    <>
      <PageHeader title="Import / export" description="Bulk-edit catalogs in Excel or CSV. Every import is validated row by row and previewed; nothing is written until you confirm, and a file with errors is never partially imported." />
      <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <Card title="1. Choose data">
          <div className="space-y-4">
            <Field label="Catalog" htmlFor="imp-wb">
              <Select
                id="imp-wb"
                value={wbKey}
                onChange={(e) => {
                  setWbKey(e.target.value);
                  setSheets(null);
                  setResult(null);
                }}
                className="h-10 rounded-lg text-sm"
              >
                {workbooks.map(([k, w]) => (
                  <option key={k} value={k}>
                    {w.label}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-zinc-500">Sheets: {wb.entities.join(', ')}. Parents are matched by English name (e.g. a menu item row needs outlet, menu and category).</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="rounded-lg" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Template
              </Button>
              <Button variant="secondary" size="sm" className="rounded-lg" onClick={exportData}>
                <Download className="h-4 w-4" aria-hidden="true" /> Export current data
              </Button>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Existing rows</p>
              <Segmented label="Duplicate handling" value={mode} onChange={(v) => { setMode(v); setResult(null); }} options={[{ value: 'upsert', label: 'Update existing' }, { value: 'create_only', label: 'Reject duplicates' }]} />
              <p className="mt-1 text-xs text-zinc-500">Rows match by id, or by name within the same parent.</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" tabIndex={-1} aria-label="Spreadsheet file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
            <Button block className="rounded-lg" onClick={() => fileRef.current?.click()} loading={run.isPending && !run.variables}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Upload file & preview
            </Button>
            {fileName && <p className="text-xs text-zinc-500">File: {fileName}</p>}
            {parseError && <p role="alert" className="text-sm text-amber-700">{parseError}</p>}
          </div>
        </Card>
        <Card
          title="2. Preview & confirm"
          actions={
            result && !result.committed && sheets ? (
              <Button size="sm" className="rounded-lg" disabled={result.summary.errors > 0 || result.results.length === 0} loading={run.isPending && run.variables === true} onClick={() => run.mutate(true)}>
                Confirm import
              </Button>
            ) : undefined
          }
        >
          {!result ? (
            <EmptyState title="No file previewed yet" description="Upload a file to see exactly what will be created, updated or rejected." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {result.committed && <Badge tone="success"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Imported</Badge>}
                <Badge tone="info">{result.summary.create} new</Badge>
                <Badge tone="brand">{result.summary.update} updates</Badge>
                <Badge tone={result.summary.errors ? 'danger' : 'success'}>{result.summary.errors} errors</Badge>
              </div>
              {result.summary.errors > 0 && <p className="text-sm text-red-700">Fix the rows below in your file and upload it again — nothing will be imported while errors remain.</p>}
              <div className="max-h-[32rem] overflow-auto rounded-lg border border-black/[0.07]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500 uppercase">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-start">Sheet</th>
                      <th scope="col" className="px-3 py-2 text-start">Row</th>
                      <th scope="col" className="px-3 py-2 text-start">Name</th>
                      <th scope="col" className="px-3 py-2 text-start">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {(errorsOnly.length ? [...errorsOnly, ...result.results.filter((r) => r.action !== 'error')] : result.results).map((r) => (
                      <tr key={`${r.sheet}-${r.row}`} className={cx(r.action === 'error' && 'bg-red-50/60')}>
                        <td className="px-3 py-2 font-mono text-xs">{r.sheet}</td>
                        <td className="px-3 py-2 tabular-nums">{r.row}</td>
                        <td className="px-3 py-2">{r.name || '—'}</td>
                        <td className="px-3 py-2">
                          {r.action === 'error' ? (
                            <span className="flex items-start gap-1.5 text-red-700">
                              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                              {r.errors.join('; ')}
                            </span>
                          ) : (
                            <span className="text-zinc-700">{r.action === 'create' ? 'Will be created' : 'Will update existing'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

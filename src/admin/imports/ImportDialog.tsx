import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload, XCircle } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, downloadFile, errorMessage } from '../../lib/api';
import { Badge, Button, Segmented, Select, Sheet, Toggle, cx } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { templatePath, useImportMutations, useTemplates, type ImportBatch, type ImportMode, type RowAction, type RowResult } from './api';
import { tr, L } from '../i18n';

const ACTION_LABEL: Record<RowAction, string> = { create: 'New', update: 'Update', unchanged: 'No change', skipped: 'Skipped', error: 'Error' };
const ACTION_TONE: Record<RowAction, 'success' | 'info' | 'neutral' | 'warning' | 'danger'> = { create: 'success', update: 'info', unchanged: 'neutral', skipped: 'warning', error: 'danger' };

type Filter = 'all' | 'error' | 'warning' | 'create' | 'update' | 'skipped';

/** Counter tiles of a preview or a finished import. */
export function SummaryTiles({ s }: { s: ImportBatch['summary'] }) {
  const tiles: [string, number, string?][] = [
    ['Rows', s.total],
    ['Valid', s.valid, 'text-emerald-700'],
    ['New', s.create],
    ['Updates', s.update],
    ['No change', s.unchanged],
    ['Skipped', s.skipped],
    ['Warnings', s.warnings, s.warnings ? 'text-amber-700' : undefined],
    ['Errors', s.errors, s.errors ? 'text-red-700' : undefined],
    ['Duplicates', s.duplicates, s.duplicates ? 'text-red-700' : undefined],
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
      {tiles.map(([label, n, tone]) => (
        <div key={label} className="rounded-xl border border-black/[0.06] bg-zinc-50/60 px-3 py-2">
          <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
          <dd className={cx('text-lg font-semibold tabular-nums', tone)}>{n}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Row-by-row outcome with exact Excel row numbers and the column each message refers to. */
export function ResultTable({ results, sheetTitle }: { results: RowResult[]; sheetTitle: (key: string) => string }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(200);
  const counts = useMemo(
    () => ({
      all: results.length,
      error: results.filter((r) => r.action === 'error').length,
      warning: results.filter((r) => r.messages.some((m) => m.level === 'warning')).length,
      create: results.filter((r) => r.action === 'create').length,
      update: results.filter((r) => r.action === 'update').length,
      skipped: results.filter((r) => r.action === 'skipped').length,
    }),
    [results]
  );
  const shown = useMemo(
    () =>
      results.filter((r) =>
        filter === 'all' ? true : filter === 'warning' ? r.messages.some((m) => m.level === 'warning') : r.action === filter
      ),
    [results, filter]
  );
  const multiSheet = new Set(results.map((r) => r.sheet)).size > 1;
  if (!results.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('Filter rows')}>
        {(['all', 'error', 'warning', 'create', 'update', 'skipped'] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            disabled={!counts[f] && f !== 'all'}
            onClick={() => {
              setFilter(f);
              setLimit(200);
            }}
            className={cx(
              'rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40',
              filter === f ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-black/10 bg-white text-zinc-700 hover:bg-zinc-50'
            )}
          >
            {{ all: 'All', error: 'Errors', warning: 'Warnings', create: 'New', update: 'Updates', skipped: 'Skipped' }[f]} ({counts[f]})
          </button>
        ))}
      </div>
      <ul className="space-y-2 sm:hidden">
        {shown.slice(0, limit).map((r) => (
          <li key={`${r.sheet}-${r.row}`} className={cx('rounded-xl border border-black/[0.07] p-3 text-sm', r.action === 'error' && 'border-red-200 bg-red-50/50')}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">{tr('Row {0}', { 0: r.row })}</span>
              <span className="truncate font-mono text-xs">{r.code}</span>
              <Badge tone={ACTION_TONE[r.action]} className="ms-auto">{L(ACTION_LABEL[r.action])}</Badge>
            </div>
            <p className="mt-1 font-medium">{r.name || '—'}{multiSheet && <span className="font-normal text-zinc-500"> · {sheetTitle(r.sheet)}</span>}</p>
            {!!r.messages.length && (
              <ul className="mt-1.5 space-y-1">
                {r.messages.map((m, i) => (
                  <li key={i} className={cx('text-xs', m.level === 'error' ? 'text-red-700' : 'text-amber-800')}>
                    <span className="sr-only">{m.level}: </span>
                    {m.column && <span className="font-mono opacity-80">{m.column} · </span>}
                    {m.message}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-black/[0.07] sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-zinc-50 text-start text-xs text-zinc-500">
            <tr>
              {multiSheet && <th className="px-3 py-2 text-start font-medium">{tr('Sheet')}</th>}
              <th className="px-3 py-2 text-start font-medium">{tr('Row')}</th>
              <th className="px-3 py-2 text-start font-medium">{tr('Code')}</th>
              <th className="px-3 py-2 text-start font-medium">{tr('Name')}</th>
              <th className="px-3 py-2 text-start font-medium">{tr('Result')}</th>
              <th className="px-3 py-2 text-start font-medium">{tr('Details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {shown.slice(0, limit).map((r) => (
              <tr key={`${r.sheet}-${r.row}`} className={cx(r.action === 'error' && 'bg-red-50/50')}>
                {multiSheet && <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{sheetTitle(r.sheet)}</td>}
                <td className="px-3 py-2 font-mono tabular-nums">{r.row}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.code || '—'}</td>
                <td className="max-w-[14rem] truncate px-3 py-2">{r.name || '—'}</td>
                <td className="px-3 py-2">
                  <Badge tone={ACTION_TONE[r.action]}>{L(ACTION_LABEL[r.action])}</Badge>
                </td>
                <td className="px-3 py-2">
                  <ul className="space-y-0.5">
                    {r.messages.map((m, i) => (
                      <li key={i} className={cx('flex gap-1.5 text-xs', m.level === 'error' ? 'text-red-700' : 'text-amber-800')}>
                        {m.level === 'error' ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                        <span>
                          <span className="sr-only">{m.level}: </span>
                          {m.column && <span className="font-mono text-[0.7rem] opacity-80">{m.column} · </span>}
                          {m.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > limit && (
        <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + 500)}>{tr('Show more ({0} remaining)', { 0: shown.length - limit })}</Button>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: NonNullable<ImportBatch['summary']['issues']> }) {
  if (!issues.length) return null;
  return (
    <ul className="space-y-1.5" aria-label={tr('File checks')}>
      {issues.map((i, n) => (
        <li key={n} className={cx('flex gap-2 rounded-lg px-3 py-2 text-sm', i.level === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900')}>
          {i.level === 'error' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>
            {i.sheet && <strong className="font-semibold">{i.sheet}: </strong>}
            {i.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Staged import: choose file and mode → server validation and preview (no
 * writes) → explicit confirmation → result with a route to publishing.
 */
export function ImportDialog({ hid, open, onClose, templates: only }: { hid: string; open: boolean; onClose: () => void; templates?: string[] }) {
  const cat = useTemplates(hid);
  const m = useImportMutations(hid);
  const fb = useFeedback();
  const me = useMe();
  const canPublish = !!me.data?.permissions?.modules.includes('hotel');
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const choices = useMemo(() => {
    const t = (cat.data?.templates ?? []).filter((x) => x.allowed && (!only || only.includes(x.key)));
    return [...((!only || only.includes('master')) && cat.data?.master.allowed ? [{ key: 'master', label: tr('{0} (all sheets)', { 0: cat.data.master.title }) }] : []), ...t.map((x) => ({ key: x.key, label: `${x.number} ${L({ en: x.title, ar: x.title_ar })}` }))];
  }, [cat.data, only]);
  const [template, setTemplate] = useState('');
  const [mode, setMode] = useState<ImportMode>('create_update');
  const [checkImages, setCheckImages] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [drag, setDrag] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open) return;
    setBatch(null);
    setFile(null);
    setNotice('');
  }, [open]);
  useEffect(() => {
    if (choices.length && !choices.some((c) => c.key === template)) setTemplate(choices[0].key);
  }, [choices, template]);

  const sheetTitle = (key: string) => cat.data?.templates.find((t) => t.key === key)?.title ?? key;
  const maxMb = cat.data?.max_file_mb ?? 8;

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) return fb.error(tr('Choose an Excel .xlsx file (use “Save as .xlsx” for older files)'));
    if (f.size > maxMb * 1024 * 1024) return fb.error(tr('The file is larger than {0} MB', { 0: maxMb }));
    setFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const validate = () =>
    file &&
    m.preview.mutate(
      { file, template, mode, checkImages },
      {
        onSuccess: (b) => {
          setBatch(b);
          setNotice('');
        },
        onError: (e) => fb.error(errorMessage(e)),
      }
    );

  const confirm = () =>
    batch &&
    m.commit.mutate(batch.id, {
      onSuccess: (b) => {
        setBatch(b);
        fb.success(tr('Imported: {0} new, {1} updated', { 0: b.summary.create, 1: b.summary.update }));
      },
      onError: (e) => {
        const next = e instanceof ApiError ? (e.details.batch as ImportBatch | undefined) : undefined;
        if (next) {
          setBatch(next);
          setNotice(e.message);
        } else fb.error(errorMessage(e));
      },
    });

  const close = () => {
    if (batch?.status === 'previewed') m.discard.mutate(batch.id);
    onClose();
  };

  const s = batch?.summary;
  const writable = s ? s.create + s.update : 0;
  const step = !batch ? 'upload' : batch.status === 'committed' ? 'done' : 'preview';

  return (
    <Sheet
      open={open}
      onClose={close}
      side="right"
      size="xl"
      title={step === 'done' ? tr('Import complete') : step === 'preview' ? tr('Review the import') : tr('Import from Excel')}
      description={step === 'upload' ? tr('Nothing is saved until you have reviewed the preview and confirmed.') : batch ? `${batch.template_title} · ${batch.filename}` : undefined}
      footer={
        step === 'upload' ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>{tr('Cancel')}</Button>
            <Button onClick={validate} disabled={!file || !template} loading={m.preview.isPending}>
              <Upload className="h-4 w-4" aria-hidden="true" />{' '}{tr('Upload & validate')}</Button>
          </div>
        ) : step === 'preview' ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (batch?.status === 'previewed') m.discard.mutate(batch.id);
                setBatch(null);
                setFile(null);
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />{' '}{tr('Upload a corrected file')}</Button>
            <Button onClick={confirm} loading={m.commit.isPending} disabled={batch?.status !== 'previewed' || !!s?.errors || !writable}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {s?.errors ? tr('Fix the errors to import') : writable ? tr(writable === 1 ? 'Import 1 record' : 'Import {0} records', { 0: writable }) : tr('Nothing to import')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>{tr('Close')}</Button>
            {canPublish && (
              <Link to={`/admin/h/${hid}/publishing`} onClick={onClose} className="inline-flex h-10 items-center rounded-full bg-cta px-5 text-sm font-semibold text-cta-ink hover:bg-cta-hover">{tr('Review & publish')}</Link>
            )}
          </div>
        )
      }
    >
      {step === 'upload' && (
        <div className="space-y-5">
          {choices.length > 1 && (
            <label className="block text-sm font-medium" htmlFor={`${inputId}-t`}>{tr('Template')}<Select id={`${inputId}-t`} className="mt-1.5" value={template} onChange={(e) => setTemplate(e.target.value)}>
                {choices.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            <Button variant="secondary" size="sm" onClick={() => downloadFile(templatePath(hid, template, false)).catch((e) => fb.error(errorMessage(e)))} disabled={!template}>
              <Download className="h-4 w-4" aria-hidden="true" />{' '}{tr('Blank template')}</Button>
            <Button variant="secondary" size="sm" onClick={() => downloadFile(templatePath(hid, template, true)).catch((e) => fb.error(errorMessage(e)))} disabled={!template}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />{' '}{tr('Current data (edit & re-import)')}</Button>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cx('rounded-2xl border-2 border-dashed p-8 text-center transition', drag ? 'border-zinc-900 bg-zinc-50' : 'border-black/15')}
          >
            <FileSpreadsheet className="mx-auto h-10 w-10 text-zinc-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">{file ? file.name : tr('Drop the .xlsx file here')}</p>
            <p className="mt-1 text-xs text-zinc-500">{file ? `${(file.size / 1024).toFixed(0)} KB` : tr('or choose it from your computer · up to {0} MB', { 0: maxMb })}</p>
            <input ref={fileRef} id={inputId} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => fileRef.current?.click()}>
              {file ? tr('Choose another file') : tr('Choose file')}
            </Button>
          </div>
          <Segmented<ImportMode>
            label={tr('Import mode')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'create_update', label: tr('Create + update') },
              { value: 'create_only', label: tr('Create only') },
            ]}
          />
          <p className="-mt-3 text-xs text-zinc-500">
            {mode === 'create_update' ? tr('New codes are added; existing records with the same code are updated. Renaming never creates duplicates.') : tr('Only new records are added. Rows whose code already exists are skipped and reported.')}
          </p>
          <Toggle checked={checkImages} onChange={setCheckImages} label={tr('Check image links')} description={tr('Tests every image URL (reachability and type). Broken links are warnings — rows are still imported.')} />
        </div>
      )}

      {step !== 'upload' && batch && s && (
        <div className="space-y-5">
          {notice && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {notice}
            </p>
          )}
          {step === 'done' ? (
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm">
                {tr('{0} new and {1} updated records saved as a draft.', { 0: s.create, 1: s.update })}{' '}
                {canPublish ? tr('Guests see them after you publish.') : tr('Guests see them after an administrator publishes.')}{' '}
                {tr('The import is in Import History and can be rolled back while the records are unchanged.')}
              </p>
            </div>
          ) : batch.status === 'failed' ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{tr('The file could not be imported. Fix the problems below and upload it again.')}</p>
          ) : s.errors ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {tr(s.errors === 1 ? '1 row has errors. Nothing will be imported until every error is fixed — correct the row in Excel and upload the file again.' : '{0} rows have errors. Nothing will be imported until every error is fixed — correct the rows in Excel and upload the file again.', { 0: s.errors })}
            </p>
          ) : (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{tr('Validation passed.')}{' '}{writable ? tr(writable === 1 ? 'Confirm to import 1 record.' : 'Confirm to import {0} records.', { 0: writable }) : tr('The file matches the current data — there is nothing to import.')}
              {s.warnings ? ` ${tr(s.warnings === 1 ? '1 row has warnings; review it first.' : '{0} rows have warnings; review them first.', { 0: s.warnings })}` : ''}
            </p>
          )}
          <SummaryTiles s={s} />
          {s.notice && <p className="text-xs text-zinc-500">{s.notice}</p>}
          <IssueList issues={s.issues ?? []} />
          <ResultTable results={batch.results ?? []} sheetTitle={sheetTitle} />
        </div>
      )}
    </Sheet>
  );
}

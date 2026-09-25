import { Download, FileSpreadsheet, FileUp, History, RotateCcw, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError, downloadFile, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Segmented, Sheet, Skeleton, cx } from '../../components/ui';
import { useFeedback } from '../feedback';
import { templatePath, useImportBatch, useImportMutations, useImports, useTemplates, type ImportBatch, type TemplateInfo } from '../imports/api';
import { ImportDialog, ResultTable, SummaryTiles } from '../imports/ImportDialog';
import { Card, PageHeader } from '../layout/AdminLayout';
import { tr, L, locale } from '../i18n';

const GROUPS: { title: string; numbers: string[] }[] = [
  { title: 'Hotel & routing', numbers: ['01', '02', '03'] },
  { title: 'Food & beverage', numbers: ['04', '05', '06', '07', '08'] },
  { title: 'Rooms & guest services', numbers: ['09', '16'] },
  { title: 'Wellness & spa', numbers: ['10', '11'] },
  { title: 'Laundry', numbers: ['12', '13', '14', '15'] },
  { title: 'Offers & information', numbers: ['17', '21', '22'] },
  { title: 'Website', numbers: ['18', '19', '20', '23'] },
];

const STATUS: Record<ImportBatch['status'], { label: string; tone: 'success' | 'info' | 'neutral' | 'warning' | 'danger' }> = {
  previewed: { label: 'Awaiting confirmation', tone: 'info' },
  committed: { label: 'Imported', tone: 'success' },
  failed: { label: 'Rejected', tone: 'danger' },
  rolled_back: { label: 'Rolled back', tone: 'warning' },
  discarded: { label: 'Discarded', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
};

const when = (iso: string) => new Date(iso).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' });

function TemplateCard({ t, hid, onImport }: { t: TemplateInfo; hid: string; onImport: () => void }) {
  const fb = useFeedback();
  const dl = (withData: boolean) => downloadFile(templatePath(hid, t.key, withData)).catch((e) => fb.error(errorMessage(e)));
  return (
    <li className="flex flex-col rounded-2xl border border-black/[0.07] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 font-mono text-sm font-semibold text-zinc-700">{t.number}</span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{L({ en: t.title, ar: t.title_ar })}</h3>
          <p dir="rtl" lang="ar" className="text-xs text-zinc-500">
            {t.title_ar}
          </p>
        </div>
        {t.update_only && <Badge className="ms-auto shrink-0">{tr('Updates only')}</Badge>}
      </div>
      <p className="mt-2 flex-1 text-sm text-zinc-600">{tr(t.description)}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => dl(false)} aria-label={tr('Download the {0} template', { 0: t.title })}>
          <Download className="h-4 w-4" aria-hidden="true" />{' '}{tr('Template')}</Button>
        <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => dl(true)} aria-label={tr('Export {0} data', { 0: t.title })}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />{' '}{tr('Export')}</Button>
        <Button size="sm" className="rounded-lg" onClick={onImport} aria-label={tr('Import {0}', { 0: t.title })}>
          <FileUp className="h-4 w-4" aria-hidden="true" />{' '}{tr('Import')}</Button>
      </div>
    </li>
  );
}

function BatchDetail({ hid, id, onClose }: { hid: string; id: string | null; onClose: () => void }) {
  const q = useImportBatch(hid, id);
  const cat = useTemplates(hid);
  const b = q.data;
  return (
    <Sheet open={!!id} onClose={onClose} side="right" size="xl" title={b ? b.template_title : tr('Import')} description={b ? `${b.filename} · ${when(b.created_at)} · ${b.user_email}` : undefined}>
      {q.isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : q.error ? (
        <ErrorState title={tr('Could not load this import')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : b ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Badge>
            <span className="text-zinc-500">{b.mode === 'create_only' ? tr('Create only') : tr('Create + update')}</span>
            {b.committed_at && <span className="text-zinc-500">{tr('· imported {0}', { 0: when(b.committed_at) })}</span>}
            {b.rolled_back_at && <span className="text-zinc-500">{tr('· rolled back {0}', { 0: when(b.rolled_back_at) })}</span>}
          </div>
          <SummaryTiles s={b.summary} />
          {!!b.changes?.length && (
            <Card title={tr('Records changed ({0})', { 0: b.changes.length })}>
              <ul className="max-h-60 space-y-1 overflow-auto text-sm">
                {b.changes.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <Badge tone={c.op === 'create' ? 'success' : 'info'}>{c.op === 'create' ? tr('Created') : tr('Updated')}</Badge>
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <ResultTable results={b.results ?? []} sheetTitle={(k) => cat.data?.templates.find((t) => t.key === k)?.title ?? k} />
        </div>
      ) : null}
    </Sheet>
  );
}

function HistoryTab({ hid }: { hid: string }) {
  const q = useImports(hid);
  const m = useImportMutations(hid);
  const fb = useFeedback();
  const [detail, setDetail] = useState<string | null>(null);

  const rollback = async (b: ImportBatch) => {
    let plan;
    try {
      plan = (await m.rollbackCheck.mutateAsync(b.id)).report;
    } catch (e) {
      return fb.error(errorMessage(e));
    }
    if (plan.conflicts.length) {
      return fb.confirm({
        title: tr('Rollback is not safe'),
        message: tr('{0} record(s) changed after this import ({1}{2}). Undo those edits first, or correct the records manually.', { 0: plan.conflicts.length, 1: plan.conflicts
          .slice(0, 3)
          .map((c) => `${c.label}: ${c.reason}`)
          .join('; '), 2: plan.conflicts.length > 3 ? '…' : '' }),
        confirmLabel: tr('OK'),
      });
    }
    const ok = await fb.confirm({
      title: tr('Roll back this import?'),
      message: tr('{0} record(s) return to how they were before the import{1}. Records the import created are removed. This is a draft change — publish afterwards.', { 0: plan.restored, 1: plan.unchanged ? tr(' ({0} already are)', { 0: plan.unchanged }) : '' }),
      confirmLabel: tr('Roll back'),
      danger: true,
    });
    if (!ok) return;
    m.rollback.mutate(b.id, {
      onSuccess: (r) => fb.success(tr('Rolled back: {0} record(s) restored', { 0: r.report.restored })),
      onError: (e) => fb.error(e instanceof ApiError && e.code === 'rollback_conflict' ? `${e.message}` : errorMessage(e)),
    });
  };

  if (q.isLoading) return <Skeleton className="h-48 rounded-2xl" />;
  if (q.error) return <ErrorState title={tr('Could not load the import history')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const list = q.data?.imports ?? [];
  if (!list.length) return <EmptyState icon={<History className="h-8 w-8" aria-hidden="true" />} title={tr('No imports yet')} description={tr('Every upload is recorded here with who imported what, when, and what changed.')} />;
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">{tr('When')}</th>
              <th className="px-4 py-2.5 text-start font-medium">{tr('Template · file')}</th>
              <th className="px-4 py-2.5 text-start font-medium">{tr('By')}</th>
              <th className="px-4 py-2.5 text-start font-medium">{tr('Status')}</th>
              <th className="px-4 py-2.5 text-end font-medium">{tr('New')}</th>
              <th className="px-4 py-2.5 text-end font-medium">{tr('Updated')}</th>
              <th className="px-4 py-2.5 text-end font-medium">{tr('Skipped')}</th>
              <th className="px-4 py-2.5 text-end font-medium">{tr('Errors')}</th>
              <th className="px-4 py-2.5">
                <span className="sr-only">{tr('Actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {list.map((b) => (
              <tr key={b.id}>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{when(b.created_at)}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{b.template_title}</span>
                  <span className="block max-w-[16rem] truncate text-xs text-zinc-500">{b.filename}</span>
                </td>
                <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-600">{b.user_email}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Badge>
                </td>
                <td className="px-4 py-3 text-end tabular-nums">{b.summary.create ?? 0}</td>
                <td className="px-4 py-3 text-end tabular-nums">{b.summary.update ?? 0}</td>
                <td className="px-4 py-3 text-end tabular-nums">{b.summary.skipped ?? 0}</td>
                <td className={cx('px-4 py-3 text-end tabular-nums', b.summary.errors ? 'text-red-700' : '')}>{b.summary.errors ?? 0}</td>
                <td className="whitespace-nowrap px-4 py-3 text-end">
                  <Button variant="ghost" size="sm" onClick={() => setDetail(b.id)}>{tr('Details')}</Button>
                  {b.status === 'committed' && b.change_count > 0 && (
                    <Button variant="ghost" size="sm" className="text-red-700" onClick={() => rollback(b)} loading={(m.rollbackCheck.isPending || m.rollback.isPending) && m.rollback.variables === b.id}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />{' '}{tr('Roll back')}</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BatchDetail hid={hid} id={detail} onClose={() => setDetail(null)} />
    </>
  );
}

/** Admin → Data Import & Export: template center, uploads and import history. */
export function ImportCenter({ hid }: { hid: string }) {
  const cat = useTemplates(hid);
  const fb = useFeedback();
  const [tab, setTab] = useState<'templates' | 'history'>('templates');
  const [importing, setImporting] = useState<string[] | null>(null);
  const allowed = useMemo(() => (cat.data?.templates ?? []).filter((t) => t.allowed), [cat.data]);
  const masterAllowed = !!cat.data?.master.allowed;
  const dlMaster = (withData: boolean) => downloadFile(templatePath(hid, 'master', withData)).catch((e) => fb.error(errorMessage(e)));

  return (
    <div>
      <PageHeader
        title={tr('Data Import & Export')}
        description={tr('Bulk-manage content with Excel: download a template, fill it, upload it, review the preview with exact row numbers, then confirm. Every import is recorded and can be rolled back.')}
        actions={
          masterAllowed && (
            <>
              <Button variant="secondary" onClick={() => dlMaster(false)}>
                <Download className="h-4 w-4" aria-hidden="true" />{' '}{tr('Master template')}</Button>
              <Button variant="secondary" onClick={() => dlMaster(true)}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />{' '}{tr('Export all')}</Button>
              <Button onClick={() => setImporting([])}>
                <Upload className="h-4 w-4" aria-hidden="true" />{' '}{tr('Import file')}</Button>
            </>
          )
        }
      />
      <div className="mb-5">
        <Segmented
          label={tr('View')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'templates', label: tr('Template center') },
            { value: 'history', label: tr('Import history') },
          ]}
        />
      </div>
      {tab === 'history' ? (
        <HistoryTab hid={hid} />
      ) : cat.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : cat.error ? (
        <ErrorState title={tr('Could not load the templates')} description={errorMessage(cat.error)} onRetry={() => cat.refetch()} />
      ) : !allowed.length ? (
        <EmptyState title={tr('No templates available')} description={tr('Your role does not manage any importable content.')} />
      ) : (
        <div className="space-y-8">
          {masterAllowed && (
            <Card title={cat.data!.master.title} description={tr('One workbook with an Instructions sheet and {0} data sheets. Fill only the sheets you need — parents are imported before the rows that reference them by code.', { 0: cat.data!.master.sheets })}>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => dlMaster(false)}>
                  <Download className="h-4 w-4" aria-hidden="true" />{' '}{tr('Download master template')}</Button>
                <Button variant="secondary" onClick={() => dlMaster(true)}>
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />{' '}{tr('Export all content')}</Button>
                <Button onClick={() => setImporting(['master'])}>
                  <FileUp className="h-4 w-4" aria-hidden="true" />{' '}{tr('Import master workbook')}</Button>
              </div>
            </Card>
          )}
          {GROUPS.map((g) => {
            const list = allowed.filter((t) => g.numbers.includes(t.number));
            if (!list.length) return null;
            return (
              <section key={g.title} aria-labelledby={`grp-${g.numbers[0]}`}>
                <h2 id={`grp-${g.numbers[0]}`} className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {tr(g.title)}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((t) => (
                    <TemplateCard key={t.key} t={t} hid={hid} onImport={() => setImporting([t.key])} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <ImportDialog hid={hid} open={importing !== null} onClose={() => setImporting(null)} templates={importing?.length ? importing : undefined} />
    </div>
  );
}

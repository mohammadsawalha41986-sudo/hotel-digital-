import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import ts from 'typescript';
import { AR } from '../../src/admin/i18n/ar';
import { adminStringsFromShared } from '../../src/admin/i18n/shared';
import { TEMPLATES } from '../../server/services/excel/templates';

/** Server-provided texts the admin renders through tr(): report titles/columns, template descriptions. */
export function serverStrings(): string[] {
  const out = new Set<string>();
  const reports = fs.readFileSync('server/services/reports.ts', 'utf8');
  for (const m of reports.matchAll(/(?:label|title): '([^']+)'/g)) out.add(m[1]);
  for (const t of TEMPLATES) out.add(t.description);
  return [...out];
}

/**
 * Admin localisation coverage. Fails when:
 *  - user-facing English appears in admin JSX without tr(...),
 *  - a tr('literal') has no Arabic translation,
 *  - shared labels rendered in the admin (entity fields, roles, statuses) lack Arabic.
 */
const ROOT = 'src/admin';
const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? (d.name === 'i18n' ? [] : files(path.join(dir, d.name))) : d.name.endsWith('.tsx') ? [path.join(dir, d.name)] : []));

const TEXT_ATTRS = new Set(['sub', 'label', 'title', 'description', 'placeholder', 'aria-label', 'hint', 'confirmLabel', 'optionalLabel', 'closeLabel', 'retryLabel', 'subtitle', 'message', 'alt', 'decLabel', 'incLabel']);
const words = (s: string) => /[A-Za-z]{2,}/.test(s);
/** CSS classes, colours, URLs and font stacks are not user-facing text. */
const technical = (s: string) => /^[a-z0-9:/[\]%.#_-]+(\s[a-z0-9:/[\]%.#_-]+)*$/.test(s) || /^#[0-9a-f]{3,8}$/i.test(s) || /^'[A-Z]/.test(s) || /^https?:\/\/$/.test(s);
const looksText = (s: string) => words(s) && (/\s/.test(s.trim()) || /^[A-Z][a-z]/.test(s)) && !/^[A-Z0-9_]+$/.test(s) && !/^(https?:|\/|#|\.)/.test(s);

const LABEL_PROPS = new Set(['label', 'title', 'description', 'hint', 'help', 'message', 'subtitle']);

export function scan() {
  const raw: string[] = [];
  const keys = new Set<string>();
  /** Module constants rendered through tr()/L(): nav labels, label maps. */
  const constants = new Set<string>();
  for (const f of files(ROOT)) {
    const src = fs.readFileSync(f, 'utf8');
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const where = (n: ts.Node) => `${f}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
    const lines = src.split('\n');
    /** Language names shown in their own language (the switch target) are exempt. */
    const exempt = (n: ts.Node) => /i18n-exempt/.test(lines[sf.getLineAndCharacterOfPosition(n.getStart(sf)).line] ?? '');
    const visit = (n: ts.Node, inTr: boolean) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'tr') {
        const a = n.arguments[0];
        if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) keys.add(a.text);
        n.arguments.slice(1).forEach((x) => visit(x, false));
        return;
      }
      if (!inTr) {
        if (ts.isJsxText(n) && words(n.text) && n.text.trim()) raw.push(`${where(n)} text "${n.text.trim().slice(0, 60)}"`);
        if (ts.isJsxAttribute(n) && TEXT_ATTRS.has(n.name.getText(sf)) && n.initializer) {
          const i = n.initializer;
          const lit = ts.isStringLiteral(i) ? i : ts.isJsxExpression(i) && i.expression && (ts.isStringLiteral(i.expression) || ts.isNoSubstitutionTemplateLiteral(i.expression) || ts.isTemplateExpression(i.expression)) ? i.expression : null;
          const litText = lit && ts.isTemplateExpression(lit) ? lit.head.text + lit.templateSpans.map((x) => x.literal.text).join(' ') : lit ? lit.getText(sf) : '';
          if (lit && words(litText)) raw.push(`${where(n)} ${n.name.getText(sf)}=${lit.getText(sf).slice(0, 60)}`);
        }
        if (ts.isPropertyAssignment(n) && LABEL_PROPS.has(n.name.getText(sf)) && (ts.isStringLiteral(n.initializer) || ts.isNoSubstitutionTemplateLiteral(n.initializer)) && words(n.initializer.text) && !technical(n.initializer.text)) constants.add(n.initializer.text);
        if (ts.isVariableDeclaration(n) && n.type && /Record<[^>]*,\s*string>/.test(n.type.getText(sf)) && n.initializer && ts.isObjectLiteralExpression(n.initializer)) {
          for (const p of n.initializer.properties) if (ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer) && words(p.initializer.text) && !technical(p.initializer.text)) constants.add(p.initializer.text);
        }
        if (ts.isConditionalExpression(n)) {
          for (const b of [n.whenTrue, n.whenFalse]) if (!exempt(b) && (ts.isStringLiteral(b) || ts.isNoSubstitutionTemplateLiteral(b)) && looksText(b.text) && inJsxContext(b)) raw.push(`${where(b)} branch "${b.text.slice(0, 60)}"`);
        }
      }
      ts.forEachChild(n, (c) => visit(c, inTr));
    };
    const inJsxContext = (n: ts.Node) => {
      for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
        if (ts.isJsxAttribute(p)) return TEXT_ATTRS.has(p.name.getText(sf)) || p.name.getText(sf) === 'children';
        if (ts.isJsxExpression(p) && p.parent && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent))) return true;
        if (ts.isCallExpression(p) && /\.(success|error|confirm)$/.test(p.expression.getText(sf))) return true;
      }
      return false;
    };
    visit(sf, false);
  }
  return { raw, keys, constants };
}

describe('admin localisation', () => {
  const { raw, keys, constants } = scan();
  test('no untranslated user-facing English in admin JSX', () => {
    assert.deepEqual(raw, []);
  });
  test('every tr() string has an Arabic translation', () => {
    const missing = [...keys].filter((k) => !(k in AR));
    assert.deepEqual(missing, []);
  });
  test('shared, constant and server-provided labels have Arabic', () => {
    const missing = [...new Set([...adminStringsFromShared(), ...constants, ...serverStrings()])].filter((k) => !(k in AR));
    assert.deepEqual(missing, []);
  });
  test('translations keep their placeholders', () => {
    const bad = Object.entries(AR).filter(([en, ar]) => {
      const a = (en.match(/\{\w+\}/g) ?? []).sort().join();
      const b = (ar.match(/\{\w+\}/g) ?? []).sort().join();
      return a !== b;
    });
    assert.deepEqual(bad.map(([en]) => en), []);
  });
});

describe('API message localisation', () => {
  test('the server message catalogue is current and fully translated', async () => {
    const { list } = await import('../../scripts/extract-server-messages');
    const { SERVER_MESSAGES } = await import('../../src/admin/i18n/serverMessages');
    assert.deepEqual(SERVER_MESSAGES, list, 'run: npx tsx scripts/extract-server-messages.ts --write');
    assert.deepEqual(list.filter((m: string) => !(m in AR)), []);
  });
  test('templated messages are translated with their values', async () => {
    const i18n = await import('../../src/admin/i18n');
    await i18n.setAdminLang('ar');
    try {
      assert.equal(i18n.trMessage('Code ITEM-LATTE is already used'), 'الرمز ITEM-LATTE مستخدم بالفعل');
      assert.equal(i18n.trMessage('Required'), 'مطلوب');
      assert.equal(i18n.trMessage('Something unexpected and dynamic'), 'Something unexpected and dynamic', 'unknown text passes through');
      assert.equal(i18n.tr('Delete {0}?', { 0: 'X' }), 'حذف X؟');
    } finally {
      await i18n.setAdminLang('en');
    }
    assert.equal(i18n.tr('Delete {0}?', { 0: 'X' }), 'Delete X?');
  });
});

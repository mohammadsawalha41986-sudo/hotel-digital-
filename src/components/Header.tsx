import React from 'react';
import { Compass, Download, Copy, Check, QrCode } from 'lucide-react';
import { ROUTE_REGISTRY } from '../routes/routeRegistry';

interface HeaderProps {
  onCopyAllMarkdown: () => void;
  onExportJson: () => void;
  copiedMarkdown: boolean;
  onOpenQRGenerator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onCopyAllMarkdown,
  onExportJson,
  copiedMarkdown,
  onOpenQRGenerator,
}) => {
  return (
    <header id="app-header" className="border-b border-stone-200 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center shadow-xs">
              <Compass size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-stone-900">
                  Hotel Digital Guest Hub
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                  URL Route Map Architecture
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Department-based hierarchy for Rooms, Dining, Services, and WhatsApp dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {onOpenQRGenerator && (
              <button
                id="header-generate-qr-btn"
                onClick={onOpenQRGenerator}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-300/80 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Generate downloadable mobile deep-link QR code"
              >
                <QrCode size={14} className="text-amber-700" />
                <span>Deep-Link QR Code</span>
              </button>
            )}

            <button
              id="header-copy-md-btn"
              onClick={onCopyAllMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-lg transition-colors cursor-pointer"
              title="Copy URL Map formatted as clean Markdown"
            >
              {copiedMarkdown ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedMarkdown ? 'Copied Markdown' : 'Copy Spec Markdown'}</span>
            </button>

            <button
              id="header-export-json-btn"
              onClick={onExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 active:bg-black rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Download official JSON routing manifest"
            >
              <Download size={14} />
              <span>Export Route JSON</span>
            </button>
          </div>
        </div>

        {/* Quick Department Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-3 mt-3 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2 py-1 px-2.5 rounded-md bg-stone-50 border border-stone-200/70">
            <span className="text-stone-500 font-medium">Total Registered:</span>
            <span className="font-semibold text-stone-900">{ROUTE_REGISTRY.length} URLs</span>
          </div>

          <div className="flex items-center gap-2 py-1 px-2.5 rounded-md bg-indigo-50/70 border border-indigo-200/50">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span className="text-indigo-900 font-medium">Rooms Dept:</span>
            <span className="font-semibold text-indigo-700">
              {ROUTE_REGISTRY.filter((r) => r.department === 'rooms').length}
            </span>
          </div>

          <div className="flex items-center gap-2 py-1 px-2.5 rounded-md bg-amber-50/70 border border-amber-200/50">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <span className="text-amber-900 font-medium">Dining Dept:</span>
            <span className="font-semibold text-amber-700">
              {ROUTE_REGISTRY.filter((r) => r.department === 'dining').length}
            </span>
          </div>

          <div className="flex items-center gap-2 py-1 px-2.5 rounded-md bg-emerald-50/70 border border-emerald-200/50">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="text-emerald-900 font-medium">Services Dept:</span>
            <span className="font-semibold text-emerald-700">
              {ROUTE_REGISTRY.filter((r) => r.department === 'services').length}
            </span>
          </div>

          <div className="flex items-center gap-2 py-1 px-2.5 rounded-md bg-green-50/70 border border-green-200/50">
            <span className="w-2 h-2 rounded-full bg-green-600"></span>
            <span className="text-green-900 font-medium">WhatsApp:</span>
            <span className="font-semibold text-green-700">
              {ROUTE_REGISTRY.filter((r) => r.department === 'whatsapp').length}
            </span>
          </div>

          <div className="flex items-center gap-2 py-1 px-2.5 rounded-md bg-stone-100 border border-stone-200/80">
            <span className="w-2 h-2 rounded-full bg-stone-600"></span>
            <span className="text-stone-700 font-medium">Admin & Staff:</span>
            <span className="font-semibold text-stone-900">
              {ROUTE_REGISTRY.filter((r) => r.department === 'admin' || r.department === 'core').length}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

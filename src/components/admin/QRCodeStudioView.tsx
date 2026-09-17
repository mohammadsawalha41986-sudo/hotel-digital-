import React, { useState } from 'react';
import {
  QrCode,
  Download,
  Copy,
  ExternalLink,
  Check,
  DoorClosed,
  Building2,
  Utensils,
  Sparkles,
  Printer,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';

interface QRCodeStudioViewProps {
  hotel: Hotel;
}

export const QRCodeStudioView: React.FC<QRCodeStudioViewProps> = ({ hotel }) => {
  const [qrType, setQrType] = useState<'HOTEL' | 'ROOM' | 'OUTLET' | 'TABLE'>('ROOM');
  const [roomNumber, setRoomNumber] = useState<string>('402');
  const [outletSlug, setOutletSlug] = useState<string>('dining');
  const [tableNumber, setTableNumber] = useState<string>('12');
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const hotelSlug = hotel.slug || hotel.id;

  let targetUrl = `${baseUrl}/h/${hotelSlug}`;
  if (qrType === 'ROOM') {
    targetUrl = `${baseUrl}/h/${hotelSlug}?room=${encodeURIComponent(roomNumber || '402')}`;
  } else if (qrType === 'OUTLET') {
    targetUrl = `${baseUrl}/h/${hotelSlug}/${outletSlug}`;
  } else if (qrType === 'TABLE') {
    targetUrl = `${baseUrl}/h/${hotelSlug}/dining?table=${encodeURIComponent(tableNumber || '1')}`;
  }

  // Generate SVG QR code via public reliable SVG generator API or SVG vector
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    targetUrl
  )}&format=svg`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <QrCode className="text-amber-400" size={20} />
            <span>QR Code Studio & In-Room Desk Tent Generator</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Generate branded guest QR codes with automated room, outlet, or table session parameters.
          </p>
        </div>

        <button
          onClick={handlePrintCard}
          className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-2 border border-stone-700 transition-colors cursor-pointer"
        >
          <Printer size={14} />
          <span>Print Desk Tent Card</span>
        </button>
      </div>

      {/* Main Studio Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Configuration (5 cols) */}
        <div className="lg:col-span-5 bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-5">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            1. Target Context & Location
          </h2>

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'ROOM', label: 'In-Room Desk QR', icon: DoorClosed },
              { id: 'HOTEL', label: 'Property General QR', icon: Building2 },
              { id: 'OUTLET', label: 'Department QR', icon: Sparkles },
              { id: 'TABLE', label: 'Restaurant Table QR', icon: Utensils },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = qrType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setQrType(t.id as any)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-stone-800/80 border-stone-750 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-amber-400' : 'text-stone-500'} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Context Inputs */}
          {qrType === 'ROOM' && (
            <div className="space-y-2 bg-stone-850 p-4 rounded-xl border border-stone-800">
              <label className="block text-xs font-semibold text-stone-200">
                Room / Suite Number
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 402, 1205, Presidential Suite"
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-[11px] text-stone-400">
                Scanning this QR automatically binds the guest session to Room {roomNumber || '402'} and unlocks 24/7 in-room dining, valet laundry, and housekeeping.
              </p>
            </div>
          )}

          {qrType === 'OUTLET' && (
            <div className="space-y-2 bg-stone-850 p-4 rounded-xl border border-stone-800">
              <label className="block text-xs font-semibold text-stone-200">
                Department / Hub
              </label>
              <select
                value={outletSlug}
                onChange={(e) => setOutletSlug(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="dining">Food & Beverage (Dining Hub)</option>
                <option value="wellness">Wellness & Spa (Health Club)</option>
                <option value="laundry">Valet Laundry Hub</option>
                <option value="services">Housekeeping & Rapid Services</option>
                <option value="offers">Privileges & Offers</option>
              </select>
            </div>
          )}

          {qrType === 'TABLE' && (
            <div className="space-y-2 bg-stone-850 p-4 rounded-xl border border-stone-800">
              <label className="block text-xs font-semibold text-stone-200">
                Table Identifier
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. Table 12 (Terrace)"
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          )}

          {/* Generated URL Box */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
              Canonical URL
            </span>
            <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 p-2.5 rounded-xl font-mono text-[11px] text-amber-300 break-all">
              <span className="flex-1 truncate">{targetUrl}</span>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer shrink-0"
                title="Copy Link"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
              <a
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer shrink-0"
                title="Test Link in New Tab"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* Right Col: Printable Luxury Desk Tent Card Preview (7 cols) */}
        <div className="lg:col-span-7 bg-stone-900/90 border border-stone-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
          <div className="w-full flex items-center justify-between text-xs text-stone-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              Guest Desk Tent Card Preview
            </span>
            <span className="text-emerald-400 font-mono text-[11px]">Ready for High-Res Print</span>
          </div>

          {/* Printable Card Container */}
          <div
            id="printable-card"
            className="w-full max-w-sm bg-gradient-to-b from-stone-900 to-stone-950 text-white rounded-2xl p-6 border border-stone-700 shadow-2xl flex flex-col items-center text-center space-y-4 relative overflow-hidden"
          >
            {/* Elegant Top Gold Accent Line */}
            <div className="w-16 h-1 bg-amber-400 rounded-full mb-1" />

            {/* Hotel Brand */}
            <div>
              <h3 className="font-serif font-bold text-lg text-amber-300 tracking-wide">
                {hotel.name_en}
              </h3>
              <p className="text-[11px] text-stone-400 font-light tracking-widest uppercase">
                Digital Guest Concierge
              </p>
            </div>

            {/* Room Identifier Badge */}
            {qrType === 'ROOM' && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-1 rounded-full text-xs font-mono font-bold tracking-wider">
                ROOM {roomNumber || '402'}
              </div>
            )}

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl shadow-md border-4 border-stone-800">
              <img
                src={qrCodeApiUrl}
                alt="Guest Portal QR Code"
                className="w-44 h-44 object-contain"
                crossOrigin="anonymous"
              />
            </div>

            {/* Bilingual Instructions */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-stone-200">
                Scan with your phone camera to access In-Room Dining & Hotel Services
              </p>
              <p className="text-[11px] text-stone-400" dir="rtl">
                امسح الرمز بكاميرا الجوال لطلب قائمة الطعام وخدمات الغرف الفورية
              </p>
            </div>

            {/* WiFi Credential Footer */}
            <div className="w-full pt-3 border-t border-stone-800 flex items-center justify-between text-[10px] text-stone-400 font-mono">
              <span>WiFi: SwissFlora-Guest</span>
              <span>No Password Required</span>
            </div>
          </div>

          {/* Download & Actions */}
          <div className="flex items-center gap-3 pt-2">
            <a
              href={qrCodeApiUrl}
              download={`${hotelSlug}-room-${roomNumber || 'desk'}-qr.svg`}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span>Download SVG</span>
            </a>
            <button
              onClick={handlePrintCard}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-stone-700"
            >
              <Printer size={13} />
              <span>Print Preview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

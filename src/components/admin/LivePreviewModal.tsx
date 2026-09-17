import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ExternalLink,
  X,
  DoorClosed,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';

interface LivePreviewModalProps {
  hotel: Hotel;
  onClose: () => void;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  hotel,
  onClose,
}) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
  const [roomContext, setRoomContext] = useState<string>('402');
  const [isLandscape, setIsLandscape] = useState(false);

  const hotelSlug = hotel.slug || hotel.id;
  const previewUrl = `${window.location.origin}/h/${hotelSlug}${
    roomContext ? `?room=${encodeURIComponent(roomContext)}` : ''
  }`;

  const getFrameWidth = () => {
    if (device === 'desktop') return 'w-full max-w-5xl h-[80vh]';
    if (device === 'tablet') {
      return isLandscape ? 'w-[1024px] h-[768px]' : 'w-[768px] h-[90vh]';
    }
    // mobile
    return isLandscape ? 'w-[667px] h-[375px]' : 'w-[390px] h-[844px] max-h-[85vh]';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Top Device Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Live Responsive Simulator:
          </span>
          <span className="text-amber-400 font-serif font-bold">{hotel.name_en}</span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-stone-850 p-1 rounded-xl border border-stone-800">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              device === 'desktop' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              device === 'tablet' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Tablet size={14} />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              device === 'mobile' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">Mobile (QR)</span>
          </button>
        </div>

        {/* Room Context Input */}
        <div className="flex items-center gap-2 bg-stone-850 px-2.5 py-1 rounded-xl border border-stone-800 text-xs">
          <DoorClosed size={13} className="text-amber-400 shrink-0" />
          <span className="text-stone-400 text-[11px]">Simulate Room:</span>
          <input
            type="text"
            value={roomContext}
            onChange={(e) => setRoomContext(e.target.value)}
            placeholder="e.g. 402 or empty"
            className="bg-transparent font-mono text-white w-20 focus:outline-none"
          />
        </div>

        {/* Rotate + New Tab + Close */}
        <div className="flex items-center gap-2">
          {device !== 'desktop' && (
            <button
              onClick={() => setIsLandscape(!isLandscape)}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
              title="Rotate Device Orientation"
            >
              <RotateCw size={14} />
            </button>
          )}

          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="Open in New Tab"
          >
            <ExternalLink size={14} />
          </a>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="Close Simulator"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-2">
        <div
          className={`${getFrameWidth()} bg-stone-950 border-4 sm:border-8 border-stone-850 rounded-[32px] sm:rounded-[44px] shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300`}
        >
          {/* Mobile Notch Bar */}
          {device === 'mobile' && !isLandscape && (
            <div className="h-6 bg-stone-900 flex items-center justify-center shrink-0">
              <div className="w-24 h-3.5 bg-stone-950 rounded-full" />
            </div>
          )}

          {/* Iframe displaying the portal */}
          <iframe
            src={previewUrl}
            title="Guest Portal Device Simulator"
            className="w-full flex-1 border-0 bg-stone-50"
          />

          {/* Mobile Home Bar */}
          {device === 'mobile' && !isLandscape && (
            <div className="h-4 bg-stone-900 flex items-center justify-center shrink-0">
              <div className="w-28 h-1 bg-stone-600 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

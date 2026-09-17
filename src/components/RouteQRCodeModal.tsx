import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  X,
  Printer,
  Smartphone,
  Sparkles,
  Building2,
  CheckCircle2,
  ChevronDown,
  Layers,
  Search,
} from 'lucide-react';
import { RouteDefinition, ROUTE_REGISTRY } from '../routes/routeRegistry';
import { Hotel } from '../types/hotel';

interface RouteQRCodeModalProps {
  initialRoute?: RouteDefinition | null;
  hotel: Hotel;
  hotelsList?: Hotel[];
  defaultRoomNumber?: string;
  defaultOrderId?: string;
  onClose: () => void;
  onSelectHotel?: (hotel: Hotel) => void;
}

export const RouteQRCodeModal: React.FC<RouteQRCodeModalProps> = ({
  initialRoute,
  hotel,
  hotelsList = [],
  defaultRoomNumber = '402',
  defaultOrderId = 'ORD-8821',
  onClose,
  onSelectHotel,
}) => {
  // Currently selected route
  const [selectedRoute, setSelectedRoute] = useState<RouteDefinition>(
    initialRoute || ROUTE_REGISTRY[0]
  );
  const [routeSearch, setRouteSearch] = useState('');
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);

  // Dynamic parameters
  const [hotelSlug, setHotelSlug] = useState(hotel.slug || hotel.id);
  const [includeRoomNumber, setIncludeRoomNumber] = useState(true);
  const [roomNumber, setRoomNumber] = useState(defaultRoomNumber || '402');
  const [orderId, setOrderId] = useState(defaultOrderId || 'ORD-8821');
  const [venueSlug, setVenueSlug] = useState('azure-rooftop-grill');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ar' | 'none'>('none');
  const [urlFormat, setUrlFormat] = useState<'canonical' | 'hash'>('canonical');

  // QR Customization
  const [cardStyle, setCardStyle] = useState<'card' | 'plain'>('card');
  const [qrSize, setQrSize] = useState<number>(600); // 400 | 600 | 1200
  const [qrColor, setQrColor] = useState<string>('#1c1917'); // Dark obsidian
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync hotelSlug if hotel changes
  useEffect(() => {
    if (hotel) {
      setHotelSlug(hotel.slug || hotel.id);
    }
  }, [hotel]);

  // Update selected route if initialRoute prop changes
  useEffect(() => {
    if (initialRoute) {
      setSelectedRoute(initialRoute);
    }
  }, [initialRoute]);

  // Filter routes for route picker dropdown
  const filteredRoutes = ROUTE_REGISTRY.filter((r) => {
    if (!routeSearch.trim()) return true;
    const q = routeSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.path.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.targetTeam.toLowerCase().includes(q)
    );
  });

  // Calculate resolved deep-link path
  const resolvedPath = selectedRoute.path
    .replace(':hotelSlug', encodeURIComponent(hotelSlug))
    .replace(':roomNumber', encodeURIComponent(roomNumber || '402'))
    .replace(':orderId', encodeURIComponent(orderId || 'ORD-8821'))
    .replace(':venueSlug', encodeURIComponent(venueSlug || 'azure-rooftop-grill'));

  // Build full mobile deep link URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hotel-guest-hub.app';
  
  // Construct query parameters
  const queryParams = new URLSearchParams();
  if (includeRoomNumber && roomNumber && !selectedRoute.path.includes(':roomNumber')) {
    queryParams.set('room', roomNumber);
  }
  if (selectedLanguage !== 'none') {
    queryParams.set('lang', selectedLanguage);
  }
  queryParams.set('source', 'qr');

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  let fullDeepLink = '';
  if (urlFormat === 'hash') {
    fullDeepLink = `${baseUrl}/#${resolvedPath}${queryString}`;
  } else {
    fullDeepLink = `${baseUrl}${resolvedPath}${queryString}`;
  }

  // Draw QR code onto canvas
  useEffect(() => {
    if (!canvasRef.current || !fullDeepLink) return;

    QRCode.toCanvas(
      canvasRef.current,
      fullDeepLink,
      {
        width: 320,
        margin: 2,
        color: {
          dark: qrColor,
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) console.error('Error generating QR canvas:', error);
      }
    );
  }, [fullDeepLink, qrColor]);

  // Copy link handler
  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullDeepLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Open link in new window for testing
  const handleTestLink = () => {
    window.open(fullDeepLink, '_blank', 'noopener,noreferrer');
  };

  // Generate and Download SVG
  const handleDownloadSVG = async () => {
    try {
      setIsDownloading(true);
      const svgString = await QRCode.toString(fullDeepLink, {
        type: 'svg',
        width: qrSize,
        margin: 2,
        color: {
          dark: qrColor,
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${hotelSlug}-${selectedRoute.id}-mobile-qr.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess('SVG Vector downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to export SVG QR code:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Generate and Download PNG (plain QR or complete branded desk tent card)
  const handleDownloadPNG = async () => {
    try {
      setIsDownloading(true);

      if (cardStyle === 'plain') {
        // Generate high-resolution standalone QR code
        const dataUrl = await QRCode.toDataURL(fullDeepLink, {
          width: qrSize,
          margin: 2,
          color: {
            dark: qrColor,
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${hotelSlug}-${selectedRoute.id}-qr-${qrSize}px.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Render luxury hospitality tent/card canvas
        const cardCanvas = document.createElement('canvas');
        const scale = qrSize >= 1000 ? 2 : 1;
        const width = 800 * scale;
        const height = 1050 * scale;
        cardCanvas.width = width;
        cardCanvas.height = height;
        const ctx = cardCanvas.getContext('2d');

        if (!ctx) return;

        // Background: Warm luxury off-white with dark header
        ctx.fillStyle = '#fafaf9'; // stone-50
        ctx.fillRect(0, 0, width, height);

        // Header Background: Dark charcoal #1c1917
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, width, 240 * scale);

        // Golden accent line
        ctx.fillStyle = '#d97706'; // amber-600
        ctx.fillRect(0, 236 * scale, width, 4 * scale);

        // Header Text: Hotel Name
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${28 * scale}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(hotel.name_en || 'Luxury Hotel & Suites', width / 2, 80 * scale);

        ctx.fillStyle = '#e7e5e4';
        ctx.font = `${20 * scale}px sans-serif`;
        ctx.fillText(hotel.name_ar || 'فندق وجناح سويس فلورا الفاخر', width / 2, 125 * scale);

        // Subheader: Hotel Stars & Location
        ctx.fillStyle = '#fbbf24'; // amber-400
        ctx.font = `600 ${14 * scale}px sans-serif`;
        ctx.fillText(
          `★★★★★ • ${hotel.classification_label_en || '5-Star Luxury'} • ${hotel.city_en || 'Riyadh'}`,
          width / 2,
          165 * scale
        );

        // Route Department Pill
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        const pillWidth = 320 * scale;
        const pillHeight = 32 * scale;
        const pillX = (width - pillWidth) / 2;
        const pillY = 185 * scale;
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 16 * scale);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${13 * scale}px sans-serif`;
        ctx.fillText(
          `${selectedRoute.department.toUpperCase()} DEPT • ${selectedRoute.name.toUpperCase()}`,
          width / 2,
          206 * scale
        );

        // Generate QR code onto temporary canvas to stamp onto card
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, fullDeepLink, {
          width: 440 * scale,
          margin: 1,
          color: {
            dark: qrColor,
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });

        // Draw White Container for QR Code with subtle border
        const qrContainerSize = 480 * scale;
        const qrContainerX = (width - qrContainerSize) / 2;
        const qrContainerY = 280 * scale;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.roundRect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, 20 * scale);
        ctx.fill();
        ctx.stroke();

        // Stamp QR image into container
        ctx.drawImage(
          qrCanvas,
          qrContainerX + 20 * scale,
          qrContainerY + 20 * scale,
          440 * scale,
          440 * scale
        );

        // Room Context Badge (if applicable)
        if (includeRoomNumber && roomNumber) {
          ctx.fillStyle = '#fef3c7'; // amber-100
          ctx.strokeStyle = '#fde68a'; // amber-200
          ctx.lineWidth = 1 * scale;
          const badgeWidth = 240 * scale;
          const badgeHeight = 36 * scale;
          const badgeX = (width - badgeWidth) / 2;
          const badgeY = 780 * scale;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 18 * scale);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#92400e'; // amber-800
          ctx.font = `bold ${14 * scale}px sans-serif`;
          ctx.fillText(`ASSIGNED ROOM ${roomNumber}`, width / 2, 803 * scale);
        }

        // Instructions in English and Arabic
        ctx.fillStyle = '#1c1917';
        ctx.font = `bold ${18 * scale}px sans-serif`;
        ctx.fillText('Point Smartphone Camera to Access', width / 2, 850 * scale);

        ctx.fillStyle = '#44403c';
        ctx.font = `${16 * scale}px sans-serif`;
        ctx.fillText('امسح رمز الاستجابة السريعة بكاميرا هاتفك', width / 2, 885 * scale);

        ctx.fillStyle = '#78716c';
        ctx.font = `${12 * scale}px monospace`;
        const displayLink = fullDeepLink.length > 55 ? `${fullDeepLink.substring(0, 52)}...` : fullDeepLink;
        ctx.fillText(displayLink, width / 2, 925 * scale);

        // Footer Border & Wi-Fi Details
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(60 * scale, 960 * scale);
        ctx.lineTo(width - 60 * scale, 960 * scale);
        ctx.stroke();

        ctx.fillStyle = '#78716c';
        ctx.font = `${13 * scale}px sans-serif`;
        const wifiName = (hotel as any).wifiSsid || (hotel as any).wifi_ssid || 'SwissFlora-Guest';
        ctx.fillText(
          `Complimentary High-Speed Wi-Fi: ${wifiName} • Instant Digital Service`,
          width / 2,
          995 * scale
        );

        // Download rendered card
        const cardDataUrl = cardCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = cardDataUrl;
        a.download = `${hotelSlug}-${selectedRoute.id}-tent-card.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setDownloadSuccess('High-resolution PNG downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to export PNG QR code:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Print Card
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="route-qr-code-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 sm:px-7 py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-xs">
              <QrCode size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Route QR & Mobile Deep-Link Generator
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Mobile Deep-Link
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Encodes current hotel slug <span className="font-mono text-amber-300">:{hotelSlug}</span> and route path for instant smartphone camera scanning.
              </p>
            </div>
          </div>

          <button
            id="close-route-qr-modal-btn"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close QR Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Modal Body: Two-Column Responsive Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Route Selection & Parameter Configuration (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Selected Route Card with Quick Switcher */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-xl p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-stone-400" />
                  Target Route
                </span>
                <div className="relative">
                  <button
                    id="switch-route-picker-btn"
                    onClick={() => setIsRouteDropdownOpen(!isRouteDropdownOpen)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer transition-colors"
                  >
                    <span>Change Route ({ROUTE_REGISTRY.length})</span>
                    <ChevronDown size={13} />
                  </button>

                  {/* Route Dropdown Menu */}
                  {isRouteDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 max-h-80 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-xl z-40 p-2 space-y-1">
                      <div className="relative mb-2 px-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={routeSearch}
                          onChange={(e) => setRouteSearch(e.target.value)}
                          placeholder="Search 24+ routes..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                          autoFocus
                        />
                      </div>
                      {filteredRoutes.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedRoute(r);
                            setIsRouteDropdownOpen(false);
                            setRouteSearch('');
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                            selectedRoute.id === r.id
                              ? 'bg-amber-50 text-amber-900 font-semibold'
                              : 'hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold truncate">{r.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 shrink-0">
                              {r.httpMethod}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-stone-500 truncate">{r.path}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Route Specs Header */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                    {selectedRoute.httpMethod}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedRoute.department} Dept
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                    {selectedRoute.subCategory}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedRoute.accessLevel}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-stone-900">{selectedRoute.name}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{selectedRoute.description}</p>
              </div>
            </div>

            {/* 2. Hotel Property Slug & Tenant Settings */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Target Hotel Property Slug
              </label>

              {hotelsList.length > 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hotelsList.map((h) => {
                    const isSelected = (h.slug || h.id) === hotelSlug;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setHotelSlug(h.slug || h.id);
                          if (onSelectHotel) onSelectHotel(h);
                        }}
                        className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-bold truncate">{h.name_en}</div>
                          <div className="text-[10px] font-mono opacity-75">:{h.slug || h.id}</div>
                        </div>
                        {isSelected && <Check size={14} className="text-amber-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs">
                  <Building2 size={15} className="text-stone-400" />
                  <span className="text-stone-500 font-medium">Hotel:</span>
                  <span className="font-bold text-stone-900">{hotel.name_en}</span>
                  <span className="font-mono text-stone-500 ml-auto bg-stone-200 px-2 py-0.5 rounded text-[11px]">
                    :{hotelSlug}
                  </span>
                </div>
              )}
            </div>

            {/* 3. Deep-Link Parameters (Room, Language, Order) */}
            <div className="space-y-3 pt-1 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Dynamic Parameters
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Room Number Context */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="room-number-input" className="text-xs font-semibold text-stone-800">
                      In-Room Parameter
                    </label>
                    <input
                      type="checkbox"
                      id="include-room-check"
                      checked={includeRoomNumber}
                      onChange={(e) => setIncludeRoomNumber(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <input
                    id="room-number-input"
                    type="text"
                    value={roomNumber}
                    disabled={!includeRoomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 402"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-stone-500">
                    Binds the mobile session to room for auto-ordering.
                  </p>
                </div>

                {/* Preferred Language */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                  <label className="text-xs font-semibold text-stone-800 block">
                    Language Handoff
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('none')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        selectedLanguage === 'none'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('en')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        selectedLanguage === 'en'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('ar')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        selectedLanguage === 'ar'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      عربي (RTL)
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">Forces initial language when camera opens.</p>
                </div>
              </div>

              {/* Path specific parameters if needed */}
              {selectedRoute.path.includes(':venueSlug') && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <label className="text-xs font-semibold text-stone-800 block mb-1">
                    Venue Slug (:venueSlug)
                  </label>
                  <input
                    type="text"
                    value={venueSlug}
                    onChange={(e) => setVenueSlug(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 font-mono"
                  />
                </div>
              )}

              {selectedRoute.path.includes(':orderId') && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <label className="text-xs font-semibold text-stone-800 block mb-1">
                    Order ID (:orderId)
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 font-mono"
                  />
                </div>
              )}
            </div>

            {/* 4. Resolved Mobile Deep-Link Preview Box */}
            <div className="space-y-2 pt-1 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone size={13} className="text-stone-400" />
                  Encoded Deep-Link URL
                </span>
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setUrlFormat('canonical')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      urlFormat === 'canonical'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Direct Path
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrlFormat('hash')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      urlFormat === 'hash'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Hash Anchor
                  </button>
                </div>
              </div>

              <div className="bg-stone-900 rounded-xl p-3 border border-stone-800 text-xs font-mono text-stone-200 break-all select-all flex items-start justify-between gap-3">
                <span className="text-amber-300">{fullDeepLink}</span>
                <div className="flex items-center gap-1.5 shrink-0 self-center">
                  <button
                    id="copy-deep-link-url-btn"
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
                    title="Copy full URL to clipboard"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <button
                    id="test-deep-link-url-btn"
                    onClick={handleTestLink}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
                    title="Open in new tab to test"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live QR Preview & Download Actions (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-between bg-stone-50/70 border border-stone-200 rounded-2xl p-5 space-y-4">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Live QR Preview
              </span>

              {/* Card Style Selector */}
              <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCardStyle('card')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    cardStyle === 'card'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Desk Tent Card
                </button>
                <button
                  type="button"
                  onClick={() => setCardStyle('plain')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    cardStyle === 'plain'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Plain QR
                </button>
              </div>
            </div>

            {/* QR Card Container */}
            <div
              id="qr-preview-container"
              className={`w-full max-w-[320px] bg-white rounded-2xl border border-stone-200/90 shadow-md p-4 text-center transition-all flex flex-col items-center justify-center ${
                cardStyle === 'card' ? 'ring-1 ring-stone-900/5' : ''
              }`}
            >
              {cardStyle === 'card' && (
                <div className="w-full mb-3 pb-2.5 border-b border-stone-100">
                  <div className="text-[11px] font-bold text-amber-600 tracking-wider uppercase">
                    {hotel.name_en}
                  </div>
                  <div className="text-[10px] text-stone-500 font-sans">
                    {selectedRoute.name}
                  </div>
                </div>
              )}

              {/* The Live Rendered Canvas */}
              <div className="bg-white p-2 rounded-xl shadow-2xs border border-stone-100">
                <canvas
                  ref={canvasRef}
                  className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] mx-auto block"
                />
              </div>

              {cardStyle === 'card' && (
                <div className="w-full mt-3 pt-2.5 border-t border-stone-100 space-y-1">
                  {includeRoomNumber && roomNumber && (
                    <div className="inline-block bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 mb-1">
                      Room {roomNumber}
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-stone-800 leading-tight">
                    Scan with camera for instant service
                  </p>
                  <p className="text-[10px] text-stone-500" dir="rtl">
                    امسح الرمز بكاميرا الجوال للدخول المباشر
                  </p>
                </div>
              )}
            </div>

            {/* Customization Options (Color & Resolution) */}
            <div className="w-full space-y-3 pt-2 border-t border-stone-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-600">Color Theme:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { color: '#1c1917', name: 'Obsidian' },
                    { color: '#b45309', name: 'Amber' },
                    { color: '#1e1b4b', name: 'Navy' },
                    { color: '#064e3b', name: 'Emerald' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setQrColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                        qrColor === c.color ? 'border-amber-400 scale-110 shadow-xs' : 'border-transparent'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-600">Export Resolution:</span>
                <select
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-800 font-medium cursor-pointer"
                >
                  <option value={400}>Web (400px)</option>
                  <option value={600}>Print Tent (600px)</option>
                  <option value={1200}>Ultra HD (1200px)</option>
                </select>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="w-full space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="download-png-qr-btn"
                  onClick={handleDownloadPNG}
                  disabled={isDownloading}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Download PNG</span>
                </button>

                <button
                  id="download-svg-qr-btn"
                  onClick={handleDownloadSVG}
                  disabled={isDownloading}
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Download SVG</span>
                </button>
              </div>

              <button
                id="print-tent-card-btn"
                onClick={handlePrint}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-stone-200 transition-colors cursor-pointer"
              >
                <Printer size={13} />
                <span>Print Desk Card</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 px-5 sm:px-7 py-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-amber-500" />
            <span>
              QR encodes path <span className="font-mono text-stone-700">{resolvedPath}</span> with active tenant slug <span className="font-mono text-stone-700">{hotelSlug}</span>.
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Generator
          </button>
        </div>
      </div>
    </div>
  );
};

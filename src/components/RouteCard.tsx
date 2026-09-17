import React, { useState } from 'react';
import { Copy, Check, Clock, Users, ChevronDown, ChevronUp, Lock, Globe, MessageSquare, QrCode } from 'lucide-react';
import { RouteDefinition } from '../routes/routeRegistry';

interface RouteCardProps {
  route: RouteDefinition;
  hotelSlug: string;
  roomNumber: string;
  orderId: string;
  onGenerateQR?: (route: RouteDefinition) => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  hotelSlug,
  roomNumber,
  orderId,
  onGenerateQR,
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Dynamically resolve URL path
  const resolvedPath = route.path
    .replace(':hotelSlug', hotelSlug)
    .replace(':roomNumber', roomNumber)
    .replace(':orderId', orderId)
    .replace(':venueSlug', 'azure-rooftop-grill');

  const handleCopy = () => {
    navigator.clipboard.writeText(resolvedPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDepartmentBadge = (dept: string) => {
    switch (dept) {
      case 'rooms':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'dining':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'services':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'whatsapp':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'POST':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'VIEW':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div
      id={`route-card-${route.id}`}
      className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-xs hover:border-stone-300 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase ${getMethodBadge(
                route.httpMethod
              )}`}
            >
              {route.httpMethod}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border capitalize ${getDepartmentBadge(
                route.department
              )}`}
            >
              {route.department} Department
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/60 text-stone-600 font-medium">
              {route.subCategory}
            </span>
          </div>

          <h3 className="text-base font-bold text-stone-900 tracking-tight">{route.name}</h3>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 px-2 py-1 rounded-md bg-stone-100/70 border border-stone-200/50">
            {route.accessLevel === 'Guest' ? <Globe size={12} /> : <Lock size={12} />}
            {route.accessLevel}
          </span>

          <button
            id={`generate-qr-btn-${route.id}`}
            onClick={() => onGenerateQR?.(route)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-300/80 transition-colors cursor-pointer shadow-2xs"
            title="Generate downloadable mobile deep-link QR code"
          >
            <QrCode size={13} className="text-amber-700" />
            <span>QR Code</span>
          </button>

          <button
            id={`copy-url-btn-${route.id}`}
            onClick={handleCopy}
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
            title="Copy resolved URL"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <p className="text-xs text-stone-600 leading-relaxed mb-3">{route.description}</p>

      {/* URL Display Box */}
      <div className="bg-stone-50/80 border border-stone-200/80 rounded-lg p-3 font-mono text-xs mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-stone-500 text-[11px] font-sans">
          <span>Canonical Template:</span>
          <span className="font-mono text-stone-700">{route.path}</span>
        </div>
        <div className="flex items-center justify-between text-stone-900 font-semibold pt-1 border-t border-stone-200/60">
          <span className="text-stone-500 text-[11px] font-sans font-normal">Live Resolved URL:</span>
          <span className="text-stone-900 select-all">{resolvedPath}</span>
        </div>
      </div>

      {/* Footer Info: Team & SLA */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
        <div className="flex items-center gap-1.5 text-stone-600">
          <Users size={13} className="text-stone-400" />
          <span>Team: </span>
          <span className="font-medium text-stone-800">{route.targetTeam}</span>
        </div>

        {route.slaTarget && (
          <div className="flex items-center gap-1.5 text-amber-700 font-medium">
            <Clock size={13} />
            <span>SLA: {route.slaTarget}</span>
          </div>
        )}

        <button
          id={`toggle-details-btn-${route.id}`}
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 font-medium cursor-pointer ml-auto"
        >
          <span>{expanded ? 'Hide Specs' : 'View Specs'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expandable Technical Specs */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-100 text-xs space-y-3 bg-stone-50/50 p-3 rounded-lg">
          {route.pathParams.length > 0 && (
            <div>
              <span className="font-semibold text-stone-700 block mb-1">Path Parameters:</span>
              <div className="space-y-1">
                {route.pathParams.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-stone-600 font-mono text-[11px]">
                    <span className="font-bold text-indigo-700">:{p.name}</span>
                    <span className="text-stone-400">({p.type})</span>
                    <span className="font-sans text-stone-600">— {p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {route.queryParams && route.queryParams.length > 0 && (
            <div>
              <span className="font-semibold text-stone-700 block mb-1">Query Parameters:</span>
              <div className="space-y-1">
                {route.queryParams.map((q) => (
                  <div key={q.name} className="flex items-center gap-2 text-stone-600 font-mono text-[11px]">
                    <span className="font-bold text-amber-700">?{q.name}</span>
                    <span className="text-stone-400">({q.type})</span>
                    <span className="font-sans text-stone-600">— {q.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {route.whatsappDeepLinkTemplate && (
            <div>
              <span className="font-semibold text-green-800 flex items-center gap-1 mb-1">
                <MessageSquare size={13} />
                WhatsApp Department Handoff Template:
              </span>
              <code className="block p-2 bg-white rounded border border-stone-200 text-[11px] font-mono text-stone-700 break-all">
                {route.whatsappDeepLinkTemplate
                  .replace('{hotelWaNumber}', '+18005550199')
                  .replace('{roomNumber}', roomNumber)
                  .replace('{orderId}', orderId)
                  .replace('{items}', 'Extra Towels, Down Pillows')
                  .replace('{issueDescription}', 'Air conditioning cooling slowly')}
              </code>
            </div>
          )}

          {route.legacyAlternative && (
            <div className="text-[11px] text-stone-500">
              <span className="font-semibold text-stone-700">Replaced Legacy Route: </span>
              <span className="line-through">{route.legacyAlternative}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';

interface MediaItem {
  id: string;
  title: string;
  category: 'rooms' | 'dining' | 'wellness' | 'hero' | 'documents';
  url: string;
  dimensions?: string;
  size?: string;
  created_at: string;
}

const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'm-1',
    title: 'Swiss Flora Exterior Grand Facade',
    category: 'hero',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=85',
    dimensions: '2000 x 1333',
    size: '1.4 MB',
    created_at: '2026-03-01',
  },
  {
    id: 'm-2',
    title: 'Royal Penthouse Suite Master Bedroom',
    category: 'rooms',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1200 x 800',
    size: '850 KB',
    created_at: '2026-03-02',
  },
  {
    id: 'm-3',
    title: 'Flora Royal Fine Dining Cloche Plating',
    category: 'dining',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1200 x 800',
    size: '720 KB',
    created_at: '2026-03-03',
  },
  {
    id: 'm-4',
    title: 'Serenity Spa Traditional Moroccan Hammam',
    category: 'wellness',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1200 x 800',
    size: '910 KB',
    created_at: '2026-03-04',
  },
  {
    id: 'm-5',
    title: 'The Palm Court Afternoon Tea Tier',
    category: 'dining',
    url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1200 x 800',
    size: '640 KB',
    created_at: '2026-03-05',
  },
  {
    id: 'm-6',
    title: 'Valet Laundry Italian Steam Press Facility',
    category: 'hero',
    url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1200 x 800',
    size: '800 KB',
    created_at: '2026-03-06',
  },
];

interface MediaLibraryViewProps {
  hotel: Hotel;
  onMarkUnpublishedChanges: () => void;
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({
  hotel: _hotel,
  onMarkUnpublishedChanges,
}) => {
  const [items, setItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const filteredItems = items.filter((it) => {
    if (activeCategory === 'all') return true;
    return it.category === activeCategory;
  });

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    onMarkUnpublishedChanges();
  };

  const handleUploadSimulate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newItem: MediaItem = {
      id: `m-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      category: 'dining',
      url: URL.createObjectURL(file),
      dimensions: '1920 x 1080',
      size: `${(file.size / 1024).toFixed(0)} KB`,
      created_at: new Date().toISOString().split('T')[0],
    };

    setItems([newItem, ...items]);
    onMarkUnpublishedChanges();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ImageIcon className="text-amber-400" size={20} />
            <span>Media & Assets Library</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Manage high-resolution imagery, culinary photography, and documents for the hotel guest hub.
          </p>
        </div>

        <label className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs">
          <UploadCloud size={14} />
          <span>Upload Image</span>
          <input type="file" accept="image/*" onChange={handleUploadSimulate} className="hidden" />
        </label>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['all', 'hero', 'rooms', 'dining', 'wellness', 'documents'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Media Assets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden flex flex-col group hover:border-stone-700 transition-all shadow-xs"
          >
            {/* Image Preview Container */}
            <div className="relative aspect-video bg-stone-950 overflow-hidden">
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setPreviewItem(item)}
                  className="p-2 rounded-lg bg-stone-900/90 text-white hover:bg-stone-800 transition-colors"
                  title="Preview"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handleCopy(item.id, item.url)}
                  className="p-2 rounded-lg bg-stone-900/90 text-white hover:bg-stone-800 transition-colors"
                  title="Copy URL"
                >
                  {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Asset Info */}
            <div className="p-3 flex-1 flex flex-col justify-between text-xs space-y-2">
              <div>
                <h3 className="font-bold text-stone-200 truncate">{item.title}</h3>
                <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1 font-mono">
                  <span className="uppercase text-amber-400">{item.category}</span>
                  <span>{item.dimensions || item.size}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                <button
                  onClick={() => handleCopy(item.id, item.url)}
                  className="text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <span className="text-emerald-400">Copied!</span>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-stone-500 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Delete Asset"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-3xl w-full p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">{previewItem.title}</span>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <img src={previewItem.url} alt="" className="w-full max-h-[70vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};

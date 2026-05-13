'use client';

import { useState, useRef } from 'react';
import { Client, FabricItem, useStudio } from '@/context/StudioContext';
import { uploadToImageKit } from '@/lib/imagekit';

interface FabricTabProps {
  client: Client;
}

const FABRIC_TYPES = ['Kente Pattern', 'Lace & Silk', 'Cotton Print', 'Linen', 'Brocade', 'Other'];

const inputCls = 'w-full bg-white border border-border/60 rounded-lg h-11 px-4 text-sm text-charcoal focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted';
const textareaCls = 'w-full bg-white border border-border/60 rounded-lg p-4 text-sm text-charcoal focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted resize-none';

export default function FabricTab({ client }: FabricTabProps) {
  const { updateClient, addTimelineEvent } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fabrics: FabricItem[] = client.fabrics || [];

  // Dynamic category tabs based on uploaded fabric types
  const uploadedTypes = [...new Set(fabrics.map(f => f.type))];
  const categories = ['All Uploads', ...uploadedTypes];
  const [activeCategory, setActiveCategory] = useState('All Uploads');

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', vendor: '', type: FABRIC_TYPES[0], description: '', receivedDate: '',
  });

  const displayedFabrics = activeCategory === 'All Uploads'
    ? fabrics
    : fabrics.filter(f => f.type === activeCategory);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPendingPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile) { alert('Please select a fabric image first.'); return; }
    setIsUploading(true);
    try {
      const result = await uploadToImageKit(pendingFile, `fabric-${client.name}-${Date.now()}`);
      const newFabric: FabricItem = {
        id: `f-${Date.now()}`,
        name: form.name || 'Unnamed Fabric',
        vendor: form.vendor,
        type: form.type,
        description: form.description,
        image: result.url,
        addedAt: new Date().toISOString(),
        ...(form.receivedDate ? { receivedDate: form.receivedDate } : {}),
      };

      const updatedFabrics = [...fabrics, newFabric];
      const isFirstReceived = !!form.receivedDate && !client.fabricReceived;

      updateClient(client.id, {
        fabrics: updatedFabrics,
        ...(isFirstReceived ? { fabricReceived: true } : {}),
      });

      if (isFirstReceived) {
        addTimelineEvent(
          client.id,
          'Fabric Received',
          `Fabric "${newFabric.name}"${newFabric.vendor ? ` from ${newFabric.vendor}` : ''} received on ${form.receivedDate}.`,
        );
      }

      // Switch to the new fabric's type tab
      if (!uploadedTypes.includes(form.type)) {
        setActiveCategory(form.type);
      } else {
        setActiveCategory(form.type);
      }

      setForm({ name: '', vendor: '', type: FABRIC_TYPES[0], description: '', receivedDate: '' });
      setPendingFile(null);
      setPendingPreview(null);
    } catch {
      alert('Failed to upload fabric image. Please check your connection.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetReceived = (fabricId: string, receivedDate: string) => {
    const updatedFabrics = fabrics.map(f =>
      f.id === fabricId ? { ...f, receivedDate } : f
    );
    const isFirstReceived = !client.fabricReceived;
    updateClient(client.id, {
      fabrics: updatedFabrics,
      ...(isFirstReceived ? { fabricReceived: true } : {}),
    });
    if (isFirstReceived) {
      const fab = fabrics.find(f => f.id === fabricId);
      addTimelineEvent(
        client.id,
        'Fabric Received',
        `Fabric "${fab?.name || 'fabric'}"${fab?.vendor ? ` from ${fab.vendor}` : ''} marked as received.`,
      );
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-extrabold text-charcoal">Fabric Library</h1>
        <p className="text-muted mt-0.5 text-sm">{fabrics.length} fabric{fabrics.length !== 1 ? 's' : ''} uploaded</p>
      </div>

      {/* Dynamic Category Tabs */}
      {fabrics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-canvas text-gray hover:bg-border/40'
              }`}
            >
              {cat}
              {cat !== 'All Uploads' && (
                <span className="ml-1.5 text-[10px] opacity-75">
                  ({fabrics.filter(f => f.type === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fabric Gallery */}
      {fabrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-primary/20 rounded-xl">
          <span className="material-symbols-outlined text-5xl text-border mb-3">texture</span>
          <p className="text-muted text-sm font-medium">No fabrics uploaded yet.</p>
          <p className="text-muted text-xs mt-1">Use the upload form below to add fabric details and photos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedFabrics.map((fabric) => (
            <FabricCard
              key={fabric.id}
              fabric={fabric}
              onPreview={() => setSelectedPhoto(fabric.image)}
              onSetReceived={handleSetReceived}
            />
          ))}
          {displayedFabrics.length === 0 && (
            <div className="col-span-full py-10 text-center text-muted text-sm font-medium">
              No {activeCategory} uploaded yet.
            </div>
          )}
        </div>
      )}

      {/* Quick Fabric Upload Form */}
      <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
        <h3 className="font-bold text-charcoal mb-5 flex items-center gap-2 text-lg">
          <span className="material-symbols-outlined text-primary">cloud_upload</span>
          Upload Fabric
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-1.5">Fabric Name</label>
              <input
                className={inputCls}
                placeholder="e.g. Sika Futuro Kente"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-1.5">Vendor Name</label>
              <input
                className={inputCls}
                placeholder="e.g. Kumasi Artisans Co."
                value={form.vendor}
                onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-1.5">Fabric Type</label>
              <select
                className={inputCls}
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {FABRIC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-1.5">
                Received Date
                <span className="ml-1 normal-case font-normal text-muted text-[10px]">(optional — marks fabric as received)</span>
              </label>
              <input
                type="date"
                className={inputCls}
                value={form.receivedDate}
                onChange={e => setForm(p => ({ ...p, receivedDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-1.5">Notes & Description</label>
              <textarea
                className={textareaCls}
                rows={4}
                placeholder="Describe pattern, weaving technique, texture, care instructions..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Image picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-1.5">Fabric Photo</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex items-center justify-center w-full h-32 rounded-lg border-2 border-dashed transition-colors cursor-pointer overflow-hidden
                  ${pendingPreview ? 'border-primary' : 'border-border/60 hover:border-primary/50 hover:bg-primary/5'}`}
              >
                {pendingPreview ? (
                  <img src={pendingPreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted">
                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                    <span className="text-xs font-medium">Tap to select photo</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-md hover:bg-[#E5C04A] disabled:opacity-60 transition-all"
              >
                {isUploading ? (
                  <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-lg">upload</span>
                )}
                {isUploading ? 'Uploading...' : 'Upload Fabric'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox — full screen */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[200] bg-black flex flex-col"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Fabric Preview</p>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <img
              src={selectedPhoto}
              alt="Fabric preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── FabricCard ──────────────────────────────────────────────────────────────

interface FabricCardProps {
  fabric: FabricItem;
  onPreview: () => void;
  onSetReceived: (id: string, date: string) => void;
}

function FabricCard({ fabric, onPreview, onSetReceived }: FabricCardProps) {
  const [editingDate, setEditingDate] = useState(false);
  const [dateVal, setDateVal] = useState(fabric.receivedDate || '');

  return (
    <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-primary/5 flex flex-col">
      {/* Image */}
      <div
        onClick={onPreview}
        className="relative w-full aspect-square overflow-hidden cursor-pointer"
      >
        <div
          className="w-full h-full bg-center bg-cover transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url('${fabric.image}')` }}
        />
        <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
          {fabric.type}
        </div>
        {fabric.receivedDate && (
          <div className="absolute bottom-3 left-3 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[11px]">check_circle</span>
            Received
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-1">
        <h3 className="font-bold text-charcoal text-[15px] leading-tight">{fabric.name}</h3>
        {fabric.vendor && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-[13px]">storefront</span>
            <p className="text-[12px] text-gray font-medium">{fabric.vendor}</p>
          </div>
        )}
        {fabric.description && (
          <p className="text-xs text-muted italic line-clamp-2 mt-1">&ldquo;{fabric.description}&rdquo;</p>
        )}

        {/* Received Date */}
        <div className="mt-2 pt-2 border-t border-border/50">
          {fabric.receivedDate ? (
            <p className="text-xs text-success font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">event_available</span>
              Received: {new Date(fabric.receivedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          ) : editingDate ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="flex-1 text-xs border border-border/60 rounded-lg h-8 px-2 focus:ring-1 focus:ring-primary outline-none"
                value={dateVal}
                onChange={e => setDateVal(e.target.value)}
                autoFocus
              />
              <button
                onClick={() => { if (dateVal) { onSetReceived(fabric.id, dateVal); setEditingDate(false); } }}
                className="px-2 py-1 rounded-lg bg-primary text-white text-xs font-bold"
              >Save</button>
              <button onClick={() => setEditingDate(false)} className="text-muted text-xs">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className="text-xs text-muted hover:text-primary font-medium flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">event</span>
              Mark as received
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

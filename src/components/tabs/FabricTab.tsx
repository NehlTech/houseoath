'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Client, FabricItem, useStudio } from '@/context/StudioContext';
import { uploadToImageKit } from '@/lib/imagekit';

interface FabricTabProps {
  client: Client;
}

interface CropBox { x: number; y: number; w: number; h: number; }

const FABRIC_TYPES = ['Kente Pattern', 'Lace & Silk', 'Cotton Print', 'Linen', 'Brocade', 'Other'];

const inputCls = 'w-full bg-white border border-border/60 rounded-lg h-11 px-4 text-sm text-charcoal focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted';
const textareaCls = 'w-full bg-white border border-border/60 rounded-lg p-4 text-sm text-charcoal focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted resize-none';

export default function FabricTab({ client }: FabricTabProps) {
  const { updateClient, addTimelineEvent } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const fabrics: FabricItem[] = client.fabrics || [];

  const uploadedTypes = [...new Set(fabrics.map(f => f.type))];
  const categories = ['All Uploads', ...uploadedTypes];
  const [activeCategory, setActiveCategory] = useState('All Uploads');

  // Lightbox + crop state
  const [lightboxFabric, setLightboxFabric] = useState<FabricItem | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [isSavingCrop, setIsSavingCrop] = useState(false);

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

      setActiveCategory(form.type);
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

  // ── Crop drag handlers ────────────────────────────────────────────────────
  const startHandleDrag = (handle: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = { ...cropBox };
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;
      let { x, y, w, h } = startBox;
      if (handle === 'tl' || handle === 'bl' || handle === 'l') {
        const nx = Math.max(0, Math.min(startBox.x + dx, startBox.x + startBox.w - 0.05));
        w = startBox.w - (nx - startBox.x); x = nx;
      }
      if (handle === 'tr' || handle === 'br' || handle === 'r') {
        w = Math.max(0.05, Math.min(startBox.w + dx, 1 - startBox.x));
      }
      if (handle === 'tl' || handle === 'tr' || handle === 't') {
        const ny = Math.max(0, Math.min(startBox.y + dy, startBox.y + startBox.h - 0.05));
        h = startBox.h - (ny - startBox.y); y = ny;
      }
      if (handle === 'bl' || handle === 'br' || handle === 'b') {
        h = Math.max(0.05, Math.min(startBox.h + dy, 1 - startBox.y));
      }
      setCropBox({ x, y, w, h });
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startBoxDrag = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = { ...cropBox };
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;
      setCropBox({
        x: Math.max(0, Math.min(startBox.x + dx, 1 - startBox.w)),
        y: Math.max(0, Math.min(startBox.y + dy, 1 - startBox.h)),
        w: startBox.w, h: startBox.h,
      });
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ── Apply crop — updates the fabric's image in place ──────────────────────
  const handleApplyCrop = async () => {
    const img = imgRef.current;
    if (!img || !lightboxFabric) return;
    setIsSavingCrop(true);
    try {
      const canvas = document.createElement('canvas');
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      canvas.width = Math.round(cropBox.w * nw);
      canvas.height = Math.round(cropBox.h * nh);
      const ctx = canvas.getContext('2d');
      if (!ctx) { setIsSavingCrop(false); return; }
      ctx.drawImage(img, Math.round(cropBox.x * nw), Math.round(cropBox.y * nh), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) { setIsSavingCrop(false); return; }
        try {
          const file = new File([blob], `cropped-fabric-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const result = await uploadToImageKit(file, `fabric-crop-${client.name}-${Date.now()}`);
          const updatedFabrics = fabrics.map(f =>
            f.id === lightboxFabric.id ? { ...f, image: result.url } : f
          );
          updateClient(client.id, { fabrics: updatedFabrics });
          setCropMode(false);
          setLightboxFabric(null);
        } catch {
          alert('Failed to save cropped image. Please check your connection.');
        }
        setIsSavingCrop(false);
      }, 'image/jpeg', 0.95);
    } catch {
      alert('Failed to crop. Please try again.');
      setIsSavingCrop(false);
    }
  };

  const closeLightbox = () => { setLightboxFabric(null); setCropMode(false); };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-extrabold text-charcoal">Fabric Library</h1>
        <p className="text-muted mt-0.5 text-sm">{fabrics.length} fabric{fabrics.length !== 1 ? 's' : ''} uploaded</p>
      </div>

      {/* Category Tabs */}
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
              onPreview={() => { setLightboxFabric(fabric); setCropMode(false); setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); }}
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

      {/* Upload Form */}
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

      {/* ── Lightbox + Crop — portal on body (escapes overflow containers) ── */}
      {lightboxFabric && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#111', display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0, background: 'rgba(0,0,0,0.7)', gap: 8 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lightboxFabric.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: 0 }}>
                {lightboxFabric.type}{cropMode ? ' — drag handles to adjust' : ' · Tap outside to close'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {!cropMode ? (
                <button
                  onClick={() => { setCropMode(true); setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>crop</span>
                  Crop
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setCropMode(false)}
                    style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyCrop}
                    disabled={isSavingCrop}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#d4af35', border: 'none', borderRadius: 8, color: '#fff', cursor: isSavingCrop ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, opacity: isSavingCrop ? 0.65 : 1 }}
                  >
                    {isSavingCrop
                      ? <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span> Saving...</>
                      : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span> Save Crop</>
                    }
                  </button>
                </>
              )}
              <button
                onClick={closeLightbox}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', flexShrink: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
          </div>

          {/* Content area */}
          <div
            style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            onClick={cropMode ? undefined : closeLightbox}
          >
            {/* View mode */}
            {!cropMode && (
              <img
                src={lightboxFabric.image}
                alt={lightboxFabric.name}
                style={{ maxWidth: '100vw', maxHeight: 'calc(100vh - 80px)', display: 'block', userSelect: 'none' }}
                draggable={false}
                onClick={e => e.stopPropagation()}
              />
            )}

            {/* Crop mode */}
            {cropMode && (
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    ref={imgRef}
                    src={lightboxFabric.image}
                    alt={lightboxFabric.name}
                    crossOrigin="anonymous"
                    style={{ maxWidth: '100vw', maxHeight: 'calc(100vh - 80px)', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                    draggable={false}
                  />
                  {/* Crop overlay */}
                  <div style={{ position: 'absolute', inset: 0, touchAction: 'none' }}>
                    {/* Dark masks */}
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${cropBox.y * 100}%`, background: 'rgba(0,0,0,0.65)' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${(cropBox.y + cropBox.h) * 100}%`, bottom: 0, background: 'rgba(0,0,0,0.65)' }} />
                    <div style={{ position: 'absolute', top: `${cropBox.y * 100}%`, height: `${cropBox.h * 100}%`, left: 0, width: `${cropBox.x * 100}%`, background: 'rgba(0,0,0,0.65)' }} />
                    <div style={{ position: 'absolute', top: `${cropBox.y * 100}%`, height: `${cropBox.h * 100}%`, left: `${(cropBox.x + cropBox.w) * 100}%`, right: 0, background: 'rgba(0,0,0,0.65)' }} />

                    {/* Crop box body — drag to move */}
                    <div
                      onPointerDown={startBoxDrag}
                      style={{ position: 'absolute', left: `${cropBox.x * 100}%`, top: `${cropBox.y * 100}%`, width: `${cropBox.w * 100}%`, height: `${cropBox.h * 100}%`, border: '2px solid rgba(255,255,255,0.9)', cursor: 'move', boxSizing: 'border-box', touchAction: 'none' }}
                    >
                      {[0, 1, 2].map(row => [0, 1, 2].map(col => (
                        <div key={`${row}-${col}`} style={{ position: 'absolute', left: `${col * 33.33}%`, top: `${row * 33.33}%`, width: '33.33%', height: '33.33%', border: '0.5px solid rgba(255,255,255,0.2)', boxSizing: 'border-box', pointerEvents: 'none' }} />
                      )))}
                    </div>

                    {/* Corner handles */}
                    {([
                      { id: 'tl', lp: cropBox.x,              tp: cropBox.y,              cursor: 'nw-resize' },
                      { id: 'tr', lp: cropBox.x + cropBox.w,  tp: cropBox.y,              cursor: 'ne-resize' },
                      { id: 'bl', lp: cropBox.x,              tp: cropBox.y + cropBox.h,  cursor: 'sw-resize' },
                      { id: 'br', lp: cropBox.x + cropBox.w,  tp: cropBox.y + cropBox.h,  cursor: 'se-resize' },
                    ] as { id: string; lp: number; tp: number; cursor: string }[]).map(h => (
                      <div key={h.id} onPointerDown={startHandleDrag(h.id)}
                        style={{ position: 'absolute', left: `${h.lp * 100}%`, top: `${h.tp * 100}%`, transform: 'translate(-50%,-50%)', width: 20, height: 20, background: '#fff', border: '2px solid rgba(0,0,0,0.2)', borderRadius: 3, cursor: h.cursor, zIndex: 10, touchAction: 'none' }}
                      />
                    ))}

                    {/* Edge handles */}
                    {([
                      { id: 't', lp: cropBox.x + cropBox.w / 2, tp: cropBox.y,                cursor: 'n-resize' },
                      { id: 'b', lp: cropBox.x + cropBox.w / 2, tp: cropBox.y + cropBox.h,    cursor: 's-resize' },
                      { id: 'l', lp: cropBox.x,                  tp: cropBox.y + cropBox.h / 2, cursor: 'w-resize' },
                      { id: 'r', lp: cropBox.x + cropBox.w,      tp: cropBox.y + cropBox.h / 2, cursor: 'e-resize' },
                    ] as { id: string; lp: number; tp: number; cursor: string }[]).map(h => (
                      <div key={h.id} onPointerDown={startHandleDrag(h.id)}
                        style={{ position: 'absolute', left: `${h.lp * 100}%`, top: `${h.tp * 100}%`, transform: 'translate(-50%,-50%)', width: 14, height: 14, background: '#fff', border: '2px solid rgba(0,0,0,0.2)', borderRadius: 2, cursor: h.cursor, zIndex: 10, touchAction: 'none' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom hint in crop mode */}
          {cropMode && (
            <div style={{ padding: '10px 16px', textAlign: 'center', flexShrink: 0, background: 'rgba(0,0,0,0.5)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>
                Drag the box to move · Drag handles to resize · Crop replaces the fabric photo
              </p>
            </div>
          )}
        </div>,
        document.body
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
      <div onClick={onPreview} className="relative w-full aspect-square overflow-hidden cursor-pointer">
        <div
          className="w-full h-full bg-center bg-cover transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url('${fabric.image}')` }}
        />
        <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
          {fabric.type}
        </div>
        {/* Fullscreen hint */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <span className="material-symbols-outlined text-white text-3xl drop-shadow-lg">fullscreen</span>
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

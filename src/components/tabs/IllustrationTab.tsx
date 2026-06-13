'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Client, useStudio, DesignIllustration, FeedbackComment } from '@/context/StudioContext';
import { uploadToImageKit } from '@/lib/imagekit';

interface IllustrationTabProps {
  client: Client;
  setActiveTab: (tab: string) => void;
}


function extractColorsFromImage(imgUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 60;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve([]); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const colorCounts = new Map<string, number>();
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r > 245 && g > 245 && b > 245) continue;
          if (r < 10 && g < 10 && b < 10) continue;
          const qr = Math.round(r / 40) * 40;
          const qg = Math.round(g / 40) * 40;
          const qb = Math.round(b / 40) * 40;
          const hex = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;
          colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
        }
        const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
        resolve(sorted.slice(0, 6).map(e => e[0]));
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = imgUrl;
  });
}

// Singleton pdfjs loader — loads once, cached for the session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pdfjs: any = null;
async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist');
    // Use unpkg CDN worker matching the installed version — no webpack config needed
    _pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${_pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return _pdfjs;
}

interface CropBox { x: number; y: number; w: number; h: number; }

export default function IllustrationTab({ client, setActiveTab: _setActiveTab }: IllustrationTabProps) {
  const { updateClient, userProfile } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Crop states
  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  // PDF rendering states
  const [pdfRenderedUrl, setPdfRenderedUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  const pdfDocIdRef = useRef<string | null>(null);

  // Editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [editVersion, setEditVersion] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const illustrations = client.illustrations || [];
  const selected = illustrations[selectedIndex] || illustrations[0];

  useEffect(() => {
    if (selected) {
      setEditTitle(selected.name);
      setEditVersion(selected.version);
      setEditNotes(selected.notes || '');
      if (selected.type !== 'PDF' && (!selected.colors || selected.colors.length === 0) && selected.image) {
        extractColorsFromImage(selected.image).then(colors => {
          if (colors.length > 0) handleUpdateCurrent({ colors });
        });
      }
    }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateCurrent = (updates: Partial<DesignIllustration>) => {
    if (!selected) return;
    const updated = [...illustrations];
    updated[selectedIndex] = { ...selected, ...updates };
    updateClient(client.id, { illustrations: updated });
  };

  // ── PDF rendering ────────────────────────────────────────────────────────────
  const renderPdfPage = useCallback(async (pageNum: number, illustrationId: string, url: string) => {
    setPdfLoading(true);
    try {
      const pdfjsLib = await getPdfjs();
      // Reload document only when switching to a different PDF
      if (pdfDocIdRef.current !== illustrationId) {
        pdfDocRef.current = await pdfjsLib.getDocument(url).promise;
        pdfDocIdRef.current = illustrationId;
        setPdfTotalPages(pdfDocRef.current.numPages);
      }
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      setPdfRenderedUrl(canvas.toDataURL('image/jpeg', 0.9));
    } catch (err) {
      console.error('PDF render error:', err);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  // Trigger PDF render when crop mode opens on a PDF illustration
  useEffect(() => {
    if (lightboxOpen && cropMode && selected?.type === 'PDF') {
      setPdfPage(1);
      setPdfRenderedUrl(null);
      renderPdfPage(1, selected.id, selected.image);
    }
    if (!cropMode) setPdfRenderedUrl(null);
  }, [lightboxOpen, cropMode, selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePdfPageChange = (newPage: number) => {
    if (!selected) return;
    setPdfPage(newPage);
    setPdfRenderedUrl(null);
    setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
    renderPdfPage(newPage, selected.id, selected.image);
  };

  // ── Upload ───────────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const [index, file] of Array.from(files).entries()) {
      try {
        const result = await uploadToImageKit(file, `ill-${client.name}-${Date.now()}`);
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        let autoColors: string[] = [];
        if (!isPdf) autoColors = await extractColorsFromImage(result.url).catch(() => []);
        const newIll: DesignIllustration = {
          id: `ill-${Date.now()}-${index}`,
          name: isPdf ? `PDF Design — ${file.name.replace(/\.pdf$/i, '')}` : 'Custom Design Concept',
          version: 'v1.0',
          type: isPdf ? 'PDF' : 'Upload',
          image: result.url,
          status: 'Draft',
          notes: '',
          colors: autoColors,
          timeline: {
            start: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            lastRevised: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revisions: 0,
          },
          comments: [],
        };
        updateClient(client.id, { illustrations: [...(client.illustrations || []), newIll] });
        setSelectedIndex((client.illustrations || []).length);
      } catch {
        alert('Failed to upload file to Cloud. Please check your connection.');
      }
    }
    e.target.value = '';
  };

  // ── Comments ─────────────────────────────────────────────────────────────────
  const handleAddComment = () => {
    if (!newComment.trim() || !selected) return;
    const authorInitials = userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const comment: FeedbackComment = {
      id: `c-${Date.now()}`,
      authorName: userProfile.name,
      authorInitials,
      date: new Date().toISOString(),
      content: newComment
    };
    handleUpdateCurrent({ comments: [...(selected.comments || []), comment] });
    setNewComment('');
  };

  // ── Status ───────────────────────────────────────────────────────────────────
  const setStatus = (status: string) => {
    if (!selected) return;
    if (status === 'Approved' || status === 'Current') {
      const updated = illustrations.map((ill, i) => {
        if (i === selectedIndex) return { ...ill, status };
        if (ill.status === 'Approved' || ill.status === 'Current') return { ...ill, status: 'Archived' };
        return ill;
      });
      updateClient(client.id, { illustrations: updated });
    } else {
      handleUpdateCurrent({ status });
    }
  };

  const addColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (!selected.colors.includes(color)) handleUpdateCurrent({ colors: [...selected.colors, color] });
  };
  const removeColor = (c: string) => handleUpdateCurrent({ colors: selected.colors.filter(x => x !== c) });

  // ── Crop drag ────────────────────────────────────────────────────────────────
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

  // ── Apply crop — saves as NEW illustration, keeps original ───────────────────
  const handleApplyCrop = async () => {
    const img = imgRef.current;
    if (!img) return;
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
          const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const result = await uploadToImageKit(file, `ill-cropped-${client.name}-${Date.now()}`);

          // Add as a new illustration — original is preserved
          const cropLabel = selected.type === 'PDF'
            ? `${selected.name} — Crop (p.${pdfPage})`
            : `${selected.name} — Cropped`;
          const autoColors = await extractColorsFromImage(result.url).catch(() => selected.colors || []);
          const newIll: DesignIllustration = {
            id: `ill-${Date.now()}`,
            name: cropLabel,
            version: 'v1.0',
            type: 'Upload',
            image: result.url,
            status: 'Draft',
            notes: `Cropped from: ${selected.name}`,
            colors: autoColors.length ? autoColors : [...(selected.colors || [])],
            timeline: {
              start: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              lastRevised: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              revisions: 0,
            },
            comments: [],
          };
          const newList = [...illustrations, newIll];
          updateClient(client.id, { illustrations: newList });
          setSelectedIndex(newList.length - 1);
          setCropMode(false);
          setLightboxOpen(false);
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

  const openLightbox = () => { setCropMode(false); setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); setLightboxOpen(true); };
  const closeLightbox = () => { setLightboxOpen(false); setCropMode(false); setPdfRenderedUrl(null); };

  if (!selected) return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 animate-fade-in">
      <div className="flex items-center justify-center size-16 rounded-full bg-primary/8">
        <span className="material-symbols-outlined text-[32px] text-primary/60">brush</span>
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-charcoal tracking-wide">No illustrations yet</p>
        <p className="text-sm text-muted">Upload a sketch, render, or PDF to get started.</p>
      </div>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-charcoal font-bold text-sm tracking-wide rounded-xl shadow-md hover:bg-[#E5C04A] transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">upload</span>
        Upload illustration
      </button>
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf,.pdf" multiple onChange={handleUpload} />
    </div>
  );

  // What to show in the crop image area
  const cropImgSrc = selected.type === 'PDF' ? pdfRenderedUrl : selected.image;

  return (
    <div className="animate-fade-in space-y-6 relative">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest">House of Oath Design Studio</p>
          <p className="text-slate-400 text-sm mt-0.5">Illustrations for {client.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — Thumbnails */}
        <div className="lg:col-span-2 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto no-scrollbar">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:block mb-2">Design Iterations</h4>
          {illustrations.map((ill, i) => (
            <div key={ill.id} onClick={() => setSelectedIndex(i)}
              className={`relative flex-shrink-0 w-24 lg:w-full aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedIndex === i ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent hover:border-primary/30'}`}
            >
              {ill.type === 'PDF' ? (
                <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary/50">picture_as_pdf</span>
                </div>
              ) : (
                <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url('${ill.image}')` }} />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 flex flex-col items-center">
                <p className="text-[10px] text-white font-bold truncate w-full text-center">{ill.version}</p>
                <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${ill.status === 'Current' ? 'bg-primary text-white' : ill.status === 'Approved' ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}`}>{ill.status}</span>
              </div>
            </div>
          ))}
          {/* Upload new */}
          <div onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-24 lg:w-full aspect-[3/4] rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-all py-4"
          >
            <span className="material-symbols-outlined text-primary text-2xl">upload</span>
            <p className="text-[10px] font-bold text-primary mt-1 text-center leading-tight px-2">Upload Image / PDF</p>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf,.pdf" multiple onChange={handleUpload} />
        </div>

        {/* Center — Main Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <p className="text-sm text-slate-500 hidden sm:block">Main Preview:</p>
            {isEditingTitle ? (
              <input autoFocus type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                onBlur={() => { setIsEditingTitle(false); handleUpdateCurrent({ name: editTitle }); }}
                onKeyDown={e => { if (e.key === 'Enter') { setIsEditingTitle(false); handleUpdateCurrent({ name: editTitle }); } }}
                className="text-xl font-extrabold text-slate-900 italic bg-white border-b-2 border-primary px-2 outline-none min-w-[200px] w-full sm:w-auto shadow-sm"
              />
            ) : (
              <h2 onClick={() => setIsEditingTitle(true)} className="text-lg sm:text-xl font-extrabold text-slate-900 italic cursor-pointer hover:text-primary transition-colors flex-1">{selected.name}</h2>
            )}
            <button onClick={openLightbox} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors ml-auto sm:ml-0" title="Fullscreen / Crop">
              <span className="material-symbols-outlined text-lg">fullscreen</span>
            </button>
          </div>

          {/* Large preview */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-primary/10 shadow-sm group">
            {selected.type === 'PDF' ? (
              <div className="w-full aspect-[3/4] md:aspect-[4/5] flex flex-col items-center justify-center cursor-pointer bg-slate-50" onClick={openLightbox}>
                <span className="material-symbols-outlined text-6xl text-primary/40 mb-3">picture_as_pdf</span>
                <p className="text-sm font-semibold text-slate-500 px-4 text-center">{selected.name}</p>
                <p className="text-xs text-slate-400 mt-1">Tap to view or crop</p>
              </div>
            ) : (
              <div className="w-full aspect-[3/4] md:aspect-[4/5] bg-center bg-cover bg-no-repeat cursor-pointer transition-transform duration-700 ease-in-out group-hover:scale-105" style={{ backgroundImage: `url('${selected.image}')` }} onClick={openLightbox} />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-12 pb-4 px-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 truncate">{selected.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>Version</span>
                  {isEditingVersion ? (
                    <input autoFocus type="text" value={editVersion} onChange={e => setEditVersion(e.target.value)}
                      onBlur={() => { setIsEditingVersion(false); handleUpdateCurrent({ version: editVersion }); }}
                      onKeyDown={e => { if (e.key === 'Enter') { setIsEditingVersion(false); handleUpdateCurrent({ version: editVersion }); } }}
                      className="bg-white border-b-2 border-primary px-1 outline-none w-14 font-bold text-slate-700 text-center"
                    />
                  ) : (
                    <span onClick={() => setIsEditingVersion(true)} className="font-bold text-slate-700 cursor-pointer hover:text-primary bg-slate-100 px-1.5 py-0.5 rounded">{selected.version}</span>
                  )}
                  <span className="hidden sm:inline">•</span><span>{selected.type}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full ${selected.status === 'Current' ? 'bg-primary text-white' : selected.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{selected.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <button onClick={() => setStatus('Approved')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selected.status === 'Approved' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'bg-white border border-none text-slate-600 hover:bg-slate-50'}`}>Approve</button>
                <button onClick={() => setStatus('Current')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selected.status === 'Current' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white border border-none text-slate-600 hover:bg-slate-50'}`}>Make Current</button>
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-primary/10 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">description</span>
                  <h4 className="font-bold text-sm text-slate-900">Design Notes</h4>
                </div>
                {!isEditingNotes && <button onClick={() => setIsEditingNotes(true)} className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-sm">edit</span></button>}
              </div>
              {isEditingNotes ? (
                <textarea autoFocus value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  onBlur={() => { setIsEditingNotes(false); handleUpdateCurrent({ notes: editNotes }); }}
                  className="w-full flex-1 min-h-[80px] text-xs text-slate-700 leading-relaxed bg-white border-2 border-primary/30 rounded-lg p-2 outline-none focus:border-primary resize-none shadow-inner"
                  placeholder="Enter design notes here..."
                />
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-slate-50 p-1 -m-1 rounded transition-colors" onClick={() => setIsEditingNotes(true)}>
                  {selected.notes || <span className="italic text-slate-400">Click to add design notes...</span>}
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 border border-primary/10 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">palette</span>
                  <h4 className="font-bold text-sm text-slate-900">Color Palette</h4>
                </div>
                <button onClick={() => colorInputRef.current?.click()} className="text-primary hover:scale-110 transition-transform flex items-center justify-center bg-primary/10 rounded-full p-1">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
                <input type="color" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none w-px h-px" ref={colorInputRef} onChange={addColor} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(selected.colors || []).map(color => (
                  <div key={color} className="w-8 h-8 rounded-lg shadow-sm cursor-pointer hover:scale-110 transition-transform relative group" style={{ background: color }} onClick={() => removeColor(color)} title="Click to remove">
                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full size-4 flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm transition-opacity">
                      <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                    </div>
                  </div>
                ))}
                {!(selected.colors?.length) && <span className="text-xs text-slate-400 italic">No colors selected</span>}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-primary/10 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-lg">timeline</span>
                <h4 className="font-bold text-sm text-slate-900">Timeline</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded"><span className="text-slate-500">Start Date</span><span className="font-bold text-slate-900">{selected.timeline?.start || 'N/A'}</span></div>
                <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded"><span className="text-slate-500">Last Revised</span><span className="font-bold text-slate-900">{selected.timeline?.lastRevised || 'N/A'}</span></div>
                <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded"><span className="text-slate-500">Total Revisions</span><span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{selected.timeline?.revisions || 0}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Feedback Panel */}
        <div className="lg:col-span-3 flex flex-col h-full space-y-4 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 lg:border-none lg:p-0 lg:bg-transparent">
          <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-primary text-lg">chat</span>
            Internal Feedback
          </h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 lg:max-h-[550px] custom-scrollbar">
            {selected.comments && selected.comments.map(comment => (
              <div key={comment.id} className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm animate-fade-in text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0">{comment.authorInitials}</div>
                    <p className="font-bold text-xs text-slate-900 truncate max-w-[120px]">{comment.authorName}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium shrink-0 bg-slate-50 px-1.5 py-0.5 rounded">{new Date(comment.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap ml-8 border-l-2 border-slate-100 pl-2 py-0.5">&ldquo;{comment.content}&rdquo;</p>
              </div>
            ))}
            {(!selected.comments || selected.comments.length === 0) && (
              <div className="text-center py-10 bg-white border border-dashed border-none rounded-xl">
                <span className="material-symbols-outlined text-slate-300 text-3xl mb-1">forum</span>
                <p className="text-slate-400 text-xs italic">No feedback comments yet.</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0 pt-3 border-t border-none">
            <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
              className="flex-1 bg-white border border-none rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
              placeholder="Add your feedback..."
            />
            <button onClick={handleAddComment} disabled={!newComment.trim()} className="w-10 h-10 shrink-0 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Lightbox + Crop — portal on body ──────────────────────────────────── */}
      {lightboxOpen && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#111', display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0, background: 'rgba(0,0,0,0.7)', gap: 8 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: 0 }}>
                {selected.version} · {selected.type}
                {cropMode && (selected.type === 'PDF' ? ` · Page ${pdfPage}/${pdfTotalPages} — drag handles to adjust` : ' — drag handles to adjust')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {/* PDF page navigation — only in crop mode */}
              {cropMode && selected.type === 'PDF' && pdfTotalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 8px' }}>
                  <button
                    onClick={() => pdfPage > 1 && handlePdfPageChange(pdfPage - 1)}
                    disabled={pdfPage <= 1}
                    style={{ background: 'none', border: 'none', color: pdfPage <= 1 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: pdfPage <= 1 ? 'default' : 'pointer', padding: 2, display: 'flex' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                  </button>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{pdfPage}/{pdfTotalPages}</span>
                  <button
                    onClick={() => pdfPage < pdfTotalPages && handlePdfPageChange(pdfPage + 1)}
                    disabled={pdfPage >= pdfTotalPages}
                    style={{ background: 'none', border: 'none', color: pdfPage >= pdfTotalPages ? 'rgba(255,255,255,0.3)' : '#fff', cursor: pdfPage >= pdfTotalPages ? 'default' : 'pointer', padding: 2, display: 'flex' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                </div>
              )}

              {/* Crop button */}
              {!cropMode && (
                <button
                  onClick={() => { setCropMode(true); setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>crop</span>
                  Crop
                </button>
              )}
              {cropMode && (
                <>
                  <button onClick={() => { setCropMode(false); setPdfRenderedUrl(null); }}
                    style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    Cancel
                  </button>
                  <button onClick={handleApplyCrop} disabled={isSavingCrop || (selected.type === 'PDF' && !pdfRenderedUrl)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#d4af35', border: 'none', borderRadius: 8, color: '#fff', cursor: (isSavingCrop || (selected.type === 'PDF' && !pdfRenderedUrl)) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, opacity: (isSavingCrop || (selected.type === 'PDF' && !pdfRenderedUrl)) ? 0.65 : 1 }}>
                    {isSavingCrop
                      ? <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span> Saving...</>
                      : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span> Save Crop</>
                    }
                  </button>
                </>
              )}

              <button onClick={closeLightbox}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}
            onClick={cropMode ? undefined : closeLightbox}>

            {/* ── VIEW mode (no crop) ── */}
            {!cropMode && selected.type === 'PDF' && (
              <embed src={selected.image} type="application/pdf"
                style={{ width: '100%', height: '100%' }}
                onClick={e => e.stopPropagation()}
              />
            )}
            {!cropMode && selected.type !== 'PDF' && (
              <img src={selected.image} alt={selected.name}
                style={{ maxWidth: '100vw', maxHeight: 'calc(100vh - 80px)', display: 'block', userSelect: 'none' }}
                draggable={false}
                onClick={e => e.stopPropagation()}
              />
            )}

            {/* ── CROP mode ── */}
            {cropMode && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                onClick={e => e.stopPropagation()}>

                {/* PDF loading spinner */}
                {selected.type === 'PDF' && pdfLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.6)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, animation: 'spin 1s linear infinite' }}>sync</span>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>Rendering PDF page {pdfPage}…</p>
                  </div>
                )}

                {/* Crop image (shown for images immediately; for PDFs once rendered) */}
                {cropImgSrc && !pdfLoading && (
                  <div style={{ position: 'relative' }}>
                    <img
                      ref={imgRef}
                      src={cropImgSrc}
                      alt={selected.name}
                      crossOrigin="anonymous"
                      style={{ maxWidth: '100vw', maxHeight: 'calc(100vh - 80px)', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                      draggable={false}
                    />

                    {/* Crop overlay */}
                    <div style={{ position: 'absolute', inset: 0, touchAction: 'none' }}>
                      {/* Dark masks — 4 strips outside the crop box */}
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${cropBox.y * 100}%`, background: 'rgba(0,0,0,0.65)' }} />
                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${(cropBox.y + cropBox.h) * 100}%`, bottom: 0, background: 'rgba(0,0,0,0.65)' }} />
                      <div style={{ position: 'absolute', top: `${cropBox.y * 100}%`, height: `${cropBox.h * 100}%`, left: 0, width: `${cropBox.x * 100}%`, background: 'rgba(0,0,0,0.65)' }} />
                      <div style={{ position: 'absolute', top: `${cropBox.y * 100}%`, height: `${cropBox.h * 100}%`, left: `${(cropBox.x + cropBox.w) * 100}%`, right: 0, background: 'rgba(0,0,0,0.65)' }} />

                      {/* Crop box body — drag to move */}
                      <div onPointerDown={startBoxDrag}
                        style={{ position: 'absolute', left: `${cropBox.x * 100}%`, top: `${cropBox.y * 100}%`, width: `${cropBox.w * 100}%`, height: `${cropBox.h * 100}%`, border: '2px solid rgba(255,255,255,0.9)', cursor: 'move', boxSizing: 'border-box', touchAction: 'none' }}>
                        {/* Rule-of-thirds grid */}
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
                        { id: 't', lp: cropBox.x + cropBox.w / 2, tp: cropBox.y,             cursor: 'n-resize' },
                        { id: 'b', lp: cropBox.x + cropBox.w / 2, tp: cropBox.y + cropBox.h, cursor: 's-resize' },
                        { id: 'l', lp: cropBox.x,                 tp: cropBox.y + cropBox.h / 2, cursor: 'w-resize' },
                        { id: 'r', lp: cropBox.x + cropBox.w,     tp: cropBox.y + cropBox.h / 2, cursor: 'e-resize' },
                      ] as { id: string; lp: number; tp: number; cursor: string }[]).map(h => (
                        <div key={h.id} onPointerDown={startHandleDrag(h.id)}
                          style={{ position: 'absolute', left: `${h.lp * 100}%`, top: `${h.tp * 100}%`, transform: 'translate(-50%,-50%)', width: 14, height: 14, background: '#fff', border: '2px solid rgba(0,0,0,0.2)', borderRadius: 2, cursor: h.cursor, zIndex: 10, touchAction: 'none' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom hint in crop mode */}
          {cropMode && !pdfLoading && cropImgSrc && (
            <div style={{ padding: '10px 16px', textAlign: 'center', flexShrink: 0, background: 'rgba(0,0,0,0.5)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>
                Drag the box to move · Drag handles to resize · Crop is saved as a new illustration — original is kept
              </p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

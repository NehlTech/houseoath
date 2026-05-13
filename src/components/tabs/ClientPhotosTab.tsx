'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Client, useStudio } from '@/context/StudioContext';
import { uploadToImageKit } from '@/lib/imagekit';

interface ClientPhotosTabProps {
  client: Client;
}

export default function ClientPhotosTab({ client }: ClientPhotosTabProps) {
  const { updateClient } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const photos: string[] = Array.isArray(client.clientPhotos) ? client.clientPhotos as string[] : [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await uploadToImageKit(file, `photo-${client.name}-${Date.now()}`);
        const updated = [...photos, result.url];
        updateClient(client.id, { clientPhotos: updated });
      }
    } catch {
      alert('Failed to upload photo. Please check your connection.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = (url: string) => {
    updateClient(client.id, { clientPhotos: photos.filter(p => p !== url) });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-charcoal">Client Photos</h1>
          <p className="text-muted mt-1 text-sm">{photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded for {client.name}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-60 transition-all"
        >
          {isUploading ? (
            <span className="material-symbols-outlined text-lg animate-spin">sync</span>
          ) : (
            <span className="material-symbols-outlined text-lg">upload</span>
          )}
          {isUploading ? 'Uploading...' : 'Upload Photos'}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} />
      </div>

      {/* Gallery */}
      {photos.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-primary/20 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
        >
          <span className="material-symbols-outlined text-5xl text-border mb-3">add_photo_alternate</span>
          <p className="text-muted text-sm font-medium">No photos uploaded yet.</p>
          <p className="text-muted text-xs mt-1">Tap to upload client reference photos.</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {photos.map((src, i) => (
            <div
              key={i}
              className="break-inside-avoid group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-primary/5 bg-white"
            >
              <img
                src={src}
                alt={`Photo ${i + 1}`}
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onClick={() => setSelectedPhoto(src)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                  <span className="material-symbols-outlined text-white text-xl">zoom_in</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(src); }}
                    className="text-white hover:text-danger transition-colors"
                    title="Remove photo"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
            Add More Photos
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-2 pb-2">
        <p className="text-xs text-muted">© 2026 House of Oath</p>
      </div>

      {/* Lightbox — rendered via portal directly on body to escape any overflow/transform clipping */}
      {selectedPhoto && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column' }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', flexShrink: 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Photo Preview</span>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, borderRadius: '50%' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>close</span>
            </button>
          </div>
          <div
            style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedPhoto}
              alt="Full preview"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

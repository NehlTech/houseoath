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
 const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
 const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
 const photoSelectionMode = selectedPhotos.size > 0;
 const longPressRef = useRef<{ timer: ReturnType<typeof setTimeout>; url: string } | null>(null);

 const photos: string[] = Array.isArray(client.clientPhotos) ? client.clientPhotos as string[] : [];

 const TAILOR_VERBS = ['Pinning', 'Cutting', 'Pressing', 'Stitching', 'Hemming', 'Fitting'];

 const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;
 const filesArr = Array.from(files);
 setIsUploading(true);
 setUploadProgress({ current: 0, total: filesArr.length });
 try {
 const newUrls: string[] = [];
 for (let i = 0; i < filesArr.length; i++) {
 setUploadProgress({ current: i + 1, total: filesArr.length });
 const result = await uploadToImageKit(filesArr[i], `photo-${client.name}-${Date.now()}`);
 newUrls.push(result.url);
 }
 updateClient(client.id, { clientPhotos: [...photos, ...newUrls] });
 } catch {
 alert('Failed to upload photo. Please check your connection.');
 } finally {
 setIsUploading(false);
 setUploadProgress(null);
 e.target.value = '';
 }
 };

 const handleDelete = (url: string) => {
 updateClient(client.id, { clientPhotos: photos.filter(p => p !== url) });
 };

 const handleDeleteSelectedPhotos = () => {
 updateClient(client.id, { clientPhotos: photos.filter(p => !selectedPhotos.has(p)) });
 setSelectedPhotos(new Set());
 };

 const handlePhotoPointerDown = (url: string) => {
 longPressRef.current = {
 timer: setTimeout(() => {
 longPressRef.current = null;
 setSelectedPhotos(prev => new Set([...prev, url]));
 }, 500),
 url,
 };
 };

 const handlePhotoPointerUp = () => {
 if (longPressRef.current) {
 clearTimeout(longPressRef.current.timer);
 longPressRef.current = null;
 }
 };

 const handlePhotoClick = (url: string) => {
 if (photoSelectionMode) {
 setSelectedPhotos(prev => {
 const n = new Set(prev);
 if (n.has(url)) { n.delete(url); } else { n.add(url); }
 return n;
 });
 } else {
 setSelectedPhoto(url);
 }
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
 <span className={`material-symbols-outlined text-lg ${isUploading ? 'animate-spin' : ''}`}>
 {isUploading ? 'sync' : 'upload'}
 </span>
 {uploadProgress
 ? `${TAILOR_VERBS[(uploadProgress.current - 1) % TAILOR_VERBS.length]} photo ${uploadProgress.current} / ${uploadProgress.total}`
 : isUploading ? 'Starting…' : 'Upload Photos'}
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
 className={`break-inside-avoid group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-primary/5 bg-white ${selectedPhotos.has(src) ? 'ring-2 ring-primary' : ''}`}
 onPointerDown={() => handlePhotoPointerDown(src)}
 onPointerUp={handlePhotoPointerUp}
 onPointerLeave={handlePhotoPointerUp}
 onPointerCancel={handlePhotoPointerUp}
 onClick={() => handlePhotoClick(src)}
 >
 <img
 src={src}
 alt={`Photo ${i + 1}`}
 className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
 loading="lazy"
 />
 {!photoSelectionMode && (
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
 )}
 {photoSelectionMode && (
 <div className={`absolute inset-0 flex items-center justify-center transition-all pointer-events-none ${selectedPhotos.has(src) ? 'bg-primary/20' : 'bg-black/10'}`}>
 <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow ${selectedPhotos.has(src) ? 'bg-primary border-primary' : 'border-white bg-black/30'}`}>
 {selectedPhotos.has(src) && <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {photoSelectionMode && (
 <div className="sticky bottom-4 left-0 right-0 mx-auto w-fit z-30 animate-slide-up">
 <div className="flex items-center gap-3 bg-charcoal text-white rounded-2xl py-3 px-4 shadow-2xl">
 <button onClick={() => setSelectedPhotos(new Set())} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors">
 <span className="material-symbols-outlined text-lg">close</span>
 </button>
 <span className="font-bold text-sm">{selectedPhotos.size} selected</span>
 <button onClick={() => setSelectedPhotos(new Set(photos))} className="text-xs font-semibold px-2 py-1 rounded-full border border-white/30 hover:bg-white/10 transition-colors">All</button>
 <button onClick={handleDeleteSelectedPhotos} className="flex items-center gap-1.5 bg-danger px-3 py-1.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all">
 <span className="material-symbols-outlined text-[16px]">delete</span>
 Delete
 </button>
 </div>
 </div>
 )}

 {photos.length > 0 && (
 <div className="flex justify-center pt-2">
 <button
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading}
 className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 disabled:opacity-60 transition-all"
 >
 <span className={`material-symbols-outlined text-lg ${isUploading ? 'animate-spin' : ''}`}>
 {isUploading ? 'sync' : 'add_photo_alternate'}
 </span>
 {uploadProgress ? `${uploadProgress.current} / ${uploadProgress.total} done` : 'Add More Photos'}
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

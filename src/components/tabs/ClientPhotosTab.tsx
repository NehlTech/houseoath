'use client';

import { useState, useRef } from 'react';
import { Client, useStudio } from '@/context/StudioContext';

interface ClientPhotosTabProps {
  client: Client;
}

const CATEGORIES = ['All Photos', 'Body Form', 'Fabric Draping', 'Style Inspo', 'Archive'];

const SAMPLE_PHOTOS = [
  { src: '/samples/kente_adwinasa.png', tag: 'Fabric Reference' },
  { src: '/samples/sika_futuro.png', tag: 'Fabric Reference' },
  { src: '/samples/gown_render.png', tag: 'Style Inspo' },
  { src: '/samples/gown_sketch.png', tag: 'Body Reference' },
  { src: '/samples/organic_ivory.png', tag: 'Fabric Draping' },
];

const HASHTAGS = ['Body Reference', 'Styling Visuals', 'Past Outfits'];

export default function ClientPhotosTab({ client }: ClientPhotosTabProps) {
  const { updateClient } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState('All Photos');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photos = [...(client.clientPhotos || []), reader.result as string];
        updateClient(client.id, { clientPhotos: photos });
      };
      reader.readAsDataURL(file);
    });
  };

  // Determine format of clientPhotos (Array vs Seeded Object)
  let extraPhotos: {src: string, tag: string}[] = [];
  if (Array.isArray(client.clientPhotos)) {
    extraPhotos = client.clientPhotos.map((p: any, i) => ({ src: p, tag: `Upload ${i + 1}` }));
  } else if (client.clientPhotos && typeof client.clientPhotos === 'object') {
    const cp: any = client.clientPhotos;
    const all = [
      ...(cp.styleInspo || []).map((p: any) => ({ src: p.url || p, tag: 'Style Inspo' })),
      ...(cp.fabricDraping || []).map((p: any) => ({ src: p.url || p, tag: 'Fabric Draping' })),
      ...(cp.bodyForm || []).map((p: any) => ({ src: p.url || p, tag: 'Body Form' })),
      ...(cp.archive || []).map((p: any) => ({ src: p.url || p, tag: 'Archive' }))
    ];
    extraPhotos = all;
  }

  // Combine samples with uploads
  const allPhotos = [
    ...SAMPLE_PHOTOS.map(p => ({ src: p.src, tag: p.tag })),
    ...extraPhotos,
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Reference Gallery</h1>
          <p className="text-slate-500 mt-1 text-sm">High-resolution body references and styling visuals for {client.name}</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
          <span className="material-symbols-outlined text-lg">upload</span>
          Upload
        </button>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Hashtags */}
      <div className="flex gap-2 flex-wrap">
        {HASHTAGS.map(tag => (
          <span key={tag} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold cursor-pointer hover:bg-primary/20 transition-all">
            #{tag.replace(/\s/g, '')}
          </span>
        ))}
      </div>

      {/* Masonry-Style Gallery */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {allPhotos.map((photo, i) => (
          <div
            key={i}
            onClick={() => setSelectedPhoto(photo.src)}
            className="break-inside-avoid group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-primary/5 bg-white"
          >
            <img
              src={photo.src}
              alt={photo.tag}
              className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-white text-xs font-bold bg-black/30 px-2 py-1 rounded-full">{photo.tag}</span>
                <span className="material-symbols-outlined text-white text-xl hover:scale-110 transition-transform">zoom_in</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center pt-4">
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all">
          <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
          Load More Photos
        </button>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 pb-2">
        <p className="text-xs text-slate-400">© 2026 Bespoke Tailor Manager — Premium Client Experience</p>
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-primary transition-colors" onClick={() => setSelectedPhoto(null)}>
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          <img src={selectedPhoto} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

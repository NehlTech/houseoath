'use client';

import { useState, useRef } from 'react';
import { Client, useStudio } from '@/context/StudioContext';
import { uploadToImageKit } from '@/lib/imagekit';

interface FabricTabProps {
  client: Client;
}

const SAMPLE_FABRICS = [
  { name: 'Authentic Adwinasa', vendor: 'Heritage Weavers GH', type: 'Kente', desc: 'Symbolizes total completion and high level of craftsmanship.', image: '/samples/kente_adwinasa.png' },
  { name: 'Organic Ivory', vendor: 'EcoFab Supply', type: 'Linen', desc: 'Pre-washed, sustainable linen with a soft hand-feel.', image: '/samples/organic_ivory.png' },
  { name: 'Sika Futuro', vendor: 'Kumasi Artisans Co.', type: 'Kente', desc: 'Traditional gold dust pattern representing wealth.', image: '/samples/sika_futuro.png' },
];

const CATEGORIES = ['All Uploads', 'Kente Patterns', 'Lace & Silks', 'Cotton Prints'];

export default function FabricTab({ client }: FabricTabProps) {
  const { updateClient } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState(client.fabricNotes || '');
  const [activeCategory, setActiveCategory] = useState('All Uploads');
  const [fabricName, setFabricName] = useState('');
  const [fabricDesc, setFabricDesc] = useState('');
  const [fabricType, setFabricType] = useState('Kente Pattern');
  const [vendorName, setVendorName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      try {
        const result = await uploadToImageKit(file, `fabric-${client.name}-${Date.now()}`);
        const photos = [...(client.fabricPhotos || []), result.url];
        updateClient(client.id, { fabricPhotos: photos });
      } catch (error) {
        console.error("Fabric upload failed:", error);
        alert("Failed to upload fabric image. Please check your connection.");
      }
    }
  };

  // Combine sample fabrics with uploaded ones
  const allFabrics = [
    ...SAMPLE_FABRICS,
    ...(client.fabricPhotos || []).map((photo, i) => ({
      name: `Fabric ${i + 1}`,
      vendor: client.fabricVendor || 'Custom Upload',
      type: 'Custom',
      desc: '',
      image: photo,
    })),
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Fabric Library</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage and view your uploaded textile collection</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg shrink-0">
          <button 
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md font-semibold text-xs sm:text-sm transition-all outline-none ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="material-symbols-outlined text-lg">grid_view</span>
            Grid
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md font-semibold text-xs sm:text-sm transition-all outline-none ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="material-symbols-outlined text-lg">view_list</span>
            List
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Fabric Gallery */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6' : 'flex flex-col gap-4'}>
        {allFabrics.map((fabric, i) => (
          <div key={i} onClick={() => setSelectedPhoto(fabric.image)} className={`group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-primary/5 cursor-pointer ${viewMode === 'grid' ? 'flex flex-col' : 'flex flex-row items-center pr-6'}`}>
            <div className={`relative overflow-hidden shrink-0 ${viewMode === 'grid' ? 'w-full aspect-square' : 'w-32 h-32 md:w-48 md:h-48'}`}>
              <div className="w-full h-full bg-center bg-cover transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url('${fabric.image}')` }}></div>
              <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">{fabric.type}</div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="material-symbols-outlined text-white text-2xl transition-transform pointer-events-auto">zoom_in</span>
              </div>
            </div>
            <div className={`p-4 md:p-6 flex-1 flex flex-col justify-center ${viewMode === 'list' && 'border-l border-slate-100 ml-2'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-bold text-slate-900 ${viewMode === 'list' ? 'text-lg md:text-xl' : ''}`}>{fabric.name}</h3>
                  {fabric.vendor && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="material-symbols-outlined text-xs text-primary">storefront</span>
                      <p className="text-[11px] md:text-sm font-medium text-slate-500">{fabric.vendor}</p>
                    </div>
                  )}
                </div>
                {viewMode === 'list' && (
                  <button className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                )}
              </div>
              {fabric.desc && (
                <p className={`text-slate-400 mt-3 italic ${viewMode === 'grid' ? 'text-xs line-clamp-2' : 'text-sm'}`}>&ldquo;{fabric.desc}&rdquo;</p>
              )}
            </div>
          </div>
        ))}

        {/* Upload Placeholder */}
        <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 p-6 min-h-[280px] hover:bg-primary/10 transition-colors cursor-pointer group">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-3">
            <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
          </div>
          <h3 className="font-bold text-slate-700">Add New Fabric</h3>
          <p className="text-xs text-slate-500 text-center mt-1.5">Upload photos and details of your new textile</p>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} />
      </div>

      {/* Quick Fabric Upload Form */}
      <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-2 text-lg">
          <span className="material-symbols-outlined text-primary">cloud_upload</span>
          Quick Fabric Upload
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fabric Name</label>
              <input className="w-full bg-white border border-none rounded-lg h-11 px-4 text-sm focus:ring-primary focus:border-primary" placeholder="e.g. Traditional Silk Kente" value={fabricName} onChange={e => setFabricName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vendor Name</label>
              <input className="w-full bg-white border border-none rounded-lg h-11 px-4 text-sm focus:ring-primary focus:border-primary" placeholder="Select or enter vendor" value={vendorName} onChange={e => setVendorName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fabric Type</label>
              <select className="w-full bg-white border border-none rounded-lg h-11 px-4 text-sm focus:ring-primary focus:border-primary" value={fabricType} onChange={e => setFabricType(e.target.value)}>
                <option>Kente Pattern</option>
                <option>Lace & Silk</option>
                <option>Cotton Print</option>
                <option>Linen</option>
                <option>Brocade</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                Notes & Description
              </label>
              <textarea className="w-full bg-white border border-none rounded-lg p-4 text-sm focus:ring-primary focus:border-primary resize-none" rows={4} placeholder="Describe the pattern, weaving, texture, or special care..." value={fabricDesc} onChange={e => setFabricDesc(e.target.value)} />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button className="px-5 py-3 sm:py-2.5 w-full sm:w-auto rounded-lg border border-none text-slate-700 font-bold text-sm hover:bg-slate-50">Save Draft</button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 w-full sm:w-auto rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                <span className="material-symbols-outlined text-lg">upload</span>
                Upload Fabric
              </button>
            </div>
          </div>
        </div>
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

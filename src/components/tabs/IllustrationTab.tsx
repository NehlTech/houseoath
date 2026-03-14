'use client';

import { useState, useRef, useEffect } from 'react';
import { Client, useStudio, DesignIllustration, FeedbackComment } from '@/context/StudioContext';

interface IllustrationTabProps {
  client: Client;
  setActiveTab: (tab: string) => void;
}

const DESIGN_COLORS = ['#d4af35', '#2c1810', '#f5e6d0', '#8b6914', '#1a1a2e'];

export default function IllustrationTab({ client, setActiveTab }: IllustrationTabProps) {
  const { updateClient, userProfile } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [editVersion, setEditVersion] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  
  // Initialize mock illustrations if empty for UI demonstration
  useEffect(() => {
    if (!client.illustrations || client.illustrations.length === 0) {
      const initialIllustrations: DesignIllustration[] = [
        { 
          id: 'ill-1', name: 'Evening Gala Gown Concept', version: 'v2.4', type: 'Sketch', 
          image: '/samples/gown_sketch.png', status: 'Current', notes: 'Focus on the asymmetrical neckline. Ensure the fabric is cut at a 45° angle for the drape. The sleeve needs to be slightly shorter for this revision.',
          colors: [...DESIGN_COLORS],
          timeline: { start: 'Feb 12', lastRevised: 'Mar 8', revisions: 4 },
          comments: [
            { id: 'c1', authorName: 'Atelier Apprentice', authorInitials: 'AA', date: new Date().toISOString(), content: 'The neckline position is perfect! Can we have the same drape but even fuller at the bottom section?' }
          ]
        },
        { 
          id: 'ill-2', name: 'Evening Gala Gown — Render', version: 'v2.0', type: 'Render', 
          image: '/samples/gown_render.png', status: 'Approved', notes: '',
          colors: [...DESIGN_COLORS],
          timeline: { start: 'Feb 10', lastRevised: 'Mar 1', revisions: 2 },
          comments: []
        },
      ];
      updateClient(client.id, { illustrations: initialIllustrations });
    }
  }, [client.id, client.illustrations, updateClient]);

  const illustrations = client.illustrations || [];
  const selected = illustrations[selectedIndex] || illustrations[0];

  useEffect(() => {
    if (selected) {
      setEditTitle(selected.name);
      setEditVersion(selected.version);
      setEditNotes(selected.notes || '');
    }
  }, [selected]);

  const handleUpdateCurrent = (updates: Partial<DesignIllustration>) => {
    if (!selected) return;
    const updatedIllustrations = [...illustrations];
    updatedIllustrations[selectedIndex] = { ...selected, ...updates };
    updateClient(client.id, { illustrations: updatedIllustrations });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newIllustration: DesignIllustration = {
          id: `ill-${Date.now()}-${index}`,
          name: `Custom Design Concept`,
          version: `v1.0`,
          type: 'Upload',
          image: reader.result as string,
          status: 'Draft',
          notes: '',
          colors: [],
          timeline: { start: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), lastRevised: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revisions: 0 },
          comments: []
        };
        handleUpdateCurrent({ status: 'Draft' }); // In case we want to auto-select it later.
        updateClient(client.id, { illustrations: [...illustrations, newIllustration] });
        setSelectedIndex(illustrations.length); // Switch to newly uploaded
      };
      reader.readAsDataURL(file);
    });
  };

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

  const setStatus = (status: string) => {
    if (!selected) return;
    
    // If we are approving or making something current, we must demote existing ones to ensure singular status
    if (status === 'Approved' || status === 'Current') {
      const updatedIllustrations = illustrations.map((ill, i) => {
        if (i === selectedIndex) {
          return { ...ill, status };
        }
        // If another illustration is Approved/Current, downgrade it to Archived
        if (ill.status === 'Approved' || ill.status === 'Current') {
          return { ...ill, status: 'Archived' };
        }
        return ill;
      });
      updateClient(client.id, { illustrations: updatedIllustrations });
    } else {
      // Standard single-item update for other statuses
      handleUpdateCurrent({ status });
    }
  };

  const addColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (!selected.colors.includes(color)) {
      handleUpdateCurrent({ colors: [...selected.colors, color] });
    }
  };

  const removeColor = (colorToRemove: string) => {
    handleUpdateCurrent({ colors: selected.colors.filter(c => c !== colorToRemove) });
  };

  if (!selected) return <div className="p-8 text-center animate-fade-in text-slate-500">Loading design studio...</div>;

  return (
    <div className="animate-fade-in space-y-6 relative">
      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-fade-in p-4 md:p-12" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-6 right-6 text-white hover:text-primary transition-colors z-50 p-2">
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          <img src={selected.image} alt={selected.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest">Houseofoath Design Studio</p>
          <p className="text-slate-400 text-sm mt-0.5">Project for {client.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('Overview')} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Dashboard</button>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary shadow-lg shadow-primary/20 hover:brightness-110 transition-all">Illustrations</button>
          <button onClick={() => setActiveTab('Fabric')} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Fabric Library</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — Thumbnails */}
        <div className="lg:col-span-2 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto no-scrollbar">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:block mb-2">Design Iterations</h4>
          {illustrations.map((ill, i) => (
            <div
              key={ill.id}
              onClick={() => setSelectedIndex(i)}
              className={`relative flex-shrink-0 w-24 lg:w-full aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                selectedIndex === i ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent hover:border-primary/30'
              }`}
            >
              <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url('${ill.image}')` }}></div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 flex flex-col items-center">
                <p className="text-[10px] text-white font-bold truncate w-full text-center">{ill.version}</p>
                <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${ill.status === 'Current' ? 'bg-primary text-white' : ill.status === 'Approved' ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}`}>{ill.status}</span>
              </div>
            </div>
          ))}

          {/* Upload new version */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-24 lg:w-full aspect-[3/4] rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-all py-4"
          >
            <span className="material-symbols-outlined text-primary text-2xl">upload</span>
            <p className="text-[10px] font-bold text-primary mt-1 text-center font-medium leading-tight px-2">Upload Version</p>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} />
        </div>

        {/* Center — Main Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <p className="text-sm text-slate-500 hidden sm:block">Main Preview:</p>
            {isEditingTitle ? (
              <input 
                autoFocus
                type="text" 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)}
                onBlur={() => { setIsEditingTitle(false); handleUpdateCurrent({ name: editTitle }); }}
                onKeyDown={e => { if (e.key === 'Enter') { setIsEditingTitle(false); handleUpdateCurrent({ name: editTitle }); } }}
                className="text-xl font-extrabold text-slate-900 italic bg-white border-b-2 border-primary px-2 outline-none min-w-[200px] w-full sm:w-auto shadow-sm"
              />
            ) : (
              <h2 onClick={() => setIsEditingTitle(true)} className="text-lg sm:text-xl font-extrabold text-slate-900 italic cursor-pointer hover:text-primary transition-colors flex-1" title="Click to edit design name">{selected.name}</h2>
            )}
            
            {/* The Lightbox button (square box icon) */}
            <button onClick={() => setLightboxOpen(true)} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors ml-auto sm:ml-0" title="Fullscreen Preview">
              <span className="material-symbols-outlined text-lg">fullscreen</span>
            </button>
          </div>

          {/* Large preview */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-primary/10 shadow-sm group">
            <div className="w-full aspect-[3/4] md:aspect-[4/5] bg-center bg-cover bg-no-repeat cursor-pointer transition-transform duration-700 ease-in-out group-hover:scale-105" style={{ backgroundImage: `url('${selected.image}')` }} onClick={() => setLightboxOpen(true)}></div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-12 pb-4 px-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 truncate">{selected.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>Version</span>
                  {isEditingVersion ? (
                    <input 
                      autoFocus
                      type="text" 
                      value={editVersion} 
                      onChange={e => setEditVersion(e.target.value)}
                      onBlur={() => { setIsEditingVersion(false); handleUpdateCurrent({ version: editVersion }); }}
                      onKeyDown={e => { if (e.key === 'Enter') { setIsEditingVersion(false); handleUpdateCurrent({ version: editVersion }); } }}
                      className="bg-white border-b-2 border-primary px-1 outline-none w-14 font-bold text-slate-700 text-center"
                    />
                  ) : (
                    <span onClick={() => setIsEditingVersion(true)} className="font-bold text-slate-700 cursor-pointer hover:text-primary bg-slate-100 px-1.5 py-0.5 rounded" title="Edit version">{selected.version}</span>
                  )}
                  <span className="hidden sm:inline">•</span>
                  <span>{selected.type}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full ${selected.status === 'Current' ? 'bg-primary text-white' : selected.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{selected.status}</span>
                </div>
              </div>
              
              {/* Status Toggles */}
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <button 
                  onClick={() => setStatus('Approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selected.status === 'Approved' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'bg-white border border-none text-slate-600 hover:bg-slate-50'}`}
                >
                  Approve
                </button>
                <button 
                  onClick={() => setStatus('Current')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selected.status === 'Current' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white border border-none text-slate-600 hover:bg-slate-50'}`}
                >
                  Make Current
                </button>
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
                {!isEditingNotes && (
                  <button onClick={() => setIsEditingNotes(true)} className="text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                )}
              </div>
              {isEditingNotes ? (
                <textarea 
                  autoFocus
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  onBlur={() => { setIsEditingNotes(false); handleUpdateCurrent({ notes: editNotes }); }}
                  className="w-full flex-1 min-h-[80px] text-xs text-slate-700 leading-relaxed bg-white border-2 border-primary/30 rounded-lg p-2 outline-none focus:border-primary resize-none shadow-inner"
                  placeholder="Enter design notes here..."
                />
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-slate-50 p-1 -m-1 rounded transition-colors" title="Click to edit notes" onClick={() => setIsEditingNotes(true)}>
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
                <button onClick={() => colorInputRef.current?.click()} className="text-primary hover:scale-110 transition-transform flex items-center justify-center bg-primary/10 rounded-full p-1" title="Add Color">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
                <input type="color" className="hidden" ref={colorInputRef} onChange={addColor} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(selected.colors || []).map(color => (
                  <div 
                    key={color} 
                    className="w-8 h-8 rounded-lg border border-none shadow-sm cursor-pointer hover:scale-110 transition-transform relative group" 
                    style={{ background: color }}
                    onClick={() => removeColor(color)}
                    title="Click to remove"
                  >
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
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold border border-none shrink-0">
                      {comment.authorInitials}
                    </div>
                    <p className="font-bold text-xs text-slate-900 truncate max-w-[120px]" title={comment.authorName}>{comment.authorName}</p>
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

          {/* Add comment input */}
          <div className="flex gap-2 shrink-0 pt-3 border-t border-none">
            <input 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
              className="flex-1 bg-white border border-none rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm" 
              placeholder="Add your feedback..." 
            />
            <button 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="w-10 h-10 shrink-0 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center"
              title="Send Comment"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

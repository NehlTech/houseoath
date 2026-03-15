'use client';

import { useState, useEffect, useRef } from 'react';
import { Client, useStudio } from '@/context/StudioContext';

interface ProductionNotesTabProps {
  client: Client;
}

export default function ProductionNotesTab({ client }: ProductionNotesTabProps) {
  const { addProductionNote, userProfile } = useStudio();
  const [newNote, setNewNote] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [client.productionNotes]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addProductionNote(client.id, newNote);
    setNewNote('');
  };

  const isWorker = userProfile.role === 'Worker';
  // Sorting chronological: Oldest at top, Newest at bottom
  const sortedNotes = [...(client.productionNotes || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto relative min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-2 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">engineering</span>
          </div>
          <div>
            <h2 className="text-charcoal text-xl font-display font-bold tracking-wide">Production Notes</h2>
            <p className="text-gray text-xs font-medium mt-0.5">
              Logged by: <span className="font-bold text-primary">{userProfile.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area - Increased bottom padding to accommodate the sticky input */}
      <div className="flex-1 space-y-4 pb-32 px-2 animate-fade-in">
        {sortedNotes.length > 0 ? (
          sortedNotes.map((note) => {
            const isMe = note.author === userProfile.name;
            return (
              <div key={note.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-slide-up`}>
                <div className={`max-w-[85%] rounded-2xl p-4 md:p-5 ${
                  isMe 
                    ? 'bg-primary/10 rounded-tr-sm border border-primary/5' 
                    : 'bg-card shadow-sm rounded-tl-sm'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${isMe ? 'text-primary' : 'text-charcoal/60'}`}>
                      {note.author}
                    </span>
                    <span className="text-[10px] text-muted font-medium">
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-charcoal leading-relaxed whitespace-pre-wrap">
                    {note.text}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-card rounded-2xl shadow-sm p-12 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-muted text-5xl mb-3">chat_bubble</span>
            <p className="text-gray font-medium">No production notes yet.</p>
            <p className="text-muted text-xs mt-1">Start logging progress updates for this dress.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Telegram-style Sticky Bottom Input - Using sticky instead of fixed/absolute */}
      <div className="sticky bottom-[-1px] left-0 right-0 p-3 sm:p-4 bg-canvas/90 backdrop-blur-xl border-t border-charcoal/5 z-40 -mx-4 sm:mx-0">
        <form onSubmit={handleAddNote} className="max-w-3xl mx-auto flex gap-2 items-center">
          <div className="flex-1 relative group">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={isWorker ? "Type an update..." : "Add a production note..."}
              className="w-full bg-card border border-charcoal/5 shadow-inner rounded-full h-12 md:h-14 pl-6 pr-14 text-charcoal text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:outline-none transition-all placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={!newNote.trim()}
              className="absolute right-1.5 top-1.5 size-9 md:size-11 bg-primary text-white rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:hover:scale-100 shadow-lg shadow-primary/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] md:text-[22px] leading-none">send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

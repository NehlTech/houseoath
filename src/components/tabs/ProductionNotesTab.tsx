'use client';

import { useState } from 'react';
import { Client, useStudio } from '@/context/StudioContext';

interface ProductionNotesTabProps {
  client: Client;
}

export default function ProductionNotesTab({ client }: ProductionNotesTabProps) {
  const { addProductionNote, userProfile } = useStudio();
  const [newNote, setNewNote] = useState('');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addProductionNote(client.id, newNote);
    setNewNote('');
  };

  const isWorker = userProfile.role === 'Worker';
  const sortedNotes = [...(client.productionNotes || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between">
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

      <div className="bg-card rounded-2xl shadow-sm p-6 relative">
        <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={isWorker ? "E.g., Finished the bodice, starting the skirt..." : "Add a production note..."}
            className="flex-1 bg-canvas border-none shadow-sm rounded-xl h-14 px-5 text-charcoal focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="h-14 bg-primary text-white px-8 rounded-xl font-bold tracking-wide transition-all hover:bg-[#E5C04A] disabled:opacity-50 disabled:hover:bg-primary whitespace-nowrap flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            Post Update
          </button>
        </form>
      </div>

      <div className="space-y-4 mt-6">
        {sortedNotes.length > 0 ? (
          sortedNotes.map((note) => {
            const isMe = note.author === userProfile.name;
            return (
              <div key={note.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-5 ${
                  isMe 
                    ? 'bg-primary/10 rounded-tr-sm' 
                    : 'bg-card shadow-sm rounded-tl-sm'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className={`text-xs font-bold tracking-wider ${isMe ? 'text-primary' : 'text-charcoal'}`}>
                      {note.author}
                    </span>
                    <span className="text-[10px] text-muted font-medium">
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(note.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray leading-relaxed whitespace-pre-wrap">
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
      </div>
    </div>
  );
}

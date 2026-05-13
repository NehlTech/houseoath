'use client';

import { useState } from 'react';
import { Client, useStudio } from '@/context/StudioContext';

interface ConsultationModalProps {
  client: Client;
  onClose: () => void;
}

export default function ConsultationModal({ client, onClose }: ConsultationModalProps) {
  const { updateClient, addTimelineEvent } = useStudio();
  const [notes, setNotes] = useState(client.consultationNotes || '');

  const handleSave = () => {
    const isFirst = !client.consultationDone;
    updateClient(client.id, {
      consultationDone: true,
      consultationNotes: notes,
    });
    if (isFirst) {
      addTimelineEvent(
        client.id,
        'Consultation Done',
        'Initial consultation completed and notes recorded.',
      );
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card/90 backdrop-blur-md px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-display font-bold tracking-wide text-charcoal">
              Consultation Notes
            </h2>
            <p className="text-xs text-muted mt-0.5 font-medium">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-canvas transition-colors"
          >
            <span className="material-symbols-outlined text-muted">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4">
          {client.consultationDone && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-success/10 rounded-lg">
              <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
              <span className="text-success text-sm font-semibold">Consultation already completed — you can update the notes below.</span>
            </div>
          )}
          <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">
            Notes
          </label>
          <textarea
            className="w-full bg-canvas rounded-lg p-4 text-charcoal text-sm leading-relaxed outline-none focus:ring-1 focus:ring-primary resize-none border-none shadow-sm"
            rows={7}
            placeholder="Record client preferences, style brief, measurements discussed, special instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3 border-t border-border/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray font-bold text-sm hover:bg-canvas transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-[#E5C04A] transition-colors shadow-sm"
          >
            {client.consultationDone ? 'Update Notes' : 'Done — Mark Consulted'}
          </button>
        </div>
      </div>
    </div>
  );
}

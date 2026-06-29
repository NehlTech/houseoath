'use client';

import { useEffect } from 'react';
import { useStudio } from '@/context/StudioContext';
import WalkInBillingPanel from '@/components/WalkInBillingPanel';

interface WalkInBillingModalProps {
  onClose: () => void;
}

export default function WalkInBillingModal({ onClose }: WalkInBillingModalProps) {
  const { userProfile } = useStudio();
  const isSuperuser = userProfile.id === 'admin';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Defense in depth — the Sidebar menu item already hides this from anyone
  // but the superuser, but block direct access too in case that ever changes.
  if (!isSuperuser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true">
        <div role="dialog" aria-modal="true" aria-label="Walk-in billing" className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
          <span className="material-symbols-outlined text-4xl text-muted mb-3 block" aria-hidden="true">lock</span>
          <p className="font-display font-bold text-charcoal text-lg tracking-wide mb-1">Walk-in billing</p>
          <p className="text-sm text-gray font-medium">This feature is only available to the studio owner.</p>
          <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-canvas text-charcoal font-bold text-sm rounded-xl hover:bg-border/50 transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkin-billing-modal-title"
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0 shrink-0">
          <div>
            <h2 id="walkin-billing-modal-title" className="text-2xl font-display font-bold tracking-wide text-charcoal">Walk-in billing</h2>
            <p className="text-xs text-muted font-medium mt-0.5">Prepare a receipt or invoice without adding a client</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-canvas text-muted hover:text-charcoal transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <WalkInBillingPanel />
        </div>
      </div>
    </div>
  );
}

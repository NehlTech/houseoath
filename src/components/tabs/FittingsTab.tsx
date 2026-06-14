'use client';

import { useState } from 'react';
import { Client, useStudio } from '@/context/StudioContext';

interface FittingsTabProps {
 client: Client;
}

export default function FittingsTab({ client }: FittingsTabProps) {
 const { updateClient, addTimelineEvent } = useStudio();

 const fittingDone = client.fittingDone || false;
 const noFitting = client.noFitting || false;
 const history = client.fittingRescheduleHistory || [];
 // Read directly from client — always in sync when the tab remounts
 const fittingDate = client.nextFittingDate || client.fittings?.firstFitting || '';

 const [inputDate, setInputDate] = useState('');
 const [showDatePicker, setShowDatePicker] = useState(false);
 const [showReschedule, setShowReschedule] = useState(false);
 const [rescheduleNote, setRescheduleNote] = useState('');
 const [newFittingDate, setNewFittingDate] = useState('');

 const handleSetFittingDate = () => {
 if (!inputDate) return;
 updateClient(client.id, {
 fittings: { ...client.fittings, firstFitting: inputDate },
 nextFittingDate: inputDate,
 });
 setShowDatePicker(false);
 setInputDate('');
 addTimelineEvent(client.id, 'Fitting Scheduled', `First fitting scheduled for ${new Date(inputDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`);
 };

 const handleReschedule = () => {
 if (!newFittingDate) return;
 const entry = { id: `r-${Date.now()}`, date: new Date().toISOString(), note: rescheduleNote, newDate: newFittingDate };
 const updatedHistory = [...history, entry];
 updateClient(client.id, {
 fittings: { ...client.fittings, firstFitting: newFittingDate },
 nextFittingDate: newFittingDate,
 fittingRescheduleHistory: updatedHistory,
 });
 setShowReschedule(false);
 setRescheduleNote('');
 setNewFittingDate('');
 addTimelineEvent(
 client.id,
 'Fitting Rescheduled',
 `Fitting rescheduled to ${new Date(newFittingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.${rescheduleNote ? ` Reason: ${rescheduleNote}` : ''}`
 );
 };

 const handleMarkDone = () => {
 updateClient(client.id, { fittingDone: true });
 addTimelineEvent(client.id, 'Fitting Completed', 'Client fitting session completed successfully.');
 };

 const handleNoFitting = () => {
 updateClient(client.id, { noFitting: true });
 addTimelineEvent(client.id, 'No Fitting: Client Opted Out', 'Client does not require a fitting session.');
 };

 const inputCls = 'w-full border border-border/60 rounded-lg h-10 px-3 text-sm bg-white outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all';
 const textareaCls = 'w-full border border-border/60 rounded-lg p-3 text-sm bg-white outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none transition-all';

 return (
 <div className="animate-fade-in space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="material-symbols-outlined text-primary text-3xl">checkroom</span>
 <div>
 <h2 className="text-xl font-bold tracking-tight text-charcoal">Fitting Session</h2>
 <p className="text-xs text-muted font-medium">Schedule and track client fitting</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {fittingDone && (
 <span className="flex items-center gap-1 bg-success/10 text-success px-3 py-1 rounded-full text-xs font-bold">
 <span className="material-symbols-outlined text-[14px]">check_circle</span>
 Fitting Done
 </span>
 )}
 {noFitting && !fittingDone && (
 <span className="flex items-center gap-1 bg-canvas text-muted px-3 py-1 rounded-full text-xs font-bold border border-border/50">
 <span className="material-symbols-outlined text-[14px]">event_busy</span>
 No Fitting
 </span>
 )}
 </div>
 </div>

 {/* Main Card */}
 {noFitting && !fittingDone ? (
 <div className="bg-white rounded-xl p-8 border border-primary/10 shadow-sm text-center space-y-4">
 <span className="material-symbols-outlined text-5xl text-border">event_busy</span>
 <p className="text-muted font-medium">Client has opted out of a fitting session.</p>
 <button
 onClick={() => updateClient(client.id, { noFitting: false })}
 className="px-4 py-2 rounded-lg bg-canvas text-gray text-sm font-semibold hover:bg-border/40 transition-colors"
 >
 Reset
 </button>
 </div>
 ) : fittingDone ? (
 <div className="bg-success/5 rounded-xl p-6 border border-success/20 shadow-sm space-y-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-success/10 rounded-lg">
 <span className="material-symbols-outlined text-success text-2xl">check_circle</span>
 </div>
 <div>
 <p className="font-bold text-charcoal text-lg">Fitting Completed</p>
 {fittingDate && (
 <p className="text-sm text-muted mt-0.5">
 {new Date(fittingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
 </p>
 )}
 </div>
 </div>
 <button
 onClick={() => updateClient(client.id, { fittingDone: false })}
 className="text-xs text-muted hover:text-danger transition-colors font-medium"
 >
 Undo
 </button>
 </div>
 ) : (
 <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm space-y-5">
 {fittingDate ? (
 <>
 <div className="flex items-start justify-between gap-3 flex-wrap">
 <div>
 <p className="text-xs font-bold tracking-wider text-gray mb-1.5">Scheduled Fitting Date</p>
 <p className="text-lg font-bold text-charcoal">
 {new Date(fittingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
 </p>
 </div>
 <div className="flex gap-2 flex-wrap">
 <button
 onClick={() => setShowReschedule(v => !v)}
 className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
 >
 <span className="material-symbols-outlined text-sm">edit_calendar</span>
 Reschedule
 </button>
 <button
 onClick={handleMarkDone}
 className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-bold hover:bg-success/20 transition-colors"
 >
 <span className="material-symbols-outlined text-sm">check_circle</span>
 Mark Done
 </button>
 </div>
 </div>

 {showReschedule && (
 <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3 animate-fade-in">
 <p className="text-sm font-bold text-charcoal">Reschedule Fitting</p>
 <div>
 <label className="block text-xs font-bold tracking-wider text-gray mb-1.5">New Date</label>
 <input
 type="date"
 className={inputCls}
 value={newFittingDate}
 onChange={e => setNewFittingDate(e.target.value)}
 />
 </div>
 <div>
 <label className="block text-xs font-bold tracking-wider text-gray mb-1.5">Reason (optional)</label>
 <textarea
 className={textareaCls}
 rows={2}
 placeholder="e.g. Client travel conflict, studio unavailable..."
 value={rescheduleNote}
 onChange={e => setRescheduleNote(e.target.value)}
 />
 </div>
 <div className="flex gap-2">
 <button
 onClick={handleReschedule}
 disabled={!newFittingDate}
 className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all"
 >
 Confirm
 </button>
 <button
 onClick={() => { setShowReschedule(false); setRescheduleNote(''); setNewFittingDate(''); }}
 className="px-4 py-2 rounded-lg bg-canvas text-gray text-sm font-semibold hover:bg-border/40 transition-colors"
 >
 Cancel
 </button>
 </div>
 </div>
 )}
 </>
 ) : (
 <div className="text-center space-y-4 py-4">
 <span className="material-symbols-outlined text-5xl text-border">event</span>
 <p className="text-muted text-sm font-medium">No fitting date scheduled yet.</p>
 {showDatePicker ? (
 <div className="space-y-3 max-w-xs mx-auto">
 <input
 type="date"
 className={inputCls}
 value={inputDate}
 onChange={e => setInputDate(e.target.value)}
 />
 <button
 onClick={handleSetFittingDate}
 disabled={!inputDate}
 className="w-full px-6 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all"
 >
 Set Date
 </button>
 </div>
 ) : (
 <button
 onClick={() => setShowDatePicker(true)}
 className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:brightness-110 transition-all"
 >
 Schedule Fitting
 </button>
 )}
 </div>
 )}

 <div className="flex justify-end pt-2 border-t border-border/50">
 <button
 onClick={handleNoFitting}
 className="text-xs text-muted hover:text-danger transition-colors font-medium"
 >
 Client doesn&apos;t need a fitting
 </button>
 </div>
 </div>
 )}

 {/* Reschedule History */}
 {history.length > 0 && (
 <div className="bg-white rounded-xl p-5 border border-primary/10 shadow-sm space-y-3">
 <h4 className="font-bold text-sm text-charcoal flex items-center gap-2">
 <span className="material-symbols-outlined text-primary text-lg">history</span>
 Reschedule History
 </h4>
 <div className="space-y-0">
 {history.map((entry, i) => (
 <div key={entry.id} className={`flex items-start gap-3 py-3 ${i < history.length - 1 ? 'border-b border-border/50' : ''}`}>
 <span className="material-symbols-outlined text-primary/60 text-sm mt-0.5 shrink-0">edit_calendar</span>
 <div>
 <p className="text-sm font-semibold text-charcoal">
 Rescheduled to {new Date(entry.newDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
 </p>
 {entry.note && <p className="text-xs text-muted mt-0.5 italic">&ldquo;{entry.note}&rdquo;</p>}
 <p className="text-[10px] text-muted/60 mt-0.5">
 {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}

'use client';

import { useState, useEffect } from 'react';
import { useStudio } from '@/context/StudioContext';
import { getAvatarColor } from '@/lib/avatarColors';

interface SettingsModalProps {
 onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
 const { userProfile, auditLogs, workers, clients, addWorker, removeWorker, archiveWorker, restoreWorker } = useStudio();
 const isAdmin = userProfile.role === 'Admin';

 const [activeTab, setActiveTab] = useState<'team' | 'audit'>('team');
 const [newWorkerName, setNewWorkerName] = useState('');
 const [newWorkerEmail, setNewWorkerEmail] = useState('');
 const [newWorkerRole, setNewWorkerRole] = useState<'Worker' | 'Admin'>('Worker');
 const [inviteSent, setInviteSent] = useState(false);
 const [addWorkerError, setAddWorkerError] = useState('');
 const [addWorkerLoading, setAddWorkerLoading] = useState(false);
 const [showArchived, setShowArchived] = useState(false);

 // { id, type: 'archive' | 'delete' } — which worker row is showing inline confirm
 const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'archive' | 'delete' } | null>(null);

 useEffect(() => {
   const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
   document.addEventListener('keydown', handleKeyDown);
   return () => document.removeEventListener('keydown', handleKeyDown);
 }, [onClose]);

 const activeWorkers = workers.filter(w => w.status !== 'Archived');
 const archivedWorkers = workers.filter(w => w.status === 'Archived');
 const assignedCount = (worker: { id?: string; name: string }) =>
 clients.filter(c => (worker.id && c.assignedWorkerId === worker.id) || (!c.assignedWorkerId && c.assignedWorker === worker.name)).length;

 // Workers only see a minimal empty state — their entry point is Profile
 if (!isAdmin) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true">
 <div role="dialog" aria-modal="true" aria-label="Studio Settings" className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
 <span className="material-symbols-outlined text-4xl text-muted mb-3 block" aria-hidden="true">lock</span>
 <p className="font-display font-bold text-charcoal text-lg tracking-wide mb-1">Studio Settings</p>
 <p className="text-sm text-gray font-medium">Studio settings are managed by your Admin.</p>
 <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-canvas text-charcoal font-bold text-sm rounded-xl hover:bg-border/50 transition-colors">
 Close
 </button>
 </div>
 </div>
 );
 }

 const handleAddWorker = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newWorkerName.trim() || !newWorkerEmail.trim()) return;
 setAddWorkerError('');
 setAddWorkerLoading(true);
 const error = await addWorker(newWorkerName.trim(), newWorkerEmail.trim(), newWorkerRole);
 setAddWorkerLoading(false);
 if (error) {
 setAddWorkerError(error);
 } else {
 setNewWorkerName('');
 setNewWorkerEmail('');
 setNewWorkerRole('Worker');
 setInviteSent(true);
 setTimeout(() => setInviteSent(false), 5000);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true">
 <div
 role="dialog"
 aria-modal="true"
 aria-labelledby="settings-modal-title"
 className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-6 pt-6 pb-0 shrink-0">
 <div>
 <h2 id="settings-modal-title" className="text-2xl font-display font-bold tracking-wide text-charcoal">Studio Settings</h2>
 <p className="text-xs text-muted font-medium mt-0.5">Team management and activity logs</p>
 </div>
 <button
 onClick={onClose}
 aria-label="Close"
 className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-canvas text-muted hover:text-charcoal transition-colors"
 >
 <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
 </button>
 </div>

 {/* Tab bar */}
 <div className="flex px-6 mt-4 gap-1 border-b border-border/40 shrink-0">
 <button
 onClick={() => setActiveTab('team')}
 className={`flex items-center gap-2 px-4 py-2.5 font-bold text-[12px] tracking-wider transition-colors relative ${
 activeTab === 'team' ? 'text-primary' : 'text-muted hover:text-gray'
 }`}
 >
 <span className="material-symbols-outlined text-[17px]">group</span>
 Team
 {activeTab === 'team' && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-t-full" />}
 </button>
 <button
 onClick={() => setActiveTab('audit')}
 className={`flex items-center gap-2 px-4 py-2.5 font-bold text-[12px] tracking-wider transition-colors relative ${
 activeTab === 'audit' ? 'text-primary' : 'text-muted hover:text-gray'
 }`}
 >
 <span className="material-symbols-outlined text-[17px]">history</span>
 Audit Logs
 {activeTab === 'audit' && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-t-full" />}
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-6 space-y-8">
 {/* Team Tab */}
 {activeTab === 'team' && (
 <div className="space-y-8 animate-fade-in">
 <div>
 <h4 className="font-display font-bold text-xl tracking-wide text-charcoal mb-1">Worker Management</h4>
 <p className="text-sm text-gray font-medium">Add or remove tailors and seamstresses. Workers only see clients assigned directly to them.</p>
 </div>

 <form onSubmit={handleAddWorker} className="bg-canvas p-5 md:p-6 rounded-2xl flex flex-col gap-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label htmlFor="new-worker-name" className="block text-xs font-bold tracking-wider text-gray mb-2">Worker Name</label>
 <input
 id="new-worker-name"
 type="text"
 required
 value={newWorkerName}
 onChange={e => { setNewWorkerName(e.target.value); setAddWorkerError(''); }}
 placeholder="e.g. Kwame Osei"
 className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
 />
 </div>
 <div>
 <label htmlFor="new-worker-email" className="block text-xs font-bold tracking-wider text-gray mb-2">Login Email</label>
 <input
 id="new-worker-email"
 type="email"
 required
 value={newWorkerEmail}
 onChange={e => { setNewWorkerEmail(e.target.value); setAddWorkerError(''); }}
 placeholder="kwame@houseofoath.com"
 className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
 />
 </div>
 </div>
 <div>
 <label htmlFor="new-worker-role" className="block text-xs font-bold tracking-wider text-gray mb-2">Role</label>
 <select
 id="new-worker-role"
 value={newWorkerRole}
 onChange={e => setNewWorkerRole(e.target.value as 'Worker' | 'Admin')}
 className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none"
 >
 <option value="Worker">Worker — sees only assigned clients</option>
 <option value="Admin">Admin — full access</option>
 </select>
 </div>
 <div className="bg-primary/8 rounded-xl px-4 py-3 flex items-start gap-3">
 <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">mail</span>
 <p className="text-xs text-gray leading-relaxed">An invite link will be emailed to this person. They click it to access the studio — no password needed. They can set one in their Profile afterwards.</p>
 </div>
 {inviteSent && (
 <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
 <span className="material-symbols-outlined text-green-600 text-lg shrink-0">check_circle</span>
 <p className="text-xs text-green-700 font-semibold">Team member added — invite email sent!</p>
 </div>
 )}
 {addWorkerError && (
 <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
 <span className="material-symbols-outlined text-red-500 text-lg shrink-0">error</span>
 <p className="text-xs text-red-700 font-semibold">{addWorkerError}</p>
 </div>
 )}
 <div className="flex justify-end">
 <button type="submit" disabled={addWorkerLoading} className="px-6 py-2.5 bg-primary text-white font-bold tracking-wide rounded-xl shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all text-sm disabled:opacity-60">
 {addWorkerLoading ? 'Adding…' : 'Add & Send Invite'}
 </button>
 </div>
 </form>

 {/* Active workers */}
 <div className="space-y-3">
 <h5 className="font-bold tracking-wide text-charcoal">Current Team ({activeWorkers.length})</h5>
 {activeWorkers.length > 0 ? activeWorkers.map(worker => {
 const isConfirming = confirmAction?.id === worker.id;
 const clientCount = assignedCount(worker);
 return (
 <div key={worker.id} className="rounded-xl bg-canvas transition-colors group overflow-hidden">
 {/* Worker info row */}
 <div className="flex items-center justify-between p-4">
 <div className="flex items-center gap-4 min-w-0">
 <div className="h-10 w-10 shrink-0 rounded-full font-bold text-white flex items-center justify-center shadow-sm text-sm" style={{ backgroundColor: getAvatarColor(worker.name) }}>
 {worker.name.charAt(0)}
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="font-bold text-sm text-charcoal">{worker.name}</p>
 <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
 worker.role === 'Admin' ? 'bg-primary/15 text-primary' : 'bg-white border border-border text-muted'
 }`}>{worker.role}</span>
 {clientCount > 0 && (
 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
 {clientCount} client{clientCount !== 1 ? 's' : ''}
 </span>
 )}
 </div>
 <p className="text-xs text-muted font-medium truncate">{worker.email}</p>
 </div>
 </div>
 {/* Action buttons — always visible */}
 {!isConfirming && (
 <div className="flex items-center gap-1 shrink-0 ml-2">
 <button
 onClick={() => setConfirmAction({ id: worker.id!, type: 'archive' })}
 className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-warning/10 hover:text-warning transition-colors"
 title="Archive worker"
 >
 <span className="material-symbols-outlined text-[18px]">inventory_2</span>
 </button>
 <button
 onClick={() => setConfirmAction({ id: worker.id!, type: 'delete' })}
 className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors"
 title="Permanently remove"
 >
 <span className="material-symbols-outlined text-[18px]">delete</span>
 </button>
 </div>
 )}
 </div>

 {/* Inline confirmation banner */}
 {isConfirming && confirmAction?.type === 'archive' && (
 <div className="px-4 pb-4 animate-fade-in">
 <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3">
 <p className="text-xs font-semibold text-charcoal mb-2">
 Archive {worker.name}?
 {clientCount > 0 && (
 <span className="font-normal text-gray ml-1">
 They have {clientCount} assigned client{clientCount !== 1 ? 's' : ''} — assignments will stay but they won&apos;t be able to log in.
 </span>
 )}
 {clientCount === 0 && <span className="font-normal text-gray ml-1">They won&apos;t be able to log in. You can restore them later.</span>}
 </p>
 <div className="flex gap-2">
 <button
 onClick={() => { archiveWorker(worker.id!); setConfirmAction(null); }}
 className="px-4 py-1.5 bg-warning text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all"
 >
 Archive
 </button>
 <button
 onClick={() => setConfirmAction(null)}
 className="px-4 py-1.5 bg-canvas text-gray text-xs font-bold rounded-lg hover:bg-border/50 transition-all"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 {isConfirming && confirmAction?.type === 'delete' && (
 <div className="px-4 pb-4 animate-fade-in">
 <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
 <p className="text-xs font-semibold text-charcoal mb-2">
 Permanently remove {worker.name}?
 {clientCount > 0 && (
 <span className="font-normal text-gray ml-1">
 This will unassign {clientCount} client{clientCount !== 1 ? 's' : ''}. This cannot be undone.
 </span>
 )}
 {clientCount === 0 && <span className="font-normal text-gray ml-1">This cannot be undone.</span>}
 </p>
 <div className="flex gap-2">
 <button
 onClick={() => { removeWorker(worker.id!); setConfirmAction(null); }}
 className="px-4 py-1.5 bg-danger text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all"
 >
 Remove
 </button>
 <button
 onClick={() => setConfirmAction(null)}
 className="px-4 py-1.5 bg-canvas text-gray text-xs font-bold rounded-lg hover:bg-border/50 transition-all"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
 }) : (
 <p className="text-sm text-muted italic bg-canvas p-6 rounded-xl text-center">No active workers.</p>
 )}
 </div>

 {/* Archived workers */}
 {archivedWorkers.length > 0 && (
 <div className="space-y-3">
 <button
 onClick={() => setShowArchived(v => !v)}
 className="flex items-center gap-2 text-sm font-bold text-muted hover:text-charcoal transition-colors"
 >
 <span className="material-symbols-outlined text-[18px]">
 {showArchived ? 'expand_less' : 'expand_more'}
 </span>
 Archived ({archivedWorkers.length})
 </button>
 {showArchived && archivedWorkers.map(worker => (
 <div key={worker.id} className="flex items-center justify-between p-4 rounded-xl bg-canvas opacity-60 hover:opacity-80 transition-opacity">
 <div className="flex items-center gap-4 min-w-0">
 <div className="h-10 w-10 shrink-0 rounded-full font-bold text-white flex items-center justify-center shadow-sm text-sm grayscale" style={{ backgroundColor: getAvatarColor(worker.name) }}>
 {worker.name.charAt(0)}
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="font-bold text-sm text-charcoal">{worker.name}</p>
 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-canvas border border-border text-muted shrink-0">Archived</span>
 </div>
 <p className="text-xs text-muted font-medium truncate">{worker.email}</p>
 </div>
 </div>
 <button
 onClick={() => worker.id && restoreWorker(worker.id)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-success hover:bg-success/10 transition-colors shrink-0 ml-2"
 title="Restore worker"
 >
 <span className="material-symbols-outlined text-[16px]">restore</span>
 Restore
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Audit Logs Tab */}
 {activeTab === 'audit' && (
 <div className="space-y-4 animate-fade-in">
 <p className="text-sm text-gray font-medium">A record of recent actions taken within your studio account.</p>
 <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
 {auditLogs.map((log) => (
 <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
 <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/5 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
 <span className="material-symbols-outlined text-[18px] text-primary">history</span>
 </div>
 <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-canvas p-4 rounded-xl shadow-sm">
 <div className="flex items-center justify-between mb-1">
 <h4 className="font-bold tracking-wide text-charcoal text-sm">{log.action}</h4>
 <span className="text-[10px] text-primary font-bold tracking-wider">
 {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 <p className="text-xs text-gray leading-relaxed font-medium">{log.description}</p>
 </div>
 </div>
 ))}
 {auditLogs.length === 0 && (
 <div className="text-center text-muted text-sm py-8 bg-canvas rounded-xl">
 No audit logs recorded yet.
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

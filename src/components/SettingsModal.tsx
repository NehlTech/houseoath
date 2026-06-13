'use client';

import { useState } from 'react';
import { useStudio } from '@/context/StudioContext';
import { getAvatarColor } from '@/lib/avatarColors';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { userProfile, auditLogs, workers, addWorker, removeWorker } = useStudio();
  const isAdmin = userProfile.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'team' | 'audit'>('team');
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<'Worker' | 'Admin'>('Worker');
  const [inviteSent, setInviteSent] = useState(false);

  // Workers only see a minimal empty state — their entry point is Profile
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
          <span className="material-symbols-outlined text-4xl text-muted mb-3 block">lock</span>
          <p className="font-display font-bold text-charcoal text-lg tracking-wide mb-1">Studio Settings</p>
          <p className="text-sm text-gray font-medium">Studio settings are managed by your Admin.</p>
          <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-canvas text-charcoal font-bold text-sm rounded-xl hover:bg-border/50 transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkerName.trim() && newWorkerEmail.trim()) {
      addWorker(newWorkerName.trim(), newWorkerEmail.trim(), newWorkerRole);
      setNewWorkerName('');
      setNewWorkerEmail('');
      setNewWorkerRole('Worker');
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0 shrink-0">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-wide text-charcoal">Studio Settings</h2>
            <p className="text-xs text-muted font-medium mt-0.5">Team management and activity logs</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-canvas text-muted hover:text-charcoal transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-6 mt-4 gap-1 border-b border-border/40 shrink-0">
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-[12px] uppercase tracking-wider transition-colors relative ${
              activeTab === 'team' ? 'text-primary' : 'text-muted hover:text-gray'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">group</span>
            Team
            {activeTab === 'team' && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-[12px] uppercase tracking-wider transition-colors relative ${
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Worker Name</label>
                    <input
                      type="text"
                      required
                      value={newWorkerName}
                      onChange={e => setNewWorkerName(e.target.value)}
                      placeholder="e.g. Kwame Osei"
                      className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Login Email</label>
                    <input
                      type="email"
                      required
                      value={newWorkerEmail}
                      onChange={e => setNewWorkerEmail(e.target.value)}
                      placeholder="kwame@houseofoath.com"
                      className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Role</label>
                  <select
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
                <div className="flex justify-end">
                  <button type="submit" className="px-6 py-2.5 bg-primary text-white font-bold tracking-wide rounded-xl shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all text-sm">
                    Add &amp; Send Invite
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h5 className="font-bold tracking-wide text-charcoal">Current Team ({workers.length})</h5>
                {workers.length > 0 ? workers.map(worker => (
                  <div key={worker.id} className="flex items-center justify-between p-4 rounded-xl bg-canvas hover:bg-border/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full font-bold text-white flex items-center justify-center shadow-sm text-sm" style={{ backgroundColor: getAvatarColor(worker.name) }}>
                        {worker.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-charcoal tracking-wide">{worker.name}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            worker.role === 'Admin' ? 'bg-primary/15 text-primary' : 'bg-canvas border border-border text-muted'
                          }`}>{worker.role}</span>
                        </div>
                        <p className="text-xs text-muted font-medium">{worker.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => worker.id && removeWorker(worker.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove Worker"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-muted italic bg-canvas p-6 rounded-xl text-center">No workers added yet.</p>
                )}
              </div>
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
                        <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
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

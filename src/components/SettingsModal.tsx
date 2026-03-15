'use client';

import { useState, useRef } from 'react';
import { useStudio } from '@/context/StudioContext';
import { getAvatarColor } from '@/lib/avatarColors';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { userProfile, updateUserProfile, auditLogs, workers, addWorker, removeWorker } = useStudio();
  const isAdmin = userProfile.role === 'Admin';
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'team' | 'audit'>('profile');

  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [photoUrl, setPhotoUrl] = useState(userProfile.avatar || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerPassword, setNewWorkerPassword] = useState('');

  const initials = userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const profileFileRef = useRef<HTMLInputElement>(null);

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB.'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPhotoUrl(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveProfilePhoto = () => {
    setPhotoUrl('');
  };

  const handleSaveProfile = () => {
    updateUserProfile({ name, email, avatar: photoUrl || null });
    onClose();
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword === confirmPassword && newPassword.length >= 4) {
      updateUserProfile({ password: newPassword });
      alert('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else if (newPassword.length < 4) {
      alert('Password must be at least 4 characters long.');
    } else {
      alert('Passwords do not match.');
    }
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkerName.trim() && newWorkerEmail.trim() && newWorkerPassword.trim()) {
      addWorker(newWorkerName.trim(), newWorkerEmail.trim(), newWorkerPassword.trim());
      setNewWorkerName('');
      setNewWorkerEmail('');
      setNewWorkerPassword('');
    } else {
      alert('Please fill in all worker details, including a password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-card rounded-2xl shadow-2xl shadow-sm border-none w-full max-w-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 bg-canvas border-b md:border-b-0 md: flex flex-col shrink-0">
          <div className="p-6 pb-2">
            <h2 className="text-2xl font-display font-bold tracking-wide text-charcoal">Settings</h2>
          </div>
          
          <nav className="flex md:flex-col gap-1 p-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-colors whitespace-nowrap min-w-max ${
                activeTab === 'profile' ? 'bg-primary/10 text-primary' : 'text-gray hover:bg-card hover:text-charcoal'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-colors whitespace-nowrap min-w-max ${
                activeTab === 'security' ? 'bg-primary/10 text-primary' : 'text-gray hover:bg-card hover:text-charcoal'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              Security
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('team')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-colors whitespace-nowrap min-w-max ${
                    activeTab === 'team' ? 'bg-primary/10 text-primary' : 'text-gray hover:bg-card hover:text-charcoal'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  Team
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-colors whitespace-nowrap min-w-max ${
                    activeTab === 'audit' ? 'bg-primary/10 text-primary' : 'text-gray hover:bg-card hover:text-charcoal'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  Audit Logs
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card">
          <div className="flex items-center justify-between p-6 ">
            <h3 className="text-xl font-display font-bold tracking-wide text-charcoal capitalize">{activeTab.replace('-', ' ')}</h3>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-canvas text-muted hover:text-charcoal transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-6">
                  <input ref={profileFileRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} />
                  <div className="relative">
                    {(photoUrl || userProfile.avatar) ? (
                      <div className="h-24 w-24 rounded-full bg-cover bg-center shadow-md border-none shadow-sm cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundImage: `url('${photoUrl || userProfile.avatar}')` }} onClick={() => profileFileRef.current?.click()} />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full font-display font-bold text-3xl text-white shadow-md border-none shadow-sm cursor-pointer hover:opacity-80 transition-opacity" style={{ background: getAvatarColor(userProfile.name) }} onClick={() => profileFileRef.current?.click()}>
                        {initials}
                      </div>
                    )}
                    {(photoUrl || userProfile.avatar) && (
                      <button onClick={handleRemoveProfilePhoto} className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow-sm hover:brightness-110 transition-all" title="Remove Photo">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <button onClick={() => profileFileRef.current?.click()} className="px-4 py-2 bg-canvas hover:bg-border/50 shadow-sm border-none text-gray text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors">
                      Change Picture
                    </button>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted">JPG, GIF or PNG. 10MB max.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full bg-canvas shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none placeholder-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="w-full bg-canvas shadow-sm border-none text-muted rounded-xl h-12 px-4 focus:outline-none cursor-not-allowed"
                      disabled
                    />
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted mt-2">Contact support to change your email address.</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button onClick={handleSaveProfile} className="px-6 py-2.5 bg-primary text-white font-bold tracking-wide rounded-xl shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all text-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <form onSubmit={handleUpdatePassword} className="space-y-6 animate-fade-in">
                <div>
                  <h4 className="font-display font-bold text-xl tracking-wide text-charcoal  pb-2 mb-4">Change Password</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Current Password</label>
                      <input 
                        type="password" 
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full bg-canvas shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-canvas shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full bg-canvas shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button type="submit" className="px-6 py-2.5 bg-primary text-white font-bold tracking-wide rounded-xl shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all text-sm">
                    Update Password
                  </button>
                </div>
              </form>
            )}

            {/* Team Management Tab (Admin Only) */}
            {activeTab === 'team' && isAdmin && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h4 className="font-display font-bold text-xl tracking-wide text-charcoal mb-1">Worker Management</h4>
                  <p className="text-sm text-gray font-medium">Add or remove tailors and seamstresses from your studio. They will only see clients assigned directly to them.</p>
                </div>

                {/* Add Worker Form */}
                <form onSubmit={handleAddWorker} className="bg-canvas p-5 md:p-6 rounded-2xl flex flex-col gap-4">
                  <div className="w-full space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Worker Name</label>
                    <input 
                      type="text" 
                      required
                      value={newWorkerName}
                      onChange={e => setNewWorkerName(e.target.value)}
                      placeholder="e.g. Kwame Osei"
                      className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none placeholder-muted"
                    />
                  </div>
                  <div className="w-full space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Login Email</label>
                    <input 
                      type="email" 
                      required
                      value={newWorkerEmail}
                      onChange={e => setNewWorkerEmail(e.target.value)}
                      placeholder="kwame@houseofoath.com"
                      className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none placeholder-muted"
                    />
                  </div>
                  <div className="w-full space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Initial Password</label>
                    <input 
                      type="text" 
                      required
                      value={newWorkerPassword}
                      onChange={e => setNewWorkerPassword(e.target.value)}
                      placeholder="e.g. tailor2026"
                      className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none placeholder-muted"
                    />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button type="submit" className="px-6 py-2.5 bg-primary text-white font-bold tracking-wide rounded-xl shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all text-sm w-full md:w-auto">
                      Add Worker
                    </button>
                  </div>
                </form>

                {/* Workers List */}
                <div className="space-y-3">
                  <h5 className="font-bold tracking-wide text-charcoal mb-4">Current Team ({workers.length})</h5>
                  {workers.length > 0 ? workers.map(worker => (
                    <div key={worker.id} className="flex items-center justify-between p-4 rounded-xl border border-canvas hover:border-primary/20 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full font-bold text-white flex items-center justify-center shadow-sm" style={{ backgroundColor: getAvatarColor(worker.name) }}>
                          {worker.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-charcoal tracking-wide">{worker.name}</p>
                          <p className="text-xs text-muted font-medium">{worker.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => worker.id && removeWorker(worker.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors"
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
                <p className="text-sm text-gray mb-6 font-medium">A record of recent actions taken within your studio account.</p>
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full shadow-sm border-none bg-primary/5 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <span className="material-symbols-outlined text-[18px] text-primary">history</span>
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded-xl shadow-sm border-none shadow-sm hover:border-primary/20 transition-colors">
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
                    <div className="text-center text-muted text-sm py-8 bg-canvas rounded-xl shadow-sm border-none">
                      No audit logs recorded yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

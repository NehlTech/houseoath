'use client';

import { useState, useRef, useEffect } from 'react';
import { useStudio } from '@/context/StudioContext';
import { getAvatarColor } from '@/lib/avatarColors';
import { validateImageFile } from '@/lib/validateImage';

interface ProfileModalProps {
 onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
 const { userProfile, updateUserProfile } = useStudio();
 const isAdmin = userProfile.role === 'Admin';

 const [name, setName] = useState(userProfile.name);
 const [photoUrl, setPhotoUrl] = useState(userProfile.avatar || '');
 const [photoError, setPhotoError] = useState('');
 const initials = userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2);
 const profileFileRef = useRef<HTMLInputElement>(null);

 const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 e.target.value = '';
 setPhotoError('');
 const err = await validateImageFile(file);
 if (err) { setPhotoError(err); return; }
 const reader = new FileReader();
 reader.onload = ev => setPhotoUrl(ev.target?.result as string);
 reader.readAsDataURL(file);
 };

 const handleSaveProfile = () => {
 updateUserProfile({ name, avatar: photoUrl || null });
 onClose();
 };

 // ── Password ──────────────────────────────────────────────────────────────
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [passwordError, setPasswordError] = useState('');
 const [passwordSuccess, setPasswordSuccess] = useState(false);
 const [passwordLoading, setPasswordLoading] = useState(false);
 const [hasPassword, setHasPassword] = useState<boolean | null>(null);

 useEffect(() => {
 if (isAdmin) { setHasPassword(true); return; }
 fetch('/api/auth/password-status')
 .then(r => r.ok ? r.json() : null)
 .then(d => { if (d !== null) setHasPassword(d.hasPassword); })
 .catch(() => {});
 }, [isAdmin]);

 const handleUpdatePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 setPasswordError('');
 setPasswordSuccess(false);
 if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
 if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
 if (hasPassword && !currentPassword) { setPasswordError('Current password is required.'); return; }
 setPasswordLoading(true);
 try {
 const res = await fetch('/api/auth/change-password', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ currentPassword, newPassword }),
 });
 const data = await res.json();
 if (!res.ok) {
 setPasswordError(data.error || 'Failed to update password.');
 } else {
 setPasswordSuccess(true);
 setHasPassword(true);
 setCurrentPassword('');
 setNewPassword('');
 setConfirmPassword('');
 }
 } catch {
 setPasswordError('Network error. Please try again.');
 } finally {
 setPasswordLoading(false);
 }
 };

 return (
 <div
 className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 md:bg-black/40 backdrop-blur-sm animate-fade-in"
 onClick={onClose}
 >
 <div
 className="bg-card rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[92vh] flex flex-col overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 {/* Status-bar spacer + drag handle — mobile only */}
 <div className="md:hidden shrink-0">
 <div className="ios-status-spacer" />
 <div className="flex justify-center pt-2 pb-1">
 <div className="w-10 h-1 bg-border rounded-full" />
 </div>
 </div>

 {/* Header */}
 <div className="flex items-center justify-between px-5 pt-3 pb-4 md:p-5 md:pb-4 shrink-0">
 <div className="flex items-center gap-4">
 {/* Avatar — click to upload */}
 <div className="relative cursor-pointer shrink-0" onClick={() => profileFileRef.current?.click()}>
 {(photoUrl || userProfile.avatar) ? (
 <div
 className="h-14 w-14 rounded-full bg-cover bg-center shadow-md hover:opacity-80 transition-opacity"
 style={{ backgroundImage: `url('${photoUrl || userProfile.avatar}')` }}
 />
 ) : (
 <div
 className="h-14 w-14 rounded-full flex items-center justify-center font-display font-bold text-xl text-white shadow-md hover:opacity-80 transition-opacity"
 style={{ background: getAvatarColor(userProfile.name) }}
 >
 {initials}
 </div>
 )}
 <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
 <span className="material-symbols-outlined text-[11px] text-black">photo_camera</span>
 </div>
 {(photoUrl || userProfile.avatar) && (
 <button
 onClick={e => { e.stopPropagation(); setPhotoUrl(''); }}
 className="absolute -top-1 -left-1 h-4 w-4 bg-danger rounded-full flex items-center justify-center shadow-sm"
 title="Remove photo"
 >
 <span className="material-symbols-outlined text-[10px] text-white">close</span>
 </button>
 )}
 </div>
 <div>
 <p className="font-display font-bold text-base text-charcoal tracking-wide leading-tight">{userProfile.name}</p>
 <p className="text-xs text-muted font-medium truncate max-w-[180px]">{userProfile.email}</p>
 {photoError && <p className="text-xs text-danger mt-1">{photoError}</p>}
 <span className={`inline-block mt-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
 isAdmin ? 'bg-primary text-black' : 'bg-canvas text-gray border border-border'
 }`}>
 {userProfile.role}
 </span>
 </div>
 </div>
 <button
 onClick={onClose}
 className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-canvas text-muted hover:text-charcoal transition-colors"
 >
 <span className="material-symbols-outlined text-[20px]">close</span>
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
 {/* ── Personal Info ───────────────────────────────────────────────── */}
 <div className="space-y-4">
 <p className="text-[10px] font-bold tracking-normal text-muted">Personal Info</p>
 <div>
 <label className="block text-xs font-bold tracking-wider text-gray mb-2">Display Name</label>
 <input
 type="text"
 value={name}
 onChange={e => setName(e.target.value)}
 className="w-full bg-canvas shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none placeholder-muted"
 />
 </div>
 <div>
 <label className="block text-xs font-bold tracking-wider text-gray mb-2">Email Address</label>
 <input
 type="email"
 value={userProfile.email}
 disabled
 className="w-full bg-canvas shadow-sm border-none text-muted rounded-xl h-12 px-4 cursor-not-allowed outline-none"
 />
 <p className="text-[10px] tracking-wider font-bold text-muted mt-2">Contact support to change your email.</p>
 </div>
 <div className="flex justify-end">
 <button
 onClick={handleSaveProfile}
 className="px-6 py-2.5 bg-primary text-white font-bold tracking-wide rounded-xl shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all text-sm"
 >
 Save Changes
 </button>
 </div>
 </div>

 <div className="h-px bg-border/60" />

 {/* ── Password ────────────────────────────────────────────────────── */}
 <form onSubmit={handleUpdatePassword} className="space-y-4">
 <p className="text-[10px] font-bold tracking-normal text-muted">
 {isAdmin || hasPassword ? 'Change Password' : hasPassword === false ? 'Set Your Password' : 'Password'}
 </p>
 {hasPassword === false && (
 <div className="bg-primary/8 rounded-xl px-4 py-3 flex items-start gap-3">
 <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">info</span>
 <p className="text-xs text-gray leading-relaxed">You signed in via an invite link. Set a password so you can also log in with your email and password.</p>
 </div>
 )}
 {(isAdmin || hasPassword) && (
 <div>
 <label className="block text-xs font-bold tracking-wider text-gray mb-2">Current Password</label>
 <input
 type="password"
 value={currentPassword}
 onChange={e => setCurrentPassword(e.target.value)}
 className="w-full bg-canvas shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none"
 />
 </div>
 )}
 <div>
 <label className="block text-xs font-bold tracking-wider text-gray mb-2">New Password</label>
 <input
 type="password"
 required
 minLength={8}
 value={newPassword}
 onChange={e => setNewPassword(e.target.value)}
 className="w-full bg-canvas shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none"
 />
 </div>
 <div>
 <label className="block text-xs font-bold tracking-wider text-gray mb-2">Confirm New Password</label>
 <input
 type="password"
 required
 value={confirmPassword}
 onChange={e => setConfirmPassword(e.target.value)}
 className="w-full bg-canvas shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none"
 />
 </div>
 {passwordError && <p className="text-sm text-danger font-medium">{passwordError}</p>}
 {passwordSuccess && (
 <p className="text-sm text-green-600 font-medium">
 Password {hasPassword ? 'updated' : 'set'} successfully.
 </p>
 )}
 <div className="flex justify-end">
 <button
 type="submit"
 disabled={passwordLoading || (!isAdmin && hasPassword === null)}
 className="px-6 py-2.5 bg-canvas text-charcoal font-bold tracking-wide rounded-xl shadow-sm hover:bg-border/50 transition-all text-sm disabled:opacity-60"
 >
 {passwordLoading ? 'Saving…' : (isAdmin || hasPassword) ? 'Update Password' : 'Set Password'}
 </button>
 </div>
 </form>
 </div>

 <input ref={profileFileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
 </div>
 </div>
 );
}

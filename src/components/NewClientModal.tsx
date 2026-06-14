'use client';

import { useState, useRef } from 'react';
import { useStudio } from '@/context/StudioContext';
import { validateImageFile } from '@/lib/validateImage';

interface NewClientModalProps {
 onClose: () => void;
}

const COUNTRY_CODES = [
 { flag: '🇬🇭', code: '+233', name: 'Ghana' },
 { flag: '🇳🇬', code: '+234', name: 'Nigeria' },
 { flag: '🇿🇦', code: '+27', name: 'South Africa' },
 { flag: '🇰🇪', code: '+254', name: 'Kenya' },
 { flag: '🇹🇿', code: '+255', name: 'Tanzania' },
 { flag: '🇺🇬', code: '+256', name: 'Uganda' },
 { flag: '🇨🇮', code: '+225', name: "Côte d'Ivoire" },
 { flag: '🇸🇳', code: '+221', name: 'Senegal' },
 { flag: '🇨🇲', code: '+237', name: 'Cameroon' },
 { flag: '🇪🇹', code: '+251', name: 'Ethiopia' },
 { flag: '🇨🇩', code: '+243', name: 'DR Congo' },
 { flag: '🇿🇼', code: '+263', name: 'Zimbabwe' },
 { flag: '🇬🇧', code: '+44', name: 'United Kingdom' },
 { flag: '🇺🇸', code: '+1', name: 'USA / Canada' },
 { flag: '🇫🇷', code: '+33', name: 'France' },
 { flag: '🇩🇪', code: '+49', name: 'Germany' },
 { flag: '🇦🇺', code: '+61', name: 'Australia' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Max local digits per country code (after leading-0 is stripped)
const MAX_LOCAL_DIGITS: Record<string, number> = {
 '+233': 9, // Ghana: 0XX-XXX-XXXX → 9
 '+234': 10, // Nigeria: 08XX-XXX-XXXX → 10
 '+27': 9, // South Africa
 '+254': 9, // Kenya
 '+255': 9, // Tanzania
 '+256': 9, // Uganda
 '+225': 8, // Côte d'Ivoire (no leading 0)
 '+221': 9, // Senegal
 '+237': 8, // Cameroon (no leading 0)
 '+251': 9, // Ethiopia
 '+243': 9, // DR Congo
 '+263': 9, // Zimbabwe
 '+44': 10, // UK: 07XXX-XXXXXX → 10
 '+1': 10, // USA / Canada
 '+33': 9, // France
 '+49': 11, // Germany (mobile up to 11)
 '+61': 9, // Australia: 04XX-XXX-XXX → 9
};

function formatLocalPhone(digits: string): string {
 if (digits.length === 0) return '';
 if (digits.length <= 3) return digits;
 if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
 if (digits.length === 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
 if (digits.length === 9) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
 return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export default function NewClientModal({ onClose }: NewClientModalProps) {
 const { addClient, workers } = useStudio();
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [photoError, setPhotoError] = useState('');

 const [form, setForm] = useState({
 name: '', countryCode: '+233', localPhone: '', email: '',
 gender: 'Female', profession: '',
 address: '', state: '', country: 'Ghana',
 clientPackage: '',
 eventName: '', eventDate: '', eventMonth: '', eventLocation: '',
 assignedWorkerId: '',
 fabricVendor: '', kenteVendor: '',
 referralSource: '', notes: '',
 clientPhoto: '',
 });

 const handleChange = (key: string, value: string) => {
 setForm(prev => {
 const updates: Record<string, string> = { [key]: value };
 if (key === 'eventDate' && value) {
 const parts = value.split('-');
 const monthIndex = parseInt(parts[1], 10) - 1;
 updates.eventMonth = MONTHS[monthIndex] ?? '';
 }
 if (key === 'eventDate' && !value) {
 updates.eventMonth = '';
 }
 return { ...prev, ...updates };
 });
 };

 const handlePhoneInput = (raw: string) => {
 let digits = raw.replace(/\D/g, '');
 if (digits.startsWith('0')) digits = digits.slice(1);
 const maxDigits = MAX_LOCAL_DIGITS[form.countryCode] ?? 10;
 digits = digits.slice(0, maxDigits);
 handleChange('localPhone', formatLocalPhone(digits));
 };

 const handlePhotoClick = () => fileInputRef.current?.click();

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 e.target.value = '';
 setPhotoError('');
 const err = await validateImageFile(file);
 if (err) { setPhotoError(err); return; }
 const reader = new FileReader();
 reader.onload = (ev) => handleChange('clientPhoto', ev.target?.result as string);
 reader.readAsDataURL(file);
 };

 const handleRemovePhoto = (e: React.MouseEvent) => {
 e.stopPropagation();
 handleChange('clientPhoto', '');
 };

 const handleSubmit = () => {
 if (!form.name) return;
 const phone = form.localPhone
 ? `${form.countryCode} ${form.localPhone}`
 : '';
 const selectedWorker = workers.find(w => w.id === form.assignedWorkerId);
 addClient({
 name: form.name, phone, email: form.email,
 gender: form.gender, profession: form.profession,
 address: form.address, state: form.state, country: form.country,
 eventName: form.eventName, eventDate: form.eventDate,
 eventMonth: form.eventMonth, eventLocation: form.eventLocation,
 assignedWorker: selectedWorker?.name || '',
 assignedWorkerId: form.assignedWorkerId || undefined,
 fabricVendor: form.fabricVendor, kenteVendor: form.kenteVendor,
 referralSource: form.referralSource, notes: form.notes,
 fabricNotes: '',
 clientPhoto: form.clientPhoto,
 clientPackage: form.clientPackage,
 });
 onClose();
 };

 const inputCls = 'w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted';
 const labelCls = 'block text-xs font-bold tracking-wider text-gray mb-2';

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
 <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-none" onClick={(e) => e.stopPropagation()}>

 {/* Header */}
 <div className="sticky top-0 bg-card/90 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
 <h2 className="text-2xl font-display font-bold tracking-wide text-charcoal">New Client Onboarding</h2>
 <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-canvas transition-colors">
 <span className="material-symbols-outlined text-muted">close</span>
 </button>
 </div>

 <div className="p-6 space-y-8">

 {/* Photo */}
 <div className="flex flex-col items-center justify-center pt-2 pb-4">
 <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
 <div
 onClick={handlePhotoClick}
 className={`relative flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border-4 transition-all hover:border-primary/50 hover:bg-primary/5 ${form.clientPhoto ? 'shadow-md border-primary' : 'border-dashed border-none bg-canvas'}`}
 style={form.clientPhoto ? { backgroundImage: `url('${form.clientPhoto}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
 >
 {!form.clientPhoto && (
 <div className="flex flex-col items-center gap-2 text-muted">
 <span className="material-symbols-outlined text-4xl">add_a_photo</span>
 </div>
 )}
 {form.clientPhoto && (
 <>
 <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border-4 border-card bg-primary text-white shadow-sm hover:brightness-110">
 <span className="material-symbols-outlined text-[18px]">edit</span>
 </div>
 <button onClick={handleRemovePhoto} className="absolute -top-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white shadow-sm hover:brightness-110 transition-all" title="Remove Photo">
 <span className="material-symbols-outlined text-[14px]">close</span>
 </button>
 </>
 )}
 </div>
 <p className="mt-4 text-[10px] font-semibold text-muted tracking-normal">
 {form.clientPhoto ? 'Client Photo Set' : 'Tap to capture or upload photo'}
 </p>
 {photoError && <p className="text-xs text-danger mt-1 text-center">{photoError}</p>}
 </div>

 {/* Client Information */}
 <section>
 <h3 className="text-xl font-display font-bold tracking-wide text-charcoal mb-4 flex items-center gap-2 pb-2">
 <span className="material-symbols-outlined text-primary">person</span>
 Client Information
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Full Name <span className="text-primary">*</span></label>
 <input className={inputCls} placeholder="e.g. Ama Mensah" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
 </div>

 {/* Phone with country code */}
 <div>
 <label className={labelCls}>Phone</label>
 <div className="flex gap-2">
 <select
 className="bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-2 focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
 style={{ minWidth: 90 }}
 value={form.countryCode}
 onChange={(e) => handleChange('countryCode', e.target.value)}
 >
 {COUNTRY_CODES.map(c => (
 <option key={c.code + c.name} value={c.code}>{c.flag} {c.code}</option>
 ))}
 </select>
 <input
 type="tel"
 inputMode="numeric"
 className="flex-1 bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="24 123 4567"
 value={form.localPhone}
 onChange={(e) => handlePhoneInput(e.target.value)}
 maxLength={(MAX_LOCAL_DIGITS[form.countryCode] ?? 10) + 2}
 />
 </div>
 </div>

 <div>
 <label className={labelCls}>Email</label>
 <input className={inputCls} placeholder="you@email.com" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
 </div>

 <div>
 <label className={labelCls}>Profession</label>
 <input className={inputCls} placeholder="e.g. Lawyer" value={form.profession} onChange={(e) => handleChange('profession', e.target.value)} />
 </div>

 <div>
 <label className={labelCls}>Address</label>
 <input className={inputCls} placeholder="12 Independence Ave" value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
 </div>

 <div>
 <label className={labelCls}>State / Region</label>
 <input className={inputCls} placeholder="Greater Accra" value={form.state} onChange={(e) => handleChange('state', e.target.value)} />
 </div>

 <div>
 <label className={labelCls}>Gender</label>
 <select className={inputCls} value={form.gender} onChange={(e) => handleChange('gender', e.target.value)}>
 <option>Female</option><option>Male</option><option>Other</option>
 </select>
 </div>

 <div>
 <label className={labelCls}>Country</label>
 <input className={inputCls} placeholder="Ghana" value={form.country} onChange={(e) => handleChange('country', e.target.value)} />
 </div>

 <div>
 <label className={labelCls}>Package <span className="text-primary">*</span></label>
 <select className={inputCls} value={form.clientPackage} onChange={(e) => handleChange('clientPackage', e.target.value)}>
 <option value="">— Select package —</option>
 <option>Lux</option>
 <option>Classic</option>
 <option>Essential</option>
 <option>Delux</option>
 </select>
 </div>
 </div>
 </section>

 {/* Event Details */}
 <section>
 <h3 className="text-xl font-display font-bold tracking-wide text-charcoal mb-4 flex items-center gap-2 pb-2">
 <span className="material-symbols-outlined text-primary">event</span>
 Event Details
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Event Name</label>
 <input className={inputCls} placeholder="e.g. Wedding Reception" value={form.eventName} onChange={(e) => handleChange('eventName', e.target.value)} />
 </div>

 <div>
 <label className={labelCls}>Event Date</label>
 <input type="date" className={inputCls} value={form.eventDate} onChange={(e) => handleChange('eventDate', e.target.value)} />
 </div>

 {/* Event Month — auto-filled, read-only */}
 <div>
 <label className={labelCls}>
 Event Month
 <span className="ml-2 normal-case font-normal text-muted text-[10px]">auto-filled from date</span>
 </label>
 <input
 className={`${inputCls} opacity-50 cursor-not-allowed select-none`}
 placeholder="Select an event date above"
 value={form.eventMonth}
 readOnly
 tabIndex={-1}
 />
 </div>

 <div>
 <label className={labelCls}>Event Location</label>
 <input className={inputCls} placeholder="e.g. Kempinski Hotel, Accra" value={form.eventLocation} onChange={(e) => handleChange('eventLocation', e.target.value)} />
 </div>

 {/* Assigned Worker dropdown */}
 <div>
 <label className={labelCls}>Assigned Tailor / Worker</label>
 <select className={inputCls} value={form.assignedWorkerId} onChange={(e) => handleChange('assignedWorkerId', e.target.value)}>
 <option value="">— Select tailor —</option>
 {workers.filter(w => w.status !== 'Archived').map(w => (
 <option key={w.id} value={w.id}>{w.name}</option>
 ))}
 </select>
 </div>
 </div>
 </section>

 {/* Vendor Partners */}
 <section>
 <h3 className="text-xl font-display font-bold tracking-wide text-charcoal mb-4 flex items-center gap-2 pb-2">
 <span className="material-symbols-outlined text-primary">storefront</span>
 Vendor Partners
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Fabric Vendor</label>
 <input className={inputCls} placeholder="Woodin Fabrics" value={form.fabricVendor} onChange={(e) => handleChange('fabricVendor', e.target.value)} />
 </div>
 <div>
 <label className={labelCls}>Vendor Name</label>
 <input className={inputCls} placeholder="Premium Weavers" value={form.kenteVendor} onChange={(e) => handleChange('kenteVendor', e.target.value)} />
 </div>
 </div>
 </section>

 {/* Additional Information */}
 <section>
 <h3 className="text-xl font-display font-bold tracking-wide text-charcoal mb-4 flex items-center gap-2 pb-2">
 <span className="material-symbols-outlined text-primary">info</span>
 Additional Information
 </h3>
 <div className="grid grid-cols-1 gap-4">
 <div>
 <label className={labelCls}>Referral Source</label>
 <select className={inputCls} value={form.referralSource} onChange={(e) => handleChange('referralSource', e.target.value)}>
 <option value="">Select...</option>
 <option>Instagram</option><option>Word of Mouth</option>
 <option>Google</option><option>Referral</option><option>Other</option>
 </select>
 </div>
 <div>
 <label className={labelCls}>Notes</label>
 <textarea
 className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg p-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 rows={3}
 placeholder="Special instructions or notes..."
 value={form.notes}
 onChange={(e) => handleChange('notes', e.target.value)}
 />
 </div>
 </div>
 </section>

 </div>

 {/* Footer */}
 <div className="sticky bottom-0 bg-card/90 backdrop-blur-md px-6 py-4 flex justify-end gap-3 z-10">
 <button onClick={onClose} className="px-6 py-2.5 rounded-lg shadow-sm border-none text-gray font-bold text-sm tracking-wide hover:bg-canvas transition-all">Cancel</button>
 <button onClick={handleSubmit} className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all">Create Client</button>
 </div>

 </div>
 </div>
 );
}

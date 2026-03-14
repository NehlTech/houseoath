'use client';

import { useState, useRef } from 'react';
import { useStudio } from '@/context/StudioContext';

interface NewClientModalProps {
  onClose: () => void;
}

export default function NewClientModal({ onClose }: NewClientModalProps) {
  const { addClient } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', gender: 'Female', profession: '',
    address: '', state: '', country: 'Ghana',
    eventName: '', eventDate: '', eventMonth: '', eventLocation: '',
    assignedWorker: '',
    fabricVendor: '', kenteVendor: '',
    referralSource: '', notes: '',
    clientPhoto: '',
  });

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      handleChange('clientPhoto', result);
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleChange('clientPhoto', '');
  };

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.name) return;
    addClient({
      name: form.name, phone: form.phone, email: form.email,
      gender: form.gender, profession: form.profession,
      address: form.address, state: form.state, country: form.country,
      eventName: form.eventName, eventDate: form.eventDate,
      eventMonth: form.eventMonth, eventLocation: form.eventLocation,
      assignedWorker: form.assignedWorker,
      fabricVendor: form.fabricVendor, kenteVendor: form.kenteVendor,
      referralSource: form.referralSource, notes: form.notes,
      fabricNotes: '',
      clientPhoto: form.clientPhoto,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-sm border-none" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card/90 backdrop-blur-md  px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-display font-bold tracking-wide text-charcoal">New Client Onboarding</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-canvas transition-colors">
            <span className="material-symbols-outlined text-muted">close</span>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Photo */}
          <div className="flex flex-col items-center justify-center pt-2 pb-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
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
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute -top-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white shadow-sm hover:brightness-110 transition-all"
                    title="Remove Photo"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </>
              )}
            </div>
            <p className="mt-4 text-sm font-semibold text-muted uppercase tracking-widest text-[10px]">
              {form.clientPhoto ? 'Client Photo Set' : 'Tap to capture or upload photo'}
            </p>
          </div>

          {/* Client Info */}
          <section>
            <h3 className="text-xl font-display font-bold tracking-wide text-charcoal mb-4 flex items-center gap-2  pb-2">
              <span className="material-symbols-outlined text-primary">person</span>
              Client Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Full Name', placeholder: 'e.g. Ama Mensah', required: true },
                { key: 'phone', label: 'Phone', placeholder: '+233 24 123 4567' },
                { key: 'email', label: 'Email', placeholder: 'you@email.com' },
                { key: 'profession', label: 'Profession', placeholder: 'e.g. Lawyer' },
                { key: 'address', label: 'Address', placeholder: '12 Independence Ave' },
                { key: 'state', label: 'State/Region', placeholder: 'Greater Accra' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">{field.label} {field.required && <span className="text-primary">*</span>}</label>
                  <input className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted" placeholder={field.placeholder}
                    value={(form as Record<string, string>)[field.key]} onChange={(e) => handleChange(field.key, e.target.value)} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Gender</label>
                <select className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  value={form.gender} onChange={(e) => handleChange('gender', e.target.value)}>
                  <option>Female</option><option>Male</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Country</label>
                <input className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted" placeholder="Ghana"
                  value={form.country} onChange={(e) => handleChange('country', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Event Details */}
          <section>
            <h3 className="text-xl font-display font-bold tracking-wide text-charcoal mb-4 flex items-center gap-2  pb-2">
              <span className="material-symbols-outlined text-primary">event</span>
              Event Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'eventName', label: 'Event Name', placeholder: 'e.g. Wedding Reception' },
                { key: 'eventDate', label: 'Event Date', placeholder: '', type: 'date' },
                { key: 'eventMonth', label: 'Event Month', placeholder: 'e.g. June' },
                { key: 'eventLocation', label: 'Event Location', placeholder: 'e.g. Kempinski Hotel, Accra' },
                { key: 'assignedWorker', label: 'Assigned Tailor/Worker', placeholder: 'e.g. Kwame (Lead Tailor)' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">{field.label}</label>
                  <input className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted" placeholder={field.placeholder}
                    type={field.type || 'text'} value={(form as Record<string, string>)[field.key]} onChange={(e) => handleChange(field.key, e.target.value)} />
                </div>
              ))}
            </div>
          </section>

          {/* Vendor */}
          <section>
            <h3 className="text-xl font-display font-bold tracking-wide text-charcoal mb-4 flex items-center gap-2  pb-2">
              <span className="material-symbols-outlined text-primary">storefront</span>
              Vendor Partners
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Fabric Vendor</label>
                <input className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted" placeholder="Woodin Fabrics"
                  value={form.fabricVendor} onChange={(e) => handleChange('fabricVendor', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Vendor Name</label>
                <input className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted" placeholder="Premium Weavers"
                  value={form.kenteVendor} onChange={(e) => handleChange('kenteVendor', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Additional */}
          <section>
            <h3 className="text-xl font-display font-bold tracking-wide text-charcoal mb-4 flex items-center gap-2  pb-2">
              <span className="material-symbols-outlined text-primary">info</span>
              Additional Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Referral Source</label>
                <select className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg h-12 px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  value={form.referralSource} onChange={(e) => handleChange('referralSource', e.target.value)}>
                  <option value="">Select...</option><option>Instagram</option><option>Word of Mouth</option><option>Google</option><option>Referral</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-2">Notes</label>
                <textarea className="w-full bg-canvas text-charcoal shadow-sm border-none rounded-lg p-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted" rows={3} placeholder="Special instructions or notes..."
                  value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-card/90 backdrop-blur-md  px-6 py-4 flex justify-end gap-3 z-10">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg shadow-sm border-none text-gray font-bold text-sm tracking-wide hover:bg-canvas transition-all">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all">Create Client</button>
        </div>
      </div>
    </div>
  );
}

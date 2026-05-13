'use client';

import { useState } from 'react';
import { Client, Measurements, useStudio } from '@/context/StudioContext';

interface MeasurementsTabProps {
  client: Client;
}

const FIELDS: { key: keyof Measurements; label: string }[] = [
  { key: 'bust',            label: 'Bust' },
  { key: 'shoulder',        label: 'Shoulder' },
  { key: 'shoulderToNipple',label: 'Shoulder to Nipple' },
  { key: 'shoulderToWaist', label: 'Shoulder to Waist' },
  { key: 'blouseLength',    label: 'Blouse Length' },
  { key: 'waist',           label: 'Waist' },
  { key: 'hip',             label: 'Hip' },
  { key: 'thigh',           label: 'Thigh' },
  { key: 'knee',            label: 'Knee' },
  { key: 'trouser',         label: 'Trouser' },
  { key: 'bass',            label: 'Bass' },
  { key: 'dressLength',     label: 'Dress Length' },
  { key: 'slitLength',      label: 'Slit Length' },
  { key: 'sleeveLength',    label: 'Sleeve Length' },
  { key: 'aroundArm',       label: 'Around Arm' },
  { key: 'waistToHip',      label: 'Waist to Hip' },
  { key: 'kabaLength',      label: 'Kaba Length' },
  { key: 'waistToKnee',     label: 'Waist to Knee' },
  { key: 'underbust',       label: 'Underbust' },
];

const defaultEmpty: Measurements = {
  bust: '', shoulder: '', shoulderToNipple: '', shoulderToWaist: '',
  blouseLength: '', waist: '', hip: '', thigh: '', knee: '', trouser: '',
  bass: '', dressLength: '', slitLength: '', sleeveLength: '', aroundArm: '',
  waistToHip: '', kabaLength: '', waistToKnee: '', underbust: '',
};

export default function MeasurementsTab({ client }: MeasurementsTabProps) {
  const { updateMeasurements } = useStudio();
  const [measurements, setMeasurements] = useState<Measurements>({ ...defaultEmpty, ...client.measurements });
  const [isEditing, setIsEditing] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleChange = (key: keyof Measurements, value: string) => {
    setMeasurements(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMeasurements(client.id, measurements);
    setIsEditing(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2500);
  };

  const handleCancel = () => {
    setMeasurements({ ...defaultEmpty, ...client.measurements });
    setIsEditing(false);
  };

  const filledCount = FIELDS.filter(f => measurements[f.key]).length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">straighten</span>
          <div>
            <h2 className="text-lg font-bold text-charcoal tracking-tight">Body Measurements</h2>
            <p className="text-xs text-muted font-medium">{filledCount} / {FIELDS.length} fields filled · inches</p>
          </div>
          {showSaved && (
            <span className="flex items-center gap-1 text-success text-sm font-semibold animate-fade-in">
              <span className="material-symbols-outlined text-[16px]">check_circle</span> Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-canvas text-gray font-bold text-sm hover:bg-border/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-[#E5C04A] transition-colors shadow-sm"
              >
                Save Measurements
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-canvas text-charcoal font-bold text-sm hover:bg-border/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Measurements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray mb-1.5">
              {label}
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder="0.0"
                value={measurements[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                disabled={!isEditing}
                className={`w-full rounded-lg h-11 px-4 pr-12 text-sm font-medium outline-none transition-all
                  border border-border/60
                  ${isEditing
                    ? 'bg-white text-charcoal focus:ring-1 focus:ring-primary focus:border-primary'
                    : 'bg-canvas text-charcoal/70 cursor-default'}
                  ${measurements[key] && !isEditing ? 'border-primary/30 bg-primary/5' : ''}
                `}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-semibold pointer-events-none">
                in
              </span>
            </div>
          </div>
        ))}
      </div>

      {!isEditing && filledCount === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-border mb-3">straighten</span>
          <p className="text-muted text-sm font-medium">No measurements recorded yet.</p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-3 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-[#E5C04A] transition-colors"
          >
            Add Measurements
          </button>
        </div>
      )}
    </div>
  );
}
